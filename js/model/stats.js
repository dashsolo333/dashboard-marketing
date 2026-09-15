// Statistiques dérivées : rythme par canal, totaux de campagne.
import { startOfWeek, addDays } from './calendar.js';
import { opDay } from './ops.js';
import { RESULT_FIELDS } from './doc.js';

const WEEKS_BACK = 8;

/** Par canal : cette semaine, ce mois, 30 prochains jours, dernière publication, 8 dernières semaines, non datés. */
export function channelStats(doc, today) {
  const ws = startOfWeek(today);
  const we = addDays(ws, 6);
  const month = today.slice(0, 7);
  const in30 = addDays(today, 30);
  const weekStarts = Array.from({ length: WEEKS_BACK }, (_, i) => addDays(ws, -7 * (WEEKS_BACK - 1 - i)));
  return doc.channels.map((channel) => {
    const ops = doc.ops.filter((o) => o.channels.includes(channel.id));
    const dated = ops.map((o) => ({ o, day: opDay(o) })).filter((x) => x.day);
    const published = dated.filter((x) => x.o.dates.publishActual).map((x) => x.o.dates.publishActual).sort();
    return {
      channel,
      total: ops.length,
      week: dated.filter((x) => x.day >= ws && x.day <= we).length,
      month: dated.filter((x) => x.day.slice(0, 7) === month).length,
      next30: dated.filter((x) => !x.o.dates.publishActual && x.day > today && x.day <= in30).length,
      unscheduled: ops.length - dated.length,
      last: published.at(-1) || '',
      weeks: weekStarts.map((s) => dated.filter((x) => x.day >= s && x.day <= addDays(s, 6)).length),
      weekStarts,
    };
  });
}

/** Somme des résultats des coups d'une campagne + compte publié / total. */
export function campaignTotals(doc, campaignId) {
  const ops = doc.ops.filter((o) => o.campaignId === campaignId);
  const totals = Object.fromEntries(RESULT_FIELDS.map((f) => [f.id, 0]));
  for (const o of ops) for (const m of Object.values(o.results.channels)) for (const f of RESULT_FIELDS) totals[f.id] += m[f.id] || 0;
  return { ...totals, total: ops.length, published: ops.filter((o) => o.stageId === doc.gates.finalStageId).length };
}

export function campaignProgress(c) {
  const target = Number(c.target) || 0;
  const actual = Number(c.actual) || 0;
  return { actual, target, pct: target ? Math.min(100, Math.round((actual / target) * 100)) : 0 };
}
