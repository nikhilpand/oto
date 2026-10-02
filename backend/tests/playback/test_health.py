import unittest
from backend.app.core.playback.health import (
    ResolverHealthTracker,
    ResolverHealth,
)


class TestResolverHealth(unittest.TestCase):
    def test_health_scoring_and_cooldown(self):
        tracker = ResolverHealthTracker()

        # Record successes
        tracker.record_success(
            "youtube", "ANDROID_VR", "profile1", latency_ms=150.0, now_s=1000
        )
        h = tracker.get_or_create("youtube", "ANDROID_VR", "profile1")
        self.assertEqual(h.successes, 1)
        self.assertEqual(h.consecutive_failures, 0)
        self.assertGreater(h.calculate_score(now_s=1000), 0.70)

        # Record 1 failure -> 30s cooldown
        tracker.record_failure(
            "youtube", "ANDROID_VR", "profile1", "403 Forbidden", now_s=1005
        )
        self.assertEqual(h.failures, 1)
        self.assertEqual(h.consecutive_failures, 1)
        self.assertEqual(h.cooldown_until, 1035)

        # In cooldown -> score is 0.0, available is False
        self.assertEqual(h.calculate_score(now_s=1010), 0.0)
        self.assertFalse(
            tracker.is_available("youtube", "ANDROID_VR", "profile1", now_s=1010)
        )

        # After cooldown -> available again
        self.assertTrue(
            tracker.is_available("youtube", "ANDROID_VR", "profile1", now_s=1040)
        )
        self.assertGreater(h.calculate_score(now_s=1040), 0.0)

        # Consecutive failure -> 60s cooldown (exponential backoff)
        tracker.record_failure(
            "youtube", "ANDROID_VR", "profile1", "Connection reset", now_s=1045
        )
        self.assertEqual(h.consecutive_failures, 2)
        self.assertEqual(h.cooldown_until, 1045 + 60)


if __name__ == "__main__":
    unittest.main()
