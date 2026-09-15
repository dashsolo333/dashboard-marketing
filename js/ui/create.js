import { h, icon } from './dom.js';
import { KINDS, PRIORITIES, newId } from '../model/doc.js';
import { createOp } from '../model/ops.js';

/** Fiche vierge : un coup créé à la main, au stade idée. */
export function renderCreate(ctx) {
  const doc = ctx.doc;
  let title; let kind; let priority; let iconEl; let desc; let stage; let campaign;
  const channels = new Set();
  const submit = (e) => {
    e.preventDefault();
    const id = newId('o');
    const ok = ctx.act(`a créé « ${title.value.trim()} »`, (d) => createOp(d, {
      id, title: title.value, description: desc.value.trim(), icon: iconEl.value.trim(), kind: kind.value, channels: [...channels],
      priority: priority.value, stageId: stage.value, campaignId: campaign.value, owner: ctx.store.state.user?.login || '', ...ctx.meta(),
    }));
    if (ok) { ctx.closeModal(); ctx.openOp(id); }
  };
  const channelBtn = (c) => {
    const b = h('button', { type: 'button', class: 'toggle toggle-channel', 'aria-pressed': 'false', style: { '--ch': c.color },
      onClick: () => { const on = !channels.has(c.id); if (on) channels.add(c.id); else channels.delete(c.id); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } }, `${c.icon} ${c.label}`);
    return b;
  };
  return h('div', { class: 'overlay', onClick: (e) => { if (e.target === e.currentTarget) ctx.closeModal(); } },
    h('form', { class: 'modal glass', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'create-title', onSubmit: submit },
      h('div', { class: 'modal-head' }, h('h2', { id: 'create-title' }, 'Nouveau coup'), h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Fermer', onClick: ctx.closeModal }, icon('close'))),
      h('p', { class: 'hint', style: { marginBottom: '16px' } }, 'Un post, une vidéo, une campagne, un partenariat… Une fiche au stade idée par défaut, tu complètes le reste ensuite.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '64px 1fr', gap: '12px' } },
        h('div', { class: 'field' }, h('label', { for: 'c-icon' }, 'Icône'), iconEl = h('input', { id: 'c-icon', class: 'input', placeholder: '✦', maxlength: 4, style: { textAlign: 'center', fontSize: '18px' } })),
        h('div', { class: 'field' }, h('label', { for: 'c-title' }, 'Titre'), title = h('input', { id: 'c-title', class: 'input', required: true, placeholder: 'Ex. Reel lancement Ligues, Newsletter #2, Tournoi…', autofocus: true }))),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('span', { class: 'field-label' }, 'Canaux'), h('div', { class: 'toggle-row' }, doc.channels.map(channelBtn))),
      h('div', { class: 'modal-grid', style: { marginTop: '12px' } },
        h('div', { class: 'field' }, h('label', { for: 'c-kind' }, 'Format'), kind = h('select', { id: 'c-kind', class: 'select' }, KINDS.map((k) => h('option', { value: k.id, selected: k.id === 'post' }, k.label)))),
        h('div', { class: 'field' }, h('label', { for: 'c-priority' }, 'Priorité'), priority = h('select', { id: 'c-priority', class: 'select' }, PRIORITIES.map((p) => h('option', { value: p.id, selected: p.id === 'p2' }, p.label)))),
        h('div', { class: 'field' }, h('label', { for: 'c-campaign' }, 'Campagne'), campaign = h('select', { id: 'c-campaign', class: 'select' }, h('option', { value: '' }, 'Aucune'), doc.campaigns.map((c) => h('option', { value: c.id }, c.name)))),
        h('div', { class: 'field' }, h('label', { for: 'c-stage' }, 'Étape de départ'), stage = h('select', { id: 'c-stage', class: 'select' }, doc.stages.filter((s) => s.id !== doc.gates.finalStageId).map((s) => h('option', { value: s.id }, s.label))))),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { for: 'c-desc' }, 'Description'), desc = h('textarea', { id: 'c-desc', class: 'textarea', placeholder: 'L’idée en une phrase. Le brief viendra après.' })),
      h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn', onClick: ctx.closeModal }, 'Annuler'),
        h('button', { type: 'submit', class: 'btn btn-cta' }, icon('plus'), 'Créer le coup'))));
}
