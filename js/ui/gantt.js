// Vue Gantt : une barre par coup, de sa création à sa dernière date, avec deux
// repères — validation (or) et publication (vert) — et la ligne d'aujourd'hui.
import { h, fmtDay, today } from './dom.js';
import { weekRange, weekLabel, dayOffset, isoWeek } from '../model/calendar.js';
import { opSpan } from '../model/gantt.js';
import { stageById, stageIndex } from '../model/stages.js';
import { isLate, isReviewLate, reviewedAt, opDay } from '../model/ops.js';
import { visibleOps } from './filters.js';

const REVIEW = '#f5c451';
const PUBLISH = '#b5f03a';

export function renderGantt(ctx) {
  const doc = ctx.doc;
  const t = today();
  const weeks = weekRange(t, { before: 2, after: 9 });
  const first = weeks[0].start;
  const totalDays = weeks.length * 7;
  const pct = (day) => `${(Math.max(0, Math.min(totalDays, dayOffset(first, day))) / totalDays) * 100}%`;
  const ops = [...visibleOps(doc, ctx.filters)]
    .filter((o) => o.stageId !== doc.gates.finalStageId || (o.dates.publishActual || '') >= first)
    .sort((a, b) => (opDay(a) || a.dates.reviewPlanned || '9999').localeCompare(opDay(b) || b.dates.reviewPlanned || '9999'));
  const cols = `repeat(${weeks.length}, 1fr)`;

  return h('div', {},
    h('div', { class: 'roadmap glass' },
      h('div', { class: 'gantt' },
        h('div', { class: 'gantt-side' },
          h('div', { class: 'gantt-head' }, `${ops.length} coup${ops.length > 1 ? 's' : ''}`),
          ops.map((o) => {
            const stage = stageById(doc, o.stageId);
            return h('div', { class: 'gantt-row', onClick: () => ctx.openOp(o.id), title: o.title },
              h('span', { class: 'gantt-dot', style: { background: stage?.color } }),
              h('span', { class: 'name' }, `${o.icon ? `${o.icon} ` : ''}${o.title}`));
          })),
        h('div', { class: 'gantt-body' },
          h('div', { class: 'weeks', style: { gridTemplateColumns: cols } },
            weeks.map((w) => h('div', { class: `week${w.isCurrent ? ' is-current' : ''}` }, h('b', {}, weekLabel(w.start)), `sem. ${isoWeek(w.start)}`))),
          h('div', { class: 'lanes' },
            ops.map((o) => renderLane(ctx, o, { weeks, cols, pct, t })),
            h('div', { class: 'today-line', style: { left: pct(t) } })))),
      ),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { style: { '--mk': REVIEW } }), 'validation prévue'),
      h('span', {}, h('i', { class: 'is-done', style: { '--mk': REVIEW } }), 'validé'),
      h('span', {}, h('i', { style: { '--mk': PUBLISH } }), 'publication prévue'),
      h('span', {}, h('i', { class: 'is-done', style: { '--mk': PUBLISH } }), 'publié'),
      h('span', {}, 'repère clignotant = date dépassée · barre hachurée = aucune date')),
    !ops.length ? h('div', { class: 'empty' }, h('b', {}, 'Rien à planifier'), 'Ajoute des dates de validation et de publication dans les fiches.') : null);
}

function renderLane(ctx, o, { weeks, cols, pct, t }) {
  const doc = ctx.doc;
  const span = opSpan(o, t);
  const stage = stageById(doc, o.stageId);
  const left = pct(span.start);
  const right = pct(span.end);
  const reviewed = reviewedAt(o);
  const d = o.dates;
  const marker = (day, color, done, late, label) => (day ? h('button', {
    type: 'button', class: `marker${done ? ' is-done' : ''}${late ? ' is-late' : ''}`, style: { left: pct(day), '--mk': color },
    title: `${label} · ${fmtDay(day)}`, 'aria-label': `${label} ${fmtDay(day)}`, onClick: () => ctx.openOp(o.id),
  }) : null);
  return h('div', { class: 'lane' },
    h('div', { class: 'lane-grid', style: { gridTemplateColumns: cols } }, weeks.map((w) => h('span', { class: w.isCurrent ? 'is-current' : '' }))),
    h('div', { class: `gbar${span.open ? ' is-open' : ''}`, style: { left, width: `calc(${right} - ${left})`, '--gbar': stage?.color || '#8b8fa8' }, title: `${o.title} · ${stage?.label || ''}`, onClick: () => ctx.openOp(o.id) },
      !span.open ? h('i', { style: { width: `${progressWidth(doc, o)}%` } }) : null),
    marker(reviewed || d.reviewPlanned, REVIEW, Boolean(reviewed), isReviewLate(o, t), reviewed ? 'Validé' : 'Validation prévue'),
    marker(d.publishActual || d.publishPlanned, PUBLISH, Boolean(d.publishActual), isLate(o, t), d.publishActual ? 'Publié' : 'Publication prévue'));
}

/** Remplissage de la barre : avancement dans le pipeline. */
function progressWidth(doc, o) {
  return Math.round(((stageIndex(doc, o.stageId) + 1) / doc.stages.length) * 100);
}
