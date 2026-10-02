/**
 * ScrobbleTypes — Protocols for Last.fm and ListenBrainz Scrobbling
 *
 * Clean-room architecture inspired by BitChord's ScrobbleManager.kt & LastFM.kt.
 */

export interface ScrobbleTrackPayload {
  readonly trackId: string;
  readonly title: string;
  readonly artist: string;
  readonly album?: string;
  readonly durationSeconds: number;
  readonly timestampSeconds: number;
}

export interface ScrobbleAccountConfig {
  readonly lastFmSessionKey?: string;
  readonly lastFmUsername?: string;
  readonly listenBrainzUserToken?: string;
  readonly isEnabled: boolean;
  readonly scrobbleDelayPercent?: number; // default 0.5 (50%)
  readonly maxDelaySeconds?: number;      // default 240 (4 mins)
  readonly minDurationSeconds?: number;   // default 30s
}

export interface QueuedScrobble {
  readonly payload: ScrobbleTrackPayload;
  readonly targetService: 'lastfm' | 'listenbrainz' | 'both';
  readonly retryCount: number;
  readonly queuedAt: number;
}
