// Pièces partagées de la fiche coup : champs, jalons, liens, validations, résultats.
import { h, icon, avatar, fmtDay, today } from './dom.js';
import { newId, RESULT_FIELDS } from '../model/doc.js';
import { updateOp, addReview, removeReview, setResults } from '../model/ops.js';
import { milestoneStatus, shiftDay } from '../model/milestones.js';
import { xpBreakdown, isPublished, XP_RULES } from '../model/game.js';

export function isSafeUrl(url) {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
}

export function pillSelect(options, value, disabled, onChange) {
  return h('select', { class: 'select select-pill-sm', disabled, onChange: (e) => onChange(e.target.value) },
    options.map((o) => h('option', { value: o.id, selected: o.id === value }, o.label)));
}

/** Sélecteur de date lisible : bouton avec la date en clair, calendrier natif au clic. */
export function datePicker(value, onChange, { disabled = false, placeholder = 'Choisir une date' } = {}) {
  const input = h('input', { class: 'dp-input', type: 'date', value: value || '', disabled, tabindex: -1, 'aria-hidden': 'true', onChange: (e) => onChange(e.target.value) });
  const btn = h('button', { type: 'button', class: `dp-btn${value ? '' : ' is-empty'}`, disabled, onClick: () => { try { input.showPicker(); } catch { input.focus(); input.click(); } } },
    icon('flag'), value ? fmtDay(value) : placeholder);
  return h('span', { class: 'dp' }, btn, input);
}

/** Jalon : cible + réel, état lisible, raccourcis. */
export function milestone(ctx, op, { key, label, hint }) {
  const ro = !ctx.canWrite();
  const planned = op.dates[`${key}Planned`] || '';
  const actual = op.dates[`${key}Actual`] || '';
  const t = today();
  const st = milestoneStatus({ planned, actual }, t);
  const setDates = (patch, text) => ctx.act(text, (d) => updateOp(d, op.id, { dates: patch }, ctx.meta()));
  const setPlanned = (v) => setDates({ [`${key}Planned`]: v }, v ? `a fixé la ${label.toLowerCase()} de « ${op.title} » au ${fmtDay(v)}` : `a retiré la date de ${label.toLowerCase()} de « ${op.title} »`);
  const setActual = (v) => setDates({ [`${key}Actual`]: v }, v ? `a marqué ${label.toLowerCase()} de « ${op.title} » faite le ${fmtDay(v)}` : `a annulé la date réelle de ${label.toLowerCase()} de « ${op.title} »`);
  const base = planned || t;
  const quick = (txt, opts) => h('button', { type: 'button', class: 'chip chip-btn', disabled: ro, onClick: () => setPlanned(shiftDay(base, opts)) }, txt);
  return h('div', { class: `milestone is-${st.state}` },
    h('div', { class: 'milestone-head' },
      h('div', {}, h('b', {}, label), hint ? h('div', { class: 'hint' }, hint) : null),
      h('span', { class: `badge badge-ms badge-ms-${st.state}` }, st.label)),
    h('div', { class: 'milestone-row' },
      h('span', { class: 'milestone-k' }, 'Cible'),
      datePicker(planned, setPlanned, { disabled: ro, placeholder: 'Fixer une date' }),
      ro ? null : h('span', { class: 'milestone-quick' }, quick('+1 sem', { weeks: 1 }), quick('+2 sem', { weeks: 2 }), quick('+1 mois', { months: 1 }),
        planned ? h('button', { type: 'button', class: 'chip chip-btn', onClick: () => setPlanned('') }, 'Effacer') : null)),
    h('div', { class: 'milestone-row' },
      h('span', { class: 'milestone-k' }, 'Réel'),
      actual ? [datePicker(actual, setActual, { disabled: ro }), ro ? null : h('button', { type: 'button', class: 'chip chip-btn', onClick: () => setActual('') }, 'Annuler')]
        : ro ? h('span', { class: 'dim' }, '—') : h('button', { type: 'button', class: 'btn btn-sm', onClick: () => setActual(t) }, icon('check'), 'Fait aujourd’hui')));
}

export function addLink(ctx, op) {
  const url = prompt('URL du lien (post, Canva, Drive, Notion…)');
  if (!url) return;
  if (!isSafeUrl(url)) { ctx.toast('Lien refusé : il faut une URL http(s).', { kind: 'error' }); return; }
  let label = '';
  try { const u = new URL(url); label = u.hostname.replace('www.', '') + u.pathname.slice(0, 40); } catch { label = url; }
  const custom = prompt('Libellé', label);
  ctx.act(`a ajouté un lien à « ${op.title} »`, (d) => updateOp(d, op.id, { links: [...op.links, { label: custom || label, url }] }, ctx.meta()));
}

