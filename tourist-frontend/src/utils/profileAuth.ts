export type ProfileAuthMethod = 'email' | 'phone' | 'google';

export const DEFAULT_PROFILE_TAGLINE = 'Exploring the hidden gems of the world';

export interface ProfileAccount {
  id: string;
  name: string;
  method: ProfileAuthMethod;
  email?: string;
  phone?: string;
  password?: string;
  tagline?: string;
  avatarDataUrl?: string;
  createdAt: string;
}

export interface ProfileSession {
  accountId: string;
  loggedInAt: string;
}

export interface ProfileActivityItem {
  id: string;
  message: string;
  createdAt: string;
}

const ACCOUNTS_STORAGE_KEY = 'tourism.profile.accounts.v1';
const SESSION_STORAGE_KEY = 'tourism.profile.session.v1';
const FAVORITES_STORAGE_KEY = 'tourism.profile.favorites.v1';
const ACTIVITIES_STORAGE_KEY = 'tourism.profile.activities.v1';

export const PROFILE_AUTH_CHANGED_EVENT = 'tourism-profile-auth-changed';
export const PROFILE_FAVORITES_CHANGED_EVENT = 'tourism-profile-favorites-changed';

type FavoriteStore = Record<string, string[]>;
type ActivityStore = Record<string, ProfileActivityItem[]>;

const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizePhone = (value: string): string => value.replace(/\s+/g, '').trim();

const parseJson = <T>(input: string | null, fallbackValue: T): T => {
  if (!input) {
    return fallbackValue;
  }

  try {
    return JSON.parse(input) as T;
  } catch {
    return fallbackValue;
  }
};

const saveJson = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const emitWindowEvent = (eventName: string): void => {
  window.dispatchEvent(new CustomEvent(eventName));
};

const generateId = (prefix: string): string => {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
};

const getAccounts = (): ProfileAccount[] => {
  const accounts = parseJson<ProfileAccount[]>(localStorage.getItem(ACCOUNTS_STORAGE_KEY), []);
  return Array.isArray(accounts) ? accounts : [];
};

const saveAccounts = (accounts: ProfileAccount[]): void => {
  saveJson(ACCOUNTS_STORAGE_KEY, accounts);
};

const getSession = (): ProfileSession | null => {
  const session = parseJson<ProfileSession | null>(localStorage.getItem(SESSION_STORAGE_KEY), null);
  if (!session || !session.accountId) {
    return null;
  }

  return session;
};

const setSession = (session: ProfileSession | null): void => {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    emitWindowEvent(PROFILE_AUTH_CHANGED_EVENT);
    return;
  }

  saveJson(SESSION_STORAGE_KEY, session);
  emitWindowEvent(PROFILE_AUTH_CHANGED_EVENT);
};

const getFavoriteStore = (): FavoriteStore => {
  const store = parseJson<FavoriteStore>(localStorage.getItem(FAVORITES_STORAGE_KEY), {});
  if (!store || typeof store !== 'object') {
    return {};
  }

  return store;
};

const saveFavoriteStore = (store: FavoriteStore): void => {
  saveJson(FAVORITES_STORAGE_KEY, store);
  emitWindowEvent(PROFILE_FAVORITES_CHANGED_EVENT);
};

const getActivityStore = (): ActivityStore => {
  const store = parseJson<ActivityStore>(localStorage.getItem(ACTIVITIES_STORAGE_KEY), {});
  if (!store || typeof store !== 'object') {
    return {};
  }

  return store;
};

const saveActivityStore = (store: ActivityStore): void => {
  saveJson(ACTIVITIES_STORAGE_KEY, store);
};

const logProfileActivity = (accountId: string, message: string): void => {
  const store = getActivityStore();
  const existing = store[accountId] || [];

  store[accountId] = [
    {
      id: generateId('activity'),
      message,
      createdAt: new Date().toISOString()
    },
    ...existing
  ].slice(0, 12);

  saveActivityStore(store);
};

