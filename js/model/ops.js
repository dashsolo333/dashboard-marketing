// Un « coup » = une action marketing (post, vidéo, campagne, partenariat…).
import { pushActivity, isoDay, normalizeOp, normalizeResults } from './doc.js';
import { canMoveTo, stageById, latestReview } from './stages.js';

const VERDICTS = ['ok', 'ko'];

export function opById(doc, id) {
  return doc.ops.find((o) => o.id === id) || null;
}

function requireOp(doc, id) {
  const o = opById(doc, id);
  if (!o) throw new Error(`Coup introuvable : ${id}`);
  return o;
}

function journal(doc, { type, opId, text, by, at }) {
  return pushActivity(doc, { id: `a_${at}_${opId}_${type}`, at, by, opId, type, text });
}

function replaceOp(doc, next) {
  return { ...doc, ops: doc.ops.map((o) => (o.id === next.id ? next : o)) };
}

const knownChannels = (doc) => new Set((doc.channels || []).map((c) => c.id));

export function createOp(doc, { id, title, by, at, ...rest }) {
  const clean = String(title || '').trim();
  if (!clean) throw new Error('Le titre est obligatoire.');
  const op = normalizeOp({
    ...rest, id, title: clean, stageId: rest.stageId || doc.stages[0].id,
    createdAt: at, createdBy: by, updatedAt: at, updatedBy: by,
  }, knownChannels(doc));
  const next = { ...doc, ops: [...doc.ops, op] };
  return journal(next, { type: 'create', opId: id, text: `a créé « ${clean} »`, by, at });
}

export function updateOp(doc, id, patch, { by, at }) {
  const o = requireOp(doc, id);
  if (patch.title !== undefined && !String(patch.title).trim()) throw new Error('Le titre est obligatoire.');
  const next = normalizeOp({ ...o, ...patch, dates: { ...o.dates, ...(patch.dates || {}) }, updatedAt: at, updatedBy: by }, knownChannels(doc));
  const changed = Object.keys(patch).filter((k) => JSON.stringify(o[k]) !== JSON.stringify(next[k]));
  const out = replaceOp(doc, next);
  if (!changed.length) return out;
  return journal(out, { type: 'update', opId: id, text: `a modifié ${changed.join(', ')} de « ${o.title} »`, by, at });
}

export function moveOp(doc, id, stageId, { by, at, force = false }) {
  const o = requireOp(doc, id);
  const target = stageById(doc, stageId);
  if (!target) throw new Error('Étape inconnue');
  if (o.stageId === stageId) return doc;
  const gate = canMoveTo(doc, o, stageId, { force });
  if (!gate.ok) throw new Error(gate.reason);
  const day = isoDay(at);
  const dates = { ...o.dates };
  const isFinal = stageId === doc.gates.finalStageId;
  if (stageId === doc.gates.reviewStageId && !dates.reviewActual) dates.reviewActual = day;
  if (isFinal && !dates.publishActual) dates.publishActual = day;
  const publishedBy = isFinal && !o.publishedBy ? by : o.publishedBy;
  const next = { ...o, stageId, stepProgress: 0, dates, publishedBy, updatedAt: at, updatedBy: by };
  const forced = force && isFinal && !canMoveTo(doc, o, stageId).ok;
  const text = `a passé « ${o.title} » en ${target.label}${forced ? ' (forcé, sans validation OK)' : ''}`;
  return journal(replaceOp(doc, next), { type: 'move', opId: id, text, by, at });
}

export function addReview(doc, id, { id: reviewId, verdict, notes = '', by, at }) {
  const o = requireOp(doc, id);
  if (!VERDICTS.includes(verdict)) throw new Error('Verdict invalide (ok / ko).');
  const review = { id: reviewId, at, by, verdict, notes: String(notes || '') };
  const next = { ...o, reviews: [...o.reviews, review], updatedAt: at, updatedBy: by };
  const text = `a validé « ${o.title} » : ${verdict.toUpperCase()}${notes ? ` — ${notes}` : ''}`;
  return journal(replaceOp(doc, next), { type: 'review', opId: id, text, by, at });
}

