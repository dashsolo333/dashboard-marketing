// Calendrier éditorial : un mois, une case par jour, les coups posés sur leur
// date de publication (couleur du canal). Glisser une carte replanifie.
import { h, icon, fmtDay, today } from './dom.js';
import { monthGrid, shiftMonth, monthLabel, isoWeek } from '../model/calendar.js';
import { opDay, updateOp, isLate } from '../model/ops.js';
import { stageById } from '../model/stages.js';
import { visibleOps } from './filters.js';

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function renderCalendar(ctx) {
  const doc = ctx.doc;
  const t = today();
  const month = ctx.month || t.slice(0, 7);
  const grid = monthGrid(month, t);
  const ops = visibleOps(doc, ctx.filters);
  const byDay = new Map();
  for (const o of ops) { const d = opDay(o); if (!d) continue; if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(o); }
  for (const list of byDay.values()) list.sort((a, b) => (a.publishTime || '99').localeCompare(b.publishTime || '99') || a.title.localeCompare(b.title));
  const unscheduled = ops.filter((o) => !opDay(o)).sort((a, b) => Number(b.urgent) - Number(a.urgent) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const inMonth = ops.filter((o) => opDay(o).slice(0, 7) === month);
  const published = inMonth.filter((o) => o.stageId === doc.gates.finalStageId).length;

  const drop = (day) => (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('is-over');
    const id = e.dataTransfer.getData('text/plain');
    const o = doc.ops.find((x) => x.id === id);
    if (!o) return;
    if (o.dates.publishActual) { ctx.toast('Ce coup est déjà publié : sa date ne bouge plus.', { kind: 'error' }); return; }
    if (o.dates.publishPlanned === day) return;
    ctx.act(`a replanifié « ${o.title} » au ${fmtDay(day)}`, (d) => updateOp(d, id, { dates: { publishPlanned: day } }, ctx.meta()));
  };

  return h('div', { class: 'cal-layout' },
    h('section', { class: 'cal glass' },
      h('header', { class: 'cal-head' },
        h('div', { class: 'cal-nav' },
          h('button', { type: 'button', class: 'btn btn-icon btn-sm', 'aria-label': 'Mois précédent', onClick: () => ctx.setMonth(shiftMonth(month, -1)) }, icon('left')),
          h('h2', { class: 'cal-title' }, monthLabel(month)),
          h('button', { type: 'button', class: 'btn btn-icon btn-sm', 'aria-label': 'Mois suivant', onClick: () => ctx.setMonth(shiftMonth(month, 1)) }, icon('right')),
          month !== t.slice(0, 7) ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => ctx.setMonth(t.slice(0, 7)) }, 'Aujourd’hui') : null),
        h('div', { class: 'cal-summary' }, h('b', {}, inMonth.length), ` coup${inMonth.length > 1 ? 's' : ''} ce mois · `, h('b', {}, published), ' publié', published > 1 ? 's' : '',
          ctx.canWrite() ? h('span', { class: 'hint' }, ' · glisse une carte pour replanifier') : null)),
      h('div', { class: 'cal-dow' }, h('span', { class: 'cal-wk' }), DOW.map((d, i) => h('span', { class: i >= 5 ? 'is-weekend' : '' }, d))),
      grid.weeks.map((week) => h('div', { class: 'cal-week' },
        h('span', { class: 'cal-wk', title: 'Semaine ISO' }, `S${isoWeek(week[0].day)}`),
        week.map((cell) => {
          const list = byDay.get(cell.day) || [];
          const el = h('div', {
            class: `cal-day${cell.inMonth ? '' : ' is-out'}${cell.isToday ? ' is-today' : ''}${cell.weekend ? ' is-weekend' : ''}${cell.day < t ? ' is-past' : ''}`,
            onDragover: (e) => { if (!ctx.canWrite()) return; e.preventDefault(); el.classList.add('is-over'); },
            onDragleave: () => el.classList.remove('is-over'),
            onDrop: drop(cell.day),
          },
          h('div', { class: 'cal-day-head' },
            h('span', { class: 'cal-num' }, Number(cell.day.slice(8))),
            ctx.canWrite() && cell.inMonth ? h('button', { type: 'button', class: 'cal-add', title: 'Nouveau coup ce jour', 'aria-label': `Nouveau coup le ${fmtDay(cell.day)}`, onClick: () => ctx.openCreate({ publishPlanned: cell.day }) }, icon('plus')) : null),
          h('div', { class: 'cal-items' }, list.map((o) => renderChip(ctx, o, t))));
          return el;
        }))),
      h('div', { class: 'legend cal-legend' }, doc.channels.map((c) => h('span', {}, h('i', { class: 'legend-dot', style: { background: c.color } }), `${c.icon} ${c.label}`)))),

    h('aside', { class: 'cal-side' },
      h('section', { class: 'panel glass' },
        h('div', { class: 'section-head' }, h('h3', {}, `À planifier · ${unscheduled.length}`)),
        unscheduled.length ? h('div', { class: 'cal-unscheduled' }, unscheduled.map((o) => renderChip(ctx, o, t, { full: true })))
          : h('p', { class: 'hint' }, 'Tout a une date. Les nouvelles idées sans date apparaîtront ici : glisse-les sur un jour.')),
      h('section', { class: 'panel glass' },
        h('div', { class: 'section-head' }, h('h3', {}, 'Cette semaine')),
        renderWeekAgenda(ctx, ops, t))));
}

