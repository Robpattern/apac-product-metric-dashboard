// Single source of truth for the APAC reporting taxonomy.
// The triage tool and the dashboard must agree on these exact names.

export const THEMES = {
  Revenue:    { name: "Revenue generation", hex: "#059669", blurb: "Top line — horizontal, vertical and brand expansion" },
  Cost:       { name: "Cost automation",    hex: "#d97706", blurb: "EBITDA — cost per unit, cost to serve, cash cycle" },
  Partner:    { name: "Partner obsessed",   hex: "#2563eb", blurb: "Partner experience — NPS, JBP, ramping, speed" },
};

// Tickets that classify here are dropped from the dashboard entirely. Per James:
// the Data foundations theme is gone, and purely technical work under Nimbus and the
// Technical Roadmap is not what gets presented at exec level. The work still exists
// in ClickUp — it just doesn't roll up to a top metric, so it isn't reported here.
export const EXCLUDED = "__excluded__";

export const METRICS = {
  revenue: { name: "Revenue (top line)", theme: "Revenue", target: "vs. OP target" },
  booking: { name: "Booking value",      theme: "Revenue", target: "" },
  qbe:     { name: "Qualified brand expansion", theme: "Revenue", target: "" },
  ebitda:  { name: "EBITDA",             theme: "Cost",    target: "vs. OP target" },
  cpu:     { name: "Cost per unit",      theme: "Cost",    target: "" },
  cts:     { name: "Cost to serve",      theme: "Cost",    target: "ops + brand ads + indirect OPEX" },
  dio:     { name: "Net DIO",            theme: "Cost",    target: "net days inventory outstanding · target ~90 days" },
  nps:     { name: "NPS",                theme: "Partner", target: "partner satisfaction" },
  jbp:     { name: "JBP adherence",      theme: "Partner", target: "" },
  ramping: { name: "Ramping",            theme: "Partner", target: "speed to annual target" },
  t12:     { name: "T12 run rate",       theme: "Partner", target: "15.8 → 14.8 months" },
  firstpo: { name: "Days to first PO",   theme: "Partner", target: "" },
};

// Project → metric mapping is verbatim from the metrics session. Do not reinterpret.
// owner = product owner accountable for confirming classifications.
export const PROJECTS = {
  adtech:      { name: "Ad Tech",                   theme: "Cost",       owner: "Robert Wang", metrics: ["cts", "ebitda"] },
  predictcn:   { name: "Predict China",             theme: "Partner",    owner: "Rey Zhong",   metrics: ["nps", "jbp"] },
  predictkrjp: { name: "Predict Korea / Japan",     theme: "Revenue",    owner: "Robert Wang", metrics: ["nps", "revenue"] },
  social:      { name: "Social / live commerce",    theme: "Revenue",    owner: "James Lin",   metrics: ["revenue", "cts"] },
  invcn:       { name: "Inventory — China",         theme: "Cost",       owner: "Shelen Li",   metrics: ["cpu", "dio", "ramping", "t12"] },
  invncn:      { name: "Inventory — non-China",     theme: "Cost",       owner: "Shelen Li",   metrics: ["cpu", "dio", "ramping", "t12"] },
  inverp:      { name: "Inventory — ERP",           theme: "Cost",       owner: "Shelen Li",   metrics: ["cpu", "dio", "ramping", "t12"] },
  picn:        { name: "PI — China",                theme: "Partner",    owner: "Rey Zhong",   metrics: ["nps", "cts"] },
  pincn:       { name: "PI — non-China",            theme: "Partner",    owner: "Robert Wang", metrics: ["nps", "cts"] },
  aiauto:      { name: "AI / compliance automation",theme: "Partner",    owner: "William Wang",metrics: ["ramping", "firstpo", "nps", "jbp"] },
  design:      { name: "Design Portfolio",          theme: "Partner",    owner: "Mio Jia",     metrics: ["nps"] },
};

// Whole-list project override, applied before keyword classification. Everything on the
// two Design Portfolio boards is Mio's design work reporting against NPS — the classifier
// would otherwise scatter it across Predict, Inventory and Ad Tech on incidental keywords.
export const PROJECT_BY_LIST = {
  designplanning: "design",
  deliverymap: "design",
};

// Per-ticket overrides, highest precedence of all — they beat both the whole-board rule
// and keyword classification. These are design-board tickets that are really product
// work, confirmed by hand, so they report against that product's metrics and owner.
export const PROJECT_BY_TICKET = {
  "ATECH-7693": "invcn",  // Predict — Sell-Through Tab
  "ATECH-7695": "invcn",  // Predict UI screen — Sell-through tab
  "ATECH-7288": "adtech", // Validation Questions — Campaign Creation Fields & Values
};

