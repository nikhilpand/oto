# BitChord -> OTO Migration Report

Generated: 2026-10-03

## Executive Summary

| Metric | Count |
|--------|-------|
| Total BitChord Kotlin files | 301 |
| Mapped components | 76 |
| Already ported to OTO | 42 |
| Needs porting | 31 |
| Excluded (DO NOT USE) | 3 |
| Unmapped files | 212 |

---

## Already Ported (42 components)

These components already exist in OTO. Verify feature parity with BitChord.

| Component | BitChord Source | OTO File(s) | Priority |
|-----------|----------------|-------------|----------|
| Dual-player equal-power crossfade (sin²+cos²=1), arming wind | `playback/CrossfadeController.kt` | `audio/AudioEngine.ts`, `audio/RealAudioEngine.ts` | P0 |
| Android foreground service, MediaSession, notification, audi | `playback/PlaybackService.kt` | `audio/AudioEngine.ts` | P0 |
| Binds UI to playback service, exposes player state to compos | `playback/PlayerConnection.kt` | `audio/AudioContext.tsx`, `store/usePlaybackStore.ts` | P0 |
| Two-tier queue: priority (play next) + standard. Shuffle pre | `playback/QueueCoordinator.kt` | `domain/queue/QueueCoordinator.ts`, `domain/queue/types.ts`, `store/useQueueStore.ts` | P0 |
| Builds initial queue from album/playlist context | `playback/QueueBuilder.kt` | `domain/queue/QueueCoordinator.ts` | P0 |
| Selects best stream format/bitrate from available options | `playback/StreamChoice.kt` | `audio/StreamChoice.ts` | P0 |
| 2MB bounded range chunk cache with canonical URL keying | `playback/AudioCache.kt` | `audio/cache/StreamCache.ts` | P0 |
| Waterfall source resolution with circuit breaker fallbacks | `data/sources/SourceResolver.kt` | `api/resilience/circuitBreaker.ts` | P0 |
| 3-phase fuzzy matching: normalization -> version parity -> d | `data/sources/TrackMatcher.kt` | `api/matching/trackMatcher.ts` | P0 |
| InnerTube API integration for YouTube Music streaming | `data/sources/YouTubeSource.kt` | `auth/innertube/InnertubeClient.ts` | P0 |
| Core InnerTube API client with visitor data + session tokens | `data/innertube/Innertube.kt` | `auth/innertube/InnertubeClient.ts` | P0 |
| Response parser for InnerTube browse/search/next endpoints | `data/innertube/InnertubeParser.kt` | `auth/innertube/innertubeParsers.ts` | P0 |
| Cipher/signature solving for stream URLs | `data/innertube/InnerTubeXResolver.kt` | `auth/innertube/crypto.ts` | P0 |
| Auth state management with encrypted token storage | `auth/AuthStore.kt` | `auth/GoogleAuthStore.ts` | P0 |
| Full-screen now playing with artwork, controls, lyrics toggl | `ui/player/NowPlayingScreen.kt` | `player/components/OTONowPlayingContent.tsx`, `player/components/OTONowPlayingShell.tsx` | P0 |
| Collapsed mini player with gesture expand | `ui/components/MiniPlayer.kt` | `player/components/OTOMiniPlayer.tsx` | P0 |
| Home screen with personalized sections | `ui/screens/HomeScreen.kt` | `home/screens/HomeScreenContent.tsx` | P0 |
| Search with categorized results | `ui/screens/SearchScreen.kt` | `search/screens/SearchScreenContent.tsx` | P0 |
| Library with playlists, albums, artists | `ui/screens/LibraryScreen.kt` | `library/screens/LibraryScreenContent.tsx` | P0 |
| Core domain models: Song, Album, Artist, Playlist | `data/model/Models.kt` | `domain/types.ts` | P0 |
| Maintains un-shuffled history for shuffle toggle restore | `playback/QueueHistory.kt` | `domain/queue/QueueCoordinator.ts` | P1 |
| Fisher-Yates shuffle with current-track pinning | `playback/QueueShuffle.kt` | `domain/queue/QueueCoordinator.ts` | P1 |
| Dynamic LRU eviction monitoring filesystem free space | `playback/DynamicLruCacheEvictor.kt` | `audio/cache/StreamCache.ts` | P1 |
| Sleep timer with fade-out and end-of-track modes | `playback/SleepTimer.kt` | `audio/SleepTimer.ts` | P1 |
| Audio routing policy (speaker/headphone/bluetooth/USB DAC) | `playback/AudioOutputPolicy.kt` | `audio/AudioOutputPolicy.ts`, `audio/OutputNegotiator.ts` | P1 |
| Dynamic registration of music sources with priority + health | `data/sources/SourceRegistry.kt` | `sources/SourceRegistry.ts`, `sources/SourceTypes.ts` | P1 |
| JioSaavn 320kbps AAC extraction with DES-ECB key | `data/sources/JioSaavnSource.kt` | `api/directJioSaavn.ts`, `api/crypto/desEcb.ts` | P1 |
| Base interface for pluggable music source providers | `data/sources/MusicSource.kt` | `sources/SourceTypes.ts` | P1 |
| Enum of source types (YouTube, JioSaavn, Local, etc.) | `data/sources/SourceKind.kt` | `sources/SourceTypes.ts` | P1 |
| 16-provider waterfall lyrics fetcher with caching | `data/lyrics/LyricsRepository.kt` | `api/directLyrics.ts` | P1 |
| Base interface for lyrics providers | `data/lyrics/LyricsSource.kt` | `utils/lyrics/types.ts` | P1 |
| Lyric line data model with timing | `data/lyrics/LyricLine.kt` | `utils/lyrics/types.ts` | P1 |
| TTML rich lyrics parsing (Apple Music/Spotify) | `data/lyrics/TtmlLyrics.kt` | `utils/lyrics/TtmlParser.ts` | P1 |
| Enhanced LRC with word-level timestamps | `data/lyrics/EnhancedLrc.kt` | `utils/lyrics/EnhancedLrcParser.ts` | P1 |
| Fetches animated canvas artwork (Spotify/Apple/Tidal) | `data/canvas/CanvasRepository.kt` | `canvas/CanvasRepository.ts`, `canvas/CanvasCache.ts` | P1 |
| Monthly partitioned JSON listening stats (zero-database) | `data/stats/ListeningStats.kt` | `analytics/ListeningRecorder.ts` | P1 |
| 30-second listen threshold recorder | `data/stats/ListeningRecorder.kt` | `analytics/ListeningRecorder.ts` | P1 |
| Last.fm / ListenBrainz scrobble dispatch | `data/scrobbling/ScrobbleManager.kt` | `analytics/scrobbling/ScrobbleManager.ts` | P1 |
| Queue drawer with drag-to-reorder | `ui/player/PlayerQueue.kt` | `queue/components/OTOQueue.tsx`, `queue/components/OTOQueueItem.tsx` | P1 |
| Synchronized lyrics display with word-level glow | `ui/player/PlayerLyrics.kt` | `lyrics/components/OTOLyrics.tsx`, `lyrics/components/OTOLyricLine.tsx` | P1 |
| Persistent search history with dedup and LRU eviction | `data/settings/SearchHistory.kt` | `search/storage/recentSearchesStorage.ts` | P1 |
| Multi-worker background download engine | `download/Downloader.kt` | `downloads/DownloadEngine.ts`, `downloads/DownloadStore.ts` | P2 |