function renderChip(ctx, o, t, { full = false } = {}) {
  const doc = ctx.doc;
  const ch = o.channels.map((id) => doc.channels.find((c) => c.id === id)).filter(Boolean);
  const stage = stageById(doc, o.stageId);
  const done = o.stageId === doc.gates.finalStageId;
  const late = isLate(o, t);
  const el = h('button', {
    type: 'button', class: `cal-chip${done ? ' is-done' : ''}${late ? ' is-late' : ''}${o.urgent ? ' is-urgent' : ''}${full ? ' is-full' : ''}`,
    style: { '--ch': ch[0]?.color || stage?.color || '#8b8fa8' }, title: `${o.title} · ${stage?.label || ''}${o.publishTime ? ` · ${o.publishTime}` : ''}`,
    draggable: ctx.canWrite() && !done ? 'true' : null,
    onClick: () => ctx.openOp(o.id),
    onDragstart: (e) => { e.dataTransfer.setData('text/plain', o.id); e.dataTransfer.effectAllowed = 'move'; el.classList.add('is-dragging'); },
    onDragend: () => el.classList.remove('is-dragging'),
  },
  (o.publishTime && !done) || ch.length > 1 ? h('span', { class: 'cal-chip-meta' },
    o.publishTime && !done ? h('span', { class: 'cal-chip-time' }, o.publishTime) : null,
    ch.length > 1 ? h('span', { class: 'cal-chip-dots' }, ch.slice(0, 3).map((c) => h('i', { style: { background: c.color } }))) : null) : null,
  h('span', { class: 'cal-chip-title' }, `${o.icon ? `${o.icon} ` : ''}${o.title}`),
  done ? h('span', { class: 'cal-chip-check' }, icon('check')) : null);
  return el;
}

function renderWeekAgenda(ctx, ops, t) {
  const doc = ctx.doc;
  const { startOfWeek, addDays } = ctx.calendarHelpers;
  const ws = startOfWeek(t);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const rows = days.map((day) => ({ day, list: ops.filter((o) => opDay(o) === day).sort((a, b) => (a.publishTime || '99').localeCompare(b.publishTime || '99')) })).filter((r) => r.list.length);
  if (!rows.length) return h('p', { class: 'hint' }, 'Rien de prévu cette semaine.');
  return h('div', { class: 'agenda' }, rows.map((r) => h('div', { class: `agenda-day${r.day === t ? ' is-today' : ''}` },
    h('div', { class: 'agenda-when' }, r.day === t ? 'Aujourd’hui' : fmtDay(r.day)),
    r.list.map((o) => h('button', { type: 'button', class: 'agenda-item', onClick: () => ctx.openOp(o.id) },
      h('span', { class: 'agenda-time' }, o.publishTime || '—'),
      h('span', { class: 'agenda-title' }, `${o.icon ? `${o.icon} ` : ''}${o.title}`),
      o.stageId === doc.gates.finalStageId ? h('span', { class: 'badge badge-ok' }, '✓') : h('span', { class: 'chip chip-stage chip-xs', style: { '--dot': stageById(doc, o.stageId)?.color } }, h('i', { class: 'chip-dot' }), stageById(doc, o.stageId)?.label))))));
}
