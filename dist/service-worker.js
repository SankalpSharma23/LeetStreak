const w = "https://leetcode.com/graphql";
function S(e) {
  return new Promise((t) => setTimeout(t, e));
}
async function M(e, t, r = 3) {
  let s;
  for (let o = 0; o < r; o++)
    try {
      if (typeof navigator < "u" && !navigator.onLine)
        throw new Error("No internet connection. Please check your network.");
      const n = new AbortController(), c = setTimeout(() => n.abort(), 1e4), i = await fetch(e, {
        ...t,
        signal: n.signal
      });
      if (clearTimeout(c), i.status === 429) {
        const a = parseInt(i.headers.get("Retry-After")) || Math.pow(2, o);
        console.log(`[API] Rate limited. Retrying after ${a}s`), await S(a * 1e3);
        continue;
      }
      return i;
    } catch (n) {
      if (s = n, n.name === "AbortError" && (console.error("[API] Request timeout (10000ms)"), s = new Error(`Request timed out after ${1e4 / 1e3} seconds`)), n.message.includes("No internet connection"))
        throw n;
      if (o < r - 1) {
        const c = Math.pow(2, o) * 1e3;
        console.log(`[API] Retry ${o + 1}/${r} in ${c}ms`), await S(c);
      }
    }
  throw s || new Error("Network request failed after multiple retries");
}
const P = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        userAvatar
        ranking
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      submissionCalendar
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
    }
  }
`, F = `
  query getUserBadges($username: String!) {
    matchedUser(username: $username) {
      badges {
        id
        displayName
        icon
      }
    }
  }
