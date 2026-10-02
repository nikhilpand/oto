import unittest
from backend.app.core.lyrics.matcher import parse_lrc, score_lyrics_candidate
from backend.app.core.identity.models import TrackIdentity, TrackArtist


class TestLyricsEngine(unittest.TestCase):
    def test_lrc_parsing(self):
        sample_lrc = """
        [00:12.50]First line of lyrics
        [00:18.20]Second line of lyrics
        [00:24.00]Third line of lyrics
        """
        lyrics = parse_lrc(sample_lrc, provider="test", track_id="trk_1")
        self.assertTrue(lyrics.is_synced)
        self.assertEqual(len(lyrics.lines), 3)

        line1 = lyrics.lines[0]
        self.assertEqual(line1.start_ms, 12500)
        self.assertEqual(line1.end_ms, 18200)
        self.assertEqual(line1.text, "First line of lyrics")

        line2 = lyrics.lines[1]
        self.assertEqual(line2.start_ms, 18200)
        self.assertEqual(line2.end_ms, 24000)

        line3 = lyrics.lines[2]
        self.assertEqual(line3.start_ms, 24000)
        self.assertIsNone(line3.end_ms)

    def test_lyrics_candidate_scoring(self):
        identity = TrackIdentity(
            id="trk_1",
            title="Starboy",
            normalized_title="starboy",
            artists=(
                TrackArtist(
                    name="The Weeknd", normalized_name="the weeknd", position=0
                ),
            ),
            duration_ms=230000,
            is_explicit=True,
        )

        score_good = score_lyrics_candidate(
            identity,
            candidate_title="Starboy [Explicit]",
            candidate_artist="The Weeknd",
            candidate_duration_ms=231000,
        )
        self.assertGreaterEqual(score_good, 0.90)

        score_bad = score_lyrics_candidate(
            identity,
            candidate_title="Completely Different Song",
            candidate_artist="Someone Else",
            candidate_duration_ms=150000,
        )
        self.assertLess(score_bad, 0.30)


if __name__ == "__main__":
    unittest.main()
