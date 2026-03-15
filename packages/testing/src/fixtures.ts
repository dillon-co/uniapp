/**
 * Static test data fixtures for cities, users, events, venues, and vendors.
 * These are plain objects — insert them via the helpers in index.ts or directly via app.db.
 */

export const fixtureCities = [
  {
    name: "Austin",
    state: "TX",
    country: "US",
    timezone: "America/Chicago",
  },
  {
    name: "San Francisco",
    state: "CA",
    country: "US",
    timezone: "America/Los_Angeles",
  },
] as const;

export const fixtureUsers = [
  {
    email: "organizer@uniapp.test",
    name: "Test Organizer",
    password: "TestPassword123!",
    roles: ["organizer"] as string[],
  },
  {
    email: "admin@uniapp.test",
    name: "Test Admin",
    password: "TestPassword123!",
    roles: ["admin"] as string[],
  },
  {
    email: "attendee@uniapp.test",
    name: "Test Attendee",
    password: "TestPassword123!",
    roles: ["attendee"] as string[],
  },
  {
    email: "venue_manager@uniapp.test",
    name: "Test Venue Manager",
    password: "TestPassword123!",
    roles: ["venue_manager"] as string[],
  },
  {
    email: "vendor@uniapp.test",
    name: "Test Vendor User",
    password: "TestPassword123!",
    roles: ["vendor"] as string[],
  },
] as const;

export const fixtureEvents = [
  {
    title: "Austin City Music Festival",
    description: "Annual outdoor music festival in downtown Austin",
    type: "festival",
    status: "draft",
    edl: {
      name: "Austin City Music Festival",
      type: "festival",
      duration: { days: 3 },
      attendance: { min: 500, max: 5000 },
      budget: { total: 50000, currency: "USD" },
    },
    startDate: new Date("2026-06-15T18:00:00Z"),
    endDate: new Date("2026-06-17T23:00:00Z"),
    attendanceMin: 500,
    attendanceMax: 5000,
    budgetCents: 5000000,
  },
  {
    title: "Tech Startup Meetup",
    description: "Monthly networking event for startup founders",
    type: "meetup",
    status: "draft",
    edl: {
      name: "Tech Startup Meetup",
      type: "meetup",
      duration: { hours: 3 },
      attendance: { min: 50, max: 200 },
      budget: { total: 2000, currency: "USD" },
    },
    startDate: new Date("2026-04-10T18:00:00Z"),
    endDate: new Date("2026-04-10T21:00:00Z"),
    attendanceMin: 50,
    attendanceMax: 200,
    budgetCents: 200000,
  },
] as const;

export const fixtureVenues = [
  {
    name: "Zilker Park Amphitheater",
    address: "2100 Barton Springs Rd, Austin, TX 78704",
    capacity: 10000,
    type: "outdoor",
    pricePerHour: 500,
    amenities: ["parking", "restrooms", "stage", "power"],
    latitude: 30.2672,
    longitude: -97.7718,
  },
  {
    name: "Austin Convention Center",
    address: "500 E Cesar Chavez St, Austin, TX 78701",
    capacity: 5000,
    type: "indoor",
    pricePerHour: 2000,
    amenities: ["parking", "catering", "av_equipment", "wifi", "restrooms"],
    latitude: 30.2627,
    longitude: -97.7404,
  },
] as const;

export const fixtureVendors = [
  {
    name: "Austin AV Solutions",
    category: "audio_visual",
    description: "Professional sound and lighting for events",
    basePrice: 1500,
    contactEmail: "bookings@austinav.test",
    rating: 4.8,
  },
  {
    name: "Tex-Mex Catering Co",
    category: "catering",
    description: "Authentic Tex-Mex food for events of all sizes",
    basePrice: 25,
    contactEmail: "events@texmexcatering.test",
    rating: 4.6,
  },
  {
    name: "ATX Security Group",
    category: "security",
    description: "Licensed event security and crowd management",
    basePrice: 45,
    contactEmail: "ops@atxsecurity.test",
    rating: 4.7,
  },
] as const;
