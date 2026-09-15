// Page pleine largeur d'un coup : étape + checklist, contenu, validation, résultats.
import { h, icon, avatar, fmtDay, fmtDayFull, relTime, today } from './dom.js';
import { stageStepper } from './gauge.js';
import { emojiPicker } from './emoji.js';
import { KINDS, newId } from '../model/doc.js';
import { updateOp, deleteOp, duplicateOp, lastVerdict, checklistProgress } from '../model/ops.js';
import { renderChecklist } from './checklist.js';
import { stageIndex, canMoveTo } from '../model/stages.js';
import { opTimeline } from '../model/timeline.js';
import { renderJournal } from './journal.js';
import { pillSelect, inlineText, renderPublication, renderContent, renderValidation, renderResults, renderLinks } from './opParts.js';
import { publishPill } from './card.js';

export function renderOpPage(ctx, op) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const patch = (p, label) => ctx.act(label || `a modifié « ${op.title} »`, (d) => updateOp(d, op.id, p, ctx.meta()));
  const t = today();
  const idx = stageIndex(doc, op.stageId);
  const nextStage = doc.stages[idx + 1] || null;
  const gate = nextStage ? canMoveTo(doc, op, nextStage.id) : { ok: false };
  const campaign = doc.campaigns.find((c) => c.id === op.campaignId);
  const people = knownPeople(doc, ctx.store.state.user);
  const last = lastVerdict(op);
  const tasks = checklistProgress(op);
  const rubrics = [...new Set(doc.ops.map((o) => o.rubric).filter(Boolean))].sort();

  return h('article', { class: 'fpage' },
    h('nav', { class: 'fpage-nav' },
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: ctx.closeOp }, '← Retour'),
      h('span', { class: 'dim' }, '·'),
      publishPill(op, t),
      campaign ? [h('span', { class: 'dim' }, '·'), h('span', { class: 'chip chip-campaign' }, campaign.icon ? `${campaign.icon} ` : '', campaign.name)] : null,
      h('span', { style: { marginLeft: 'auto' }, class: 'hint' }, `modifié ${relTime(op.updatedAt)} par ${op.updatedBy?.login || '—'}`),
      ro ? null : h('button', { type: 'button', class: 'btn btn-sm', title: 'Créer une copie prête pour la semaine suivante', onClick: () => {
        const id = newId('o');
        if (ctx.act(`a dupliqué « ${op.title} »`, (d) => duplicateOp(d, op.id, { id, ...ctx.meta() }))) ctx.openOp(id);
      } }, icon('copy'), 'Dupliquer')),

    ro ? h('div', { class: 'readonly-bar fpage-ro' }, icon('warn'), h('span', { style: { flex: 1 } }, 'Lecture seule : connecte ton token GitHub pour modifier cette fiche.'),
      h('button', { type: 'button', onClick: () => ctx.openSettings() }, 'Se connecter')) : null,

    h('header', { class: 'fpage-head' },
      emojiPicker({ value: op.icon || '', size: 'lg', disabled: ro, onPick: (v) => patch({ icon: v }, v ? `a donné l’icône ${v} à « ${op.title} »` : `a retiré l’icône de « ${op.title} »`) }),
      h('div', { class: 'fpage-title' },
        h('input', { class: 'input input-title fpage-title-input', value: op.title, 'aria-label': 'Titre', disabled: ro, dataset: { key: `title:${op.id}` },
          onChange: (e) => { if (e.target.value.trim()) patch({ title: e.target.value.trim() }, `a renommé « ${op.title} » en « ${e.target.value.trim()} »`); else e.target.value = op.title; } }),
        h('div', { class: 'drawer-meta' },
          pillSelect(KINDS, op.kind, ro, (v) => patch({ kind: v })),
          h('input', { class: 'input input-pill', list: 'rubric-list', value: op.rubric, placeholder: 'Rubrique (Best-of du lundi…)', disabled: ro, 'aria-label': 'Rubrique', dataset: { key: `rubric:${op.id}` }, onChange: (e) => patch({ rubric: e.target.value.trim() }, `a classé « ${op.title} » dans la rubrique ${e.target.value.trim() || '—'}`) }),
          h('datalist', { id: 'rubric-list' }, rubrics.map((r) => h('option', { value: r }))),
          pillSelect([{ id: '', label: 'Sans campagne' }, ...doc.campaigns.map((c) => ({ id: c.id, label: `${c.icon ? `${c.icon} ` : ''}${c.name}` }))], op.campaignId, ro, (v) => patch({ campaignId: v }, `a rattaché « ${op.title} » à une campagne`)),
          pillSelect([{ id: '', label: 'Sans responsable' }, ...people.map((p) => ({ id: p, label: `Resp. ${p}` }))], op.owner, ro, (v) => patch({ owner: v }, v ? `a confié « ${op.title} » à ${v}` : `a retiré le responsable de « ${op.title} »`)),
          h('button', { type: 'button', class: `toggle toggle-xs toggle-urgent`, 'aria-pressed': op.urgent ? 'true' : 'false', disabled: ro, onClick: () => patch({ urgent: !op.urgent }, op.urgent ? `a retiré l’urgence de « ${op.title} »` : `a marqué « ${op.title} » urgent`) }, '🔥 Urgent')),
        h('div', { class: 'toggle-row', style: { marginTop: '10px' } }, doc.channels.map((c) => h('button', {
          type: 'button', class: 'toggle toggle-xs toggle-channel', 'aria-pressed': op.channels.includes(c.id) ? 'true' : 'false', disabled: ro, style: { '--ch': c.color },
          onClick: () => patch({ channels: op.channels.includes(c.id) ? op.channels.filter((x) => x !== c.id) : [...op.channels, c.id] }),
        }, `${c.icon} ${c.label}`))))),

    h('section', { class: 'fpage-hero glass stage-panel' },
      h('div', { class: 'stage-panel-left' },
        stageStepper(doc, op, (id) => ctx.move(op.id, id)),
        h('div', { class: 'stage-facts' },
          fact('Étape', `${idx + 1} / ${doc.stages.length} · ${doc.stages[idx]?.label || '—'}`),
          fact('Checklist', tasks.total ? `${tasks.done} / ${tasks.total} faites` : 'aucune tâche', tasks.total && tasks.done === tasks.total ? 'done' : ''),
          fact('Validation', last ? `${last.verdict === 'ok' ? 'validé' : 'refusé'} par ${last.by?.login || '—'} · ${fmtDay(last.at)}` : 'pas encore', last ? (last.verdict === 'ok' ? 'done' : 'late') : ''),
          fact('Responsable', op.owner || '—'))),
      nextStage && !ro ? h('div', { class: 'fpage-next' },
        h('button', { type: 'button', class: 'btn btn-cta', onClick: () => ctx.move(op.id, nextStage.id) }, `Passer en ${nextStage.label}`, icon('arrow')),
        !gate.ok ? h('span', { class: 'hint' }, gate.reason) : null) : null),

    renderChecklist(ctx, op, ro),

    h('div', { class: 'fpage-cols' },
      h('div', { class: 'fpage-main' },
        renderContent(ctx, op, ro),
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Brief'), ro ? null : h('span', { class: 'hint' }, 'cliquer pour modifier')),
          inlineText({ key: `desc:${op.id}`, value: op.description, placeholder: 'Objectif, cible, message clé, appel à l’action, ton…', disabled: ro, className: 'fpage-desc',
            onSave: (v) => patch({ description: v }, `a modifié le brief de « ${op.title} »`) })),
        renderResults(ctx, op, ro),
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Historique')),
          renderJournal(ctx, { opId: op.id, limit: 200, compact: true }))),
      h('aside', { class: 'fpage-side' },
        renderPublication(ctx, op, ro),
        renderValidation(ctx, op, ro),
        renderLinks(ctx, op, ro),
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Frise')),
          renderTimeline(ctx, op, t),
          person('Créé par', op.createdBy, op.createdAt),
          op.publishedBy ? person('Publié par', op.publishedBy, op.dates.publishActual) : null),
        ro ? null : h('section', { class: 'panel glass', style: { display: 'flex', justifyContent: 'flex-end' } },
          h('button', { type: 'button', class: 'btn btn-danger btn-sm', onClick: () => {
            if (confirm(`Supprimer « ${op.title} » ? Cette action est journalisée.`)) {
              if (ctx.act(`a supprimé « ${op.title} »`, (d) => deleteOp(d, op.id, ctx.meta()))) ctx.closeOp();
            }
          } }, icon('trash'), 'Supprimer le coup')))));
}

