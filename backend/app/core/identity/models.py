from dataclasses import dataclass
from enum import Enum
from typing import Optional, Tuple


class Provider(str, Enum):
    YOUTUBE = "youtube"
    JIOSAAVN = "jiosaavn"
    LOCAL = "local"
    LOSSLESS = "lossless"


@dataclass(frozen=True)
class TrackArtist:
    name: str
    normalized_name: str
    position: int
    browse_id: Optional[str] = None


@dataclass(frozen=True)
class TrackIdentity:
    id: str  # Canonical OTO ID (e.g., "trk_01J8...")
    title: str
    normalized_title: str
    artists: Tuple[TrackArtist, ...]
    album_title: Optional[str] = None
    normalized_album: Optional[str] = None
    duration_ms: Optional[int] = None
    is_explicit: bool = False
    isrc: Optional[str] = None
    created_at_ms: int = 0
    updated_at_ms: int = 0


@dataclass(frozen=True)
class ProviderTrack:
    provider: Provider
    provider_track_id: str
    title: str
    normalized_title: str
    artists: Tuple[str, ...]
    album_title: Optional[str] = None
    duration_ms: Optional[int] = None
    is_explicit: bool = False
    isrc: Optional[str] = None
    confidence: float = 1.0
    encrypted_media_url: Optional[str] = None
