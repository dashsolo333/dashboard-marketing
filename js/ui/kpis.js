import { h, today } from './dom.js';
import { isLate } from '../model/ops.js';
import { startOfWeek, addDays } from '../model/roadmap.js';

export function renderKpis(ctx) {
  const doc = ctx.doc;
  if (!doc) return null;
  const t = today();
  const { reviewStageId, finalStageId } = doc.gates;
  const midStages = doc.stages.filter((s) => s.id !== finalStageId && s.id !== reviewStageId && s.id !== doc.stages[0].id).map((s) => s.id);
  const ops = doc.ops;
  const count = (fn) => ops.filter(fn).length;
  const late = count((o) => { const l = isLate(o, t); return l.review || l.publish; });
  const ws = startOfWeek(t); const we = addDays(ws, 6);
  const thisWeek = (o) => o.stageId !== finalStageId && o.dates.publishPlanned && o.dates.publishPlanned >= ws && o.dates.publishPlanned <= we;
  const monthStart = `${t.slice(0, 7)}-01`;
  const publishedMonth = count((o) => o.stageId === finalStageId && o.dates.publishActual >= monthStart);

  const tile = (key, label, value, sub, color, filter) => h('button', {
    type: 'button', class: `kpi glass kpi-${key}`, 'aria-pressed': ctx.filters.kpi === key ? 'true' : 'false',
    style: { '--kpi': color }, onClick: () => ctx.toggleKpi(key, filter),
  },
  h('span', { class: 'kpi-accent' }),
  h('div', { class: 'kpi-label' }, label),
  h('div', { class: 'kpi-value' }, value),
  sub ? h('div', { class: 'kpi-sub' }, sub) : null);

  return [
    tile('all', 'Coups', ops.length, `${count((o) => o.stageId === doc.stages[0].id)} au stade idée`, '#8b8fa8', {}),
    tile('wip', 'En chantier', count((o) => midStages.includes(o.stageId)), 'brief → programmé', '#8b5cf6', { stageSet: midStages }),
    tile('review', 'À valider', count((o) => o.stageId === reviewStageId), 'en attente d’un GO', '#f59e0b', { stage: reviewStageId }),
    tile('week', 'Cette semaine', count(thisWeek), 'publications prévues', '#22d3ee', { week: true }),
    tile('month', 'Publiés ce mois', publishedMonth, `${count((o) => o.stageId === finalStageId)} au total`, '#b5f03a', { stage: finalStageId }),
    tile('late', 'En retard', late, late ? 'date cible dépassée' : 'tout est à l’heure', '#f87171', { late: true }),
  ];
}
