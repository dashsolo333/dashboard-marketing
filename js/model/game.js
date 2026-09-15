// Couche jeu : XP, niveaux, série, objectif hebdo, classement, badges, saison.
// Tout est dérivé du document (rien n'est stocké) : simple à comprendre, impossible à tricher.
import { kindById } from './doc.js';
import { startOfWeek, addDays, dayOffset } from './roadmap.js';

export const XP_RULES = {
  extraChannel: 5,
  onTime: 10,
  results: [{ min: 10_000, xp: 30, label: '10 k vues' }, { min: 1_000, xp: 10, label: '1 k vues' }],
};

/** Grades football, seuils cumulés d'XP. */
export const LEVELS = [
  { name: 'Recrue', xp: 0, icon: '🎽' },
  { name: 'Remplaçant', xp: 100, icon: '🪑' },
  { name: 'Titulaire', xp: 300, icon: '⚽' },
  { name: 'Capitaine', xp: 600, icon: '🎖️' },
  { name: 'Meneur de jeu', xp: 1000, icon: '🧠' },
  { name: 'Buteur', xp: 1500, icon: '🥅' },
  { name: 'Star', xp: 2200, icon: '⭐' },
  { name: 'Légende', xp: 3000, icon: '🏆' },
  { name: 'Ballon d’Or', xp: 4000, icon: '🥇' },
  { name: 'GOAT', xp: 5500, icon: '🐐' },
];

export function isPublished(doc, op) {
  return op.stageId === doc.gates.finalStageId && Boolean(op.dates?.publishActual);
}

export function xpBreakdown(doc, op) {
  if (!isPublished(doc, op)) return { base: 0, channels: 0, onTime: 0, results: 0, total: 0 };
  const base = kindById(op.kind).xp;
  const channels = Math.max(0, (op.channels?.length || 0) - 1) * XP_RULES.extraChannel;
  const { publishPlanned, publishActual } = op.dates;
  const onTime = publishPlanned && publishActual <= publishPlanned ? XP_RULES.onTime : 0;
  const views = op.results?.views || 0;
  const tier = XP_RULES.results.find((t) => views >= t.min);
  const results = tier ? tier.xp : 0;
  return { base, channels, onTime, results, total: base + channels + onTime + results };
}

export function xpOf(doc, op) {
  return xpBreakdown(doc, op).total;
}

export function totalXp(doc, ops = doc.ops) {
  return ops.reduce((s, o) => s + xpOf(doc, o), 0);
}

export function levelOf(xp) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (xp >= LEVELS[i].xp) index = i;
  const cur = LEVELS[index];
  const nxt = LEVELS[index + 1] || null;
  const pct = nxt ? Math.min(100, Math.round(((xp - cur.xp) / (nxt.xp - cur.xp)) * 100)) : 100;
  return { index, name: cur.name, icon: cur.icon, xp, from: cur.xp, next: nxt ? nxt.xp : null, nextName: nxt?.name || '', pct, remaining: nxt ? nxt.xp - xp : 0 };
}

export function publishedOps(doc) {
  return doc.ops.filter((o) => isPublished(doc, o));
}

const inWeek = (day, weekStart) => day >= weekStart && day <= addDays(weekStart, 6);

/** Série : semaines consécutives avec au moins une publication, en remontant depuis cette semaine (ou la précédente). */
export function streakWeeks(doc, today) {
  const days = new Set(publishedOps(doc).map((o) => o.dates.publishActual));
  const hasWeek = (ws) => [...days].some((d) => inWeek(d, ws));
  let week = startOfWeek(today);
  if (!hasWeek(week)) {
    week = addDays(week, -7);
    if (!hasWeek(week)) return 0;
  }
  let n = 0;
  while (hasWeek(week)) { n += 1; week = addDays(week, -7); }
  return n;
}

export function weeklyGoal(doc, today) {
  const ws = startOfWeek(today);
  const goal = Math.max(0, Number(doc.game?.weeklyGoal) || 0);
  const done = publishedOps(doc).filter((o) => inWeek(o.dates.publishActual, ws)).length;
  const scheduled = doc.ops.filter((o) => !isPublished(doc, o) && o.dates.publishPlanned && inWeek(o.dates.publishPlanned, ws)).length;
  return { done, goal, scheduled, pct: goal ? Math.min(100, Math.round((done / goal) * 100)) : 0, reached: goal > 0 && done >= goal };
}

