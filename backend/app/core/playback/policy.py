from typing import List, Optional
from .models import StreamFormat, PlaybackPolicy


def select_best_format(
    formats: List[StreamFormat], policy: PlaybackPolicy
) -> Optional[StreamFormat]:
    """
    Selects the optimal audio format given the client's PlaybackPolicy.
    Filters by max bitrate, preferred codec, and container type.
    """
    if not formats:
        return None

    # Filter candidates
    candidates = list(formats)

    # 1. Apply metered cap
    if policy.metered:
        max_rate = policy.max_bitrate or 160_000
        candidates = [
            f for f in candidates if not f.bitrate or f.bitrate <= max_rate
        ]
    elif policy.max_bitrate:
        candidates = [
            f
            for f in candidates
            if not f.bitrate or f.bitrate <= policy.max_bitrate
        ]

    if not candidates:
        # Fallback to lowest bitrate format if all exceeded cap
        candidates = sorted(formats, key=lambda f: f.bitrate or 0)
        return candidates[0] if candidates else None

    # 2. Prioritize preferred codec if specified
    if policy.preferred_codec:
        matching_codec = [
            f
            for f in candidates
            if f.codec and policy.preferred_codec.lower() in f.codec.lower()
        ]
        if matching_codec:
            candidates = matching_codec

    # 3. Sort by bitrate descending (highest quality that meets policy)
    candidates.sort(key=lambda f: (f.bitrate or 0), reverse=True)
    return candidates[0]
