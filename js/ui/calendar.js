// Calendrier éditorial : semaine par semaine, une ligne par coup, jalons validation / publication.
import { h, fmtDay, today } from './dom.js';
import { weekRange, opSpan, dayOffset, weekLabel, isoWeek } from '../model/roadmap.js';
import { stageById } from '../model/stages.js';
import { isLate } from '../model/ops.js';
import { ringGauge } from './gauge.js';
import { visibleOps } from './filters.js';

export function renderCalendar(ctx) {
  const doc = ctx.doc;
  const t = today();
  const weeks = weekRange(t, { before: 2, after: 9 });
  const first = weeks[0].start;
  const totalDays = weeks.length * 7;
  const pct = (day) => `${(Math.max(0, Math.min(totalDays, dayOffset(first, day))) / totalDays) * 100}%`;
  const ops = [...visibleOps(doc, ctx.filters)]
    .filter((o) => o.stageId !== doc.gates.finalStageId || o.dates.publishActual >= first)
    .sort((a, b) => (a.dates.publishPlanned || a.dates.reviewPlanned || '9999').localeCompare(b.dates.publishPlanned || b.dates.reviewPlanned || '9999'));
  const cols = `repeat(${weeks.length}, 1fr)`;
  const perWeek = weeks.map((w) => doc.ops.filter((o) => { const d = o.dates.publishActual || o.dates.publishPlanned; return d && d >= w.start && d <= w.end; }).length);

  return h('div', {},
    h('div', { class: 'roadmap glass' },
      h('div', { class: 'gantt' },
        h('div', { class: 'gantt-side' },
          h('div', { class: 'gantt-head' }, `${ops.length} coup${ops.length > 1 ? 's' : ''}`),
          ops.map((o) => h('div', { class: 'gantt-row', onClick: () => ctx.openOp(o.id) },
            ringGauge(doc, o, 28), h('span', { class: 'name' }, `${o.icon ? `${o.icon} ` : ''}${o.title}`)))),
        h('div', { class: 'gantt-body' },
          h('div', { class: 'weeks', style: { gridTemplateColumns: cols } },
            weeks.map((w, i) => h('div', { class: `week${w.isCurrent ? ' is-current' : ''}` }, h('b', {}, weekLabel(w.start)), `sem. ${isoWeek(w.start)}`, perWeek[i] ? h('span', { class: 'week-count' }, `${perWeek[i]}`) : null))),
          h('div', { class: 'lanes' },
            ops.map((o) => renderLane(ctx, o, { weeks, cols, pct, t })),
            h('div', { class: 'today-line', style: { left: pct(t) } })))),
      ),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { style: { '--mk': '#f59e0b' } }), 'validation prévue'),
      h('span', {}, h('i', { class: 'is-done', style: { '--mk': '#f59e0b' } }), 'validée'),
      h('span', {}, h('i', { style: { '--mk': '#b5f03a' } }), 'publication prévue'),
      h('span', {}, h('i', { class: 'is-done', style: { '--mk': '#b5f03a' } }), 'publié'),
      h('span', {}, 'barre hachurée = aucune date cible')),
    !ops.length ? h('div', { class: 'empty' }, h('b', {}, 'Rien à planifier'), 'Ajoute des dates de publication dans les fiches.') : null);
}

function renderLane(ctx, o, { weeks, cols, pct, t }) {
  const doc = ctx.doc;
  const span = opSpan(o, t);
  const stage = stageById(doc, o.stageId);
  const late = isLate(o, t);
  const left = pct(span.start);
  const right = pct(span.end);
  const d = o.dates;
  const marker = (day, color, done, isLateFlag, label) => day ? h('button', {
    type: 'button', class: `marker${done ? ' is-done' : ''}${isLateFlag ? ' is-late' : ''}`, style: { left: pct(day), '--mk': color },
    title: `${label} · ${fmtDay(day)}`, 'aria-label': `${label} ${fmtDay(day)}`, onClick: () => ctx.openOp(o.id),
  }) : null;
  return h('div', { class: 'lane' },
    h('div', { class: 'lane-grid', style: { gridTemplateColumns: cols } }, weeks.map((w) => h('span', { class: w.isCurrent ? 'is-current' : '' }))),
    h('div', { class: `gbar${span.open ? ' is-open' : ''}`, style: { left, width: `calc(${right} - ${left})`, '--gbar': stage?.color }, title: `${o.title} · ${stage?.label}`, onClick: () => ctx.openOp(o.id) },
      !span.open ? h('i', { style: { width: `${gaugeWidth(doc, o)}%` } }) : null),
    marker(d.reviewActual || d.reviewPlanned, '#f59e0b', Boolean(d.reviewActual), late.review, 'Validation'),
    marker(d.publishActual || d.publishPlanned, '#b5f03a', Boolean(d.publishActual), late.publish, 'Publication'));
}

function gaugeWidth(doc, o) {
  const idx = doc.stages.findIndex((s) => s.id === o.stageId);
  return Math.round(((idx + (o.stepProgress || 0) / 100) / doc.stages.length) * 100);
}
