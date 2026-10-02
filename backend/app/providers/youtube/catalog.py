from typing import List, Optional, Dict, Any
from ..base import CatalogProvider
from ...core.identity.models import ProviderTrack, Provider
from ...core.identity.normalizer import clean_title, normalize_unicode
from .session import InnerTubeSession, CLIENT_WEB_REMIX


class YouTubeCatalogProvider(CatalogProvider):
    provider_name: str = "youtube"

    def __init__(self, session: Optional[InnerTubeSession] = None):
        self.session = session or InnerTubeSession()

    async def search(self, query: str, limit: int = 20) -> List[ProviderTrack]:
        # Formulate search payload
        norm_query = clean_title(query)
        # Returns candidate ProviderTrack models
        return []

    async def get_track(self, source_id: str) -> Optional[ProviderTrack]:
        return None

    async def get_radio(
        self, source_id: str, limit: int = 25
    ) -> List[ProviderTrack]:
        return []

    async def get_related(self, source_id: str) -> List[ProviderTrack]:
        return []
