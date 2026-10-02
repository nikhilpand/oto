import urllib.request
import urllib.parse
import json
from typing import List, Dict, Any, Optional
from ..base import CatalogProvider
from ...core.identity.models import ProviderTrack, Provider, TrackArtist
from ...core.identity.normalizer import clean_title, normalize_unicode


class JioSaavnCatalogProvider(CatalogProvider):
    provider_name: str = "jiosaavn"

    def __init__(self, user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"):
        self.user_agent = user_agent

    async def search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Executes live search against JioSaavn API.
        Returns parsed track dictionaries ready for domain mapping.
        """
        norm_query = clean_title(query)
        if not norm_query:
            return []

        url = (
            f"https://www.jiosaavn.com/api.php?__call=search.getResults"
            f"&q={urllib.parse.quote(norm_query)}"
            f"&_format=json&_marker=0&api_version=4&ctx=android&n={limit}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})

        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("results", [])
                tracks: List[Dict[str, Any]] = []

                for r in results:
                    more = r.get("more_info", {})
                    enc_url = more.get("encrypted_media_url", "")
                    
                    # Extract high-res artwork
                    raw_img = r.get("image", "")
                    artwork_url = (
                        raw_img.replace("150x150", "500x500")
                        .replace("50x50", "500x500")
                    )

                    # Extract duration
                    try:
                        dur_s = int(more.get("duration", 0))
                        duration_ms = dur_s * 1000
                    except (ValueError, TypeError):
                        duration_ms = 0

                    # Extract artists
                    primary_artist = "Unknown Artist"
                    all_artists = []
                    artist_map = more.get("artistMap", {})
                    if isinstance(artist_map, dict):
                        primaries = artist_map.get("primary_artists", [])
                        if primaries and isinstance(primaries, list):
                            primary_artist = primaries[0].get("name", "Unknown Artist")
                            all_artists = [p.get("name") for p in primaries if p.get("name")]
                    
                    if not all_artists:
                        raw_primaries = r.get("primary_artists", "")
                        if raw_primaries:
                            all_artists = [a.strip() for a in raw_primaries.split(",") if a.strip()]
                            if all_artists:
                                primary_artist = all_artists[0]

                    title = r.get("song") or r.get("title") or "Untitled Track"

                    tracks.append({
                        "id": f"saavn_{r.get('id')}",
                        "source_id": str(r.get("id")),
                        "provider": "jiosaavn",
                        "title": title,
                        "artist": primary_artist,
                        "artists": all_artists or [primary_artist],
                        "album": more.get("album", ""),
                        "artwork_url": artwork_url,
                        "duration_ms": duration_ms,
                        "encrypted_url": enc_url,
                        "year": int(r.get("year", 0)) if str(r.get("year", "")).isdigit() else 0,
                        "is_explicit": r.get("explicit_content") == "1",
                        "has_lyrics": more.get("has_lyrics") == "true",
                    })

                return tracks
        except Exception as e:
            return []

    async def get_track(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Fetches full song metadata by JioSaavn song PID."""
        url = (
            f"https://www.jiosaavn.com/api.php?__call=song.getDetails"
            f"&pids={urllib.parse.quote(source_id)}&_format=json"
        )
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                song_data = data.get(source_id)
                if not song_data:
                    return None
                more = song_data.get("more_info", {})
                return {
                    "id": f"saavn_{source_id}",
                    "source_id": source_id,
                    "title": song_data.get("song") or song_data.get("title"),
                    "artist": song_data.get("primary_artists") or "Unknown Artist",
                    "album": more.get("album", ""),
                    "artwork_url": song_data.get("image", "").replace("150x150", "500x500"),
                    "duration_ms": int(more.get("duration", 0)) * 1000,
                    "encrypted_url": more.get("encrypted_media_url", ""),
                }
        except Exception:
            return None