---

## Needs Porting (31 components)

These components need clean-room implementation in OTO.

### By Priority

#### P1 (9 components)

| Component | Classification | Target | Notes |
|-----------|---------------|--------|-------|
| Container format detection (MP4/WebM/FLAC/Opus) | ALGORITHM_PORT | `audio` | Port container sniffing logic to StreamContainer.ts. |
| HTTP range request data source with 2MB chunk boun | REIMPLEMENT | `audio/cache` | Native implementation: Android Media3 CacheDataSource, iOS A |
| Auto-generates next tracks when queue runs out | ALGORITHM_PORT | `domain/queue` | Port autoplay recommendation logic. Uses related tracks API. |
| Persists last played track/position for cold start | ALGORITHM_PORT | `store` | MMKV persist: {trackId, positionMs, queueSnapshot}. Hydrate  |
| Fallback logic when primary stream fails mid-playb | ALGORITHM_PORT | `audio/resilience` | Retry with next source from StreamResolver waterfall. |
| Musixmatch HMAC-SHA256 token gen + synced lyrics f | ALGORITHM_PORT | `utils/lyrics/providers` | Port HMAC signing. Use standard crypto API. |
| Query builder for lyrics search across providers | ALGORITHM_PORT | `utils/lyrics` | Build LyricsQuery type with title/artist/duration params. |
| PoToken generation for YouTube playback authorizat | REIMPLEMENT | `auth/innertube/potoken` | Port PoToken WebView approach or use bundled JS module. |
| App settings with MMKV persistence | ARCHITECTURE_PORT | `store/settings` | Create SettingsStore.ts with MMKV. Port setting keys. |

