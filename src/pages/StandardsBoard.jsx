import React, { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
 * StandardsBoard.jsx — FULL COPY, FIXED
 * - Compiles with Vite + React
 * - Uses Firebase v9 modular SDK
 * - Renders all standards (Developmental / Advanced / Elite)
 * - Shows member progress; only owner can edit
 * - Includes a Passed vs In-Progress board with the fixed if/else braces
 *
 * 📌 Setup expected:
 *   - You have Firebase initialized somewhere in your app
 *   - If you already export `auth` and `db` from a file like `src/lib/firebase.js`,
 *     you can replace the getAuth()/getFirestore() calls with your imports.
 */

// ---- CONFIGURE OWNER ACCESS ----------------------------------------------
// Add your owner emails here. Only these users will be able to edit standards
const OWNER_EMAILS = [
  "mrauschenbach@rocketmail.com", // Matt
];

// ---- STATIC STANDARDS DATA (edit as needed) -------------------------------
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

// Optionally show circuit definition somewhere in UI
const CIRCUIT = [
  "100 Push-ups",
  "100 Air Squats",
  "50 Burpees",
  "50 Sit-ups",
  "25 Lunges each leg",
  "25 Pull-ups",
];

// ---- TYPES ----------------------------------------------------------------
/** Member document shape expected from Firestore:
 *  members/{memberId} => { displayName: string, shift: string }
 *
 * Progress document shape expected from Firestore:
 *  progress/{memberId} => { pct: number (0-100), passed: boolean }
 *
 * You can adapt these collection names in the QUERIES section below.
 */

// ---- UTIL -----------------------------------------------------------------
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// ---- MAIN COMPONENT -------------------------------------------------------
export default function StandardsBoard() {
  const [db] = useState(() => getFirestore());
  const [auth] = useState(() => getAuth());

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]); // [{id, displayName, shift}]
  const [progress, setProgress] = useState({}); // { memberId: { pct, passed } }
  const [savingId, setSavingId] = useState(null);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  const isOwner = useMemo(() => {
    const email = user?.email?.toLowerCase?.();
    return email ? OWNER_EMAILS.map((e) => e.toLowerCase()).includes(email) : false;
  }, [user]);

  // ---- QUERIES: load members & progress ----------------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // members collection
        const membersSnap = await getDocs(query(collection(db, "members"), orderBy("displayName")));
        const ms = [];
        membersSnap.forEach((d) => {
          const data = d.data();
          ms.push({ id: d.id, displayName: data.displayName || "Firefighter", shift: data.shift || "" });
        });

        // progress collection
        const progressSnap = await getDocs(collection(db, "progress"));
        const map = {};
        progressSnap.forEach((d) => {
          const data = d.data();
          map[d.id] = {
            pct: typeof data.pct === "number" ? data.pct : 0,
            passed: !!data.passed,
          };
        });

        if (mounted) {
          setMembers(ms);
          setProgress(map);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [db]);

  // ---- DERIVED: boards (Passed vs In-Progress) ----------------------------
  const boards = useMemo(() => {
    const passed = [];
    const inprog = [];

    for (const m of members) {
      const p = progress[m.id];
      if (!p) continue;
      const row = {
        id: m.id,
        name: m.displayName || "Firefighter",
        shift: m.shift || "",
        pct: p.pct,
      };
      // ✅ FIXED: braces around if/else
      if (p.passed) {
        passed.push(row);
      } else {
        inprog.push(row);
      }
    }

    passed.sort((a, b) => a.name.localeCompare(b.name));
    inprog.sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));

    return { passed, inprog };
  }, [members, progress]);

  // ---- ACTIONS: owner can update progress --------------------------------
  const updateMemberProgress = async (memberId, data) => {
    try {
      setSavingId(memberId);
      const ref = doc(db, "progress", memberId);
      // ensure doc exists, then update
      await setDoc(ref, { pct: 0, passed: false }, { merge: true });
      await updateDoc(ref, data);
      setProgress((prev) => ({ ...prev, [memberId]: { ...prev[memberId], ...data } }));
    } catch (e) {
      console.error(e);
      alert("Failed to save. Check console for details.");
    } finally {
      setSavingId(null);
    }
  };

  // ---- UI HELPERS ---------------------------------------------------------
  const MemberRow = ({ m }) => {
    const p = progress[m.id] || { pct: 0, passed: false };

    return (
      <div className="grid grid-cols-12 items-center gap-3 rounded-2xl border p-3 md:p-4 shadow-sm">
        <div className="col-span-5 md:col-span-4">
          <div className="font-semibold">{m.displayName || "Firefighter"}</div>
          <div className="text-sm text-gray-500">Shift {m.shift || "-"}</div>
        </div>
        <div className="col-span-4 md:col-span-5">
          <div className="h-2 w-full rounded bg-gray-200">
            <div
              className="h-2 rounded bg-emerald-500"
              style={{ width: `${Math.max(0, Math.min(100, p.pct))}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-600">{Math.round(p.pct)}% to tier</div>
        </div>
        <div className="col-span-3 md:col-span-3 flex items-center justify-end gap-2">
          <span
            className={classNames(
              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
              p.passed ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-600/10 text-amber-700"
            )}
          >
            {p.passed ? "Passed" : "In Progress"}
          </span>
        </div>
        {isOwner && (
          <div className="col-span-12 mt-3 grid grid-cols-12 items-center gap-3">
            <div className="col-span-8 md:col-span-9">
              <input
                type="range"
                min={0}
                max={100}
                value={p.pct}
                onChange={(e) => updateMemberProgress(m.id, { pct: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <label className="col-span-4 md:col-span-3 flex items-center justify-end gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!p.passed}
                onChange={(e) => updateMemberProgress(m.id, { passed: e.target.checked })}
              />
              <span>Mark Passed</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 md:mb-10 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Standards Board</h1>
          <p className="mt-1 text-gray-600">
            View all tiers, track member progress, and see who has passed. {" "}
            {isOwner ? (
              <span className="font-medium text-emerald-700">Owner editing enabled.</span>
            ) : (
              <span className="font-medium text-gray-700">Read-only mode.</span>
            )}
          </p>
        </div>
        {savingId && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1 text-sm text-amber-800">
            Saving…
          </div>
        )}
      </div>

      {/* Standards Panels */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Object.entries(STANDARDS).map(([tier, items]) => (
          <div key={tier} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{tier}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {items.length} items
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.id} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-400" />
                  <span className="text-sm text-slate-800">{it.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Circuit callout */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-slate-700">Circuit (from packet)</div>
        <div className="text-sm text-slate-700">
          {CIRCUIT.join(" • ")}
        </div>
      </div>

      {/* Members Progress */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Members</h2>
          <div className="text-sm text-slate-500">{members.length} total</div>
        </div>
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
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

      {/* Status Boards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Passed</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
              {boards.passed.length}
            </span>
          </div>
          {boards.passed.length === 0 ? (
            <div className="text-sm text-slate-600">No one has passed yet.</div>
          ) : (
            <ul className="space-y-2">
              {boards.passed.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-slate-500">Shift {r.shift || "-"}</div>
                  </div>
                  <span className="text-xs text-slate-600">{Math.round(r.pct)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">In Progress</h3>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              {boards.inprog.length}
            </span>
          </div>
          {boards.inprog.length === 0 ? (
            <div className="text-sm text-slate-600">No active attempts.</div>
          ) : (
            <ul className="space-y-2">
              {boards.inprog.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-slate-500">Shift {r.shift || "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-600">{Math.round(r.pct)}%</div>
                    <div className="text-[10px] text-slate-500">to tier</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-10 text-center text-xs text-slate-500">
        Standards Board · Garfield Heights · Last updated {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
