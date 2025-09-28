import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Leaderboard.jsx — Weekly + Lifetime on same page (CLEAN COPY)
 *
 * Firestore Collections:
 *   members/{id}      => { displayName: string, shift?: 'A'|'B'|'C' }
 *   progress/{id}     => { pct: number (0-100), passed: boolean, lastUpdated?: Timestamp }
 *   weeklyLogs/{auto} => { memberId: string, amount: number, weekKey: 'YYYY-Www', ts: serverTimestamp() }
 *
 * Features:
 *   - Real-time members & progress
 *   - Weekly logging (adds entries to weeklyLogs)
 *   - Lifetime = SUM(all weeklyLogs per member)
 *   - Weekly leaderboard (current Mon→Sun) + main table with Week & Lifetime columns
 *   - CSV export
 *   - No external icon packages
 */

// ====== CONFIG =============================================================
const SHIFTS = ["A", "B", "C"]; // customize
const OWNER_EMAILS = ["mrauschenbach@rocketmail.com", "mattrauschenbach@gmail.com"]; // editors
const MENTOR_EMAILS = ["mentor1@gmail.com", "mentor2@gmail.com"]; // editors

// Week helpers (Mon→Sun)
function getWeekKey(dateIn = new Date()) {
  const d = new Date(dateIn.getFullYear(), dateIn.getMonth(), dateIn.getDate());
  const day = (d.getDay() + 6) % 7; // Monday=0
  const monday = new Date(d); monday.setDate(d.getDate() - day);
  const year = monday.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const jan1day = (jan1.getDay() + 6) % 7;
  const firstMonday = new Date(year, 0, 1 - jan1day);
  const diffMs = monday - firstMonday;
  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}
const CURRENT_WEEK_KEY = getWeekKey();

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

function AuthButton({ auth, user }) {
  const provider = new GoogleAuthProvider();
  return user ? (
    <button onClick={() => signOut(auth)} className="rounded-xl border px-3 py-1 text-sm">
      Sign out ({user.email})
    </button>
  ) : (
    <button onClick={() => signInWithPopup(auth, provider)} className="rounded-xl border px-3 py-1 text-sm">
      Sign in with Google
    </button>
  );
}

