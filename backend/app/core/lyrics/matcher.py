import re
from typing import Tuple, Optional, List
from .models import Lyrics, LyricLine, LyricWord
from ..identity.models import TrackIdentity
from ..identity.normalizer import clean_title, normalize_artists
from ..identity.matcher import string_similarity


def parse_lrc(
    lrc_content: str, provider: str = "lrc", track_id: str = ""
) -> Lyrics:
    """Parses standard synced LRC format string into structured Lyrics model."""
    lines: List[LyricLine] = []
    # Matches [mm:ss.xx] or [mm:ss.xxx]
    tag_pattern = re.compile(r"\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]")

    for raw_line in lrc_content.splitlines():
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        match = tag_pattern.match(raw_line)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            millis_str = match.group(3) or "0"
            if len(millis_str) == 2:
                millis = int(millis_str) * 10
            else:
                millis = int(millis_str[:3])

            timestamp_ms = (minutes * 60 * 1000) + (seconds * 1000) + millis
            text = tag_pattern.sub("", raw_line).strip()

            lines.append(
                LyricLine(start_ms=timestamp_ms, end_ms=None, text=text)
            )

    # Sort lines by start_ms
    lines.sort(key=lambda l: l.start_ms)

    # Infer line end times
    resolved_lines: List[LyricLine] = []
    for i, line in enumerate(lines):
        next_start = lines[i + 1].start_ms if i + 1 < len(lines) else None
        resolved_lines.append(
            LyricLine(
                start_ms=line.start_ms,
                end_ms=next_start,
                text=line.text,
                words=line.words,
            )
        )

    return Lyrics(
        provider=provider,
        track_id=track_id,
        lines=tuple(resolved_lines),
        is_synced=len(resolved_lines) > 0,
        has_word_timestamps=False,
    )


def score_lyrics_candidate(
    identity: TrackIdentity,
    candidate_title: str,
    candidate_artist: str,
    candidate_duration_ms: Optional[int],
) -> float:
    """
    Scores how well a lyric candidate matches the target track identity.
    Score = 0.50 * title_sim + 0.30 * artist_sim + 0.20 * duration_sim
    """
    clean_a = clean_title(identity.title)
    clean_b = clean_title(candidate_title)
    title_sim = string_similarity(clean_a, clean_b)

    # Artist similarity
    identity_artists = {a.normalized_name for a in identity.artists}
    candidate_artists = normalize_artists([candidate_artist])
    common = identity_artists & candidate_artists
    artist_sim = (
        1.0 if common else string_similarity(clean_title(" ".join(identity_artists)), clean_title(candidate_artist))
    )

    # Duration similarity
    duration_sim = 1.0
    if identity.duration_ms and candidate_duration_ms:
        delta = abs(identity.duration_ms - candidate_duration_ms)
        duration_sim = max(0.0, 1.0 - (delta / 5000.0))

    score = (title_sim * 0.50) + (artist_sim * 0.30) + (duration_sim * 0.20)
    return round(score, 4)
