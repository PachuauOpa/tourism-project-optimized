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

const DEFAULT_DESTINATION_FILTER_CONFIG = {
  categories: [
    {
      key: 'natureExperienceType',
      title: 'Experience Type',
      appliesToCategories: ['nature'],
      options: [
        { value: 'hiking', label: 'Hiking', description: 'Trail-based exploration' },
        { value: 'photography', label: 'Photography', description: 'Scenic photo spots' },
        { value: 'sightseeing', label: 'Sightseeing', description: 'General scenic visits' },
        { value: 'wildlife-watching', label: 'Wildlife Watching', description: 'Fauna and habitat experiences' },
        { value: 'adventure-sports', label: 'Adventure Sports', description: 'High-energy outdoor activities' },
        { value: 'nature-walks', label: 'Nature Walks', description: 'Gentle guided or self walks' }
      ]
    },
    {
      key: 'trailDifficulty',
      title: 'Trail Difficulty',
      appliesToCategories: ['nature'],
      options: [
        { value: 'beginner', label: 'Beginner', description: 'Suitable for first-timers' },
        { value: 'moderate', label: 'Moderate', description: 'Some fitness required' },
        { value: 'experienced', label: 'Experienced', description: 'Experienced trekkers preferred' }
      ]
    },
    {
      key: 'timeNeededNature',
      title: 'Time Needed',
      appliesToCategories: ['nature'],
      options: [
        { value: 'quick-stop', label: 'Quick Stop', bracketText: '1-2 hours', description: 'Short scenic stop' },
        { value: 'half-day', label: 'Half Day', bracketText: '2-4 hours', description: 'Half-day exploration' },
        { value: 'full-day', label: 'Full Day', bracketText: '4-8 hours', description: 'Day-long activity' },
        { value: 'overnight-required', label: 'Overnight Stay Required', description: 'Requires overnight planning' }
      ]
    },
    {
      key: 'natureAccessibility',
      title: 'Accessibility',
      appliesToCategories: ['nature'],
      options: [
        { value: 'easy-road-access', label: 'Easy Access by Road', description: 'Direct road approach' },
        { value: 'short-walk-required', label: 'Short Walk Required', description: 'Brief walk from drop-off' },
        { value: 'requires-4wd', label: 'Requires 4WD/SUV', description: 'Suitable for off-road vehicles' },
        { value: 'guided-trek-needed', label: 'Guided Trek Needed', description: 'Local guide recommended' }
      ]
    },
    {
      key: 'natureDistance',
      title: 'Distance',
      appliesToCategories: ['nature'],
      options: [
        { value: 'within-50-km', label: 'Within 50 km', description: 'Nearby destinations' },
        { value: '50-100-km', label: '50-100 km', description: 'Medium travel distance' },
        { value: '100-200-km', label: '100-200 km', description: 'Long-distance day travel' },
        { value: '200-plus-km', label: '200+ km', description: 'Extended distance journeys' }
      ]
    },
    {
      key: 'natureFacilities',
      title: 'Facilities Available',
      appliesToCategories: ['nature'],
      options: [
        { value: 'parking', label: 'Parking', description: 'Parking available onsite' },
        { value: 'restrooms', label: 'Restrooms', description: 'Washroom facilities available' },
        { value: 'guide-services', label: 'Guide Services', description: 'Guides available onsite' },
        { value: 'camping-allowed', label: 'Camping Allowed', description: 'Camping permitted' },
        { value: 'food-stalls-nearby', label: 'Food Stalls Nearby', description: 'Nearby food options' },
        { value: 'lodge-nearby', label: 'Lodge Nearby', description: 'Nearby stay options' }
      ]
    },
    {
      key: 'cuisineType',
      title: 'Cuisine Type',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'mizo-traditional', label: 'Mizo Traditional', description: 'Local traditional cuisine' },
        { value: 'north-indian', label: 'North Indian', description: 'North Indian dishes' },
        { value: 'chinese', label: 'Chinese', description: 'Chinese cuisine' },
        { value: 'continental', label: 'Continental', description: 'Continental dishes' },
        { value: 'tibetan-nepali', label: 'Tibetan/Nepali', description: 'Tibetan and Nepali specialties' },
        { value: 'street-food', label: 'Street Food', description: 'Street-style snacks and meals' },
        { value: 'multi-cuisine', label: 'Multi-Cuisine', description: 'Mixed cuisine options' }
      ]
    },
    {
      key: 'diningExperience',
      title: 'Dining Experience',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'fine-dining', label: 'Fine Dining', description: 'Premium dining setup' },
        { value: 'casual-dining', label: 'Casual Dining', description: 'Relaxed dining experience' },
        { value: 'cafe-coffee', label: 'Cafe & Coffee', description: 'Cafe-focused experience' },
        { value: 'quick-bites', label: 'Quick Bites', description: 'Fast snack stops' },
        { value: 'rooftop-view-dining', label: 'Rooftop/View Dining', description: 'Dining with scenic views' },
        { value: 'local-eatery', label: 'Local Eatery', description: 'Popular local eateries' },
        { value: 'fast-food', label: 'Fast Food', description: 'Quick-service food outlets' }
      ]
    },
    {
      key: 'priceRange',
      title: 'Price Range',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'budget-friendly', label: 'Budget Friendly', bracketText: '₹ - Under ₹300 per person', description: 'Affordable pricing' },
        { value: 'mid-range', label: 'Mid-Range', bracketText: '₹₹ - ₹300-800 per person', description: 'Mid-tier pricing' },
        { value: 'premium', label: 'Premium', bracketText: '₹₹₹ - Above ₹800 per person', description: 'Premium pricing' }
      ]
    },
    {
      key: 'mealType',
      title: 'Meal Type',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'breakfast', label: 'Breakfast', description: 'Breakfast offerings' },
        { value: 'lunch', label: 'Lunch', description: 'Lunch offerings' },
        { value: 'dinner', label: 'Dinner', description: 'Dinner offerings' },
        { value: 'snacks-tea', label: 'Snacks & Tea', description: 'Tea-time snacks' },
        { value: 'all-day-dining', label: 'All Day Dining', description: 'Available across all meal times' }
      ]
    },
    {
      key: 'specialFeaturesFood',
      title: 'Special Features',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'vegetarian-options', label: 'Vegetarian Options', description: 'Vegetarian menu choices' },
        { value: 'vegan-options', label: 'Vegan Options', description: 'Vegan menu choices' },
        { value: 'local-specialties', label: 'Local Specialties', description: 'Local specialty dishes' },
        { value: 'live-music', label: 'Live Music', description: 'Live music events' },
        { value: 'outdoor-seating', label: 'Outdoor Seating', description: 'Open-air seating options' },
        { value: 'mountain-valley-view', label: 'Mountain/Valley View', description: 'Scenic view seating' }
      ]
    },
    {
      key: 'siteType',
      title: 'Site Type',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'historical-monuments', label: 'Historical Monuments', description: 'Historic landmark sites' },
        { value: 'museums-galleries', label: 'Museums & Galleries', description: 'Exhibition and museum spaces' },
        { value: 'religious-sites', label: 'Religious Sites (Churches/Temples)', description: 'Places of worship and heritage faith sites' },
        { value: 'traditional-villages', label: 'Traditional Villages', description: 'Traditional village experiences' },
        { value: 'cultural-centers', label: 'Cultural Centers', description: 'Cultural hubs and centers' },
        { value: 'memorial-sites', label: 'Memorial Sites', description: 'Memorial and remembrance sites' }
      ]
    },
    {
      key: 'heritageExperienceType',
      title: 'Experience Type',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'guided-tours-available', label: 'Guided Tours Available', description: 'Tour guides available' },
        { value: 'self-guided-visit', label: 'Self-Guided Visit', description: 'Explore independently' },
        { value: 'cultural-performances', label: 'Cultural Performances', description: 'Live cultural showcases' },
        { value: 'photography-opportunities', label: 'Photography Opportunities', description: 'Photo-friendly heritage spaces' },
        { value: 'educational-learning', label: 'Educational/Learning', description: 'Learning-oriented visits' },
        { value: 'spiritual-experience', label: 'Spiritual Experience', description: 'Spiritual and reflective experiences' }
      ]
    },
    {
      key: 'timeNeededHeritage',
      title: 'Time Needed',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'quick-visit', label: 'Quick Visit', bracketText: 'Under 1 hour', description: 'Short visit' },
        { value: '1-2-hours', label: '1-2 hours', description: 'Standard visit time' },
        { value: 'half-day-heritage', label: 'Half Day', description: 'Half-day exploration' },
        { value: 'full-day-experience', label: 'Full Day Experience', description: 'Extended immersive visit' }
      ]
    },
    {
      key: 'bestTimeToVisitHeritage',
      title: 'Best Time to Visit',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'morning-8-12', label: 'Morning', bracketText: '8 AM - 12 PM', description: 'Best visited in the morning window' },
        { value: 'afternoon-12-4', label: 'Afternoon', bracketText: '12 PM - 4 PM', description: 'Ideal for afternoon visits' },
        { value: 'evening-4-7', label: 'Evening', bracketText: '4 PM - 7 PM', description: 'Best for evening explorations' },
        { value: 'special-events-festivals', label: 'Special Events/Festivals', description: 'Timed around cultural programs and festivals' }
      ]
    },
    {
      key: 'heritageAccessibility',
      title: 'Accessibility',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'wheelchair-accessible', label: 'Wheelchair Accessible', description: 'Accessible for wheelchair users' },
        { value: 'family-friendly', label: 'Family Friendly', description: 'Suitable for families' },
        { value: 'photography-allowed', label: 'Photography Allowed', description: 'Photography permitted' },
        { value: 'dress-code-required', label: 'Dress Code Required', description: 'Specific attire guidelines apply' }
      ]
    },
    {
      key: 'heritageFacilities',
      title: 'Facilities',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'parking-heritage', label: 'Parking', description: 'Parking available' },
        { value: 'restrooms-heritage', label: 'Restrooms', description: 'Washroom facilities available' },
        { value: 'souvenir-shop', label: 'Souvenir Shop', description: 'Souvenir store available' },
        { value: 'cafe-refreshments', label: 'Cafe/Refreshments', description: 'Refreshment counters or cafe' }
      ]
    },
    {
      key: 'parkType',
      title: 'Park Type',
      appliesToCategories: ['parks'],
      options: [
        { value: 'botanical-gardens', label: 'Botanical Gardens', description: 'Botanical collections and landscapes' },
        { value: 'city-parks', label: 'City Parks', description: 'Urban green spaces' },
        { value: 'wildlife-sanctuaries', label: 'Wildlife Sanctuaries', description: 'Protected wildlife zones' },
        { value: 'zoological-parks', label: 'Zoological Parks', description: 'Zoos and animal parks' },
        { value: 'nature-reserves', label: 'Nature Reserves', description: 'Reserved natural areas' },
        { value: 'picnic-spots', label: 'Picnic Spots', description: 'Popular picnic destinations' }
      ]
    },
    {
      key: 'activitiesAvailableParks',
      title: 'Activities Available',
      appliesToCategories: ['parks'],
      options: [
        { value: 'nature-walks-parks', label: 'Nature Walks', description: 'Walking trails and routes' },
        { value: 'bird-watching', label: 'Bird Watching', description: 'Bird observation spots' },
        { value: 'photography-parks', label: 'Photography', description: 'Scenic photography opportunities' },
        { value: 'picnic', label: 'Picnic', description: 'Picnic-friendly areas' },
        { value: 'childrens-play-area', label: "Children's Play Area", description: 'Dedicated play areas for children' },
        { value: 'boating', label: 'Boating', description: 'Boating experiences where available' },
        { value: 'wildlife-safari', label: 'Wildlife Safari', description: 'Guided wildlife safari activities' }
      ]
    },
    {
      key: 'timeNeededParks',
      title: 'Time Needed',
      appliesToCategories: ['parks'],
      options: [
        { value: 'quick-visit-parks', label: 'Quick Visit', bracketText: '1-2 hours', description: 'Short park visit' },
        { value: 'half-day-parks', label: 'Half Day', bracketText: '2-4 hours', description: 'Half-day outing' },
        { value: 'full-day-parks', label: 'Full Day', description: 'Full-day park experience' }
      ]
    },
    {
      key: 'bestForParks',
      title: 'Best For',
      appliesToCategories: ['parks'],
      options: [
        { value: 'families-with-kids', label: 'Families with Kids', description: 'Family-friendly locations' },
        { value: 'nature-lovers', label: 'Nature Lovers', description: 'Ideal for nature enthusiasts' },
        { value: 'photographers', label: 'Photographers', description: 'Photography-focused visitors' },
        { value: 'couples', label: 'Couples', description: 'Suitable for couples' },
        { value: 'solo-travelers', label: 'Solo Travelers', description: 'Good for solo exploration' },
        { value: 'groups', label: 'Groups', description: 'Great for group visits' }
      ]
    },
    {
      key: 'facilitiesAvailableParks',
      title: 'Facilities Available',
      appliesToCategories: ['parks'],
      options: [
        { value: 'parking-parks', label: 'Parking', description: 'Parking available' },
        { value: 'restrooms-parks', label: 'Restrooms', description: 'Washroom facilities available' },
        { value: 'food-court-stalls', label: 'Food Court/Stalls', description: 'Food options onsite' },
        { value: 'seating-areas', label: 'Seating Areas', description: 'Resting and seating spaces' },
        { value: 'walking-paths', label: 'Walking Paths', description: 'Designated walking paths' },
        { value: 'wheelchair-accessible-parks', label: 'Wheelchair Accessible', description: 'Accessibility support available' }
      ]
    }
  ]
};

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
      destination_filter_tags TEXT[] NOT NULL DEFAULT '{}',
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
  await pool.query("ALTER TABLE destinations ADD COLUMN IF NOT EXISTS destination_filter_tags TEXT[] NOT NULL DEFAULT '{}'");
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
    CREATE TABLE IF NOT EXISTS admin_settings (
      id BIGSERIAL PRIMARY KEY,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS admin_settings_setting_key_idx ON admin_settings(setting_key)');

  await pool.query(
    `
      INSERT INTO admin_settings (setting_key, setting_value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (setting_key) DO NOTHING
    `,
    ['destination_filter_config', JSON.stringify(DEFAULT_DESTINATION_FILTER_CONFIG)]
  );

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

  console.log('Creating vehicle registry tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS passenger_vehicles (
      id SERIAL PRIMARY KEY,
      registration_number VARCHAR(100) UNIQUE NOT NULL,
      vehicle_category VARCHAR(50) NOT NULL, -- taxi, private, rental
      vehicle_type VARCHAR(50) NOT NULL, -- Car, Van, Bus, Auto, etc
      manufacturer_model VARCHAR(150),
      fuel_type VARCHAR(50),
      seating_capacity INTEGER,
      year_of_manufacture INTEGER,
      owner_name VARCHAR(150),
      owner_contact VARCHAR(100),
      owner_address TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      geom GEOMETRY(Point, 4326),
      cover_image VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS taxi_details (
      vehicle_id INTEGER PRIMARY KEY REFERENCES passenger_vehicles(id) ON DELETE CASCADE,
      permit_type VARCHAR(100),
      permit_number VARCHAR(100),
      taxi_license_number VARCHAR(100),
      driver_name VARCHAR(150),
      driver_license VARCHAR(100),
      badge_number VARCHAR(100)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rental_details (
      vehicle_id INTEGER PRIMARY KEY REFERENCES passenger_vehicles(id) ON DELETE CASCADE,
      organization_name VARCHAR(150),
      business_type VARCHAR(100),
      contact_person VARCHAR(150),
      service_type VARCHAR(100),
      operating_areas TEXT
    )
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_vehicle_geom()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query('DROP TRIGGER IF EXISTS trg_vehicles_sync_geom ON passenger_vehicles');
  await pool.query(`
    CREATE TRIGGER trg_vehicles_sync_geom
    BEFORE INSERT OR UPDATE ON passenger_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION sync_vehicle_geom()
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_passenger_vehicles_category ON passenger_vehicles(vehicle_category)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_passenger_vehicles_status ON passenger_vehicles(status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_passenger_vehicles_geom ON passenger_vehicles USING GIST(geom)');

  console.log('Vehicle tables initialized successfully');
};
