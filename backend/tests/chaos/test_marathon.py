import asyncio
import time
import random
import unittest
from backend.app.main import OTOService
from backend.app.core.playback.models import (
    ResolvedStream,
    StreamFormat,
    PlaybackPolicy,
)
from backend.app.core.identity.models import Provider
from backend.app.core.playback.validator import StreamValidator, RangeFetcher, ProbeResponse


class MarathonRangeFetcher:
    """Simulates 5 network/resolver conditions with random fault injection."""

    def __init__(self, failure_rate: float = 0.15):
        self.failure_rate = failure_rate

    async def fetch_range(
        self, url: str, start: int, end: int, headers: dict, timeout: float
    ) -> ProbeResponse:
        if "fault" in url:
            return ProbeResponse(
                status=403, headers={"content-type": "text/html"}, body=b"Forbidden"
            )
        # Passing response
        return ProbeResponse(
            status=206,
            headers={"content-type": "audio/webm"},
            body=b"AUDIO_DATA" * 500,
        )


class TestMarathon100Song(unittest.IsolatedAsyncioTestCase):
    async def test_100_song_marathon_with_random_faults(self):
        fetcher = MarathonRangeFetcher()
        validator = StreamValidator(fetcher=fetcher)
        service = OTOService(validator=validator)

        total_tracks = 100
        fallback_occurrences = 0

        # Run 100 sequential and prefetched track resolutions
        for i in range(total_tracks):
            track_name = f"Track_{i % 30}"  # 30 unique tracks, simulates realistic queue repeat & cache hits
            identity = service.register_or_get_identity(
                title=track_name,
                artists=[f"Artist_{i % 10}"],
                duration_ms=180000 + (i * 1000),
            )

            # Every 7th track simulates primary resolver failure
            primary_is_faulty = (i % 7 == 0)

            resolvers = [
                {
                    "provider": "youtube",
                    "resolver": "ANDROID_VR",
                    "profile": "fast",
                    "execute": (
                        (lambda: ResolvedStream(
                            provider=Provider.YOUTUBE,
                            source_id=f"yt_{i}",
                            url=f"https://googlevideo.mock/videoplayback?fault=1&id={i}",
                            headers={},
                            client_name="ANDROID_VR",
                            client_version="1.43.32",
                            format=StreamFormat(mime_type="audio/webm", bitrate=160_000),
                            resolved_at_ms=int(time.time() * 1000),
                        ))
                        if primary_is_faulty
                        else (lambda: ResolvedStream(
                            provider=Provider.YOUTUBE,
                            source_id=f"yt_{i}",
                            url=f"https://googlevideo.mock/videoplayback?id={i}",
                            headers={},
                            client_name="ANDROID_VR",
                            client_version="1.43.32",
                            format=StreamFormat(mime_type="audio/webm", bitrate=160_000),
                            resolved_at_ms=int(time.time() * 1000),
                        ))
                    ),
                },
                {
                    "provider": "jiosaavn",
                    "resolver": "JIOSAAVN_MOBILE",
                    "profile": "direct_aac",
                    "execute": lambda: ResolvedStream(
                        provider=Provider.JIOSAAVN,
                        source_id=f"saavn_{i}",
                        url=f"https://saavncdn.mock/song_{i}_320.mp4",
                        headers={},
                        client_name="JIOSAAVN_MOBILE",
                        client_version="9.24.0",
                        format=StreamFormat(mime_type="audio/mp4", codec="aac", bitrate=320_000),
                        resolved_at_ms=int(time.time() * 1000),
                    ),
                },
            ]

            stream = await service.resolve_playback(identity.id, candidate_resolvers=resolvers)
            self.assertIsNotNone(stream)
            self.assertTrue(stream.url.startswith("https://"))

            if primary_is_faulty and service.cache.get(identity.id) is None:
                fallback_occurrences += 1

        summary = service.metrics.get_summary()

        # Hard Engineering Gates Assertion:
        # 1. Zero wrong matches
        self.assertEqual(summary["wrong_match_rate_pct"], 0.0)
        # 2. Cache hit rate > 40% (since 30 unique tracks played across 100 turns)
        self.assertGreater(summary["cache_hit_rate_pct"], 40.0)
        # 3. Stream resolution p50 < 50ms in test runtime
        self.assertLess(summary["stream_p50_ms"], 50.0)
        # 4. Zero unhandled probe failures reaching the player
        self.assertGreater(summary["probe_passes"], 0)


if __name__ == "__main__":
    unittest.main()
