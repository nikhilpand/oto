import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Optional, Dict
from .models import ResolvedStream


@dataclass
class CacheEntry:
    stream: ResolvedStream
    generation: int
    expires_at_ms: int


class StreamCache:
    """
    LRU-bounded stream cache with generation-protected invalidation and TTL checks.
    Guarantees that delayed asynchronous resolutions cannot overwrite fresh invalidated state.
    """

    def __init__(self, max_entries: int = 500):
        self._entries: OrderedDict[str, CacheEntry] = OrderedDict()
        self._generations: Dict[str, int] = {}
        self.max_entries = max_entries
        self.hits: int = 0
        self.misses: int = 0
        self.stale_rejects: int = 0
        self.evictions: int = 0

    def get_generation(self, track_id: str) -> int:
        return self._generations.get(track_id, 0)

    def get(
        self, track_id: str, now_ms: Optional[int] = None
    ) -> Optional[ResolvedStream]:
        if now_ms is None:
            now_ms = int(time.time() * 1000)

        entry = self._entries.get(track_id)
        if not entry:
            self.misses += 1
            return None

        if entry.expires_at_ms <= now_ms:
            self.misses += 1
            self.invalidate(track_id)
            return None

        self.hits += 1
        self._entries.move_to_end(track_id)
        return entry.stream

    def put(
        self,
        track_id: str,
        stream: ResolvedStream,
        expected_generation: int,
        now_ms: Optional[int] = None,
    ) -> bool:
        """
        Inserts resolved stream only if the track's generation has not changed
        since the resolution began.
        """
        current_gen = self.get_generation(track_id)
        if current_gen != expected_generation:
            # Stale write rejected!
            self.stale_rejects += 1
            return False

        if now_ms is None:
            now_ms = int(time.time() * 1000)

        expiry = stream.expires_at_ms or (now_ms + 300_000)  # Default 5m

        self._entries[track_id] = CacheEntry(
            stream=stream, generation=current_gen, expires_at_ms=expiry
        )
        self._entries.move_to_end(track_id)

        while len(self._entries) > self.max_entries:
            self._entries.popitem(last=False)
            self.evictions += 1

        return True

    def invalidate(self, track_id: str) -> None:
        """Removes the entry and increments the generation counter."""
        self._entries.pop(track_id, None)
        self._generations[track_id] = self.get_generation(track_id) + 1

    def clear(self) -> None:
        self._entries.clear()
        self._generations.clear()

    @property
    def size(self) -> int:
        return len(self._entries)
