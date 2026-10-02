from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict
from ..identity.models import Provider


class AudioQuality(str, Enum):
    LOW = "low"  # ~64 kbps (Opus / AAC)
    MEDIUM = "medium"  # ~128 kbps
    HIGH = "high"  # ~160-320 kbps (Opus 160 / JioSaavn 320 AAC)
    LOSSLESS = "lossless"  # 16/24-bit FLAC


@dataclass(frozen=True)
class StreamFormat:
    mime_type: str
    codec: Optional[str] = None
    bitrate: Optional[int] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    content_length: Optional[int] = None
    is_lossless: bool = False


@dataclass(frozen=True)
class ResolvedStream:
    provider: Provider
    source_id: str
    url: str
    headers: Dict[str, str]
    client_name: Optional[str]
    client_version: Optional[str]
    format: StreamFormat
    resolved_at_ms: int
    expires_at_ms: Optional[int] = None
    requires_range: bool = True
    range_chunk_size: int = 2 * 1024 * 1024  # 2MB chunks (BitChord CDN bypass)
    delivery_nonce: Optional[str] = None


@dataclass(frozen=True)
class PlaybackPolicy:
    max_bitrate: Optional[int] = None
    preferred_codec: Optional[str] = None
    preferred_container: Optional[str] = None
    metered: bool = False
    crossfade: bool = False
    video: bool = False
    allow_fallback: bool = True
