import json
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class PlaybackEvent:
    event_id: str
    track_id: str
    duration_ms: int
    played_ms: int
    completed: bool
    timestamp: int


class EventLogger:
    """
    Appends playback events to monthly partitioned JSONL files.
    Eliminates SQLite write-ahead-log (WAL) bloat and prevents schema migration deadlocks.
    """

    def __init__(self, log_dir: str = "telemetry_logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def _get_partition_path(self, timestamp: int) -> Path:
        # e.g., events_2026_10.jsonl
        tm = time.gmtime(timestamp)
        filename = f"events_{tm.tm_year}_{tm.tm_mon:02d}.jsonl"
        return self.log_dir / filename

    def log_playback_event(self, event: PlaybackEvent) -> None:
        path = self._get_partition_path(event.timestamp)
        line = json.dumps(asdict(event)) + "\n"
        with open(path, "a", encoding="utf-8") as f:
            f.write(line)
