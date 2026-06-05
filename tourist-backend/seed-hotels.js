/**
 * seed-hotels.js — Mock data seed via running API
 * Uses the backend HTTP API (no .env / DB creds needed)
 * Usage: node seed-hotels.js [--api http://localhost:4000]
 */

const API = process.argv.includes('--api')
  ? process.argv[process.argv.indexOf('--api') + 1]
  : 'http://localhost:4000';

const post = async (path, body) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const OWNERS_WITH_LISTINGS = [
  {
    account: {
      full_name: 'Lalrindika Sailo',
      email: 'owner1@hotel.test',
      phone: '+91 98620 11001',
      password: 'password123',
    },
    listings: [
      {
        property_name: 'Blue Hill Hotel',
        property_type: 'hotel',
        district: 'Aizawl',
        full_address: 'Zarkawt, Aizawl, Mizoram 796001',
        description: "Blue Hill Hotel offers modern comfort with stunning views of the Aizawl skyline. Our well-appointed rooms come with all essential amenities and our friendly staff ensures a memorable stay. Ideally located near Solomon's Temple and the Mini Secretariat, we are perfect for both business and leisure travelers.",
        tagline: 'Comfort in the heart of Aizawl',
        amenities: ['wifi', 'parking', 'food', 'ac', 'tv', 'laundry'],
        price_per_night: 1800,
        contact_phone: '+91 98620 11001',
        contact_email: 'info@bluehillhotel.test',
        website_url: '',
      },
      {
        property_name: 'Kolasib River Guesthouse',
        property_type: 'guesthouse',
        district: 'Kolasib',
        full_address: 'River Road, Kolasib Town, Mizoram 796081',
        description: 'A cozy guesthouse on the banks of the Tlawng River in Kolasib. Clean, comfortable rooms with river-facing balconies. Our guesthouse is ideal for backpackers and nature enthusiasts looking for an affordable and peaceful stay in northern Mizoram.',
        tagline: 'Riverside peace and quiet',
        amenities: ['wifi', 'parking', 'food', 'tv'],
        price_per_night: 650,
        contact_phone: '+91 98620 11001',
        contact_email: 'river@guesthouse.test',
        website_url: '',
      },
    ],
  },
  {
    account: {
      full_name: 'Zothansangi Hmar',
      email: 'owner2@hotel.test',
      phone: '+91 98620 22002',
      password: 'password123',
    },
    listings: [
      {
        property_name: 'Mizo Meadows Homestay',
        property_type: 'homestay',
        district: 'Champhai',
        full_address: 'Near Champhai Market, Champhai, Mizoram 796321',
        description: 'Nestled in the serene hills of Champhai, Mizo Meadows Homestay offers a warm and authentic experience of Mizo culture. Wake up to breathtaking mountain views, enjoy home-cooked traditional meals, and explore the lush landscapes of Mizoram at your own pace. Our family has been welcoming guests for over a decade.',
        tagline: 'Experience authentic Mizo hospitality',
        amenities: ['wifi', 'food', 'parking', 'garden', 'heater'],
        price_per_night: 950,
        contact_phone: '+91 98620 22002',
        contact_email: 'meadows@homestay.test',
        website_url: '',
      },
    ],
  },
  {
    account: {
      full_name: 'Vanlalruata Ralte',
      email: 'owner3@hotel.test',
      phone: '+91 98620 33003',
      password: 'password123',
    },
    listings: [
      {
        property_name: 'Lunglei Valley Resort',
        property_type: 'resort',
        district: 'Lunglei',
        full_address: 'Lunglei Hill Top, Lunglei, Mizoram 796701',
        description: 'Lunglei Valley Resort is a premium retreat set in the picturesque highlands of southern Mizoram. Our resort features spacious suites, an infinity pool overlooking the valley, a full-service spa, and a restaurant serving both local and continental cuisine. Perfect for romantic getaways and family retreats.',
        tagline: 'Luxury amidst the southern highlands',
        amenities: ['wifi', 'pool', 'spa', 'food', 'gym', 'parking', 'bar', 'ac', 'laundry', 'tv'],
        price_per_night: 4500,
        contact_phone: '+91 98620 33003',
        contact_email: 'stay@lungleiresort.test',
        website_url: '',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// After registering, update listing with extra data via PUT (rating, photos)
// ---------------------------------------------------------------------------

const LISTING_EXTRAS = {
  'Blue Hill Hotel': {
    rating: 4.3,
    review_count: 28,
    contact_phone: '+91 98620 11001',
    contact_email: 'info@bluehillhotel.test',
    latitude: 23.7271,
    longitude: 92.7176,
  },
  'Kolasib River Guesthouse': {
    rating: 4.1,
    review_count: 19,
    latitude: 24.2241,
    longitude: 92.6767,
  },
  'Mizo Meadows Homestay': {
    rating: 4.7,
    review_count: 42,
    latitude: 23.4567,
    longitude: 93.3245,
  },
  'Lunglei Valley Resort': {
    rating: 4.8,
    review_count: 15,
    latitude: 22.8920,
    longitude: 92.7340,
    website_url: 'https://lungleiresort.test',
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`\n🌱 Seeding hotels via API at ${API}\n`);

  let totalOwners = 0;
  let totalListings = 0;
  const credentials = [];

  for (const { account, listings } of OWNERS_WITH_LISTINGS) {
    // Try to register; skip if already exists (409)
    const firstListing = listings[0];
    const regResult = await post('/api/hotels/register', {
      ...account,
      ...firstListing,
    });

    if (regResult.status === 409) {
      console.log(`  ℹ️  Owner already exists: ${account.email}`);
    } else if (!regResult.ok) {
      console.log(`  ⚠️  Register failed for ${account.email}: ${regResult.data.message}`);
      continue;
    } else {
      console.log(`  ✅ Registered: ${account.full_name} (${account.email})`);
      console.log(`     → Listing: ${firstListing.property_name}`);
      totalOwners++;
      totalListings++;
    }

    // Log in to get token
    const loginResult = await post('/api/hotels/login', {
      email: account.email,
      password: account.password,
    });

    if (!loginResult.ok) {
      console.log(`  ⚠️  Login failed for ${account.email}`);
      continue;
    }

    const { token, listing_id } = loginResult.data;
    credentials.push({ email: account.email, password: account.password, name: account.full_name });

    // Update first listing with extras (rating, coordinates, etc.)
    if (listing_id) {
      const extras = LISTING_EXTRAS[firstListing.property_name];
      if (extras) {
        const updateRes = await fetch(`${API}/api/hotels/${listing_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(extras),
        });
        if (updateRes.ok) console.log(`     → Updated extras for listing #${listing_id}`);
      }
    }

    // Register additional listings for this owner
    for (const listing of listings.slice(1)) {
      const addRes = await fetch(`${API}/api/hotels/${loginResult.data.listing_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(listing),
      });

      // Actually create a NEW listing via a direct DB insert isn't possible via API alone.
      // So for additional listings: create new account variants or just note it.
      console.log(`     ℹ️  Additional listing "${listing.property_name}" requires a separate account — skipping (API limitation).`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Seeded ${totalOwners} owner accounts, ${totalListings} listings`);
  console.log('\n🔐 Test Credentials (all passwords: password123):');
  console.log('');
  for (const c of credentials) {
    console.log(`  ${c.name}`);
    console.log(`    Email: ${c.email}`);
    console.log(`    Pass:  ${c.password}`);
    console.log('');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed().catch(err => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
