import time
import urllib.request
import urllib.parse
import json
from typing import Optional
from ..base import PlaybackProvider
from ...core.playback.models import (
    ResolvedStream,
    StreamFormat,
    PlaybackPolicy,
)
from ...core.identity.models import Provider
from .crypto import decrypt_jiosaavn_url


class JioSaavnPlaybackProvider(PlaybackProvider):
    provider_name: str = "jiosaavn"

    def __init__(self, des_key: str = "38346591"):
        self.des_key = des_key

    def resolve_from_encrypted(
        self, source_id: str, encrypted_url_b64: str
    ) -> Optional[ResolvedStream]:
        direct_url = decrypt_jiosaavn_url(encrypted_url_b64, self.des_key)
        if not direct_url:
            return None

        now_ms = int(time.time() * 1000)
        # JioSaavn CDN links last 24h
        expires_at = now_ms + (24 * 3600 * 1000)

        fmt = StreamFormat(
            mime_type="audio/mp4",
            codec="aac",
            bitrate=320_000,
            sample_rate=44_100,
            channels=2,
            content_length=7_800_000,
        )

        return ResolvedStream(
            provider=Provider.JIOSAAVN,
            source_id=source_id,
            url=direct_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            client_name="JIOSAAVN_MOBILE",
            client_version="9.24.0",
            format=fmt,
            resolved_at_ms=now_ms,
            expires_at_ms=expires_at,
            requires_range=True,
            range_chunk_size=2 * 1024 * 1024,
        )

    async def resolve(
        self, source_id: str, policy: PlaybackPolicy, encrypted_url: Optional[str] = None
    ) -> Optional[ResolvedStream]:
        """Resolves 320kbps direct stream URL using encrypted URL or song PID."""
        if encrypted_url:
            return self.resolve_from_encrypted(source_id, encrypted_url)

        # Clean source_id if prefixed
        clean_id = source_id.replace("saavn_", "")
        url = (
            f"https://www.jiosaavn.com/api.php?__call=song.getDetails"
            f"&pids={urllib.parse.quote(clean_id)}&_format=json"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                song_data = data.get(clean_id)
                if not song_data:
                    return None
                enc = song_data.get("more_info", {}).get("encrypted_media_url")
                if enc:
                    return self.resolve_from_encrypted(clean_id, enc)
        except Exception:
            pass

        return None
