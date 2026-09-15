// Frise d'un coup : le passé vient du journal (création, déplacements,
// validations), le futur de la date de publication pas encore atteinte.
import { isoDay } from './doc.js';

export function opTimeline(doc, op, today) {
  const past = doc.activity
    .filter((a) => a.opId === op.id && ['create', 'move', 'review'].includes(a.type))
    .map((a) => ({ kind: a.type, day: isoDay(a.at), at: a.at, text: a.text, by: a.by, future: false, late: false }));
  if (!past.some((e) => e.kind === 'create') && op.createdAt) {
    past.unshift({ kind: 'create', day: isoDay(op.createdAt), at: op.createdAt, text: 'a créé la fiche', by: op.createdBy, future: false, late: false });
  }
  const { publishPlanned, publishActual } = op.dates || {};
  const planned = publishPlanned && !publishActual
    ? [{ kind: 'publish', day: publishPlanned, at: `${publishPlanned}T00:00:00Z`, text: 'Publication prévue', by: null, future: publishPlanned >= today, late: publishPlanned < today }]
    : [];
  return [...past, ...planned].sort((a, b) => a.at.localeCompare(b.at));
}
