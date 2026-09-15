import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { kindById } from '../model/doc.js';
import { stageById } from '../model/stages.js';
import { isLate, checklistProgress, opDay, byRank } from '../model/ops.js';
import { verdictBadge, channelDots } from './card.js';
import { visibleOps } from './filters.js';

const COLS = [
  { id: 'manual', label: '', title: 'Ordre manuel (glisse les lignes)', get: null },
  { id: 'title', label: 'Coup', get: (o) => o.title.toLowerCase() },
  { id: 'channels', label: 'Canaux', get: (o) => o.channels.length },
  { id: 'stage', label: 'Étape', get: (o, doc) => doc.stages.findIndex((s) => s.id === o.stageId) },
  { id: 'publish', label: 'Publication', get: (o) => (opDay(o) || '9999') + (o.publishTime || '') },
  { id: 'verdict', label: 'Validation', get: (o) => (o.reviews.at(-1)?.verdict || 'zz') },
  { id: 'tasks', label: 'Checklist', get: (o) => { const p = checklistProgress(o); return p.total ? p.done / p.total : -1; } },
  { id: 'campaign', label: 'Campagne', get: (o, doc) => doc.campaigns.find((c) => c.id === o.campaignId)?.name || 'zz' },
  { id: 'owner', label: 'Resp.', get: (o) => o.owner || 'zz' },
  { id: 'updated', label: 'Mis à jour', get: (o) => o.updatedAt },
];

export function renderList(ctx) {
  const doc = ctx.doc;
  const sort = ctx.sort || { col: 'publish', dir: 1 };
  const col = COLS.find((c) => c.id === sort.col) || COLS.find((c) => c.id === 'publish');
  const manual = col.id === 'manual';
  const ops = [...visibleOps(doc, ctx.filters)].sort(manual ? byRank : (a, b) => {
    const va = col.get(a, doc); const vb = col.get(b, doc);
    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
  });
  const t = today();
  const sel = ctx.selection;
  const canSelect = ctx.canWrite();
  const allSelected = ops.length > 0 && ops.every((o) => sel.has(o.id));
  const someSelected = ops.some((o) => sel.has(o.id));
  const selectAll = h('input', { type: 'checkbox', class: 'check', 'aria-label': 'Tout sélectionner', checked: allSelected, disabled: !canSelect,
    onChange: (e) => ctx.setSelection(e.target.checked ? ops.map((o) => o.id) : []) });
  selectAll.indeterminate = someSelected && !allSelected;
  return h('div', {},
    sel.size ? renderBulkBar(ctx, ops) : null,
    h('div', { class: 'table-wrap glass' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {}, h('th', { class: 'th-check', 'aria-label': 'Sélection' }, selectAll), COLS.map((c) => h('th', {
        scope: 'col', class: c.id === 'manual' ? 'th-handle' : null, title: c.title || null,
        'aria-sort': sort.col === c.id ? (c.id === 'manual' ? 'other' : sort.dir > 0 ? 'ascending' : 'descending') : null,
        onClick: () => ctx.setSort({ col: c.id, dir: c.id === 'manual' ? 1 : sort.col === c.id ? -sort.dir : 1 }),
      }, c.id === 'manual' ? icon('grip') : [c.label, sort.col === c.id ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''])))),
      h('tbody', {}, ops.map((o) => {
        const stage = stageById(doc, o.stageId);
        const selected = sel.has(o.id);
        const campaign = doc.campaigns.find((c) => c.id === o.campaignId);
        const tr = h('tr', { class: `${selected ? 'is-selected' : ''}${o.urgent ? ' is-urgent' : ''}`, dataset: { id: o.id },
          onDragstart: (e) => { e.dataTransfer.setData('text/plain', `row:${o.id}`); e.dataTransfer.effectAllowed = 'move'; tr.classList.add('is-dragging'); },
          onDragend: () => { tr.classList.remove('is-dragging'); tr.draggable = false; clearDropMarks(tr.parentElement); },
          onDragover: (e) => { if (!canSelect || !e.dataTransfer.types.includes('text/plain')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; markDrop(tr, e); },
          onDragleave: () => tr.classList.remove('is-drop-before', 'is-drop-after'),
          onDrop: (e) => { e.preventDefault(); const raw = e.dataTransfer.getData('text/plain'); if (!raw.startsWith('row:')) return; dropRow(ctx, ops, raw.slice(4), o.id, tr.classList.contains('is-drop-before')); clearDropMarks(tr.parentElement); },
          onClick: (e) => { if (e.shiftKey && canSelect) { e.preventDefault(); ctx.toggleSelect(o.id); } else ctx.openOp(o.id); }, tabindex: 0,
          onKeydown: (e) => { if (e.key === 'Enter') ctx.openOp(o.id); if (e.key === ' ' && canSelect) { e.preventDefault(); ctx.toggleSelect(o.id); } } },
          h('td', { class: 'td-check', onClick: (e) => e.stopPropagation() },
            h('input', { type: 'checkbox', class: 'check', 'aria-label': `Sélectionner ${o.title}`, checked: selected, disabled: !canSelect, onChange: (e) => ctx.toggleSelect(o.id, e.target.checked) })),
          h('td', { class: 'td-handle', onClick: (e) => e.stopPropagation() },
            canSelect ? h('span', { class: 'drag-handle', title: 'Glisser pour changer l’ordre', 'aria-label': 'Réordonner',
              onPointerdown: () => { tr.draggable = true; }, onPointerup: () => { tr.draggable = false; } }, icon('grip')) : null),
          h('td', {}, h('div', { class: 'cell-title' },
            h('span', { class: 'cell-title-icon' }, o.icon || ''),
            h('div', { class: 'cell-title-text', title: o.title }, h('b', {}, o.title), h('small', {}, o.rubric ? `${o.rubric} · ${kindById(o.kind).label}` : kindById(o.kind).label)),
            o.urgent ? h('span', { class: 'badge badge-urgent', title: 'Urgent' }, '🔥') : null)),
          h('td', {}, channelDots(doc, o, { max: 5 }) || h('span', { class: 'dim' }, '—')),
          h('td', {}, h('span', { class: 'chip chip-stage', style: { '--dot': stage?.color } }, h('i', { class: 'chip-dot' }), stage?.label)),
          h('td', {}, dateCell(o, t)),
          h('td', {}, verdictBadge(o) || h('span', { class: 'dim' }, '—')),
          h('td', {}, tasksCell(checklistProgress(o))),
          h('td', { class: 'muted td-campaign', title: campaign?.name || '' }, campaign ? `${campaign.icon ? `${campaign.icon} ` : ''}${campaign.name}` : '—'),
          h('td', { class: 'muted' }, o.owner || '—'),
          h('td', {}, h('div', { class: 'td-updated' }, avatar(o.updatedBy, 20), h('span', { class: 'muted' }, relTime(o.updatedAt)))));
        return tr;
      })),
    ),
    !ops.length ? h('div', { class: 'empty' }, h('b', {}, 'Aucun coup'), 'Change les filtres ou crée un coup.') : null),
    canSelect && !sel.size ? h('p', { class: 'hint', style: { marginTop: '10px' } }, 'Coche des coups (ou Maj + clic sur une ligne) pour changer leur étape ou leur campagne d’un coup, les marquer urgents, ou les supprimer.') : null);
}

