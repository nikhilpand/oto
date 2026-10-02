import asyncio
import inspect
import time
from typing import Optional, List, Dict, Any

from .core.identity.models import (
    TrackIdentity,
    TrackArtist,
    ProviderTrack,
    Provider,
)
from .core.identity.normalizer import (
    clean_title,
    normalize_unicode,
    extract_versions,
    normalize_isrc,
)
from .core.identity.matcher import hard_match, composite_match_score
from .core.playback.models import (
    ResolvedStream,
    StreamFormat,
    PlaybackPolicy,
    AudioQuality,
)
from .core.playback.coordinator import ResolutionCoordinator
from .core.playback.cache import StreamCache
from .core.playback.validator import StreamValidator
from .core.playback.health import ResolverHealthTracker
from .core.lyrics.models import Lyrics
from .core.lyrics.router import LyricsRouter
from .db.database import DatabaseManager
from .db.repositories.identity_repo import IdentityRepository
from .db.repositories.health_repo import HealthRepository
from .telemetry.events import EventLogger, PlaybackEvent
from .telemetry.metrics import MetricsCollector


class OTOService:
    """
    Master OTO Core Service orchestrating:
    - Canonical Music Identity Engine
    - Multi-Source Provider Matching Engine
    - Playback Resolution Engine with in-flight coalescing
    - Playback Reliability Engine (Generation Cache, 2-Stage Validator, Health Circuit Breaker)
    """

    def __init__(
        self,
        db_path: str = ":memory:",
        log_dir: str = "telemetry_logs",
        validator: Optional[StreamValidator] = None,
    ):
        self.db = DatabaseManager(db_path)
        self.identity_repo = IdentityRepository(self.db)
        self.health_repo = HealthRepository(self.db)

        self.coordinator = ResolutionCoordinator()
        self.cache = StreamCache(max_entries=500)
        self.validator = validator or StreamValidator()
        self.health_tracker = ResolverHealthTracker()
        self.lyrics_router = LyricsRouter()
        self.event_logger = EventLogger(log_dir)
        self.metrics = MetricsCollector()

    async def resolve_playback(
        self,
        identity_id: str,
        policy: Optional[PlaybackPolicy] = None,
        candidate_resolvers: Optional[List[Dict[str, Any]]] = None,
    ) -> ResolvedStream:
        """
        Production Playback Resolution Loop:
        1. Cache lookup with generation safety.
        2. In-flight request coalescing.
        3. Cascade across healthy providers.
        4. Two-stage stream validation (0-16KB probe + >1MB boundary probe).
        5. Cache insertion and circuit breaker update.
        """
        policy = policy or PlaybackPolicy()
        start_time = time.time()

        # 1. Cache Check
        cached_stream = self.cache.get(identity_id)
        if cached_stream:
            self.metrics.record_cache_hit()
            latency = (time.time() - start_time) * 1000.0
            self.metrics.record_stream_latency(latency)
            return cached_stream

        self.metrics.record_cache_miss()
        expected_gen = self.cache.get_generation(identity_id)

        # 2. Coalesced Resolution Task
        async def _do_resolve() -> ResolvedStream:
            # Rank candidates by health score
            resolvers = candidate_resolvers or []
            if not resolvers:
                # Default fallback mock resolver
                resolvers = [
                    {
                        "provider": "youtube",
                        "resolver": "ANDROID_VR",
                        "profile": "direct_cdn",
                        "execute": lambda: ResolvedStream(
                            provider=Provider.YOUTUBE,
                            source_id="default_fallback",
                            url="https://googlevideo.oto.mock/videoplayback?id=fallback",
                            headers={"User-Agent": "OTO/1.0"},
                            client_name="ANDROID_VR",
                            client_version="1.43.32",
                            format=StreamFormat(
                                mime_type="audio/webm; codecs=opus",
                                codec="opus",
                                bitrate=160_000,
                            ),
                            resolved_at_ms=int(time.time() * 1000),
                            expires_at_ms=int(time.time() * 1000) + 3600_000,
                        ),
                    }
                ]

            # Filter out providers in cooldown
            now_s = int(time.time())
            scored_resolvers = []
            for r in resolvers:
                h = self.health_tracker.get_or_create(
                    r["provider"], r["resolver"], r["profile"]
                )
                score = h.calculate_score(now_s)
                scored_resolvers.append((score, r))

            scored_resolvers.sort(key=lambda x: x[0], reverse=True)

            last_error: Optional[Exception] = None
            for score, r in scored_resolvers:
                res_start = time.time()
                try:
                    stream: ResolvedStream
                    if inspect.iscoroutinefunction(r["execute"]):
                        stream = await r["execute"]()
                    else:
                        stream = r["execute"]()

                    # 3. Stream Validation (Probe test)
                    is_valid = await self.validator.validate_stream(stream)
                    self.metrics.record_probe_result(is_valid)

                    if not is_valid:
                        # Probe failed!
                        self.health_tracker.record_failure(
                            r["provider"],
                            r["resolver"],
                            r["profile"],
                            "Probe validation failed (HTTP status or byte length invalid)",
                        )
                        continue

                    # Record success in health tracker
                    res_latency = (time.time() - res_start) * 1000.0
                    self.health_tracker.record_success(
                        r["provider"],
                        r["resolver"],
                        r["profile"],
                        res_latency,
                    )

                    # 4. Cache Insertion with generation check
                    self.cache.put(identity_id, stream, expected_gen)
                    return stream

                except Exception as e:
                    last_error = e
                    self.health_tracker.record_failure(
                        r["provider"], r["resolver"], r["profile"], str(e)
                    )

            if last_error:
                raise last_error
            raise RuntimeError(
                f"All resolvers exhausted or in cooldown for track: {identity_id}"
            )

        resolved = await self.coordinator.resolve(identity_id, _do_resolve)
        latency = (time.time() - start_time) * 1000.0
        self.metrics.record_stream_latency(latency)
        return resolved

    def register_or_get_identity(
        self,
        title: str,
        artists: List[str],
        duration_ms: Optional[int] = None,
        isrc: Optional[str] = None,
        album_title: Optional[str] = None,
        is_explicit: bool = False,
    ) -> TrackIdentity:
        """Registers a new or existing canonical track identity."""
        norm_title = clean_title(title)
        norm_album = clean_title(album_title) if album_title else None
        clean_isrc = normalize_isrc(isrc)

        track_artists = tuple(
            TrackArtist(
                name=a,
                normalized_name=normalize_unicode(a),
                position=i,
            )
            for i, a in enumerate(artists)
        )

        track_id = f"trk_{abs(hash((norm_title, tuple(a.normalized_name for a in track_artists))))}"
        identity = TrackIdentity(
            id=track_id,
            title=title,
            normalized_title=norm_title,
            artists=track_artists,
            album_title=album_title,
            normalized_album=norm_album,
            duration_ms=duration_ms,
            is_explicit=is_explicit,
            isrc=clean_isrc,
        )
        self.identity_repo.save_identity(identity)
        return identity
