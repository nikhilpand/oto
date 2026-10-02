import urllib.request
import urllib.parse
import json
from typing import Optional, Tuple
from ...core.lyrics.models import Lyrics
from ...core.lyrics.matcher import parse_lrc, score_lyrics_candidate
from ...core.identity.models import TrackIdentity


class LRCLIBLyricsProvider:
    name: str = "lrclib"

    def __init__(self, base_url: str = "https://lrclib.net/api"):
        self.base_url = base_url

    async def fetch_lyrics(
        self, identity: TrackIdentity
    ) -> Optional[Tuple[Lyrics, float]]:
        """Fetches synchronized LRC lyrics from LRCLIB for the given identity."""
        primary_artist = identity.artists[0].name if identity.artists else ""
        query_params = {
            "track_name": identity.title,
            "artist_name": primary_artist,
        }
        if identity.album_title:
            query_params["album_name"] = identity.album_title
        if identity.duration_ms:
            query_params["duration"] = str(identity.duration_ms // 1000)

        url = f"{self.base_url}/get?{urllib.parse.urlencode(query_params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "OTO-Music-App/1.0"})

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                synced_lrc = data.get("syncedLyrics")
                plain_lyrics = data.get("plainLyrics")
                track_name = data.get("trackName") or identity.title
                artist_name = data.get("artistName") or primary_artist
                duration_s = data.get("duration")

                if not synced_lrc and not plain_lyrics:
                    return None

                lyrics = parse_lrc(synced_lrc, provider="lrclib", track_id=identity.id) if synced_lrc else Lyrics(
                    provider="lrclib",
                    track_id=identity.id,
                    lines=(),
                    is_synced=False,
                )

                score = score_lyrics_candidate(
                    identity,
                    candidate_title=track_name,
                    candidate_artist=artist_name,
                    candidate_duration_ms=int(duration_s * 1000) if duration_s else None,
                )
                return lyrics, score
        except Exception:
            return None
