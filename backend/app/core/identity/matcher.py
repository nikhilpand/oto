from typing import Optional, Set
from .models import TrackIdentity, ProviderTrack
from .normalizer import (
    clean_title,
    extract_versions,
    normalize_artists,
    normalize_isrc,
    normalize_unicode,
)


def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein distance between two strings using DP."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def string_similarity(s1: str, s2: str) -> float:
    """Returns normalized string similarity in [0.0, 1.0]."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    dist = levenshtein_distance(s1, s2)
    max_len = max(len(s1), len(s2))
    return 1.0 - (dist / max_len)


def hard_match(
    identity: TrackIdentity,
    candidate: ProviderTrack,
    max_duration_delta_ms: int = 3000,
    allow_loose_video_duration: bool = False,
) -> bool:
    """
    Executes strict deterministic gates. If any gate fails, the candidate is rejected.
    Never uses fuzzy matching to override a failed hard gate.
    """
    # 1. ISRC Gate: If both provide ISRC, equality is authoritative
    isrc_a = normalize_isrc(identity.isrc)
    isrc_b = normalize_isrc(candidate.isrc)
    if isrc_a and isrc_b:
        return isrc_a == isrc_b

    # 2. Symmetric Version Gate: Mandatory agreement on take modifiers (e.g. remix, live)
    versions_a = extract_versions(identity.title)
    versions_b = extract_versions(candidate.title)
    if versions_a != versions_b:
        return False

    # 3. Explicit Content Gate: Must match explicit tag
    if identity.is_explicit != candidate.is_explicit:
        return False

    # 4. Duration Gate
    if identity.duration_ms and candidate.duration_ms:
        delta = abs(identity.duration_ms - candidate.duration_ms)
        threshold = 12000 if allow_loose_video_duration else max_duration_delta_ms
        if delta > threshold:
            return False

    # 5. Artist Intersection Gate: Must share at least one primary or featured artist
    identity_artists = {a.normalized_name for a in identity.artists}
    candidate_artists = normalize_artists(candidate.artists)

    if not (identity_artists & candidate_artists):
        return False

    # 6. Core Title Similarity Gate: Cleaned titles must have >= 85% similarity
    clean_a = clean_title(identity.title)
    clean_b = clean_title(candidate.title)
    if not clean_a or not clean_b:
        return False

    if clean_a != clean_b and string_similarity(clean_a, clean_b) < 0.85:
        return False

    return True


def composite_match_score(
    identity: TrackIdentity,
    candidate: ProviderTrack,
) -> float:
    """
    Computes a composite confidence score for ranking candidates that have passed the hard gates.
    Score = 0.50 * title_sim + 0.25 * artist_sim + 0.15 * album_sim + 0.10 * duration_closeness
    """
    # Title similarity
    clean_a = clean_title(identity.title)
    clean_b = clean_title(candidate.title)
    title_sim = string_similarity(clean_a, clean_b)

    # Artist similarity
    identity_artists = {a.normalized_name for a in identity.artists}
    candidate_artists = normalize_artists(candidate.artists)
    common_artists = identity_artists & candidate_artists
    artist_sim = (
        len(common_artists) / max(len(identity_artists | candidate_artists), 1)
    )

    # Album similarity (if available)
    album_sim = 0.0
    if identity.album_title and candidate.album_title:
        norm_album_a = normalize_unicode(identity.album_title)
        norm_album_b = normalize_unicode(candidate.album_title)
        album_sim = string_similarity(norm_album_a, norm_album_b)
    elif not identity.album_title and not candidate.album_title:
        album_sim = 1.0
    else:
        album_sim = 0.5  # Neutral when only one side provides album

    # Duration closeness (normalized within 3 seconds)
    duration_sim = 1.0
    if identity.duration_ms and candidate.duration_ms:
        delta = abs(identity.duration_ms - candidate.duration_ms)
        duration_sim = max(0.0, 1.0 - (delta / 3000.0))

    score = (
        (title_sim * 0.50)
        + (artist_sim * 0.25)
        + (album_sim * 0.15)
        + (duration_sim * 0.10)
    )
    return round(score, 4)
