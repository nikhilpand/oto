import asyncio
from typing import Dict, Callable, Coroutine, Any, Optional
from .models import ResolvedStream


class ResolutionCoordinator:
    """
    Coalesces concurrent resolution requests for the same track into a single
    in-flight async task. Prevents prefetch, player, seek, and retry from
    launching redundant network extractions and cipher deobfuscations.
    """

    def __init__(self):
        self._inflight: Dict[str, asyncio.Task[ResolvedStream]] = {}
        self._lock = asyncio.Lock()
        self.coalesced_hits: int = 0
        self.total_resolutions: int = 0

    @property
    def active_count(self) -> int:
        return len(self._inflight)

    async def resolve(
        self,
        track_id: str,
        resolver_fn: Callable[[], Coroutine[Any, Any, ResolvedStream]],
    ) -> ResolvedStream:
        self.total_resolutions += 1
        async with self._lock:
            existing = self._inflight.get(track_id)
            if existing is not None:
                self.coalesced_hits += 1
                task = existing
            else:
                task = asyncio.create_task(resolver_fn())
                self._inflight[track_id] = task

                def _cleanup(t: asyncio.Task):
                    # Remove from in-flight on completion or error
                    self._inflight.pop(track_id, None)

                task.add_done_callback(_cleanup)

        return await task
