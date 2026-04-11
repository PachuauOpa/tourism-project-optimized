import sharp from 'sharp';

const VARIANT_SUFFIX_REGEX = /\.__(small|medium|large)\.webp$/i;

export const IMAGE_VARIANT_ORDER = ['small', 'medium', 'large'];

export const IMAGE_VARIANT_PROFILES = {
  small: { width: 320, quality: 45 },
  medium: { width: 800, quality: 65 },
  large: { width: 1600, quality: 82 }
};

const KNOWN_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.gif', '.bmp', '.tiff']);

const safeDecodeURIComponent = (value = '') => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const isVariantStoragePath = (storagePath = '') => VARIANT_SUFFIX_REGEX.test(String(storagePath).trim());

export const resolveVariantBasePath = (storagePath = '') => {
  const rawPath = String(storagePath || '').trim();
  if (!rawPath) {
    return '';
  }

  const decodedPath = safeDecodeURIComponent(rawPath);
  if (VARIANT_SUFFIX_REGEX.test(decodedPath)) {
    return decodedPath.replace(VARIANT_SUFFIX_REGEX, '');
  }

  const lastSlashIndex = decodedPath.lastIndexOf('/');
  const lastDotIndex = decodedPath.lastIndexOf('.');

  if (lastDotIndex > lastSlashIndex) {
    return decodedPath.slice(0, lastDotIndex);
  }

  return decodedPath;
};

export const buildVariantStoragePaths = (storagePath = '') => {
  const basePath = resolveVariantBasePath(storagePath);
  if (!basePath) {
    return null;
  }

  return {
    small: `${basePath}.__small.webp`,
    medium: `${basePath}.__medium.webp`,
    large: `${basePath}.__large.webp`
  };
};

export const isLikelyImageUpload = (fileType = '', fileName = '') => {
  const mimeType = String(fileType || '').toLowerCase();
  if (mimeType.startsWith('image/')) {
    return true;
  }

  const lowerName = String(fileName || '').toLowerCase();
  const extension = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
  return KNOWN_IMAGE_EXTENSIONS.has(extension);
};

export const generateWebpVariantBuffers = async (inputBuffer) => {
  const sourceBuffer = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);
  if (!sourceBuffer.length) {
    throw new Error('Cannot generate image variants from an empty file');
  }

  const variantBuffers = {};

  for (const size of IMAGE_VARIANT_ORDER) {
    const profile = IMAGE_VARIANT_PROFILES[size];
    variantBuffers[size] = await sharp(sourceBuffer)
      .rotate()
      .resize({
        width: profile.width,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: profile.quality })
      .toBuffer();
  }

  return variantBuffers;
};

export const parseStorageAssetUrl = (assetUrl, defaultBucket = 'mizTour') => {
  const rawUrl = String(assetUrl || '').trim();
  if (!rawUrl) {
    return null;
  }

  const isRelative = rawUrl.startsWith('/');

  let parsedUrl;
  try {
    parsedUrl = isRelative ? new URL(rawUrl, 'http://local.invalid') : new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsedUrl.pathname !== '/api/storage/asset') {
    return null;
  }

  const bucket = String(parsedUrl.searchParams.get('bucket') || defaultBucket).trim();
  const encodedPath = String(parsedUrl.searchParams.get('path') || '').trim();
  const storagePath = safeDecodeURIComponent(encodedPath);

  if (!bucket || !storagePath) {
    return null;
  }

  return {
    bucket,
    storagePath,
    origin: isRelative ? '' : parsedUrl.origin
  };
};

export const buildStorageAssetUrl = (origin, bucket, storagePath) => {
  const params = new URLSearchParams({
    bucket: String(bucket || '').trim(),
    path: String(storagePath || '').trim()
  });

  const normalizedOrigin = String(origin || '').replace(/\/$/, '');
  if (normalizedOrigin) {
    return `${normalizedOrigin}/api/storage/asset?${params.toString()}`;
  }

  return `/api/storage/asset?${params.toString()}`;
};

export const buildVariantAssetUrlsFromAssetUrl = (assetUrl, options = {}) => {
  const parsed = parseStorageAssetUrl(assetUrl, options.defaultBucket);
  if (!parsed) {
    return null;
  }

  const variantPaths = buildVariantStoragePaths(parsed.storagePath);
  if (!variantPaths) {
    return null;
  }

  const origin = parsed.origin || String(options.defaultOrigin || '').replace(/\/$/, '');

  return {
    small: buildStorageAssetUrl(origin, parsed.bucket, variantPaths.small),
    medium: buildStorageAssetUrl(origin, parsed.bucket, variantPaths.medium),
    large: buildStorageAssetUrl(origin, parsed.bucket, variantPaths.large)
  };
};

export const collectVariantDeletionTargetsFromAssetUrl = (assetUrl, options = {}) => {
  const parsed = parseStorageAssetUrl(assetUrl, options.defaultBucket);
  if (!parsed) {
    return [];
  }

  const variantPaths = buildVariantStoragePaths(parsed.storagePath);
  if (!variantPaths) {
    return [];
  }

  const targets = new Set([variantPaths.small, variantPaths.medium, variantPaths.large]);
  if (!isVariantStoragePath(parsed.storagePath)) {
    targets.add(parsed.storagePath);
  }

  return Array.from(targets).map((path) => ({
    bucket: parsed.bucket,
    path
  }));
};
