import { LISTS, PROJECTS, isClosed, flowOf, classifyProject } from "../../../lib/taxonomy";

export const revalidate = 300; // cache 5 min; ClickUp rate limits are tight

const CLICKUP = "https://api.clickup.com/api/v2";

async function fetchList(listId, token) {
  const url = `${CLICKUP}/list/${listId}/task?subtasks=true&include_closed=false&order_by=updated&reverse=true`;
  const res = await fetch(url, { headers: { Authorization: token }, next: { revalidate } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`list ${listId}: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.tasks || [];
}

export async function GET() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    return Response.json(
      { error: "CLICKUP_API_TOKEN is not set. Add it in Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
  }

  const failures = [];
  const tickets = [];

  const results = await Promise.all(
    LISTS.map(l =>
      fetchList(l.id, token)
        .then(tasks => ({ l, tasks }))
        .catch(e => { failures.push(`${l.team} (${l.key}): ${e.message}`); return { l, tasks: null }; })
    )
  );

  for (const { l, tasks } of results) {
    if (!tasks) continue;
    for (const t of tasks) {
      const status = t.status?.status || "";
      if (isClosed(status)) continue;
      const { project, confident } = classifyProject(l.key, t.name);
      const p = PROJECTS[project];
      tickets.push({
        id: t.id,
        cid: t.custom_id || t.id,
        name: t.name,
        url: t.url,
        team: l.team,
        status,
        flow: flowOf(status),
        project,
        theme: p.theme,
        owner: p.owner,
        metrics: p.metrics.slice(),
        needsReview: !confident,
        assignees: (t.assignees || []).map(a => a.username),
      });
    }
  }

  return Response.json({
    fetchedAt: new Date().toISOString(),
    listsTotal: LISTS.length,
    listsFailed: failures.length,
    failures,
    count: tickets.length,
    tickets,
  });
}
