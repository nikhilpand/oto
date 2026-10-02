import unittest
from typing import Dict
from backend.app.core.playback.validator import (
    StreamValidator,
    RangeFetcher,
    ProbeResponse,
)
from backend.app.core.playback.models import (
    ResolvedStream,
    StreamFormat,
)
from backend.app.core.identity.models import Provider


class MockRangeFetcher:
    def __init__(
        self,
        status: int = 206,
        content_type: str = "audio/webm",
        body_length: int = 16384,
    ):
        self.status = status
        self.content_type = content_type
        self.body_length = body_length

    async def fetch_range(
        self, url: str, start: int, end: int, headers: Dict[str, str], timeout: float
    ) -> ProbeResponse:
        return ProbeResponse(
            status=self.status,
            headers={"content-type": self.content_type},
            body=b"A" * self.body_length,
        )


class TestStreamValidator(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.stream = ResolvedStream(
            provider=Provider.YOUTUBE,
            source_id="trk_1",
            url="https://googlevideo.mock/stream",
            headers={},
            client_name="ANDROID_VR",
            client_version="1.43.32",
            format=StreamFormat(
                mime_type="audio/webm", content_length=5_000_000
            ),
            resolved_at_ms=1000,
        )

    async def test_valid_stream_passes(self):
        fetcher = MockRangeFetcher(
            status=206, content_type="audio/webm", body_length=8192
        )
        validator = StreamValidator(fetcher=fetcher)
        self.assertTrue(await validator.validate_stream(self.stream))
        self.assertTrue(await validator.validate_deep(self.stream))

    async def test_html_response_fails(self):
        # e.g., BotGuard Captcha or Captive Portal
        fetcher = MockRangeFetcher(
            status=200, content_type="text/html", body_length=8192
        )
        validator = StreamValidator(fetcher=fetcher)
        self.assertFalse(await validator.validate_stream(self.stream))

    async def test_truncated_body_fails(self):
        # Body length < 4096 bytes
        fetcher = MockRangeFetcher(
            status=206, content_type="audio/webm", body_length=1024
        )
        validator = StreamValidator(fetcher=fetcher)
        self.assertFalse(await validator.validate_stream(self.stream))

    async def test_http_403_fails(self):
        fetcher = MockRangeFetcher(
            status=403, content_type="text/plain", body_length=0
        )
        validator = StreamValidator(fetcher=fetcher)
        self.assertFalse(await validator.validate_stream(self.stream))


if __name__ == "__main__":
    unittest.main()
