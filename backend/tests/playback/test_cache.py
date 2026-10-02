import unittest
from backend.app.core.playback.cache import StreamCache
from backend.app.core.playback.models import (
    ResolvedStream,
    StreamFormat,
)
from backend.app.core.identity.models import Provider


class TestStreamCache(unittest.TestCase):
    def setUp(self):
        self.cache = StreamCache(max_entries=3)
        self.sample_stream = ResolvedStream(
            provider=Provider.YOUTUBE,
            source_id="trk_1",
            url="https://cdn.mock/1",
            headers={},
            client_name="ANDROID_VR",
            client_version="1.43.32",
            format=StreamFormat(mime_type="audio/webm"),
            resolved_at_ms=1000,
            expires_at_ms=2000,
        )

    def test_basic_put_and_get(self):
        gen = self.cache.get_generation("trk_1")
        self.assertTrue(self.cache.put("trk_1", self.sample_stream, gen))
        cached = self.cache.get("trk_1", now_ms=1500)
        self.assertIsNotNone(cached)
        self.assertEqual(cached.url, "https://cdn.mock/1")

    def test_generation_protected_stale_write_rejection(self):
        # 1. Resolve starts with gen = 0
        gen_start = self.cache.get_generation("trk_1")
        self.assertEqual(gen_start, 0)

        # 2. Invalidation happens mid-flight -> gen becomes 1
        self.cache.invalidate("trk_1")
        self.assertEqual(self.cache.get_generation("trk_1"), 1)

        # 3. Delayed write finishes expecting gen = 0 -> REJECTED!
        inserted = self.cache.put("trk_1", self.sample_stream, gen_start)
        self.assertFalse(inserted)
        self.assertEqual(self.cache.stale_rejects, 1)

        # Cache remains empty
        self.assertIsNone(self.cache.get("trk_1"))

    def test_ttl_expiration(self):
        gen = self.cache.get_generation("trk_1")
        self.cache.put("trk_1", self.sample_stream, gen)

        # Query after expires_at_ms (2000)
        expired = self.cache.get("trk_1", now_ms=2500)
        self.assertIsNone(expired)

    def test_lru_bounding(self):
        # max_entries is 3
        for i in range(1, 5):
            stream = ResolvedStream(
                provider=Provider.YOUTUBE,
                source_id=f"trk_{i}",
                url=f"https://cdn.mock/{i}",
                headers={},
                client_name="ANDROID_VR",
                client_version="1.43.32",
                format=StreamFormat(mime_type="audio/webm"),
                resolved_at_ms=1000,
                expires_at_ms=5000,
            )
            gen = self.cache.get_generation(f"trk_{i}")
            self.cache.put(f"trk_{i}", stream, gen)

        # Size clamped to 3
        self.assertEqual(self.cache.size, 3)
        # Oldest entry (trk_1) evicted
        self.assertIsNone(self.cache.get("trk_1", now_ms=1000))
        # trk_2, trk_3, trk_4 remain
        self.assertIsNotNone(self.cache.get("trk_4", now_ms=1000))


if __name__ == "__main__":
    unittest.main()