export function removeReview(doc, id, reviewId, { by, at }) {
  const o = requireOp(doc, id);
  return replaceOp(doc, { ...o, reviews: o.reviews.filter((r) => r.id !== reviewId), updatedAt: at, updatedBy: by });
}

export function setResults(doc, id, results, { by, at }) {
  const o = requireOp(doc, id);
  const next = { ...o, results: normalizeResults({ ...o.results, ...results }), updatedAt: at, updatedBy: by };
  if (JSON.stringify(next.results) === JSON.stringify(o.results)) return doc;
  return journal(replaceOp(doc, next), { type: 'update', opId: id, text: `a mis à jour les résultats de « ${o.title} »`, by, at });
}

export function deleteOp(doc, id, { by, at }) {
  const o = requireOp(doc, id);
  const next = { ...doc, ops: doc.ops.filter((x) => x.id !== id) };
  return journal(next, { type: 'delete', opId: id, text: `a supprimé « ${o.title} »`, by, at });
}

export const lastVerdict = latestReview;

/** Retard : date prévue dépassée sans date réelle. */
export function isLate(op, today) {
  const d = op.dates || {};
  const late = (planned, actual) => Boolean(planned) && !actual && planned < today;
  return { review: late(d.reviewPlanned, d.reviewActual), publish: late(d.publishPlanned, d.publishActual) };
}

/* ---------- checklist de tâches ---------- */

export function addChecklistItem(doc, id, { id: itemId, text, group = '', due = '', by, at, silent = false }) {
  const o = requireOp(doc, id);
  const clean = String(text || '').trim();
  if (!clean) throw new Error('Le texte de la tâche est obligatoire.');
  const item = { id: itemId, text: clean, group: group || '', due: due || '', note: '', status: 'todo', done: false, doneAt: '', doneBy: null, createdAt: at, createdBy: by };
  const out = replaceOp(doc, { ...o, items: [...o.items, item], updatedAt: at, updatedBy: by });
  if (silent) return out;
  return journal(out, { type: 'update', opId: id, text: `a ajouté la tâche « ${clean} » à « ${o.title} »`, by, at });
}

const ITEM_STATUSES = ['todo', 'doing', 'blocked', 'done'];
const STATUS_TEXT = { todo: 'à faire', doing: 'en cours', blocked: 'bloquée', done: 'faite' };

export function setChecklistStatus(doc, id, itemId, status, { by, at }) {
  const o = requireOp(doc, id);
  const item = o.items.find((i) => i.id === itemId);
  if (!item) return doc;
  if (!ITEM_STATUSES.includes(status)) throw new Error('Statut de tâche invalide.');
  const done = status === 'done';
  const items = o.items.map((i) => (i.id === itemId ? { ...i, status, done, doneAt: done ? at : '', doneBy: done ? by : null } : i));
  const text = `a passé « ${item.text} » ${STATUS_TEXT[status]} sur « ${o.title} »`;
  return journal(replaceOp(doc, { ...o, items, updatedAt: at, updatedBy: by }), { type: 'update', opId: id, text, by, at });
}

export function toggleChecklistItem(doc, id, itemId, meta) {
  const o = requireOp(doc, id);
  const item = o.items.find((i) => i.id === itemId);
  if (!item) return doc;
  return setChecklistStatus(doc, id, itemId, item.done ? 'todo' : 'done', meta);
}

export function updateChecklistItem(doc, id, itemId, patch, { by, at }) {
  const o = requireOp(doc, id);
  const item = o.items.find((i) => i.id === itemId);
  if (!item) return doc;
  if (patch.text !== undefined && !String(patch.text).trim()) throw new Error('Le texte de la tâche est obligatoire.');
  const clean = { ...patch };
  if (clean.text !== undefined) clean.text = String(clean.text).trim();
  const items = o.items.map((i) => (i.id === itemId ? { ...i, ...clean } : i));
  return replaceOp(doc, { ...o, items, updatedAt: at, updatedBy: by });
}

export function removeChecklistItem(doc, id, itemId, { by, at }) {
  const o = requireOp(doc, id);
  return replaceOp(doc, { ...o, items: o.items.filter((i) => i.id !== itemId), updatedAt: at, updatedBy: by });
}

export function checklistProgress(op) {
  const items = op.items || [];
  return { done: items.filter((i) => i.done).length, total: items.length };
}