#### P2 (14 components)

| Component | Classification | Target | Notes |
|-----------|---------------|--------|-------|
| Deep link parser for music:// and share URLs | ALGORITHM_PORT | `domain/deeplink` | Port URL pattern matching to DeepLinkResolver.ts. |
| DSP feature extraction: BPM, key, beat grid from a | ALGORITHM_PORT | `domain/analysis` | C++ TurboModule using KissFFT. Interface in TrackAnalyzer.ts |
| Picks transition style (gapless/crossfade/DJ blend | ALGORITHM_PORT | `domain/analysis` | Pure TS: Camelot wheel + BPM delta -> transition config. |
| Cached BPM/key/beat grid store | ARCHITECTURE_PORT | `domain/analysis` | MMKV key-value store for analysis results. |
| Policy rules for when to use each transition type | ALGORITHM_PORT | `domain/analysis` | Pure TS policy config object. |
| 10-band parametric EQ using Biquad filters | REIMPLEMENT | `audio/equalizer` | C++ Biquad filter engine exposed via JSI. Shared Android+iOS |
| Named EQ presets (Rock, Pop, Classical, etc.) | DIRECT_PORT | `audio/equalizer` | Static data: {name, bands: number[]}. Direct TS object. |
| Interpolation curve for smooth EQ band transitions | ALGORITHM_PORT | `audio/equalizer` | Math: cubic interpolation between frequency points. |
| Chains DSP processors (EQ -> spatial -> crossfade  | ALGORITHM_PORT | `audio/dsp` | C++ processor chain pattern. Interface in DspChain.ts. |
| Lyrics translation via external APIs | ALGORITHM_PORT | `utils/lyrics` | Port translation request/response handling. |
| Embeds metadata tags into downloaded audio files | ALGORITHM_PORT | `downloads/tagger` | C++ TurboModule for MP4/FLAC/WebM container tagging. |
| FLAC Vorbis comment writer | ALGORITHM_PORT | `downloads/tagger` | Port Vorbis comment insertion algorithm. |
| MP4 atom writer for metadata | ALGORITHM_PORT | `downloads/tagger` | Port MP4 moov/udta atom manipulation. |
| Android Glance widget showing now playing | PLATFORM_SPECIFIC | `widget` | Android: Jetpack Glance widget. iOS: WidgetKit. |

#### P3 (8 components)

| Component | Classification | Target | Notes |
|-----------|---------------|--------|-------|
| ONNX neural beat tracking | REIMPLEMENT | `domain/analysis` | Deferred. Requires react-native-onnxruntime or server-side. |
| ONNX vocal energy detection | REIMPLEMENT | `domain/analysis` | Deferred. Same as BeatTracker. |
| Mel spectrogram computation for audio features | ALGORITHM_PORT | `domain/analysis` | C++ DSP module. Port FFT + mel filterbank math. |
| Spatial audio / virtualizer effect | REIMPLEMENT | `audio/spatial` | Deferred. Platform-specific APIs. |
| Float32 PCM pipeline, direct USB DAC, sample rate  | PLATFORM_SPECIFIC | `audio/native` | Native TurboModule: Android AAudio/Oboe, iOS CoreAudio. |
| Listen Together real-time sync protocol | ARCHITECTURE_PORT | `domain/party` | Deferred. NTP-style clock sync + WebSocket. See RE doc 07. |
| Party mode playback synchronization | ALGORITHM_PORT | `domain/party` | Deferred. Dynamic pitch-preserving tempo adjustment. |
| Discord Rich Presence integration | REIMPLEMENT | `integrations/discord` | Deferred. WebSocket-based Discord Gateway. |

---

## Excluded (3 components)

| Component | Reason |
|-----------|--------|
| Sandboxed QuickJS scraper engine | DO NOT USE: RN already has Hermes. Use worker threads instead. |
| SMB/CIFS network share support | DO NOT USE: Niche feature, heavy native deps. |
| WebDAV cloud storage support | DO NOT USE: Niche feature, unnecessary complexity. |

---

## Unmapped BitChord Files (212)

These files exist in BitChord but are not yet mapped in the converter.

```
auth/AccountSessions.kt
auth/DiscordLoginScreen.kt
auth/EncryptedPrefs.kt
auth/WebSession.kt
auth/YtMusicLoginScreen.kt
BitChordApplication.kt
data/AppUpdateChecker.kt
data/canvas/AppleMusicCanvas.kt
data/canvas/CanvasArtwork.kt
data/canvas/CanvasCache.kt
data/canvas/CommunityCanvas.kt
data/canvas/SpotifyCanvas.kt
data/canvas/SpotifyToken.kt
data/canvas/TidalCanvas.kt
data/DebugLog.kt
data/discord/DiscordAudioQuality.kt
data/discord/SuperProperties.kt
data/Http.kt
data/innertube/PlaybackTracker.kt
data/innertube/PlayerClient.kt
data/innertube/StreamResolver.kt
data/jiosaavn/JioSaavnService.kt
data/LikeState.kt
data/listentogether/JamInviteLink.kt
data/listentogether/PartyModels.kt
data/listentogether/ServerClock.kt
data/LocalMediaRepository.kt
data/lyrics/BackgroundVocals.kt
data/lyrics/BetterLyrics.kt
data/lyrics/BiniLyrics.kt
data/lyrics/EmbeddedLyrics.kt
data/lyrics/Genius.kt
data/lyrics/KuGou.kt
data/lyrics/LrcLib.kt
data/lyrics/LrcWriter.kt
data/lyrics/LyricAlignments.kt
data/lyrics/LyricGaps.kt
data/lyrics/LyricsHttp.kt
data/lyrics/LyricsPlus.kt
data/lyrics/Megalobiz.kt
data/lyrics/PaxSenix.kt
data/lyrics/ProviderLyrics.kt
data/lyrics/SimpMusicLyrics.kt
data/lyrics/TranslationLanguages.kt
data/lyrics/Unison.kt
data/lyrics/YouTubeLyrics.kt
data/model/SearchHistoryEntity.kt
data/NerdStats.kt
data/remote/EmbeddedArt.kt
data/remote/RemoteArtReader.kt
data/remote/RemoteArtwork.kt
data/remote/RemoteArtworkStore.kt
data/remote/RemoteListing.kt
data/remote/RemoteSong.kt
data/scrobbling/LastFM.kt
data/scrobbling/ListenBrainzManager.kt
data/scrobbling/PrimaryArtist.kt
data/sources/addon/AddonClient.kt
data/sources/addon/AddonModels.kt
data/sources/addon/SourceFormats.kt
data/sources/AddonSource.kt
data/sources/DeviceCodecs.kt
data/sources/module/ModuleIndex.kt
data/sources/module/ModuleManager.kt
data/sources/module/ModuleResults.kt
data/sources/module/SharedCalls.kt
data/sources/module/SpineModule.kt
data/sources/ModuleSource.kt
data/stats/ArtistFacts.kt
data/stats/Backup.kt
data/TrackLog.kt
data/YtMusicRepository.kt
download/Downloads.kt
download/DownloadService.kt
download/DownloadSession.kt
download/DownloadStore.kt
download/LyricsTag.kt
download/OfflineDash.kt
download/OfflineHls.kt
download/WebmTagger.kt
MainActivity.kt
playback/audio/AAudioEvaluation.kt
playback/audio/AudioBlock.kt
playback/audio/bluetooth/BluetoothAudioTracker.kt
playback/audio/DirectAudioProbe.kt
playback/audio/FloatAudioProcessor.kt
playback/audio/OutputNegotiator.kt
playback/audio/PcmBoundary.kt
playback/audio/PcmEncoding.kt
playback/audio/usb/DirectAudioOutput.kt
playback/audio/usb/DirectUsbCapability.kt
playback/audio/usb/UsbDirectManager.kt
playback/AudioOutputStatus.kt
playback/AudioRouting.kt
playback/OriginalVersion.kt
playback/PartyPersonalQueueStash.kt
playback/PlayerDeepLink.kt
playback/QualityUpgrade.kt
playback/smart/AudioDecoder.kt
playback/smart/AutomixAnalysisSource.kt
playback/smart/LocalAudioSource.kt
playback/smart/TrackAnalysis.kt
playback/smart/TrackFeatures.kt
playback/smart/VersionAudioAligner.kt
playback/SmbDataSource.kt
playback/TransitionFilterProcessor.kt
ui/components/AccountAlerts.kt
ui/components/AccountChannelDialog.kt
ui/components/AccountProfileSelector.kt
ui/components/AppLanguageDialog.kt
ui/components/ArtworkBackdrop.kt
ui/components/AudioPipelineDialog.kt
ui/components/backdrop/Backdrop.kt
ui/components/backdrop/BackdropEffectScope.kt
ui/components/backdrop/backdrops/Backdrop.kt
ui/components/backdrop/backdrops/CanvasBackdrop.kt
ui/components/backdrop/backdrops/CombinedBackdrop.kt
ui/components/backdrop/backdrops/EmptyBackdrop.kt
ui/components/backdrop/backdrops/LayerBackdrop.kt
ui/components/backdrop/backdrops/LayerBackdropModifier.kt
ui/components/backdrop/DrawBackdropModifier.kt
ui/components/backdrop/effects/Blur.kt
ui/components/backdrop/effects/ColorFilter.kt
ui/components/backdrop/effects/Lens.kt
ui/components/backdrop/effects/RenderEffect.kt
ui/components/backdrop/highlight/Highlight.kt
ui/components/backdrop/highlight/HighlightModifier.kt
ui/components/backdrop/highlight/HighlightStyle.kt
ui/components/backdrop/internal/InverseLayerScope.kt
ui/components/backdrop/internal/LayerRecorder.kt
ui/components/backdrop/internal/Outline.kt
ui/components/backdrop/internal/Paint.kt
ui/components/backdrop/internal/RenderEffect.kt
ui/components/backdrop/internal/Shaders.kt
ui/components/backdrop/internal/ShapeProvider.kt
ui/components/backdrop/Platform.kt
ui/components/backdrop/RuntimeShader.kt
ui/components/backdrop/RuntimeShaderCache.kt
ui/components/backdrop/shadow/InnerShadow.kt
ui/components/backdrop/shadow/InnerShadowModifier.kt
ui/components/backdrop/shadow/Shadow.kt
ui/components/backdrop/shadow/ShadowModifier.kt
ui/components/BottomFadeScrim.kt
ui/components/BrowseActionsSheet.kt
ui/components/Common.kt
ui/components/DownloadManagerSheet.kt
ui/components/FloatingBottomBar.kt
ui/components/floatingtabbar/FloatingTabBar.kt
ui/components/FrostedTopBar.kt
ui/components/GlassNavBar.kt
ui/components/LiquidGlass.kt
ui/components/LyricsSourcesDialog.kt
ui/components/OptimizedHaze.kt
ui/components/PlaylistPickerSheet.kt
ui/components/QrCode.kt
ui/components/QueueActionNotice.kt
ui/components/RemoteArtwork.kt
ui/components/SearchField.kt
ui/components/Skeletons.kt
ui/components/SongActionsSheet.kt
ui/components/TopFadeBlur.kt
ui/components/TranslationLanguageDialog.kt
ui/components/UpdateAvailableDialog.kt
ui/ForegroundState.kt
ui/haptics/Haptics.kt
ui/icons/BitChordIcons.kt
ui/MainViewModel.kt
ui/performance/DisplayRefreshRates.kt
ui/player/ArtworkMeshBackdrop.kt
ui/player/AudioOutput.kt
ui/player/AudioOutputSheet.kt
ui/player/CanvasArtworkPlayer.kt
ui/player/FrameHeuristics.kt
ui/player/LandscapePlayer.kt
ui/player/ListenTogetherMembersSheet.kt
ui/player/LyricClock.kt
ui/player/LyricFocus.kt
ui/player/LyricsControlsGesture.kt
ui/player/LyricsOffsetSheet.kt
ui/player/LyricsProviderSheet.kt
ui/player/MeshGradient.kt
ui/player/PlayerControls.kt
ui/player/PlayerDrawer.kt
ui/player/PlayerState.kt
ui/player/ThinSlider.kt
ui/replay/ReplayCard.kt
ui/replay/ReplayModel.kt
ui/replay/ReplayPoster.kt
ui/replay/ReplayScreen.kt
ui/replay/ReplayShareSheet.kt
ui/replay/ReplayStories.kt
ui/screens/AccountAndScrobblingScreen.kt
ui/screens/DetailScreen.kt
ui/screens/DiscordScreen.kt
ui/screens/EqualizerScreen.kt
ui/screens/ExploreScreen.kt
ui/screens/HistoryScreen.kt
ui/screens/ListenTogetherScreen.kt
ui/screens/ListenTogetherSheets.kt
ui/screens/LocalMusicScreen.kt
ui/screens/PartyServerEditor.kt
ui/screens/SettingsSheet.kt
ui/screens/SourcesScreen.kt
ui/screens/SpotifyCanvasAuthScreen.kt
ui/theme/ArtworkPalette.kt
ui/theme/Theme.kt
ui/utils/IosOverscroll.kt
ui/utils/SheetGestureGuard.kt
widget/MediaWidgetActions.kt
widget/MediaWidgetArt.kt
widget/MediaWidgetPill.kt
widget/MediaWidgetSnapshot.kt
```

---

## Classification Breakdown

| Classification | Count |
|---------------|-------|
| ALGORITHM_PORT | 36 |
| ARCHITECTURE_PORT | 19 |
| REIMPLEMENT | 12 |
| DIRECT_PORT | 4 |
| PLATFORM_SPECIFIC | 2 |
| DO_NOT_USE | 3 |

---

## Legal Notice

All code generated by this converter is clean-room implementation.
BitChord is licensed under GPLv3/AGPLv3. No raw Kotlin or C++ source
code tokens have been copied. Only algorithms, interfaces, and
architectural patterns have been extracted and reimplemented in
TypeScript and C++.

See: BITCHORD_RE/18_REUSABLE_CODE.md for detailed legal analysis.
