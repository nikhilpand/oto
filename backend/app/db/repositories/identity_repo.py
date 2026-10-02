import time
from typing import Optional, List, Tuple
from ...core.identity.models import (
    TrackIdentity,
    TrackArtist,
    ProviderTrack,
    Provider,
)
from ..database import DatabaseManager


class IdentityRepository:
    def __init__(self, db: DatabaseManager):
        self.db = db

    def save_identity(self, identity: TrackIdentity) -> None:
        conn = self.db.get_connection()
        now_ms = int(time.time() * 1000)
        created_at = identity.created_at_ms or now_ms
        updated_at = now_ms

        with conn:
            conn.execute(
                """
                INSERT INTO track_identity (
                    id, title, normalized_title, album_title, normalized_album,
                    duration_ms, explicit, isrc, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    normalized_title=excluded.normalized_title,
                    album_title=excluded.album_title,
                    normalized_album=excluded.normalized_album,
                    duration_ms=excluded.duration_ms,
                    explicit=excluded.explicit,
                    isrc=excluded.isrc,
                    updated_at=excluded.updated_at
                """,
                (
                    identity.id,
                    identity.title,
                    identity.normalized_title,
                    identity.album_title,
                    identity.normalized_album,
                    identity.duration_ms,
                    1 if identity.is_explicit else 0,
                    identity.isrc,
                    created_at,
                    updated_at,
                ),
            )

            # Insert artists
            conn.execute(
                "DELETE FROM track_artist WHERE track_id = ?", (identity.id,)
            )
            for artist in identity.artists:
                conn.execute(
                    """
                    INSERT INTO track_artist (track_id, artist_name, normalized_name, position, browse_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        identity.id,
                        artist.name,
                        artist.normalized_name,
                        artist.position,
                        artist.browse_id,
                    ),
                )

    def get_identity_by_id(self, track_id: str) -> Optional[TrackIdentity]:
        conn = self.db.get_connection()
        cur = conn.execute(
            """
            SELECT id, title, normalized_title, album_title, normalized_album,
                   duration_ms, explicit, isrc, created_at, updated_at
            FROM track_identity WHERE id = ?
            """,
            (track_id,),
        )
        row = cur.fetchone()
        if not row:
            return None

        artist_cur = conn.execute(
            """
            SELECT artist_name, normalized_name, position, browse_id
            FROM track_artist WHERE track_id = ?
            ORDER BY position ASC
            """,
            (track_id,),
        )
        artists = tuple(
            TrackArtist(
                name=a["artist_name"],
                normalized_name=a["normalized_name"],
                position=a["position"],
                browse_id=a["browse_id"],
            )
            for a in artist_cur.fetchall()
        )

        return TrackIdentity(
            id=row["id"],
            title=row["title"],
            normalized_title=row["normalized_title"],
            artists=artists,
            album_title=row["album_title"],
            normalized_album=row["normalized_album"],
            duration_ms=row["duration_ms"],
            is_explicit=bool(row["explicit"]),
            isrc=row["isrc"],
            created_at_ms=row["created_at"],
            updated_at_ms=row["updated_at"],
        )

    def link_provider_track(
        self, identity_id: str, provider_track: ProviderTrack
    ) -> None:
        conn = self.db.get_connection()
        now_ms = int(time.time() * 1000)
        with conn:
            conn.execute(
                """
                INSERT INTO provider_track (
                    identity_id, provider, provider_track_id, title, duration_ms,
                    album_title, confidence, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(provider, provider_track_id) DO UPDATE SET
                    identity_id=excluded.identity_id,
                    confidence=excluded.confidence
                """,
                (
                    identity_id,
                    provider_track.provider.value,
                    provider_track.provider_track_id,
                    provider_track.title,
                    provider_track.duration_ms,
                    provider_track.album_title,
                    provider_track.confidence,
                    now_ms,
                ),
            )

    def get_identity_for_provider(
        self, provider: Provider, provider_track_id: str
    ) -> Optional[TrackIdentity]:
        conn = self.db.get_connection()
        cur = conn.execute(
            """
            SELECT identity_id FROM provider_track
            WHERE provider = ? AND provider_track_id = ?
            """,
            (provider.value, provider_track_id),
        )
        row = cur.fetchone()
        if not row:
            return None
        return self.get_identity_by_id(row["identity_id"])