function renderBulkBar(ctx, ops) {
  const doc = ctx.doc;
  const ids = [...ctx.selection].filter((id) => doc.ops.some((o) => o.id === id));
  const n = ids.length;
  const pick = (label, options, onPick) => h('select', { class: 'select select-pill', 'aria-label': label, onChange: (e) => { if (e.target.value) onPick(e.target.value); e.target.value = ''; } },
    h('option', { value: '' }, label), options.map((o) => h('option', { value: o.id }, o.label)));
  return h('div', { class: 'bulkbar glass', role: 'toolbar', 'aria-label': 'Actions groupées' },
    h('b', { class: 'bulkbar-count' }, `${n} sélectionné${n > 1 ? 's' : ''}`),
    pick('Passer à l’étape…', doc.stages, (v) => ctx.bulkMove(ids, v)),
    pick('Campagne…', [{ id: '__none', label: 'Sans campagne' }, ...doc.campaigns.map((c) => ({ id: c.id, label: c.name }))], (v) => ctx.bulkUpdate(ids, { campaignId: v === '__none' ? '' : v }, 'la campagne')),
    pick('Urgence…', [{ id: 'on', label: '🔥 Marquer urgent' }, { id: 'off', label: 'Retirer l’urgence' }], (v) => ctx.bulkUpdate(ids, { urgent: v === 'on' }, 'l’urgence')),
    h('button', { type: 'button', class: 'btn btn-sm btn-danger', onClick: () => ctx.bulkDelete(ids) }, icon('trash'), 'Supprimer'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', style: { marginLeft: 'auto' }, onClick: ctx.clearSelection }, 'Tout désélectionner', h('span', { class: 'dim' }, ' · Échap')),
    ops.length > n ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onClick: () => ctx.setSelection(ops.map((o) => o.id)) }, `Sélectionner les ${ops.length} visibles`) : null);
}

function tasksCell({ done, total }) {
  if (!total) return h('span', { class: 'dim' }, '—');
  const pct = Math.round((done / total) * 100);
  return h('div', { class: 'cell-tasks', title: `${done} tâche${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} sur ${total}` },
    h('b', { class: done === total ? 'is-done' : '' }, `${done}/${total}`),
    h('div', { class: 'bar bar-tasks' }, h('i', { style: { width: `${pct}%` } })));
}

function dateCell(o, t) {
  const { publishPlanned, publishActual } = o.dates;
  if (!publishPlanned && !publishActual) return h('span', { class: 'dim' }, 'à planifier');
  const late = isLate(o, t);
  return h('div', { class: 'cell-dates' },
    publishActual ? h('span', { style: { color: '#6fe3a0' } }, `✓ ${fmtDay(publishActual)}`)
      : h('span', { class: late ? 'badge badge-late' : '' }, `${fmtDay(publishPlanned)}${o.publishTime ? ` · ${o.publishTime}` : ''}${late ? ' · retard' : ''}`),
    publishActual && publishPlanned && publishPlanned !== publishActual ? h('span', { class: 'muted' }, `prévu ${fmtDay(publishPlanned)}`) : null);
}

// ---------- Glisser-déposer des lignes ----------
function markDrop(tr, e) {
  const r = tr.getBoundingClientRect();
  const before = e.clientY < r.top + r.height / 2;
  tr.classList.toggle('is-drop-before', before);
  tr.classList.toggle('is-drop-after', !before);
}
function clearDropMarks(tbody) {
  if (!tbody) return;
  for (const row of tbody.querySelectorAll('.is-drop-before, .is-drop-after')) row.classList.remove('is-drop-before', 'is-drop-after');
}
/** Recompose l'ordre des lignes visibles avec `movedId` placé avant ou après `targetId`. */
function dropRow(ctx, ops, movedId, targetId, before) {
  if (movedId === targetId) return;
  const ids = ops.map((o) => o.id).filter((id) => id !== movedId);
  const at = ids.indexOf(targetId);
  if (at < 0) return;
  ids.splice(before ? at : at + 1, 0, movedId);
  ctx.reorder(ids);
}
