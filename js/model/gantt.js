// Gantt : une barre par coup, de sa création à sa date la plus lointaine,
// avec deux repères : validation et publication.
import { isoDay } from './doc.js';

/** Empan d'un coup : création → date la plus lointaine connue (ou aujourd'hui si aucune). */
export function opSpan(op, today) {
  const start = isoDay(op.createdAt) || today;
  const d = op.dates || {};
  const candidates = [d.reviewPlanned, d.publishPlanned, d.publishActual].filter(Boolean);
  if (!candidates.length) return { start, end: today > start ? today : start, open: true };
  const end = candidates.sort().at(-1);
  return { start, end: end > start ? end : start, open: false };
}
