// Core types for the audit engine and the report contract the 3D renderer reads.

export type IndustryKey = 'real_estate' | 'yacht_broker' | 'remodeler' | 'landscaper' | 'home_services' | 'general';
export type Tier = 'quick' | 'full';
export type BrandId = 'client' | 'a' | 'b' | 'c';
export const COMP_IDS: BrandId[] = ['a', 'b', 'c'];
export const ALL_IDS: BrandId[] = ['client', 'a', 'b', 'c'];

export type CategoryKey = 'map' | 'profile' | 'reviews' | 'website' | 'rankings' | 'video' | 'ai' | 'social' | 'links' | 'ads';
export type SocialKey = 'instagram' | 'tiktok' | 'facebook' | 'linkedin';
export type AssistantKey = 'chatgpt' | 'claude' | 'gemini' | 'google_ai';

export interface AuditInputs {
  name: string;
  website: string;
  market: string; // "Orlando, FL"
  industry: IndustryKey;
  tier: Tier;
  languages: string[]; // ['en'] or ['en', 'es']
  gbpUrl?: string;
  services?: string[];
  social: Partial<Record<SocialKey | 'youtube', string>>;
  notes?: string;
}

export interface Place {
  placeId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string;
  phone?: string;
  rating?: number | null;
  reviews?: number | null;
  mapsUrl?: string;
  category?: string;
  photos?: number;
  hasHours?: boolean;
  description?: string;
  evidence?: string;
}

export interface Candidate {
  key: string;
  name: string;
  website?: string;
  domain?: string;
  place?: Place;
  why: string; // plain words: "Top 3 on the map for kitchen remodel orlando"
  score: number;
  evidence: string[];
}

export interface Competitors {
  clientPlace: Place | null;
  clientPlaceOptions: Place[];
  candidates: Candidate[];
  confirmed?: { client: Place | null; comps: Candidate[] };
}

export interface SiteSummary {
  url: string;
  ok: boolean;
  pages: { url: string; title: string; h1: string; words: number }[];
  hasPhoneLink: boolean;
  hasSchemaLocalBusiness: boolean;
  schemaTypes: string[];
  hasFaq: boolean;
  videoEmbeds: number;
  mentionsCity: boolean;
  spanish: boolean;
  socialLinks: Partial<Record<SocialKey | 'youtube', string>>;
  logoUrl?: string;
  text: string; // trimmed visible text used by the content review (quotes must come from here)
  evidence: string;
}

export interface YoutubeSummary {
  channelId: string;
  title: string;
  subscribers: number | null;
  videos: number | null;
  uploads12: number[]; // uploads per month, oldest first, last 12 months
  views12: number | null; // views on videos uploaded in the last 12 months (sum)
  recentTitles: string[];
  recentIds: string[];
  evidence: string;
}

export interface SocialManual {
  followers?: number | null;
  lastPost?: string | null; // yyyy-mm-dd
  posts90?: number | null;
  enteredAt?: string;
}

export interface BrandData {
  id: BrandId;
  name: string;
  website?: string;
  domain?: string;
  place?: Place | null;
  site?: SiteSummary | null;
  speed?: { performance: number | null; seo: number | null; evidence: string } | null;
  backlinks?: { referringDomains: number; backlinks: number; evidence: string } | null;
  youtube?: YoutubeSummary | null;
}

export interface Keyword {
  term: string;
  volume: number | null;
  cpc?: number | null;
  lang: string;
  kind: 'service' | 'near_me' | 'best' | 'question' | 'spanish' | 'brand';
  evidence?: string;
}

export interface SerpSummary {
  keyword: string;
  organic: { rank: number; domain: string; url: string; title: string }[];
  paidDomains: string[];
  local: { rank: number; title: string; domain?: string }[];
  videoRow: boolean;
  videoItems: { title: string; url: string; domain: string }[];
  aiOverview: { present: boolean; refDomains: string[]; text?: string };
  evidence: string;
}

export interface MapPoint {
  i: number;
  j: number;
  lat: number;
  lng: number;
  top3: Record<string, { title: string; domain?: string; placeId?: string }[]>; // keyword -> top 3
  evidence: string;
}

export interface YtSerp {
  keyword: string;
  videos: { rank: number; title: string; channel: string; channelUrl?: string; views: number | null; url: string; isShorts: boolean; published?: string }[];
  evidence: string;
}

export interface AiAnswer {
  assistant: AssistantKey;
  model: string;
  question: string;
  run: number;
  text: string;
  citations: { title?: string; url: string }[];
  mentions: BrandId[];
  evidence: string;
}

export interface ContentCheck {
  item: string; // "Clear offer", "Proof", ...
  result: 'pass' | 'partial' | 'fail';
  note: string;
  quote?: string; // must appear verbatim in the source text
  source?: string; // which source the quote came from
}

