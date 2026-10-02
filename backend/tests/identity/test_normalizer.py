import unittest
from backend.app.core.identity.normalizer import (
    normalize_unicode,
    extract_versions,
    clean_title,
    normalize_artists,
    normalize_isrc,
)


class TestIdentityNormalizer(unittest.TestCase):
    def test_unicode_diacritics(self):
        self.assertEqual(normalize_unicode("Beyoncé"), "beyonce")
        self.assertEqual(normalize_unicode("Mötley Crüe"), "motley crue")

    def test_version_extraction(self):
        v1 = extract_versions("Hotel California (Live On MTV 1994)")
        self.assertIn("live", v1)

        v2 = extract_versions("Blinding Lights (Major Lazer Remix)")
        self.assertIn("remix", v2)

        v3 = extract_versions("Layla (Acoustic Version)")
        self.assertIn("acoustic", v3)

        v4 = extract_versions("Shape of You")
        self.assertEqual(len(v4), 0)

    def test_packaging_bracket_stripping(self):
        cleaned1 = clean_title("Starboy [Official Music Video]")
        self.assertEqual(cleaned1, "starboy")

        cleaned2 = clean_title("Tum Hi Ho (From \"Aashiqui 2\") [Official Audio]")
        self.assertEqual(cleaned2, "tum hi ho")

        cleaned3 = clean_title("Despacito ft. Daddy Yankee [Lyric Video]")
        self.assertEqual(cleaned3, "despacito")

    def test_artist_normalization(self):
        artists = ["Drake, Future & Young Thug feat. Lil Baby"]
        normalized = normalize_artists(artists)
        self.assertIn("drake", normalized)
        self.assertIn("future", normalized)
        self.assertIn("young thug", normalized)
        self.assertIn("lil baby", normalized)

    def test_isrc_normalization(self):
        self.assertEqual(normalize_isrc("US-S1Z-20-00001"), "USS1Z2000001")
        self.assertEqual(normalize_isrc("uss1z2000001"), "USS1Z2000001")
        self.assertIsNone(normalize_isrc("INVALID"))


if __name__ == "__main__":
    unittest.main()
