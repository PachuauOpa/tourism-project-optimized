import { buildVariantAssetUrlsFromAssetUrl } from './imageVariants.js';

const normalizeTextArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const DESTINATION_FILTER_CONFIG_KEY = 'destination_filter_config';

const normalizeFilterOption = (option = {}, index = 0) => {
  const label = String(option.label || '').trim();
  const value = String(option.value || '').trim();

  return {
    value,
    label: label || value,
    description: String(option.description || '').trim(),
    bracketText: String(option.bracketText || '').trim() || undefined,
    sortOrder: Number.isFinite(Number(option.sortOrder)) ? Number(option.sortOrder) : index
  };
};

const normalizeFilterCategory = (category = {}, index = 0) => {
  const options = Array.isArray(category.options)
    ? category.options
      .map((option, optionIndex) => normalizeFilterOption(option, optionIndex))
      .filter((option) => Boolean(option.value))
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(({ sortOrder, ...option }) => option)
    : [];

  const normalizedCategoryKey = String(category.key || '').trim();

  return {
    key: normalizedCategoryKey,
    title: String(category.title || normalizedCategoryKey).trim(),
    appliesToCategories: normalizeTextArray(category.appliesToCategories),
    options,
    sortOrder: Number.isFinite(Number(category.sortOrder)) ? Number(category.sortOrder) : index
  };
};

const normalizeDestinationFilterConfig = (value = {}) => {
  const categories = Array.isArray(value.categories)
    ? value.categories
      .map((category, index) => normalizeFilterCategory(category, index))
      .filter((category) => Boolean(category.key) && category.options.length > 0)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(({ sortOrder, ...category }) => category)
    : [];

  return { categories };
};

const fetchDestinationFilterConfig = async (pool) => {
  const result = await pool.query(
    'SELECT setting_value FROM admin_settings WHERE setting_key = $1 LIMIT 1',
    [DESTINATION_FILTER_CONFIG_KEY]
  );

  const storedValue = result.rows[0]?.setting_value;
  return normalizeDestinationFilterConfig(storedValue || {});
};

const resolveVariantLargeUrl = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'object') {
    const largeValue = value.large;

    if (typeof largeValue === 'string') {
      return largeValue.trim();
    }

    if (largeValue && typeof largeValue === 'object') {
      return String(largeValue.publicUrl || largeValue.url || '').trim();
    }
  }

  return '';
};

const normalizeMediaList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => ({
      image_url: String(
        item?.image_url
        || item?.imageUrl
        || resolveVariantLargeUrl(item?.image_variants || item?.imageVariants)
        || ''
      ).trim(),
      caption: String(item?.caption || '').trim() || null,
      sort_order: Number.isFinite(Number(item?.sort_order ?? item?.sortOrder))
        ? Number(item?.sort_order ?? item?.sortOrder)
        : index
    }))
    .filter((item) => Boolean(item.image_url));
};

const normalizeFolkloreList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => ({
      title: String(item?.title || '').trim(),
      body: String(item?.body || '').trim(),
      image_url: String(
        item?.image_url
        || item?.imageUrl
        || resolveVariantLargeUrl(item?.image_variants || item?.imageVariants)
        || ''
      ).trim() || null,
      sort_order: Number.isFinite(Number(item?.sort_order ?? item?.sortOrder))
        ? Number(item?.sort_order ?? item?.sortOrder)
        : index
    }))
    .filter((item) => Boolean(item.title) && Boolean(item.body));
};

