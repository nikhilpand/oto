from typing import Protocol, List, Optional, Any, Dict
from ..core.identity.models import TrackIdentity, ProviderTrack
from ..core.playback.models import ResolvedStream, PlaybackPolicy


class CatalogProvider(Protocol):
    provider_name: str

    async def search(self, query: str, limit: int = 20) -> List[ProviderTrack]:
        ...

    async def get_track(self, source_id: str) -> Optional[ProviderTrack]:
        ...

    async def get_radio(self, source_id: str, limit: int = 25) -> List[ProviderTrack]:
        ...

    async def get_related(self, source_id: str) -> List[ProviderTrack]:
        ...


class PlaybackProvider(Protocol):
    provider_name: str

    async def resolve(
        self, source_id: str, policy: PlaybackPolicy
    ) -> Optional[ResolvedStream]:
        ...
