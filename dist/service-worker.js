function ce(e, t = 1, r = 50) {
  return !e || typeof e != "string" ? { valid: !1, error: "Username is required" } : (e = e.trim(), e.length < t || e.length > r ? { valid: !1, error: `Username must be ${t}-${r} characters` } : /^[a-zA-Z0-9_-]+$/.test(e) ? { valid: !0, username: e.toLowerCase() } : { valid: !1, error: "Username contains invalid characters" });
}
class le {
  constructor(t, r) {
    this.maxCalls = t, this.windowMs = r, this.calls = [];
  }
  /**
   * Check if call is allowed
   * @returns {boolean} True if allowed
   */
  isAllowed() {
    const t = Date.now();
    return this.calls = this.calls.filter((r) => t - r < this.windowMs), this.calls.length < this.maxCalls ? (this.calls.push(t), !0) : !1;
  }
  /**
   * Get time until next call is allowed
   * @returns {number} Milliseconds until next call
   */
  getTimeUntilReset() {
    if (this.calls.length === 0) return 0;
    const t = Date.now(), r = this.calls[0], s = this.windowMs - (t - r);
    return Math.max(0, s);
  }
}
class Q {
  /**
   * Derive encryption key from password
   * @param {string} password - Password to derive key from
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<CryptoKey>} Derived key
   */
  static async deriveKey(t, r) {
    const s = new TextEncoder(), o = await crypto.subtle.importKey(
      "raw",
      s.encode(t),
      "PBKDF2",
      !1,
      ["deriveBits", "deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: r,
        iterations: 1e5,
        hash: "SHA-256"
      },
      o,
      { name: "AES-GCM", length: 256 },
      !1,
      ["encrypt", "decrypt"]
    );
  }
  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @param {string} password - Password for encryption
   * @returns {Promise<string>} Base64 encoded encrypted data
   */
  static async encrypt(t, r) {
    const s = new TextEncoder(), o = crypto.getRandomValues(new Uint8Array(16)), n = crypto.getRandomValues(new Uint8Array(12)), c = await this.deriveKey(r, o), i = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: n },
      c,
      s.encode(t)
    ), a = new Uint8Array(o.length + n.length + i.byteLength);
    return a.set(o, 0), a.set(n, o.length), a.set(new Uint8Array(i), o.length + n.length), btoa(String.fromCharCode(...a));
  }
  /**
   * Decrypt data
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} password - Password for decryption
   * @returns {Promise<string>} Decrypted data
   */
  static async decrypt(t, r) {
    const s = new TextDecoder(), o = Uint8Array.from(atob(t), (d) => d.charCodeAt(0)), n = o.slice(0, 16), c = o.slice(16, 28), i = o.slice(28), a = await this.deriveKey(r, n), u = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: c },
      a,
      i
    );
    return s.decode(u);
  }
}
const ue = {
  "api.github.com": [
    // GitHub's certificate fingerprints (example - update with actual values)
    // Primary certificate
    "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    // Backup certificate
    "SHA256:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
  ],
  "leetcode.com": [
    // LeetCode's certificate fingerprints (example - update with actual values)
    "SHA256:CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=",
    "SHA256:DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD="
  ]
};
class de {
  constructor() {
    this.violationCount = 0, this.lastViolation = null;
  }
  /**
   * Validate certificate for a request
   * Note: Chrome extensions have limited access to certificate details
   * This is a best-effort validation
   * 
   * @param {string} url - URL being requested
   * @param {Response} response - Fetch response (after connection)
   * @returns {Promise<{valid: boolean, reason?: string}>}
   */
  async validateCertificate(t, r) {
    try {
      const o = new URL(t).hostname, n = ue[o];
      if (!n || n.length === 0)
        return console.info(`No certificate pins for ${o}, allowing`), { valid: !0 };
      const c = this.validateSecurityHeaders(r, o);
      return c.valid ? !r.ok && r.status === 0 ? {
        valid: !1,
        reason: "Network error - possible connection interception"
      } : { valid: !0 } : c;
    } catch (s) {
      return console.error("Certificate validation error:", s), {
        valid: !1,
        reason: `Validation error: ${s.message}`
      };
    }
  }
  /**
   * Validate security headers
   * @param {Response} response
   * @param {string} hostname
   * @returns {{valid: boolean, reason?: string}}
   */
  validateSecurityHeaders(t, r) {
    if (!t.url.startsWith("https://"))
      return {
        valid: !1,
        reason: "Non-HTTPS connection detected"
      };
    const s = t.headers.get("strict-transport-security");
    return (r === "api.github.com" || r === "leetcode.com") && (s || console.warn(`Missing HSTS header for ${r}`)), { valid: !0 };
  }
  /**
   * Record certificate violation
   * @param {string} url
   * @param {string} reason
   */
  async recordViolation(t, r) {
    this.violationCount++, this.lastViolation = {
      url: t,
      reason: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, console.error("🔒 Certificate validation failed:", {
      url: t,
      reason: r,
      count: this.violationCount
    });
    try {
      const o = (await chrome.storage.local.get("cert_violations")).cert_violations || [];
      o.push(this.lastViolation), o.length > 50 && o.splice(0, o.length - 50), await chrome.storage.local.set({ cert_violations: o });
    } catch (s) {
      console.error("Failed to store certificate violation:", s);
    }
  }
  /**
   * Get violation statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalViolations: this.violationCount,
      lastViolation: this.lastViolation
    };
  }
}
const $ = new de();
async function fe(e, t = {}) {
  try {
    if (new URL(e).protocol !== "https:")
      throw new Error("Only HTTPS requests are allowed");
    const s = await fetch(e, {
      ...t,
      // Add security headers
      headers: {
        ...t.headers
      }
    }), o = await $.validateCertificate(e, s);
    if (!o.valid)
      throw await $.recordViolation(e, o.reason), new Error(`Certificate validation failed: ${o.reason}`);
    return s;
  } catch (r) {
    throw (r.message.includes("certificate") || r.message.includes("Certificate")) && await $.recordViolation(e, r.message), r;
  }
}
const v = "https://leetcode.com/graphql", ge = 2, I = 6e3, M = new le(30, 6e4);
function G(e) {
  return new Promise((t) => setTimeout(t, e));
}
async function he(e, t, r = ge) {
  let s;
  if (!M.isAllowed()) {
    const o = M.getTimeUntilReset();
    throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(o / 1e3)} seconds.`);
  }
  for (let o = 0; o < r; o++)
    try {
      if (typeof navigator < "u" && !navigator.onLine)
        throw new Error("No internet connection. Please check your network.");
      const n = new AbortController(), c = setTimeout(() => n.abort(), I), i = await fe(e, {
        ...t,
        signal: n.signal
      });
      if (clearTimeout(c), i.status === 429) {
        const a = parseInt(i.headers.get("Retry-After")) || Math.pow(2, o);
        console.log(`[API] Rate limited. Retrying after ${a}s`), await G(a * 1e3);
        continue;
      }
      return i;
    } catch (n) {
      if (s = n, n.name === "AbortError" && (console.error(`[API] Request timeout (${I}ms)`), s = new Error(`Request timed out after ${I / 1e3} seconds`)), n.message.includes("No internet connection"))
        throw n;
      if (o < r - 1) {
        const c = Math.pow(2, o) * 1e3;
        console.log(`[API] Retry ${o + 1}/${r} in ${c}ms`), await G(c);
      }
    }
  throw s || new Error("Network request failed after multiple retries");
}
const me = `
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
`, pe = `
  query getUserBadges($username: String!) {
    matchedUser(username: $username) {
      badges {
        id
        displayName
        icon
      }
    }
  }
`, ye = `
  query getRecentSubmissions($username: String!) {
    recentSubmissionList(username: $username, limit: 15) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`, be = `
  query allSubmissions($username: String!) {
    matchedUser(username: $username) {
      recentAcSubmissions(limit: 1000) {
        id
        title
        titleSlug
        timestamp
      }
    }
  }
`;
async function k(e) {
  try {
    console.log(`[API] Fetching data for user: ${e}`);
    const t = await he(v, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: me,
        variables: { username: e }
      })
    });
    if (console.log(`[API] Profile response status: ${t.status}`), !t.ok) {
      const a = await t.text();
      throw console.error("[API] Profile request failed:", t.status, a), new Error(`API request failed: ${t.status}`);
    }
    const r = await t.json();
    if (console.log("[API] Profile data received:", r), r.errors)
      throw console.error("[API] GraphQL errors:", r.errors), new Error(r.errors[0]?.message || "GraphQL error");
    if (!r.data?.matchedUser)
      throw console.error("[API] No matched user in response"), new Error("User not found or profile is private");
    const s = r.data.matchedUser, o = s.submissionCalendar ? JSON.parse(s.submissionCalendar) : {};
    let n = [];
    try {
      const a = await fetch(v, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: pe,
          variables: { username: e }
        })
      });
      a.ok && (n = (await a.json()).data?.matchedUser?.badges || []);
    } catch (a) {
      console.warn("[API] Failed to fetch badges:", a);
    }
    let c = [];
    try {
      const a = await fetch(v, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: ye,
          variables: { username: e }
        })
      });
      a.ok && (c = (await a.json()).data?.recentSubmissionList || []);
    } catch (a) {
      console.warn("[API] Failed to fetch recent submissions:", a);
    }
    let i = [];
    try {
      const a = await fetch(v, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: be,
          variables: { username: e }
        })
      });
      if (a.ok) {
        const u = await a.json();
        u.errors ? console.warn("[API] All submissions query error:", u.errors) : (i = u.data?.matchedUser?.recentAcSubmissions || [], console.log(`[API] Fetched ${i.length} all-time accepted submissions (limit 1000)`), i.length > 0 && console.log("[API] Sample submissions:", i.slice(0, 5).map((d) => d.titleSlug)));
      }
    } catch (a) {
      console.warn("[API] Failed to fetch all submissions:", a);
    }
    return console.log(`[API] Successfully fetched data for ${e}`), {
      profile: {
        ...s,
        badges: n,
        recentSubmissions: c
      },
      allAcceptedSubmissions: i,
      contestRanking: r.data.userContestRanking,
      submissionCalendar: o
    };
  } catch (t) {
    throw console.error("Error fetching LeetCode data:", t), t;
  }
}
class we {
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
const Y = new we(), _ = "leetfriends_data", _e = 5 * 1024 * 1024, Se = 0.8;
async function Ae() {
  try {
    return await chrome.storage.local.getBytesInUse(null);
  } catch (e) {
    return console.error("Error calculating storage usage:", e), 0;
  }
}
async function L() {
  console.log("[Storage] Running cleanup of old submissions...");
  const e = await y(), t = Math.floor(Date.now() / 1e3) - 365 * 24 * 60 * 60;
  let r = 0;
  return Object.entries(e).forEach(([s, o]) => {
    o.submissionCalendar && Object.keys(o.submissionCalendar).forEach((n) => {
      parseInt(n) < t && (delete o.submissionCalendar[n], r++);
    });
  }), r > 0 && (await chrome.storage.local.set({ [_]: { friends: e } }), console.log(`[Storage] Cleaned ${r} old submission entries`)), r;
}
async function B() {
  const e = await Ae(), t = e / _e * 100;
  return {
    bytes: e,
    megabytes: (e / 1024 / 1024).toFixed(2),
    percent: t.toFixed(1),
    nearLimit: t > Se * 100,
    atLimit: t > 95
  };
}
async function y() {
  try {
    return (await chrome.storage.local.get(_))[_]?.friends || {};
  } catch (e) {
    return console.error("Error getting friends from storage:", e), {};
  }
}
async function z(e) {
  return (await y())[e] || null;
}
async function W(e, t) {
  return Y.enqueue(async () => {
    try {
      const r = await B();
      if (r.atLimit && (console.warn("[Storage] Quota at limit, attempting cleanup..."), await L(), (await B()).atLimit))
        throw new Error("Storage quota exceeded. Please remove some friends or clear old data.");
      r.nearLimit && console.warn(`[Storage] Usage: ${r.megabytes}MB (${r.percent}%)`);
      const s = await y(), o = !s[e];
      return s[e] = {
        ...t,
        lastUpdated: Date.now(),
        friendshipStartDate: s[e]?.friendshipStartDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      }, await chrome.storage.local.set({
        [_]: { friends: s }
      }), { success: !0, storageHealth: r };
    } catch (r) {
      if (console.error("Error saving friend to storage:", r), r.message && (r.message.includes("QUOTA_EXCEEDED") || r.message.includes("quota")))
        try {
          await L();
          const s = await y();
          return s[e] = { ...t, lastUpdated: Date.now() }, await chrome.storage.local.set({ [_]: { friends: s } }), { success: !0, warning: "Storage was full but cleaned up successfully" };
        } catch {
          return { success: !1, error: "Storage quota exceeded. Please remove some friends." };
        }
      return { success: !1, error: r.message };
    }
  });
}
async function ve(e) {
  return Y.enqueue(async () => {
    try {
      const t = await y();
      return delete t[e], await chrome.storage.local.set({
        [_]: { friends: t }
      }), !0;
    } catch (t) {
      return console.error("Error removing friend from storage:", t), !1;
    }
  });
}
async function Ce() {
  const e = await y();
  return Object.keys(e);
}
function Ee(e) {
  const t = ce(e);
  if (!t.valid)
    throw new Error(t.error);
  return t.username;
}
function Te(e) {
  if (!e || typeof e != "object")
    return 0;
  const t = /* @__PURE__ */ new Set();
  if (Object.entries(e).forEach(([d, g]) => {
    if (g > 0) {
      const h = new Date(parseInt(d) * 1e3).toISOString().split("T")[0];
      t.add(h);
    }
  }), t.size === 0)
    return 0;
  const r = Array.from(t).sort((d, g) => g.localeCompare(d)), s = /* @__PURE__ */ new Date(), o = s.toISOString().split("T")[0], n = r[0], c = new Date(s);
  c.setUTCDate(c.getUTCDate() - 1);
  const i = c.toISOString().split("T")[0];
  if (n !== o && n !== i)
    return 0;
  let a = 0, u = /* @__PURE__ */ new Date(n + "T00:00:00Z");
  for (let d = 0; d < r.length; d++) {
    const g = u.toISOString().split("T")[0];
    if (r[d] === g)
      a++, u.setUTCDate(u.getUTCDate() - 1);
    else
      break;
  }
  return a;
}
function $e(e) {
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
function Ie(e) {
  if (!e) return !0;
  const t = 900 * 1e3;
  return Date.now() - e > t;
}
const D = "leetfriends_notifications";
async function E() {
  try {
    return (await chrome.storage.local.get(D))[D] || {
      mutedUntilUTC: null,
      lastNotified: {}
    };
  } catch (e) {
    return console.error("Error getting notification state:", e), { mutedUntilUTC: null, lastNotified: {} };
  }
}
async function Ue(e) {
  const t = await E();
  t.mutedUntilUTC = e, await chrome.storage.local.set({ [D]: t });
}
async function C() {
  const e = await E();
  if (!e.mutedUntilUTC) return !1;
  const t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return e.mutedUntilUTC >= t;
}
async function J(e) {
  if (e.length === 0) {
    console.log("No events to notify");
    return;
  }
  if (await C()) {
    console.log("Notifications are muted");
    return;
  }
  console.log("Processing", e.length, "notification(s)");
  try {
    const r = (await chrome.storage.local.get("unread_notifications")).unread_notifications || [], s = Date.now(), o = e.map((a, u) => ({
      ...a,
      id: `${s}-${u}`,
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
const De = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  batchNotify: J,
  getNotificationState: E,
  isNotificationMuted: C,
  setNotificationMuted: Ue
}, Symbol.toStringTag, { value: "Module" })), ke = () => (/* @__PURE__ */ new Date()).toISOString().split("T")[0], Ne = () => {
  const e = /* @__PURE__ */ new Date();
  return e.setUTCDate(e.getUTCDate() - 1), e.toISOString().split("T")[0];
};
function Re(e) {
  if (!e || typeof e != "object")
    return !1;
  const t = ke();
  for (const [r, s] of Object.entries(e))
    if (s > 0 && new Date(parseInt(r) * 1e3).toISOString().split("T")[0] === t)
      return !0;
  return !1;
}
function Oe(e) {
  return [7, 30, 100].includes(e);
}
function He(e, t) {
  if (t === 0) return !1;
  const r = Ne();
  if (Re(e)) return !1;
  let o = !1;
  for (const [n, c] of Object.entries(e))
    if (c > 0 && new Date(parseInt(n) * 1e3).toISOString().split("T")[0] === r) {
      o = !0;
      break;
    }
  return !o && t > 0;
}
function Pe(e, t, r) {
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
const F = 1.7, j = 30, q = 19, x = 4, V = "schedule_preferences";
async function T() {
  try {
    return (await chrome.storage.local.get(V))[V] || {
      activeInterval: F,
      quietInterval: j,
      activeStartHour: q,
      activeEndHour: x
    };
  } catch (e) {
    return console.error("Error loading schedule preferences:", e), {
      activeInterval: F,
      quietInterval: j,
      activeStartHour: q,
      activeEndHour: x
    };
  }
}
async function N(e = null) {
  e || (e = await T());
  const r = (/* @__PURE__ */ new Date()).getHours(), { activeStartHour: s, activeEndHour: o } = e;
  return s > o ? r >= s || r < o : r >= s && r < o;
}
async function R() {
  const e = await T();
  return await N(e) ? e.activeInterval : e.quietInterval;
}
async function Me() {
  const e = await T(), t = /* @__PURE__ */ new Date(), r = t.getHours(), s = t.getMinutes();
  let o;
  await N(e) ? o = e.activeEndHour : o = e.activeStartHour;
  let n = o - r;
  return n < 0 && (n += 24), n === 0 && s > 0 && (n = 24), n * 60 - s;
}
async function O() {
  const e = await T(), t = await R(), r = await N(e), s = K(e.activeStartHour), o = K(e.activeEndHour);
  return r ? `Active Mode: Checking every ${t} minutes (${s} - ${o})` : `Quiet Mode: Checking every ${t} minutes`;
}
async function Ge() {
  const e = await R(), t = await Me(), r = Math.min(e, t);
  return {
    intervalMinutes: r,
    description: await O(),
    isTransitionCheck: r === t && r < e
  };
}
function K(e) {
  return e === 0 ? "12:00 AM" : e < 12 ? `${e}:00 AM` : e === 12 ? "12:00 PM" : `${e - 12}:00 PM`;
}
async function X() {
  const e = chrome.runtime.id, t = navigator.userAgent;
  return `${e}-${t.slice(0, 50)}`;
}
async function Z(e, t) {
  try {
    if (!t || typeof t != "string")
      throw new Error("Invalid token");
    const r = await X(), s = await Q.encrypt(t, r);
    return await chrome.storage.local.set({
      [`${e}_encrypted`]: s,
      [`${e}_version`]: 1
      // For future migration if encryption changes
    }), await chrome.storage.local.remove(e), !0;
  } catch (r) {
    throw console.error("Failed to store encrypted token:", r), new Error("Token encryption failed");
  }
}
async function b(e) {
  try {
    const t = await chrome.storage.local.get([
      `${e}_encrypted`,
      `${e}_version`,
      e
      // Check for legacy plain text
    ]);
    if (t[`${e}_encrypted`]) {
      const r = await X();
      return await Q.decrypt(
        t[`${e}_encrypted`],
        r
      );
    }
    return t[e] ? (console.warn(`Found plain text token for ${e}, migrating to encrypted...`), await Z(e, t[e]), t[e]) : null;
  } catch (t) {
    console.error("Failed to retrieve encrypted token:", t);
    const r = await chrome.storage.local.get(e);
    return r[e] ? (console.warn("Decryption failed, using plain text fallback"), r[e]) : null;
  }
}
const Le = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  retrieveEncryptedToken: b,
  storeEncryptedToken: Z
}, Symbol.toStringTag, { value: "Module" })), A = "leetfriends_sync", Be = "schedule_transition_check", Fe = 500;
self.addEventListener("error", (e) => {
  console.error("💥 UNCAUGHT SERVICE WORKER ERROR:", e.error), console.error("Stack:", e.error?.stack);
});
self.addEventListener("unhandledrejection", (e) => {
  console.error("💥 UNCAUGHT PROMISE REJECTION:", e.reason), console.error("Stack:", e.reason?.stack);
});
chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetFriends installed - setting up dynamic sync alarm"), H(), je();
});
async function je() {
  try {
    const e = await chrome.storage.local.get(["synced_problems", "synced_submissions"]);
    e.synced_problems && !e.synced_submissions && (console.log(`Migrating ${e.synced_problems.length} synced problems to new storage key`), await chrome.storage.local.set({
      synced_submissions: e.synced_problems
    }), console.log("✅ Migration complete: synced_problems → synced_submissions"));
  } catch (e) {
    console.error("Error migrating sync data:", e);
  }
}
async function H() {
  const e = Ge();
  if (!e || !e.intervalMinutes) {
    console.warn("Invalid alarm config, using default 30 minute interval"), await chrome.alarms.clear(A), chrome.alarms.create(A, {
      delayInMinutes: 30,
      periodInMinutes: 30
    });
    return;
  }
  console.log(`Setting up alarm: ${e.description}`), console.log(`Next check in ${e.intervalMinutes.toFixed(1)} minutes`), await chrome.alarms.clear(A), await chrome.alarms.clear(Be), chrome.alarms.create(A, {
    delayInMinutes: e.intervalMinutes,
    periodInMinutes: e.intervalMinutes
  }), await chrome.storage.local.set({
    current_schedule: {
      interval: e.intervalMinutes,
      description: e.description,
      updatedAt: Date.now()
    }
  });
}
async function qe() {
  const t = (await chrome.storage.local.get("current_schedule")).current_schedule, r = R();
  (!t || Math.abs(t.interval - r) > 0.1) && (console.log(`Schedule transition detected! Switching to ${O()}`), await H());
}
chrome.alarms.onAlarm.addListener(async (e) => {
  e.name === A && (console.log(`Background sync triggered - ${O()}`), await qe(), await ee());
});
chrome.runtime.onMessage.addListener((e, t, r) => {
  if (console.log("📨 Message received from", t.url ? "content script" : "popup", ":", e.type), console.log("📦 Message object:", JSON.stringify(e, null, 2)), e.type === "PING") {
    console.log("🏓 Service worker pinged - keeping alive"), r({ pong: !0 });
    return;
  }
  switch (e.type) {
    case "FETCH_STATS":
      return xe(e.forceRefresh).then(r), !0;
    // Async response
    case "ADD_FRIEND":
      return Ve(e.username).then(r), !0;
    case "REMOVE_FRIEND":
      return Qe(e.username).then(r), !0;
    case "GET_FRIENDS":
      return Ye().then(r), !0;
    case "MUTE_NOTIFICATIONS":
      return ze(e.untilUTC).then(r), !0;
    case "GET_NOTIFICATION_STATE":
      return We().then(r), !0;
    case "ADD_TO_QUEUE":
      return Ke(e.problemData).then(r), !0;
    case "GITHUB_SYNC_SUBMISSION":
      return console.log("🔥 GITHUB_SYNC_SUBMISSION message handler triggered!"), console.log("📋 Submission details:", { submissionId: e.submissionId, hasProblemTitle: !!e.submission?.problemTitle }), rt(e.submission, e.submissionId).then(r).catch((s) => {
        console.error("💥 Error in GITHUB_SYNC_SUBMISSION:", s), r({ success: !1, error: s.message });
      }), !0;
    case "GITHUB_SYNC_ENABLED":
      return tt().then(r), !0;
    case "MANUAL_SYNC_REQUESTED":
      return st().then(r), !0;
    case "RETRY_FAILED_SYNCS":
      return ot().then(r), !0;
    // ===== Device Flow Authentication =====
    case "GITHUB_DEVICE_CODE_REQUEST":
      return nt().then(r), !0;
    case "GITHUB_DEVICE_POLL":
      return at(e.deviceCode).then(r), !0;
    case "GITHUB_VALIDATE_TOKEN":
      return it(e.token).then(r), !0;
    case "GITHUB_STORE_CREDENTIALS":
      return ct(e.token, e.username, e.repo).then(r), !0;
    case "GITHUB_CLEAR_CREDENTIALS":
      return lt().then(r), !0;
    case "GITHUB_GET_STATUS":
      return ut().then(r), !0;
    case "GITHUB_ENSURE_REPO":
      return dt(e.token, e.username, e.repo).then(r), !0;
    case "SHOW_NOTIFICATION":
      return chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: e.title || "LeetStreak",
        message: e.message || "",
        priority: 2,
        requireInteraction: !0
      }), r({ success: !0 }), !0;
    case "GET_STORAGE_STATUS":
      return r({ bytesInUse: 0, quota: chrome.storage.local.QUOTA_BYTES }), !0;
    case "CSP_VIOLATION":
      return gt(e.violation, t), r({ received: !0 }), !0;
    case "RESCHEDULE_ALARMS":
      return H().then(() => {
        r({ success: !0 });
      }), !0;
    default:
      r({ success: !1, error: "Unknown message type" });
  }
});
async function xe(e = !1) {
  try {
    const t = await y(), r = Object.keys(t);
    if (r.length === 0)
      return { success: !0, friends: {}, message: "No friends added yet" };
    let s = e;
    if (!e) {
      for (const o of r)
        if (Ie(t[o].lastUpdated)) {
          s = !0;
          break;
        }
    }
    return s ? (console.log("Data stale - triggering sync"), await ee(), { success: !0, friends: await y(), refreshed: !0 }) : { success: !0, friends: t, cached: !0 };
  } catch (t) {
    return console.error("Error in handleFetchStats:", t), { success: !1, error: t.message };
  }
}
async function Ve(e) {
  try {
    const t = e;
    let r;
    try {
      r = Ee(e);
    } catch (c) {
      return { success: !1, error: c.message };
    }
    if (console.log(`Adding friend: ${t} (normalized: ${r})`), await z(r))
      return { success: !1, error: `${t} is already in your friends list` };
    const o = await k(t), n = te(o);
    return await W(r, n), { success: !0, message: `${t} added successfully`, data: n };
  } catch (t) {
    return console.error("Error adding friend:", t), { success: !1, error: t.message || "User not found or profile is private" };
  }
}
async function Ke(e) {
  try {
    if (!e)
      return { success: !1, error: "Problem data is required" };
    const r = (await chrome.storage.local.get("problem_queue")).problem_queue || [];
    if (r.some((i) => i.slug === e.slug || i.id === e.slug || i.url && i.url === e.url))
      return { success: !1, error: "Already in queue!", alreadyExists: !0 };
    let o = e.status || "pending";
    if (o !== "completed")
      try {
        const i = await chrome.storage.local.get(["my_leetcode_username", "friends_data"]), { my_leetcode_username: a } = i, u = i.friends_data || {};
        if (a) {
          const d = u[a];
          if (d) {
            const l = (d.recentSubmissions || []).some((m) => (m.titleSlug === e.slug || m.slug === e.slug) && m.statusDisplay === "Accepted"), f = (d.allAcceptedSubmissions || []).some((m) => m.titleSlug === e.slug || m.slug === e.slug);
            (l || f) && (o = "completed", console.log(`Problem ${e.slug} already submitted - marking as completed`));
          }
        }
      } catch (i) {
        console.error("Error checking submission status:", i);
      }
    else
      console.log(`Problem ${e.slug} marked as completed from page detection`);
    const n = r.map((i) => (i.id || (i.id = i.slug || `problem-${Date.now()}-${Math.random()}`), i)), c = {
      ...e,
      id: e.slug || `problem-${Date.now()}-${Math.random()}`,
      addedAt: Date.now(),
      status: o
      // pending, in-progress, or completed (if already submitted)
    };
    return n.push(c), await chrome.storage.local.set({ problem_queue: n }), console.log(`Problem added to queue with status: ${o}`), { success: !0, message: "Added to queue!", status: o };
  } catch (t) {
    return console.error("Error adding to queue:", t), { success: !1, error: t.message || "Failed to add to queue" };
  }
}
async function Qe(e) {
  try {
    return await ve(e), { success: !0, message: `${e} removed` };
  } catch (t) {
    return console.error("Error removing friend:", t), { success: !1, error: t.message };
  }
}
async function Ye() {
  try {
    return { success: !0, friends: await y() };
  } catch (e) {
    return console.error("Error getting friends:", e), { success: !1, error: e.message };
  }
}
async function ze(e) {
  try {
    const { setNotificationMuted: t } = await Promise.resolve().then(() => De);
    return await t(e), { success: !0, message: `Notifications muted until ${e}` };
  } catch (t) {
    return console.error("Error muting notifications:", t), { success: !1, error: t.message };
  }
}
async function We() {
  try {
    return { success: !0, state: await E() };
  } catch (e) {
    return console.error("Error getting notification state:", e), { success: !1, error: e.message };
  }
}
async function ee() {
  try {
    const e = await Ce();
    console.log(`Syncing ${e.length} friends...`), await C() && console.log("Notifications muted - skipping notification detection");
    const t = [], s = (await chrome.storage.local.get("my_leetcode_username")).my_leetcode_username;
    for (const o of e)
      try {
        const n = await z(o), c = await k(o), i = te(c);
        if (await W(o, i), !await C()) {
          const a = await Je(o, n, i);
          t.push(...a), s && o === s && He(i.submissionCalendar, i.stats.streak) && t.push({
            username: "You",
            type: "streak_at_risk",
            message: Pe("You", "streak_at_risk", { streak: i.stats.streak }),
            priority: 3
          });
        }
        await w(Fe);
      } catch (n) {
        console.error(`Error syncing ${o}:`, n);
      }
    t.length > 0 ? (console.log(`Sending ${t.length} notification(s):`, t), await J(t)) : console.log("No notification events detected"), console.log("Sync completed");
  } catch (e) {
    console.error("Error in syncAllFriends:", e);
  }
}
async function Je(e, t, r) {
  const s = [];
  console.log(`🔍 Checking events for ${e}...`);
  const n = (await chrome.storage.local.get("my_leetcode_username")).my_leetcode_username;
  if (e && n && e.toLowerCase() === n.toLowerCase())
    return console.log(`⏭️  Skipping personal notifications for your own account (${e})`), s;
  if (t && t.stats && r.stats) {
    const c = t.stats.total || 0, i = r.stats.total || 0;
    if (i > c) {
      const a = i - c;
      console.log(`🎯 ${e} submitted ${a} new problem(s)!`);
      let u = "a problem";
      r.recentSubmissions && r.recentSubmissions.length > 0 && (u = r.recentSubmissions[0].title || u), s.push({
        username: e,
        type: "new_submission",
        message: `${e} just solved ${a === 1 ? u : `${a} problems`}! 🎯`,
        priority: 1
      });
    }
  }
  if (Oe(r.stats.streak)) {
    const c = t?.stats?.streak || 0;
    r.stats.streak > c && (console.log(`🎉 ${e} reached milestone: ${r.stats.streak} day streak!`), s.push({
      username: e,
      type: "milestone",
      message: `${e} hit ${r.stats.streak} day streak! 🔥`,
      priority: 2
    }));
  }
  return s.length > 0 && console.log(`📊 Found ${s.length} event(s) for ${e}`), s;
}
function te(e) {
  const { profile: t, contestRanking: r, submissionCalendar: s, allAcceptedSubmissions: o } = e, n = Te(s), c = $e(t.submitStats.acSubmissionNum);
  return {
    profile: {
      username: t.username,
      realName: t.profile.realName,
      avatar: t.profile.userAvatar,
      ranking: t.profile.ranking
    },
    stats: {
      ...c,
      streak: n
    },
    contest: {
      rating: r?.rating || 0,
      attended: r?.attendedContestsCount || 0,
      ranking: r?.globalRanking || 0
    },
    badges: t.badges || [],
    recentSubmissions: t.recentSubmissions || [],
    allAcceptedSubmissions: o || [],
    submissionCalendar: s,
    lastUpdated: Date.now()
  };
}
function w(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Xe(e) {
  const {
    questionNumber: t,
    problemSlug: r,
    language: s,
    difficulty: o = "Medium",
    topics: n = []
  } = e, i = {
    python: "py",
    python3: "py",
    javascript: "js",
    typescript: "ts",
    java: "java",
    cpp: "cpp",
    "c++": "cpp",
    c: "c",
    csharp: "cs",
    go: "go",
    rust: "rs",
    swift: "swift",
    kotlin: "kt",
    ruby: "rb",
    scala: "scala",
    php: "php",
    sql: "sql",
    mysql: "sql",
    bash: "sh",
    r: "r"
  }[s?.toLowerCase()] || "txt", a = n && n.length > 0 ? U(n[0]) : "Unsorted", u = U(o || "Medium"), d = String(t || 0).padStart(4, "0"), g = U(r || "solution");
  return `${a}/${u}/${d}-${g}.${i}`;
}
function Ze(e) {
  const {
    questionNumber: t,
    problemTitle: r,
    difficulty: s,
    topics: o = [],
    runtime: n,
    runtimePercentile: c,
    memory: i,
    memoryPercentile: a,
    acceptanceRate: u,
    problemUrl: d,
    language: g,
    code: l
  } = e, f = {
    python: "#",
    python3: "#",
    ruby: "#",
    r: "#",
    bash: "#",
    sql: "--",
    mysql: "--"
  }[g?.toLowerCase()] || "//", m = "═".repeat(65), p = [
    `${f} ${m}`,
    `${f} ${t}. ${r}`,
    `${f} ${m}`,
    `${f} Difficulty: ${s || "Medium"}`,
    `${f} Topics: ${o.join(", ") || "N/A"}`,
    `${f}`
  ];
  if (n) {
    const S = c ? ` (Beats ${c}%)` : "";
    p.push(`${f} Runtime: ${n}${S}`);
  }
  if (i) {
    const S = a ? ` (Beats ${a}%)` : "";
    p.push(`${f} Memory: ${i}${S}`);
  }
  return u && p.push(`${f} Acceptance Rate: ${u}%`), p.push(`${f}`), p.push(`${f} LeetCode: ${d || "N/A"}`), p.push(`${f} Synced: ${(/* @__PURE__ */ new Date()).toISOString()}`), p.push(`${f} ${m}`), p.push(""), p.push(l || "// No code captured"), p.join(`
`);
}
function et(e, t = !1) {
  const { questionNumber: r, problemTitle: s, difficulty: o, language: n } = e, c = t ? "Update" : "Add";
  return `${{ Easy: "🟢", Medium: "🟡", Hard: "🔴" }[o] || "📝"} ${c}: ${r}. ${s} (${n})`;
}
async function re(e, t, r = 3) {
  const s = [1e3, 3e3, 9e3];
  for (let o = 0; o < r; o++)
    try {
      const n = Xe(e), c = Ze(e), i = et(e, !1);
      console.log("📁 File path:", n), console.log("📝 Commit message:", i);
      const a = await oe(
        t.github_token,
        t.github_username,
        t.github_repo,
        n,
        c,
        i
      );
      if (a.success)
        return await se(e, n, a.fileUrl), a;
      if (a.error?.includes("rate limit")) {
        await w(6e4);
        continue;
      }
      o < r - 1 && await w(s[o]);
    } catch (n) {
      if (o === r - 1)
        return { success: !1, error: n.message };
      await w(s[o]);
    }
  return { success: !1, error: "Max retries exceeded" };
}
function U(e) {
  return e.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, "");
}
async function se(e, t, r) {
  try {
    const s = await chrome.storage.local.get(["synced_submissions", "recent_syncs"]), o = s.synced_submissions || [], n = s.recent_syncs || [];
    o.push({
      problemSlug: e.problemSlug,
      problemTitle: e.problemTitle,
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
      synced_submissions: o,
      recent_syncs: n.slice(0, 20)
    }), console.log(`✅ Recorded successful sync: ${e.problemTitle}. Total synced: ${o.length}`);
  } catch (s) {
    console.error("Failed to record sync:", s);
  }
}
async function tt() {
  return console.log("GitHub sync enabled - initializing cleanup alarm"), chrome.alarms.create("github_cleanup", {
    periodInMinutes: 60
    // Every hour
  }), { success: !0 };
}
async function rt(e, t) {
  try {
    console.log("📤 GitHub auto-sync triggered for submission:", t);
    const r = await chrome.storage.local.get([
      "github_sync_enabled",
      "github_username",
      "github_repo"
    ]);
    if (!r.github_sync_enabled)
      return console.log("ℹ️ GitHub sync disabled, skipping"), { success: !1, error: "GitHub sync not enabled" };
    if (!r.github_username || !r.github_repo)
      return console.log("⚠️ GitHub not configured properly"), { success: !1, error: "GitHub not configured" };
    const s = await b("github_token");
    if (!s)
      return console.error("❌ No GitHub token found"), { success: !1, error: "GitHub token not found. Please reconnect." };
    r.github_token = s;
    const o = await re(e, r, 3);
    return o.success ? (console.log("✅ Auto-sync successful!"), await se(e, o.filePath || "", o.fileUrl || ""), { success: !0, message: "Synced to GitHub" }) : (console.error("❌ Auto-sync failed:", o.error), { success: !1, error: o.error || "Sync failed" });
  } catch (r) {
    return console.error("❌ Error in handleGitHubSyncSubmission:", r), { success: !1, error: r.message };
  }
}
async function st() {
  try {
    console.log("🔄 Starting manual sync of all solutions...");
    const e = await chrome.storage.local.get([
      "github_username",
      "github_repo",
      "github_sync_enabled",
      "my_leetcode_username"
    ]);
    if (!e.github_sync_enabled)
      return console.error("❌ GitHub sync not enabled"), { success: !1, error: "GitHub sync not enabled" };
    if (!e.my_leetcode_username || !e.github_username || !e.github_repo)
      return console.error("❌ Missing required GitHub settings"), { success: !1, error: "GitHub settings incomplete. Please configure username and repository." };
    const t = await b("github_token");
    if (console.log("🔐 Token retrieved:", !!t), !t)
      return console.error("❌ GitHub token not found"), { success: !1, error: "GitHub token not found. Please configure GitHub sync settings." };
    const { my_leetcode_username: r, github_username: s, github_repo: o } = e;
    console.log("✅ GitHub sync enabled with user:", s), console.log("🔍 Fetching LeetCode user data:", r), console.log("🔐 Validating GitHub repository access...");
    try {
      const l = `https://api.github.com/repos/${s}/${o}`, h = await fetch(l, {
        headers: {
          Authorization: `token ${t}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      if (!h.ok)
        return console.error(`❌ Cannot access GitHub repo (${h.status}):`, l), h.status === 404 ? { success: !1, error: `Repository not found: ${s}/${o}` } : h.status === 401 ? { success: !1, error: "GitHub token is invalid or expired." } : h.status === 403 ? { success: !1, error: "Access denied to repository. Check token permissions." } : { success: !1, error: `Cannot access repository (${h.status})` };
      const f = await h.json();
      console.log("✅ GitHub repo accessible:", f.name), console.log("📍 Repo URL:", f.html_url);
    } catch (l) {
      return console.error("❌ Error validating GitHub repo:", l), { success: !1, error: `Failed to validate GitHub repo: ${l.message}` };
    }
    let n;
    try {
      n = await k(r), console.log("✅ User data fetched from LeetCode API");
    } catch (l) {
      return console.error("❌ Failed to fetch LeetCode user data:", l.message), { success: !1, error: `Failed to fetch LeetCode data: ${l.message}` };
    }
    if (!n)
      return { success: !1, error: "User data is empty. Username may be incorrect." };
    console.log("✅ User data loaded");
    const c = n.allAcceptedSubmissions || [], i = n.profile?.recentSubmissions || [];
    if (console.log("📋 Submissions data - all:", c.length, "recent:", i.length), c.length === 0 && i.length === 0)
      return { success: !1, error: "No accepted submissions found" };
    console.log(`📊 Found ${c.length} all-time submissions and ${i.length} recent`);
    const a = /* @__PURE__ */ new Map();
    i.forEach((l) => {
      l.statusDisplay === "Accepted" && a.set(l.titleSlug, l);
    }), c.forEach((l) => {
      a.has(l.titleSlug) || a.set(l.titleSlug, l);
    });
    const u = Array.from(a.values());
    console.log(`✅ Total unique solved problems: ${u.length}`);
    let d = 0, g = 0;
    for (let l = 0; l < u.length; l++)
      try {
        const h = u[l], f = h.titleSlug || h.slug;
        if (!f) continue;
        console.log(`[${l + 1}/${u.length}] Syncing: ${h.title || f}`);
        const m = h.difficulty || "Medium", p = m, S = `/**
 * Problem: ${h.title || f}
 * Difficulty: ${m}
 * URL: https://leetcode.com/problems/${f}/
 * Status: Accepted ✓
 * 
 * ${h.description ? h.description.substring(0, 200) : "No description"}
 */

// Solution code here
`, ie = `${p}/${f}.js`, P = await oe(
          t,
          s,
          o,
          ie,
          S,
          `Add solution: ${h.title || f}`
        );
        P.success ? d++ : (g++, console.warn(`Failed to sync ${f}:`, P.error)), l < u.length - 1 && await w(100);
      } catch (h) {
        console.error(`Error syncing submission ${l}:`, h), g++;
      }
    return console.log(`✅ Manual sync complete: ${d} synced, ${g} failed`), await chrome.storage.local.set({
      manual_sync_last: Date.now(),
      manual_sync_count: d
    }), {
      success: !0,
      synced: d,
      failed: g,
      message: `Synced ${d} problems to GitHub`
    };
  } catch (e) {
    return console.error("Error in manual sync:", e), { success: !1, error: e.message || "Manual sync failed" };
  }
}
async function oe(e, t, r, s, o, n) {
  try {
    const c = `https://api.github.com/repos/${t}/${r}/contents/${s}`, i = await fetch(c, {
      headers: {
        Authorization: `token ${e}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    let a = null;
    i.ok ? a = (await i.json()).sha : i.status !== 404 && console.warn(`GitHub check file error (${i.status}):`, s);
    const u = btoa(unescape(encodeURIComponent(o))), d = {
      message: n,
      content: u
    };
    a && (d.sha = a);
    const g = await fetch(c, {
      method: "PUT",
      headers: {
        Authorization: `token ${e}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(d)
    });
    if (g.ok) {
      const l = await g.json();
      return console.log("✅ Synced to GitHub:", s), { success: !0 };
    } else {
      const l = await g.text();
      if (console.error(`❌ GitHub PUT failed (${g.status}):`, s, l.substring(0, 200)), g.status === 403) {
        try {
          if (JSON.parse(l).message?.includes("rate"))
            return { success: !1, error: "GitHub rate limit exceeded. Try again later." };
        } catch {
        }
        return { success: !1, error: "Access denied to repository. Check token permissions." };
      } else {
        if (g.status === 401)
          return { success: !1, error: "GitHub token is invalid or expired." };
        if (g.status === 404)
          return console.warn("⚠️ 404 error - repo may not exist or path invalid:", s), { success: !1, error: "Repository not found or invalid path." };
      }
      return { success: !1, error: `GitHub error ${g.status}` };
    }
  } catch (c) {
    return console.error("Error syncing to GitHub:", c), { success: !1, error: c.message };
  }
}
async function ot() {
  try {
    const t = (await chrome.storage.local.get("failed_syncs")).failed_syncs || [];
    if (t.length === 0)
      return { success: !0, retried: 0 };
    const r = await b("github_token");
    if (!r)
      return { success: !1, error: "No GitHub token configured" };
    const s = await chrome.storage.local.get([
      "github_username",
      "github_repo"
    ]);
    s.github_token = r;
    let o = 0;
    const n = [];
    for (const c of t)
      (await re(c.submission, s, 2)).success ? o++ : (c.retryCount++, n.push(c)), await w(1e3);
    return await chrome.storage.local.set({ failed_syncs: n }), { success: !0, retried: o, failed: n.length };
  } catch (e) {
    return { success: !1, error: e.message };
  }
}
const ne = "Ov23liEa61h0LIbIdqls";
async function nt() {
  try {
    const e = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: ne,
        scope: "repo"
        // We need repo scope to create/update files
      })
    });
    if (!e.ok) {
      const r = await e.text();
      return console.error("Device code request failed:", e.status, r), e.status === 401 || e.status === 404 ? {
        success: !1,
        error: "Invalid GitHub Client ID. Please check the configuration.",
        errorCode: "INVALID_CLIENT"
      } : {
        success: !1,
        error: `GitHub returned error ${e.status}`,
        errorCode: "API_ERROR"
      };
    }
    const t = await e.json();
    return !t.device_code || !t.user_code ? {
      success: !1,
      error: "Invalid response from GitHub",
      errorCode: "INVALID_RESPONSE"
    } : (await chrome.storage.local.set({
      github_auth_pending: {
        deviceCode: t.device_code,
        userCode: t.user_code,
        verificationUri: t.verification_uri,
        expiresAt: Date.now() + t.expires_in * 1e3,
        interval: t.interval || 5,
        startedAt: Date.now()
      }
    }), {
      success: !0,
      userCode: t.user_code,
      verificationUri: t.verification_uri,
      expiresIn: t.expires_in,
      interval: t.interval || 5
    });
  } catch (e) {
    return console.error("Device code request error:", e), e.name === "TypeError" && e.message.includes("fetch") ? {
      success: !1,
      error: "Network error. Please check your internet connection.",
      errorCode: "NETWORK_ERROR"
    } : {
      success: !1,
      error: e.message,
      errorCode: "UNKNOWN_ERROR"
    };
  }
}
async function at(e) {
  try {
    const r = (await chrome.storage.local.get("github_auth_pending")).github_auth_pending;
    if (!r || Date.now() > r.expiresAt)
      return await chrome.storage.local.remove("github_auth_pending"), {
        success: !1,
        error: "Authorization expired. Please try again.",
        errorCode: "EXPIRED",
        shouldRetry: !1
      };
    const o = await (await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: ne,
        device_code: e || r.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    })).json();
    if (o.error)
      switch (o.error) {
        case "authorization_pending":
          return {
            success: !1,
            errorCode: "PENDING",
            shouldRetry: !0,
            interval: r.interval
          };
        case "slow_down":
          return r.interval = (r.interval || 5) + 5, await chrome.storage.local.set({ github_auth_pending: r }), {
            success: !1,
            errorCode: "SLOW_DOWN",
            shouldRetry: !0,
            interval: r.interval
          };
        case "expired_token":
          return await chrome.storage.local.remove("github_auth_pending"), {
            success: !1,
            error: "Authorization expired. Please try again.",
            errorCode: "EXPIRED",
            shouldRetry: !1
          };
        case "access_denied":
          return await chrome.storage.local.remove("github_auth_pending"), {
            success: !1,
            error: 'Authorization denied. Please try again and click "Authorize".',
            errorCode: "DENIED",
            shouldRetry: !1
          };
        default:
          return {
            success: !1,
            error: o.error_description || o.error,
            errorCode: "UNKNOWN",
            shouldRetry: !1
          };
      }
    if (o.access_token) {
      await chrome.storage.local.remove("github_auth_pending");
      const n = await ae(o.access_token);
      return n.success ? {
        success: !0,
        token: o.access_token,
        username: n.username,
        avatarUrl: n.avatarUrl,
        scopes: o.scope
      } : {
        success: !1,
        error: "Failed to validate token: " + n.error,
        errorCode: "VALIDATION_FAILED",
        shouldRetry: !1
      };
    }
    return {
      success: !1,
      error: "Unexpected response from GitHub",
      errorCode: "INVALID_RESPONSE",
      shouldRetry: !1
    };
  } catch (t) {
    return console.error("Device poll error:", t), t.name === "TypeError" && t.message.includes("fetch") ? {
      success: !1,
      error: "Network error. Will retry...",
      errorCode: "NETWORK_ERROR",
      shouldRetry: !0
    } : {
      success: !1,
      error: t.message,
      errorCode: "UNKNOWN_ERROR",
      shouldRetry: !1
    };
  }
}
async function ae(e) {
  try {
    const t = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${e}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "LeetStreak-Extension"
      }
    });
    if (!t.ok)
      return t.status === 401 ? { success: !1, error: "Invalid or expired token" } : t.status === 403 ? t.headers.get("X-RateLimit-Remaining") === "0" ? { success: !1, error: "GitHub API rate limit exceeded. Please wait." } : { success: !1, error: "Access forbidden. Token may lack required permissions." } : { success: !1, error: `GitHub API error: ${t.status}` };
    const r = await t.json();
    return {
      success: !0,
      username: r.login,
      avatarUrl: r.avatar_url,
      name: r.name,
      email: r.email
    };
  } catch (t) {
    return console.error("Token validation error:", t), { success: !1, error: t.message };
  }
}
async function it(e) {
  return e || (e = await b("github_token")), e ? await ae(e) : { success: !1, error: "No token provided" };
}
async function ct(e, t, r) {
  try {
    const { storeEncryptedToken: s } = await Promise.resolve().then(() => Le);
    return await s("github_token", e), await chrome.storage.local.set({
      github_username: t,
      github_repo: r,
      github_sync_enabled: !0,
      // CRITICAL: Enable sync flag
      github_connected: !0,
      github_connected_at: Date.now()
    }), console.log("✅ GitHub credentials stored successfully"), console.log("GitHub sync enabled flag set to true"), { success: !0 };
  } catch (s) {
    return console.error("❌ Failed to store credentials:", s), { success: !1, error: s.message };
  }
}
async function lt() {
  try {
    return await chrome.storage.local.remove([
      "github_token",
      "github_token_encrypted",
      "github_token_key",
      "github_username",
      "github_repo",
      "github_connected",
      "github_connected_at",
      "github_auth_pending",
      "failed_syncs",
      "synced_submissions"
    ]), console.log("GitHub credentials cleared"), { success: !0 };
  } catch (e) {
    return console.error("Failed to clear credentials:", e), { success: !1, error: e.message };
  }
}
async function ut() {
  try {
    const e = await chrome.storage.local.get([
      "github_username",
      "github_repo",
      "github_connected",
      "github_connected_at",
      "synced_submissions",
      "failed_syncs"
    ]);
    if (!!await b("github_token") && e.github_connected) {
      const s = e.synced_submissions?.length || 0, o = e.failed_syncs?.length || 0;
      return {
        success: !0,
        connected: !0,
        username: e.github_username,
        repo: e.github_repo,
        connectedAt: e.github_connected_at,
        syncedCount: s,
        failedCount: o
      };
    }
    return {
      success: !0,
      connected: !1
    };
  } catch (e) {
    return console.error("Failed to get GitHub status:", e), { success: !1, error: e.message };
  }
}
async function dt(e, t, r) {
  try {
    if (e || (e = await b("github_token")), !e)
      return { success: !1, error: "No GitHub token available" };
    const s = await fetch(`https://api.github.com/repos/${t}/${r}`, {
      headers: {
        Authorization: `Bearer ${e}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "LeetStreak-Extension"
      }
    });
    if (s.ok) {
      const o = await s.json();
      return {
        success: !0,
        exists: !0,
        repoUrl: o.html_url,
        isPrivate: o.private
      };
    }
    if (s.status === 404) {
      const o = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${e}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "LeetStreak-Extension"
        },
        body: JSON.stringify({
          name: r,
          description: "🔥 My LeetCode solutions - synced automatically by LeetStreak",
          private: !1,
          // Public by default, user can change later
          auto_init: !0,
          // Create with README
          has_issues: !1,
          has_projects: !1,
          has_wiki: !1
        })
      });
      if (o.ok) {
        const c = await o.json();
        return {
          success: !0,
          exists: !1,
          // Was just created
          created: !0,
          repoUrl: c.html_url,
          isPrivate: c.private
        };
      }
      return {
        success: !1,
        error: (await o.json()).message || "Failed to create repository",
        errorCode: "CREATE_FAILED"
      };
    }
    return s.status === 403 ? {
      success: !1,
      error: "Access denied. Token may lack repo permissions.",
      errorCode: "FORBIDDEN"
    } : {
      success: !1,
      error: `GitHub API error: ${s.status}`,
      errorCode: "API_ERROR"
    };
  } catch (s) {
    return console.error("Ensure repo error:", s), { success: !1, error: s.message };
  }
}
chrome.alarms.onAlarm.addListener((e) => {
  e.name === "github_cleanup" && ft();
});
async function ft() {
  try {
    const e = await chrome.storage.local.get(null), t = Date.now(), r = [];
    for (const [s, o] of Object.entries(e))
      s.startsWith("pending_") && o.timestamp && t - o.timestamp > 3600 * 1e3 && r.push(s);
    r.length > 0 && (await chrome.storage.local.remove(r), console.log(`Cleaned up ${r.length} old pending submissions`));
  } catch (e) {
    console.error("Cleanup error:", e);
  }
}
async function gt(e, t) {
  console.warn("🚨 CSP Violation from", t.tab?.id || "extension", ":", e);
  try {
    const s = (await chrome.storage.local.get("csp_violations")).csp_violations || [];
    s.push({
      ...e,
      tabId: t.tab?.id,
      url: t.url,
      receivedAt: (/* @__PURE__ */ new Date()).toISOString()
    }), s.length > 100 && s.splice(0, s.length - 100), await chrome.storage.local.set({ csp_violations: s }), e.violatedDirective?.includes("script-src") && console.error("Critical CSP violation detected:", e.blockedURI);
  } catch (r) {
    console.error("Failed to store CSP violation:", r);
  }
}