// Ownership override by source list. A ticket still rolls up to its project (so the
// metrics stay correct), but the accountable owner comes from here. Design Portfolio
// no longer needs an entry — PROJECT_BY_LIST sends it to the design project, which
// Mio owns outright.
export const OWNER_BY_LIST = {
  automation: "William Wang",
};

export const LISTS = [
  { key: "nimbus",         id: "901708599851", team: "Team Nimbus" },
  { key: "ruyi",           id: "901705110942", team: "Team Ruyi (AdTech)" },
  { key: "techroadmap",    id: "901704252349", team: "Product Portfolio" },
  { key: "discovery",      id: "901704266997", team: "Product Portfolio" },
  { key: "automation",     id: "901715358790", team: "AI Automation" },
  { key: "designplanning", id: "901713322925", team: "Design Portfolio" },
  { key: "deliverymap",    id: "901713356481", team: "Design Portfolio" },
];

const CLOSED = ["closed", "done", "completed", "not doing"];
const IN_FLIGHT = ["in progress", "dev complete", "main focus", "blocked"];

export const isClosed = s => CLOSED.includes((s || "").toLowerCase());
export const flowOf = s => (IN_FLIGHT.includes((s || "").toLowerCase()) ? "inflight" : "queued");

// Returns { project, confident }. project === EXCLUDED means the ticket is dropped.
// confident=false means no keyword matched and we fell back to a default — those are
// the ones a product owner must confirm.
export function classifyProject(listKey, name) {
  const n = (name || "").toLowerCase();
  const hit = p => ({ project: p, confident: true });

  // Whole board takes precedence over any keyword in the title.
  if (PROJECT_BY_LIST[listKey]) return hit(PROJECT_BY_LIST[listKey]);

  if (/\bath-|douyin|xhs|red short|livestream|live stream|short video|social|ccu|leaderboard/.test(n)) return hit("social");
  if (/\bpi\b|asia-pi/.test(n)) {
    if (/non[\s-]?china|non[\s-]?cn|overseas|global|korea|japan|\bkr\b|\bjp\b|coupang|naver|rakuten/.test(n)) return hit("pincn");
    if (/china|\bcn\b|中国|国内/.test(n)) return hit("picn");
    // Chinese-language titles are China work even without the word "China".
    if (/[一-鿿]/.test(n)) return hit("picn");
    return { project: "picn", confident: false };
  }
  if (/\berp\b|netsuite|\bsap\b/.test(n)) return hit("inverp");
  if (/inventory|sell-through|sell through|purchase order|\bpo\b|dio|replenish|stock|shipment/.test(n)) {
    if (/non[\s-]?china|non[\s-]?cn|overseas|global/.test(n)) return hit("invncn");
    if (/china|\bcn\b|国内|中国|库存/.test(n)) return hit("invcn");
    return { project: "invcn", confident: false };
  }
  if (/coupang|naver|rakuten|\bkr\b|korea|japan|jp predict/.test(n)) return hit("predictkrjp");
  if (/ai pilot|bm automation|compliance|automation service|intake|talent crm|csat|reconciliation|sop draft|mbr deck|market intel|tam research|pitch deck|commercial planning|launch coordination|scenario \d/.test(n)) return hit("aiauto");
  if (/campaign|keyword|bid|roas|adczar|adzcar|ad_|ads |ad group|adgroup|advertiser|^us-\d|品牌追击|快车|推广|creative|material|\bctr\b|jd jfs/.test(n)) return hit("adtech");
  // Technical / infrastructure work. Excluded from exec reporting, not re-homed.
  if (/encrypt|ec2|ecs|ci\/cd|terraform|auth|rds|schema|hardcode|partition|security|vulnerab|openssh|migrat|subnet|lambda|design system|token|component build|figma|storybook|chart foundation|governance|baseline|observation ui/.test(n)) {
    return { project: EXCLUDED, confident: true };
  }
  if (/predict|mbs|performance snapshot|war room|brand|insights|protect|defect|bug|校验|backfill|discrepan|data/.test(n)) return hit("predictcn");

  const fallback = { ruyi: "adtech", automation: "aiauto", discovery: "predictkrjp", nimbus: "predictcn" };
  // techroadmap and anything unrecognised falls out rather than inflating a project.
  const f = fallback[listKey];
  return f ? { project: f, confident: false } : { project: EXCLUDED, confident: false };
}
