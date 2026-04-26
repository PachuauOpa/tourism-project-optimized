import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { initializeDatabase, pool } from './db.js';
import { registerDestinationRoutes } from './destinationRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import {
  buildStorageAssetUrl,
  buildVariantStoragePaths,
  collectVariantDeletionTargetsFromAssetUrl,
  generateWebpVariantBuffers,
  isLikelyImageUpload
} from './imageVariants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true
});

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());

// Raw body parser MUST be registered before the JSON parser so the Razorpay
// webhook handler can verify the HMAC signature against the raw payload bytes.
app.use('/api/payments/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '20mb' }));

const APP_TYPE_TO_TABLE = {
  temporary_ilp: 'temporary_ilp_applications',
  temporary_stay_permit: 'temporary_stay_permit_applications',
  ilp_exemption: 'ilp_exemption_applications'
};

const VALID_STATUSES = new Set(['pending', 'accepted', 'declined']);
const VALID_SORT_FIELDS = new Set(['submitted_at', 'full_name', 'application_status', 'reference_number', 'days_remaining']);
const adminSessions = new Map();
const sponsorSessions = new Map();

const VALID_PROMOTION_TYPES = new Set(['fresh', 'renewal']);
const VALID_REGULAR_VALIDITY = {
  '6_months': { months: 6 },
  '1_year': { years: 1 },
  '2_years': { years: 2 }
};

const ADMIN_USERNAME = process.env.ILP_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ILP_ADMIN_PASSWORD || 'admin123';
const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || process.env.VITE_SUPABASE_BUCKET || 'mizTour';
const SIGNED_URL_TTL_SECONDS = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS || 3600);
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || '';
const normalizeEnvString = (value = '') => String(value || '').trim();

const RAZORPAY_KEY_ID = normalizeEnvString(process.env.RAZORPAY_KEY_ID);
const RAZORPAY_KEY_SECRET = normalizeEnvString(process.env.RAZORPAY_KEY_SECRET);
const RAZORPAY_WEBHOOK_SECRET = normalizeEnvString(process.env.RAZORPAY_WEBHOOK_SECRET);
const ILP_PAYMENT_AMOUNT_PAISE = Number(process.env.ILP_PAYMENT_AMOUNT_PAISE || 5000);

const getRazorpayConfigIssues = () => {
  const issues = [];

  if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.startsWith('YOUR_') || RAZORPAY_KEY_ID === 'YOUR_RAZORPAY_KEY_ID') {
    issues.push('RAZORPAY_KEY_ID is missing or still a placeholder');
  }

  if (
    !RAZORPAY_KEY_SECRET ||
    RAZORPAY_KEY_SECRET.startsWith('YOUR_') ||
    RAZORPAY_KEY_SECRET === 'YOUR_RAZORPAY_KEY_SECRET'
  ) {
    issues.push('RAZORPAY_KEY_SECRET is missing or still a placeholder');
  }

  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && RAZORPAY_KEY_ID === RAZORPAY_KEY_SECRET) {
    issues.push('RAZORPAY_KEY_SECRET must not be the same as RAZORPAY_KEY_ID');
  }

  if (/^rzp_(test|live)_/i.test(RAZORPAY_KEY_SECRET)) {
    issues.push('RAZORPAY_KEY_SECRET looks like a key id; use the secret from Razorpay dashboard');
  }

  if (RAZORPAY_WEBHOOK_SECRET && /^https?:\/\//i.test(RAZORPAY_WEBHOOK_SECRET)) {
    issues.push('RAZORPAY_WEBHOOK_SECRET must be a shared secret string, not a URL');
  }

  return issues;
};

const RAZORPAY_CONFIG_ISSUES = getRazorpayConfigIssues();
const RAZORPAY_CONFIGURED = RAZORPAY_CONFIG_ISSUES.length === 0;

const getRazorpayClient = () => new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

const sanitizeFileName = (name = 'document') => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const normalizeMobileNo = (value = '') => String(value).replace(/\D/g, '');

