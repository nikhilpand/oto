import asyncio
import urllib.request
from dataclasses import dataclass
from typing import Optional, Dict, Protocol
from .models import ResolvedStream


@dataclass(frozen=True)
class ProbeResponse:
    status: int
    headers: Dict[str, str]
    body: bytes


class RangeFetcher(Protocol):
    async def fetch_range(
        self, url: str, start: int, end: int, headers: Dict[str, str], timeout: float
    ) -> ProbeResponse: ...


class DefaultRangeFetcher:
    """Standard HTTP range fetcher using urllib / asyncio."""

    async def fetch_range(
        self, url: str, start: int, end: int, headers: Dict[str, str], timeout: float
    ) -> ProbeResponse:
        loop = asyncio.get_running_loop()

        def _sync_fetch() -> ProbeResponse:
            req_headers = dict(headers)
            req_headers["Range"] = f"bytes={start}-{end}"
            if "User-Agent" not in req_headers:
                req_headers["User-Agent"] = "OTO/1.0 (AudioValidator)"

            req = urllib.request.Request(url, headers=req_headers, method="GET")
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    status = resp.status
                    resp_headers = {k.lower(): v for k, v in resp.headers.items()}
                    body = resp.read()
                    return ProbeResponse(
                        status=status, headers=resp_headers, body=body
                    )
            except urllib.error.HTTPError as e:
                resp_headers = (
                    {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
                )
                body = e.read() if hasattr(e, "read") else b""
                return ProbeResponse(status=e.code, headers=resp_headers, body=body)
            except Exception as e:
                return ProbeResponse(status=599, headers={}, body=str(e).encode())

        return await loop.run_in_executor(None, _sync_fetch)


class StreamValidator:
    """
    Two-stage byte-range validator inspired by BitChord's failure model.
    Guarantees that a URL is not merely structurally valid, but actively serves audio bytes.
    """

    def __init__(self, fetcher: Optional[RangeFetcher] = None):
        self.fetcher: RangeFetcher = fetcher or DefaultRangeFetcher()

    async def validate_stream(
        self, stream: ResolvedStream, timeout: float = 6.0
    ) -> bool:
        """Stage 1: Validates initial 16KB byte span, status, and audio MIME type."""
        try:
            resp = await self.fetcher.fetch_range(
                url=stream.url,
                start=0,
                end=16383,
                headers=stream.headers,
                timeout=timeout,
            )

            # 1. Status Check: Must be HTTP 200 OK or HTTP 206 Partial Content
            if resp.status not in (200, 206):
                return False

            # 2. Content-Type Check: Must be audio or MP4 container with audio
            content_type = resp.headers.get("content-type", "").lower()
            valid_types = (
                "audio/",
                "video/mp4",
                "application/ogg",
                "application/vnd.apple.mpegurl",
            )
            if not any(content_type.startswith(vt) for vt in valid_types):
                return False

            # 3. Minimum Payload Check: Must receive at least 4KB of stream bytes
            if len(resp.body) < 4096:
                return False

            return True
        except Exception:
            return False

    async def validate_deep(
        self, stream: ResolvedStream, timeout: float = 6.0
    ) -> bool:
        """
        Stage 2: Deeper probe across the 1MB YouTube rate-throttling boundary.
        Executes for long media (>1.2MB).
        """
        content_length = stream.format.content_length
        if not content_length or content_length < 1_200_000:
            return True

        try:
            # Probe 16KB span starting at 1MB
            resp = await self.fetcher.fetch_range(
                url=stream.url,
                start=1_048_576,
                end=1_048_576 + 16383,
                headers=stream.headers,
                timeout=timeout,
            )

            if resp.status not in (200, 206):
                return False

            if len(resp.body) < 4096:
                return False

            return True
        except Exception:
            return False

    async def validate_full(self, stream: ResolvedStream) -> bool:
        """Executes both Stage 1 and Stage 2 validation in sequence."""
        if not await self.validate_stream(stream):
            return False
        return await self.validate_deep(stream)
