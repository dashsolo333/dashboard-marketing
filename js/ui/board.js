import { h } from './dom.js';
import { renderCard } from './card.js';
import { visibleOps } from './filters.js';
import { opDay } from '../model/ops.js';

const byUrgencyThenDate = (a, b) => Number(b.urgent) - Number(a.urgent) || (opDay(a) || '9999').localeCompare(opDay(b) || '9999') || String(b.updatedAt).localeCompare(String(a.updatedAt));

export function renderBoard(ctx) {
  const doc = ctx.doc;
  const ops = visibleOps(doc, ctx.filters);
  return h('div', { class: 'board' },
    doc.stages.map((stage) => {
      const items = ops.filter((o) => o.stageId === stage.id).sort(byUrgencyThenDate);
      const gate = stage.id === doc.gates.finalStageId ? 'GO requis' : '';
      const col = h('section', {
        class: `col${items.length ? '' : ' is-empty'}`, 'aria-label': stage.label,
        onDragover: (e) => { if (!ctx.canWrite()) return; e.preventDefault(); col.classList.add('is-over'); },
        onDragleave: () => col.classList.remove('is-over'),
        onDrop: (e) => { e.preventDefault(); col.classList.remove('is-over'); const id = e.dataTransfer.getData('text/plain'); if (id) ctx.move(id, stage.id); },
      },
      h('header', { class: 'col-head' },
        h('span', { class: 'col-dot', style: { background: stage.color, color: stage.color } }),
        h('h2', {}, stage.label),
        gate ? h('span', { class: 'col-gate' }, gate) : null,
        h('span', { class: 'col-count' }, items.length)),
      items.map((o) => renderCard(ctx, o)),
      !items.length ? h('div', { class: 'col-drop' }, ctx.canWrite() ? 'Glisse une carte ici' : 'Aucun coup') : null);
      return col;
    }));
}
