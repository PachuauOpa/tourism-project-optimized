export interface UserLocation {
  lat: number;
  lng: number;
}

interface StoredLocation {
  lat: number;
  lng: number;
  ts: number;
}

const LOCATION_STORAGE_KEY = 'tourism-user-location';
const DEFAULT_LOCATION_TTL_MS = 5 * 60 * 1000;

const readStoredLocation = (): StoredLocation | null => {
  try {
    const raw = sessionStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredLocation>;
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      typeof parsed.ts !== 'number'
    ) {
      return null;
    }

    return {
      lat: parsed.lat,
      lng: parsed.lng,
      ts: parsed.ts
    };
  } catch {
    return null;
  }
};

const writeStoredLocation = (location: UserLocation): void => {
  try {
    const payload: StoredLocation = {
      ...location,
      ts: Date.now()
    };

    sessionStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota and serialization failures.
  }
};

export const getCachedUserLocation = (ttlMs = DEFAULT_LOCATION_TTL_MS): UserLocation | null => {
  const cached = readStoredLocation();
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.ts > ttlMs) {
    return null;
  }

  return {
    lat: cached.lat,
    lng: cached.lng
  };
};

export const requestUserLocation = (
  options: PositionOptions = {
    timeout: 3500,
    enableHighAccuracy: false,
    maximumAge: DEFAULT_LOCATION_TTL_MS
  }
): Promise<UserLocation> => {
  if (!('geolocation' in navigator)) {
    return Promise.reject(new Error('Geolocation not supported by your browser.'));
  }

  const cached = getCachedUserLocation(options.maximumAge ?? DEFAULT_LOCATION_TTL_MS);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        writeStoredLocation(location);
        resolve(location);
      },
      (error) => {
        reject(error);
      },
      options
    );
  });
};
