import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { PRIORITIES, kindById } from '../model/doc.js';
import { gaugeOf, stageById } from '../model/stages.js';
import { isLate } from '../model/ops.js';
import { xpOf } from '../model/game.js';
import { verdictBadge, channelDots } from './card.js';
import { visibleOps } from './filters.js';

const COLS = [
  { id: 'title', label: 'Coup', get: (o) => o.title.toLowerCase() },
  { id: 'kind', label: 'Format', get: (o) => kindById(o.kind).label },
  { id: 'channels', label: 'Canaux', get: (o) => o.channels.length },
  { id: 'stage', label: 'Étape', get: (o, doc) => doc.stages.findIndex((s) => s.id === o.stageId) },
  { id: 'gauge', label: 'Avancement', get: (o, doc) => gaugeOf(doc, o) },
  { id: 'publish', label: 'Publication', get: (o) => o.dates.publishActual || o.dates.publishPlanned || '9999' },
  { id: 'verdict', label: 'Validation', get: (o) => (o.reviews.at(-1)?.verdict || 'zz') },
  { id: 'owner', label: 'Resp.', get: (o) => o.owner || 'zz' },
  { id: 'xp', label: 'XP', get: (o, doc) => xpOf(doc, o) },
  { id: 'updated', label: 'Mis à jour', get: (o) => o.updatedAt },
];

export function renderList(ctx) {
  const doc = ctx.doc;
  const sort = ctx.sort || { col: 'stage', dir: -1 };
  const col = COLS.find((c) => c.id === sort.col) || COLS[3];
  const ops = [...visibleOps(doc, ctx.filters)].sort((a, b) => {
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
        scope: 'col', 'aria-sort': sort.col === c.id ? (sort.dir > 0 ? 'ascending' : 'descending') : null,
        onClick: () => ctx.setSort({ col: c.id, dir: sort.col === c.id ? -sort.dir : 1 }),
      }, c.label, sort.col === c.id ? (sort.dir > 0 ? ' ↑' : ' ↓') : '')))),
      h('tbody', {}, ops.map((o) => {
        const stage = stageById(doc, o.stageId);
        const g = gaugeOf(doc, o);
        const late = isLate(o, t);
        const selected = sel.has(o.id);
        const xp = xpOf(doc, o);
        return h('tr', { class: selected ? 'is-selected' : '', onClick: (e) => { if (e.shiftKey && canSelect) { e.preventDefault(); ctx.toggleSelect(o.id); } else ctx.openOp(o.id); }, tabindex: 0,
          onKeydown: (e) => { if (e.key === 'Enter') ctx.openOp(o.id); if (e.key === ' ' && canSelect) { e.preventDefault(); ctx.toggleSelect(o.id); } } },
          h('td', { class: 'td-check', onClick: (e) => e.stopPropagation() },
            h('input', { type: 'checkbox', class: 'check', 'aria-label': `Sélectionner ${o.title}`, checked: selected, disabled: !canSelect, onChange: (e) => ctx.toggleSelect(o.id, e.target.checked) })),
          h('td', {}, h('div', { class: 'cell-title' }, h('span', {}, o.icon || '•'), o.title)),
          h('td', { class: 'muted' }, kindById(o.kind).label),
          h('td', {}, channelDots(doc, o, { max: 5 }) || h('span', { class: 'dim' }, '—')),
          h('td', {}, h('span', { class: 'chip chip-stage', style: { '--dot': stage?.color } }, h('i', { class: 'chip-dot' }), stage?.label)),
          h('td', {}, h('div', { class: 'cell-gauge' }, h('div', { class: 'bar', style: { '--bar': stage?.color } }, h('i', { style: { width: `${g}%` } })), h('b', {}, `${g} %`))),
          h('td', {}, dateCell(o.dates.publishPlanned, o.dates.publishActual, late.publish)),
          h('td', {}, verdictBadge(o) || h('span', { class: 'dim' }, '—')),
          h('td', { class: 'muted' }, o.owner || '—'),
          h('td', {}, xp ? h('span', { class: 'xp-chip' }, `+${xp}`) : h('span', { class: 'dim' }, '—')),
          h('td', {}, h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, avatar(o.updatedBy, 20), h('span', { class: 'muted' }, relTime(o.updatedAt)))));
      })),
    ),
    !ops.length ? h('div', { class: 'empty' }, h('b', {}, 'Aucun coup'), 'Change les filtres ou crée un coup.') : null),
    canSelect && !sel.size ? h('p', { class: 'hint', style: { marginTop: '10px' } }, 'Coche des coups (ou Maj + clic sur une ligne) pour changer leur étape, leur campagne ou leur priorité d’un coup, ou les supprimer.') : null);
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
    pick('Priorité…', PRIORITIES, (v) => ctx.bulkUpdate(ids, { priority: v }, 'la priorité')),
    h('button', { type: 'button', class: 'btn btn-sm btn-danger', onClick: () => ctx.bulkDelete(ids) }, icon('trash'), 'Supprimer'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', style: { marginLeft: 'auto' }, onClick: ctx.clearSelection }, 'Tout désélectionner', h('span', { class: 'dim' }, ' · Échap')),
    ops.length > n ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onClick: () => ctx.setSelection(ops.map((o) => o.id)) }, `Sélectionner les ${ops.length} visibles`) : null);
}

function dateCell(planned, actual, late) {
  if (!planned && !actual) return h('span', { class: 'dim' }, '—');
  return h('div', { class: 'cell-dates' },
    actual ? h('span', { style: { color: '#6fe3a0' } }, `✓ ${fmtDay(actual)}`) : null,
    planned ? h('span', { class: late ? 'badge badge-late' : 'muted' }, `${actual ? 'cible ' : ''}${fmtDay(planned)}${late ? ' · retard' : ''}`) : null);
}
