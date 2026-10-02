import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import urllib.request

from .main import OTOService
from .providers.jiosaavn.catalog import JioSaavnCatalogProvider
from .providers.jiosaavn.playback import JioSaavnPlaybackProvider
from .providers.lyrics.lrclib import LRCLIBLyricsProvider
from .core.playback.models import PlaybackPolicy, ResolvedStream
from .core.identity.models import TrackIdentity, TrackArtist


app = FastAPI(title="OTO Core Music API", version="1.0.0")

# Enable CORS for mobile development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service instances
oto_service = OTOService(db_path="oto_live.db")
jiosaavn_catalog = JioSaavnCatalogProvider()
jiosaavn_playback = JioSaavnPlaybackProvider()
lrclib_provider = LRCLIBLyricsProvider()

start_time = time.time()


@app.get("/v1/health")
async def health_check():
    return {
        "status": "online",
        "service": "OTO Music Core",
        "uptime_s": int(time.time() - start_time),
        "cache_entries": len(oto_service.cache._entries),
        "timestamp_ms": int(time.time() * 1000),
    }


@app.get("/v1/search")
async def search_catalog(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Searches the live catalog across high-res providers.
    Returns canonical track objects with metadata, album art, and encrypted stream tokens.
    """
    try:
        tracks = await jiosaavn_catalog.search(q, limit=limit)
        return {
            "query": q,
            "count": len(tracks),
            "tracks": tracks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/v1/playback/resolve")
async def resolve_playback(
    id: str = Query(..., description="Track or source ID"),
    enc: Optional[str] = Query(None, description="Encrypted media URL token"),
):
    """
    Resolves a direct 320kbps CDN stream URL with generation cache and health tracking.
    """
    try:
        stream = await jiosaavn_playback.resolve(id, PlaybackPolicy(), encrypted_url=enc)
        if not stream:
            raise HTTPException(status_code=404, detail="Could not resolve stream URL for track")

        return {
            "streamUrl": stream.url,
            "sourceId": "saavn",
            "bitrate": 320,
            "format": "aac",
            "expiresAt": stream.expires_at_ms,
            "headers": stream.headers,
            "is2MbChunked": stream.requires_range,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resolution error: {str(e)}")


@app.get("/v1/lyrics")
async def get_lyrics(
    title: str = Query(..., description="Track title"),
    artist: str = Query(..., description="Artist name"),
    duration_ms: Optional[int] = Query(None, description="Track duration in ms"),
    album: Optional[str] = Query(None, description="Album name"),
):
    """
    Fetches synchronized millisecond-accurate LRC lyrics.
    """
    try:
        identity = TrackIdentity(
            id=f"lyr_{abs(hash((title, artist)))}",
            title=title,
            normalized_title=title.lower(),
            artists=(TrackArtist(name=artist, normalized_name=artist.lower(), position=0),),
            album_title=album,
            duration_ms=duration_ms,
        )
        res = await lrclib_provider.fetch_lyrics(identity)
        if not res:
            return {"isSynced": False, "lines": [], "plainText": None}

        lyrics, score = res
        return {
            "isSynced": lyrics.is_synced,
            "matchScore": round(score, 3),
            "lines": [
                {
                    "timeMs": line.start_ms,
                    "durationMs": (line.end_ms - line.start_ms) if line.end_ms else 3000,
                    "text": line.text,
                }
                for line in lyrics.lines
            ],
            "plainText": None,
        }
    except Exception as e:
        return {"isSynced": False, "lines": [], "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.server:app", host="0.0.0.0", port=8000, reload=False)
