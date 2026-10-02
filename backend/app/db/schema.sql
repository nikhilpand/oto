-- OTO Canonical Music Identity & Health Database Schema

CREATE TABLE IF NOT EXISTS track_identity (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    album_title TEXT,
    normalized_album TEXT,
    duration_ms INTEGER,
    explicit INTEGER NOT NULL DEFAULT 0,
    isrc TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_track_norm_title ON track_identity(normalized_title);
CREATE INDEX IF NOT EXISTS idx_track_isrc ON track_identity(isrc);

CREATE TABLE IF NOT EXISTS track_artist (
    track_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    browse_id TEXT,
    PRIMARY KEY (track_id, artist_name),
    FOREIGN KEY (track_id) REFERENCES track_identity(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_track (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identity_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_track_id TEXT NOT NULL,
    title TEXT,
    duration_ms INTEGER,
    album_title TEXT,
    confidence REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    UNIQUE(provider, provider_track_id),
    FOREIGN KEY (identity_id) REFERENCES track_identity(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_lookup ON provider_track(provider, provider_track_id);

CREATE TABLE IF NOT EXISTS resolver_health (
    provider TEXT NOT NULL,
    resolver TEXT NOT NULL,
    profile TEXT NOT NULL,
    successes INTEGER NOT NULL DEFAULT 0,
    failures INTEGER NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms REAL DEFAULT 350.0,
    last_success_at INTEGER,
    last_failure_at INTEGER,
    cooldown_until INTEGER DEFAULT 0,
    last_error TEXT,
    PRIMARY KEY (provider, resolver, profile)
);
