// Dates : semaines qui commencent le lundi, grille mensuelle du calendrier éditorial.
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

export function isoWeek(day) {
  const d = toDate(day);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / DAY + 1) / 7);
}

/** 'AAAA-MM' décalé de n mois. */
export function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Grille du mois : semaines complètes (lundi → dimanche) qui couvrent le mois. */
export function monthGrid(month, today) {
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const last = fromDate(new Date(Date.UTC(y, m, 0)));
  let cursor = startOfWeek(first);
  const weeks = [];
  while (cursor <= last) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(cursor, i);
      week.push({ day, inMonth: day.slice(0, 7) === month, isToday: day === today, weekend: i >= 5 });
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return { month, first, last, weeks };
}