const findAccountByCredential = (
  accounts: ProfileAccount[],
  method: ProfileAuthMethod,
  credential: string
): ProfileAccount | undefined => {
  if (method === 'phone') {
    const normalizedPhone = normalizePhone(credential);
    return accounts.find((account) => account.method === method && normalizePhone(account.phone || '') === normalizedPhone);
  }

  const normalizedEmail = normalizeEmail(credential);
  return accounts.find((account) => account.method === method && normalizeEmail(account.email || '') === normalizedEmail);
};

export const getCurrentProfileAccount = (): ProfileAccount | null => {
  const session = getSession();
  if (!session) {
    return null;
  }

  const accounts = getAccounts();
  return accounts.find((account) => account.id === session.accountId) || null;
};

export const registerProfileAccount = (params: {
  name: string;
  method: ProfileAuthMethod;
  email?: string;
  phone?: string;
  password?: string;
}): { ok: boolean; message: string; account?: ProfileAccount } => {
  const name = params.name.trim();
  const method = params.method;

  if (!name) {
    return { ok: false, message: 'Please enter your name.' };
  }

  const accounts = getAccounts();

  if (method === 'phone') {
    const phone = normalizePhone(params.phone || '');
    if (!phone) {
      return { ok: false, message: 'Please enter a phone number.' };
    }

    if (!(params.password || '').trim()) {
      return { ok: false, message: 'Please create a password for phone login.' };
    }

    if (findAccountByCredential(accounts, method, phone)) {
      return { ok: false, message: 'An account with this phone number already exists.' };
    }

    const account: ProfileAccount = {
      id: generateId('account'),
      name,
      method,
      phone,
      password: params.password?.trim(),
      tagline: DEFAULT_PROFILE_TAGLINE,
      createdAt: new Date().toISOString()
    };

    const nextAccounts = [...accounts, account];
    saveAccounts(nextAccounts);
    setSession({ accountId: account.id, loggedInAt: new Date().toISOString() });
    logProfileActivity(account.id, 'Registered with phone number.');
    return { ok: true, message: 'Registration successful.', account };
  }

  const email = normalizeEmail(params.email || '');
  if (!email) {
    return { ok: false, message: 'Please enter an email address.' };
  }

  if (method === 'email' && !(params.password || '').trim()) {
    return { ok: false, message: 'Please create a password for email login.' };
  }

  if (findAccountByCredential(accounts, method, email)) {
    return { ok: false, message: 'An account with this credential already exists.' };
  }

  const account: ProfileAccount = {
    id: generateId('account'),
    name,
    method,
    email,
    password: method === 'email' ? params.password?.trim() : undefined,
    tagline: DEFAULT_PROFILE_TAGLINE,
    createdAt: new Date().toISOString()
  };

  const nextAccounts = [...accounts, account];
  saveAccounts(nextAccounts);
  setSession({ accountId: account.id, loggedInAt: new Date().toISOString() });
  logProfileActivity(account.id, method === 'google' ? 'Registered with Google account.' : 'Registered with email address.');
  return { ok: true, message: 'Registration successful.', account };
};

export const loginProfileAccount = (params: {
  method: ProfileAuthMethod;
  email?: string;
  phone?: string;
  password?: string;
}): { ok: boolean; message: string; account?: ProfileAccount } => {
  const accounts = getAccounts();
  const method = params.method;

  let account: ProfileAccount | undefined;

  if (method === 'phone') {
    const phone = normalizePhone(params.phone || '');
    if (!phone) {
      return { ok: false, message: 'Please enter your phone number.' };
    }

    account = findAccountByCredential(accounts, method, phone);
    if (!account) {
      return { ok: false, message: 'No account found for this phone number.' };
    }

    if ((account.password || '') !== (params.password || '').trim()) {
      return { ok: false, message: 'Incorrect password.' };
    }
  } else {
    const email = normalizeEmail(params.email || '');
    if (!email) {
      return { ok: false, message: 'Please enter your email address.' };
    }

    account = findAccountByCredential(accounts, method, email);
    if (!account) {
      return { ok: false, message: method === 'google' ? 'Google account not found. Please register first.' : 'No account found for this email.' };
    }

    if (method === 'email' && (account.password || '') !== (params.password || '').trim()) {
      return { ok: false, message: 'Incorrect password.' };
    }
  }

  setSession({ accountId: account.id, loggedInAt: new Date().toISOString() });
  logProfileActivity(account.id, 'Logged in successfully.');
  return { ok: true, message: 'Login successful.', account };
};

