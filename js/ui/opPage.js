// Page pleine largeur d'un coup.
import { h, icon, avatar, fmtDay, fmtDayFull, relTime, today } from './dom.js';
import { bigGauge, stageStepper } from './gauge.js';
import { KINDS, PRIORITIES } from '../model/doc.js';
import { updateOp, deleteOp, isLate, lastVerdict, checklistProgress } from '../model/ops.js';
import { renderChecklist } from './checklist.js';
import { stageIndex, canMoveTo } from '../model/stages.js';
import { opTimeline } from '../model/timeline.js';
import { renderJournal } from './journal.js';
import { pillSelect, milestone, renderLinks, renderReviews, renderResults } from './opParts.js';

export function renderOpPage(ctx, op) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const patch = (p, label) => ctx.act(label || `a modifié « ${op.title} »`, (d) => updateOp(d, op.id, p, ctx.meta()));
  const t = today();
  const late = isLate(op, t);
  const idx = stageIndex(doc, op.stageId);
  const nextStage = doc.stages[idx + 1] || null;
  const gate = nextStage ? canMoveTo(doc, op, nextStage.id) : { ok: false };
  const campaign = doc.campaigns.find((c) => c.id === op.campaignId);
  const people = knownPeople(doc, ctx.store.state.user);
  const last = lastVerdict(op);
  const tasks = checklistProgress(op);

  return h('article', { class: 'fpage' },
    h('nav', { class: 'fpage-nav' },
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: ctx.closeOp }, '← Retour'),
      h('span', { class: 'dim' }, '·'),
      h('span', { class: 'muted' }, KINDS.find((k) => k.id === op.kind)?.label || op.kind),
      campaign ? [h('span', { class: 'dim' }, '·'), h('span', { class: 'chip chip-campaign' }, campaign.icon ? `${campaign.icon} ` : '', campaign.name)] : null,
      h('span', { style: { marginLeft: 'auto' }, class: 'hint' }, `modifié ${relTime(op.updatedAt)} par ${op.updatedBy?.login || '—'}`)),

    ro ? h('div', { class: 'readonly-bar fpage-ro' }, icon('warn'), h('span', { style: { flex: 1 } }, 'Lecture seule : connecte ton token GitHub pour modifier cette fiche.'),
      h('button', { type: 'button', onClick: () => ctx.openSettings() }, 'Se connecter')) : null,

    h('header', { class: 'fpage-head' },
      h('div', { class: 'drawer-icon fpage-icon' }, h('input', { 'aria-label': 'Icône', value: op.icon || '', maxlength: 4, placeholder: '✦', disabled: ro, onChange: (e) => patch({ icon: e.target.value.trim() }) })),
      h('div', { class: 'fpage-title' },
        h('input', { class: 'input input-title fpage-title-input', value: op.title, 'aria-label': 'Titre', disabled: ro, dataset: { key: `title:${op.id}` },
          onChange: (e) => { if (e.target.value.trim()) patch({ title: e.target.value.trim() }, `a renommé « ${op.title} » en « ${e.target.value.trim()} »`); else e.target.value = op.title; } }),
        h('div', { class: 'drawer-meta' },
          pillSelect(KINDS, op.kind, ro, (v) => patch({ kind: v })),
          pillSelect(PRIORITIES, op.priority, ro, (v) => patch({ priority: v })),
          pillSelect([{ id: '', label: 'Sans campagne' }, ...doc.campaigns.map((c) => ({ id: c.id, label: `${c.icon ? `${c.icon} ` : ''}${c.name}` }))], op.campaignId, ro, (v) => patch({ campaignId: v }, `a rattaché « ${op.title} » à une campagne`)),
          pillSelect([{ id: '', label: 'Sans responsable' }, ...people.map((p) => ({ id: p, label: `Resp. ${p}` }))], op.owner, ro, (v) => patch({ owner: v }, v ? `a confié « ${op.title} » à ${v}` : `a retiré le responsable de « ${op.title} »`))),
        h('div', { class: 'toggle-row', style: { marginTop: '10px' } }, doc.channels.map((c) => h('button', {
          type: 'button', class: 'toggle toggle-xs toggle-channel', 'aria-pressed': op.channels.includes(c.id) ? 'true' : 'false', disabled: ro, style: { '--ch': c.color },
          onClick: () => patch({ channels: op.channels.includes(c.id) ? op.channels.filter((x) => x !== c.id) : [...op.channels, c.id] }),
        }, `${c.icon} ${c.label}`))))),

    h('section', { class: 'fpage-hero glass' },
      h('div', { class: 'fpage-hero-left' },
        bigGauge(doc, op),
        h('div', { class: 'fpage-hero-facts' },
          fact('Validation', op.dates.reviewActual ? `faite le ${fmtDay(op.dates.reviewActual)}` : op.dates.reviewPlanned ? `cible ${fmtDay(op.dates.reviewPlanned)}` : 'pas de date', late.review),
          fact('Publication', op.dates.publishActual ? `publié le ${fmtDay(op.dates.publishActual)}` : op.dates.publishPlanned ? `cible ${fmtDay(op.dates.publishPlanned)}` : 'pas de date', late.publish),
          fact('Dernier verdict', last ? `${last.verdict === 'ok' ? 'GO' : 'KO'} · ${fmtDay(last.at)}` : 'aucun'),
          fact('Checklist', tasks.total ? `${tasks.done} / ${tasks.total} faites` : 'aucune tâche'))),
      h('div', { class: 'fpage-hero-right' },
        stageStepper(doc, op, (id) => ctx.move(op.id, id)),
        op.stageId !== doc.gates.finalStageId ? h('div', { class: 'field', style: { marginTop: '16px' } },
          h('label', { for: 'step-range' }, `Avancement dans l’étape · ${op.stepProgress || 0} %`),
          h('input', { id: 'step-range', class: 'range', type: 'range', min: 0, max: 100, step: 5, value: op.stepProgress || 0, disabled: ro,
            onInput: (e) => { e.target.previousSibling.textContent = `Avancement dans l’étape · ${e.target.value} %`; },
            onChange: (e) => patch({ stepProgress: Number(e.target.value) }, `a réglé l’avancement de « ${op.title} » à ${e.target.value} %`) })) : null,
        nextStage && !ro ? h('div', { class: 'fpage-next' },
          h('button', { type: 'button', class: 'btn btn-cta', onClick: () => ctx.move(op.id, nextStage.id) }, `Passer en ${nextStage.label}`, icon('arrow')),
          !gate.ok ? h('span', { class: 'hint' }, gate.reason) : null) : null)),

    renderChecklist(ctx, op, ro),

    h('div', { class: 'fpage-cols' },
      h('div', { class: 'fpage-main' },
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Brief')),
          h('textarea', { class: 'textarea fpage-desc', placeholder: 'Objectif, cible, message clé, appel à l’action, ton…', disabled: ro, dataset: { key: `desc:${op.id}` }, onChange: (e) => patch({ description: e.target.value }) }, op.description)),
        renderReviews(ctx, op, ro),
        renderResults(ctx, op, ro),
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Historique complet')),
          renderJournal(ctx, { opId: op.id, limit: 200, compact: true }))),
      h('aside', { class: 'fpage-side' },
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Dates')),
          h('div', { class: 'milestones' },
            milestone(ctx, op, { key: 'review', label: 'Validation', hint: 'le GO de l’équipe avant de programmer' }),
            milestone(ctx, op, { key: 'publish', label: 'Publication', hint: campaign?.endAt ? `campagne jusqu’au ${fmtDay(campaign.endAt)}` : 'mise en ligne' })),
          renderTimeline(ctx, op, t)),
        renderLinks(ctx, op, ro),
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Personnes')),
          person('Créé par', op.createdBy, op.createdAt),
          person('Dernière modification', op.updatedBy, op.updatedAt),
          op.publishedBy ? person('Publié par', op.publishedBy, op.dates.publishActual) : null,
          reviewers(op)),
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

