import time
from dataclasses import dataclass
from typing import Optional, Dict, Tuple


@dataclass
class ResolverHealth:
    provider: str
    resolver: str
    profile: str
    successes: int = 0
    failures: int = 0
    consecutive_failures: int = 0
    avg_latency_ms: float = 350.0
    last_success_at: Optional[int] = None
    last_failure_at: Optional[int] = None
    cooldown_until: int = 0
    last_error: Optional[str] = None

    def calculate_score(self, now_s: Optional[int] = None) -> float:
        """
        Calculates dynamic health score between 0.0 and 1.0.
        Penalizes heavily during active cooldown periods.
        """
        if now_s is None:
            now_s = int(time.time())

        # If in cooldown, score is 0.0 (circuit open)
        if self.cooldown_until > now_s:
            return 0.0

        total_ops = self.successes + self.failures
        reliability = self.successes / max(total_ops, 1) if total_ops > 0 else 0.8

        # Latency factor: 100ms -> 1.0, 1000ms -> 0.1
        latency_factor = min(1.0, 100.0 / max(self.avg_latency_ms, 50.0))

        score = (reliability * 0.70) + (latency_factor * 0.30)
        return round(score, 4)


class ResolverHealthTracker:
    """
    In-memory and persistent tracker for resolver profiles.
    Maintains moving latency averages, reliability metrics, and circuit-breaker backoffs.
    """

    def __init__(self):
        self._registry: Dict[Tuple[str, str, str], ResolverHealth] = {}

    def get_or_create(
        self, provider: str, resolver: str, profile: str
    ) -> ResolverHealth:
        key = (provider, resolver, profile)
        if key not in self._registry:
            self._registry[key] = ResolverHealth(
                provider=provider, resolver=resolver, profile=profile
            )
        return self._registry[key]

    def record_success(
        self,
        provider: str,
        resolver: str,
        profile: str,
        latency_ms: float,
        now_s: Optional[int] = None,
    ) -> None:
        if now_s is None:
            now_s = int(time.time())

        h = self.get_or_create(provider, resolver, profile)
        h.successes += 1
        h.consecutive_failures = 0
        h.cooldown_until = 0
        h.last_success_at = now_s

        # Exponential moving average for latency (alpha = 0.2)
        h.avg_latency_ms = (h.avg_latency_ms * 0.8) + (latency_ms * 0.2)

    def record_failure(
        self,
        provider: str,
        resolver: str,
        profile: str,
        error_msg: str,
        now_s: Optional[int] = None,
    ) -> None:
        if now_s is None:
            now_s = int(time.time())

        h = self.get_or_create(provider, resolver, profile)
        h.failures += 1
        h.consecutive_failures += 1
        h.last_failure_at = now_s
        h.last_error = error_msg

        # Exponential backoff cooldown: 30s, 60s, 120s, up to 1800s (30m)
        backoff_sec = min(30 * (2 ** (h.consecutive_failures - 1)), 1800)
        h.cooldown_until = now_s + backoff_sec

    def is_available(
        self,
        provider: str,
        resolver: str,
        profile: str,
        now_s: Optional[int] = None,
    ) -> bool:
        if now_s is None:
            now_s = int(time.time())
        h = self.get_or_create(provider, resolver, profile)
        return h.cooldown_until <= now_s
