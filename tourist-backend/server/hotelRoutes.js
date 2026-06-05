import express from 'express';
import crypto from 'crypto';
import { pool } from './db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory session store (same pattern as sponsorSessions in index.js)
// Exported so index.js can pass it in via dependency injection or just share.
// ---------------------------------------------------------------------------
export const hotelSessions = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const hashPassword = (plain) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (plain, stored) => {
  if (!stored || !stored.includes(':')) return false;
  const [salt, storedHash] = stored.split(':');
  try {
    const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
};

const requireHotelOwner = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !hotelSessions.has(token)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  req.hotelOwner = hotelSessions.get(token);
  req.hotelToken = token;
  next();
};

// ---------------------------------------------------------------------------
// POST /api/hotels/register
// Creates owner account + blank hotel listing
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { full_name, email, phone, password, property_name, property_type, district, full_address, description, amenities, price_per_night } = req.body || {};

  if (!full_name || !email || !phone || !password || !property_name) {
    return res.status(400).json({ message: 'full_name, email, phone, password, and property_name are required' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Check duplicate email
    const existing = await client.query(
      'SELECT id FROM hotel_owner_accounts WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const password_hash = hashPassword(password);
    const ownerRes = await client.query(
      `INSERT INTO hotel_owner_accounts (full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, phone`,
      [full_name.trim(), email.trim().toLowerCase(), phone.trim(), password_hash]
    );
    const owner = ownerRes.rows[0];

    // Create the initial listing for this owner
    const listingRes = await client.query(
      `INSERT INTO hotel_listings
         (owner_id, property_name, property_type, district, full_address, description, amenities, price_per_night)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        owner.id,
        property_name.trim(),
        (property_type || 'hotel').trim(),
        (district || '').trim(),
        (full_address || '').trim(),
        (description || '').trim(),
        amenities && Array.isArray(amenities) ? amenities : [],
        price_per_night ? parseInt(price_per_night) : null
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      owner: { id: owner.id, full_name: owner.full_name, email: owner.email },
      listing_id: listingRes.rows[0].id
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore rollback errors */ }
    }
    console.error('Hotel register error:', err.message);
    res.status(500).json({ message: err.message?.includes('does not exist') ? 'Database tables not initialized — please restart the backend server' : 'Registration failed' });
  } finally {
    if (client) client.release();
  }
});

// ---------------------------------------------------------------------------
// POST /api/hotels/login
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, password_hash FROM hotel_owner_accounts WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const owner = result.rows[0];
    if (!verifyPassword(password, owner.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Fetch the listing id for this owner
    const listingResult = await pool.query(
      'SELECT id FROM hotel_listings WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1',
      [owner.id]
    );
    const listing_id = listingResult.rowCount > 0 ? listingResult.rows[0].id : null;

    const token = crypto.randomBytes(32).toString('hex');
    hotelSessions.set(token, { owner_id: owner.id, email: owner.email, full_name: owner.full_name, listing_id });

    res.json({
      success: true,
      token,
      owner: { id: owner.id, full_name: owner.full_name, email: owner.email, phone: owner.phone },
      listing_id
    });
  } catch (err) {
    console.error('Hotel login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hotels/logout
// ---------------------------------------------------------------------------
router.post('/logout', requireHotelOwner, (req, res) => {
  hotelSessions.delete(req.hotelToken);
  res.json({ success: true, message: 'Logged out' });
});

// ---------------------------------------------------------------------------
// GET /api/hotels/me  — current owner profile + listing
// ---------------------------------------------------------------------------
router.get('/me', requireHotelOwner, async (req, res) => {
  try {
    const ownerRes = await pool.query(
      'SELECT id, full_name, email, phone, created_at FROM hotel_owner_accounts WHERE id = $1',
      [req.hotelOwner.owner_id]
    );
    const listingRes = await pool.query(
      'SELECT * FROM hotel_listings WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1',
      [req.hotelOwner.owner_id]
    );

    res.json({
      success: true,
      owner: ownerRes.rows[0] || null,
      listing: listingRes.rows[0] || null
    });
  } catch (err) {
    console.error('Hotel /me error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/hotels  — public listing browser
// Query: search, type, amenity, page, limit
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { search, type, amenity, page = 1, limit = 20 } = req.query;
    const params = [];
    const filters = ['h.is_published = true'];

    if (search) {
      params.push(`%${String(search).trim()}%`);
      filters.push(`(h.property_name ILIKE $${params.length} OR h.district ILIKE $${params.length} OR h.tagline ILIKE $${params.length})`);
    }

    if (type && type !== 'all') {
      params.push(String(type).trim());
      filters.push(`h.property_type = $${params.length}`);
    }

    if (amenity) {
      params.push(String(amenity).trim());
      filters.push(`$${params.length} = ANY(h.amenities)`);
    }

    const whereClause = `WHERE ${filters.join(' AND ')}`;

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM hotel_listings h ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    const dataResult = await pool.query(
      `SELECT
         h.id, h.property_name, h.property_type, h.tagline, h.description,
         h.district, h.full_address, h.price_per_night, h.amenities,
         h.cover_photo_url, h.photos, h.rating, h.review_count,
         h.contact_phone, h.contact_email, h.website_url,
         h.latitude, h.longitude, h.created_at,
         o.full_name AS owner_name
       FROM hotel_listings h
       JOIN hotel_owner_accounts o ON h.owner_id = o.id
       ${whereClause}
       ORDER BY h.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      hotels: dataResult.rows,
      total,
      page: parsedPage,
      totalPages: Math.ceil(total / parsedLimit)
    });
  } catch (err) {
    console.error('Hotel list error:', err);
    res.status(500).json({ message: 'Failed to fetch hotels' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/hotels/:id  — public property detail
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
         h.id, h.property_name, h.property_type, h.tagline, h.description,
         h.district, h.full_address, h.price_per_night, h.amenities,
         h.cover_photo_url, h.photos, h.rating, h.review_count,
         h.contact_phone, h.contact_email, h.website_url,
         h.latitude, h.longitude, h.created_at, h.updated_at,
         o.full_name AS owner_name
       FROM hotel_listings h
       JOIN hotel_owner_accounts o ON h.owner_id = o.id
       WHERE h.id = $1 AND h.is_published = true
       LIMIT 1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ success: true, hotel: result.rows[0] });
  } catch (err) {
    console.error('Hotel detail error:', err);
    res.status(500).json({ message: 'Failed to fetch property' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/hotels/:id  — owner update property info
// ---------------------------------------------------------------------------
router.put('/:id', requireHotelOwner, async (req, res) => {
  const { id } = req.params;
  const {
    property_name, property_type, tagline, description,
    district, full_address, latitude, longitude,
    price_per_night, contact_phone, contact_email, website_url,
    amenities, is_published
  } = req.body || {};

  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT owner_id FROM hotel_listings WHERE id = $1',
      [id]
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }
    if (check.rows[0].owner_id !== req.hotelOwner.owner_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const fields = [];
    const params = [];

    const addField = (col, val) => {
      if (val !== undefined && val !== null) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    };

    addField('property_name', property_name?.trim());
    addField('property_type', property_type?.trim());
    addField('tagline', tagline?.trim());
    addField('description', description?.trim());
    addField('district', district?.trim());
    addField('full_address', full_address?.trim());
    addField('latitude', latitude !== undefined ? parseFloat(latitude) || null : undefined);
    addField('longitude', longitude !== undefined ? parseFloat(longitude) || null : undefined);
    addField('price_per_night', price_per_night !== undefined ? parseInt(price_per_night) || null : undefined);
    addField('contact_phone', contact_phone?.trim());
    addField('contact_email', contact_email?.trim());
    addField('website_url', website_url?.trim());
    if (Array.isArray(amenities)) { params.push(amenities); fields.push(`amenities = $${params.length}`); }
    if (is_published !== undefined) { params.push(Boolean(is_published)); fields.push(`is_published = $${params.length}`); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(parseInt(id));
    const result = await pool.query(
      `UPDATE hotel_listings SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    console.error('Hotel update error:', err);
    res.status(500).json({ message: 'Failed to update property' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hotels/:id/photos  — add a photo (base64 image)
// Body: { base64, mimeType, caption }
// ---------------------------------------------------------------------------
router.post('/:id/photos', requireHotelOwner, async (req, res) => {
  const { id } = req.params;
  const { base64, mimeType = 'image/jpeg', caption = '' } = req.body || {};

  if (!base64) {
    return res.status(400).json({ message: 'base64 image data is required' });
  }

  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT owner_id, photos, cover_photo_url FROM hotel_listings WHERE id = $1',
      [id]
    );
    if (check.rowCount === 0) return res.status(404).json({ message: 'Property not found' });
    if (check.rows[0].owner_id !== req.hotelOwner.owner_id) return res.status(403).json({ message: 'Forbidden' });

    // Try to upload to Supabase Storage if configured
    let photoUrl = null;
    let storagePath = null;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const bucket = process.env.SUPABASE_BUCKET || 'mizTour';

      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

        const ext = mimeType.includes('png') ? 'png' : 'jpg';
        storagePath = `hotels/${id}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const buffer = Buffer.from(base64, 'base64');

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

        if (!uploadError) {
          const { data: urlData } = await supabase.storage
            .from(bucket)
            .getPublicUrl(storagePath);
          photoUrl = urlData?.publicUrl || null;
        } else {
          console.warn('Supabase upload error:', uploadError.message);
        }
      }
    } catch (storageErr) {
      console.warn('Storage upload skipped:', storageErr.message);
    }

    // Fallback: store as data URI if no storage configured
    if (!photoUrl) {
      photoUrl = `data:${mimeType};base64,${base64}`;
    }

    const photoId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const newPhoto = { id: photoId, url: photoUrl, storagePath, caption };

    const existing = check.rows[0].photos || [];
    const updatedPhotos = [...(Array.isArray(existing) ? existing : []), newPhoto];

    // First photo becomes cover if none set
    const coverUpdate = check.rows[0].cover_photo_url ? '' : `, cover_photo_url = $3`;
    const updateParams = [JSON.stringify(updatedPhotos), parseInt(id)];
    if (!check.rows[0].cover_photo_url) updateParams.push(photoUrl);

    await pool.query(
      `UPDATE hotel_listings SET photos = $1${coverUpdate} WHERE id = $2`,
      check.rows[0].cover_photo_url
        ? [JSON.stringify(updatedPhotos), parseInt(id)]
        : [JSON.stringify(updatedPhotos), parseInt(id), photoUrl]
          .filter((_, i) => !(!check.rows[0].cover_photo_url) || i < 3)
    );

    // Re-run clean update to avoid param indexing confusion
    if (!check.rows[0].cover_photo_url) {
      await pool.query(
        'UPDATE hotel_listings SET photos = $1, cover_photo_url = $2 WHERE id = $3',
        [JSON.stringify(updatedPhotos), photoUrl, parseInt(id)]
      );
    } else {
      await pool.query(
        'UPDATE hotel_listings SET photos = $1 WHERE id = $2',
        [JSON.stringify(updatedPhotos), parseInt(id)]
      );
    }

    res.status(201).json({ success: true, photo: newPhoto });
  } catch (err) {
    console.error('Hotel photo upload error:', err);
    res.status(500).json({ message: 'Failed to upload photo' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/hotels/:id/photos/:photoId
// ---------------------------------------------------------------------------
router.delete('/:id/photos/:photoId', requireHotelOwner, async (req, res) => {
  const { id, photoId } = req.params;

  try {
    const check = await pool.query(
      'SELECT owner_id, photos, cover_photo_url FROM hotel_listings WHERE id = $1',
      [id]
    );
    if (check.rowCount === 0) return res.status(404).json({ message: 'Property not found' });
    if (check.rows[0].owner_id !== req.hotelOwner.owner_id) return res.status(403).json({ message: 'Forbidden' });

    const photos = Array.isArray(check.rows[0].photos) ? check.rows[0].photos : [];
    const toDelete = photos.find(p => p.id === photoId);
    const updatedPhotos = photos.filter(p => p.id !== photoId);

    // Try to delete from Supabase Storage
    if (toDelete?.storagePath) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        await supabase.storage.from(process.env.SUPABASE_BUCKET || 'mizTour').remove([toDelete.storagePath]);
      } catch (e) {
        console.warn('Storage delete skipped:', e.message);
      }
    }

    // Reset cover photo if it was the deleted one
    let newCover = check.rows[0].cover_photo_url;
    if (toDelete && toDelete.url === newCover) {
      newCover = updatedPhotos.length > 0 ? updatedPhotos[0].url : null;
    }

    await pool.query(
      'UPDATE hotel_listings SET photos = $1, cover_photo_url = $2 WHERE id = $3',
      [JSON.stringify(updatedPhotos), newCover, parseInt(id)]
    );

    res.json({ success: true, photos: updatedPhotos });
  } catch (err) {
    console.error('Hotel photo delete error:', err);
    res.status(500).json({ message: 'Failed to delete photo' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/hotels/:id/cover  — set a specific photo as cover
// Body: { photoId }
// ---------------------------------------------------------------------------
router.put('/:id/cover', requireHotelOwner, async (req, res) => {
  const { id } = req.params;
  const { photoId } = req.body || {};

  try {
    const check = await pool.query(
      'SELECT owner_id, photos FROM hotel_listings WHERE id = $1',
      [id]
    );
    if (check.rowCount === 0) return res.status(404).json({ message: 'Property not found' });
    if (check.rows[0].owner_id !== req.hotelOwner.owner_id) return res.status(403).json({ message: 'Forbidden' });

    const photos = Array.isArray(check.rows[0].photos) ? check.rows[0].photos : [];
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    await pool.query(
      'UPDATE hotel_listings SET cover_photo_url = $1 WHERE id = $2',
      [photo.url, parseInt(id)]
    );

    res.json({ success: true, cover_photo_url: photo.url });
  } catch (err) {
    console.error('Hotel cover error:', err);
    res.status(500).json({ message: 'Failed to update cover photo' });
  }
});

export default router;