const hashPassword = (plainTextPassword) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainTextPassword, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (plainTextPassword, passwordHash) => {
  if (!passwordHash || !passwordHash.includes(':')) {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(':');
  const derivedHash = crypto.scryptSync(plainTextPassword, salt, 64).toString('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(derivedHash, 'hex'));
  } catch {
    return false;
  }
};

const addRegularPassValidity = (fromDate, validityKey) => {
  const validity = VALID_REGULAR_VALIDITY[validityKey];
  const toDate = new Date(fromDate);

  if (validity?.months) {
    toDate.setMonth(toDate.getMonth() + validity.months);
  }

  if (validity?.years) {
    toDate.setFullYear(toDate.getFullYear() + validity.years);
  }

  return toDate;
};

const getSupabaseServiceClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

const createSignedUrlForPath = async (storagePath, bucket = STORAGE_BUCKET) => {
  if (!storagePath) {
    return null;
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error(`Failed to create signed URL for ${storagePath}:`, error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error(`Failed to create signed URL for ${storagePath}:`, error);
    return null;
  }
};

const buildServerBaseUrl = (req) => {
  if (PUBLIC_API_BASE_URL) {
    return PUBLIC_API_BASE_URL.replace(/\/$/, '');
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
};

const toStorageAssetUrl = (req, storagePath, bucket = STORAGE_BUCKET) => {
  if (!storagePath) {
    return null;
  }

  const baseUrl = buildServerBaseUrl(req);
  return buildStorageAssetUrl(baseUrl, bucket, storagePath);
};

const normalizeDestinationMediaUrl = (req, imageUrl) => {
  const rawValue = String(imageUrl || '').trim();
  if (!rawValue) {
    return rawValue;
  }

  // Keep direct links that are already stable and not Supabase signed-object links.
  if (rawValue.startsWith('/api/storage/asset?')) {
    const baseUrl = buildServerBaseUrl(req);
    return `${baseUrl}${rawValue}`;
  }

  try {
    const parsed = new URL(rawValue);
    const path = parsed.pathname || '';
    const signedPrefix = '/storage/v1/object/sign/';

    if (!path.startsWith(signedPrefix)) {
      return rawValue;
    }

    const bucketAndPath = path.slice(signedPrefix.length);
    const slashIndex = bucketAndPath.indexOf('/');

    if (slashIndex < 0) {
      return rawValue;
    }

    const bucket = bucketAndPath.slice(0, slashIndex);
    const storagePath = bucketAndPath.slice(slashIndex + 1);

    if (!bucket || !storagePath) {
      return rawValue;
    }

    return toStorageAssetUrl(req, storagePath, bucket);
  } catch {
    // Preserve non-URL values such as local placeholders.
    return rawValue;
  }
};

const chunkArray = (items, chunkSize) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const deleteStorageObjects = async (targets) => {
  const normalizedTargets = Array.isArray(targets)
    ? targets
      .map((target) => ({
        bucket: String(target?.bucket || '').trim(),
        path: String(target?.path || '').trim()
      }))
      .filter((target) => Boolean(target.bucket) && Boolean(target.path))
    : [];

  if (normalizedTargets.length === 0) {
    return;
  }

  const uniqueTargets = new Map();
  for (const target of normalizedTargets) {
    uniqueTargets.set(`${target.bucket}::${target.path}`, target);
  }

  const bucketGroups = new Map();
  for (const target of uniqueTargets.values()) {
    if (!bucketGroups.has(target.bucket)) {
      bucketGroups.set(target.bucket, []);
    }
    bucketGroups.get(target.bucket).push(target.path);
  }

  const supabase = getSupabaseServiceClient();
  for (const [bucket, paths] of bucketGroups.entries()) {
    const pathChunks = chunkArray(paths, 100);
    for (const pathChunk of pathChunks) {
      const { error } = await supabase.storage.from(bucket).remove(pathChunk);
      if (error) {
        throw new Error(`Failed to delete storage assets from ${bucket}: ${error.message}`);
      }
    }
  }
};

const deleteDestinationMediaAssets = async (mediaUrls) => {
  const targets = [];

  for (const mediaUrl of Array.isArray(mediaUrls) ? mediaUrls : []) {
    targets.push(
      ...collectVariantDeletionTargetsFromAssetUrl(mediaUrl, { defaultBucket: STORAGE_BUCKET })
    );
  }

  await deleteStorageObjects(targets);
};

const attachSignedDocumentUrls = async (record) => {
  const [uploadDocumentUrl, supportingDocumentUrl] = await Promise.all([
    createSignedUrlForPath(record.upload_document_storage_path),
    createSignedUrlForPath(record.supporting_document_storage_path)
  ]);

  return {
    ...record,
    upload_document_public_url: uploadDocumentUrl,
    supporting_document_public_url: supportingDocumentUrl
  };
};

const toReferenceNumber = (id, prefixDigit) => {
  const numericId = String(id).replace(/\D/g, '');
  return `${prefixDigit}${numericId.padStart(11, '0').slice(-11)}`;
};

const getValidityDaysByType = (applicationType) => {
  if (applicationType === 'temporary_ilp') {
    return 7;
  }

  if (applicationType === 'temporary_stay_permit') {
    return 30;
  }

  return 15;
};

const normalizeApplicantRecord = (record) => {
  const validityDays = getValidityDaysByType(record.application_type);
  const startDate = record.proposed_date_of_entry || record.exemption_from_date || record.submitted_at;
  const startDateObject = new Date(startDate);
  const expiryDateObject = new Date(startDateObject);
  expiryDateObject.setDate(expiryDateObject.getDate() + validityDays);

  const now = new Date();
  const daysRemaining = Math.floor((expiryDateObject.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverstayer = daysRemaining < 0;

  return {
    ...record,
    validity_days: validityDays,
    stay_start_date: startDateObject.toISOString(),
    expiry_date: expiryDateObject.toISOString(),
    days_remaining: daysRemaining,
    overstay_days: isOverstayer ? Math.abs(daysRemaining) : 0,
    is_overstayer: isOverstayer
  };
};

const buildCommonApplicantSelect = () => `
  SELECT
    id,
    reference_number,
    application_status,
    submitted_at,
    full_name,
    gender,
    date_of_birth,
    identity_mark,
    mobile_no,
    id_document_type,
    id_document_number,
    relation_type,
    relation_name,
    full_address,
    country,
    state,
    district,
    purpose_of_visit,
    place_of_stay,
    proposed_date_of_entry,
    exemption_from_date,
    exemption_to_date,
    sponsor_full_name,
    sponsor_father_name,
    sponsor_epic_no,
    sponsor_mobile_no,
    sponsorship_type,
    sponsor_district,
    upload_document_type,
    upload_document_file_name,
    upload_document_file_type,
    upload_document_file_size,
    upload_document_storage_path,
    upload_document_public_url,
    supporting_document_type,
    supporting_document_file_name,
    supporting_document_file_type,
    supporting_document_file_size,
    supporting_document_storage_path,
    supporting_document_public_url,
    remarks,
    application_type
  FROM (
    SELECT
      id,
      reference_number,
      application_status,
      submitted_at,
      full_name,
      gender,
      date_of_birth,
      identity_mark,
      mobile_no,
      id_document_type,
      id_document_number,
      relation_type,
      relation_name,
      full_address,
      country,
      state,
      district,
      purpose_of_visit,
      place_of_stay,
      proposed_date_of_entry,
      NULL::DATE AS exemption_from_date,
      NULL::DATE AS exemption_to_date,
      sponsor_full_name,
      sponsor_father_name,
      sponsor_epic_no,
      sponsor_mobile_no,
      sponsorship_type,
      sponsor_district,
      upload_document_type,
      upload_document_file_name,
      upload_document_file_type,
      upload_document_file_size,
      upload_document_storage_path,
      upload_document_public_url,
      NULL::TEXT AS supporting_document_type,
      NULL::TEXT AS supporting_document_file_name,
      NULL::TEXT AS supporting_document_file_type,
      NULL::BIGINT AS supporting_document_file_size,
      NULL::TEXT AS supporting_document_storage_path,
      NULL::TEXT AS supporting_document_public_url,
      remarks,
      'temporary_ilp'::TEXT AS application_type
    FROM temporary_ilp_applications
    UNION ALL
    SELECT
      id,
      reference_number,
      application_status,
      submitted_at,
      full_name,
      gender,
      date_of_birth,
      identity_mark,
      mobile_no,
      id_document_type,
      id_document_number,
      relation_type,
      relation_name,
      full_address,
      country,
      state,
      district,
      purpose_of_visit,
      place_of_stay,
      proposed_date_of_entry,
      NULL::DATE AS exemption_from_date,
      NULL::DATE AS exemption_to_date,
      sponsor_full_name,
      sponsor_father_name,
      sponsor_epic_no,
      sponsor_mobile_no,
      sponsorship_type,
      sponsor_district,
      upload_document_type,
      upload_document_file_name,
      upload_document_file_type,
      upload_document_file_size,
      upload_document_storage_path,
      upload_document_public_url,
      NULL::TEXT AS supporting_document_type,
      NULL::TEXT AS supporting_document_file_name,
      NULL::TEXT AS supporting_document_file_type,
      NULL::BIGINT AS supporting_document_file_size,
      NULL::TEXT AS supporting_document_storage_path,
      NULL::TEXT AS supporting_document_public_url,
      remarks,
      'temporary_stay_permit'::TEXT AS application_type
    FROM temporary_stay_permit_applications
    UNION ALL
    SELECT
      id,
      reference_number,
      application_status,
      submitted_at,
      full_name,
      gender,
      date_of_birth,
      identity_mark,
      mobile_no,
      id_document_type,
      id_document_number,
      relation_type,
      relation_name,
      full_address,
      country,
      state,
      district,
      purpose_of_visit,
      place_of_stay,
      NULL::DATE AS proposed_date_of_entry,
      exemption_from_date,
      exemption_to_date,
      NULL::TEXT AS sponsor_full_name,
      NULL::TEXT AS sponsor_father_name,
      NULL::TEXT AS sponsor_epic_no,
      NULL::TEXT AS sponsor_mobile_no,
      NULL::TEXT AS sponsorship_type,
      NULL::TEXT AS sponsor_district,
      NULL::TEXT AS upload_document_type,
      NULL::TEXT AS upload_document_file_name,
      NULL::TEXT AS upload_document_file_type,
      NULL::BIGINT AS upload_document_file_size,
      NULL::TEXT AS upload_document_storage_path,
      NULL::TEXT AS upload_document_public_url,
      supporting_document_type,
      supporting_document_file_name,
      supporting_document_file_type,
      supporting_document_file_size,
      supporting_document_storage_path,
      supporting_document_public_url,
      remarks,
      'ilp_exemption'::TEXT AS application_type
    FROM ilp_exemption_applications
  ) AS all_applications
`;

const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
};

const requireSponsor = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || !sponsorSessions.has(token)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  req.sponsorSession = sponsorSessions.get(token);
  req.sponsorToken = token;
  next();
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ---------------------------------------------------------------------------
// Razorpay Payment Endpoints
// ---------------------------------------------------------------------------

// POST /api/payments/create-order
// Creates a Razorpay order for ₹50 (5000 paise) tied to a reference number.
app.post('/api/payments/create-order', async (req, res) => {
  try {
    // Guard: reject early if Razorpay credentials are not configured.
    if (!RAZORPAY_CONFIGURED) {
      console.error('[Razorpay] Configuration issues:', RAZORPAY_CONFIG_ISSUES);
      res.status(503).json({
        message:
          'Payment gateway is not configured on the server. Fix Razorpay credentials in backend .env and restart.',
        causes: RAZORPAY_CONFIG_ISSUES
      });
      return;
    }

    const { referenceNumber, applicationType } = req.body || {};
    const normalizedRef = String(referenceNumber || '').trim();
    const normalizedType = String(applicationType || '').trim();

    if (!/^\d{12}$/.test(normalizedRef)) {
      res.status(400).json({ message: 'Reference number must be 12 digits' });
      return;
    }

    if (!APP_TYPE_TO_TABLE[normalizedType] && normalizedType !== 'temporary_ilp' && normalizedType !== 'temporary_stay_permit') {
      res.status(400).json({ message: 'Payment is only required for temporary ILP and stay permit applications' });
      return;
    }

    // Look up the application and its current payment status.
    const table = normalizedType === 'ilp_exemption' ? null : APP_TYPE_TO_TABLE[normalizedType];
    if (!table) {
      res.status(400).json({ message: 'Payment is not applicable for this application type' });
      return;
    }

    const appResult = await pool.query(
      `SELECT id, application_status, payment_status FROM ${table} WHERE reference_number = $1 LIMIT 1`,
      [normalizedRef]
    );

    if (appResult.rowCount === 0) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    const application = appResult.rows[0];

    if (application.application_status !== 'accepted') {
      res.status(400).json({ message: 'Payment can only be made after application is accepted' });
      return;
    }

    if (application.payment_status === 'paid') {
      res.status(409).json({ message: 'Payment has already been completed for this application' });
      return;
    }

    // Check for an existing open Razorpay order to avoid duplicate creation.
    const existingOrder = await pool.query(
      `SELECT razorpay_order_id, amount_paise, currency FROM ilp_payments WHERE reference_number = $1 AND status = 'created' ORDER BY created_at DESC LIMIT 1`,
      [normalizedRef]
    );

    if (existingOrder.rowCount > 0) {
      const existing = existingOrder.rows[0];
      res.json({
        orderId: existing.razorpay_order_id,
        amount: existing.amount_paise,
        currency: existing.currency,
        keyId: RAZORPAY_KEY_ID
      });
      return;
    }

    const razorpay = getRazorpayClient();
    let order;
    try {
      order = await razorpay.orders.create({
        amount: ILP_PAYMENT_AMOUNT_PAISE,
        currency: 'INR',
        receipt: `ilp_${normalizedRef}`,
        notes: { referenceNumber: normalizedRef, applicationType: normalizedType }
      });
    } catch (razorpayError) {
      // Surface the exact Razorpay API error for easier debugging.
      const rzpMessage =
        razorpayError?.error?.description ||
        razorpayError?.message ||
        String(razorpayError);
      const normalizedMessage = String(rzpMessage).toLowerCase();
      const isAuthFailure =
        razorpayError?.statusCode === 401 ||
        normalizedMessage.includes('authentication failed') ||
        normalizedMessage.includes('unauthorized') ||
        normalizedMessage.includes('invalid api key');

      console.error('[Razorpay] orders.create failed:', rzpMessage, razorpayError);

      if (isAuthFailure) {
        res.status(502).json({
          message:
            'Razorpay authentication failed. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are from the same Razorpay mode (both test or both live), and that KEY_SECRET is the actual secret (not the key id).'
        });
        return;
      }

      res.status(502).json({ message: `Razorpay error: ${rzpMessage}` });
      return;
    }

    await pool.query(
      `INSERT INTO ilp_payments (reference_number, application_type, razorpay_order_id, amount_paise, currency, status)
       VALUES ($1, $2, $3, $4, $5, 'created')`,
      [normalizedRef, normalizedType, order.id, ILP_PAYMENT_AMOUNT_PAISE, 'INR']
    );

    // Mark application as payment_pending so the admin can see it.
    await pool.query(
      `UPDATE ${table} SET payment_status = 'payment_pending' WHERE reference_number = $1`,
      [normalizedRef]
    );

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Failed to create Razorpay order (unexpected):', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify-payment
// Called by the frontend after Razorpay checkout succeeds; verifies signature
// server-side and marks the application as paid.
app.post('/api/payments/verify-payment', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, referenceNumber, applicationType } = req.body || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({ message: 'Missing Razorpay payment fields' });
      return;
    }

    // Validate signature: HMAC-SHA256(orderId + '|' + paymentId, secret)
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      res.status(400).json({ message: 'Payment signature verification failed' });
      return;
    }

    const normalizedRef = String(referenceNumber || '').trim();
    const normalizedType = String(applicationType || '').trim();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update ilp_payments record.
      await client.query(
        `UPDATE ilp_payments
         SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'paid', paid_at = NOW()
         WHERE razorpay_order_id = $3`,
        [razorpayPaymentId, razorpaySignature, razorpayOrderId]
      );

      // Mark the application itself as paid.
      const table = APP_TYPE_TO_TABLE[normalizedType];
      if (table) {
        await client.query(
          `UPDATE ${table} SET payment_status = 'paid' WHERE reference_number = $1`,
          [normalizedRef]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Payment verified and recorded successfully' });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to verify Razorpay payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

// POST /api/payments/razorpay/webhook
// Razorpay server-to-server webhook for reliable status updates.
// Raw body is required for HMAC verification — registered before JSON middleware.
app.post('/api/payments/razorpay/webhook', (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || '';
    const rawBody = req.body; // Buffer (raw middleware registered above)

    if (!RAZORPAY_WEBHOOK_SECRET) {
      // Webhook secret not configured; skip verification and acknowledge.
      res.json({ received: true });
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      res.status(400).json({ message: 'Invalid webhook signature' });
      return;
    }

    const event = JSON.parse(rawBody.toString('utf-8'));
    const eventName = event?.event || '';

    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const orderId = event?.payload?.payment?.entity?.order_id
        || event?.payload?.order?.entity?.id
        || '';
      const paymentId = event?.payload?.payment?.entity?.id || '';

      if (orderId) {
        pool.query(
          `UPDATE ilp_payments SET razorpay_payment_id = COALESCE(razorpay_payment_id, $1), status = 'paid', paid_at = COALESCE(paid_at, NOW()) WHERE razorpay_order_id = $2 AND status != 'paid'`,
          [paymentId, orderId]
        ).then(async (result) => {
          if ((result.rowCount || 0) > 0) {
            // Also mark the application payment_status = 'paid' via ilp_payments lookup.
            const paymentRow = await pool.query(
              'SELECT reference_number, application_type FROM ilp_payments WHERE razorpay_order_id = $1 LIMIT 1',
              [orderId]
            );
            const row = paymentRow.rows[0];
            if (row) {
              const table = APP_TYPE_TO_TABLE[row.application_type];
              if (table) {
                await pool.query(
                  `UPDATE ${table} SET payment_status = 'paid' WHERE reference_number = $1`,
                  [row.reference_number]
                );
              }
            }
          }
        }).catch((err) => console.error('Webhook DB update failed:', err));
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// GET /api/payments/status/:referenceNumber
// Returns the payment status for a given reference number.
app.get('/api/payments/status/:referenceNumber', async (req, res) => {
  try {
    const referenceNumber = String(req.params.referenceNumber || '').trim();

    if (!/^\d{12}$/.test(referenceNumber)) {
      res.status(400).json({ message: 'Reference number must be 12 digits' });
      return;
    }

    const result = await pool.query(
      `SELECT status, paid_at, razorpay_order_id, razorpay_payment_id
       FROM ilp_payments
       WHERE reference_number = $1
       ORDER BY created_at DESC LIMIT 1`,
      [referenceNumber]
    );

    if (result.rowCount === 0) {
      res.json({ paymentStatus: 'not_initiated', keyId: RAZORPAY_KEY_ID });
      return;
    }

    const row = result.rows[0];
    res.json({ paymentStatus: row.status, paidAt: row.paid_at, keyId: RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Failed to get payment status:', error);
    res.status(500).json({ message: 'Failed to get payment status' });
  }
});

app.post('/api/storage/upload', async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      fileDataBase64,
      folder,
      bucket
    } = req.body || {};

    if (!fileName || !fileDataBase64 || !folder) {
      res.status(400).json({ message: 'fileName, fileDataBase64 and folder are required' });
      return;
    }

    const targetBucket = bucket || STORAGE_BUCKET;
    const safeName = sanitizeFileName(String(fileName));
    const folderPath = String(folder).replace(/[^a-zA-Z0-9/_-]/g, '_');
    const fileStem = safeName.replace(/\.[^/.]+$/, '') || 'upload';
    const uniqueToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${fileStem}`;
    const defaultStoragePath = `${folderPath}/${uniqueToken}-${safeName}`;
    const normalizedBase64 = String(fileDataBase64).includes(',')
      ? String(fileDataBase64).split(',').pop()
      : String(fileDataBase64);

    const fileBuffer = Buffer.from(normalizedBase64, 'base64');
    const supabase = getSupabaseServiceClient();

    if (isLikelyImageUpload(fileType, fileName)) {
      const variantStoragePaths = buildVariantStoragePaths(`${folderPath}/${uniqueToken}`);
      if (!variantStoragePaths) {
        res.status(400).json({ message: 'Could not compute variant paths for uploaded image' });
        return;
      }

      const variantBuffers = await generateWebpVariantBuffers(fileBuffer);
      const uploadedVariantPaths = [];

      try {
        for (const [size, pathToUpload] of Object.entries(variantStoragePaths)) {
          const { error } = await supabase.storage
            .from(targetBucket)
            .upload(pathToUpload, variantBuffers[size], {
              cacheControl: '31536000',
              upsert: false,
              contentType: 'image/webp'
            });

          if (error) {
            throw new Error(`Supabase upload failed for ${size}: ${error.message}`);
          }

          uploadedVariantPaths.push(pathToUpload);
        }
      } catch (uploadError) {
        if (uploadedVariantPaths.length > 0) {
          await supabase.storage.from(targetBucket).remove(uploadedVariantPaths);
        }

        throw uploadError;
      }

      const variants = {
        small: {
          storagePath: variantStoragePaths.small,
          publicUrl: toStorageAssetUrl(req, variantStoragePaths.small, targetBucket)
        },
        medium: {
          storagePath: variantStoragePaths.medium,
          publicUrl: toStorageAssetUrl(req, variantStoragePaths.medium, targetBucket)
        },
        large: {
          storagePath: variantStoragePaths.large,
          publicUrl: toStorageAssetUrl(req, variantStoragePaths.large, targetBucket)
        }
      };

      res.status(201).json({
        bucket: targetBucket,
        storagePath: variantStoragePaths.large,
        publicUrl: variants.large.publicUrl,
        fileName: `${fileStem}.webp`,
        fileType: 'image/webp',
        fileSize: variantBuffers.large.length,
        variants
      });
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(defaultStoragePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileType || 'application/octet-stream'
      });

    if (uploadError) {
      res.status(400).json({ message: `Supabase upload failed: ${uploadError.message}` });
      return;
    }

    res.status(201).json({
      bucket: targetBucket,
      storagePath: defaultStoragePath,
      publicUrl: toStorageAssetUrl(req, defaultStoragePath, targetBucket),
      fileName,
      fileType: fileType || 'application/octet-stream',
      fileSize: fileBuffer.length
    });
  } catch (error) {
    console.error('Failed to upload document to storage:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

app.get('/api/storage/asset', async (req, res) => {
  try {
    const bucket = String(req.query.bucket || STORAGE_BUCKET).trim();
    const storagePath = String(req.query.path || '').trim();

    if (!storagePath) {
      res.status(400).json({ message: 'path is required' });
      return;
    }

    const signedUrl = await createSignedUrlForPath(storagePath, bucket);

    if (!signedUrl) {
      res.status(404).json({ message: 'Asset not found' });
      return;
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.redirect(302, signedUrl);
  } catch (error) {
    console.error('Failed to resolve storage asset URL:', error);
    res.status(500).json({ message: 'Failed to resolve storage asset URL' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, {
    username,
    createdAt: Date.now()
  });

  res.json({ token, username });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (token) {
    adminSessions.delete(token);
  }

  res.json({ success: true });
});

app.post('/api/sponsor/register', async (req, res) => {
  try {
    const { fullName, email, mobileNo, password } = req.body || {};
    const normalizedMobile = normalizeMobileNo(mobileNo);
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(fullName || '').trim();

    if (!normalizedName || !normalizedEmail || !normalizedMobile || !password) {
      res.status(400).json({ message: 'All registration fields are required' });
      return;
    }

    if (!/^\d{10}$/.test(normalizedMobile)) {
      res.status(400).json({ message: 'Mobile number must be 10 digits' });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const passwordHash = hashPassword(String(password));
    const query = `
      INSERT INTO sponsor_accounts (full_name, email, mobile_no, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, mobile_no, created_at
    `;

    const result = await pool.query(query, [normalizedName, normalizedEmail, normalizedMobile, passwordHash]);

    res.status(201).json({
      message: 'Registration successful',
      sponsor: result.rows[0]
    });
  } catch (error) {
    if (error?.code === '23505') {
      res.status(409).json({ message: 'A sponsor account with this email or mobile number already exists' });
      return;
    }

    console.error('Failed to register sponsor account:', error);
    res.status(500).json({ message: 'Failed to register sponsor account' });
  }
});

app.post('/api/sponsor/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body || {};
    const normalizedMobile = normalizeMobileNo(phoneNumber);

    if (!normalizedMobile || !password) {
      res.status(400).json({ message: 'Phone number and password are required' });
      return;
    }

    const query = `
      SELECT id, full_name, mobile_no, password_hash
      FROM sponsor_accounts
      WHERE mobile_no = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [normalizedMobile]);

    if (result.rowCount === 0 || !verifyPassword(String(password), result.rows[0].password_hash)) {
      res.status(401).json({ message: 'Invalid phone number or password' });
      return;
    }

    const sponsor = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    sponsorSessions.set(token, {
      sponsorId: sponsor.id,
      sponsorName: sponsor.full_name,
      mobileNo: sponsor.mobile_no,
      createdAt: Date.now()
    });

    res.json({
      token,
      sponsor: {
        id: sponsor.id,
        fullName: sponsor.full_name,
        mobileNo: sponsor.mobile_no
      }
    });
  } catch (error) {
    console.error('Failed to login sponsor account:', error);
    res.status(500).json({ message: 'Failed to login sponsor account' });
  }
});

app.post('/api/sponsor/logout', requireSponsor, (req, res) => {
  if (req.sponsorToken) {
    sponsorSessions.delete(req.sponsorToken);
  }

  res.json({ success: true });
});

app.get('/api/sponsor/regular-ilp-logs', requireSponsor, async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        applicant_name,
        pass_no,
        valid_from,
        valid_to,
        status,
        promotion_type,
        temporary_reference_number,
        submitted_at
      FROM regular_ilp_promotions
      WHERE sponsor_id = $1
      ORDER BY submitted_at DESC
    `;

    const result = await pool.query(query, [req.sponsorSession.sponsorId]);
    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Failed to fetch sponsor logs:', error);
    res.status(500).json({ message: 'Failed to fetch sponsor logs' });
  }
});

app.post('/api/sponsor/regular-ilp/promote', requireSponsor, async (req, res) => {
  try {
    const { promotionType, temporaryReferenceNumber, validityOption } = req.body || {};
    const normalizedType = String(promotionType || '').toLowerCase();
    const normalizedReference = String(temporaryReferenceNumber || '').trim();
    const normalizedValidity = String(validityOption || '').trim();

    if (!VALID_PROMOTION_TYPES.has(normalizedType)) {
      res.status(400).json({ message: 'Invalid promotion type' });
      return;
    }

    if (!/^\d{12}$/.test(normalizedReference)) {
      res.status(400).json({ message: 'Temporary pass number must be a 12 digit reference number' });
      return;
    }

    if (!VALID_REGULAR_VALIDITY[normalizedValidity]) {
      res.status(400).json({ message: 'Invalid validity option' });
      return;
    }

    const applicantResult = await pool.query(
      `
        SELECT id, full_name, application_status
        FROM temporary_ilp_applications
        WHERE reference_number = $1
        LIMIT 1
      `,
      [normalizedReference]
    );

    if (applicantResult.rowCount === 0) {
      res.status(404).json({ message: 'Temporary ILP application not found for the provided reference number' });
      return;
    }

    const applicant = applicantResult.rows[0];

    if (applicant.application_status !== 'accepted') {
      res.status(400).json({ message: 'Only accepted temporary ILP applicants can be promoted to regular ILP' });
      return;
    }

    if (normalizedType === 'fresh') {
      const existingFresh = await pool.query(
        `
          SELECT id
          FROM regular_ilp_promotions
          WHERE temporary_reference_number = $1
          LIMIT 1
        `,
        [normalizedReference]
      );

      if (existingFresh.rowCount > 0) {
        res.status(409).json({ message: 'This temporary pass is already promoted. Use Renewal if needed.' });
        return;
      }
    }

    const today = new Date();
    const validFrom = today.toISOString().slice(0, 10);
    const validTo = addRegularPassValidity(today, normalizedValidity).toISOString().slice(0, 10);

    const nextIdResult = await pool.query(
      "SELECT nextval(pg_get_serial_sequence('regular_ilp_promotions', 'id')) AS next_id"
    );
    const nextId = Number(nextIdResult.rows[0].next_id);
    const passNo = `R${String(new Date().getFullYear()).slice(-2)}${String(nextId).padStart(8, '0')}`;

    const insertQuery = `
      INSERT INTO regular_ilp_promotions (
        id,
        sponsor_id,
        promotion_type,
        temporary_reference_number,
        applicant_name,
        pass_no,
        valid_from,
        valid_to,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING id, applicant_name, pass_no, valid_from, valid_to, status, promotion_type, temporary_reference_number, submitted_at
    `;

    const insertResult = await pool.query(insertQuery, [
      nextId,
      req.sponsorSession.sponsorId,
      normalizedType,
      normalizedReference,
      applicant.full_name,
      passNo,
      validFrom,
      validTo
    ]);

    res.status(201).json({
      message: 'Regular ILP issued successfully',
      log: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Failed to promote temporary ILP to regular ILP:', error);
    res.status(500).json({ message: 'Failed to promote temporary ILP' });
  }
});

app.get('/api/admin/applications', requireAdmin, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase();
    const type = String(req.query.type || '').trim().toLowerCase();
    const sortBy = String(req.query.sortBy || 'submitted_at');
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (!VALID_SORT_FIELDS.has(sortBy)) {
      res.status(400).json({ message: 'Invalid sort field' });
      return;
    }

    const params = [];
    const whereClauses = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(
        full_name ILIKE $${params.length}
        OR reference_number ILIKE $${params.length}
        OR country ILIKE $${params.length}
        OR district ILIKE $${params.length}
      )`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`application_status = $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(type);
      whereClauses.push(`application_type = $${params.length}`);
    }

    const baseSelect = buildCommonApplicantSelect();
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      ${baseSelect}
      ${whereSql}
      ORDER BY ${sortBy === 'days_remaining' ? 'submitted_at' : sortBy} ${sortOrder}
    `;

    const result = await pool.query(query, params);
    const applicantsWithComputedFields = result.rows.map(normalizeApplicantRecord);
    const applicants = await Promise.all(applicantsWithComputedFields.map(attachSignedDocumentUrls));

    if (sortBy === 'days_remaining') {
      applicants.sort((a, b) => {
        return sortOrder === 'ASC'
          ? a.days_remaining - b.days_remaining
          : b.days_remaining - a.days_remaining;
      });
    }

    res.json({ applicants });
  } catch (error) {
    console.error('Failed to fetch admin applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

app.patch('/api/admin/applications/:applicationType/:id/status', requireAdmin, async (req, res) => {
  try {
    const { applicationType, id } = req.params;
    const { status } = req.body || {};

    if (!APP_TYPE_TO_TABLE[applicationType]) {
      res.status(400).json({ message: 'Invalid application type' });
      return;
    }

    if (!VALID_STATUSES.has(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const table = APP_TYPE_TO_TABLE[applicationType];
    const query = `
      UPDATE ${table}
      SET application_status = $1, status_updated_at = NOW()
      WHERE id = $2
      RETURNING id, reference_number, application_status, status_updated_at
    `;

    const result = await pool.query(query, [status, Number(id)]);

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    res.json({ application: result.rows[0] });
  } catch (error) {
    console.error('Failed to update application status:', error);
    res.status(500).json({ message: 'Failed to update application status' });
  }
});

app.delete('/api/admin/applications', requireAdmin, async (_req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deletedCounts = {
      temporary_ilp: 0,
      temporary_stay_permit: 0,
      ilp_exemption: 0
    };

    const temporaryIlpResult = await client.query('DELETE FROM temporary_ilp_applications');
    deletedCounts.temporary_ilp = temporaryIlpResult.rowCount || 0;

    const temporaryStayPermitResult = await client.query('DELETE FROM temporary_stay_permit_applications');
    deletedCounts.temporary_stay_permit = temporaryStayPermitResult.rowCount || 0;

    const ilpExemptionResult = await client.query('DELETE FROM ilp_exemption_applications');
    deletedCounts.ilp_exemption = ilpExemptionResult.rowCount || 0;

    await client.query('COMMIT');

    res.json({
      success: true,
      totalDeleted: deletedCounts.temporary_ilp + deletedCounts.temporary_stay_permit + deletedCounts.ilp_exemption,
      deletedCounts
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to clear application records:', error);
    res.status(500).json({ message: 'Failed to clear application records' });
  } finally {
    client.release();
  }
});

app.get('/api/public/application/:referenceNumber', async (req, res) => {
  try {
    const referenceNumber = String(req.params.referenceNumber || '').trim();

    if (!/^\d{12}$/.test(referenceNumber)) {
      res.status(400).json({ message: 'Reference number must be 12 digits' });
      return;
    }

    const query = `
      ${buildCommonApplicantSelect()}
      WHERE reference_number = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [referenceNumber]);

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    const application = await attachSignedDocumentUrls(normalizeApplicantRecord(result.rows[0]));
    res.json({ application });
  } catch (error) {
    console.error('Failed to lookup reference number:', error);
    res.status(500).json({ message: 'Failed to lookup application' });
  }
});

app.post('/api/forms/temporary-ilp', async (req, res) => {
  try {
    const {
      selectType,
      fullName,
      gender,
      dateOfBirth,
      identityMark,
      mobileNo,
      idDocumentType,
      idDocumentNumber,
      relationType,
      relationName,
      fullAddress,
      country,
      state,
      district,
      proposedDateOfEntry,
      purposeOfVisit,
      placeOfStay,
      sponsorFullName,
      sponsorFatherName,
      sponsorEpicNo,
      sponsorMobileNo,
      sponsorshipType,
      sponsorDistrict,
      uploadDocumentType,
      uploadDocumentFileName,
      uploadDocumentFileType,
      uploadDocumentFileSize,
      uploadDocumentStoragePath,
      uploadDocumentPublicUrl,
      remarks
    } = req.body;

    const query = `
      INSERT INTO temporary_ilp_applications (
        reference_number, application_status,
        select_type, full_name, gender, date_of_birth, identity_mark, mobile_no,
        id_document_type, id_document_number, relation_type, relation_name,
        full_address, country, state, district, proposed_date_of_entry,
        purpose_of_visit, place_of_stay, sponsor_full_name, sponsor_father_name,
        sponsor_epic_no, sponsor_mobile_no, sponsorship_type, sponsor_district,
        upload_document_type, upload_document_file_name, upload_document_file_type,
        upload_document_file_size, upload_document_storage_path, upload_document_public_url, remarks
      )
      VALUES (
        $1, $2,
        $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31, $32
      )
      RETURNING id
    `;

    const insertedIdResult = await pool.query('SELECT nextval(pg_get_serial_sequence(\'temporary_ilp_applications\', \'id\')) AS next_id');
    const nextId = insertedIdResult.rows[0].next_id;
    const referenceNumber = toReferenceNumber(nextId, '1');

    const values = [
      referenceNumber,
      'pending',
      selectType,
      fullName,
      gender,
      dateOfBirth,
      identityMark,
      mobileNo,
      idDocumentType,
      idDocumentNumber,
      relationType,
      relationName,
      fullAddress,
      country,
      state,
      district,
      proposedDateOfEntry,
      purposeOfVisit,
      placeOfStay,
      sponsorFullName,
      sponsorFatherName,
      sponsorEpicNo,
      sponsorMobileNo,
      sponsorshipType,
      sponsorDistrict,
      uploadDocumentType,
      uploadDocumentFileName || null,
      uploadDocumentFileType || null,
      uploadDocumentFileSize || null,
      uploadDocumentStoragePath || null,
      uploadDocumentPublicUrl || null,
      remarks || null
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      message: 'Temporary ILP application saved',
      id: result.rows[0].id,
      referenceNumber,
      applicationType: 'temporary_ilp'
    });
  } catch (error) {
    console.error('Failed to save temporary ILP application:', error);
    res.status(500).json({ message: 'Failed to save temporary ILP application' });
  }
});

app.post('/api/forms/temporary-stay-permit', async (req, res) => {
  try {
    const {
      selectType,
      fullName,
      gender,
      dateOfBirth,
      identityMark,
      mobileNo,
      idDocumentType,
      idDocumentNumber,
      relationType,
      relationName,
      fullAddress,
      country,
      state,
      district,
      proposedDateOfEntry,
      purposeOfVisit,
      placeOfStay,
      sponsorFullName,
      sponsorFatherName,
      sponsorEpicNo,
      sponsorMobileNo,
      sponsorshipType,
      sponsorDistrict,
      uploadDocumentType,
      uploadDocumentFileName,
      uploadDocumentFileType,
      uploadDocumentFileSize,
      uploadDocumentStoragePath,
      uploadDocumentPublicUrl,
      remarks
    } = req.body;

    const query = `
      INSERT INTO temporary_stay_permit_applications (
        reference_number, application_status,
        select_type, full_name, gender, date_of_birth, identity_mark, mobile_no,
        id_document_type, id_document_number, relation_type, relation_name,
        full_address, country, state, district, proposed_date_of_entry,
        purpose_of_visit, place_of_stay, sponsor_full_name, sponsor_father_name,
        sponsor_epic_no, sponsor_mobile_no, sponsorship_type, sponsor_district,
        upload_document_type, upload_document_file_name, upload_document_file_type,
        upload_document_file_size, upload_document_storage_path, upload_document_public_url, remarks
      )
      VALUES (
        $1, $2,
        $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31, $32
      )
      RETURNING id
    `;

    const insertedIdResult = await pool.query('SELECT nextval(pg_get_serial_sequence(\'temporary_stay_permit_applications\', \'id\')) AS next_id');
    const nextId = insertedIdResult.rows[0].next_id;
    const referenceNumber = toReferenceNumber(nextId, '2');

    const values = [
      referenceNumber,
      'pending',
      selectType,
      fullName,
      gender,
      dateOfBirth,
      identityMark,
      mobileNo,
      idDocumentType,
      idDocumentNumber,
      relationType,
      relationName,
      fullAddress,
      country,
      state,
      district,
      proposedDateOfEntry,
      purposeOfVisit,
      placeOfStay,
      sponsorFullName,
      sponsorFatherName,
      sponsorEpicNo,
      sponsorMobileNo,
      sponsorshipType,
      sponsorDistrict,
      uploadDocumentType,
      uploadDocumentFileName || null,
      uploadDocumentFileType || null,
      uploadDocumentFileSize || null,
      uploadDocumentStoragePath || null,
      uploadDocumentPublicUrl || null,
      remarks || null
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      message: 'Temporary stay permit application saved',
      id: result.rows[0].id,
      referenceNumber,
      applicationType: 'temporary_stay_permit'
    });
  } catch (error) {
    console.error('Failed to save temporary stay permit application:', error);
    res.status(500).json({ message: 'Failed to save temporary stay permit application' });
  }
});

app.post('/api/forms/ilp-exemption', async (req, res) => {
  try {
    const {
      fullName,
      gender,
      dateOfBirth,
      identityMark,
      mobileNo,
      idDocumentType,
      idDocumentNumber,
      relationType,
      relationName,
      fullAddress,
      country,
      state,
      district,
      purposeOfVisit,
      placeOfStay,
      exemptionFromDate,
      exemptionToDate,
      supportingDocumentType,
      supportingDocumentFileName,
      supportingDocumentFileType,
      supportingDocumentFileSize,
      supportingDocumentStoragePath,
      supportingDocumentPublicUrl,
      remarks
    } = req.body;

    const query = `
      INSERT INTO ilp_exemption_applications (
        reference_number, application_status,
        full_name, gender, date_of_birth, identity_mark, mobile_no,
        id_document_type, id_document_number, relation_type, relation_name,
        full_address, country, state, district, purpose_of_visit,
        place_of_stay, exemption_from_date, exemption_to_date,
        supporting_document_type, supporting_document_file_name,
        supporting_document_file_type, supporting_document_file_size,
        supporting_document_storage_path, supporting_document_public_url, remarks
      )
      VALUES (
        $1, $2,
        $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21,
        $22, $23, $24, $25, $26
      )
      RETURNING id
    `;

    const insertedIdResult = await pool.query('SELECT nextval(pg_get_serial_sequence(\'ilp_exemption_applications\', \'id\')) AS next_id');
    const nextId = insertedIdResult.rows[0].next_id;
    const referenceNumber = toReferenceNumber(nextId, '3');

    const values = [
      referenceNumber,
      'pending',
      fullName,
      gender,
      dateOfBirth,
      identityMark,
      mobileNo,
      idDocumentType,
      idDocumentNumber,
      relationType,
      relationName,
      fullAddress,
      country,
      state,
      district,
      purposeOfVisit,
      placeOfStay,
      exemptionFromDate,
      exemptionToDate,
      supportingDocumentType,
      supportingDocumentFileName || null,
      supportingDocumentFileType || null,
      supportingDocumentFileSize || null,
      supportingDocumentStoragePath || null,
      supportingDocumentPublicUrl || null,
      remarks || null
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      message: 'ILP exemption application saved',
      id: result.rows[0].id,
      referenceNumber,
      applicationType: 'ilp_exemption'
    });
  } catch (error) {
    console.error('Failed to save ILP exemption application:', error);
    res.status(500).json({ message: 'Failed to save ILP exemption application' });
  }
});

registerDestinationRoutes(app, {
  pool,
  requireAdmin,
  normalizeDestinationMediaUrl,
  cleanupMediaAssets: deleteDestinationMediaAssets
});

app.use('/api/vehicles', vehicleRoutes);

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`ILP backend listening on port ${port}`);
      if (RAZORPAY_CONFIGURED) {
        console.log(`[Razorpay] ✅ Payment gateway configured (key: ${RAZORPAY_KEY_ID})`);
      } else {
        console.warn('[Razorpay] ⚠️  Payment gateway is misconfigured. Payment endpoints will return 503.');
        for (const issue of RAZORPAY_CONFIG_ISSUES) {
          console.warn(`[Razorpay] - ${issue}`);
        }
      }
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
