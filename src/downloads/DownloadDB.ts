/**
 * DownloadDB — SQLite Download Manifest
 *
 * Clean-room adaptation of BitChord BITCHORD_RE/11_DOWNLOADS.md architecture.
 * Uses expo-sqlite exclusively for the download manifest (not playback state).
 * MMKV handles transient playback state; SQLite handles durable download records.
 *
 * Schema:
 *   downloads (id, track_json, local_uri, file_size_bytes, status, progress, created_at)
 *
 * Indexes:
 *   idx_downloads_status — fast filter by status
 *   idx_downloads_created_at — sort by recency
 */

import * as SQLite from 'expo-sqlite';
import type { Track } from '@/domain/types';

// ─── Types ─────────────────────────────────────────────────────────────────

export type DBDownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed';

export interface DBDownloadRow {
  id: string;
  track_json: string;
  local_uri: string;
  file_size_bytes: number;
  status: DBDownloadStatus;
  progress: number;
  created_at: number;
}

export interface DownloadRecord {
  id: string;
  track: Track;
  localUri: string;
  fileSizeBytes: number;
  status: DBDownloadStatus;
  progress: number; // 0–1
  createdAt: number; // Unix ms
}

// ─── DB Singleton ───────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;
let _initialized = false;

function ensureInitialized(db: SQLite.SQLiteDatabase): void {
  if (_initialized) return;
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        track_json TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'queued',
        progress REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
      CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC);
    `);
    _initialized = true;
  } catch {
    // SQLite table init guard
  }
}

function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('oto_downloads.db');
  }
  ensureInitialized(_db);
  return _db;
}

// ─── Init ───────────────────────────────────────────────────────────────────

export function initDownloadDB(): void {
  const db = getDB();
  ensureInitialized(db);
}

// ─── Row → Record ───────────────────────────────────────────────────────────

function rowToRecord(row: DBDownloadRow): DownloadRecord {
  let track: Track;
  try {
    track = JSON.parse(row.track_json) as Track;
  } catch {
    track = { id: row.id, title: 'Unknown', artist: 'Unknown', artworkUrl: '' } as Track;
  }
  return {
    id: row.id,
    track,
    localUri: row.local_uri,
    fileSizeBytes: row.file_size_bytes,
    status: row.status,
    progress: row.progress,
    createdAt: row.created_at,
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export function upsertDownload(record: DownloadRecord): void {
  const db = getDB();
  db.runSync(
    `INSERT INTO downloads (id, track_json, local_uri, file_size_bytes, status, progress, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       local_uri = excluded.local_uri,
       file_size_bytes = excluded.file_size_bytes,
       status = excluded.status,
       progress = excluded.progress`,
    record.id,
    JSON.stringify(record.track),
    record.localUri,
    record.fileSizeBytes,
    record.status,
    record.progress,
    record.createdAt,
  );
}

export function updateDownloadProgress(id: string, progress: number, fileSizeBytes?: number): void {
  const db = getDB();
  if (fileSizeBytes !== undefined) {
    db.runSync(
      `UPDATE downloads SET progress = ?, file_size_bytes = ? WHERE id = ?`,
      progress,
      fileSizeBytes,
      id,
    );
  } else {
    db.runSync(`UPDATE downloads SET progress = ? WHERE id = ?`, progress, id);
  }
}

export function updateDownloadStatus(id: string, status: DBDownloadStatus): void {
  const db = getDB();
  db.runSync(`UPDATE downloads SET status = ? WHERE id = ?`, status, id);
}

export function deleteDownload(id: string): void {
  const db = getDB();
  db.runSync(`DELETE FROM downloads WHERE id = ?`, id);
}

export function getAllDownloads(): DownloadRecord[] {
  const db = getDB();
  const rows = db.getAllSync<DBDownloadRow>(
    `SELECT * FROM downloads ORDER BY created_at DESC`,
  );
  return rows.map(rowToRecord);
}

export function getDownload(id: string): DownloadRecord | null {
  const db = getDB();
  const row = db.getFirstSync<DBDownloadRow>(
    `SELECT * FROM downloads WHERE id = ?`,
    id,
  );
  return row ? rowToRecord(row) : null;
}

export function getCompletedDownloads(): DownloadRecord[] {
  const db = getDB();
  const rows = db.getAllSync<DBDownloadRow>(
    `SELECT * FROM downloads WHERE status = 'completed' ORDER BY created_at DESC`,
  );
  return rows.map(rowToRecord);
}

export function getTotalDownloadedBytes(): number {
  const db = getDB();
  const row = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(file_size_bytes), 0) as total FROM downloads WHERE status = 'completed'`,
  );
  return row?.total ?? 0;
}
