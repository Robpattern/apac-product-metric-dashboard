// Single source of truth for the APAC reporting taxonomy.
// The triage tool and the dashboard must agree on these exact names.

export const THEMES = {
  Revenue:    { name: "Revenue generation", hex: "#059669", blurb: "Top line — horizontal, vertical and brand expansion" },
  Cost:       { name: "Cost automation",    hex: "#d97706", blurb: "EBITDA — cost per unit, cost to serve, cash cycle" },
  Partner:    { name: "Partner obsessed",   hex: "#2563eb", blurb: "Partner experience — NPS, JBP, ramping, speed" },
  Foundation: { name: "Data foundations",   hex: "#7c3aed", blurb: "Platform, security and data quality" },
};

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
  social:      { name: "Social / live commerce",    theme: "Revenue",    owner: "Rey Zhong",   metrics: ["revenue", "cts"] },
  invcn:       { name: "Inventory — China",         theme: "Cost",       owner: "Shelen Li",   metrics: ["cpu", "dio", "ramping", "t12"] },
  invncn:      { name: "Inventory — non-China",     theme: "Cost",       owner: "Shelen Li",   metrics: ["cpu", "dio", "ramping", "t12"] },
  inverp:      { name: "Inventory — ERP",           theme: "Cost",       owner: "Shelen Li",   metrics: ["cpu", "dio", "ramping", "t12"] },
  pi:          { name: "PI",                        theme: "Partner",    owner: "Rey Zhong",   metrics: ["nps", "cts"] },
  aiauto:      { name: "AI / compliance automation",theme: "Partner",    owner: "William Wang",metrics: ["ramping", "firstpo", "nps", "jbp"] },
  // Guess pending confirmation: James Lin, since he owns the call on whether this
  // is reported at exec level at all. The design-system slice arguably sits with Mio Jia.
  platform:    { name: "Platform & data foundations", theme: "Foundation", owner: "James Lin", metrics: [] },
};

// Ownership override by source list. A ticket still rolls up to its project (so the
// metrics stay correct), but the accountable owner comes from here when the list is
// listed below. All Design Portfolio work is Mio Jia's regardless of which project
// the classifier routes it to.
export const OWNER_BY_LIST = {
  designplanning: "Mio Jia",
  deliverymap: "Mio Jia",
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

// Returns { project, confident }. confident=false means no keyword matched and we
// fell back to a default — those are the ones a product owner must confirm.
export function classifyProject(listKey, name) {
  const n = (name || "").toLowerCase();
  const hit = p => ({ project: p, confident: true });

  if (/\bath-|douyin|xhs|red short|livestream|live stream|short video|social|ccu|leaderboard/.test(n)) return hit("social");
  if (/\bpi\b|asia-pi/.test(n)) return hit("pi");
  if (/\berp\b|netsuite|\bsap\b/.test(n)) return hit("inverp");
  if (/inventory|sell-through|sell through|purchase order|\bpo\b|dio|replenish|stock|shipment/.test(n)) {
    if (/non[\s-]?china|non[\s-]?cn|overseas|global/.test(n)) return hit("invncn");
    if (/china|\bcn\b|国内|中国|库存/.test(n)) return hit("invcn");
    return { project: "invcn", confident: false };
  }
  if (/coupang|naver|rakuten|\bkr\b|korea|japan|jp predict/.test(n)) return hit("predictkrjp");
  if (/ai pilot|bm automation|compliance|automation service|intake|talent crm|csat|reconciliation|sop draft|mbr deck|market intel|tam research|pitch deck|commercial planning|launch coordination|scenario \d/.test(n)) return hit("aiauto");
  if (/campaign|keyword|bid|roas|adczar|adzcar|ad_|ads |ad group|adgroup|advertiser|^us-\d|品牌追击|快车|推广|creative|material|\bctr\b|jd jfs/.test(n)) return hit("adtech");
  if (/encrypt|ec2|ecs|ci\/cd|terraform|auth|rds|schema|hardcode|partition|security|vulnerab|openssh|migrat|subnet|lambda|design system|token|component build|figma|storybook|chart foundation|governance|baseline|observation ui/.test(n)) return hit("platform");
  if (/predict|mbs|performance snapshot|war room|brand|insights|protect|defect|bug|校验|backfill|discrepan|data/.test(n)) return hit("predictcn");

  const fallback = { ruyi: "adtech", automation: "aiauto", designplanning: "platform", techroadmap: "platform", discovery: "predictkrjp", deliverymap: "predictcn", nimbus: "predictcn" };
  return { project: fallback[listKey] || "platform", confident: false };
}
