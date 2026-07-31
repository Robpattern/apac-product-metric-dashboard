import { PROJECTS, THEMES, METRICS } from "../../../lib/taxonomy";

// Endpoint the triage tool POSTs into once a request has been triaged.
// Nothing is written to ClickUp here — items land in this tool for valuation
// and planning, and only get promoted to a ClickUp ticket when someone decides to.
//
// POST /api/promote
// { "title": "...", "project": "adtech", "metrics": ["cts"], "requester": "...", "notes": "..." }

export async function POST(request) {
  const secret = process.env.TRIAGE_SHARED_SECRET;
  if (secret) {
    const provided = request.headers.get("x-triage-secret");
    if (provided !== secret) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }

  const errors = [];
  if (!body.title || typeof body.title !== "string") errors.push("title is required");
  if (!body.project || !PROJECTS[body.project]) {
    errors.push(`project must be one of: ${Object.keys(PROJECTS).join(", ")}`);
  }
  const metrics = Array.isArray(body.metrics) ? body.metrics : [];
  const allowed = body.project && PROJECTS[body.project] ? PROJECTS[body.project].metrics : [];
  for (const m of metrics) {
    if (!METRICS[m]) errors.push(`unknown metric: ${m}`);
    else if (!allowed.includes(m)) errors.push(`metric ${m} is not mapped to project ${body.project}`);
  }
  if (errors.length) return Response.json({ errors }, { status: 422 });

  const p = PROJECTS[body.project];
  const item = {
    id: `triage-${Date.now()}`,
    receivedAt: new Date().toISOString(),
    title: body.title,
    project: body.project,
    projectName: p.name,
    theme: p.theme,
    themeName: THEMES[p.theme].name,
    owner: p.owner,
    metrics,
    requester: body.requester || null,
    notes: body.notes || null,
    stage: "pre-requirement",
    clickupTaskId: null,
  };

  // TODO: persist to Vercel Postgres or KV. In-memory storage would not survive
  // a serverless cold start, so this deliberately does not pretend to store it.
  console.log("[promote] accepted", JSON.stringify(item));

  return Response.json(
    {
      accepted: item,
      warning:
        "Accepted and validated, but not yet persisted — attach Vercel Postgres or KV and write the insert here before relying on this in production.",
    },
    { status: 202 }
  );
}

export async function GET() {
  return Response.json({
    endpoint: "POST /api/promote",
    purpose: "Triage tool posts triaged requests here for valuation and planning, upstream of ClickUp.",
    projects: Object.fromEntries(
      Object.entries(PROJECTS).map(([k, v]) => [k, { name: v.name, theme: v.theme, owner: v.owner, metrics: v.metrics }])
    ),
    metrics: Object.fromEntries(Object.entries(METRICS).map(([k, v]) => [k, v.name])),
  });
}