export const logoutProfileAccount = (): void => {
  const account = getCurrentProfileAccount();
  if (account) {
    logProfileActivity(account.id, 'Logged out.');
  }

  setSession(null);
};

export const getFavoriteDestinationIdsForCurrentUser = (): string[] => {
  const account = getCurrentProfileAccount();
  if (!account) {
    return [];
  }

  const store = getFavoriteStore();
  const favorites = store[account.id] || [];
  return Array.from(new Set(favorites));
};

export const toggleFavoriteDestinationForCurrentUser = (
  destinationId: string
): { ok: boolean; isFavorite: boolean; reason?: 'AUTH_REQUIRED' } => {
  const normalizedDestinationId = String(destinationId || '').trim();
  if (!normalizedDestinationId) {
    return { ok: false, isFavorite: false };
  }

  const account = getCurrentProfileAccount();
  if (!account) {
    return { ok: false, isFavorite: false, reason: 'AUTH_REQUIRED' };
  }

  const store = getFavoriteStore();
  const existing = store[account.id] || [];
  const isAlreadyFavorite = existing.includes(normalizedDestinationId);

  store[account.id] = isAlreadyFavorite
    ? existing.filter((item) => item !== normalizedDestinationId)
    : [...existing, normalizedDestinationId];

  saveFavoriteStore(store);

  if (isAlreadyFavorite) {
    logProfileActivity(account.id, 'Removed a destination from favorites.');
  } else {
    logProfileActivity(account.id, 'Added a destination to favorites.');
  }

  return { ok: true, isFavorite: !isAlreadyFavorite };
};

export const getProfileActivitiesForCurrentUser = (): ProfileActivityItem[] => {
  const account = getCurrentProfileAccount();
  if (!account) {
    return [];
  }

  const store = getActivityStore();
  return store[account.id] || [];
};

export const getFavoriteCountForCurrentUser = (): number => {
  return getFavoriteDestinationIdsForCurrentUser().length;
};

export const updateCurrentProfileAccount = (updates: {
  tagline?: string;
  avatarDataUrl?: string | null;
}): { ok: boolean; message: string; account?: ProfileAccount } => {
  const session = getSession();
  if (!session) {
    return { ok: false, message: 'Please login first.' };
  }

  const accounts = getAccounts();
  const targetIndex = accounts.findIndex((account) => account.id === session.accountId);
  if (targetIndex === -1) {
    return { ok: false, message: 'Account not found.' };
  }

  const existing = accounts[targetIndex];
  const nextTagline = updates.tagline !== undefined
    ? (updates.tagline.trim() || DEFAULT_PROFILE_TAGLINE)
    : existing.tagline || DEFAULT_PROFILE_TAGLINE;

  const nextAvatarDataUrl = updates.avatarDataUrl === null
    ? undefined
    : updates.avatarDataUrl !== undefined
      ? updates.avatarDataUrl
      : existing.avatarDataUrl;

  const nextAccount: ProfileAccount = {
    ...existing,
    tagline: nextTagline,
    avatarDataUrl: nextAvatarDataUrl
  };

  accounts[targetIndex] = nextAccount;
  saveAccounts(accounts);
  emitWindowEvent(PROFILE_AUTH_CHANGED_EVENT);

  if (updates.avatarDataUrl !== undefined) {
    logProfileActivity(nextAccount.id, updates.avatarDataUrl ? 'Updated profile picture.' : 'Removed profile picture.');
  }

  if (updates.tagline !== undefined) {
    logProfileActivity(nextAccount.id, 'Updated profile tagline.');
  }

  return { ok: true, message: 'Profile updated.', account: nextAccount };
};
