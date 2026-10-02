from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass(frozen=True)
class LyricWord:
    start_ms: int
    end_ms: Optional[int]
    text: str


@dataclass(frozen=True)
class LyricLine:
    start_ms: int
    end_ms: Optional[int]
    text: str
    words: Tuple[LyricWord, ...] = ()


@dataclass(frozen=True)
class Lyrics:
    provider: str
    track_id: str
    lines: Tuple[LyricLine, ...]
    is_synced: bool
    language: Optional[str] = None
    has_word_timestamps: bool = False
