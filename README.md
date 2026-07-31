# APAC Tech Dashboard

Where APAC engineering effort sits against Pattern's top metrics.
Structure: **Overview → Themes → Metrics → Projects → Tickets**.

Reads ClickUp server-side. Designed so the triage tool can post triaged requests in
*upstream* of ClickUp — planning is an input to ClickUp, not something living inside it.

## Deploy

1. Push this directory to a private GitHub repo.
2. In Vercel: **Add New → Project → Import** that repo. Framework auto-detects as Next.js.
3. **Settings → Environment Variables**, add `CLICKUP_API_TOKEN` (ClickUp → Settings → Apps → API Token).
   Optionally add `TRIAGE_SHARED_SECRET`.
4. Deploy. Redeploy after adding env vars — they are not picked up retroactively.

Restrict access via **Settings → Deployment Protection → Vercel Authentication**, or put
Google OAuth in front and allow only `@pattern.com`.

## Local

```bash
npm install
cp .env.example .env.local   # then paste your token into .env.local
npm run dev                  # http://localhost:3000
npm run build                # verify it compiles before pushing
```

## Layout

```
lib/taxonomy.js           themes, metrics, projects, owners, classifier — single source of truth
app/api/tickets/route.js  server-side ClickUp fetch + classification (5 min cache)
app/api/promote/route.js  POST endpoint for the triage tool; GET returns the accepted vocabulary
app/page.js               the dashboard
```

**`lib/taxonomy.js` is the contract.** The triage tool must emit these exact project keys and
metric keys. `GET /api/promote` returns them as JSON so the triage tool can validate against it
rather than hardcoding a copy.

## Known gaps

- **`/api/promote` validates but does not persist.** A serverless function has no memory between
  invocations, so accepted items are logged and dropped. Attach Vercel Postgres or KV and write the
  insert before depending on it. It returns `202` with a warning saying so.
- **Ticket classification is keyword-based and imperfect.** `classifyProject` returns
  `confident: false` when no keyword matched and it fell back to a list default; those render with a
  `?` and are filterable via "needs review only". It can also be *confidently wrong* — ATECH-7428 was
  routed to Predict China because its title led with "Defect", until "ad group" was added to the rules.
  Product owners should skim their whole project, not only the flagged rows.
- **No write-back to ClickUp.** Deliberate: corrections are confirmed by product owners first. The
  ClickUp custom-field write path is verified working and can be added here later.
- **ClickUp rate limits are tight.** Hence the 5 minute cache. If lists fail the UI says which ones
  and why rather than rendering zeros as if they were real — that bug cost us an afternoon.
- **Metrics are inherited from the project.** Per-ticket metric overrides exist in the prototype but
  are not wired up here; add a store first, same as `/api/promote`.

## Scope

Boards covered: Team Nimbus, Team Ruyi (AdTech), Product Portfolio (Technical Roadmap +
Discovery Pipeline), AI Automation, Design Portfolio (Planning + Delivery Map).

"In flight" = in progress, dev complete, blocked, main focus. Everything else open is "queue".
The distinction matters: a large queue reflects what the team cannot get to at current size,
not how it chose to spend its time.
