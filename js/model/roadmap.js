import { isoDay } from './doc.js';

const DAY = 86_400_000;

function toDate(day) {
  return new Date(`${day}T00:00:00Z`);
}

function fromDate(d) {
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(day) {
  const d = toDate(day);
  const dow = (d.getUTCDay() + 6) % 7; // lundi = 0
  return fromDate(new Date(d.getTime() - dow * DAY));
}

export function addDays(day, n) {
  return fromDate(new Date(toDate(day).getTime() + n * DAY));
}

export function dayOffset(from, to) {
  return Math.round((toDate(to) - toDate(from)) / DAY);
}

export function weekRange(today, { before = 2, after = 8 } = {}) {
  const current = startOfWeek(today);
  const weeks = [];
  for (let i = -before; i <= after; i += 1) {
    const start = addDays(current, i * 7);
    weeks.push({ start, end: addDays(start, 6), isCurrent: i === 0 });
  }
  return weeks;
}

/** Empan d'un coup : création → date la plus lointaine connue (ou aujourd'hui). */
export function opSpan(op, today) {
  const start = isoDay(op.createdAt) || today;
  const d = op.dates || {};
  const candidates = [d.reviewPlanned, d.publishPlanned, d.reviewActual, d.publishActual].filter(Boolean);
  if (!candidates.length) return { start, end: today > start ? today : start, open: true };
  const end = candidates.sort().at(-1);
  return { start, end: end > start ? end : start, open: false };
}

export function weekLabel(start) {
  const d = toDate(start);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function isoWeek(day) {
  const d = new Date(`${day}T00:00:00Z`);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / DAY + 1) / 7);
}