export function renderLinks(ctx, op, ro) {
  const patch = (p) => ctx.act(`a modifié les liens de « ${op.title} »`, (d) => updateOp(d, op.id, p, ctx.meta()));
  return h('section', { class: 'panel glass' },
    h('div', { class: 'section-head' }, h('h3', {}, 'Liens'), ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => addLink(ctx, op) }, icon('plus'), 'Lien')),
    h('div', { class: 'link-list' }, op.links.length ? op.links.map((l, i) => h('div', { class: 'link-item' },
      icon('link'),
      isSafeUrl(l.url) ? h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label || l.url) : h('span', { class: 'dim' }, l.label || l.url),
      ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => patch({ links: op.links.filter((_, j) => j !== i) }) }, icon('close'))))
      : h('span', { class: 'dim' }, 'Aucun lien (post publié, Canva, Drive, brief…)')));
}

export function renderReviews(ctx, op, ro) {
  const form = { verdict: 'ok' };
  const reviews = [...op.reviews].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  let notesEl;
  const verdictBtns = [['ok', 'GO ✓'], ['ko', 'KO ✗']].map(([v, label]) => h('button', { type: 'button', class: `toggle toggle-${v}`, 'aria-pressed': v === form.verdict ? 'true' : 'false',
    onClick: (e) => { form.verdict = v; verdictBtns.forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); } }, label));
  return h('section', { class: 'panel glass' },
    h('div', { class: 'section-head' }, h('h3', {}, `Validations · ${reviews.length}`), h('span', { class: 'hint' }, 'le dernier GO débloque la publication')),
    h('div', { class: 'test-list' }, reviews.length ? reviews.map((r) => h('div', { class: 'test-item' },
      h('span', { class: `badge badge-${r.verdict}` }, r.verdict === 'ok' ? 'GO' : 'KO'),
      h('div', {}, avatar(r.by, 16), h('b', {}, ` ${r.by?.login || ''}`), h('span', { class: 'test-when' }, ` · ${fmtDay(r.at)}`)),
      ro ? h('span') : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => ctx.act(`a retiré une validation de « ${op.title} »`, (d) => removeReview(d, op.id, r.id, ctx.meta())) }, icon('close')),
      r.notes ? h('p', {}, r.notes) : null)) : h('span', { class: 'dim' }, 'Aucune validation enregistrée.')),
    ro ? null : h('form', { class: 'test-form', style: { marginTop: '14px' }, onSubmit: (e) => {
      e.preventDefault();
      const ok = ctx.act(`a validé « ${op.title} »`, (d) => addReview(d, op.id, { id: newId('r'), verdict: form.verdict, notes: notesEl.value.trim(), ...ctx.meta() }));
      if (ok) { notesEl.value = ''; }
    } },
    h('div', { class: 'grid-2' },
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Verdict'), h('div', { class: 'toggle-row' }, verdictBtns)),
      h('div', { class: 'field' }, h('label', { for: 'review-notes' }, 'Retour'), notesEl = h('textarea', { id: 'review-notes', class: 'textarea', placeholder: 'Ce qui va, ce qui doit changer…', style: { minHeight: '38px' }, dataset: { key: `rnotes:${op.id}` } }))),
    h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h('button', { type: 'submit', class: 'btn btn-cta btn-sm' }, icon('check'), 'Enregistrer la validation'))));
}

/** Résultats après publication : chiffres bruts + XP dérivés. */
export function renderResults(ctx, op, ro) {
  const doc = ctx.doc;
  const published = isPublished(doc, op);
  const b = xpBreakdown(doc, op);
  const save = (field, value) => ctx.act(`a mis à jour les résultats de « ${op.title} »`, (d) => setResults(d, op.id, { [field]: value }, ctx.meta()));
  const nextTier = [...XP_RULES.results].reverse().find((t) => (op.results.views || 0) < t.min);
  return h('section', { class: 'panel glass results' },
    h('div', { class: 'section-head' }, h('h3', {}, 'Résultats'), published ? h('span', { class: 'xp-chip xp-chip-lg' }, `+${b.total} XP`) : h('span', { class: 'hint' }, 'à remplir après publication')),
    h('div', { class: 'results-grid' }, RESULT_FIELDS.map((f) => h('div', { class: 'field result-field' },
      h('label', { for: `res-${f.id}` }, f.label),
      h('input', { id: `res-${f.id}`, class: 'input', type: 'number', min: 0, step: 1, inputmode: 'numeric', value: op.results[f.id] || '', placeholder: '0', disabled: ro, dataset: { key: `res:${f.id}:${op.id}` },
        onChange: (e) => save(f.id, e.target.value) })))),
    h('textarea', { class: 'textarea', style: { marginTop: '10px', minHeight: '56px' }, placeholder: 'Ce qu’on retient : ce qui a marché, à refaire, à éviter…', disabled: ro, dataset: { key: `resnotes:${op.id}` }, onChange: (e) => save('notes', e.target.value.trim()) }, op.results.notes || ''),
    published ? h('div', { class: 'xp-breakdown' },
      part('Format', b.base), part('Multicanal', b.channels), part('À l’heure', b.onTime), part('Résultats', b.results),
      nextTier ? h('span', { class: 'hint' }, `+${nextTier.xp} XP dès ${nextTier.label}`) : null) : null);
}

function part(label, xp) {
  return h('span', { class: `xp-part${xp ? ' is-on' : ''}` }, h('b', {}, `+${xp}`), ` ${label}`);
}
