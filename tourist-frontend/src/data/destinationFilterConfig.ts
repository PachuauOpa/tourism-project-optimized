import { DestinationCategory, DestinationFilterConfig, FilterCategory } from '../types';

export const DESTINATION_CATEGORY_OPTIONS: Array<{ value: DestinationCategory; label: string }> = [
  { value: 'nature', label: 'Nature & Mountains' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'heritage', label: 'Heritage & Culture' },
  { value: 'parks', label: 'Parks & Gardens' }
];

export const DEFAULT_DESTINATION_FILTER_CONFIG: DestinationFilterConfig = {
  categories: [
    {
      key: 'natureExperienceType',
      title: 'Experience Type',
      appliesToCategories: ['nature'],
      options: [
        { value: 'hiking', label: 'Hiking' },
        { value: 'photography', label: 'Photography' },
        { value: 'sightseeing', label: 'Sightseeing' },
        { value: 'wildlife-watching', label: 'Wildlife Watching' },
        { value: 'adventure-sports', label: 'Adventure Sports' },
        { value: 'nature-walks', label: 'Nature Walks' }
      ]
    },
    {
      key: 'trailDifficulty',
      title: 'Trail Difficulty',
      appliesToCategories: ['nature'],
      options: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'experienced', label: 'Experienced' }
      ]
    },
    {
      key: 'timeNeededNature',
      title: 'Time Needed',
      appliesToCategories: ['nature'],
      options: [
        { value: 'quick-stop', label: 'Quick Stop', bracketText: '1-2 hours' },
        { value: 'half-day', label: 'Half Day', bracketText: '2-4 hours' },
        { value: 'full-day', label: 'Full Day', bracketText: '4-8 hours' },
        { value: 'overnight-required', label: 'Overnight Stay Required' }
      ]
    },
    {
      key: 'natureAccessibility',
      title: 'Accessibility',
      appliesToCategories: ['nature'],
      options: [
        { value: 'easy-road-access', label: 'Easy Access by Road' },
        { value: 'short-walk-required', label: 'Short Walk Required' },
        { value: 'requires-4wd', label: 'Requires 4WD/SUV' },
        { value: 'guided-trek-needed', label: 'Guided Trek Needed' }
      ]
    },
    {
      key: 'natureDistance',
      title: 'Distance',
      appliesToCategories: ['nature'],
      options: [
        { value: 'within-50-km', label: 'Within 50 km' },
        { value: '50-100-km', label: '50-100 km' },
        { value: '100-200-km', label: '100-200 km' },
        { value: '200-plus-km', label: '200+ km' }
      ]
    },
    {
      key: 'natureFacilities',
      title: 'Facilities Available',
      appliesToCategories: ['nature'],
      options: [
        { value: 'parking', label: 'Parking' },
        { value: 'restrooms', label: 'Restrooms' },
        { value: 'guide-services', label: 'Guide Services' },
        { value: 'camping-allowed', label: 'Camping Allowed' },
        { value: 'food-stalls-nearby', label: 'Food Stalls Nearby' },
        { value: 'lodge-nearby', label: 'Lodge Nearby' }
      ]
    },
    {
      key: 'cuisineType',
      title: 'Cuisine Type',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'mizo-traditional', label: 'Mizo Traditional' },
        { value: 'north-indian', label: 'North Indian' },
        { value: 'chinese', label: 'Chinese' },
        { value: 'continental', label: 'Continental' },
        { value: 'tibetan-nepali', label: 'Tibetan/Nepali' },
        { value: 'street-food', label: 'Street Food' },
        { value: 'multi-cuisine', label: 'Multi-Cuisine' }
      ]
    },
    {
      key: 'diningExperience',
      title: 'Dining Experience',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'fine-dining', label: 'Fine Dining' },
        { value: 'casual-dining', label: 'Casual Dining' },
        { value: 'cafe-coffee', label: 'Cafe & Coffee' },
        { value: 'quick-bites', label: 'Quick Bites' },
        { value: 'rooftop-view-dining', label: 'Rooftop/View Dining' },
        { value: 'local-eatery', label: 'Local Eatery' },
        { value: 'fast-food', label: 'Fast Food' }
      ]
    },
    {
      key: 'priceRange',
      title: 'Price Range',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'budget-friendly', label: 'Budget Friendly', bracketText: '₹ - Under ₹300 per person' },
        { value: 'mid-range', label: 'Mid-Range', bracketText: '₹₹ - ₹300-800 per person' },
        { value: 'premium', label: 'Premium', bracketText: '₹₹₹ - Above ₹800 per person' }
      ]
    },
    {
      key: 'mealType',
      title: 'Meal Type',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'breakfast', label: 'Breakfast' },
        { value: 'lunch', label: 'Lunch' },
        { value: 'dinner', label: 'Dinner' },
        { value: 'snacks-tea', label: 'Snacks & Tea' },
        { value: 'all-day-dining', label: 'All Day Dining' }
      ]
    },
    {
      key: 'specialFeaturesFood',
      title: 'Special Features',
      appliesToCategories: ['restaurant', 'cafe'],
      options: [
        { value: 'vegetarian-options', label: 'Vegetarian Options' },
        { value: 'vegan-options', label: 'Vegan Options' },
        { value: 'local-specialties', label: 'Local Specialties' },
        { value: 'live-music', label: 'Live Music' },
        { value: 'outdoor-seating', label: 'Outdoor Seating' },
        { value: 'mountain-valley-view', label: 'Mountain/Valley View' }
      ]
    },
    {
      key: 'siteType',
      title: 'Site Type',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'historical-monuments', label: 'Historical Monuments' },
        { value: 'museums-galleries', label: 'Museums & Galleries' },
        { value: 'religious-sites', label: 'Religious Sites (Churches/Temples)' },
        { value: 'traditional-villages', label: 'Traditional Villages' },
        { value: 'cultural-centers', label: 'Cultural Centers' },
        { value: 'memorial-sites', label: 'Memorial Sites' }
      ]
    },
    {
      key: 'heritageExperienceType',
      title: 'Experience Type',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'guided-tours-available', label: 'Guided Tours Available' },
        { value: 'self-guided-visit', label: 'Self-Guided Visit' },
        { value: 'cultural-performances', label: 'Cultural Performances' },
        { value: 'photography-opportunities', label: 'Photography Opportunities' },
        { value: 'educational-learning', label: 'Educational/Learning' },
        { value: 'spiritual-experience', label: 'Spiritual Experience' }
      ]
    },
    {
      key: 'timeNeededHeritage',
      title: 'Time Needed',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'quick-visit', label: 'Quick Visit', bracketText: 'Under 1 hour' },
        { value: '1-2-hours', label: '1-2 hours' },
        { value: 'half-day-heritage', label: 'Half Day' },
        { value: 'full-day-experience', label: 'Full Day Experience' }
      ]
    },
    {
      key: 'bestTimeToVisitHeritage',
      title: 'Best Time to Visit',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'morning-8-12', label: 'Morning', bracketText: '8 AM - 12 PM' },
        { value: 'afternoon-12-4', label: 'Afternoon', bracketText: '12 PM - 4 PM' },
        { value: 'evening-4-7', label: 'Evening', bracketText: '4 PM - 7 PM' },
        { value: 'special-events-festivals', label: 'Special Events/Festivals' }
      ]
    },
    {
      key: 'heritageAccessibility',
      title: 'Accessibility',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
        { value: 'family-friendly', label: 'Family Friendly' },
        { value: 'photography-allowed', label: 'Photography Allowed' },
        { value: 'dress-code-required', label: 'Dress Code Required' }
      ]
    },
    {
      key: 'heritageFacilities',
      title: 'Facilities',
      appliesToCategories: ['heritage'],
      options: [
        { value: 'parking-heritage', label: 'Parking' },
        { value: 'restrooms-heritage', label: 'Restrooms' },
        { value: 'souvenir-shop', label: 'Souvenir Shop' },
        { value: 'cafe-refreshments', label: 'Cafe/Refreshments' }
      ]
    },
    {
      key: 'parkType',
      title: 'Park Type',
      appliesToCategories: ['parks'],
      options: [
        { value: 'botanical-gardens', label: 'Botanical Gardens' },
        { value: 'city-parks', label: 'City Parks' },
        { value: 'wildlife-sanctuaries', label: 'Wildlife Sanctuaries' },
        { value: 'zoological-parks', label: 'Zoological Parks' },
        { value: 'nature-reserves', label: 'Nature Reserves' },
        { value: 'picnic-spots', label: 'Picnic Spots' }
      ]
    },
    {
      key: 'activitiesAvailableParks',
      title: 'Activities Available',
      appliesToCategories: ['parks'],
      options: [
        { value: 'nature-walks-parks', label: 'Nature Walks' },
        { value: 'bird-watching', label: 'Bird Watching' },
        { value: 'photography-parks', label: 'Photography' },
        { value: 'picnic', label: 'Picnic' },
        { value: 'childrens-play-area', label: "Children's Play Area" },
        { value: 'boating', label: 'Boating' },
        { value: 'wildlife-safari', label: 'Wildlife Safari' }
      ]
    },
    {
      key: 'timeNeededParks',
      title: 'Time Needed',
      appliesToCategories: ['parks'],
      options: [
        { value: 'quick-visit-parks', label: 'Quick Visit', bracketText: '1-2 hours' },
        { value: 'half-day-parks', label: 'Half Day', bracketText: '2-4 hours' },
        { value: 'full-day-parks', label: 'Full Day' }
      ]
    },
    {
      key: 'bestForParks',
      title: 'Best For',
      appliesToCategories: ['parks'],
      options: [
        { value: 'families-with-kids', label: 'Families with Kids' },
        { value: 'nature-lovers', label: 'Nature Lovers' },
        { value: 'photographers', label: 'Photographers' },
        { value: 'couples', label: 'Couples' },
        { value: 'solo-travelers', label: 'Solo Travelers' },
        { value: 'groups', label: 'Groups' }
      ]
    },
    {
      key: 'facilitiesAvailableParks',
      title: 'Facilities Available',
      appliesToCategories: ['parks'],
      options: [
        { value: 'parking-parks', label: 'Parking' },
        { value: 'restrooms-parks', label: 'Restrooms' },
        { value: 'food-court-stalls', label: 'Food Court/Stalls' },
        { value: 'seating-areas', label: 'Seating Areas' },
        { value: 'walking-paths', label: 'Walking Paths' },
        { value: 'wheelchair-accessible-parks', label: 'Wheelchair Accessible' }
      ]
    }
  ]
};

const FILTER_GROUP_DEFAULT_SCOPE_BY_KEY: Record<string, string[]> = DEFAULT_DESTINATION_FILTER_CONFIG.categories
  .reduce<Record<string, string[]>>((accumulator, category) => {
    accumulator[category.key] = [...(category.appliesToCategories || [])];
    return accumulator;
  }, {});

export const getDefaultAppliesToCategoriesForFilterGroup = (groupKey: string): string[] => {
  return [...(FILTER_GROUP_DEFAULT_SCOPE_BY_KEY[groupKey] || [])];
};

export const buildDestinationCategoryFilter = (): FilterCategory => ({
  key: 'destinationCategory',
  title: 'Category',
  options: DESTINATION_CATEGORY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: `Show ${option.label} destinations`
  }))
});
