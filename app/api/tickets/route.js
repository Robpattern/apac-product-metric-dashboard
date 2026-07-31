import {
  FOLDERS,
  STANDALONE_LISTS,
  PROJECTS,
  OWNER_BY_LIST,
  PROJECT_BY_TICKET,
  EXCLUDED,
  isClosed,
  flowOf,
  sprintInfo,
  classifyProject,
} from "../../../lib/taxonomy";

// Read the query string, so the route must be dynamic. Caching is handled per-fetch
// below: 5 min normally, bypassed entirely when the Sync button asks for fresh data.
export const dynamic = "force-dynamic";

const CACHE_SECONDS = 300; // ClickUp rate limits are tight

const CLICKUP = "https://api.clickup.com/api/v2";

function cacheOpts(fresh) {
  return fresh ? { cache: "no-store" } : { next: { revalidate: CACHE_SECONDS } };
}

// Enumerate the lists inside a folder. This is what makes sprint rollover a non-event:
// when Sprint 15 is created it appears here automatically.
async function fetchFolderLists(folder, token, fresh) {
  const res = await fetch(`${CLICKUP}/folder/${folder.id}/list?archived=false`, {
    headers: { Authorization: token },
    ...cacheOpts(fresh),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`folder ${folder.id}: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.lists || []).map(l => ({
    // A folder can need different fallback rules per list (Product Portfolio does).
    key: (folder.listKeys && folder.listKeys[l.name]) || folder.key,
    id: l.id,
    team: folder.team,
    listName: l.name,
  }));
}

async function fetchList(listId, token, fresh) {
  // subtasks=false: subtasks were pulling Sprint 12 tickets in through backlog parents,
  // which is how last sprint's work looked like current work. Sprint lists are read
  // directly now, so the tickets arrive under their real list instead.
  const url = `${CLICKUP}/list/${listId}/task?subtasks=false&include_closed=false&order_by=updated&reverse=true`;
  const res = await fetch(url, { headers: { Authorization: token }, ...cacheOpts(fresh) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`list ${listId}: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.tasks || [];
}

export async function GET(request) {
  const fresh = new URL(request.url).searchParams.get("refresh") === "1";
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    return Response.json(
      { error: "CLICKUP_API_TOKEN is not set. Add it in Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
  }

  const failures = [];

  // Step 1: resolve folders to their current lists.
  const resolved = await Promise.all(
    FOLDERS.map(f =>
      fetchFolderLists(f, token, fresh).catch(e => {
        failures.push(`${f.team} folder: ${e.message}`);
        return [];
      })
    )
  );
  const lists = [...resolved.flat(), ...STANDALONE_LISTS];

  // Step 2: pull tickets from every list.
  const tickets = [];
  let excluded = 0;

  const results = await Promise.all(
    lists.map(l =>
      fetchList(l.id, token, fresh)
        .then(tasks => ({ l, tasks }))
        .catch(e => {
          failures.push(`${l.team} → ${l.listName}: ${e.message}`);
          return { l, tasks: null };
        })
    )
  );

  const now = new Date();

  for (const { l, tasks } of results) {
    if (!tasks) continue;
    const sprint = sprintInfo(l.listName, now);
    for (const t of tasks) {
      const status = t.status?.status || "";
      if (isClosed(status)) continue;

      const cid = t.custom_id || t.id;
      const override = PROJECT_BY_TICKET[cid];
      const classified = classifyProject(l.key, t.name);
      const project = override || classified.project;
      const confident = override ? true : classified.confident;
      if (project === EXCLUDED) { excluded++; continue; }

      const p = PROJECTS[project];
      tickets.push({
        id: t.id,
        cid,
        name: t.name,
        url: t.url,
        team: l.team,
        list: l.listName, // which sprint or backlog this came from
        sprint: sprint.isSprint ? `Sprint ${sprint.number}` : null,
        // active | past | future | none — "none" covers backlogs and the teams
        // that don't run sprints at all.
        sprintState: sprint.state,
        status,
        flow: flowOf(status),
        project,
        theme: p.theme,
        owner: OWNER_BY_LIST[l.key] || p.owner,
        metrics: p.metrics.slice(),
        needsReview: !confident,
        assignees: (t.assignees || []).map(a => a.username),
      });
    }
  }

  return Response.json({
    fetchedAt: new Date().toISOString(),
    listsTotal: lists.length,
    listsFailed: failures.length,
    failures,
    lists: lists.map(l => `${l.team} → ${l.listName}`),
    count: tickets.length,
    excluded, // technical work dropped from exec reporting
    tickets,
  });
}
