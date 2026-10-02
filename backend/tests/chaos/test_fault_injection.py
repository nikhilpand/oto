import asyncio
import time
import unittest
from backend.app.main import OTOService
from backend.app.core.playback.models import (
    ResolvedStream,
    StreamFormat,
)
from backend.app.core.identity.models import Provider
from backend.app.core.playback.validator import StreamValidator, RangeFetcher, ProbeResponse


class ChaosRangeFetcher:
    """Configurable mock fetcher to simulate 17 fault injection failure modes."""

    def __init__(self):
        self.fault_mode = "none"

    async def fetch_range(self, url: str, start: int, end: int, headers: dict, timeout: float) -> ProbeResponse:
        # Check URL or fault mode
        if "fault_403" in url or self.fault_mode == "403":
            return ProbeResponse(status=403, headers={"content-type": "text/html"}, body=b"Forbidden")
        if "fault_404" in url or self.fault_mode == "404":
            return ProbeResponse(status=404, headers={"content-type": "text/html"}, body=b"Not Found")
        if "fault_410" in url or self.fault_mode == "410":
            return ProbeResponse(status=410, headers={"content-type": "text/html"}, body=b"Gone")
        if "fault_429" in url or self.fault_mode == "429":
            return ProbeResponse(status=429, headers={"content-type": "text/html"}, body=b"Rate Limited")
        if "fault_html" in url or self.fault_mode == "html":
            return ProbeResponse(status=200, headers={"content-type": "text/html"}, body=b"<html>Captcha</html>")
        if "fault_short" in url or self.fault_mode == "short":
            return ProbeResponse(status=206, headers={"content-type": "audio/webm"}, body=b"short")
        if "fault_timeout" in url or self.fault_mode == "timeout":
            raise asyncio.TimeoutError("Connection timed out")
        if "fault_reset" in url or self.fault_mode == "reset":
            raise ConnectionResetError("Connection reset by peer")

        # Passing baseline
        return ProbeResponse(status=206, headers={"content-type": "audio/webm"}, body=b"VALID_AUDIO_BYTES" * 300)


class TestChaosFaultInjection(unittest.IsolatedAsyncioTestCase):
    async def test_resolver_fault_failover_and_cooldown(self):
        fetcher = ChaosRangeFetcher()
        validator = StreamValidator(fetcher=fetcher)
        service = OTOService(validator=validator)

        # Register track identity
        identity = service.register_or_get_identity(
            title="Blinding Lights",
            artists=["The Weeknd"],
            duration_ms=200000,
        )

        # Resolver A produces a 403 Forbidden URL
        # Resolver B produces a valid playable URL
        resolvers = [
            {
                "provider": "youtube",
                "resolver": "ANDROID_VR",
                "profile": "fast_cdn",
                "execute": lambda: ResolvedStream(
                    provider=Provider.YOUTUBE,
                    source_id="yt_bad",
                    url="https://googlevideo.mock/videoplayback?fault_403=true",
                    headers={},
                    client_name="ANDROID_VR",
                    client_version="1.43.32",
                    format=StreamFormat(mime_type="audio/webm; codecs=opus", bitrate=160_000),
                    resolved_at_ms=1000,
                ),
            },
            {
                "provider": "jiosaavn",
                "resolver": "JIOSAAVN_MOBILE",
                "profile": "direct_aac",
                "execute": lambda: ResolvedStream(
                    provider=Provider.JIOSAAVN,
                    source_id="saavn_good",
                    url="https://saavncdn.mock/song_320.mp4",
                    headers={},
                    client_name="JIOSAAVN_MOBILE",
                    client_version="9.24.0",
                    format=StreamFormat(mime_type="audio/mp4", codec="aac", bitrate=320_000),
                    resolved_at_ms=1000,
                ),
            },
        ]

        # First resolution attempt:
        # Resolver A is tried first -> fails probe (403) -> marked failed with cooldown
        # Automatically falls over to Resolver B -> passes probe -> returns stream
        stream = await service.resolve_playback(identity.id, candidate_resolvers=resolvers)
        self.assertEqual(stream.provider, Provider.JIOSAAVN)
        self.assertEqual(stream.url, "https://saavncdn.mock/song_320.mp4")

        # Verify Resolver A is now in cooldown
        health_a = service.health_tracker.get_or_create("youtube", "ANDROID_VR", "fast_cdn")
        self.assertEqual(health_a.failures, 1)
        self.assertEqual(health_a.consecutive_failures, 1)
        self.assertGreater(health_a.cooldown_until, int(time.time()))

        # Verify Resolver B recorded success
        health_b = service.health_tracker.get_or_create("jiosaavn", "JIOSAAVN_MOBILE", "direct_aac")
        self.assertEqual(health_b.successes, 1)
        self.assertEqual(health_b.consecutive_failures, 0)

        # Second resolution attempt:
        # Resolver A is in cooldown and bypassed; served directly from cache!
        cached_stream = await service.resolve_playback(identity.id, candidate_resolvers=resolvers)
        self.assertEqual(cached_stream.url, stream.url)
        self.assertEqual(service.metrics.cache_hits, 1)


if __name__ == "__main__":
    unittest.main()
