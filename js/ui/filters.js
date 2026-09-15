import { isLate } from '../model/ops.js';
import { startOfWeek, addDays } from '../model/roadmap.js';
import { today } from './dom.js';

export function matches(op, filters, doc) {
  const q = (filters.q || '').trim().toLowerCase();
  if (q) {
    const channels = op.channels.map((id) => doc.channels.find((c) => c.id === id)?.label || id).join(' ');
    const hay = [op.title, op.description, op.kind, op.owner, channels].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.channel && !op.channels.includes(filters.channel)) return false;
  if (filters.stage && op.stageId !== filters.stage) return false;
  if (filters.campaign && op.campaignId !== filters.campaign) return false;
  if (filters.late) {
    const l = isLate(op, today());
    if (!l.review && !l.publish) return false;
  }
  if (filters.week) {
    const ws = startOfWeek(today()); const we = addDays(ws, 6);
    if (op.stageId === doc.gates.finalStageId || !op.dates.publishPlanned || op.dates.publishPlanned < ws || op.dates.publishPlanned > we) return false;
  }
  if (filters.stageSet && !filters.stageSet.includes(op.stageId)) return false;
  return true;
}

export function visibleOps(doc, filters) {
  return doc.ops.filter((o) => matches(o, filters, doc));
}

export function hasActiveFilter(filters) {
  return Boolean(filters.q || filters.channel || filters.stage || filters.campaign || filters.late || filters.week || filters.stageSet);
}
