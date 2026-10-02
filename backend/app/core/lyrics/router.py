import asyncio
from typing import List, Optional, Protocol, Tuple
from .models import Lyrics
from ..identity.models import TrackIdentity
from .matcher import score_lyrics_candidate


class LyricsProvider(Protocol):
    name: str

    async def fetch_lyrics(
        self, identity: TrackIdentity
    ) -> Optional[Tuple[Lyrics, float]]:
        """Returns tuple of (Lyrics, confidence_score) or None."""
        ...


class LyricsRouter:
    """
    Cascades across multiple lyrics providers (LRCLIB, BetterLyrics, SimpMusic).
    Scores all candidates against TrackIdentity and returns the highest quality match.
    """

    def __init__(self, providers: Optional[List[LyricsProvider]] = None):
        self.providers: List[LyricsProvider] = providers or []

    def register_provider(self, provider: LyricsProvider) -> None:
        self.providers.append(provider)

    async def resolve_lyrics(self, identity: TrackIdentity) -> Optional[Lyrics]:
        if not self.providers:
            return None

        # Query all providers concurrently with timeout
        tasks = [
            asyncio.create_task(p.fetch_lyrics(identity))
            for p in self.providers
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        best_score = -1.0
        best_lyrics: Optional[Lyrics] = None

        for res in results:
            if isinstance(res, tuple) and len(res) == 2:
                lyrics, score = res
                if lyrics and score > best_score and score >= 0.70:
                    best_score = score
                    best_lyrics = lyrics

        return best_lyrics
