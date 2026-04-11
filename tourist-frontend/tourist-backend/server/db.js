import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true
});

const { Pool } = pg;

const buildConnectionConfig = () => {
  if (process.env.SUPABASE_DB_URL) {
    return {
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  return {
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
};

export const pool = new Pool(buildConnectionConfig());

export const initializeDatabase = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS temporary_ilp_applications (
      id BIGSERIAL PRIMARY KEY,
      reference_number CHAR(12) UNIQUE,
      application_status TEXT NOT NULL DEFAULT 'pending',
      select_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      identity_mark TEXT NOT NULL,
      mobile_no TEXT NOT NULL,
      id_document_type TEXT NOT NULL,
      id_document_number TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      relation_name TEXT NOT NULL,
      full_address TEXT NOT NULL,
      country TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      proposed_date_of_entry DATE NOT NULL,
      purpose_of_visit TEXT NOT NULL,
      place_of_stay TEXT NOT NULL,
      sponsor_full_name TEXT NOT NULL,
      sponsor_father_name TEXT NOT NULL,
      sponsor_epic_no TEXT NOT NULL,
      sponsor_mobile_no TEXT NOT NULL,
      sponsorship_type TEXT NOT NULL,
      sponsor_district TEXT NOT NULL,
      upload_document_type TEXT NOT NULL,
      upload_document_file_name TEXT,
      upload_document_file_type TEXT,
      upload_document_file_size BIGINT,
      upload_document_storage_path TEXT,
      upload_document_public_url TEXT,
      remarks TEXT,
      status_updated_at TIMESTAMPTZ,
      payment_status TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE temporary_ilp_applications ADD COLUMN IF NOT EXISTS reference_number CHAR(12)");
  await pool.query("ALTER TABLE temporary_ilp_applications ADD COLUMN IF NOT EXISTS payment_status TEXT");
  await pool.query("ALTER TABLE temporary_ilp_applications ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'pending'");
  await pool.query("ALTER TABLE temporary_ilp_applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE temporary_ilp_applications ADD COLUMN IF NOT EXISTS upload_document_storage_path TEXT");
  await pool.query("ALTER TABLE temporary_ilp_applications ADD COLUMN IF NOT EXISTS upload_document_public_url TEXT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS temporary_ilp_applications_reference_number_key ON temporary_ilp_applications(reference_number)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS temporary_stay_permit_applications (
      id BIGSERIAL PRIMARY KEY,
      reference_number CHAR(12) UNIQUE,
      application_status TEXT NOT NULL DEFAULT 'pending',
      select_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      identity_mark TEXT NOT NULL,
      mobile_no TEXT NOT NULL,
      id_document_type TEXT NOT NULL,
      id_document_number TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      relation_name TEXT NOT NULL,
      full_address TEXT NOT NULL,
      country TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      proposed_date_of_entry DATE NOT NULL,
      purpose_of_visit TEXT NOT NULL,
      place_of_stay TEXT NOT NULL,
      sponsor_full_name TEXT NOT NULL,
      sponsor_father_name TEXT NOT NULL,
      sponsor_epic_no TEXT NOT NULL,
      sponsor_mobile_no TEXT NOT NULL,
      sponsorship_type TEXT NOT NULL,
      sponsor_district TEXT NOT NULL,
      upload_document_type TEXT NOT NULL,
      upload_document_file_name TEXT,
      upload_document_file_type TEXT,
      upload_document_file_size BIGINT,
      upload_document_storage_path TEXT,
      upload_document_public_url TEXT,
      remarks TEXT,
      status_updated_at TIMESTAMPTZ,
      payment_status TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE temporary_stay_permit_applications ADD COLUMN IF NOT EXISTS reference_number CHAR(12)");
  await pool.query("ALTER TABLE temporary_stay_permit_applications ADD COLUMN IF NOT EXISTS payment_status TEXT");
  await pool.query("ALTER TABLE temporary_stay_permit_applications ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'pending'");
  await pool.query("ALTER TABLE temporary_stay_permit_applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE temporary_stay_permit_applications ADD COLUMN IF NOT EXISTS upload_document_storage_path TEXT");
  await pool.query("ALTER TABLE temporary_stay_permit_applications ADD COLUMN IF NOT EXISTS upload_document_public_url TEXT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS temporary_stay_permit_applications_reference_number_key ON temporary_stay_permit_applications(reference_number)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ilp_exemption_applications (
      id BIGSERIAL PRIMARY KEY,
      reference_number CHAR(12) UNIQUE,
      application_status TEXT NOT NULL DEFAULT 'pending',
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      identity_mark TEXT NOT NULL,
      mobile_no TEXT NOT NULL,
      id_document_type TEXT NOT NULL,
      id_document_number TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      relation_name TEXT NOT NULL,
      full_address TEXT NOT NULL,
      country TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      purpose_of_visit TEXT NOT NULL,
      place_of_stay TEXT NOT NULL,
      exemption_from_date DATE NOT NULL,
      exemption_to_date DATE NOT NULL,
      supporting_document_type TEXT NOT NULL,
      supporting_document_file_name TEXT,
      supporting_document_file_type TEXT,
      supporting_document_file_size BIGINT,
      supporting_document_storage_path TEXT,
      supporting_document_public_url TEXT,
      remarks TEXT,
      status_updated_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE ilp_exemption_applications ADD COLUMN IF NOT EXISTS reference_number CHAR(12)");
  await pool.query("ALTER TABLE ilp_exemption_applications ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'pending'");
  await pool.query("ALTER TABLE ilp_exemption_applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE ilp_exemption_applications ADD COLUMN IF NOT EXISTS supporting_document_storage_path TEXT");
  await pool.query("ALTER TABLE ilp_exemption_applications ADD COLUMN IF NOT EXISTS supporting_document_public_url TEXT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS ilp_exemption_applications_reference_number_key ON ilp_exemption_applications(reference_number)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sponsor_accounts (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mobile_no TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE sponsor_accounts ADD COLUMN IF NOT EXISTS full_name TEXT");
  await pool.query("ALTER TABLE sponsor_accounts ADD COLUMN IF NOT EXISTS email TEXT");
  await pool.query("ALTER TABLE sponsor_accounts ADD COLUMN IF NOT EXISTS mobile_no TEXT");
  await pool.query("ALTER TABLE sponsor_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS sponsor_accounts_email_key ON sponsor_accounts(LOWER(email))");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS sponsor_accounts_mobile_no_key ON sponsor_accounts(mobile_no)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS regular_ilp_promotions (
      id BIGSERIAL PRIMARY KEY,
      sponsor_id BIGINT NOT NULL REFERENCES sponsor_accounts(id) ON DELETE CASCADE,
      promotion_type TEXT NOT NULL,
      temporary_reference_number CHAR(12) NOT NULL,
      applicant_name TEXT NOT NULL,
      pass_no TEXT NOT NULL UNIQUE,
      valid_from DATE NOT NULL,
      valid_to DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS sponsor_id BIGINT");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS promotion_type TEXT");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS temporary_reference_number CHAR(12)");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS applicant_name TEXT");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS pass_no TEXT");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS valid_from DATE");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS valid_to DATE");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'");
  await pool.query("ALTER TABLE regular_ilp_promotions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS regular_ilp_promotions_pass_no_key ON regular_ilp_promotions(pass_no)");
  await pool.query("CREATE INDEX IF NOT EXISTS regular_ilp_promotions_sponsor_id_idx ON regular_ilp_promotions(sponsor_id)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ilp_payments (
      id BIGSERIAL PRIMARY KEY,
      reference_number CHAR(12) NOT NULL,
      application_type TEXT NOT NULL,
      razorpay_order_id TEXT NOT NULL UNIQUE,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount_paise INTEGER NOT NULL DEFAULT 5000,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'created',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS ilp_payments_reference_number_idx ON ilp_payments(reference_number)");
  await pool.query("CREATE INDEX IF NOT EXISTS ilp_payments_order_id_idx ON ilp_payments(razorpay_order_id)");

  await pool.query(`
    UPDATE temporary_ilp_applications
    SET reference_number = LPAD(id::text, 12, '0')
    WHERE reference_number IS NULL
  `);

  await pool.query(`
    UPDATE temporary_stay_permit_applications
    SET reference_number = LPAD(id::text, 12, '0')
    WHERE reference_number IS NULL
  `);

  await pool.query(`
    UPDATE ilp_exemption_applications
    SET reference_number = LPAD(id::text, 12, '0')
    WHERE reference_number IS NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS destinations (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT,
      curated_by TEXT,
      short_description TEXT NOT NULL,
      about TEXT NOT NULL,
      keyword_tags TEXT[] NOT NULL DEFAULT '{}',
      region TEXT NOT NULL DEFAULT 'Central',
      activity_type TEXT[] NOT NULL DEFAULT '{}',
      destination_type TEXT NOT NULL DEFAULT 'cultural',
      destination_type_tags TEXT[] NOT NULL DEFAULT '{}',
      duration TEXT NOT NULL DEFAULT 'half-day',
      best_time TEXT,
      entry_price TEXT,
      difficulty TEXT NOT NULL DEFAULT 'easy',
      road_condition_status TEXT NOT NULL DEFAULT 'good',
      rating NUMERIC(3, 1) NOT NULL DEFAULT 4.5,
      travel_time TEXT NOT NULL DEFAULT '1h drive',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      geom GEOGRAPHY(Point, 4326),
      header_image_url TEXT,
      featured BOOLEAN NOT NULL DEFAULT false,
      is_published BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('ALTER TABLE destinations ADD COLUMN IF NOT EXISTS curated_by TEXT');
  await pool.query("ALTER TABLE destinations ADD COLUMN IF NOT EXISTS destination_type_tags TEXT[] NOT NULL DEFAULT '{}'");
  await pool.query(`
    UPDATE destinations
    SET destination_type_tags = ARRAY[destination_type]
    WHERE destination_type_tags IS NULL OR array_length(destination_type_tags, 1) IS NULL
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS destinations_slug_idx ON destinations(slug)');
  await pool.query('CREATE INDEX IF NOT EXISTS destinations_featured_idx ON destinations(featured)');
  await pool.query('CREATE INDEX IF NOT EXISTS destinations_published_idx ON destinations(is_published)');
  await pool.query('CREATE INDEX IF NOT EXISTS destinations_geom_idx ON destinations USING GIST(geom)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS destination_gallery_images (
      id BIGSERIAL PRIMARY KEY,
      destination_id BIGINT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS destination_gallery_destination_id_idx ON destination_gallery_images(destination_id)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS destination_folklore_stories (
      id BIGSERIAL PRIMARY KEY,
      destination_id BIGINT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS destination_folklore_destination_id_idx ON destination_folklore_stories(destination_id)');

  await pool.query(`
    CREATE OR REPLACE FUNCTION set_destination_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query('DROP TRIGGER IF EXISTS trg_destinations_updated_at ON destinations');
  await pool.query(`
    CREATE TRIGGER trg_destinations_updated_at
    BEFORE UPDATE ON destinations
    FOR EACH ROW
    EXECUTE FUNCTION set_destination_updated_at()
  `);

  await pool.query('DROP TRIGGER IF EXISTS trg_destination_folklore_updated_at ON destination_folklore_stories');
  await pool.query(`
    CREATE TRIGGER trg_destination_folklore_updated_at
    BEFORE UPDATE ON destination_folklore_stories
    FOR EACH ROW
    EXECUTE FUNCTION set_destination_updated_at()
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_destination_geom()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
      ELSE
        NEW.geom = NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query('DROP TRIGGER IF EXISTS trg_destinations_sync_geom ON destinations');
  await pool.query(`
    CREATE TRIGGER trg_destinations_sync_geom
    BEFORE INSERT OR UPDATE ON destinations
    FOR EACH ROW
    EXECUTE FUNCTION sync_destination_geom()
  `);
};
