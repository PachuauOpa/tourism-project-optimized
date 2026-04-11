import {
  Destination,
  DestinationFilterConfig,
  FilterCategory,
  ManagedDestinationPayload,
  ManagedDestinationRecord
} from '../types';
import {
  DEFAULT_DESTINATION_FILTER_CONFIG,
  getDefaultAppliesToCategoriesForFilterGroup
} from '../data/destinationFilterConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const destinationBySlugCache = new Map<string, ManagedDestinationRecord>();
const destinationRequestCache = new Map<string, Promise<ManagedDestinationRecord>>();
let destinationFilterConfigCache: DestinationFilterConfig | null = null;
let destinationFilterConfigRequest: Promise<DestinationFilterConfig> | null = null;

const LEGACY_TYPE_TAG_MAP: Record<string, string> = {
  nature: 'mountain',
  heritage: 'cultural-site',
  cultural: 'cultural-site',
  restaurant: 'cultural-site',
  cafe: 'cultural-site',
  parks: 'national-park'
};

const sanitizeFilterCategories = (categories: unknown): FilterCategory[] => {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map((category) => {
      if (!category || typeof category !== 'object') {
        return null;
      }

      const candidate = category as {
        key?: unknown;
        title?: unknown;
        appliesToCategories?: unknown;
        options?: unknown;
      };

      const options = Array.isArray(candidate.options)
        ? candidate.options
          .map((option) => {
            if (!option || typeof option !== 'object') {
              return null;
            }

            const optionValue = option as {
              value?: unknown;
              label?: unknown;
              description?: unknown;
              bracketText?: unknown;
            };

            const value = String(optionValue.value || '').trim();
            if (!value) {
              return null;
            }

            return {
              value,
              label: String(optionValue.label || value).trim() || value,
              description: String(optionValue.description || '').trim(),
              bracketText: String(optionValue.bracketText || '').trim() || undefined
            };
          })
          .filter(Boolean)
        : [];

      const key = String(candidate.key || '').trim();
      if (!key || options.length === 0) {
        return null;
      }

      return {
        key,
        title: String(candidate.title || key).trim() || key,
        appliesToCategories: (() => {
          const configuredScope = Array.isArray(candidate.appliesToCategories)
            ? candidate.appliesToCategories.map((item) => String(item || '').trim()).filter(Boolean)
            : [];

          if (configuredScope.length > 0) {
            return configuredScope;
          }

          return getDefaultAppliesToCategoriesForFilterGroup(key);
        })(),
        options
      };
    })
    .filter((item): item is FilterCategory => Boolean(item));
};

const normalizeFilterConfig = (config: unknown): DestinationFilterConfig => {
  if (!config || typeof config !== 'object') {
    return DEFAULT_DESTINATION_FILTER_CONFIG;
  }

  const categories = sanitizeFilterCategories((config as { categories?: unknown }).categories);
  if (categories.length === 0) {
    return DEFAULT_DESTINATION_FILTER_CONFIG;
  }

  const incomingByKey = new Map(categories.map((category) => [category.key, category]));
  const mergedCategories: FilterCategory[] = DEFAULT_DESTINATION_FILTER_CONFIG.categories.map((defaultCategory) => (
    incomingByKey.get(defaultCategory.key) || defaultCategory
  ));

  return { categories: mergedCategories };
};

const resolveTypeTags = (record: ManagedDestinationRecord): string[] => {
  if (Array.isArray(record.destination_type_tags) && record.destination_type_tags.length > 0) {
    return record.destination_type_tags.map((tag) => LEGACY_TYPE_TAG_MAP[tag] || tag);
  }

  const fallbackType = LEGACY_TYPE_TAG_MAP[record.destination_type] || record.destination_type;
  return fallbackType ? [fallbackType] : [];
};

const toDestinationCard = (record: ManagedDestinationRecord): Destination => ({
  typeTags: resolveTypeTags(record),
  id: record.slug,
  name: record.title,
  short: record.short_description,
  detail: record.about,
  rating: String(record.rating),
  time: record.distance_km ? `${record.distance_km} km` : record.travel_time,
  image: record.header_image_variants?.small || record.header_image_url || '/reiek tlang.jpg',
  imageVariants: record.header_image_variants || null,
  region: record.region,
  activityType: record.activity_type,
  difficulty: record.difficulty,
  bestSeason: record.best_time ? [record.best_time.toLowerCase()] : ['all-season'],
  duration: record.duration,
  type: resolveTypeTags(record)[0] || record.destination_type,
  destinationCategory: record.destination_type,
  filterTags: Array.isArray(record.destination_filter_tags) ? record.destination_filter_tags : [],
  featured: record.featured
});

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Request failed');
  }

  return response.json() as Promise<T>;
};

const withTokenHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const fetchManagedDestinations = async (params?: {
  featured?: boolean;
  includeUnpublished?: boolean;
  lat?: number;
  lng?: number;
}): Promise<ManagedDestinationRecord[]> => {
  const query = new URLSearchParams();
  if (params?.featured) {
    query.set('featured', 'true');
  }
  if (params?.includeUnpublished) {
    query.set('includeUnpublished', 'true');
  }
  if (Number.isFinite(params?.lat)) {
    query.set('lat', String(params?.lat));
  }
  if (Number.isFinite(params?.lng)) {
    query.set('lng', String(params?.lng));
  }

  const response = await fetch(`${API_BASE_URL}/api/destinations?${query.toString()}`);
  return parseResponse<ManagedDestinationRecord[]>(response);
};

