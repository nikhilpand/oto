from typing import Optional, List
from ...core.playback.health import ResolverHealth
from ..database import DatabaseManager


class HealthRepository:
    def __init__(self, db: DatabaseManager):
        self.db = db

    def save_health(self, h: ResolverHealth) -> None:
        conn = self.db.get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO resolver_health (
                    provider, resolver, profile, successes, failures,
                    consecutive_failures, avg_latency_ms, last_success_at,
                    last_failure_at, cooldown_until, last_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(provider, resolver, profile) DO UPDATE SET
                    successes=excluded.successes,
                    failures=excluded.failures,
                    consecutive_failures=excluded.consecutive_failures,
                    avg_latency_ms=excluded.avg_latency_ms,
                    last_success_at=excluded.last_success_at,
                    last_failure_at=excluded.last_failure_at,
                    cooldown_until=excluded.cooldown_until,
                    last_error=excluded.last_error
                """,
                (
                    h.provider,
                    h.resolver,
                    h.profile,
                    h.successes,
                    h.failures,
                    h.consecutive_failures,
                    h.avg_latency_ms,
                    h.last_success_at,
                    h.last_failure_at,
                    h.cooldown_until,
                    h.last_error,
                ),
            )

    def get_health(
        self, provider: str, resolver: str, profile: str
    ) -> Optional[ResolverHealth]:
        conn = self.db.get_connection()
        cur = conn.execute(
            """
            SELECT provider, resolver, profile, successes, failures,
                   consecutive_failures, avg_latency_ms, last_success_at,
                   last_failure_at, cooldown_until, last_error
            FROM resolver_health
            WHERE provider = ? AND resolver = ? AND profile = ?
            """,
            (provider, resolver, profile),
        )
        row = cur.fetchone()
        if not row:
            return None

        return ResolverHealth(
            provider=row["provider"],
            resolver=row["resolver"],
            profile=row["profile"],
            successes=row["successes"],
            failures=row["failures"],
            consecutive_failures=row["consecutive_failures"],
            avg_latency_ms=row["avg_latency_ms"],
            last_success_at=row["last_success_at"],
            last_failure_at=row["last_failure_at"],
            cooldown_until=row["cooldown_until"],
            last_error=row["last_error"],
        )