/** Logins connus : responsables déjà cités, auteurs du journal, utilisateur courant. */
function knownPeople(doc, user) {
  const set = new Set();
  if (user?.login) set.add(user.login);
  for (const o of doc.ops) { if (o.owner) set.add(o.owner); if (o.createdBy?.login) set.add(o.createdBy.login); if (o.updatedBy?.login) set.add(o.updatedBy.login); }
  for (const a of doc.activity) if (a.by?.login) set.add(a.by.login);
  set.delete('anonyme');
  return [...set].sort();
}

function fact(label, value, tone = '') {
  return h('div', { class: `fact${tone ? ` is-${tone}` : ''}` }, h('span', { class: 'fact-label' }, label), h('b', {}, value));
}

function person(label, who, at) {
  return h('div', { class: 'person' }, avatar(who, 26), h('div', {}, h('div', { class: 'muted', style: { fontSize: '12px' } }, label), h('b', {}, who?.login || '—'), h('span', { class: 'dim' }, at ? ` · ${fmtDayFull(at)}` : '')));
}

const KIND = {
  create: { color: '#8b8fa8' }, move: { color: '#8b5cf6' }, review: { color: '#22d3ee' }, publish: { color: '#b5f03a' },
};

function renderTimeline(ctx, op, t) {
  const events = opTimeline(ctx.doc, op, t);
  if (!events.length) return null;
  let todayInserted = false;
  const rows = [];
  for (const e of events) {
    if (!todayInserted && e.day > t) { rows.push(h('li', { class: 'tl-today' }, h('span', { class: 'tl-dot' }), h('span', {}, 'aujourd’hui'))); todayInserted = true; }
    const k = KIND[e.kind] || KIND.move;
    rows.push(h('li', { class: `tl-item${e.future ? ' is-future' : ''}${e.late ? ' is-late' : ''}`, style: { '--tl': k.color } },
      h('span', { class: 'tl-dot' }),
      h('div', { class: 'tl-body' },
        h('div', { class: 'tl-when' }, fmtDay(e.day), e.late ? h('span', { class: 'badge badge-late', style: { marginLeft: '6px' } }, 'dépassé') : null),
        h('div', { class: 'tl-text' }, e.by ? [h('b', {}, e.by.login), ' '] : null, e.text))));
  }
  if (!todayInserted) rows.push(h('li', { class: 'tl-today' }, h('span', { class: 'tl-dot' }), h('span', {}, 'aujourd’hui')));
  return h('ul', { class: 'tl', style: { marginBottom: '12px' } }, rows);
}
