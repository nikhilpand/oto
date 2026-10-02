import {
  GoogleAuthStore,
  AuthStorageBackend,
  GoogleAccountSession,
} from '../GoogleAuthStore';

class MemoryStorage implements AuthStorageBackend {
  private map = new Map<string, string>();
  getString(key: string): string | undefined {
    return this.map.get(key);
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  delete(key: string): void {
    this.map.delete(key);
  }
}

describe('GoogleAuthStore', () => {
  let storage: MemoryStorage;

  const mockSessionA: GoogleAccountSession = {
    accountId: 'account-1',
    cookie: 'HSID=xyz; SAPISID=abc12345; SSID=def;',
    profiles: [
      {
        profileId: 'prof-main',
        name: 'Main Profile',
        isBrandAccount: false,
      },
    ],
    activeProfileId: 'prof-main',
    createdAt: Date.now(),
  };

  const mockSessionB: GoogleAccountSession = {
    accountId: 'account-2',
    cookie: 'SID=sample; APISID=foo;',
    profiles: [
      {
        profileId: 'prof-brand',
        name: 'Artist Brand Channel',
        isBrandAccount: true,
      },
    ],
    activeProfileId: 'prof-brand',
    createdAt: Date.now(),
  };

  beforeEach(() => {
    storage = new MemoryStorage();
    GoogleAuthStore.setStorageForTesting(storage);
    GoogleAuthStore.signOut();
  });

  it('starts signed out with empty sessions', () => {
    expect(GoogleAuthStore.getSessions()).toHaveLength(0);
    expect(GoogleAuthStore.getActiveSession()).toBeNull();
    expect(GoogleAuthStore.isSignedIn()).toBe(false);
  });

  it('upserts a session and activates it', () => {
    GoogleAuthStore.upsertSession(mockSessionA, true);

    expect(GoogleAuthStore.getSessions()).toHaveLength(1);
    expect(GoogleAuthStore.getActiveAccountId()).toBe('account-1');
    expect(GoogleAuthStore.getActiveSession()?.accountId).toBe('account-1');
    expect(GoogleAuthStore.isSignedIn()).toBe(true);
  });

  it('extracts SAPISID from cookie accurately', () => {
    const sapisid = GoogleAuthStore.extractSapisid(mockSessionA.cookie);
    expect(sapisid).toBe('abc12345');

    const missing = GoogleAuthStore.extractSapisid('NO_SPECIAL_COOKIE=here');
    expect(missing).toBeNull();
  });

  it('switches active account and profile', () => {
    GoogleAuthStore.upsertSession(mockSessionA, true);
    GoogleAuthStore.upsertSession(mockSessionB, false);

    expect(GoogleAuthStore.getActiveAccountId()).toBe('account-1');

    GoogleAuthStore.selectAccount('account-2', 'prof-brand');
    expect(GoogleAuthStore.getActiveAccountId()).toBe('account-2');
    expect(GoogleAuthStore.getActiveSession()?.activeProfileId).toBe('prof-brand');
  });

  it('removes account and falls back to remaining', () => {
    GoogleAuthStore.upsertSession(mockSessionA, true);
    GoogleAuthStore.upsertSession(mockSessionB, false);

    GoogleAuthStore.removeAccount('account-1');

    expect(GoogleAuthStore.getSessions()).toHaveLength(1);
    expect(GoogleAuthStore.getActiveAccountId()).toBe('account-2');
    expect(GoogleAuthStore.getActiveSession()?.accountId).toBe('account-2');
  });

  it('signs out completely', () => {
    GoogleAuthStore.upsertSession(mockSessionA, true);
    expect(GoogleAuthStore.isSignedIn()).toBe(true);

    GoogleAuthStore.signOut();
    expect(GoogleAuthStore.getSessions()).toHaveLength(0);
    expect(GoogleAuthStore.isSignedIn()).toBe(false);
  });
});
