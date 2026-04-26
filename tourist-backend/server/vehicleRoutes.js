import express from 'express';
import { pool } from './db.js';

const router = express.Router();

// Get approved vehicles (public)
router.get('/', async (req, res) => {
  try {
    const { category, type, lat, lng, limit = 50 } = req.query;
    const params = [];
    const filters = [`v.status = 'approved'`];
    
    if (category) {
      params.push(category);
      filters.push(`v.vehicle_category = $${params.length}`);
    }
    
    if (type) {
      params.push(type);
      filters.push(`v.vehicle_type = $${params.length}`);
    }

    const parsedLat = Number.parseFloat(lat);
    const parsedLng = Number.parseFloat(lng);
    const hasLocation = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

    let distanceSelect = '';
    let orderByClause = 'ORDER BY v.created_at DESC';

    if (hasLocation) {
      params.push(parsedLng, parsedLat);
      const lngParamIdx = params.length - 1;
      const latParamIdx = params.length;

      distanceSelect = `,
        ST_Distance(v.geom, ST_SetSRID(ST_MakePoint($${lngParamIdx}, $${latParamIdx}), 4326)::geography) / 1000 AS distance_km`;
      orderByClause = 'ORDER BY distance_km ASC NULLS LAST';
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const normalizedLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;

    params.push(normalizedLimit);

    const query = `
      SELECT v.*, 
        t.permit_type, t.driver_name,
        r.organization_name, r.service_type, r.operating_areas
        ${distanceSelect}
      FROM passenger_vehicles v
      LEFT JOIN taxi_details t ON v.id = t.vehicle_id
      LEFT JOIN rental_details r ON v.id = r.vehicle_id
      WHERE ${filters.join(' AND ')}
      ${orderByClause}
      LIMIT $${params.length}
    `;
    
    const { rows } = await pool.query(query, params);
    
    res.json({
      success: true,
      vehicles: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to retrieve vehicles' });
  }
});

// Admin: Get all vehicles (requires admin token conceptually handled in index.js or via middleware here)
router.get('/admin', async (req, res) => {
  try {
    const { status, category, search,  page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      FROM passenger_vehicles v
      LEFT JOIN taxi_details t ON v.id = t.vehicle_id
      LEFT JOIN rental_details r ON v.id = r.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    
    if (status && status !== 'all') {
      params.push(status);
      baseQuery += ` AND v.status = $${params.length}`;
    }
    
    if (category && category !== 'all') {
      params.push(category);
      baseQuery += ` AND v.vehicle_category = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      baseQuery += ` AND (v.registration_number ILIKE $${params.length} OR v.owner_name ILIKE $${params.length} OR r.organization_name ILIKE $${params.length})`;
    }
    
    const countQuery = `SELECT COUNT(*)::int AS total ${baseQuery}`;
    
    params.push(limit, offset);
    const dataQuery = `
      SELECT v.*, 
        t.permit_type, t.permit_number, t.taxi_license_number, t.driver_name, t.driver_license, t.badge_number,
        r.organization_name, r.business_type, r.contact_person, r.service_type, r.operating_areas
      ${baseQuery}
      ORDER BY v.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    const countResult = await pool.query(countQuery, params.slice(0, params.length - 2));
    const total = countResult.rows[0].total;
    
    const dataResult = await pool.query(dataQuery, params);
    
    res.json({
      success: true,
      vehicles: dataResult.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching admin vehicles:', error);
    res.status(500).json({ error: 'Failed to retrieve vehicles' });
  }
});

// Admin: Update vehicle status
router.put('/admin/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const { rowCount } = await pool.query(
      `UPDATE passenger_vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, id]
    );
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Register a new vehicle
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const data = req.body;
    
    await client.query('BEGIN');
    
    // 1. Insert base vehicle
    const vehicleRes = await client.query(
      `INSERT INTO passenger_vehicles(
        registration_number, vehicle_category, vehicle_type, manufacturer_model, 
        fuel_type, seating_capacity, year_of_manufacture, owner_name, 
        owner_contact, owner_address, latitude, longitude, cover_image, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
      RETURNING id`,
      [
        data.registration_number, data.vehicle_category, data.vehicle_type, data.manufacturer_model,
        data.fuel_type, data.seating_capacity, data.year_of_manufacture, data.owner_name,
        data.owner_contact, data.owner_address, data.latitude, data.longitude, data.cover_image
      ]
    );
    
    const vehicleId = vehicleRes.rows[0].id;
    
    // 2. Insert category-specific details
    if (data.vehicle_category === 'taxi') {
      await client.query(
        `INSERT INTO taxi_details(
          vehicle_id, permit_type, permit_number, taxi_license_number, 
          driver_name, driver_license, badge_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          vehicleId, data.permit_type, data.permit_number, data.taxi_license_number,
          data.driver_name, data.driver_license, data.badge_number
        ]
      );
    } else if (data.vehicle_category === 'rental') {
      await client.query(
        `INSERT INTO rental_details(
          vehicle_id, organization_name, business_type, contact_person, 
          service_type, operating_areas
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          vehicleId, data.organization_name, data.business_type, data.contact_person,
          data.service_type, data.operating_areas
        ]
      );
    }
    // 'private' doesn't need extra tables according to spec
    
    await client.query('COMMIT');
    
    res.status(201).json({ 
      success: true, 
      message: 'Vehicle registered successfully. Pending admin approval.',
      vehicleId 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registering vehicle:', error);
    
    // Handle unique constraint violation (duplicate registration number)
    if (error.constraint === 'passenger_vehicles_registration_number_key') {
      return res.status(409).json({ error: 'This registration number is already registered.' });
    }
    
    res.status(500).json({ error: 'Failed to register vehicle' });
  } finally {
    client.release();
  }
});

export default router;
