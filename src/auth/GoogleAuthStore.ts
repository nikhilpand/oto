/**
 * GoogleAuthStore — Google & YouTube Music Account Session Registry
 *
 * Clean-room implementation inspired by BitChord's AuthStore.kt.
 *
 * Persists user authentication sessions and YouTube Music profiles in MMKV,
 * powering personalized music recommendations, liked songs synchronization,
 * and user playlists.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/auth/AuthStore.kt
 * @see BITCHORD_RE/13_DATABASE_STATE.md
 */

import { extractSapisid } from './innertube/crypto';
import { InnertubeSession } from './innertube/types';

export interface YouTubeProfile {
  readonly profileId: string;
  readonly name: string;
  readonly email?: string;
  readonly avatarUrl?: string;
  readonly pageId?: string;
  readonly isBrandAccount: boolean;
}

export interface GoogleAccountSession {
  readonly accountId: string;
  readonly cookie: string;
  readonly profiles: YouTubeProfile[];
  readonly activeProfileId?: string;
  readonly createdAt: number;
}

export interface AuthStorageBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

class MMKVStorageAdapter implements AuthStorageBackend {
  private mmkv: any = null;
  private memory = new Map<string, string>();

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createMMKV } = require('react-native-mmkv');
      this.mmkv = createMMKV({ id: 'oto.auth' });
    } catch {
      this.mmkv = null;
    }
  }

  getString(key: string): string | undefined {
    if (this.mmkv) {
      try {
        const val = this.mmkv.getString(key);
        if (val !== undefined) return val;
      } catch {
        // Fall back to memory
      }
    }
    return this.memory.get(key);
  }

  set(key: string, value: string): void {
    if (this.mmkv) {
      try {
        this.mmkv.set(key, value);
      } catch {
        // Fall back to memory
      }
    }
    this.memory.set(key, value);
  }

  delete(key: string): void {
    if (this.mmkv) {
      try {
        this.mmkv.delete(key);
      } catch {
        // Fall back to memory
      }
    }
    this.memory.delete(key);
  }
}

const KEY_SESSIONS = 'oto.auth.sessions';
const KEY_ACTIVE_ACCOUNT = 'oto.auth.active_account';

export class GoogleAuthStore {
  private static storage: AuthStorageBackend = new MMKVStorageAdapter();
  private static listeners = new Set<() => void>();

  public static setStorageForTesting(custom: AuthStorageBackend): void {
    this.storage = custom;
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Ignore subscriber exceptions
      }
    }
  }

  /**
   * Retrieves all registered Google account sessions.
   */
  public static getSessions(): GoogleAccountSession[] {
    const raw = this.storage.getString(KEY_SESSIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as GoogleAccountSession[];
    } catch {
      return [];
    }
  }

  /**
   * Saves the session list to durable storage.
   */
  public static setSessions(sessions: GoogleAccountSession[]): void {
    this.storage.set(KEY_SESSIONS, JSON.stringify(sessions));
    this.notify();
  }

  /**
   * Returns the currently active account ID, or null if none selected.
   */
  public static getActiveAccountId(): string | null {
    return this.storage.getString(KEY_ACTIVE_ACCOUNT) ?? null;
  }

  /**
   * Sets the active account and profile ID.
   */
  public static selectAccount(accountId: string, profileId?: string): void {
    this.storage.set(KEY_ACTIVE_ACCOUNT, accountId);
    if (profileId) {
      const sessions = this.getSessions().map((s) => {
        if (s.accountId === accountId) {
          return { ...s, activeProfileId: profileId };
        }
        return s;
      });
      this.storage.set(KEY_SESSIONS, JSON.stringify(sessions));
    }
    this.notify();
  }

  /**
   * Retrieves the currently active Google account session.
   */
  public static getActiveSession(): GoogleAccountSession | null {
    const sessions = this.getSessions();
    if (sessions.length === 0) return null;

    const activeId = this.getActiveAccountId();
    if (!activeId) return sessions[0] ?? null;

    return sessions.find((s) => s.accountId === activeId) ?? sessions[0] ?? null;
  }

  /**
   * Checks whether the user is actively signed in with a valid Google session cookie.
   */
  public static isSignedIn(): boolean {
    const active = this.getActiveSession();
    if (!active || !active.cookie) return false;
    return active.cookie.includes('SAPISID') || active.cookie.includes('APISID');
  }

  /**
   * Inserts or updates an account session.
   */
  public static upsertSession(session: GoogleAccountSession, activate = true): void {
    const sessions = this.getSessions().filter((s) => s.accountId !== session.accountId);
    sessions.push(session);
    this.storage.set(KEY_SESSIONS, JSON.stringify(sessions));

    if (activate) {
      this.storage.set(KEY_ACTIVE_ACCOUNT, session.accountId);
    }
    this.notify();
  }

  /**
   * Removes an account session by accountId.
   */
  public static removeAccount(accountId: string): void {
    const remaining = this.getSessions().filter((s) => s.accountId !== accountId);
    this.storage.set(KEY_SESSIONS, JSON.stringify(remaining));

    const currentActive = this.getActiveAccountId();
    if (currentActive === accountId) {
      const nextActive = remaining[0]?.accountId ?? '';
      if (nextActive) {
        this.storage.set(KEY_ACTIVE_ACCOUNT, nextActive);
      } else {
        this.storage.delete(KEY_ACTIVE_ACCOUNT);
      }
    }
    this.notify();
  }

  /**
   * Signs out all accounts.
   */
  public static signOut(): void {
    this.storage.delete(KEY_SESSIONS);
    this.storage.delete(KEY_ACTIVE_ACCOUNT);
    this.notify();
  }

  /**
   * Converts the active Google account session to an InnertubeSession.
   */
  public static toInnertubeSession(): InnertubeSession | null {
    const active = this.getActiveSession();
    if (!active || !active.cookie) return null;
    const sapisid = extractSapisid(active.cookie);
    if (!sapisid) return null;

    const activeProfile = active.profiles.find((p) => p.profileId === active.activeProfileId) ?? active.profiles[0];

    return {
      cookie: active.cookie,
      sapisid,
      pageId: activeProfile?.pageId,
      authUser: '0',
      account: activeProfile
        ? {
            name: activeProfile.name,
            email: activeProfile.email,
            avatarUrl: activeProfile.avatarUrl,
            pageId: activeProfile.pageId,
          }
        : undefined,
    };
  }

  /**
   * Extracts the SAPISID cookie value needed for Innertube authorization.
   */
  public static extractSapisid(cookie: string): string | null {
    return extractSapisid(cookie);
  }
}
