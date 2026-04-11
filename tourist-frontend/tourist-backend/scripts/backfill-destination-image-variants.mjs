import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../server/db.js';
import {
  buildStorageAssetUrl,
  buildVariantStoragePaths,
  generateWebpVariantBuffers,
  parseStorageAssetUrl
} from '../server/imageVariants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true
});

const shouldApply = process.argv.includes('--apply');
const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || process.env.VITE_SUPABASE_BUCKET || 'mizTour';
const PORT = Number(process.env.PORT || 4000);
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || `http://localhost:${PORT}`;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in tourist-backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const uploadVariantSet = async (bucket, variantBuffers, variantPaths) => {
  for (const size of ['small', 'medium', 'large']) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(variantPaths[size], variantBuffers[size], {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      throw new Error(`Variant upload failed (${size}): ${error.message}`);
    }
  }
};

const deleteLegacyIfNeeded = async (bucket, sourcePath, variantPaths) => {
  const canonicalVariantPaths = new Set(Object.values(variantPaths));
  if (canonicalVariantPaths.has(sourcePath)) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove([sourcePath]);
  if (error) {
    throw new Error(`Legacy delete failed: ${error.message}`);
  }
};

const migrateAssetUrl = async (assetUrl) => {
  const parsed = parseStorageAssetUrl(assetUrl, STORAGE_BUCKET);
  if (!parsed) {
    return {
      status: 'skipped',
      reason: 'not-storage-asset-url',
      updatedUrl: assetUrl
    };
  }

  const variantPaths = buildVariantStoragePaths(parsed.storagePath);
  if (!variantPaths) {
    return {
      status: 'skipped',
      reason: 'cannot-compute-variant-paths',
      updatedUrl: assetUrl
    };
  }

  const { data: sourceBlob, error: downloadError } = await supabase.storage
    .from(parsed.bucket)
    .download(parsed.storagePath);

  if (downloadError || !sourceBlob) {
    return {
      status: 'error',
      reason: `download-failed: ${downloadError?.message || 'unknown'}`,
      updatedUrl: assetUrl
    };
  }

  const sourceBuffer = Buffer.from(await sourceBlob.arrayBuffer());
  const variantBuffers = await generateWebpVariantBuffers(sourceBuffer);

  if (shouldApply) {
    await uploadVariantSet(parsed.bucket, variantBuffers, variantPaths);
    await deleteLegacyIfNeeded(parsed.bucket, parsed.storagePath, variantPaths);
  }

  return {
    status: 'ok',
    updatedUrl: buildStorageAssetUrl(PUBLIC_API_BASE_URL, parsed.bucket, variantPaths.large)
  };
};

const migrateRecord = async ({
  table,
  id,
  column,
  currentUrl,
  cache,
  summary
}) => {
  if (!currentUrl) {
    summary.skipped += 1;
    return;
  }

  let migrationResult = cache.get(currentUrl);
  if (!migrationResult) {
    try {
      migrationResult = await migrateAssetUrl(currentUrl);
    } catch (error) {
      migrationResult = {
        status: 'error',
        reason: error instanceof Error ? error.message : String(error),
        updatedUrl: currentUrl
      };
    }

    cache.set(currentUrl, migrationResult);
  }

  if (migrationResult.status === 'error') {
    summary.errors += 1;
    console.error(`[ERROR] ${table}.${column} id=${id}: ${migrationResult.reason}`);
    return;
  }

  if (migrationResult.status === 'skipped') {
    summary.skipped += 1;
    return;
  }

  summary.processed += 1;

  const nextUrl = String(migrationResult.updatedUrl || '').trim();
  if (shouldApply && nextUrl && nextUrl !== currentUrl) {
    await pool.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [nextUrl, id]);
    summary.updated += 1;
  }
};

const main = async () => {
  const summary = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  const cache = new Map();

  const destinations = await pool.query(
    'SELECT id, header_image_url FROM destinations WHERE header_image_url IS NOT NULL'
  );
  const galleryImages = await pool.query(
    'SELECT id, image_url FROM destination_gallery_images WHERE image_url IS NOT NULL'
  );
  const folkloreImages = await pool.query(
    'SELECT id, image_url FROM destination_folklore_stories WHERE image_url IS NOT NULL'
  );

  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Destination headers: ${destinations.rowCount}`);
  console.log(`Gallery images: ${galleryImages.rowCount}`);
  console.log(`Folklore images: ${folkloreImages.rowCount}`);

  for (const row of destinations.rows) {
    await migrateRecord({
      table: 'destinations',
      id: row.id,
      column: 'header_image_url',
      currentUrl: String(row.header_image_url || '').trim(),
      cache,
      summary
    });
  }

  for (const row of galleryImages.rows) {
    await migrateRecord({
      table: 'destination_gallery_images',
      id: row.id,
      column: 'image_url',
      currentUrl: String(row.image_url || '').trim(),
      cache,
      summary
    });
  }

  for (const row of folkloreImages.rows) {
    await migrateRecord({
      table: 'destination_folklore_stories',
      id: row.id,
      column: 'image_url',
      currentUrl: String(row.image_url || '').trim(),
      cache,
      summary
    });
  }

  console.log('--- Migration Summary ---');
  console.log(`Processed: ${summary.processed}`);
  console.log(`Updated DB rows: ${summary.updated}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors: ${summary.errors}`);
};

main()
  .catch((error) => {
    console.error('Image variant migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
