// Actions groupées sur une sélection de coups (un seul commit).
import { moveOp, updateOp, deleteOp, opById } from './ops.js';
import { canMoveTo } from './stages.js';

export function bulkMove(doc, ids, stageId, { by, at, force = false }) {
  let next = doc;
  const moved = [];
  const blocked = [];
  for (const id of ids) {
    const o = opById(next, id);
    if (!o || o.stageId === stageId) continue;
    const gate = canMoveTo(next, o, stageId, { force });
    if (!gate.ok) { blocked.push({ id, title: o.title, reason: gate.reason }); continue; }
    next = moveOp(next, id, stageId, { by, at, force });
    moved.push(id);
  }
  return { doc: next, moved, blocked };
}

export function bulkUpdate(doc, ids, patch, meta) {
  let next = doc;
  let updated = 0;
  for (const id of ids) {
    if (!opById(next, id)) continue;
    next = updateOp(next, id, patch, meta);
    updated += 1;
  }
  return { doc: next, updated };
}

export function bulkDelete(doc, ids, meta) {
  let next = doc;
  let deleted = 0;
  for (const id of ids) {
    if (!opById(next, id)) continue;
    next = deleteOp(next, id, meta);
    deleted += 1;
  }
  return { doc: next, deleted };
}
