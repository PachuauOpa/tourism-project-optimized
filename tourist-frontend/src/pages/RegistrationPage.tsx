import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';
import HeaderLogo from '../components/shared/HeaderLogo';
import useFavoriteDestinations from '../hooks/useFavoriteDestinations';
import { Destination, ManagedDestinationRecord } from '../types';
import { fetchManagedDestinations, toDestinationCards } from '../utils/destinationApi';
import {
  getCurrentProfileAccount,
  DEFAULT_PROFILE_TAGLINE,
  getProfileActivitiesForCurrentUser,
  loginProfileAccount,
  logoutProfileAccount,
  PROFILE_AUTH_CHANGED_EVENT,
  ProfileAccount,
  ProfileActivityItem,
  ProfileAuthMethod,
  registerProfileAccount,
  updateCurrentProfileAccount
} from '../utils/profileAuth';

type AuthMode = 'register' | 'login';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'TR';
  }

  return `${parts[0].charAt(0)}${parts[1]?.charAt(0) || ''}`.toUpperCase();
};

const formatRelativeTime = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) {
    return 'just now';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { favoriteIds } = useFavoriteDestinations();
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [authMethod, setAuthMethod] = useState<ProfileAuthMethod>('email');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [account, setAccount] = useState<ProfileAccount | null>(() => getCurrentProfileAccount());
  const [activities, setActivities] = useState<ProfileActivityItem[]>(() => getProfileActivitiesForCurrentUser());
  const [taglineDraft, setTaglineDraft] = useState<string>(
    () => getCurrentProfileAccount()?.tagline || DEFAULT_PROFILE_TAGLINE
  );
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState<boolean>(false);
  const [managedDestinations, setManagedDestinations] = useState<ManagedDestinationRecord[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState<boolean>(false);

  useEffect(() => {
    const handleAuthUpdate = () => {
      setAccount(getCurrentProfileAccount());
      setActivities(getProfileActivitiesForCurrentUser());
    };

    window.addEventListener(PROFILE_AUTH_CHANGED_EVENT, handleAuthUpdate);
    return () => {
      window.removeEventListener(PROFILE_AUTH_CHANGED_EVENT, handleAuthUpdate);
    };
  }, []);

  useEffect(() => {
    if (!account) {
      setManagedDestinations([]);
      return;
    }

    let isCancelled = false;
    const loadDestinations = async () => {
      setIsLoadingDestinations(true);
      try {
        const records = await fetchManagedDestinations();
        if (!isCancelled) {
          setManagedDestinations(records);
        }
      } catch {
        if (!isCancelled) {
          setManagedDestinations([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDestinations(false);
        }
      }
    };

    void loadDestinations();

    return () => {
      isCancelled = true;
    };
  }, [account]);

  useEffect(() => {
    setTaglineDraft(account?.tagline || DEFAULT_PROFILE_TAGLINE);
  }, [account]);

  const favoriteDestinations = useMemo((): Destination[] => {
    const cards = toDestinationCards(managedDestinations);
    const map = new Map(cards.map((item) => [item.id, item]));
    return favoriteIds.map((favoriteId) => map.get(favoriteId)).filter(Boolean) as Destination[];
  }, [favoriteIds, managedDestinations]);

  const canSubmit = useMemo(() => {
    if (authMode === 'register' && !name.trim()) {
      return false;
    }

    if (authMethod === 'phone') {
      if (!phone.trim()) {
        return false;
      }

      if (!password.trim()) {
        return false;
      }

      return authMode === 'login' || password.trim().length > 0;
    }

    if (!email.trim()) {
      return false;
    }

    if (authMethod === 'google') {
      return true;
    }

    return password.trim().length > 0;
  }, [authMethod, authMode, email, name, password, phone]);

  const handleSubmit = () => {
    setError('');
    setNotice('');

    const result = authMode === 'register'
      ? registerProfileAccount({
        name,
        method: authMethod,
        email,
        phone,
        password
      })
      : loginProfileAccount({
        method: authMethod,
        email,
        phone,
        password
      });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice(result.message);
    setPassword('');
    setAccount(result.account || getCurrentProfileAccount());
    setActivities(getProfileActivitiesForCurrentUser());
  };

  const handleLogout = () => {
    logoutProfileAccount();
    setNotice('You are logged out.');
    setError('');
  };

  const handleAvatarFileSelected = async (file?: File) => {
    if (!file) {
      return;
    }

    setError('');
    setNotice('');

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Please choose an image smaller than 2MB.');
      return;
    }

    try {
      const avatarDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const result = updateCurrentProfileAccount({ avatarDataUrl });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setAccount(result.account || getCurrentProfileAccount());
      setNotice('Profile picture updated.');
    } catch {
      setError('Unable to update profile picture right now.');
    }
  };

  const handleSaveTagline = () => {
    const result = updateCurrentProfileAccount({ tagline: taglineDraft });
    if (!result.ok) {
      setError(result.message);
      setNotice('');
      return;
    }

    setAccount(result.account || getCurrentProfileAccount());
    setNotice('Tagline updated.');
    setError('');
  };

  const handleRemoveAvatar = () => {
    const result = updateCurrentProfileAccount({ avatarDataUrl: null });
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setAccount(result.account || getCurrentProfileAccount());
    setNotice('Profile picture removed.');
    setError('');
  };

  const authTitle = authMode === 'register' ? 'Create your traveler account' : 'Login to your traveler account';
  const authDescription = authMode === 'register'
    ? 'Register with email, phone number, or Google account so you can login later with the same credentials.'
    : 'Use the same credential method you registered with to access your profile and favorites.';

  if (!account) {
    return (
      <Screen className="profile-screen">
        <HeaderLogo />
        <section className="profile-auth-card">
          <div className="profile-auth-mode-row" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              className={`profile-auth-mode-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
            <button
              type="button"
              className={`profile-auth-mode-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
          </div>

          <h2>{authTitle}</h2>
          <p>{authDescription}</p>

          <div className="profile-method-row" role="tablist" aria-label="Auth method">
            <button
              type="button"
              className={`profile-method-btn ${authMethod === 'email' ? 'active' : ''}`}
              onClick={() => setAuthMethod('email')}
            >
              Email
            </button>
            <button
              type="button"
              className={`profile-method-btn ${authMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setAuthMethod('phone')}
            >
              Phone
            </button>
            <button
              type="button"
              className={`profile-method-btn ${authMethod === 'google' ? 'active' : ''}`}
              onClick={() => setAuthMethod('google')}
            >
              Google
            </button>
          </div>

          {authMode === 'register' ? (
            <label>
              Full Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
              />
            </label>
          ) : null}

          {authMethod === 'phone' ? (
            <label>
              Phone Number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91 xxxxxxxxxx"
              />
            </label>
          ) : (
            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@email.com"
              />
            </label>
          )}

          {authMethod !== 'google' ? (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
            </label>
          ) : null}

          <button type="button" className="primary-btn profile-auth-submit" disabled={!canSubmit} onClick={handleSubmit}>
            {authMethod === 'google'
              ? (authMode === 'register' ? 'Continue with Google' : 'Login with Google')
              : (authMode === 'register' ? 'Register Account' : 'Login')}
          </button>

          {notice ? <p className="profile-auth-notice">{notice}</p> : null}
          {error ? <p className="profile-auth-error">{error}</p> : null}
        </section>
      </Screen>
    );
  }

  const primaryFavorite = favoriteDestinations[0] || null;
  const secondaryFavorites = favoriteDestinations.slice(1, 3);

  return (
    <Screen className="profile-screen profile-screen-authenticated">
      {isProfileSettingsOpen ? (
        <section className="profile-settings-panel">
          <h4>Profile Settings</h4>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              void handleAvatarFileSelected(nextFile);
              event.currentTarget.value = '';
            }}
          />

          <div className="profile-settings-actions">
            <button
              type="button"
              className="tiny-outline"
              onClick={() => avatarInputRef.current?.click()}
            >
              Change Profile Photo
            </button>
            {account.avatarDataUrl ? (
              <button
                type="button"
                className="tiny-outline"
                onClick={handleRemoveAvatar}
              >
                Remove Photo
              </button>
            ) : null}
          </div>

          <label className="profile-settings-tagline-field">
            Profile Tagline
            <input
              value={taglineDraft}
              maxLength={120}
              onChange={(event) => setTaglineDraft(event.target.value)}
              placeholder="Write your profile tagline"
            />
          </label>

          <div className="profile-settings-panel-actions">
            <button type="button" className="tiny-outline" onClick={handleSaveTagline}>Save Changes</button>
            <button type="button" className="tiny-outline" onClick={() => setIsProfileSettingsOpen(false)}>Close</button>
          </div>
        </section>
      ) : null}

      <section className="profile-top-card">
        <button
          type="button"
          className="profile-settings-gear"
          aria-label="Open profile settings"
          onClick={() => setIsProfileSettingsOpen((previous) => !previous)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M24 13.616v-3.232c-1.651-.587-2.694-.752-3.219-2.019v-.001c-.527-1.271.1-2.134.847-3.707l-2.285-2.285c-1.561.742-2.433 1.375-3.707.847h-.001c-1.269-.526-1.435-1.576-2.019-3.219h-3.232c-.582 1.635-.749 2.692-2.019 3.219h-.001c-1.271.528-2.132-.098-3.707-.847l-2.285 2.285c.745 1.568 1.375 2.434.847 3.707-.527 1.271-1.584 1.438-3.219 2.02v3.232c1.632.58 2.692.749 3.219 2.019.53 1.282-.114 2.166-.847 3.707l2.285 2.286c1.562-.743 2.434-1.375 3.707-.847h.001c1.27.526 1.436 1.579 2.019 3.219h3.232c.582-1.636.75-2.69 2.027-3.222h.001c1.262-.524 2.12.101 3.698.851l2.285-2.286c-.744-1.563-1.375-2.433-.848-3.706.527-1.271 1.588-1.44 3.221-2.021zm-12 2.384c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
              fill="currentColor"
            />
          </svg>
        </button>

        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {account.avatarDataUrl
              ? <img src={account.avatarDataUrl} alt={`${account.name} avatar`} className="profile-avatar-image" />
              : getInitials(account.name)}
          </div>
        </div>
        <h2>{account.name}</h2>
        <p className="profile-tagline">"{account.tagline || DEFAULT_PROFILE_TAGLINE}"</p>
        <span className="profile-status-dot" aria-hidden="true" />

        <div className="profile-single-metric">
          <strong>{favoriteIds.length}</strong>
          <span>Favorite Destinations</span>
        </div>

        <div className="profile-top-actions">
          <button type="button" className="tiny-outline" onClick={() => navigate('/destinations-gallery')}>
            Explore
          </button>
          <button type="button" className="tiny-outline" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {notice ? <p className="profile-auth-notice">{notice}</p> : null}
        {error ? <p className="profile-auth-error">{error}</p> : null}
      </section>

      <section className="profile-favorites-panel">
        <div className="profile-section-head">
          <h3>Favorite Destinations</h3>
          <button type="button" onClick={() => navigate('/destinations-gallery')}>See all</button>
        </div>

        {isLoadingDestinations ? (
          <p className="profile-empty">Loading favorites...</p>
        ) : primaryFavorite ? (
          <>
            <button
              type="button"
              className="profile-favorite-hero"
              onClick={() => navigate(`/destinations-template/${encodeURIComponent(primaryFavorite.id)}`)}
            >
              <img src={primaryFavorite.image} alt={primaryFavorite.name} loading="lazy" decoding="async" />
              <span className="profile-favorite-chip" aria-hidden="true">❤</span>
              <div className="profile-favorite-copy">
                <small>{String(primaryFavorite.region || '').toUpperCase()}</small>
                <strong>{primaryFavorite.name}</strong>
              </div>
            </button>

            {secondaryFavorites.length > 0 ? (
              <div className="profile-favorite-grid">
                {secondaryFavorites.map((destination) => (
                  <button
                    type="button"
                    key={destination.id}
                    className="profile-favorite-mini"
                    onClick={() => navigate(`/destinations-template/${encodeURIComponent(destination.id)}`)}
                  >
                    <img src={destination.image} alt={destination.name} loading="lazy" decoding="async" />
                    <span className="profile-favorite-chip" aria-hidden="true">❤</span>
                    <strong>{destination.name}</strong>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="profile-empty">
            No favorites yet. Add destinations from destination cards using the heart button.
          </p>
        )}
      </section>

      <section className="profile-activity-panel">
        <h3>Recent Activity</h3>
        {activities.length > 0 ? activities.slice(0, 5).map((item) => (
          <article key={item.id} className="profile-activity-item">
            <span className="profile-activity-icon" aria-hidden="true">i</span>
            <div>
              <strong>{item.message}</strong>
              <small>{formatRelativeTime(item.createdAt)}</small>
            </div>
          </article>
        )) : (
          <p className="profile-empty">No recent activity yet.</p>
        )}
      </section>
    </Screen>
  );
};

export default RegistrationPage;
