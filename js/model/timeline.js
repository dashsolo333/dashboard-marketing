// Frise d'un coup : le passé vient du journal (création, déplacements,
// validations), le futur des dates cibles pas encore atteintes.
import { isoDay } from './doc.js';

export function opTimeline(doc, op, today) {
  const past = doc.activity
    .filter((a) => a.opId === op.id && ['create', 'move', 'review'].includes(a.type))
    .map((a) => ({ kind: a.type, day: isoDay(a.at), at: a.at, text: a.text, by: a.by, future: false, late: false }));
  if (!past.some((e) => e.kind === 'create') && op.createdAt) {
    past.unshift({ kind: 'create', day: isoDay(op.createdAt), at: op.createdAt, text: 'a créé la fiche', by: op.createdBy, future: false, late: false });
  }
  const d = op.dates || {};
  const planned = [
    ['review', d.reviewPlanned, d.reviewActual, 'Validation'],
    ['publish', d.publishPlanned, d.publishActual, 'Publication'],
  ].filter(([, plannedDay, actual]) => plannedDay && !actual)
    .map(([kind, day, , label]) => ({ kind, day, at: `${day}T00:00:00Z`, text: `${label} prévue`, by: null, future: day >= today, late: day < today }));
  return [...past, ...planned].sort((a, b) => a.at.localeCompare(b.at));
}
