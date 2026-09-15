import { isLate, opDay } from '../model/ops.js';
import { startOfWeek, addDays } from '../model/calendar.js';
import { today } from './dom.js';

export function matches(op, filters, doc) {
  const q = (filters.q || '').trim().toLowerCase();
  if (q) {
    const channels = op.channels.map((id) => doc.channels.find((c) => c.id === id)?.label || id).join(' ');
    const hay = [op.title, op.description, op.caption, op.hashtags, op.rubric, op.owner, channels].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.channel && !op.channels.includes(filters.channel)) return false;
  if (filters.stage && op.stageId !== filters.stage) return false;
  if (filters.late && !isLate(op, today())) return false;
  if (filters.urgent && !(op.urgent && op.stageId !== doc.gates.finalStageId)) return false;
  if (filters.unscheduled && !(op.stageId !== doc.gates.finalStageId && !op.dates.publishPlanned)) return false;
  if (filters.week) {
    const ws = startOfWeek(today()); const we = addDays(ws, 6);
    const d = opDay(op);
    if (!d || d < ws || d > we) return false;
  }
  return true;
}

export function visibleOps(doc, filters) {
  return doc.ops.filter((o) => matches(o, filters, doc));
}

export function hasActiveFilter(filters) {
  return Boolean(filters.q || filters.channel || filters.stage || filters.late || filters.week || filters.urgent || filters.unscheduled);
}
