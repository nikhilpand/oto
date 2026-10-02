import asyncio
import unittest
from backend.app.core.playback.coordinator import ResolutionCoordinator
from backend.app.core.playback.models import (
    ResolvedStream,
    StreamFormat,
)
from backend.app.core.identity.models import Provider


class TestResolutionCoordinator(unittest.IsolatedAsyncioTestCase):
    async def test_in_flight_coalescing(self):
        coordinator = ResolutionCoordinator()
        execution_count = 0

        async def slow_resolver() -> ResolvedStream:
            nonlocal execution_count
            execution_count += 1
            await asyncio.sleep(0.05)  # 50ms simulated network delay
            return ResolvedStream(
                provider=Provider.YOUTUBE,
                source_id="track_123",
                url="https://cdn.mock/stream.opus",
                headers={},
                client_name="ANDROID_VR",
                client_version="1.43.32",
                format=StreamFormat(mime_type="audio/webm"),
                resolved_at_ms=1000,
            )

        # Launch 5 concurrent callers for the same track
        tasks = [
            coordinator.resolve("track_123", slow_resolver) for _ in range(5)
        ]
        results = await asyncio.gather(*tasks)

        # Only ONE actual resolution network task was executed
        self.assertEqual(execution_count, 1)
        self.assertEqual(len(results), 5)
        for r in results:
            self.assertEqual(r.url, "https://cdn.mock/stream.opus")

        # In-flight dictionary cleaned up
        self.assertEqual(coordinator.active_count, 0)
        self.assertEqual(coordinator.coalesced_hits, 4)
        self.assertEqual(coordinator.total_resolutions, 5)


if __name__ == "__main__":
    unittest.main()
