from dataclasses import dataclass
from typing import Optional, Dict


@dataclass
class CandidateContext:
    track_id: str
    artist_name: str
    personal_affinity: float = 0.5  # Past plays/likes [0.0, 1.0]
    artist_affinity: float = 0.5  # Affinity for this artist
    context_similarity: float = 0.5  # Semantic/genre closeness to active track
    completion_rate: float = 0.8  # Past completion % when played
    freshness: float = 0.5  # Release date / recency factor
    novelty: float = 0.5  # Unheard factor
    source_confidence: float = 0.8  # Upstream source quality (e.g. YouTube radio vs cold search)


def score_recommendation(candidate: CandidateContext) -> float:
    """
    Computes 7-factor recommendation score without LLM hallucination:
    0.35 personal + 0.20 artist + 0.15 context + 0.10 completion + 0.05 freshness + 0.10 novelty + 0.05 source
    """
    score = (
        (candidate.personal_affinity * 0.35)
        + (candidate.artist_affinity * 0.20)
        + (candidate.context_similarity * 0.15)
        + (candidate.completion_rate * 0.10)
        + (candidate.freshness * 0.05)
        + (candidate.novelty * 0.10)
        + (candidate.source_confidence * 0.05)
    )
    return round(score, 4)
