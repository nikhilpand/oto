from .base import CatalogProvider, PlaybackProvider
from .youtube.catalog import YouTubeCatalogProvider
from .youtube.playback import YouTubePlaybackProvider
from .jiosaavn.playback import JioSaavnPlaybackProvider
from .lyrics.lrclib import LRCLIBLyricsProvider

__all__ = [
    "CatalogProvider",
    "PlaybackProvider",
    "YouTubeCatalogProvider",
    "YouTubePlaybackProvider",
    "JioSaavnPlaybackProvider",
    "LRCLIBLyricsProvider",
]
