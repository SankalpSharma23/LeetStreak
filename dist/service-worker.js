const S = "https://leetcode.com/graphql", v = `
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
`, O = `
  query getUserBadges($username: String!) {
    matchedUser(username: $username) {
      badges {
        id
        displayName
        icon
      }
    }
  }
`, $ = `
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
async function T(t) {
  try {
    console.log(`[API] Fetching data for user: ${t}`);
    const e = await fetch(S, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: v,
        variables: { username: t }
      })
    });
    if (console.log(`[API] Profile response status: ${e.status}`), !e.ok) {
      const n = await e.text();
      throw console.error("[API] Profile request failed:", e.status, n), new Error(`API request failed: ${e.status}`);
    }
    const r = await e.json();
    if (console.log("[API] Profile data received:", r), r.errors)
      throw console.error("[API] GraphQL errors:", r.errors), new Error(r.errors[0]?.message || "GraphQL error");
    if (!r.data?.matchedUser)
      throw console.error("[API] No matched user in response"), new Error("User not found or profile is private");
    const s = r.data.matchedUser, o = s.submissionCalendar ? JSON.parse(s.submissionCalendar) : {};
    let a = [];
    try {
      const n = await fetch(S, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: O,
          variables: { username: t }
        })
      });
      n.ok && (a = (await n.json()).data?.matchedUser?.badges || []);
    } catch (n) {
      console.warn("[API] Failed to fetch badges:", n);
    }
    let i = [];
    try {
      const n = await fetch(S, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: $,
          variables: { username: t }
        })
      });
      n.ok && (i = (await n.json()).data?.recentSubmissionList || []);
    } catch (n) {
      console.warn("[API] Failed to fetch recent submissions:", n);
    }
    return console.log(`[API] Successfully fetched data for ${t}`), {
      profile: {
        ...s,
        badges: a,
        recentSubmissions: i
      },
      contestRanking: r.data.userContestRanking,
      submissionCalendar: o
    };
  } catch (e) {
    throw console.error("Error fetching LeetCode data:", e), e;
  }
}
const m = "leetfriends_data";
async function u() {
  try {
    return (await chrome.storage.local.get(m))[m]?.friends || {};
  } catch (t) {
    return console.error("Error getting friends from storage:", t), {};
  }
}
async function b(t) {
  return (await u())[t] || null;
}
async function U(t, e) {
  try {
    const r = await u(), s = !r[t];
    return r[t] = {
      ...e,
      lastUpdated: Date.now(),
      friendshipStartDate: r[t]?.friendshipStartDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    }, await chrome.storage.local.set({
      [m]: { friends: r }
    }), !0;
  } catch (r) {
    return console.error("Error saving friend to storage:", r), !1;
  }
}
async function F(t) {
  try {
    const e = await u();
    return delete e[t], await chrome.storage.local.set({
      [m]: { friends: e }
    }), !0;
  } catch (e) {
    return console.error("Error removing friend from storage:", e), !1;
  }
}
async function R() {
  const t = await u();
  return Object.keys(t);
}
function P(t) {
  if (!t || typeof t != "object")
    return 0;
  const e = /* @__PURE__ */ new Set();
  if (Object.entries(t).forEach(([c, d]) => {
    if (d > 0) {
      const D = new Date(parseInt(c) * 1e3).toISOString().split("T")[0];
      e.add(D);
    }
  }), e.size === 0)
    return 0;
  const r = Array.from(e).sort((c, d) => d.localeCompare(c)), s = /* @__PURE__ */ new Date(), o = s.toISOString().split("T")[0], a = r[0], i = new Date(s);
  i.setUTCDate(i.getUTCDate() - 1);
  const n = i.toISOString().split("T")[0];
  if (a !== o && a !== n)
    return 0;
  let l = 0, g = /* @__PURE__ */ new Date(a + "T00:00:00Z");
  for (let c = 0; c < r.length; c++) {
    const d = g.toISOString().split("T")[0];
    if (r[c] === d)
      l++, g.setUTCDate(g.getUTCDate() - 1);
    else
      break;
  }
  return l;
}
function M(t) {
  const e = { easy: 0, medium: 0, hard: 0, total: 0 };
  return Array.isArray(t) && t.forEach((r) => {
    const s = r.count || 0;
    switch (r.difficulty) {
      case "Easy":
        e.easy = s;
        break;
      case "Medium":
        e.medium = s;
        break;
      case "Hard":
        e.hard = s;
        break;
      case "All":
        e.total = s;
        break;
    }
  }), e;
}
function L(t) {
  if (!t) return !0;
  const e = 900 * 1e3;
  return Date.now() - t > e;
}
const h = "leetfriends_notifications";
async function f() {
  try {
    return (await chrome.storage.local.get(h))[h] || {
      mutedUntilUTC: null,
      lastNotified: {}
    };
  } catch (t) {
    return console.error("Error getting notification state:", t), { mutedUntilUTC: null, lastNotified: {} };
  }
}
async function j(t) {
  const e = await f();
  e.mutedUntilUTC = t, await chrome.storage.local.set({ [h]: e });
}
async function y() {
  const t = await f();
  if (!t.mutedUntilUTC) return !1;
  const e = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return t.mutedUntilUTC >= e;
}
async function k(t) {
  if (await y()) return !1;
  const e = await f(), r = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return e.lastNotified[t] !== r;
}
async function N(t) {
  const e = await f(), r = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  e.lastNotified[t] = r, await chrome.storage.local.set({ [h]: e });
}
async function C(t) {
  if (t.length === 0) {
    console.log("No events to notify");
    return;
  }
  if (await y()) {
    console.log("Notifications are muted");
    return;
  }
  console.log("Storing", t.length, "notification(s) for popup display");
  try {
    const r = (await chrome.storage.local.get("unread_notifications")).unread_notifications || [], s = Date.now(), o = t.map((c, d) => ({
      ...c,
      id: `${s}-${d}`,
      timestamp: s
    })), a = [...r, ...o], i = s - 1440 * 60 * 1e3, n = a.filter((c) => c.timestamp > i).slice(-10);
    await chrome.storage.local.set({ unread_notifications: n }), console.log("✅ Notifications stored successfully for popup display");
    const l = t.length === 1 ? t[0].message : `${t.length} friends updated their streaks today`, g = await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "LeetStreak",
      message: l,
      priority: 2,
      requireInteraction: !1
    });
    console.log("✅ System notification sent:", g);
    for (const c of t)
      await N(c.username);
  } catch (e) {
    console.error("❌ Error sending notification:", e), console.error("Notification details:", { message, eventsCount: t.length });
  }
}
const Y = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  batchNotify: C,
  getNotificationState: f,
  isNotificationMuted: y,
  markFriendNotified: N,
  setNotificationMuted: j,
  shouldNotifyForFriend: k
}, Symbol.toStringTag, { value: "Module" })), E = () => (/* @__PURE__ */ new Date()).toISOString().split("T")[0], q = () => {
  const t = /* @__PURE__ */ new Date();
  return t.setUTCDate(t.getUTCDate() - 1), t.toISOString().split("T")[0];
};
function p(t) {
  if (!t || typeof t != "object")
    return !1;
  const e = E();
  for (const [r, s] of Object.entries(t))
    if (s > 0 && new Date(parseInt(r) * 1e3).toISOString().split("T")[0] === e)
      return !0;
  return !1;
}
function G(t, e) {
  if (!e) return p(t.submissionCalendar);
  const r = p(t.submissionCalendar), s = (t.stats?.total || 0) > (e.stats?.total || 0);
  return r || s;
}
function x(t) {
  return [7, 30, 100].includes(t);
}
function Q(t, e) {
  if (e === 0) return !1;
  E();
  const r = q();
  if (p(t)) return !1;
  let o = !1;
  for (const [a, i] of Object.entries(t))
    if (i > 0 && new Date(parseInt(a) * 1e3).toISOString().split("T")[0] === r) {
      o = !0;
      break;
    }
  return !o && e > 0;
}
function w(t, e, r) {
  switch (e) {
    case "solved_today":
      return `${t} solved today! 🎯`;
    case "milestone":
      return `${t} hit ${r.streak} day streak! 🔥`;
    case "streak_at_risk":
      return `Your ${r.streak} day streak needs attention! ⚠️`;
    default:
      return `${t} updated their progress`;
  }
}
const I = "leetfriends_sync", B = 30, J = 500;
chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetFriends installed - setting up sync alarm"), chrome.alarms.create(I, {
    periodInMinutes: B
  });
});
chrome.alarms.onAlarm.addListener((t) => {
  t.name === I && (console.log("Background sync triggered"), _());
});
chrome.runtime.onMessage.addListener((t, e, r) => {
  switch (console.log("Message received:", t.type), t.type) {
    case "FETCH_STATS":
      return H(t.forceRefresh).then(r), !0;
    // Async response
    case "ADD_FRIEND":
      return z(t.username).then(r), !0;
    case "REMOVE_FRIEND":
      return K(t.username).then(r), !0;
    case "GET_FRIENDS":
      return V().then(r), !0;
    case "MUTE_NOTIFICATIONS":
      return W(t.untilUTC).then(r), !0;
    case "GET_NOTIFICATION_STATE":
      return Z().then(r), !0;
    default:
      r({ success: !1, error: "Unknown message type" });
  }
});
async function H(t = !1) {
  try {
    const e = await u(), r = Object.keys(e);
    if (r.length === 0)
      return { success: !0, friends: {}, message: "No friends added yet" };
    let s = t;
    if (!t) {
      for (const o of r)
        if (L(e[o].lastUpdated)) {
          s = !0;
          break;
        }
    }
    return s ? (console.log("Data stale - triggering sync"), await _(), { success: !0, friends: await u(), refreshed: !0 }) : { success: !0, friends: e, cached: !0 };
  } catch (e) {
    return console.error("Error in handleFetchStats:", e), { success: !1, error: e.message };
  }
}
async function z(t) {
  try {
    if (!t)
      return { success: !1, error: "Username is required" };
    if (console.log(`Adding friend: ${t}`), await b(t))
      return { success: !1, error: `${t} is already in your friends list` };
    const r = await T(t), s = A(r);
    return await U(t, s), { success: !0, message: `${t} added successfully`, data: s };
  } catch (e) {
    return console.error("Error adding friend:", e), { success: !1, error: e.message || "User not found or profile is private" };
  }
}
async function K(t) {
  try {
    return await F(t), { success: !0, message: `${t} removed` };
  } catch (e) {
    return console.error("Error removing friend:", e), { success: !1, error: e.message };
  }
}
async function V() {
  try {
    return { success: !0, friends: await u() };
  } catch (t) {
    return console.error("Error getting friends:", t), { success: !1, error: t.message };
  }
}
async function W(t) {
  try {
    const { setNotificationMuted: e } = await Promise.resolve().then(() => Y);
    return await e(t), { success: !0, message: `Notifications muted until ${t}` };
  } catch (e) {
    return console.error("Error muting notifications:", e), { success: !1, error: e.message };
  }
}
async function Z() {
  try {
    return { success: !0, state: await f() };
  } catch (t) {
    return console.error("Error getting notification state:", t), { success: !1, error: t.message };
  }
}
async function _() {
  try {
    const t = await R();
    console.log(`Syncing ${t.length} friends...`), await y() && console.log("Notifications muted - skipping notification detection");
    const e = [], s = (await chrome.storage.local.get("my_leetcode_username")).my_leetcode_username;
    for (const o of t)
      try {
        const a = await b(o), i = await T(o), n = A(i);
        if (await U(o, n), !await y()) {
          const l = await X(o, a, n);
          e.push(...l), s && o === s && Q(n.submissionCalendar, n.stats.streak) && e.push({
            username: "You",
            type: "streak_at_risk",
            message: w("You", "streak_at_risk", { streak: n.stats.streak }),
            priority: 3
          });
        }
        await tt(J);
      } catch (a) {
        console.error(`Error syncing ${o}:`, a);
      }
    e.length > 0 ? (console.log(`Sending ${e.length} notification(s):`, e), await C(e)) : console.log("No notification events detected"), console.log("Sync completed");
  } catch (t) {
    console.error("Error in syncAllFriends:", t);
  }
}
async function X(t, e, r) {
  const s = [];
  if (!await k(t))
    return console.log(`⏭️  Already notified ${t} today (UTC)`), s;
  if (console.log(`🔍 Checking events for ${t}...`), p(r.submissionCalendar)) {
    const i = G(r, e);
    console.log(`✅ ${t} solved today. Has new activity: ${i}`), i && (console.log(`🔔 Adding notification event for ${t}`), s.push({
      username: t,
      type: "solved_today",
      message: w(t, "solved_today", r),
      priority: 1
    }));
  } else
    console.log(`❌ ${t} has not solved today`);
  if (x(r.stats.streak)) {
    const i = e?.stats?.streak || 0;
    r.stats.streak > i && (console.log(`🎉 ${t} reached milestone: ${r.stats.streak} day streak!`), s.push({
      username: t,
      type: "milestone",
      message: w(t, "milestone", { streak: r.stats.streak }),
      priority: 2
    }));
  }
  return s.length > 0 && console.log(`📊 Found ${s.length} event(s) for ${t}`), s;
}
function A(t) {
  const { profile: e, contestRanking: r, submissionCalendar: s } = t, o = P(s), a = M(e.submitStats.acSubmissionNum);
  return {
    profile: {
      username: e.username,
      realName: e.profile.realName,
      avatar: e.profile.userAvatar,
      ranking: e.profile.ranking
    },
    stats: {
      ...a,
      streak: o
    },
    contest: {
      rating: r?.rating || 0,
      attended: r?.attendedContestsCount || 0,
      ranking: r?.globalRanking || 0
    },
    badges: e.badges || [],
    recentSubmissions: e.recentSubmissions || [],
    submissionCalendar: s,
    lastUpdated: Date.now()
  };
}
function tt(t) {
  return new Promise((e) => setTimeout(e, t));
}
