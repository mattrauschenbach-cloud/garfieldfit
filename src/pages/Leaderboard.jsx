import React, { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";

/**
 * StandardsBoard.jsx — Polished / Cooler UI
 * - Same logic, refreshed visual design.
 * - Gradient hero, glass cards, icons, subtle animations, better progress bars.
 * - Owners + Mentors can edit (sliders & checkboxes).
 */

// ---- ACCESS LISTS ---------------------------------------------------------
const OWNER_EMAILS = [
  "mrauschenbach@rocketmail.com", // old
  "mattrauschenbach@gmail.com",   // current
];

// Mentors who can also check off tiers (edit this list)
const MENTOR_EMAILS = [
  "mentor1@gmail.com",
  "mentor2@gmail.com",
];

// ---- STATIC STANDARDS DATA -----------------------------------------------
const STANDARDS = {
  Developmental: [
    { id: "dev-1.5mi", label: "1.5 Mile Run ≤ 13:15" },
    { id: "dev-pushups", label: "Push-ups (max in 2 min)" },
    { id: "dev-situps", label: "Sit-ups (max in 2 min)" },
    { id: "dev-plank", label: "Plank Hold (min)" },
  ],
  Advanced: [
    { id: "adv-1.5mi", label: "1.5 Mile Run ≤ 12:00" },
    { id: "adv-pushups", label: "Push-ups (higher tier)" },
    { id: "adv-sleddrag", label: "Hose/Sled Drag for time" },
  ],
  Elite: [
    { id: "elite-1.5mi", label: "1.5 Mile Run ≤ 10:30" },
    { id: "elite-circuit", label: "Full Circuit (see packet)" },
    { id: "elite-stairclimb", label: "Stair Climb loaded for time" },
  ],
};

const CIRCUIT = [
  "100 Push-ups",
  "100 Air Squats",
  "50 Burpees",
  "50 Sit-ups",
  "25 Lunges each leg",
  "25 Pull-ups",
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function AuthButton({ auth, user }) {
  const provider = new GoogleAuthProvider();
  return user ? (
    <button onClick={() => signOut(auth)} className="rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur hover:bg-white/20">
      Sign out ({user.email})
    </button>
  ) : (
    <button onClick={() => signInWithPopup(auth, provider)} className="rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur hover:bg-white/20">
      Sign in with Google
    </button>
  );
}

export default function StandardsBoard() {
  const [db] = useState(() => getFirestore());
  const [auth] = useState(() => getAuth());

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [progress, setProgress] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
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

  // Load data
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const membersSnap = await getDocs(query(collection(db, "members"), orderBy("displayName")));
        const ms = [];
        membersSnap.forEach((d) => {
          const data = d.data();
          ms.push({ id: d.id, displayName: data.displayName || "Firefighter", shift: data.shift || "" });
        });
        const progressSnap = await getDocs(collection(db, "progress"));
        const map = {};
        progressSnap.forEach((d) => {
          const data = d.data();
          map[d.id] = { pct: typeof data.pct === "number" ? data.pct : 0, passed: !!data.passed };
        });
        if (mounted) { setMembers(ms); setProgress(map); }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [db]);

  // Build boards
  const boards = useMemo(() => {
    const passed = [];
    const inprog = [];
    for (const m of members) {
      const p = progress[m.id];
      if (!p) continue;
      const row = { id: m.id, name: m.displayName || "Firefighter", shift: m.shift || "", pct: p.pct };
      if (p.passed) { passed.push(row); } else { inprog.push(row); }
    }
    passed.sort((a, b) => a.name.localeCompare(b.name));
    inprog.sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));
    return { passed, inprog };
  }, [members, progress]);

  // Save action
  const updateMemberProgress = async (memberId, data) => {
    try {
      setSavingId(memberId);
      const ref = doc(db, "progress", memberId);
      await setDoc(ref, { pct: 0, passed: false }, { merge: true });
      await updateDoc(ref, data);
      setProgress((prev) => ({ ...prev, [memberId]: { ...prev[memberId], ...data } }));
    } catch (e) {
      console.error(e);
      alert(`Failed to save: ${e?.code || e}`);
    } finally {
      setSavingId(null);
    }
  };

  const TierCard = ({ title, items, tone = "slate" }) => (
    <div className={classNames(
      "group rounded-3xl border p-5 shadow-sm transition hover:shadow-md",
      "bg-white/70 backdrop-blur",
      "border-", tone, "-200"
    )}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {title === 'Elite' ? (
            <span className="inline-block">🏆</span>
          ) : title === 'Advanced' ? (
            <span className="inline-block">🛡️</span>
          ) : (
            <span className="inline-block">✨</span>
          )}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {items.length} items
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-400 group-hover:bg-slate-500" />
            <span className="text-sm text-slate-800">{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const MemberRow = ({ m }) => {
    const p = progress[m.id] || { pct: 0, passed: false };
    const pct = Math.max(0, Math.min(100, p.pct || 0));
    return (
      <div className="group grid grid-cols-12 items-center gap-3 rounded-3xl border bg-white/70 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
        <div className="col-span-5 md:col-span-4">
          <div className="flex items-center gap-2">
            <span className="inline-block">👥</span>
            <div className="font-semibold">{m.displayName || "Firefighter"}</div>
          </div>
          <div className="text-sm text-gray-500">Shift {m.shift || "-"}</div>
        </div>
        <div className="col-span-4 md:col-span-5">
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className={classNames(
                "h-2 rounded-full transition-all",
                p.passed ? "bg-emerald-500" : "bg-sky-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-600 flex items-center gap-1">
            {p.passed ? <span className="inline-block">✔️</span> : <span className="inline-block">⏱️</span>}
            {p.passed ? "Passed" : `${Math.round(pct)}% to tier`}
          </div>
        </div>
        <div className="col-span-3 md:col-span-3 flex items-center justify-end">
          <span
            className={classNames(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
              p.passed ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-600/10 text-amber-700"
            )}
          >
            {p.passed ? <span className="inline-block">✔️</span> : <span className="inline-block">⏱️</span>}
            {p.passed ? "Passed" : "In Progress"}
          </span>
        </div>
        {isEditor && (
          <div className="col-span-12 mt-3 grid grid-cols-12 items-center gap-3">
            <div className="col-span-8 md:col-span-9">
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => updateMemberProgress(m.id, { pct: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>
            <label className="col-span-4 md:col-span-3 flex items-center justify-end gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!p.passed}
                onChange={(e) => updateMemberProgress(m.id, { passed: e.target.checked })}
                className="h-4 w-4 accent-emerald-600"
              />
              <span>Mark Passed</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* HERO */}
      <div className="relative isolate">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:pt-14">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
                <span className="inline-block">✨</span>
                {isEditor ? "Editing enabled (owner/mentor)" : "Read-only"}
              </div>
              <h1 className="mt-3 bg-gradient-to-br from-white to-white/70 bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
                Standards Board
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                View all tiers, track member progress, and recognize excellence across Garfield Heights.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {savingId && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-amber-200 backdrop-blur">
                  Saving…
                </div>
              )}
              <AuthButton auth={auth} user={user} />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 pb-14">
        {/* Tiers */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <TierCard title="Developmental" items={STANDARDS.Developmental} tone="emerald" />
          <TierCard title="Advanced" items={STANDARDS.Advanced} tone="sky" />
          <TierCard title="Elite" items={STANDARDS.Elite} tone="amber" />
        </div>

        {/* Circuit */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-white/80 shadow-sm backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="inline-block">🛡️</span>Circuit (from packet)</div>
          <div className="text-sm">{CIRCUIT.join(" • ")}</div>
        </div>

        {/* Members */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between text-white">
            <h2 className="text-xl font-semibold">Members</h2>
            <div className="text-sm text-white/70">{members.length} total</div>
          </div>
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-sm backdrop-blur">
              Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-sm backdrop-blur">
              No members found. Add users to the <code>members</code> collection.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {members.map((m) => (
                <MemberRow key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>

        {/* Boards */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block">✔️</span>
                <h3 className="text-lg font-semibold">Passed</h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                {boards.passed.length}
              </span>
            </div>
            {boards.passed.length === 0 ? (
              <div className="text-sm text-white/70">No one has passed yet.</div>
            ) : (
              <ul className="space-y-2">
                {boards.passed.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-white/70">Shift {r.shift || "-"}</div>
                    </div>
                    <span className="text-xs text-white/70">{Math.round(r.pct)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block">⏱️</span>
                <h3 className="text-lg font-semibold">In Progress</h3>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                {boards.inprog.length}
              </span>
            </div>
            {boards.inprog.length === 0 ? (
              <div className="text-sm text-white/70">No active attempts.</div>
            ) : (
              <ul className="space-y-2">
                {boards.inprog.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-white/70">Shift {r.shift || "-"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/70">{Math.round(r.pct)}%</div>
                      <div className="text-[10px] text-white/60">to tier</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-white/60">
          Standards Board · Garfield Heights · Last updated {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
