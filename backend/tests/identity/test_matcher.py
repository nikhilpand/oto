import unittest
from backend.app.core.identity.models import (
    TrackIdentity,
    TrackArtist,
    ProviderTrack,
    Provider,
)
from backend.app.core.identity.normalizer import clean_title
from backend.app.core.identity.matcher import hard_match, composite_match_score


class TestIdentityMatcher(unittest.TestCase):
    def setUp(self):
        self.base_identity = TrackIdentity(
            id="trk_test_1",
            title="Blinding Lights",
            normalized_title=clean_title("Blinding Lights"),
            artists=(
                TrackArtist(
                    name="The Weeknd", normalized_name="the weeknd", position=0
                ),
            ),
            album_title="After Hours",
            duration_ms=200000,
            is_explicit=False,
            isrc="USUG11904206",
        )

    def test_isrc_exact_match(self):
        candidate = ProviderTrack(
            provider=Provider.JIOSAAVN,
            provider_track_id="saavn_1",
            title="Blinding Lights",
            normalized_title=clean_title("Blinding Lights"),
            artists=("The Weeknd",),
            duration_ms=200000,
            is_explicit=False,
            isrc="USUG11904206",
        )
        self.assertTrue(hard_match(self.base_identity, candidate))

    def test_symmetric_version_failure(self):
        # Base is studio, candidate is Live
        live_candidate = ProviderTrack(
            provider=Provider.YOUTUBE,
            provider_track_id="yt_live",
            title="Blinding Lights (Live at the Super Bowl)",
            normalized_title=clean_title("Blinding Lights (Live at the Super Bowl)"),
            artists=("The Weeknd",),
            duration_ms=201000,
            is_explicit=False,
        )
        self.assertFalse(hard_match(self.base_identity, live_candidate))

    def test_duration_gate(self):
        # 4 seconds difference > 3000ms threshold -> FAIL
        long_candidate = ProviderTrack(
            provider=Provider.YOUTUBE,
            provider_track_id="yt_long",
            title="Blinding Lights",
            normalized_title=clean_title("Blinding Lights"),
            artists=("The Weeknd",),
            duration_ms=204500,
            is_explicit=False,
        )
        self.assertFalse(hard_match(self.base_identity, long_candidate))

        # Under loose video mode (threshold 12000ms) -> PASS
        self.assertTrue(
            hard_match(
                self.base_identity,
                long_candidate,
                allow_loose_video_duration=True,
            )
        )

    def test_explicit_content_mismatch(self):
        explicit_candidate = ProviderTrack(
            provider=Provider.JIOSAAVN,
            provider_track_id="saavn_exp",
            title="Blinding Lights",
            normalized_title=clean_title("Blinding Lights"),
            artists=("The Weeknd",),
            duration_ms=200000,
            is_explicit=True,
        )
        self.assertFalse(hard_match(self.base_identity, explicit_candidate))

    def test_artist_intersection(self):
        wrong_artist_candidate = ProviderTrack(
            provider=Provider.YOUTUBE,
            provider_track_id="yt_wrong_artist",
            title="Blinding Lights",
            normalized_title=clean_title("Blinding Lights"),
            artists=("Unknown Cover Band",),
            duration_ms=200000,
            is_explicit=False,
        )
        self.assertFalse(hard_match(self.base_identity, wrong_artist_candidate))

    def test_composite_score_calculation(self):
        valid_candidate = ProviderTrack(
            provider=Provider.JIOSAAVN,
            provider_track_id="saavn_valid",
            title="Blinding Lights",
            normalized_title=clean_title("Blinding Lights"),
            artists=("The Weeknd",),
            album_title="After Hours",
            duration_ms=200500,
            is_explicit=False,
        )
        self.assertTrue(hard_match(self.base_identity, valid_candidate))
        score = composite_match_score(self.base_identity, valid_candidate)
        self.assertGreaterEqual(score, 0.95)


if __name__ == "__main__":
    unittest.main()