export interface Collected {
  geo?: { lat: number; lng: number; label: string; evidence?: string };
  city?: string;
  brands: Partial<Record<BrandId, BrandData>>;
  keywords?: Keyword[];
  questions?: string[];
  serp?: SerpSummary[];
  brandSerp?: SerpSummary | null;
  maps?: { keywords: string[]; n: number; spacingKm: number; points: MapPoint[] };
  ytSerp?: YtSerp[];
  ai?: AiAnswer[];
  contentReview?: { checks: ContentCheck[]; evidence: string; model: string } | null;
  logoDataUrl?: string | null;
}

export interface CategoryResult {
  key: CategoryKey;
  label: string;
  weight: number;
  checked: boolean;
  unit: string; // what `values` measures, in plain words
  values: Partial<Record<BrandId, number | null>>;
  scores: Partial<Record<BrandId, number | null>>;
  median: number | null;
  evidence: string[];
}

export interface Scores {
  categories: CategoryResult[];
  overall: Record<BrandId, number | null>;
}

export interface Finding {
  id: string;
  category: CategoryKey;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  facts: Record<string, string | number>;
  evidence: string[];
  planItems: string[];
}

export type DeliveryKind = 'ready' | 'adapt' | 'build' | 'service' | 'client';

export interface PlanItem {
  id: string;
  category: CategoryKey;
  action: string;
  deliveredBy: { kind: DeliveryKind; name: string };
  preset?: string;
  platforms: string[];
  cadence?: string;
  metric: string;
  phase: 'foundations' | 'pace' | 'compound';
  targets?: string[];
}

export interface Projection {
  category: CategoryKey;
  current: number | null;
  low: number | null;
  high: number | null;
  mid: number | null;
  rule: string;
}

export interface AgentBrief {
  agent: string;
  preset?: string;
  kind: DeliveryKind;
  targets: string[];
  titles: string[];
  platforms: string[];
  cadence: string;
}

export interface Plan {
  items: PlanItem[];
  projections: Projection[];
  ongoing: string[];
  agentBriefs: AgentBrief[];
  salesMetrics: string[];
}

export interface Brief {
  headline: string;
  talkingPoints: string[];
  objections: { objection: string; answer: string }[];
  offer: { agents: string[]; build: string[]; services: string[] };
  generatedBy: 'rules' | 'rules+ai';
  dropped: string[]; // AI sentences removed by the fact check
}

export interface Results {
  scores: Scores;
  findings: Finding[];
  plan: Plan;
  brief: Brief;
  report: ReportData;
  checks: { thin: string[]; dropped: string[] };
  computedAt: string;
}

export interface Overrides {
  hiddenFindings?: string[];
  findingText?: Record<string, { title?: string; detail?: string }>;
  anonymize?: boolean;
  scene?: 'city' | 'marina';
}

// ---------------- report contract (what the 3D page reads) ----------------

export interface ReportBrand {
  id: BrandId;
  name: string;
  color: string;
  client?: boolean;
  scores: (number | null)[];
  overall: number | null;
  months: number[]; // 12, 1 = posted that month
  reviews: number | null;
  rating: number | null;
  domains: number | null;
  ads: { n: number; video: number } | null;
  speed: number | null;
  screen: { label: string; views: string } | null;
  proposed?: {
    scores: (number | null)[];
    overall: number | null;
    months: number[];
    reviews: number | null;
    domains: number | null;
    speed: number | null;
    ads: { n: number; video: number } | null;
  };
}

export interface ReportKeyword {
  term: string;
  volume: number | null;
  owner: BrandId | null;
  video: boolean;
  videoOwner: BrandId | null;
  planOwner: BrandId | null;
  evidence: string[];
}

export interface ReportPlatform {
  id: string;
  name: string;
  users: number | null;
  usersLabel?: string;
  color: string;
  status: 'active' | 'weak' | 'none' | 'unknown';
  planStatus: 'active' | 'weak' | 'none' | 'unknown';
  fit: 'High' | 'Medium' | 'Low';
  comps: BrandId[];
  content: string[];
  kind: 'search' | 'content' | 'mixed';
  note: string;
  fix: string;
}

export interface ReportStop {
  key: string;
  label: string;
  t: string;
  b: string;
  tp: string;
  bp: string;
  list?: string[];
}

export interface ReportData {
  version: 1;
  scene: 'city' | 'marina';
  sample: boolean;
  generatedAt: string;
  client: { name: string; industry: string; market: string; logo: string | null; initials: string };
  categories: { key: CategoryKey; label: string; weight: number; checked: boolean }[];
  brands: ReportBrand[];
  keywords: ReportKeyword[];
  ai: {
    questions: string[];
    headline: string;
    rows: { assistant: string; named: BrandId[]; clientCount: number; total: number }[];
    clientNamed: number;
    total: number;
    projectedNamed: number | null;
  };
  map: { n: number; keyword: string; home: [number, number]; grid: (BrandId | null)[][]; planGrid: (BrandId | null)[][]; labels: { i: number; j: number; name: string }[] };
  platforms: ReportPlatform[];
  stops: ReportStop[];
  details: Record<string, { title: string; rows: [string, string][]; note?: string }>;
  evidence: Record<string, { source: string; label: string; date: string; url?: string; sample?: boolean }>;
  labels: { planOn: string; planOff: string; scoreToday: string; scorePlan: string };
}
