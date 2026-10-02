/**
 * DownloadStore — Zustand store for download state management
 *
 * Architecture:
 *  - React state: Zustand (not MMKV — download manifests live in SQLite)
 *  - Durable state: SQLite via DownloadDB
 *  - Active download abort controllers keyed by trackId
 *  - One concurrent download at a time (queue-based)
 *
 * Follows BitChord BITCHORD_RE/11_DOWNLOADS.md pattern.
 */

import { create } from 'zustand';
import type { Track } from '@/domain/types';
import {
  initDownloadDB,
  upsertDownload,
  updateDownloadProgress,
  updateDownloadStatus,
  deleteDownload,
  getAllDownloads,
  getDownload,
  type DownloadRecord,
} from './DownloadDB';
import {
  downloadInChunks,
  deleteLocalFile,
  localUriForTrack,
  getFileSizeBytes,
} from './DownloadEngine';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface DownloadState {
  records: DownloadRecord[];
  activeDownloadIds: Set<string>;

  // Lifecycle
  init: () => void;

  // Queue
  enqueue: (track: Track, streamUrl: string, headers?: Record<string, string>) => void;
  cancel: (trackId: string) => void;
  remove: (trackId: string) => Promise<void>;
  retry: (trackId: string, streamUrl: string, headers?: Record<string, string>) => void;

  // Selectors (computed from records)
  getRecord: (trackId: string) => DownloadRecord | undefined;
  isDownloaded: (trackId: string) => boolean;
  isDownloading: (trackId: string) => boolean;
}

// ─── Abort Controller Map ───────────────────────────────────────────────────

const abortControllers = new Map<string, AbortController>();

// ─── Internal queue processor ───────────────────────────────────────────────

const pendingQueue: {
  trackId: string;
  streamUrl: string;
  headers?: Record<string, string>;
}[] = [];

let isProcessing = false;

function drainQueue(store: DownloadState): void {
  if (isProcessing || pendingQueue.length === 0) return;
  const item = pendingQueue.shift()!;
  isProcessing = true;
  processDownload(item.trackId, item.streamUrl, item.headers, store).finally(() => {
    isProcessing = false;
    drainQueue(useDownloadStore.getState());
  });
}

async function processDownload(
  trackId: string,
  streamUrl: string,
  headers: Record<string, string> | undefined,
  _store: DownloadState,
): Promise<void> {
  const record = getDownload(trackId);
  if (!record) return;

  const ac = new AbortController();
  abortControllers.set(trackId, ac);

  updateDownloadStatus(trackId, 'downloading');
  useDownloadStore.getState()._refreshRecord(trackId);

  try {
    const localUri = await downloadInChunks({
      trackId,
      streamUrl,
      ext: 'm4a',
      headers,
      signal: ac.signal,
      onProgress: (progress, _downloaded, _total) => {
        updateDownloadProgress(trackId, progress);
        useDownloadStore.getState()._refreshRecord(trackId);
      },
    });

    const fileSizeBytes = await getFileSizeBytes(localUri);
    updateDownloadProgress(trackId, 1);
    updateDownloadStatus(trackId, 'completed');

    // Persist final file size
    const db_record = getDownload(trackId);
    if (db_record) {
      upsertDownload({ ...db_record, fileSizeBytes, status: 'completed', progress: 1, localUri });
    }

    useDownloadStore.getState()._refreshRecord(trackId);
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    if (!isAbort) {
      updateDownloadStatus(trackId, 'failed');
      useDownloadStore.getState()._refreshRecord(trackId);
    }
    // If aborted: record was already deleted or status will be set by cancel()
  } finally {
    abortControllers.delete(trackId);
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useDownloadStore = create<
  DownloadState & { _refreshRecord: (id: string) => void; _refreshAll: () => void }
>((set, get) => ({
  records: [],
  activeDownloadIds: new Set(),

  init() {
    initDownloadDB();
    set({ records: getAllDownloads() });
  },

  _refreshRecord(id: string) {
    const record = getDownload(id);
    set((state) => {
      const next = state.records.filter((r) => r.id !== id);
      if (record) next.unshift(record);
      const active = new Set(state.activeDownloadIds);
      if (record?.status === 'downloading') active.add(id);
      else active.delete(id);
      return { records: next, activeDownloadIds: active };
    });
  },

  _refreshAll() {
    set({ records: getAllDownloads() });
  },

  enqueue(track: Track, streamUrl: string, headers?: Record<string, string>) {
    const existing = getDownload(track.id);
    if (existing?.status === 'completed') return;
    if (existing?.status === 'downloading') return;

    const record: DownloadRecord = {
      id: track.id,
      track,
      localUri: localUriForTrack(track.id),
      fileSizeBytes: 0,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    };

    upsertDownload(record);
    set((state) => {
      const next = state.records.filter((r) => r.id !== track.id);
      next.unshift(record);
      return { records: next };
    });

    pendingQueue.push({ trackId: track.id, streamUrl, headers });
    drainQueue(get());
  },

  cancel(trackId: string) {
    const ac = abortControllers.get(trackId);
    if (ac) ac.abort();
    abortControllers.delete(trackId);

    updateDownloadStatus(trackId, 'queued');
    // Remove from pending queue
    const idx = pendingQueue.findIndex((p) => p.trackId === trackId);
    if (idx !== -1) pendingQueue.splice(idx, 1);

    get()._refreshRecord(trackId);
  },

  async remove(trackId: string) {
    const ac = abortControllers.get(trackId);
    if (ac) ac.abort();
    abortControllers.delete(trackId);

    const record = getDownload(trackId);
    if (record?.localUri) {
      await deleteLocalFile(record.localUri).catch(() => {});
    }

    deleteDownload(trackId);
    // Remove from pending queue
    const idx = pendingQueue.findIndex((p) => p.trackId === trackId);
    if (idx !== -1) pendingQueue.splice(idx, 1);

    set((state) => ({
      records: state.records.filter((r) => r.id !== trackId),
      activeDownloadIds: new Set([...state.activeDownloadIds].filter((id) => id !== trackId)),
    }));
  },

  retry(trackId: string, streamUrl: string, headers?: Record<string, string>) {
    const record = getDownload(trackId);
    if (!record) return;
    if (record.status === 'completed' || record.status === 'downloading') return;

    updateDownloadStatus(trackId, 'queued');
    updateDownloadProgress(trackId, 0);
    get()._refreshRecord(trackId);

    pendingQueue.push({ trackId, streamUrl, headers });
    drainQueue(get());
  },

  getRecord(trackId: string) {
    return get().records.find((r) => r.id === trackId);
  },

  isDownloaded(trackId: string) {
    return get().records.find((r) => r.id === trackId)?.status === 'completed';
  },

  isDownloading(trackId: string) {
    return get().records.find((r) => r.id === trackId)?.status === 'downloading';
  },
}));
