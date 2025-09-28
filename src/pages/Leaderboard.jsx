import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * Leaderboard.jsx — Revamped leaderboard page
 * - Real-time updates from Firestore
 * - Filters: search, shift, status
 * - Sorting: Progress %, Name, Shift, Recently Updated (if available)
 * - KPIs: total members, passed count, avg progress, pass rate
 * - Clean, phone-friendly UI with Tailwind
 * - CSV export
 *
 * Expected data shape:
 *   members/{id} => { displayName: string, shift: 'A'|'B'|'C'|'' }
 *   progress/{id} => { pct: number (0-100), passed: boolean, lastUpdated?: Timestamp }
 */

const SHIFTS = ["A", "B", "C"];

function timeAgo(date) {
  if (!date) return "—";
  const d = typeof date === "number" ? new Date(date) : date.toDate?.() ?? date;
  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default function Leaderboard() {
  const [db] = useState(() => getFirestore());
  const [auth] = useState(() => getAuth());

  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]); // {id, displayName, shift}
  const [progress, setProgress] = useState({}); // id -> {pct, passed, lastUpdated?}

  const [search, setSearch] = useState("");
  const [shift, setShift] = useState("All");
  const [status, setStatus] = useState("All"); // All | Passed | In Progress
  const [sort, setSort] = useState("Progress"); // Progress | Name | Shift | Recent

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return () => unsubAuth();
  }, [auth]);

  // Realtime members
  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      const ms = [];
      snap.forEach((d) => {
        const m = d.data();
        ms.push({ id: d.id, displayName: m.displayName || "Firefighter", shift: m.shift || "" });
      });
      setMembers(ms);
    });
    return () => unsub();
  }, [db]);

  // Realtime progress
  useEffect(() => {
    const q = query(collection(db, "progress"));
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.forEach((d) => {
        const p = d.data();
        map[d.id] = { pct: typeof p.pct === "number" ? p.pct : 0, passed: !!p.passed, lastUpdated: p.lastUpdated };
      });
      setProgress(map);
    });
    return () => unsub();
  }, [db]);

  // Compose rows
  const rows = useMemo(() => {
    const base = members.map((m) => {
      const p = progress[m.id] || { pct: 0, passed: false };
      return {
        id: m.id,
        name: m.displayName || "Firefighter",
        shift: m.shift || "",
        pct: Math.max(0, Math.min(100, Number(p.pct) || 0)),
        passed: !!p.passed,
        lastUpdated: p.lastUpdated || null,
      };
    });

    const q = search.trim().toLowerCase();
    let filtered = base.filter((r) => (q ? r.name.toLowerCase().includes(q) : true));

    if (SHIFTS.includes(shift)) filtered = filtered.filter((r) => (r.shift || "").toUpperCase() === shift);

    if (status === "Passed") filtered = filtered.filter((r) => r.passed);
    if (status === "In Progress") filtered = filtered.filter((r) => !r.passed);

    const by = {
      Progress: (a, b) => b.pct - a.pct || a.name.localeCompare(b.name),
      Name: (a, b) => a.name.localeCompare(b.name),
      Shift: (a, b) => (a.shift || "").localeCompare(b.shift || "") || a.name.localeCompare(b.name),
      Recent: (a, b) => (b.lastUpdated?.toMillis?.() || 0) - (a.lastUpdated?.toMillis?.() || 0),
    }[sort];

    const sorted = [...filtered].sort(by);

    // Rank by displayed order
    return sorted.map((r, i) => ({ rank: i + 1, ...r }));
  }, [members, progress, search, shift, status, sort]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const passed = rows.filter((r) => r.passed).length;
    const avg = rows.reduce((s, r) => s + r.pct, 0) / (total || 1);
    const rate = total ? Math.round((passed / total) * 100) : 0;
    return { total, passed, avg: Math.round(avg), rate };
  }, [rows]);

  const exportCSV = useCallback(() => {
    const headers = ["Rank", "Name", "Shift", "Progress(%)", "Status", "Last Updated"];
    const lines = rows.map((r) => [r.rank, r.name, r.shift || "-", Math.round(r.pct), r.passed ? "Passed" : "In Progress", timeAgo(r.lastUpdated || null)]);
    const csv = [headers, ...lines].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-600">Live rankings by progress with filters for shift and status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="rounded-xl border px-3 py-2 text-sm shadow-sm hover:bg-slate-50">Export CSV</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Members" value={kpis.total} />
        <StatCard label="Passed" value={kpis.passed} sub={`${kpis.rate}% pass rate`} />
        <StatCard label="Avg Progress" value={`${kpis.avg}%`} />
        <StatCard label="Updated" value={new Date().toLocaleDateString()} />
      </div>

      {/* Controls */}
      <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name…" className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Shift</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option>All</option>
              {SHIFTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option>All</option>
              <option>Passed</option>
              <option>In Progress</option>
            </select>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="text-xs text-slate-600">Sort by</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option>Progress</option>
              <option>Name</option>
              <option>Shift</option>
              <option>Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="hidden grid-cols-12 gap-3 border-b px-4 py-3 text-xs text-slate-500 md:grid">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Shift</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2">Updated</div>
        </div>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
              <div className="col-span-2 text-sm font-semibold md:col-span-1">{r.rank}</div>
              <div className="col-span-10 md:col-span-5">
                <div className="text-sm font-medium">{r.name}</div>
                <div className="mt-1 flex items-center gap-2 md:hidden">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Shift {r.shift || '-'}</span>
                  <span className={"rounded-full px-2 py-0.5 text-xs " + (r.passed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{r.passed ? "Passed" : "In Progress"}</span>
                </div>
              </div>
              <div className="col-span-4 hidden md:block md:col-span-2 text-sm">Shift {r.shift || '-'}</div>
              <div className="col-span-6 md:col-span-2">
                <div className="h-2 w-full rounded bg-slate-200">
                  <div className={"h-2 rounded " + (r.passed ? "bg-emerald-500" : "bg-sky-500")} style={{ width: `${Math.round(r.pct)}%` }} />
                </div>
                <div className="mt-1 text-xs text-slate-600">{Math.round(r.pct)}% {r.passed ? "(Passed)" : "to tier"}</div>
              </div>
              <div className="col-span-6 text-xs text-slate-500 md:col-span-2 md:text-sm">{timeAgo(r.lastUpdated)}</div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-600">No members match your filters.</li>
          )}
        </ul>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">Leaderboard · Garfield Heights · {new Date().toLocaleDateString()}</div>
    </div>
  );
}
