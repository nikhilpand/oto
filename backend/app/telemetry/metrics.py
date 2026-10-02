import math
from typing import List, Dict, Any


class MetricsCollector:
    """Collects resolution latencies, cache performance, and SLO compliance."""

    def __init__(self):
        self.metadata_latencies: List[float] = []
        self.stream_latencies: List[float] = []
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        self.probe_passes: int = 0
        self.probe_fails: int = 0
        self.wrong_matches: int = 0
        self.total_matches: int = 0

    def record_metadata_latency(self, ms: float) -> None:
        self.metadata_latencies.append(ms)

    def record_stream_latency(self, ms: float) -> None:
        self.stream_latencies.append(ms)

    def record_cache_hit(self) -> None:
        self.cache_hits += 1

    def record_cache_miss(self) -> None:
        self.cache_misses += 1

    def record_probe_result(self, success: bool) -> None:
        if success:
            self.probe_passes += 1
        else:
            self.probe_fails += 1

    def record_match_result(self, is_wrong: bool) -> None:
        self.total_matches += 1
        if is_wrong:
            self.wrong_matches += 1

    def _percentile(self, values: List[float], p: float) -> float:
        if not values:
            return 0.0
        s = sorted(values)
        idx = int(math.ceil(len(s) * (p / 100.0))) - 1
        return s[max(0, min(idx, len(s) - 1))]

    def get_summary(self) -> Dict[str, Any]:
        total_cache = self.cache_hits + self.cache_misses
        cache_hit_rate = (
            (self.cache_hits / total_cache * 100.0) if total_cache > 0 else 0.0
        )
        wrong_match_rate = (
            (self.wrong_matches / self.total_matches * 100.0)
            if self.total_matches > 0
            else 0.0
        )

        return {
            "metadata_p50_ms": self._percentile(self.metadata_latencies, 50),
            "metadata_p95_ms": self._percentile(self.metadata_latencies, 95),
            "stream_p50_ms": self._percentile(self.stream_latencies, 50),
            "stream_p95_ms": self._percentile(self.stream_latencies, 95),
            "cache_hit_rate_pct": round(cache_hit_rate, 2),
            "wrong_match_rate_pct": round(wrong_match_rate, 4),
            "probe_passes": self.probe_passes,
            "probe_fails": self.probe_fails,
        }