export default function Leaderboard() {
  const [db] = useState(() => getFirestore());
  const [auth] = useState(() => getAuth());

  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]); // {id, displayName, shift}
  const [progress, setProgress] = useState({}); // id -> {pct, passed, lastUpdated?}
  const [weeklyLogs, setWeeklyLogs] = useState([]); // [{id, memberId, amount, weekKey, ts}]

  const [search, setSearch] = useState("");
  const [shift, setShift] = useState("All");
  const [status, setStatus] = useState("All"); // All | Passed | In Progress
  const [sort, setSort] = useState("Progress"); // Progress | Name | Shift | Recent

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, [auth]);

  const isOwner = useMemo(() => {
    const email = user?.email?.toLowerCase?.();
    return email ? OWNER_EMAILS.map((e) => e.toLowerCase()).includes(email) : false;
  }, [user]);
  const isMentor = useMemo(() => {
    const email = user?.email?.toLowerCase?.();
    return email ? MENTOR_EMAILS.map((e) => e.toLowerCase()).includes(email) : false;
  }, [user]);
  const isEditor = isOwner || isMentor;

  // realtime members
  useEffect(() => {
    const qMembers = query(collection(db, "members"), orderBy("displayName"));
    const unsub = onSnapshot(qMembers, (snap) => {
      const ms = [];
      snap.forEach((d) => {
        const m = d.data();
        ms.push({ id: d.id, displayName: m.displayName || "Firefighter", shift: m.shift || "" });
      });
      setMembers(ms);
    });
    return () => unsub();
  }, [db]);

  // realtime progress
  useEffect(() => {
    const qProg = query(collection(db, "progress"));
    const unsub = onSnapshot(qProg, (snap) => {
      const map = {};
      snap.forEach((d) => {
        const p = d.data();
        map[d.id] = { pct: typeof p.pct === "number" ? p.pct : 0, passed: !!p.passed, lastUpdated: p.lastUpdated };
      });
      setProgress(map);
    });
    return () => unsub();
  }, [db]);

  // realtime weekly logs
  useEffect(() => {
    const qLogs = query(collection(db, "weeklyLogs"));
    const unsub = onSnapshot(qLogs, (snap) => {
      const rows = [];
      snap.forEach((d) => {
        const x = d.data();
        rows.push({ id: d.id, memberId: x.memberId, amount: Number(x.amount) || 0, weekKey: x.weekKey || "", ts: x.ts });
      });
      setWeeklyLogs(rows);
    });
    return () => unsub();
  }, [db]);

  // compose rows with aggregated weekly totals
  const rows = useMemo(() => {
    const lifetimeTotals = new Map();
    const currentWeekTotals = new Map();
    for (const w of weeklyLogs) {
      lifetimeTotals.set(w.memberId, (lifetimeTotals.get(w.memberId) || 0) + (w.amount || 0));
      if (w.weekKey === CURRENT_WEEK_KEY) {
        currentWeekTotals.set(w.memberId, (currentWeekTotals.get(w.memberId) || 0) + (w.amount || 0));
      }
    }

    const base = members.map((m) => {
      const p = progress[m.id] || { pct: 0, passed: false };
      return {
        id: m.id,
        name: m.displayName || "Firefighter",
        shift: m.shift || "",
        pct: Math.max(0, Math.min(100, Number(p.pct) || 0)),
        passed: !!p.passed,
        lastUpdated: p.lastUpdated || null,
        lifetime: lifetimeTotals.get(m.id) || 0,
        week: currentWeekTotals.get(m.id) || 0,
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
    return sorted.map((r, i) => ({ rank: i + 1, ...r }));
  }, [members, progress, weeklyLogs, search, shift, status, sort]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const passed = rows.filter((r) => r.passed).length;
    const avg = rows.reduce((s, r) => s + r.pct, 0) / (total || 1);
    const rate = total ? Math.round((passed / total) * 100) : 0;
    const weekSum = rows.reduce((s, r) => s + (r.week || 0), 0);
    const lifeSum = rows.reduce((s, r) => s + (r.lifetime || 0), 0);
    return { total, passed, avg: Math.round(avg), rate, weekSum, lifeSum };
  }, [rows]);

  const exportCSV = useCallback(() => {
    const headers = ["Rank", "Name", "Shift", "Progress(%)", "Status", "Week Total", "Lifetime Total", "Last Updated"];
    const lines = rows.map((r) => [r.rank, r.name, r.shift || "-", Math.round(r.pct), r.passed ? "Passed" : "In Progress", r.week, r.lifetime, timeAgo(r.lastUpdated || null)]);
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

  // quick weekly log form (editors only)
  const [logAmount, setLogAmount] = useState("");
  const [logMember, setLogMember] = useState("");
  const addWeekly = useCallback(async () => {
    const amount = Number(logAmount);
    const isEditor = (() => {
      const email = auth.currentUser?.email?.toLowerCase?.();
      return email ? OWNER_EMAILS.concat(MENTOR_EMAILS).map(e=>e.toLowerCase()).includes(email) : false;
    })();
    if (!isEditor) return alert("Not allowed");
    if (!logMember) return alert("Pick a member");
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a positive number");
    try {
      await addDoc(collection(db, "weeklyLogs"), {
        memberId: logMember,
        amount,
        weekKey: CURRENT_WEEK_KEY,
        ts: serverTimestamp(),
      });
      setLogAmount("");
    } catch (e) {
      console.error(e); alert(`Failed: ${e?.code || e}`);
    }
  }, [db, auth, logAmount, logMember]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-600">Weekly + lifetime totals. Week: {CURRENT_WEEK_KEY}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="rounded-xl border px-3 py-2 text-sm shadow-sm hover:bg-slate-50">Export CSV</button>
          <AuthButton auth={auth} user={auth.currentUser} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
        <StatCard label="Members" value={kpis.total} />
        <StatCard label="Passed" value={kpis.passed} sub={`${kpis.rate}% pass rate`} />
        <StatCard label="Avg Progress" value={`${kpis.avg}%`} />
        <StatCard label="Week Total" value={kpis.weekSum} />
        <StatCard label="Lifetime Total" value={kpis.lifeSum} />
        <StatCard label="Week Key" value={CURRENT_WEEK_KEY} />
      </div>

      {/* Weekly quick log (Editors only) */}
      <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold">Add Weekly Log (Mon→Sun)</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Member</label>
            <select value={logMember} onChange={(e)=>setLogMember(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option value="">Select member…</option>
              {members.map(m=> <option key={m.id} value={m.id}>{m.displayName || 'Firefighter'}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Amount</label>
            <input type="number" value={logAmount} onChange={(e)=>setLogAmount(e.target.value)} placeholder="e.g., 500" className="mt-1 w-full rounded-xl border px-3 py-2" />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button onClick={addWeekly} className="w-full rounded-xl border px-3 py-2 text-sm shadow-sm hover:bg-slate-50">Add</button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">Week: {CURRENT_WEEK_KEY} · Entries post to <code>weeklyLogs</code>.</div>
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

      {/* Main Table (shows week + lifetime) */}
      <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="hidden grid-cols-12 gap-3 border-b px-4 py-3 text-xs text-slate-500 md:grid">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Shift</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1">Week</div>
          <div className="col-span-2">Lifetime</div>
        </div>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
              <div className="col-span-2 text-sm font-semibold md:col-span-1">{r.rank}</div>
              <div className="col-span-10 md:col-span-4">
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
              <div className="col-span-3 md:col-span-1 text-sm">{r.week}</div>
              <div className="col-span-3 md:col-span-2 text-sm">{r.lifetime}</div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-600">No members match your filters.</li>
          )}
        </ul>
      </div>

      {/* Weekly Leaderboard (current week only) */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Weekly Leaderboard</h2>
          <div className="text-sm text-slate-500">{CURRENT_WEEK_KEY}</div>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <ul className="divide-y">
            {rows
              .filter(r => (r.week || 0) > 0)
              .sort((a, b) => (b.week || 0) - (a.week || 0))
              .map((r, i) => (
                <li key={r.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
                  <div className="col-span-2 text-sm font-semibold md:col-span-1">{i + 1}</div>
                  <div className="col-span-6 md:col-span-6 text-sm font-medium">{r.name}</div>
                  <div className="col-span-4 md:col-span-5 text-right text-sm">{r.week}</div>
                </li>
              ))}
            {rows.filter(r => (r.week || 0) > 0).length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-600">No weekly entries yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">Leaderboard · Garfield Heights · {new Date().toLocaleDateString()}</div>
    </div>
  );
}
