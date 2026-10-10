/** storage.js — persistence for progress, achievements and settings. */

import { STORAGE_KEY } from './config.js';

const DEFAULTS = {
  stars: {},          // levelId -> best star count
  achievements: [],   // unlocked ids
  lang: 'zh',
  sound: true,
  seen: false         // has the player played before
};

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const d = JSON.parse(raw);
    return {
      stars: d && typeof d.stars === 'object' && d.stars ? d.stars : {},
      achievements: Array.isArray(d && d.achievements) ? d.achievements : [],
      lang: d && d.lang === 'en' ? 'en' : 'zh',
      sound: d && d.sound === false ? false : true,
      seen: !!(d && d.seen)
    };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

let state = read();

function write() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
}

export const store = {
  get all() { return state; },
  get stars() { return state.stars; },
  get achievements() { return state.achievements; },
  get lang() { return state.lang; },
  get sound() { return state.sound; },
  get seen() { return state.seen; },

  setLang(l) { state.lang = l === 'en' ? 'en' : 'zh'; write(); },
  setSound(v) { state.sound = !!v; write(); },
  markSeen() { state.seen = true; write(); },

  starsFor(id) { return state.stars[id] || 0; },
  completedIds() { return Object.keys(state.stars); },
  completedCount() { return Object.keys(state.stars).length; },
  totalStars() { return Object.values(state.stars).reduce((a, b) => a + b, 0); },

  /** Record a solve; keeps the best star count. Returns true if it improved. */
  record(id, stars) {
    const prev = state.stars[id] || 0;
    if (stars > prev) { state.stars[id] = stars; write(); return true; }
    if (!state.stars[id]) { state.stars[id] = stars; write(); return true; }
    return false;
  },

  unlockAchievement(id) {
    if (state.achievements.includes(id)) return false;
    state.achievements.push(id);
    write();
    return true;
  },

  reset() {
    state = { ...DEFAULTS, lang: state.lang, sound: state.sound };
    write();
  }
};
