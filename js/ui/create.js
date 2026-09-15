import { emojiPicker } from './emoji.js';
import { h, icon, fmtDay } from './dom.js';
import { newId } from '../model/doc.js';
import { createOp } from '../model/ops.js';

/** Fiche vierge : un coup créé à la main, au stade idée (ou pré-daté depuis le calendrier). */
export function renderCreate(ctx, preset = {}) {
  const doc = ctx.doc;
  let title; let desc; let iconValue = preset.icon || ''; let campaign; let date; let time; let rubric;
  const channels = new Set((preset.channels || []).filter((id) => doc.channels.some((c) => c.id === id)));
  const rubrics = [...new Set(doc.ops.map((o) => o.rubric).filter(Boolean))].sort();
  const submit = (e) => {
    e.preventDefault();
    const id = newId('o');
    const ok = ctx.act(`a créé « ${title.value.trim()} »`, (d) => createOp(d, {
      id, title: title.value, description: desc.value.trim(), icon: iconValue, channels: [...channels],
      rubric: rubric.value.trim(), campaignId: campaign.value, owner: ctx.store.state.user?.login || '',
      dates: { publishPlanned: date.value }, publishTime: time.value, ...ctx.meta(),
    }));
    if (ok) { ctx.closeModal(); ctx.openOp(id); }
  };
  const channelBtn = (c) => {
    const b = h('button', { type: 'button', class: 'toggle toggle-channel', 'aria-pressed': channels.has(c.id) ? 'true' : 'false', style: { '--ch': c.color },
      onClick: () => { const on = !channels.has(c.id); if (on) channels.add(c.id); else channels.delete(c.id); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } }, `${c.icon} ${c.label}`);
    return b;
  };
  return h('div', { class: 'overlay', onClick: (e) => { if (e.target === e.currentTarget) ctx.closeModal(); } },
    h('form', { class: 'modal glass', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'create-title', onSubmit: submit },
      h('div', { class: 'modal-head' }, h('h2', { id: 'create-title' }, preset.publishPlanned ? `Nouveau coup le ${fmtDay(preset.publishPlanned)}` : 'Nouveau coup'), h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Fermer', onClick: ctx.closeModal }, icon('close'))),
      h('div', { style: { display: 'grid', gridTemplateColumns: '64px 1fr', gap: '12px' } },
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Icône'), emojiPicker({ value: iconValue, size: 'md', onPick: (v) => { iconValue = v; } })),
        h('div', { class: 'field' }, h('label', { for: 'c-title' }, 'Titre'), title = h('input', { id: 'c-title', class: 'input', required: true, placeholder: 'Ex. Reel lancement Ligues, Newsletter #2, Tournoi…', autofocus: true }))),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('span', { class: 'field-label' }, 'Canaux'), h('div', { class: 'toggle-row' }, doc.channels.map(channelBtn))),
      h('div', { class: 'modal-grid', style: { marginTop: '12px' } },
        h('div', { class: 'field' }, h('label', { for: 'c-rubric' }, 'Rubrique'), rubric = h('input', { id: 'c-rubric', class: 'input', list: 'rubric-list', placeholder: 'Best-of du lundi, Sondage…' }), h('datalist', { id: 'rubric-list' }, rubrics.map((r) => h('option', { value: r })))),
        h('div', { class: 'field' }, h('label', { for: 'c-date' }, 'Publication'), date = h('input', { id: 'c-date', class: 'input', type: 'date', value: preset.publishPlanned || '' })),
        h('div', { class: 'field' }, h('label', { for: 'c-time' }, 'Heure'), time = h('input', { id: 'c-time', class: 'input', type: 'time', value: '' })),
        h('div', { class: 'field' }, h('label', { for: 'c-campaign' }, 'Campagne'), campaign = h('select', { id: 'c-campaign', class: 'select' }, h('option', { value: '' }, 'Aucune'), doc.campaigns.map((c) => h('option', { value: c.id }, c.name))))),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { for: 'c-desc' }, 'L’idée en une phrase'), desc = h('textarea', { id: 'c-desc', class: 'textarea', placeholder: 'Le brief viendra après.' })),
      h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn', onClick: ctx.closeModal }, 'Annuler'),
        h('button', { type: 'submit', class: 'btn btn-cta' }, icon('plus'), 'Créer le coup'))));
}
