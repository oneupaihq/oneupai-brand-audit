import type { CategoryKey, DeliveryKind, IndustryKey } from './types';

// Industry presets: what buyers search and ask, where they look, and which OneUp agent or
// service closes each kind of gap. Keyword and question lists are starting points; the engine
// keeps only terms with measured search volume.

export interface PlanTemplate {
  category: CategoryKey;
  action: string;
  kind: DeliveryKind;
  by: string;
  preset?: string;
  platforms: string[];
  cadence?: string;
  metric: string;
  phase: 'foundations' | 'pace' | 'compound';
}

export interface Industry {
  key: IndustryKey;
  label: string;
  role: string; // "real estate agent"
  roles: string[];
  services: string[];
  spanish: string[]; // Spanish service phrases
  questions: string[]; // {city}
  spanishQuestion: string;
  mapKeywords: string[]; // {city}
  directories: string[]; // domains that are listing sites, not competitors
  weights: Record<CategoryKey, number>;
  platformFit: Record<string, 'High' | 'Medium' | 'Low'>;
  platformContent: Record<string, string[]>;
  plan: PlanTemplate[];
  salesMetrics: string[];
  contentWord: string; // "listing", "job", "project"
}

const COMMON_DIRS = ['yelp.com', 'facebook.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'nextdoor.com', 'bbb.org', 'yellowpages.com', 'angi.com', 'homeadvisor.com', 'thumbtack.com', 'houzz.com', 'reddit.com', 'tiktok.com', 'pinterest.com', 'mapquest.com', 'google.com', 'wikipedia.org', 'indeed.com', 'glassdoor.com', 'x.com', 'twitter.com', 'expertise.com', 'porch.com', 'bark.com', 'manta.com', 'chamberofcommerce.com', 'birdeye.com', 'quora.com'];

const W = (o: Partial<Record<CategoryKey, number>>): Record<CategoryKey, number> => ({ map: 3, profile: 3, reviews: 3, website: 2, rankings: 3, video: 3, ai: 2, social: 2, links: 2, ads: 1, ...o });

// Plan items every industry shares (services and client tasks).
const SHARED: PlanTemplate[] = [
  { category: 'profile', action: 'Complete the Google profile: services, hours, description, 20+ photos', kind: 'service', by: 'OneUpAI service', platforms: ['Google'], metric: 'Profile completeness', phase: 'foundations' },
  { category: 'profile', action: 'Weekly Google profile posts using the week\'s short videos', kind: 'service', by: 'OneUpAI service', platforms: ['Google'], cadence: 'weekly', metric: 'Profile calls, direction requests, website clicks', phase: 'foundations' },
  { category: 'reviews', action: 'Review request sent after every sale or finished job', kind: 'service', by: 'OneUpAI service', platforms: ['Google'], cadence: 'every sale or job', metric: 'New reviews per month', phase: 'foundations' },
  { category: 'website', action: 'Speed fixes, tap-to-call button and business schema on the website', kind: 'service', by: 'OneUpAI service', platforms: ['Website'], metric: 'Mobile speed score', phase: 'foundations' },
  { category: 'map', action: 'Same name, address and phone on every listing site', kind: 'service', by: 'OneUpAI service', platforms: ['Google', 'Directories'], metric: 'Map rank across the service area', phase: 'foundations' },
  { category: 'ai', action: 'FAQ pages built from the question shorts\' transcripts', kind: 'service', by: 'OneUpAI service', platforms: ['Website', 'ChatGPT', 'Claude', 'Gemini'], metric: 'Answers naming the business', phase: 'pace' },
  { category: 'links', action: 'Links from local press, partners and associations', kind: 'service', by: 'OneUpAI service', platforms: ['Website'], cadence: 'monthly', metric: 'Sites linking in', phase: 'compound' },
  { category: 'social', action: 'Every short posted to Instagram, TikTok and Facebook with the target search terms in the captions', kind: 'ready', by: 'OneUp posting step', platforms: ['Instagram', 'TikTok', 'Facebook'], cadence: 'with every video', metric: 'Posts in the last 90 days, views', phase: 'pace' },
  { category: 'ads', action: 'Video ads from the best-performing shorts, aimed at the searches the business can win', kind: 'client', by: 'Client ad budget', platforms: ['Google', 'Meta'], metric: 'Leads from ads', phase: 'compound' },
];

const QUESTION_SHORTS = (what: string): PlanTemplate => ({ category: 'ai', action: `Answer the top buyer questions in short videos (${what})`, kind: 'build', by: 'Shorts agent', preset: 'question', platforms: ['YouTube', 'Google', 'Instagram', 'TikTok'], cadence: '2 per week', metric: 'AI answers naming the business; video results owned', phase: 'pace' });
const TESTIMONIALS: PlanTemplate = { category: 'reviews', action: 'Testimonial short from each new 5-star review (with the customer\'s permission)', kind: 'build', by: 'Shorts agent', preset: 'testimonial', platforms: ['YouTube', 'Instagram', 'Facebook', 'Google'], cadence: 'every new 5-star review', metric: 'Reviews, profile actions', phase: 'pace' };

export const INDUSTRIES: Record<IndustryKey, Industry> = {
  real_estate: {
    key: 'real_estate', label: 'Real estate agent', role: 'real estate agent', roles: ['realtor', 'real estate agent'],
    services: ['homes for sale', 'real estate agent', 'realtor', 'sell my house', 'luxury homes', 'condos for sale'],
    spanish: ['agente de bienes raíces', 'casas en venta'],
    questions: ['Who is the best real estate agent in {city}?', 'Which realtor in {city} sells homes the fastest?', 'What are the best neighborhoods to live in {city}?', 'Can you recommend a realtor to help me sell my house in {city}?', 'Who are the top luxury real estate agents in {city}?'],
    spanishQuestion: '¿Quién es el mejor agente de bienes raíces en {city}?',
    mapKeywords: ['real estate agent {city}', 'realtor near me'],
    directories: [...COMMON_DIRS, 'zillow.com', 'realtor.com', 'redfin.com', 'trulia.com', 'homes.com', 'movoto.com', 'compass.com', 'coldwellbanker.com', 'kw.com', 'century21.com', 'remax.com', 'fastexpert.com', 'homelight.com'],
    weights: W({ video: 3, ai: 3, ads: 1 }),
    platformFit: { google: 'High', youtube: 'High', instagram: 'High', tiktok: 'Medium', facebook: 'High', chatgpt: 'High', pinterest: 'Low', linkedin: 'Medium' },
    platformContent: { google: ['realtor near me', 'homes for sale {city}'], youtube: ['Moving to {city}', 'Neighborhood tours', 'living in {city}'], instagram: ['Listing reels', 'Just sold posts'], tiktok: ['House tours', 'Market updates'], facebook: ['Listing videos', 'Neighborhood groups'], chatgpt: ['Best realtor in {city}?', 'Best neighborhoods in {city}?'], pinterest: ['Home design ideas'], linkedin: ['Relocation and investor audiences'] },
    plan: [
      { category: 'video', action: '30-second video for every new listing', kind: 'ready', by: 'OneUpListings', platforms: ['YouTube', 'Instagram', 'TikTok', 'Facebook'], cadence: 'every listing', metric: 'Video results owned, views', phase: 'foundations' },
      { category: 'video', action: 'Walkthrough tour for every listing', kind: 'ready', by: 'OneUpTours', platforms: ['YouTube', 'Website'], cadence: 'every listing', metric: 'Views, listing inquiries', phase: 'foundations' },
      { category: 'rankings', action: 'One neighborhood guide short per target neighborhood', kind: 'build', by: 'Shorts agent', preset: 'area', platforms: ['YouTube', 'Instagram', 'TikTok'], cadence: '1 per week', metric: 'Searches ranked in the top 3', phase: 'pace' },
      { category: 'social', action: 'Open house recap videos', kind: 'ready', by: 'OneUpMoments', platforms: ['Instagram', 'Facebook'], cadence: 'every open house', metric: 'Posts in the last 90 days', phase: 'pace' },
      { category: 'video', action: 'Monthly local market update video from news articles', kind: 'ready', by: 'OneUpArticles', platforms: ['YouTube', 'LinkedIn', 'Facebook'], cadence: 'monthly', metric: 'Views, subscribers', phase: 'compound' },
      QUESTION_SHORTS('buying, selling and neighborhood questions'), TESTIMONIALS, ...SHARED],
    salesMetrics: ['Listing appointments', 'Buyer consultations', 'Closings'], contentWord: 'listing',
  },
  yacht_broker: {
    key: 'yacht_broker', label: 'Yacht broker', role: 'yacht broker', roles: ['yacht broker', 'yacht brokerage'],
    services: ['yachts for sale', 'yacht broker', 'sell my yacht', 'sportfish yachts for sale', 'motor yachts for sale', 'catamarans for sale'],
    spanish: ['yates en venta', 'corredor de yates'],
    questions: ['Who are the best yacht brokers in {city}?', 'Which yacht brokerage in {city} should I use to buy a 50-foot yacht?', 'How do I sell my yacht in {city}?', 'What does it cost to own a 50-foot yacht in Florida?', 'Can you recommend a yacht broker in {city} for a first-time buyer?'],
    spanishQuestion: '¿Cuál es el mejor corredor de yates en {city}?',
    mapKeywords: ['yacht broker {city}', 'yachts for sale {city}'],
    directories: [...COMMON_DIRS, 'yachtworld.com', 'boattrader.com', 'boats.com', 'yachtbroker.org', 'boatinternational.com', 'superyachttimes.com', 'yachtall.com', 'iyba.org'],
    weights: W({ map: 2, profile: 2, video: 3, rankings: 3, ai: 3, links: 2, ads: 1 }),
    platformFit: { google: 'High', youtube: 'High', instagram: 'High', tiktok: 'Medium', facebook: 'Medium', chatgpt: 'High', pinterest: 'Low', linkedin: 'Medium' },
    platformContent: { google: ['yachts for sale {city}', 'yacht broker near me'], youtube: ['Yacht walkthrough tours', 'Model comparisons', 'boat show tours'], instagram: ['Listing reels', 'Sea trial clips'], tiktok: ['Yacht tours', 'Day on the water'], facebook: ['Listing videos', 'Owner groups'], chatgpt: ['Best yacht broker in {city}?', 'Cost to own a yacht?'], pinterest: ['Yacht interiors'], linkedin: ['High-net-worth buyers'] },
    plan: [
      { category: 'video', action: 'Listing video for every yacht, from the listing link', kind: 'adapt', by: 'OneUpProperties (yacht listings)', platforms: ['YouTube', 'Instagram', 'Facebook'], cadence: 'every listing', metric: 'Video results owned, inquiries per listing', phase: 'foundations' },
      { category: 'video', action: 'Walkthrough tour for every yacht listing', kind: 'adapt', by: 'OneUpTours (yacht listings)', platforms: ['YouTube', 'Website'], cadence: 'every listing', metric: 'Views, showings', phase: 'foundations' },
      { category: 'rankings', action: 'Marina and destination guide shorts', kind: 'build', by: 'Shorts agent', preset: 'area', platforms: ['YouTube', 'Instagram'], cadence: '1 per week', metric: 'Searches ranked in the top 3', phase: 'pace' },
      { category: 'social', action: 'Boat show recap videos', kind: 'ready', by: 'OneUpMoments', platforms: ['Instagram', 'Facebook', 'LinkedIn'], cadence: 'every show', metric: 'Posts in the last 90 days', phase: 'pace' },
      { category: 'video', action: 'Monthly yacht market update from industry news', kind: 'ready', by: 'OneUpArticles', platforms: ['YouTube', 'LinkedIn'], cadence: 'monthly', metric: 'Views, subscribers', phase: 'compound' },
      QUESTION_SHORTS('buying, selling and ownership-cost questions'), TESTIMONIALS, ...SHARED],
    salesMetrics: ['Inquiries per listing', 'Showings', 'Closed deals'], contentWord: 'listing',
  },
  remodeler: {
    key: 'remodeler', label: 'Remodeling contractor', role: 'remodeling contractor', roles: ['remodeling contractor', 'general contractor'],
    services: ['kitchen remodel', 'bathroom remodel', 'home remodeling', 'general contractor', 'home addition', 'remodeling contractor'],
    spanish: ['remodelación de cocina', 'contratista de remodelación'],
    questions: ['Who is the best home remodeling contractor in {city}?', 'Which kitchen remodeling companies in {city} have the best reviews?', 'How much does a kitchen remodel cost in {city}?', 'Can you recommend a bathroom remodeler in {city}?', 'Who are the top general contractors in {city} for a home addition?'],
    spanishQuestion: '¿Cuál es la mejor empresa de remodelación en {city}?',
    mapKeywords: ['kitchen remodel {city}', 'remodeling contractor near me'],
    directories: [...COMMON_DIRS, 'lowes.com', 'homedepot.com', 'fixr.com', 'forbes.com', 'buildzoom.com', 'networx.com', 'modernize.com'],
    weights: W({ map: 3, profile: 3, reviews: 3, ai: 2, ads: 2 }),
    platformFit: { google: 'High', youtube: 'High', instagram: 'High', tiktok: 'Medium', facebook: 'High', chatgpt: 'Medium', pinterest: 'Medium', linkedin: 'Low' },
    platformContent: { google: ['kitchen remodel {city}', 'contractor near me'], youtube: ['Before and after remodels', 'Remodel cost breakdowns', 'kitchen remodel cost'], instagram: ['Before/after reels', 'Finished project photos'], tiktok: ['Demo day to finish', 'Time-lapses'], facebook: ['Neighborhood group posts', 'Customer reviews'], chatgpt: ['Best remodeler in {city}?', 'Kitchen remodel cost?'], pinterest: ['Kitchen and bath ideas'], linkedin: ['Commercial projects'] },
    plan: [
      { category: 'video', action: 'Before-and-after reveal for every finished project', kind: 'adapt', by: 'OneUpLandscapes (reworded for remodels)', platforms: ['YouTube', 'Instagram', 'TikTok', 'Facebook'], cadence: 'every project', metric: 'Video results owned, views', phase: 'foundations' },
      { category: 'social', action: 'Home show and project handover recaps', kind: 'ready', by: 'OneUpMoments', platforms: ['Instagram', 'Facebook'], cadence: 'monthly', metric: 'Posts in the last 90 days', phase: 'pace' },
      { category: 'video', action: 'Design trend videos from home and design news', kind: 'ready', by: 'OneUpArticles', platforms: ['YouTube', 'Facebook', 'Pinterest'], cadence: 'monthly', metric: 'Views', phase: 'compound' },
      QUESTION_SHORTS('cost, timeline and permit questions, using the client\'s own prices'), TESTIMONIALS, ...SHARED],
    salesMetrics: ['Quote requests', 'Booked consultations', 'Jobs won', 'Average job size'], contentWord: 'project',
  },
  landscaper: {
    key: 'landscaper', label: 'Landscaper', role: 'landscaper', roles: ['landscaper', 'landscaping company'],
    services: ['landscaping', 'landscaper', 'lawn care', 'landscape design', 'tree trimming', 'sod installation', 'paver patio'],
    spanish: ['jardinería', 'paisajista'],
    questions: ['Who is the best landscaper in {city}?', 'Which lawn care companies in {city} have the best reviews?', 'What plants survive the summer heat in {city}?', 'How much does landscape design cost in {city}?', 'Can you recommend a landscaping company in {city}?'],
    spanishQuestion: '¿Cuál es el mejor paisajista en {city}?',
    mapKeywords: ['landscaper {city}', 'lawn care near me'],
    directories: [...COMMON_DIRS, 'lawnstarter.com', 'greenpal.com', 'lawnlove.com'],
    weights: W({ map: 3, profile: 3, reviews: 3, ads: 2 }),
    platformFit: { google: 'High', youtube: 'High', instagram: 'High', tiktok: 'Medium', facebook: 'High', chatgpt: 'Medium', pinterest: 'Low', linkedin: 'Low' },
    platformContent: { google: ['landscaper near me', 'lawn care {city}'], youtube: ['Before/after makeovers', 'Plant guides', 'landscaping ideas'], instagram: ['Before/after reels', 'Finished yard photos'], tiktok: ['Satisfying transformations', 'Crew time-lapses'], facebook: ['Neighborhood group posts', 'Customer reviews'], chatgpt: ['Best landscaper in {city}?', 'Plants for this climate?'], pinterest: ['Backyard design ideas'], linkedin: ['Commercial property contracts'] },
    plan: [
      { category: 'video', action: 'Before-and-after reveal for every job', kind: 'ready', by: 'OneUpLandscapes', platforms: ['YouTube', 'Instagram', 'TikTok', 'Facebook'], cadence: 'every job', metric: 'Video results owned, views', phase: 'foundations' },
      QUESTION_SHORTS('lawn, plant and cost questions'), TESTIMONIALS, ...SHARED],
    salesMetrics: ['Quote requests', 'Jobs won', 'Recurring contracts'], contentWord: 'job',
  },
  home_services: {
    key: 'home_services', label: 'Home services', role: 'contractor', roles: ['contractor', 'company'],
    services: [], spanish: [],
    questions: ['Who is the best {service} company in {city}?', 'Which {service} companies in {city} have the best reviews?', 'How much does {service} cost in {city}?', 'Can you recommend a {service} company in {city}?', 'Who should I call for {service} in {city}?'],
    spanishQuestion: '¿Cuál es la mejor empresa de {service} en {city}?',
    mapKeywords: ['{service} {city}', '{service} near me'],
    directories: COMMON_DIRS, weights: W({}),
    platformFit: { google: 'High', youtube: 'High', instagram: 'Medium', tiktok: 'Medium', facebook: 'High', chatgpt: 'Medium', pinterest: 'Low', linkedin: 'Low' },
    platformContent: { google: ['{service} near me'], youtube: ['How-to and cost videos'], instagram: ['Job reels'], tiktok: ['Job time-lapses'], facebook: ['Neighborhood groups'], chatgpt: ['Best {service} in {city}?'], pinterest: ['Ideas'], linkedin: ['Commercial clients'] },
    plan: [
      { category: 'video', action: 'Before-and-after reveal for every job', kind: 'adapt', by: 'OneUpLandscapes (reworded for this trade)', platforms: ['YouTube', 'Instagram', 'TikTok', 'Facebook'], cadence: 'every job', metric: 'Video results owned, views', phase: 'foundations' },
      QUESTION_SHORTS('cost and how-to questions'), TESTIMONIALS, ...SHARED],
    salesMetrics: ['Calls', 'Quote requests', 'Jobs won'], contentWord: 'job',
  },
  general: {
    key: 'general', label: 'Local business', role: 'business', roles: ['business', 'company'],
    services: [], spanish: [],
    questions: ['What is the best {service} in {city}?', 'Which {service} businesses in {city} have the best reviews?', 'Can you recommend a {service} in {city}?', 'Who are the top {service} providers in {city}?', 'Where should I go for {service} in {city}?'],
    spanishQuestion: '¿Cuál es el mejor {service} en {city}?',
    mapKeywords: ['{service} {city}', '{service} near me'],
    directories: COMMON_DIRS, weights: W({}),
    platformFit: { google: 'High', youtube: 'Medium', instagram: 'High', tiktok: 'Medium', facebook: 'High', chatgpt: 'Medium', pinterest: 'Low', linkedin: 'Medium' },
    platformContent: { google: ['{service} near me'], youtube: ['How-to videos'], instagram: ['Reels'], tiktok: ['Behind the scenes'], facebook: ['Community posts'], chatgpt: ['Best {service} in {city}?'], pinterest: ['Ideas'], linkedin: ['Business audiences'] },
    plan: [
      { category: 'video', action: 'Short news-style videos from the business\'s own announcements and local news', kind: 'ready', by: 'OneUpArticles', platforms: ['YouTube', 'Facebook', 'LinkedIn'], cadence: '2 per month', metric: 'Views', phase: 'pace' },
      { category: 'social', action: 'Event recap videos', kind: 'ready', by: 'OneUpMoments', platforms: ['Instagram', 'Facebook'], cadence: 'every event', metric: 'Posts in the last 90 days', phase: 'pace' },
      QUESTION_SHORTS('the most common customer questions'), TESTIMONIALS, ...SHARED],
    salesMetrics: ['Calls', 'Leads', 'Sales'], contentWord: 'job',
  },
};

export const INDUSTRY_OPTIONS = Object.values(INDUSTRIES).map(i => ({ key: i.key, label: i.label }));

export function industryServices(ind: Industry, inputServices?: string[]): string[] {
  const s = (inputServices || []).map(x => x.trim().toLowerCase()).filter(Boolean);
  return s.length ? [...s, ...ind.services.filter(x => !s.includes(x))].slice(0, 8) : ind.services;
}

export function fill(t: string, city: string, service: string) {
  return t.replaceAll('{city}', city).replaceAll('{service}', service);
}
