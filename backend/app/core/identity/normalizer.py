import re
import unicodedata
from typing import Set, Tuple, List

# Known version markers that alter the musical take/arrangement.
# These MUST maintain symmetric agreement between tracks.
VERSION_KEYWORDS = {
    "remix",
    "acoustic",
    "live",
    "instrumental",
    "slowed",
    "reverb",
    "edit",
    "deluxe",
    "unplugged",
    "orchestral",
    "sped up",
    "speed up",
    "radio edit",
    "extended",
    "club mix",
    "reprise",
    "cover",
    "demo",
}

# Packaging metadata brackets that should be ignored for matching.
PACKAGING_PATTERNS = [
    r"\[(?:official\s+)?(?:music\s+)?video\]",
    r"\((?:official\s+)?(?:music\s+)?video\)",
    r"\[(?:official\s+)?audio\]",
    r"\((?:official\s+)?audio\)",
    r"\[(?:official\s+)?visualizer\]",
    r"\((?:official\s+)?visualizer\)",
    r"\[lyric\s+video\]",
    r"\((?:official\s+)?lyric\s+video\)",
    r"\[lyrics\]",
    r"\(lyrics\)",
    r"\[4k\]",
    r"\[hd\]",
    r"\[audio\s+track\]",
    r"\[(?:explicit|clean)\]",
    r"\((?:explicit|clean)\)",
    r"from\s+[\"'].*?[\"']",
    r"\(from\s+[\"'].*?[\"']\)",
]


def normalize_unicode(text: str) -> str:
    """Normalize unicode characters and strip combining diacritics."""
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return stripped.lower().strip()


def extract_versions(title: str) -> Set[str]:
    """
    Extracts version modifiers (e.g., 'remix', 'acoustic', 'live') from brackets or free text.
    """
    if not title:
        return set()

    normalized = normalize_unicode(title)
    found_versions: Set[str] = set()

    for kw in VERSION_KEYWORDS:
        # Check for word boundary match
        pattern = rf"\b{re.escape(kw)}\b"
        if re.search(pattern, normalized):
            found_versions.add(kw)

    return found_versions


def clean_title(title: str) -> str:
    """
    Strips packaging brackets and version annotations from the title,
    returning the canonical core title for linguistic comparison.
    """
    if not title:
        return ""

    cleaned = title
    # 1. Remove standard packaging strings
    for pattern in PACKAGING_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    # 2. Remove bracketed version tags after they have been extracted
    bracket_content_pattern = r"[\(\[\{](.*?)[\)\]\}]"
    for match in re.finditer(bracket_content_pattern, cleaned):
        inner = match.group(1).lower()
        if any(kw in inner for kw in VERSION_KEYWORDS):
            cleaned = cleaned.replace(match.group(0), "")

    # 3. Strip feat / ft mentions from title
    feat_pattern = r"\b(?:feat|ft)\.?\s+.*?(?=[\(\[\{]|$)"
    cleaned = re.sub(feat_pattern, "", cleaned, flags=re.IGNORECASE)

    # 4. Remove punctuation and collapse spaces
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return normalize_unicode(cleaned)


def normalize_artists(artist_names: List[str] | Tuple[str, ...]) -> Set[str]:
    """
    Normalizes a list of artist strings, splitting multi-artist strings (e.g. 'A & B feat. C')
    into individual normalized artist names.
    """
    split_pattern = r"(?:,|&|\bfeat\.?\b|\bft\.?\b|\bvs\.?\b|;|/)"
    normalized_set: Set[str] = set()

    for name in artist_names:
        if not name:
            continue
        parts = re.split(split_pattern, name, flags=re.IGNORECASE)
        for part in parts:
            cleaned = re.sub(r"[^\w\s]", "", part)
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            norm = normalize_unicode(cleaned)
            if norm:
                normalized_set.add(norm)

    return normalized_set


def normalize_isrc(isrc: str | None) -> str | None:
    """Normalizes International Standard Recording Code."""
    if not isrc:
        return None
    cleaned = re.sub(r"[^A-Za-z0-9]", "", isrc).upper().strip()
    return cleaned if len(cleaned) == 12 else None