export function creditedTo(op) {
  return op.owner || op.publishedBy?.login || '';
}

export function leaderboard(doc, ops = publishedOps(doc)) {
  const map = new Map();
  for (const o of ops) {
    const login = creditedTo(o);
    if (!login) continue;
    const row = map.get(login) || { login, avatar: '', xp: 0, published: 0 };
    row.xp += xpOf(doc, o);
    row.published += 1;
    if (!row.avatar) row.avatar = o.publishedBy?.login === login ? (o.publishedBy.avatar || '') : (o.updatedBy?.login === login ? (o.updatedBy.avatar || '') : '');
    map.set(login, row);
  }
  return [...map.values()].sort((a, b) => b.xp - a.xp || b.published - a.published || a.login.localeCompare(b.login));
}

/** Badges d'équipe, dérivés du document. `progress` 0..1 pour ceux pas encore gagnés. */
export function badges(doc, today) {
  const pub = publishedOps(doc);
  const weeks = new Map();
  for (const o of pub) { const w = startOfWeek(o.dates.publishActual); weeks.set(w, (weeks.get(w) || 0) + 1); }
  const bestWeek = Math.max(0, ...weeks.values());
  const onTime = pub.filter((o) => o.dates.publishPlanned && o.dates.publishActual <= o.dates.publishPlanned).length;
  const maxChannels = Math.max(0, ...pub.map((o) => o.channels.length));
  const maxViews = Math.max(0, ...pub.map((o) => o.results?.views || 0));
  const kinds = new Set(pub.map((o) => o.kind));
  const streak = streakWeeks(doc, today);
  const channelsUsed = new Set(pub.flatMap((o) => o.channels));
  const def = (id, icon, label, hint, value, target) => ({ id, icon, label, hint, earned: value >= target, progress: Math.min(1, target ? value / target : 0), value, target });
  return [
    def('first', '🎬', 'Coup d’envoi', 'Première publication', pub.length, 1),
    def('hattrick', '🎩', 'Hat-trick', '3 publications dans la même semaine', bestWeek, 3),
    def('multichannel', '📡', 'Multicanal', 'Un coup diffusé sur 3 canaux', maxChannels, 3),
    def('ontime5', '⏱️', 'Ponctuel', '5 publications à la date prévue', onTime, 5),
    def('streak4', '🔥', 'En feu', '4 semaines de suite avec une publication', streak, 4),
    def('ten', '🔟', 'Machine', '10 publications', pub.length, 10),
    def('viral', '🚀', 'Viral', 'Un coup à 10 000 vues', maxViews, 10_000),
    def('polyvalent', '🎨', 'Polyvalent', '4 formats différents publiés', kinds.size, 4),
    def('everywhere', '🌍', 'Partout', '5 canaux différents utilisés', channelsUsed.size, 5),
    def('fifty', '💯', 'Demi-centenaire', '50 publications', pub.length, 50),
  ];
}

export function seasonOps(doc) {
  const s = doc.game?.season || {};
  const pub = publishedOps(doc);
  if (!s.startAt && !s.endAt) return pub;
  return pub.filter((o) => (!s.startAt || o.dates.publishActual >= s.startAt) && (!s.endAt || o.dates.publishActual <= s.endAt));
}

export function seasonXp(doc) {
  return totalXp(doc, seasonOps(doc));
}

export function seasonProgress(doc, today) {
  const s = doc.game?.season || {};
  const xp = seasonXp(doc);
  const goal = Math.max(0, Number(s.xpGoal) || 0);
  const daysLeft = s.endAt ? Math.max(0, dayOffset(today, s.endAt)) : null;
  const total = s.startAt && s.endAt ? Math.max(1, dayOffset(s.startAt, s.endAt)) : null;
  const elapsedPct = total ? Math.min(100, Math.max(0, Math.round((dayOffset(s.startAt, today) / total) * 100))) : null;
  return { xp, goal, pct: goal ? Math.min(100, Math.round((xp / goal) * 100)) : 0, daysLeft, elapsedPct, active: Boolean(s.name || s.startAt || s.endAt || goal), name: s.name || 'Saison' };
}