export const fetchManagedDestinationBySlug = async (
  slug: string,
  location?: { lat: number; lng: number }
): Promise<ManagedDestinationRecord> => {
  const hasLocation = Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
  const requestCacheKey = hasLocation
    ? `${slug}:${String(location?.lat)}:${String(location?.lng)}`
    : slug;

  if (!hasLocation) {
    const cachedRecord = destinationBySlugCache.get(slug);
    if (cachedRecord) {
      return cachedRecord;
    }
  }

  const cachedRequest = destinationRequestCache.get(requestCacheKey);
  if (cachedRequest) {
    return cachedRequest;
  }

  const query = new URLSearchParams();
  if (Number.isFinite(location?.lat)) {
    query.set('lat', String(location?.lat));
  }
  if (Number.isFinite(location?.lng)) {
    query.set('lng', String(location?.lng));
  }

  const request = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/destinations/${encodeURIComponent(slug)}?${query.toString()}`);
    const record = await parseResponse<ManagedDestinationRecord>(response);
    destinationBySlugCache.set(slug, record);
    return record;
  })();

  destinationRequestCache.set(requestCacheKey, request);

  try {
    return await request;
  } finally {
    destinationRequestCache.delete(requestCacheKey);
  }
};

export const prefetchManagedDestinationBySlug = async (slug: string): Promise<void> => {
  try {
    await fetchManagedDestinationBySlug(slug);
  } catch {
    // Ignore prefetch errors; normal navigation will handle fetch failures.
  }
};

export const fetchAdminDestinations = async (token: string): Promise<ManagedDestinationRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/destinations`, {
    headers: withTokenHeaders(token)
  });
  return parseResponse<ManagedDestinationRecord[]>(response);
};

export const createAdminDestination = async (
  token: string,
  payload: ManagedDestinationPayload
): Promise<ManagedDestinationRecord> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/destinations`, {
    method: 'POST',
    headers: withTokenHeaders(token),
    body: JSON.stringify(payload)
  });

  return parseResponse<ManagedDestinationRecord>(response);
};

export const updateAdminDestination = async (
  token: string,
  id: number,
  payload: ManagedDestinationPayload
): Promise<ManagedDestinationRecord> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/destinations/${id}`, {
    method: 'PUT',
    headers: withTokenHeaders(token),
    body: JSON.stringify(payload)
  });

  return parseResponse<ManagedDestinationRecord>(response);
};

export const deleteAdminDestination = async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/destinations/${id}`, {
    method: 'DELETE',
    headers: withTokenHeaders(token)
  });

  await parseResponse<{ success: boolean }>(response);
};

export const fetchDestinationFilterConfig = async (): Promise<DestinationFilterConfig> => {
  if (destinationFilterConfigCache) {
    return destinationFilterConfigCache;
  }

  if (!destinationFilterConfigRequest) {
    destinationFilterConfigRequest = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/destination-filters`);
      const config = await parseResponse<DestinationFilterConfig>(response);
      return normalizeFilterConfig(config);
    })();
  }

  try {
    destinationFilterConfigCache = await destinationFilterConfigRequest;
  } catch {
    destinationFilterConfigCache = DEFAULT_DESTINATION_FILTER_CONFIG;
  } finally {
    destinationFilterConfigRequest = null;
  }

  return destinationFilterConfigCache;
};

export const fetchAdminDestinationFilterConfig = async (token: string): Promise<DestinationFilterConfig> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/destination-filters`, {
    headers: withTokenHeaders(token)
  });

  const config = await parseResponse<DestinationFilterConfig>(response);
  return normalizeFilterConfig(config);
};

export const updateAdminDestinationFilterConfig = async (
  token: string,
  config: DestinationFilterConfig
): Promise<DestinationFilterConfig> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/destination-filters`, {
    method: 'PUT',
    headers: withTokenHeaders(token),
    body: JSON.stringify(config)
  });

  const updatedConfig = normalizeFilterConfig(await parseResponse<DestinationFilterConfig>(response));
  destinationFilterConfigCache = updatedConfig;
  return updatedConfig;
};

export const uploadDestinationImage = async (
  file: File,
  folder: string,
  bucket?: string
): Promise<string> => {
  const fileDataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64Payload = result.includes(',') ? result.split(',').pop() || '' : result;
      resolve(base64Payload);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${API_BASE_URL}/api/storage/upload`, {
    method: 'POST',
    headers: withTokenHeaders(),
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileDataBase64,
      folder,
      bucket
    })
  });

  const uploadResponse = await parseResponse<{
    publicUrl: string;
    variants?: {
      large?: {
        publicUrl?: string;
      };
    };
  }>(response);

  const imageUrl = String(uploadResponse.variants?.large?.publicUrl || uploadResponse.publicUrl || '').trim();

  if (imageUrl.startsWith('/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  return imageUrl;
};

export const toDestinationCards = (records: ManagedDestinationRecord[]): Destination[] => {
  return records.map(toDestinationCard);
};
