from typing import List, Set, Dict
from .ranker import CandidateContext, score_recommendation


class DiversityFilter:
    """
    Enforces anti-fatigue constraints on recommended queue:
    - No identical track within history_window
    - Artist repetition cap within artist_window
    - Skip penalty on recently abandoned tracks
    """

    def __init__(
        self,
        history_window: int = 25,
        artist_cap: int = 2,
        artist_window: int = 10,
    ):
        self.history_window = history_window
        self.artist_cap = artist_cap
        self.artist_window = artist_window

    def filter_and_rank(
        self,
        candidates: List[CandidateContext],
        recent_track_ids: List[str],
        recent_artists: List[str],
        skipped_track_ids: Set[str],
    ) -> List[CandidateContext]:
        # 1. Filter out tracks in recent history
        recent_id_set = set(recent_track_ids[-self.history_window :])
        filtered: List[CandidateContext] = []

        # Count occurrences of artists in artist_window
        artist_counts: Dict[str, int] = {}
        for a in recent_artists[-self.artist_window :]:
            artist_counts[a] = artist_counts.get(a, 0) + 1

        for cand in candidates:
            # Drop if recently played
            if cand.track_id in recent_id_set:
                continue

            # Drop if artist cap exceeded
            cur_artist_count = artist_counts.get(cand.artist_name, 0)
            if cur_artist_count >= self.artist_cap:
                continue

            # Apply 50% penalty if skipped recently
            if cand.track_id in skipped_track_ids:
                cand.personal_affinity *= 0.5
                cand.completion_rate *= 0.5

            filtered.append(cand)

        # 2. Sort by composite score descending
        filtered.sort(key=score_recommendation, reverse=True)
        return filtered