function fact(label, value, late = false) {
  return h('div', { class: 'fact' }, h('span', { class: 'fact-label' }, label), h('b', { class: late ? 'is-late' : '' }, value, late ? ' · retard' : ''));
}

function person(label, who, at) {
  return h('div', { class: 'person' }, avatar(who, 26), h('div', {}, h('div', { class: 'muted', style: { fontSize: '12px' } }, label), h('b', {}, who?.login || '—'), h('span', { class: 'dim' }, at ? ` · ${fmtDayFull(at)}` : '')));
}

function reviewers(op) {
  const seen = new Map();
  for (const r of op.reviews) if (r.by?.login && !seen.has(r.by.login)) seen.set(r.by.login, r.by);
  if (!seen.size) return null;
  return h('div', { class: 'person' }, h('span', { class: 'avatar-stack' }, [...seen.values()].map((u) => avatar(u, 26))),
    h('div', {}, h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Ont validé'), h('b', {}, [...seen.keys()].join(', '))));
}

const KIND = {
  create: { label: 'Création', color: '#8b8fa8' }, move: { label: 'Étape', color: '#8b5cf6' }, review: { label: 'Validation', color: '#22d3ee' },
  reviewPlanned: { label: 'Validation', color: '#f59e0b' }, publish: { label: 'Publication', color: '#b5f03a' },
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
  return h('div', { style: { marginTop: '18px' } }, h('div', { class: 'section-head' }, h('h3', {}, 'Frise')), h('ul', { class: 'tl' }, rows));
}
