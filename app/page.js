"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { THEMES, METRICS, PROJECTS } from "../lib/taxonomy";

// Stacked horizontal bar: tickets in flight per team, split by theme.
// Respects the theme selection above it, same as the prototype did.
function TeamChart({ inflight, selTheme }) {
  const ref = useRef(null);
  const instance = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const teams = [...new Set(inflight.map(r => r.team))].sort();
    const keys = Object.keys(THEMES).filter(k => !selTheme || k === selTheme);
    const datasets = keys.map(k => ({
      label: THEMES[k].name,
      backgroundColor: THEMES[k].hex,
      data: teams.map(t => inflight.filter(r => r.team === t && r.theme === k).length),
    }));

    if (instance.current) instance.current.destroy();
    instance.current = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: { labels: teams, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.x} in flight` } },
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 11 } },
            title: { display: true, text: "tickets in flight", font: { size: 11 } },
          },
          y: { stacked: true, ticks: { font: { size: 11 } } },
        },
      },
    });

    return () => {
      if (instance.current) {
        instance.current.destroy();
        instance.current = null;
      }
    };
  }, [inflight, selTheme]);

  return <canvas ref={ref} />;
}

const OVERVIEW =
  "For APAC, we are focused on tying our projects to moving the needle for all of Pattern's top metrics — revenue generation, cost automation, and being partner obsessed. Every project below is mapped to the specific metrics it moves, and every ClickUp ticket rolls up to a project.";

const C = {
  bg: "#fff", soft: "#f7f8fa", border: "#e3e6ea", text: "#16181d", muted: "#667085",
};

const S = {
  wrap: { maxWidth: 1180, margin: "0 auto", padding: "22px 22px 56px",
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
    fontSize: 14, color: C.text, background: C.bg },
  h1: { fontSize: 19, margin: "0 0 10px", fontWeight: 700 },
  section: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em",
    color: C.muted, margin: "26px 0 10px", paddingBottom: 6, borderBottom: `1px solid ${C.border}` },
  overview: { background: C.soft, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "14px 16px", fontSize: 13.5, lineHeight: 1.6 },
  banner: (kind) => ({ borderRadius: 8, padding: "9px 13px", fontSize: 12.5, marginTop: 10,
    border: `1px solid ${kind === "warn" ? "#f0c36d" : kind === "ok" ? "#b7e4c7" : C.border}`,
    background: kind === "warn" ? "#fff9ec" : kind === "ok" ? "#f2fbf5" : C.soft,
    color: kind === "warn" ? "#7a5b12" : kind === "ok" ? "#17643a" : C.text }),
  themes: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 },
  projects: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 9 },
  chip: { display: "inline-block", fontSize: 10.5, padding: "2px 7px", borderRadius: 999,
    background: C.soft, border: `1px solid ${C.border}`, color: C.muted, margin: "2px 3px 0 0" },
  th: { textAlign: "left", padding: "7px 8px", borderBottom: `1px solid ${C.border}`,
    color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase",
    position: "sticky", top: 0, background: C.bg },
  td: { textAlign: "left", padding: "7px 8px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" },
  select: { fontSize: 12.5, padding: "6px 8px", border: `1px solid ${C.border}`,
    borderRadius: 6, background: "#fff", color: C.text },
};

export default function Page() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [selTheme, setSelTheme] = useState("");
  const [flow, setFlow] = useState("inflight");
  const [proj, setProj] = useState("");
  const [team, setTeam] = useState("");
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  useEffect(() => {
    fetch("/api/tickets")
      .then(r => r.json())
      .then(j => (j.error ? setErr(j.error) : setData(j)))
      .catch(e => setErr(String(e)));
  }, []);

  const tickets = data?.tickets || [];
  const inflight = useMemo(() => tickets.filter(t => t.flow === "inflight"), [tickets]);
  const queued = useMemo(() => tickets.filter(t => t.flow === "queued"), [tickets]);
  const scoped = useMemo(
    () => (selTheme ? inflight.filter(t => t.theme === selTheme) : inflight),
    [inflight, selTheme]
  );

  const visible = useMemo(() => tickets.filter(t =>
    (!flow || t.flow === flow) &&
    (!selTheme || t.theme === selTheme) &&
    (!proj || t.project === proj) &&
    (!team || t.team === team) &&
    (!owner || t.owner === owner) &&
    (!lowOnly || t.needsReview) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()))
  ), [tickets, flow, selTheme, proj, team, owner, lowOnly, q]);

  const teams = useMemo(() => [...new Set(tickets.map(t => t.team))].sort(), [tickets]);
  const owners = useMemo(() => [...new Set(tickets.map(t => t.owner))].sort(), [tickets]);
  const nLow = tickets.filter(t => t.needsReview).length;

  if (err) return <div style={S.wrap}><h1 style={S.h1}>APAC Technology</h1><div style={S.banner("warn")}>{err}</div></div>;
  if (!data) return <div style={S.wrap}><h1 style={S.h1}>APAC Technology</h1><p style={{ color: C.muted }}>Loading tickets from ClickUp…</p></div>;

  const projectsFor = t => Object.keys(PROJECTS).filter(p => !t || PROJECTS[p].theme === t);

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>APAC Technology — projects to Pattern&apos;s top metrics</h1>
      <div style={S.overview}>{OVERVIEW}</div>

      {data.listsFailed > 0 ? (
        <div style={S.banner("warn")}>
          <strong>{data.listsFailed} of {data.listsTotal} ClickUp lists failed to load</strong> — numbers below are
          incomplete. Usually a rate limit; reload in a few minutes. {data.failures.join(" · ")}
        </div>
      ) : (
        <div style={S.banner("ok")}>
          Loaded {data.count} open tickets from all {data.listsTotal} lists · {new Date(data.fetchedAt).toLocaleString()}
        </div>
      )}

      <div style={S.section}>Themes</div>
      <div style={S.themes}>
        {Object.entries(THEMES).map(([k, th]) => {
          const n = inflight.filter(t => t.theme === k).length;
          const nq = queued.filter(t => t.theme === k).length;
          const on = selTheme === k;
          return (
            <div key={k} onClick={() => setSelTheme(on ? "" : k)}
              style={{ border: `1px solid ${C.border}`, borderTop: `3px solid ${th.hex}`, borderRadius: 10,
                padding: "12px 13px", cursor: "pointer", background: on ? C.soft : C.bg }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: th.hex, marginBottom: 3 }}>{th.name}</div>
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>{th.blurb}</div>
              <div style={{ fontSize: 23, fontWeight: 700, marginTop: 6 }}>{n}</div>
              <div style={{ fontSize: 11.5, color: C.muted }}>in flight · {nq} queued</div>
            </div>
          );
        })}
      </div>

      <div style={S.section}>
        Metrics we&apos;re moving — tickets in flight tagged to each metric
      </div>
      <div style={S.metrics}>
        {Object.entries(METRICS)
          .filter(([, m]) => !selTheme || m.theme === selTheme)
          .map(([k, m]) => {
            const tagged = scoped.filter(t => t.metrics.includes(k));
            const projs = [...new Set(tagged.map(t => t.project))];
            const dim = tagged.length === 0;
            return (
              <div key={k} style={{ border: `1px solid ${C.border}`, borderLeft: `3px solid ${dim ? "#c9ced6" : THEMES[m.theme].hex}`,
                borderRadius: 8, padding: "9px 11px", background: dim ? C.soft : C.bg }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: dim ? C.muted : C.text }}>{m.name}</div>
                {m.target ? <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{m.target}</div> : null}
                <div style={{ fontSize: 11.5, marginTop: 5 }}>
                  {dim ? <span style={{ color: C.muted }}>Nothing in flight against this</span>
                       : <><strong>{tagged.length}</strong> <span style={{ color: C.muted }}>
                           tickets in flight · {projs.length} project{projs.length === 1 ? "" : "s"}</span></>}
                </div>
              </div>
            );
          })}
      </div>

      <div style={S.section}>Projects</div>
      <div style={S.projects}>
        {projectsFor(selTheme).map(p => {
          const pr = PROJECTS[p];
          const hex = THEMES[pr.theme].hex;
          const n = inflight.filter(t => t.project === p).length;
          const nq = queued.filter(t => t.project === p).length;
          return (
            <div key={p} onClick={() => { setProj(p); setFlow("inflight"); }}
              style={{ border: `1px solid ${C.border}`, borderLeft: `3px solid ${hex}`,
                borderRadius: "0 8px 8px 0", padding: "10px 12px", cursor: "pointer" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{pr.name}</div>
              <div style={{ fontSize: 11.5, color: C.muted, margin: "4px 0 2px" }}>
                <strong style={{ color: hex }}>{n}</strong> in flight · {nq} queued
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>owner: {pr.owner}</div>
              {pr.metrics.length
                ? pr.metrics.map(m => <span key={m} style={S.chip}>{METRICS[m].name}</span>)
                : <span style={S.chip}>no metric mapped</span>}
            </div>
          );
        })}
      </div>

      <div style={S.section}>Work in flight, by team</div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, height: 290 }}>
        <TeamChart inflight={scoped} selTheme={selTheme} />
      </div>

      <div style={S.section}>Tickets</div>
      {nLow > 0 && (
        <div style={{ fontSize: 11.5, margin: "-4px 0 9px", color: "#7a5b12" }}>
          {nLow} of {tickets.length} tickets were auto-classified by fallback rather than a keyword match — marked “?”.
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 9 }}>
        <select style={S.select} value={flow} onChange={e => setFlow(e.target.value)}>
          <option value="inflight">In flight now</option>
          <option value="queued">Queue (not started)</option>
          <option value="">Both</option>
        </select>
        <select style={S.select} value={owner} onChange={e => setOwner(e.target.value)}>
          <option value="">All owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select style={S.select} value={proj} onChange={e => setProj(e.target.value)}>
          <option value="">All projects</option>
          {Object.entries(PROJECTS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select style={S.select} value={team} onChange={e => setTeam(e.target.value)}>
          <option value="">All teams</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input style={{ ...S.select, minWidth: 180 }} placeholder="Search ticket…" value={q}
          onChange={e => setQ(e.target.value)} />
        <label style={{ fontSize: 12.5 }}>
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> needs review only
        </label>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>{visible.length} shown</span>
      </div>

      <div style={{ maxHeight: 520, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={S.th}>Ticket</th>
              <th style={{ ...S.th, width: 110 }}>Team</th>
              <th style={{ ...S.th, width: 84 }}>Status</th>
              <th style={{ ...S.th, width: 160 }}>Project</th>
              <th style={{ ...S.th, width: 130 }}>Owner</th>
              <th style={{ ...S.th, width: 210 }}>Metrics</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(t => (
              <tr key={t.id}>
                <td style={S.td}>
                  <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: C.text }}>{t.cid}</a> — {t.name}
                  {t.needsReview && (
                    <span title="Classified by fallback, not a keyword match"
                      style={{ background: "#fff9ec", border: "1px solid #f0c36d", color: "#7a5b12",
                        fontSize: 10.5, padding: "1px 6px", borderRadius: 999, marginLeft: 4 }}>?</span>
                  )}
                </td>
                <td style={{ ...S.td, color: C.muted }}>{t.team}</td>
                <td style={{ ...S.td, color: C.muted }}>{t.status}</td>
                <td style={S.td}>{PROJECTS[t.project].name}</td>
                <td style={{ ...S.td, color: C.muted }}>{t.owner}</td>
                <td style={S.td}>
                  {t.metrics.length
                    ? t.metrics.map(m => <span key={m} style={S.chip}>{METRICS[m].name}</span>)
                    : <span style={{ color: C.muted, fontSize: 11 }}>no metric</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