const normalizeDestinationPayload = (payload = {}) => {
  const title = String(payload.title || '').trim();
  const slugCandidate = String(payload.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim();
  const destinationType = String(payload.destination_type || payload.destinationType || 'cultural').trim() || 'cultural';
  const destinationTypeTags = normalizeTextArray(payload.destination_type_tags || payload.destinationTypeTags || payload.type_tags || payload.typeTags);

  return {
    slug: slugCandidate,
    title,
    subtitle: String(payload.subtitle || '').trim() || null,
    curated_by: String(payload.curated_by || payload.curatedBy || '').trim() || null,
    short_description: String(payload.short_description || payload.shortDescription || '').trim(),
    about: String(payload.about || '').trim(),
    keyword_tags: normalizeTextArray(payload.keyword_tags || payload.keywordTags),
    region: String(payload.region || 'Central').trim() || 'Central',
    activity_type: normalizeTextArray(payload.activity_type || payload.activityType),
    destination_type: destinationType,
    destination_type_tags: destinationTypeTags.length > 0 ? destinationTypeTags : [destinationType],
    destination_filter_tags: normalizeTextArray(payload.destination_filter_tags || payload.destinationFilterTags),
    duration: String(payload.duration || 'half-day').trim() || 'half-day',
    best_time: String(payload.best_time || payload.bestTime || '').trim() || null,
    entry_price: String(payload.entry_price || payload.entryPrice || '').trim() || null,
    difficulty: String(payload.difficulty || 'easy').trim() || 'easy',
    road_condition_status: String(payload.road_condition_status || payload.roadConditionStatus || 'good').trim() || 'good',
    rating: Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : 4.5,
    travel_time: String(payload.travel_time || payload.travelTime || '1h drive').trim() || '1h drive',
    latitude: payload.latitude === null || payload.latitude === '' || payload.latitude === undefined ? null : Number(payload.latitude),
    longitude: payload.longitude === null || payload.longitude === '' || payload.longitude === undefined ? null : Number(payload.longitude),
    header_image_url: String(
      payload.header_image_url
      || payload.headerImageUrl
      || resolveVariantLargeUrl(payload.header_image_variants || payload.headerImageVariants)
      || ''
    ).trim() || null,
    featured: Boolean(payload.featured),
    is_published: payload.is_published === undefined ? true : Boolean(payload.is_published),
    gallery_images: normalizeMediaList(payload.gallery_images || payload.galleryImages),
    folklore_stories: normalizeFolkloreList(payload.folklore_stories || payload.folkloreStories)
  };
};

const buildRequestOrigin = (req) => {
  if (!req) {
    return '';
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');

  if (!host) {
    return '';
  }

  return `${protocol}://${host}`;
};

const toVariantUrls = (imageUrl, req) => {
  if (!imageUrl) {
    return null;
  }

  const variants = buildVariantAssetUrlsFromAssetUrl(imageUrl, {
    defaultOrigin: buildRequestOrigin(req)
  });

  if (variants) {
    return variants;
  }

  return {
    small: imageUrl,
    medium: imageUrl,
    large: imageUrl
  };
};

const toDestinationRecord = (row, normalizeMediaUrl = null, req = null) => {
  const normalizeUrl = (value) => {
    if (!normalizeMediaUrl || !req) {
      return value;
    }

    return normalizeMediaUrl(req, value);
  };

  const galleryImages = Array.isArray(row.gallery_images)
    ? row.gallery_images.map((image) => ({
      ...image,
      image_url: normalizeUrl(image?.image_url),
      image_variants: image?.image_url ? toVariantUrls(normalizeUrl(image.image_url), req) : null
    }))
    : [];

  const folkloreStories = Array.isArray(row.folklore_stories)
    ? row.folklore_stories.map((story) => ({
      ...story,
      image_url: story?.image_url ? normalizeUrl(story.image_url) : story?.image_url || null,
      image_variants: story?.image_url ? toVariantUrls(normalizeUrl(story.image_url), req) : null
    }))
    : [];

  const normalizedHeaderImageUrl = row.header_image_url ? normalizeUrl(row.header_image_url) : row.header_image_url;

  return {
    ...row,
    header_image_url: normalizedHeaderImageUrl,
    header_image_variants: normalizedHeaderImageUrl ? toVariantUrls(normalizedHeaderImageUrl, req) : null,
    keyword_tags: row.keyword_tags || [],
    activity_type: row.activity_type || [],
    destination_type_tags: row.destination_type_tags || [],
    destination_filter_tags: row.destination_filter_tags || [],
    gallery_images: galleryImages,
    folklore_stories: folkloreStories
  };
};

const collectDestinationMediaUrls = (record) => {
  if (!record) {
    return [];
  }

  const mediaUrls = [];
  if (record.header_image_url) {
    mediaUrls.push(String(record.header_image_url).trim());
  }

  for (const image of Array.isArray(record.gallery_images) ? record.gallery_images : []) {
    if (image?.image_url) {
      mediaUrls.push(String(image.image_url).trim());
    }
  }

  for (const story of Array.isArray(record.folklore_stories) ? record.folklore_stories : []) {
    if (story?.image_url) {
      mediaUrls.push(String(story.image_url).trim());
    }
  }

  return mediaUrls.filter(Boolean);
};

const collectRemovedMediaUrls = (existingRecord, payload) => {
  const removedUrls = [];

  const previousHeader = String(existingRecord?.header_image_url || '').trim();
  const nextHeader = String(payload?.header_image_url || '').trim();

  if (previousHeader && previousHeader !== nextHeader) {
    removedUrls.push(previousHeader);
  }

  const nextGalleryUrls = new Set(
    (Array.isArray(payload?.gallery_images) ? payload.gallery_images : [])
      .map((item) => String(item?.image_url || '').trim())
      .filter(Boolean)
  );

  for (const image of Array.isArray(existingRecord?.gallery_images) ? existingRecord.gallery_images : []) {
    const previousUrl = String(image?.image_url || '').trim();
    if (previousUrl && !nextGalleryUrls.has(previousUrl)) {
      removedUrls.push(previousUrl);
    }
  }

  const nextFolkloreUrls = new Set(
    (Array.isArray(payload?.folklore_stories) ? payload.folklore_stories : [])
      .map((item) => String(item?.image_url || '').trim())
      .filter(Boolean)
  );

  for (const story of Array.isArray(existingRecord?.folklore_stories) ? existingRecord.folklore_stories : []) {
    const previousUrl = String(story?.image_url || '').trim();
    if (previousUrl && !nextFolkloreUrls.has(previousUrl)) {
      removedUrls.push(previousUrl);
    }
  }

  return removedUrls;
};

const buildDestinationSelect = ({ includeDistance = false }) => {
  const distanceSelect = includeDistance
    ? "ROUND((ST_Distance(d.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000)::numeric, 2) AS distance_km"
    : 'NULL::NUMERIC AS distance_km';

  return `
    SELECT
      d.*,
      ${distanceSelect},
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', g.id,
          'image_url', g.image_url,
          'caption', g.caption,
          'sort_order', g.sort_order
        ) ORDER BY g.sort_order ASC, g.id ASC)
        FROM destination_gallery_images g
        WHERE g.destination_id = d.id
      ), '[]'::json) AS gallery_images,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', s.id,
          'title', s.title,
          'body', s.body,
          'image_url', s.image_url,
          'sort_order', s.sort_order
        ) ORDER BY s.sort_order ASC, s.id ASC)
        FROM destination_folklore_stories s
        WHERE s.destination_id = d.id
      ), '[]'::json) AS folklore_stories
    FROM destinations d
  `;
};

const upsertDestinationChildren = async (client, destinationId, galleryImages, folkloreStories) => {
  await client.query('DELETE FROM destination_gallery_images WHERE destination_id = $1', [destinationId]);
  await client.query('DELETE FROM destination_folklore_stories WHERE destination_id = $1', [destinationId]);

  for (const image of galleryImages) {
    await client.query(
      `
        INSERT INTO destination_gallery_images (destination_id, image_url, caption, sort_order)
        VALUES ($1, $2, $3, $4)
      `,
      [destinationId, image.image_url, image.caption, image.sort_order]
    );
  }

  for (const story of folkloreStories) {
    await client.query(
      `
        INSERT INTO destination_folklore_stories (destination_id, title, body, image_url, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [destinationId, story.title, story.body, story.image_url, story.sort_order]
    );
  }
};

const fetchDestinationById = async (pool, destinationId, includeUnpublished = false, options = {}) => {
  const { normalizeMediaUrl, req } = options;
  const result = await pool.query(
    `
      ${buildDestinationSelect({ includeDistance: false })}
      WHERE d.id = $1
      ${includeUnpublished ? '' : 'AND d.is_published = TRUE'}
      LIMIT 1
    `,
    [destinationId]
  );

  return result.rows[0] ? toDestinationRecord(result.rows[0], normalizeMediaUrl, req) : null;
};

export const registerDestinationRoutes = (
  app,
  {
    pool,
    requireAdmin,
    normalizeDestinationMediaUrl = null,
    cleanupMediaAssets = async () => {}
  }
) => {
  app.get('/api/destinations', async (req, res) => {
    try {
      const includeUnpublished = req.query.includeUnpublished === 'true';
      const featuredOnly = req.query.featured === 'true';
      const limit = Number(req.query.limit || 0);
      const latitude = Number(req.query.lat);
      const longitude = Number(req.query.lng);
      const includeDistance = Number.isFinite(latitude) && Number.isFinite(longitude);
      const params = includeDistance ? [latitude, longitude] : [];

      const conditions = [];
      if (!includeUnpublished) {
        conditions.push('d.is_published = TRUE');
      }

      if (featuredOnly) {
        conditions.push('d.featured = TRUE');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limitClause = Number.isFinite(limit) && limit > 0 ? `LIMIT ${Math.min(limit, 100)}` : '';

      const result = await pool.query(
        `
          ${buildDestinationSelect({ includeDistance })}
          ${whereClause}
          ORDER BY d.featured DESC, d.updated_at DESC, d.id DESC
          ${limitClause}
        `,
        params
      );

      res.json(result.rows.map((row) => toDestinationRecord(row, normalizeDestinationMediaUrl, req)));
    } catch (error) {
      console.error('Failed to list destinations:', error);
      res.status(500).json({ message: 'Failed to list destinations' });
    }
  });

  app.get('/api/destinations/:slug', async (req, res) => {
    try {
      const latitude = Number(req.query.lat);
      const longitude = Number(req.query.lng);
      const includeDistance = Number.isFinite(latitude) && Number.isFinite(longitude);
      const params = includeDistance ? [latitude, longitude, req.params.slug] : [req.params.slug];
      const slugParamIndex = includeDistance ? 3 : 1;

      const result = await pool.query(
        `
          ${buildDestinationSelect({ includeDistance })}
          WHERE d.slug = $${slugParamIndex} AND d.is_published = TRUE
          LIMIT 1
        `,
        params
      );

      if (!result.rows[0]) {
        res.status(404).json({ message: 'Destination not found' });
        return;
      }

      res.json(toDestinationRecord(result.rows[0], normalizeDestinationMediaUrl, req));
    } catch (error) {
      console.error('Failed to fetch destination:', error);
      res.status(500).json({ message: 'Failed to fetch destination' });
    }
  });

  app.get('/api/admin/destinations', requireAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        ${buildDestinationSelect({ includeDistance: false })}
        ORDER BY d.updated_at DESC, d.id DESC
      `);

      res.json(result.rows.map((row) => toDestinationRecord(row, normalizeDestinationMediaUrl, req)));
    } catch (error) {
      console.error('Failed to fetch admin destinations:', error);
      res.status(500).json({ message: 'Failed to fetch admin destinations' });
    }
  });

  app.get('/api/destination-filters', async (_req, res) => {
    try {
      const config = await fetchDestinationFilterConfig(pool);
      res.json(config);
    } catch (error) {
      console.error('Failed to fetch destination filter config:', error);
      res.status(500).json({ message: 'Failed to fetch destination filter config' });
    }
  });

  app.get('/api/admin/destination-filters', requireAdmin, async (_req, res) => {
    try {
      const config = await fetchDestinationFilterConfig(pool);
      res.json(config);
    } catch (error) {
      console.error('Failed to fetch admin destination filter config:', error);
      res.status(500).json({ message: 'Failed to fetch admin destination filter config' });
    }
  });

  app.put('/api/admin/destination-filters', requireAdmin, async (req, res) => {
    try {
      const normalizedConfig = normalizeDestinationFilterConfig(req.body || {});
      if (!Array.isArray(normalizedConfig.categories)) {
        res.status(400).json({ message: 'Invalid filter config payload' });
        return;
      }

      await pool.query(
        `
          INSERT INTO admin_settings (setting_key, setting_value)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (setting_key)
          DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
        `,
        [DESTINATION_FILTER_CONFIG_KEY, JSON.stringify(normalizedConfig)]
      );

      res.json(normalizedConfig);
    } catch (error) {
      console.error('Failed to update destination filter config:', error);
      res.status(500).json({ message: 'Failed to update destination filter config' });
    }
  });

  app.post('/api/admin/destinations', requireAdmin, async (req, res) => {
    const payload = normalizeDestinationPayload(req.body);

    if (!payload.slug || !payload.title || !payload.short_description || !payload.about) {
      res.status(400).json({ message: 'slug, title, short_description, and about are required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertResult = await client.query(
        `
          INSERT INTO destinations (
            slug, title, subtitle, curated_by, short_description, about, keyword_tags,
            region, activity_type, destination_type, destination_type_tags, destination_filter_tags,
            duration, best_time, entry_price,
            difficulty, road_condition_status, rating, travel_time,
            latitude, longitude, header_image_url, featured, is_published
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22, $23, $24
          )
          RETURNING id
        `,
        [
          payload.slug,
          payload.title,
          payload.subtitle,
          payload.curated_by,
          payload.short_description,
          payload.about,
          payload.keyword_tags,
          payload.region,
          payload.activity_type,
          payload.destination_type,
          payload.destination_type_tags,
          payload.destination_filter_tags,
          payload.duration,
          payload.best_time,
          payload.entry_price,
          payload.difficulty,
          payload.road_condition_status,
          payload.rating,
          payload.travel_time,
          payload.latitude,
          payload.longitude,
          payload.header_image_url,
          payload.featured,
          payload.is_published
        ]
      );

      const destinationId = insertResult.rows[0].id;
      await upsertDestinationChildren(client, destinationId, payload.gallery_images, payload.folklore_stories);
      await client.query('COMMIT');

      const destination = await fetchDestinationById(pool, destinationId, true, {
        normalizeMediaUrl: normalizeDestinationMediaUrl,
        req
      });
      res.status(201).json(destination);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to create destination:', error);
      res.status(500).json({ message: 'Failed to create destination' });
    } finally {
      client.release();
    }
  });

  app.put('/api/admin/destinations/:id', requireAdmin, async (req, res) => {
    const destinationId = Number(req.params.id);
    if (!Number.isFinite(destinationId)) {
      res.status(400).json({ message: 'Invalid destination id' });
      return;
    }

    const payload = normalizeDestinationPayload(req.body);
    if (!payload.slug || !payload.title || !payload.short_description || !payload.about) {
      res.status(400).json({ message: 'slug, title, short_description, and about are required' });
      return;
    }

    const existingDestination = await fetchDestinationById(pool, destinationId, true, {});
    if (!existingDestination) {
      res.status(404).json({ message: 'Destination not found' });
      return;
    }

    const removedMediaUrls = collectRemovedMediaUrls(existingDestination, payload);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updateResult = await client.query(
        `
          UPDATE destinations
          SET
            slug = $2,
            title = $3,
            subtitle = $4,
            curated_by = $5,
            short_description = $6,
            about = $7,
            keyword_tags = $8,
            region = $9,
            activity_type = $10,
            destination_type = $11,
            destination_type_tags = $12,
            destination_filter_tags = $13,
            duration = $14,
            best_time = $15,
            entry_price = $16,
            difficulty = $17,
            road_condition_status = $18,
            rating = $19,
            travel_time = $20,
            latitude = $21,
            longitude = $22,
            header_image_url = $23,
            featured = $24,
            is_published = $25
          WHERE id = $1
          RETURNING id
        `,
        [
          destinationId,
          payload.slug,
          payload.title,
          payload.subtitle,
          payload.curated_by,
          payload.short_description,
          payload.about,
          payload.keyword_tags,
          payload.region,
          payload.activity_type,
          payload.destination_type,
          payload.destination_type_tags,
          payload.destination_filter_tags,
          payload.duration,
          payload.best_time,
          payload.entry_price,
          payload.difficulty,
          payload.road_condition_status,
          payload.rating,
          payload.travel_time,
          payload.latitude,
          payload.longitude,
          payload.header_image_url,
          payload.featured,
          payload.is_published
        ]
      );

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ message: 'Destination not found' });
        return;
      }

      await upsertDestinationChildren(client, destinationId, payload.gallery_images, payload.folklore_stories);
      await client.query('COMMIT');

      const destination = await fetchDestinationById(pool, destinationId, true, {
        normalizeMediaUrl: normalizeDestinationMediaUrl,
        req
      });

      if (removedMediaUrls.length > 0) {
        try {
          await cleanupMediaAssets(removedMediaUrls);
        } catch (cleanupError) {
          console.error('Destination media cleanup failed after update:', cleanupError);
        }
      }

      res.json(destination);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to update destination:', error);
      res.status(500).json({ message: 'Failed to update destination' });
    } finally {
      client.release();
    }
  });

  app.delete('/api/admin/destinations/:id', requireAdmin, async (req, res) => {
    try {
      const destinationId = Number(req.params.id);
      if (!Number.isFinite(destinationId)) {
        res.status(400).json({ message: 'Invalid destination id' });
        return;
      }

      const existingDestination = await fetchDestinationById(pool, destinationId, true, {});
      if (!existingDestination) {
        res.status(404).json({ message: 'Destination not found' });
        return;
      }

      const mediaUrls = collectDestinationMediaUrls(existingDestination);
      if (mediaUrls.length > 0) {
        await cleanupMediaAssets(mediaUrls);
      }

      const result = await pool.query('DELETE FROM destinations WHERE id = $1', [destinationId]);
      if (result.rowCount === 0) {
        res.status(404).json({ message: 'Destination not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete destination:', error);
      res.status(500).json({ message: 'Failed to delete destination' });
    }
  });
};