`, R = `
  query getRecentSubmissions($username: String!) {
    recentSubmissionList(username: $username, limit: 15) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;
async function E(e) {
  try {
    console.log(`[API] Fetching data for user: ${e}`);
    const t = await M(w, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: P,
        variables: { username: e }
      })
    });
    if (console.log(`[API] Profile response status: ${t.status}`), !t.ok) {
      const i = await t.text();
      throw console.error("[API] Profile request failed:", t.status, i), new Error(`API request failed: ${t.status}`);
    }
    const r = await t.json();
    if (console.log("[API] Profile data received:", r), r.errors)
      throw console.error("[API] GraphQL errors:", r.errors), new Error(r.errors[0]?.message || "GraphQL error");
    if (!r.data?.matchedUser)
      throw console.error("[API] No matched user in response"), new Error("User not found or profile is private");
    const s = r.data.matchedUser, o = s.submissionCalendar ? JSON.parse(s.submissionCalendar) : {};
    let n = [];
    try {
      const i = await fetch(w, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: F,
          variables: { username: e }
        })
      });
      i.ok && (n = (await i.json()).data?.matchedUser?.badges || []);
    } catch (i) {
      console.warn("[API] Failed to fetch badges:", i);
    }
    let c = [];
    try {
      const i = await fetch(w, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: R,
          variables: { username: e }
        })
      });
      i.ok && (c = (await i.json()).data?.recentSubmissionList || []);
    } catch (i) {
      console.warn("[API] Failed to fetch recent submissions:", i);
    }
    return console.log(`[API] Successfully fetched data for ${e}`), {
      profile: {
        ...s,
        badges: n,
        recentSubmissions: c
      },
      contestRanking: r.data.userContestRanking,
      submissionCalendar: o
    };
  } catch (t) {
    throw console.error("Error fetching LeetCode data:", t), t;
  }
}
class j {
  constructor() {
    this.queue = [], this.processing = !1;
  }
  /**
   * Add operation to queue
   * @param {Function} operation - Async operation to execute
   * @returns {Promise} Result of the operation
   */
  async enqueue(t) {
    return new Promise((r, s) => {
      this.queue.push({ operation: t, resolve: r, reject: s }), this.processQueue();
    });
  }
  /**
   * Process queued operations sequentially
   */
  async processQueue() {
    if (!(this.processing || this.queue.length === 0)) {
      for (this.processing = !0; this.queue.length > 0; ) {
        const { operation: t, resolve: r, reject: s } = this.queue.shift();
        try {
          const o = await t();
          r(o);
        } catch (o) {
          s(o);
        }
      }
      this.processing = !1;
    }
  }
}
const $ = new j(), m = "leetfriends_data", L = 5 * 1024 * 1024, q = 0.8;
async function G() {
  try {
    const e = await chrome.storage.local.get(null);
    return new Blob([JSON.stringify(e)]).size;
  } catch (e) {
    return console.error("Error calculating storage usage:", e), 0;
  }
}
async function T() {
  console.log("[Storage] Running cleanup of old submissions...");
  const e = await d(), t = Math.floor(Date.now() / 1e3) - 365 * 24 * 60 * 60;
  let r = 0;
  return Object.entries(e).forEach(([s, o]) => {
    o.submissionCalendar && Object.keys(o.submissionCalendar).forEach((n) => {
      parseInt(n) < t && (delete o.submissionCalendar[n], r++);
    });
  }), r > 0 && (await chrome.storage.local.set({ [m]: { friends: e } }), console.log(`[Storage] Cleaned ${r} old submission entries`)), r;
}
async function _() {
  const e = await G(), t = e / L * 100;
  return {
    bytes: e,
    megabytes: (e / 1024 / 1024).toFixed(2),
    percent: t.toFixed(1),
    nearLimit: t > q * 100,
    atLimit: t > 95
  };
}
async function d() {
  try {
    return (await chrome.storage.local.get(m))[m]?.friends || {};
  } catch (e) {
    return console.error("Error getting friends from storage:", e), {};
  }
}
async function U(e) {
  return (await d())[e] || null;
}
async function k(e, t) {
  return $.enqueue(async () => {
    try {
      const r = await _();
      if (r.atLimit && (console.warn("[Storage] Quota at limit, attempting cleanup..."), await T(), (await _()).atLimit))
        throw new Error("Storage quota exceeded. Please remove some friends or clear old data.");
      r.nearLimit && console.warn(`[Storage] Usage: ${r.megabytes}MB (${r.percent}%)`);
      const s = await d(), o = !s[e];
      return s[e] = {
        ...t,
        lastUpdated: Date.now(),
        friendshipStartDate: s[e]?.friendshipStartDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      }, await chrome.storage.local.set({
        [m]: { friends: s }
      }), { success: !0, storageHealth: r };
    } catch (r) {
      if (console.error("Error saving friend to storage:", r), r.message && (r.message.includes("QUOTA_EXCEEDED") || r.message.includes("quota")))
        try {
          await T();
          const s = await d();
          return s[e] = { ...t, lastUpdated: Date.now() }, await chrome.storage.local.set({ [m]: { friends: s } }), { success: !0, warning: "Storage was full but cleaned up successfully" };
        } catch {
          return { success: !1, error: "Storage quota exceeded. Please remove some friends." };
        }
      return { success: !1, error: r.message };
    }
  });
}
async function H(e) {
  return $.enqueue(async () => {
    try {
      const t = await d();
      return delete t[e], await chrome.storage.local.set({
        [m]: { friends: t }
      }), !0;
    } catch (t) {
      return console.error("Error removing friend from storage:", t), !1;
    }
  });
}
async function x() {
  const e = await d();
  return Object.keys(e);
}
function Y(e) {
  if (!e || typeof e != "string")
    throw new Error("Username is required");
  if (e = e.trim(), e.length < 1 || e.length > 50)
    throw new Error("Username must be 1-50 characters");
  if (!/^[a-zA-Z0-9_-]+$/.test(e))
    throw new Error("Username contains invalid characters. Only letters, numbers, underscore, and hyphen are allowed.");
  return e.toLowerCase();
}
function Q(e) {
  if (!e || typeof e != "object")
    return 0;
  const t = /* @__PURE__ */ new Set();
  if (Object.entries(e).forEach(([u, f]) => {
    if (f > 0) {
      const h = new Date(parseInt(u) * 1e3).toISOString().split("T")[0];
      t.add(h);
    }
  }), t.size === 0)
    return 0;
  const r = Array.from(t).sort((u, f) => f.localeCompare(u)), s = /* @__PURE__ */ new Date(), o = s.toISOString().split("T")[0], n = r[0], c = new Date(s);
  c.setUTCDate(c.getUTCDate() - 1);
  const i = c.toISOString().split("T")[0];
  if (n !== o && n !== i)
    return 0;
  let a = 0, l = /* @__PURE__ */ new Date(n + "T00:00:00Z");
  for (let u = 0; u < r.length; u++) {
    const f = l.toISOString().split("T")[0];
    if (r[u] === f)
      a++, l.setUTCDate(l.getUTCDate() - 1);
    else
      break;
  }
  return a;
}
function z(e) {
  const t = { easy: 0, medium: 0, hard: 0, total: 0 };
  return Array.isArray(e) && e.forEach((r) => {
    const s = r.count || 0;
    switch (r.difficulty) {
      case "Easy":
        t.easy = s;
        break;
      case "Medium":
        t.medium = s;
        break;
      case "Hard":
        t.hard = s;
        break;
      case "All":
        t.total = s;
        break;
    }
  }), t;
}
function B(e) {
  if (!e) return !0;
  const t = 900 * 1e3;
  return Date.now() - e > t;
}
const b = "leetfriends_notifications";
async function p() {
  try {
    return (await chrome.storage.local.get(b))[b] || {
      mutedUntilUTC: null,
      lastNotified: {}
    };
  } catch (e) {
    return console.error("Error getting notification state:", e), { mutedUntilUTC: null, lastNotified: {} };
  }
}
async function J(e) {
  const t = await p();
  t.mutedUntilUTC = e, await chrome.storage.local.set({ [b]: t });
}
async function y() {
  const e = await p();
  if (!e.mutedUntilUTC) return !1;
  const t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return e.mutedUntilUTC >= t;
}
async function A(e) {
  if (e.length === 0) {
    console.log("No events to notify");
    return;
  }
  if (await y()) {
    console.log("Notifications are muted");
    return;
  }
  console.log("Processing", e.length, "notification(s)");
  try {
    const r = (await chrome.storage.local.get("unread_notifications")).unread_notifications || [], s = Date.now(), o = e.map((a, l) => ({
      ...a,
      id: `${s}-${l}`,
      timestamp: s
    })), n = [...r, ...o], c = s - 1440 * 60 * 1e3, i = n.filter((a) => a.timestamp > c).slice(-20);
    await chrome.storage.local.set({ unread_notifications: i }), console.log("✅ Notifications stored successfully for popup display");
    for (const a of e)
      (a.type === "new_submission" || a.type === "milestone") && (await chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon128.png"),
        title: a.type === "new_submission" ? "🎯 LeetStreak - New Submission!" : "🔥 LeetStreak - Milestone!",
        message: a.message,
        priority: 2,
        requireInteraction: !1
      }), console.log("✅ Browser notification sent for:", a.username));
  } catch (t) {
    console.error("❌ Error sending notification:", t), console.error("Notification details:", { eventsCount: e.length });
  }
}
const W = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  batchNotify: A,
  getNotificationState: p,
  isNotificationMuted: y,
  setNotificationMuted: J
}, Symbol.toStringTag, { value: "Module" })), C = () => (/* @__PURE__ */ new Date()).toISOString().split("T")[0], X = () => {
  const e = /* @__PURE__ */ new Date();
  return e.setUTCDate(e.getUTCDate() - 1), e.toISOString().split("T")[0];
};
function K(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = C();
  for (const [r, s] of Object.entries(e))
    if (s > 0 && new Date(parseInt(r) * 1e3).toISOString().split("T")[0] === t)
      return !0;
  return !1;
}
function V(e) {
  return [7, 30, 100].includes(e);
}
function Z(e, t) {
  if (t === 0) return !1;
  C();
  const r = X();
  if (K(e)) return !1;
  let o = !1;
  for (const [n, c] of Object.entries(e))
    if (c > 0 && new Date(parseInt(n) * 1e3).toISOString().split("T")[0] === r) {
      o = !0;
      break;
    }
  return !o && t > 0;
}
function ee(e, t, r) {
  switch (t) {
    case "solved_today":
      return `${e} solved today! 🎯`;
    case "milestone":
      return `${e} hit ${r.streak} day streak! 🔥`;
    case "streak_at_risk":
      return `Your ${r.streak} day streak needs attention! ⚠️`;
    default:
      return `${e} updated their progress`;
  }
}
const I = "leetfriends_sync", te = 5, re = 500;
chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetFriends installed - setting up sync alarm"), chrome.alarms.create(I, {
    periodInMinutes: te
  });
});
chrome.alarms.onAlarm.addListener((e) => {
  e.name === I && (console.log("Background sync triggered"), N());
});
chrome.runtime.onMessage.addListener((e, t, r) => {
  switch (console.log("Message received:", e.type), e.type) {
    case "FETCH_STATS":
      return se(e.forceRefresh).then(r), !0;
    // Async response
    case "ADD_FRIEND":
      return oe(e.username).then(r), !0;
    case "REMOVE_FRIEND":
      return ae(e.username).then(r), !0;
    case "GET_FRIENDS":
      return ie().then(r), !0;
    case "MUTE_NOTIFICATIONS":
      return ce(e.untilUTC).then(r), !0;
    case "GET_NOTIFICATION_STATE":
      return le().then(r), !0;
    case "ADD_TO_QUEUE":
      return ne(e.problemData).then(r), !0;
    case "GITHUB_SYNC_SUBMISSION":
      return de(e.submissionId, e.submission).then(r), !0;
    case "GITHUB_SYNC_ENABLED":
      return Te().then(r), !0;
    case "MANUAL_SYNC_REQUESTED":
      return _e().then(r), !0;
    case "RETRY_FAILED_SYNCS":
      return Ee().then(r), !0;
    case "GET_STORAGE_STATUS":
      return handleGetStorageStatus().then(r), !0;
    default:
      r({ success: !1, error: "Unknown message type" });
  }
});
async function se(e = !1) {
  try {
    const t = await d(), r = Object.keys(t);
    if (r.length === 0)
      return { success: !0, friends: {}, message: "No friends added yet" };
    let s = e;
    if (!e) {
      for (const o of r)
        if (B(t[o].lastUpdated)) {
          s = !0;
          break;
        }
    }
    return s ? (console.log("Data stale - triggering sync"), await N(), { success: !0, friends: await d(), refreshed: !0 }) : { success: !0, friends: t, cached: !0 };
  } catch (t) {
    return console.error("Error in handleFetchStats:", t), { success: !1, error: t.message };
  }
}
async function oe(e) {
  try {
    const t = e;
    let r;
    try {
      r = Y(e);
    } catch (c) {
      return { success: !1, error: c.message };
    }
    if (console.log(`Adding friend: ${t} (normalized: ${r})`), await U(r))
      return { success: !1, error: `${t} is already in your friends list` };
    const o = await E(t), n = v(o);
    return await k(r, n), { success: !0, message: `${t} added successfully`, data: n };
  } catch (t) {
    return console.error("Error adding friend:", t), { success: !1, error: t.message || "User not found or profile is private" };
  }
}
async function ne(e) {
  try {
    if (!e)
      return { success: !1, error: "Problem data is required" };
    const r = (await chrome.storage.local.get("problem_queue")).problem_queue || [];
    if (r.some((a) => a.slug === e.slug || a.id === e.slug || a.url && a.url === e.url))
      return { success: !1, error: "Already in queue!", alreadyExists: !0 };
    let o = "pending";
    try {
      const { my_leetcode_username: a } = await chrome.storage.local.get("my_leetcode_username");
      if (a) {
        const u = (await d())[a];
        u && u.profile && u.profile.recentSubmissions && (u.profile.recentSubmissions || []).some(
          (h) => h.titleSlug === e.slug && h.statusDisplay === "Accepted"
        ) && (o = "completed");
      }
    } catch (a) {
      console.error("Error checking submission status:", a);
    }
    const n = r.map((a) => (a.id || (a.id = a.slug || `problem-${Date.now()}-${Math.random()}`), a)), c = {
      ...e,
      id: e.slug || `problem-${Date.now()}-${Math.random()}`,
      addedAt: Date.now(),
      status: o
      // pending, in-progress, or completed (if already submitted)
    };
    return n.push(c), await chrome.storage.local.set({ problem_queue: n }), { success: !0, message: "Added to queue!" + (o === "completed" ? " (Already Submitted)" : ""), status: o };
  } catch (t) {
    return console.error("Error adding to queue:", t), { success: !1, error: t.message || "Failed to add to queue" };
  }
}
async function ae(e) {
  try {
    return await H(e), { success: !0, message: `${e} removed` };
  } catch (t) {
    return console.error("Error removing friend:", t), { success: !1, error: t.message };
  }
}
async function ie() {
  try {
    return { success: !0, friends: await d() };
  } catch (e) {
    return console.error("Error getting friends:", e), { success: !1, error: e.message };
  }
}
async function ce(e) {
  try {
    const { setNotificationMuted: t } = await Promise.resolve().then(() => W);
    return await t(e), { success: !0, message: `Notifications muted until ${e}` };
  } catch (t) {
    return console.error("Error muting notifications:", t), { success: !1, error: t.message };
  }
}
async function le() {
  try {
    return { success: !0, state: await p() };
  } catch (e) {
    return console.error("Error getting notification state:", e), { success: !1, error: e.message };
  }
}
async function N() {
  try {
    const e = await x();
    console.log(`Syncing ${e.length} friends...`), await y() && console.log("Notifications muted - skipping notification detection");
    const t = [], s = (await chrome.storage.local.get("my_leetcode_username")).my_leetcode_username;
    for (const o of e)
      try {
        const n = await U(o), c = await E(o), i = v(c);
        if (await k(o, i), !await y()) {
          const a = await ue(o, n, i);
          t.push(...a), s && o === s && Z(i.submissionCalendar, i.stats.streak) && t.push({
            username: "You",
            type: "streak_at_risk",
            message: ee("You", "streak_at_risk", { streak: i.stats.streak }),
            priority: 3
          });
        }
        await g(re);
      } catch (n) {
        console.error(`Error syncing ${o}:`, n);
      }
    t.length > 0 ? (console.log(`Sending ${t.length} notification(s):`, t), await A(t)) : console.log("No notification events detected"), console.log("Sync completed");
  } catch (e) {
    console.error("Error in syncAllFriends:", e);
  }
}
async function ue(e, t, r) {
  const s = [];
  if (console.log(`🔍 Checking events for ${e}...`), t && t.stats && r.stats) {
    const o = t.stats.total || 0, n = r.stats.total || 0;
    if (n > o) {
      const c = n - o;
      console.log(`🎯 ${e} submitted ${c} new problem(s)!`);
      let i = "a problem";
      r.recentSubmissions && r.recentSubmissions.length > 0 && (i = r.recentSubmissions[0].title || i), s.push({
        username: e,
        type: "new_submission",
        message: `${e} just solved ${c === 1 ? i : `${c} problems`}! 🎯`,
        priority: 1
      });
    }
  }
  if (V(r.stats.streak)) {
    const o = t?.stats?.streak || 0;
    r.stats.streak > o && (console.log(`🎉 ${e} reached milestone: ${r.stats.streak} day streak!`), s.push({
      username: e,
      type: "milestone",
      message: `${e} hit ${r.stats.streak} day streak! 🔥`,
      priority: 2
    }));
  }
  return s.length > 0 && console.log(`📊 Found ${s.length} event(s) for ${e}`), s;
}
function v(e) {
  const { profile: t, contestRanking: r, submissionCalendar: s } = e, o = Q(s), n = z(t.submitStats.acSubmissionNum);
  return {
    profile: {
      username: t.username,
      realName: t.profile.realName,
      avatar: t.profile.userAvatar,
      ranking: t.profile.ranking
    },
    stats: {
      ...n,
      streak: o
    },
    contest: {
      rating: r?.rating || 0,
      attended: r?.attendedContestsCount || 0,
      ranking: r?.globalRanking || 0
    },
    badges: t.badges || [],
    recentSubmissions: t.recentSubmissions || [],
    submissionCalendar: s,
    lastUpdated: Date.now()
  };
}
function g(e) {
  return new Promise((t) => setTimeout(t, e));
}
async function de(e, t) {
  try {
    console.log("🐙 GitHub Sync: Processing submission", e), console.log("📝 Submission details:", {
      title: t.problemTitle,
      language: t.language,
      codeLength: t.code?.length || 0
    });
    const r = await chrome.storage.local.get([
      "github_token",
      "github_username",
      "github_repo",
      "github_sync_enabled"
    ]);
    if (console.log("⚙️ GitHub settings:", {
      enabled: r.github_sync_enabled,
      hasToken: !!r.github_token,
      username: r.github_username,
      repo: r.github_repo
    }), !r.github_sync_enabled || !r.github_token)
      return console.error("❌ GitHub sync not enabled or token missing"), { success: !1, error: "GitHub sync not enabled" };
    console.log("🔄 Starting sync with retry logic...");
    const s = await O(t, r, 3);
    if (s.success)
      return console.log("✅ GitHub sync successful!"), await chrome.storage.local.remove(e), chrome.notifications.create({
        type: "basic",
        iconUrl: "/icons/icon128.png",
        title: "GitHub Sync Success",
        message: `✅ Synced "${t.problemTitle}" to GitHub!`,
        priority: 1
      }), { success: !0 };
    {
      console.error("❌ GitHub sync failed:", s.error);
      const n = (await chrome.storage.local.get("failed_syncs")).failed_syncs || [];
      return n.push({
        submission: t,
        error: s.error,
        timestamp: Date.now(),
        retryCount: 0
      }), await chrome.storage.local.set({ failed_syncs: n }), chrome.notifications.create({
        type: "basic",
        iconUrl: "/icons/icon128.png",
        title: "GitHub Sync Failed",
        message: `❌ Failed to sync "${t.problemTitle}": ${s.error}`,
        priority: 2
      }), { success: !1, error: s.error };
    }
  } catch (r) {
    return console.error("GitHub Sync error:", r), { success: !1, error: r.message };
  }
}
async function O(e, t, r = 3) {
  const s = [1e3, 3e3, 9e3];
  for (let o = 0; o < r; o++)
    try {
      const n = await fe(e, t);
      if (n.success)
        return n;
      if (n.error?.includes("rate limit")) {
        await g(6e4);
        continue;
      }
      o < r - 1 && await g(s[o]);
    } catch (n) {
      if (o === r - 1)
        return { success: !1, error: n.message };
      await g(s[o]);
    }
  return { success: !1, error: "Max retries exceeded" };
}
async function fe(e, t) {
  const { github_token: r, github_username: s, github_repo: o } = t, n = ge(e), c = await pe(r, s, o, n), i = he(e);
  if (c.exists && atob(c.content).trim() === i.trim())
    return { success: !0, skipped: !0 };
  const a = c.exists ? `Update: ${e.problemTitle} (${e.language})` : `Add: ${e.problemTitle} (${e.language})`, l = await we(
    r,
    s,
    o,
    n,
    i,
    a,
    c.sha
  );
  return l.success && await Se(e, n, l.fileUrl), l;
}
function ge(e) {
  const { problemSlug: t, questionNumber: r, language: s, topics: o } = e, c = {
    python3: "py",
    javascript: "js",
    typescript: "ts",
    java: "java",
    cpp: "cpp",
    c: "c",
    csharp: "cs",
    go: "go",
    rust: "rs",
    swift: "swift",
    kotlin: "kt"
  }[s.toLowerCase()] || "txt", a = `${String(r).padStart(4, "0")}-${t}.${c}`;
  return `${o && o.length > 0 ? me(o[0]) : "Unsorted"}/${a}`;
}
function me(e) {
  return e.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, "");
}
function he(e) {
  const { problemTitle: t, difficulty: r, topics: s, questionNumber: o, problemUrl: n, code: c, language: i } = e, a = ye(i);
  return [
    `${a} ${o}. ${t}`,
    `${a} Difficulty: ${r}`,
    `${a} Topics: ${s.join(", ")}`,
    `${a} LeetCode: ${n}`,
    `${a} Synced: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    "",
    c
  ].join(`
`);
}
function ye(e) {
  return {
    python3: "#",
    python: "#",
    javascript: "//",
    typescript: "//",
    java: "//",
    cpp: "//",
    c: "//",
    csharp: "//",
    go: "//",
    rust: "//",
    swift: "//",
    kotlin: "//",
    php: "//"
  }[e.toLowerCase()] || "//";
}
async function pe(e, t, r, s) {
  try {
    const o = await fetch(
      `https://api.github.com/repos/${t}/${r}/contents/${s}`,
      {
        headers: {
          Authorization: `token ${e}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );
    if (o.status === 404)
      return { exists: !1 };
    if (!o.ok)
      throw new Error(`GitHub API error: ${o.status}`);
    const n = await o.json();
    return {
      exists: !0,
      content: n.content,
      sha: n.sha
    };
  } catch (o) {
    return { exists: !1, error: o.message };
  }
}
async function we(e, t, r, s, o, n, c = null) {
  try {
    await be(e, t, r);
    const i = btoa(unescape(encodeURIComponent(o))), a = {
      message: n,
      content: i,
      branch: "main"
    };
    c && (a.sha = c);
    const l = await fetch(
      `https://api.github.com/repos/${t}/${r}/contents/${s}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${e}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(a)
      }
    );
    if (!l.ok) {
      const f = await l.json();
      throw new Error(f.message || `GitHub API error: ${l.status}`);
    }
    const u = await l.json();
    return {
      success: !0,
      fileUrl: u.content.html_url,
      commitUrl: u.commit.html_url
    };
  } catch (i) {
    return { success: !1, error: i.message };
  }
}
async function be(e, t, r) {
  try {
    const s = await fetch(
      `https://api.github.com/repos/${t}/${r}`,
      {
        headers: {
          Authorization: `token ${e}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );
    if (s.ok)
      return !0;
    if (s.status === 404) {
      console.log("📦 Repository not found, creating:", r);
      const o = await fetch(
        "https://api.github.com/user/repos",
        {
          method: "POST",
          headers: {
            Authorization: `token ${e}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: r,
            description: "My LeetCode solutions - Auto-synced by LeetStreak extension",
            private: !1,
            auto_init: !0
          })
        }
      );
      if (!o.ok) {
        const n = await o.json();
        throw console.error("❌ GitHub API error:", o.status, n), new Error(`Failed to create repository: ${n.message || o.status}`);
      }
      return console.log("✅ Repository created successfully"), await g(2e3), !0;
    }
    throw new Error(`Failed to check repository: ${s.status}`);
  } catch (s) {
    return console.error("Error ensuring repo exists:", s), !1;
  }
}
async function Se(e, t, r) {
  try {
    const s = await chrome.storage.local.get(["synced_problems", "recent_syncs"]), o = s.synced_problems || [], n = s.recent_syncs || [];
    o.push({
      problemSlug: e.problemSlug,
      language: e.language,
      filePath: t,
      fileUrl: r,
      timestamp: Date.now()
    }), n.unshift({
      problemTitle: e.problemTitle,
      language: e.language,
      status: "success",
      timestamp: Date.now()
    }), await chrome.storage.local.set({
      synced_problems: o,
      recent_syncs: n.slice(0, 20)
    });
  } catch (s) {
    console.error("Failed to record sync:", s);
  }
}
async function Te() {
  return console.log("GitHub sync enabled - initializing cleanup alarm"), chrome.alarms.create("github_cleanup", {
    periodInMinutes: 60
    // Every hour
  }), { success: !0 };
}
async function _e() {
  return { success: !0, message: "Manual sync feature coming soon" };
}
async function Ee() {
  try {
    const t = (await chrome.storage.local.get("failed_syncs")).failed_syncs || [];
    if (t.length === 0)
      return { success: !0, retried: 0 };
    const r = await chrome.storage.local.get([
      "github_token",
      "github_username",
      "github_repo"
    ]);
    let s = 0;
    const o = [];
    for (const n of t)
      (await O(n.submission, r, 2)).success ? s++ : (n.retryCount++, o.push(n)), await g(1e3);
    return await chrome.storage.local.set({ failed_syncs: o }), { success: !0, retried: s, failed: o.length };
  } catch (e) {
    return { success: !1, error: e.message };
  }
}
chrome.alarms.onAlarm.addListener((e) => {
  e.name === "github_cleanup" && $e();
});
async function $e() {
  try {
    const e = await chrome.storage.local.get(null), t = Date.now(), r = [];
    for (const [s, o] of Object.entries(e))
      s.startsWith("pending_") && o.timestamp && t - o.timestamp > 3600 * 1e3 && r.push(s);
    r.length > 0 && (await chrome.storage.local.remove(r), console.log(`Cleaned up ${r.length} old pending submissions`));
  } catch (e) {
    console.error("Cleanup error:", e);
  }
}
