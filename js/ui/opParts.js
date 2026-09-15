// Pièces de la fiche coup : publication, contenu, validation, résultats par canal, liens.
import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { newId, RESULT_FIELDS } from '../model/doc.js';
import { updateOp, addReview, removeReview, setResults, lastVerdict } from '../model/ops.js';
import { milestoneStatus, shiftDay } from '../model/milestones.js';

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

// Clés des textes en cours d'édition : survivent aux rendus (sondage GitHub,
// autre champ modifié) pour que la zone de texte ne redevienne pas du texte figé.
const editingKeys = new Set();

/** Texte long affiché en clair ; devient une zone de texte au clic, redevient du texte à la sortie. */
export function inlineText({ key, value = '', placeholder = '', disabled = false, className = '', onSave }) {
  const wrap = h('div', { class: 'inline-text' });
  const view = () => h('div', {
    class: `text-view${value ? '' : ' is-empty'}${disabled ? ' is-ro' : ''}`, role: disabled ? null : 'button', tabindex: disabled ? null : 0,
    title: disabled ? null : 'Cliquer pour modifier',
    onClick: () => { if (!disabled) edit(); },
    onKeydown: (e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); edit(); } },
  }, value || placeholder);
  const edit = () => {
    editingKeys.add(key);
    const ta = h('textarea', { class: `textarea ${className}`.trim(), placeholder, dataset: { key },
      onKeydown: (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ta.value = value; ta.dataset.dirty = ''; ta.blur(); } // stopPropagation : sinon Échap ferme aussi la fiche
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ta.blur(); }
      },
      onBlur: () => {
        editingKeys.delete(key);
        const next = ta.value;
        if (next !== value) onSave(next); // le rendu qui suit ré-affiche le texte
        else wrap.replaceChildren(view());
      },
    }, value);
    wrap.replaceChildren(ta);
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length);
  };
  if (editingKeys.has(key) && !disabled) edit(); else wrap.append(view());
  return wrap;
}

/** Publication : date + heure prévues, date réelle, état lisible, raccourcis. */
export function renderPublication(ctx, op, ro) {
  const planned = op.dates.publishPlanned || '';
  const actual = op.dates.publishActual || '';
  const t = today();
  const st = milestoneStatus({ planned, actual }, t);
  const set = (patch, text) => ctx.act(text, (d) => updateOp(d, op.id, patch, ctx.meta()));
  const setPlanned = (v) => set({ dates: { publishPlanned: v } }, v ? `a planifié « ${op.title} » au ${fmtDay(v)}` : `a retiré la date de « ${op.title} »`);
  const setActual = (v) => set({ dates: { publishActual: v } }, v ? `a marqué « ${op.title} » publié le ${fmtDay(v)}` : `a annulé la date de publication réelle de « ${op.title} »`);
  const base = planned || t;
  const quick = (txt, opts) => h('button', { type: 'button', class: 'chip chip-btn', disabled: ro, onClick: () => setPlanned(shiftDay(base, opts)) }, txt);
  return h('section', { class: `panel glass milestone is-${st.state} pub-panel` },
    h('div', { class: 'milestone-head' },
      h('div', {}, h('h3', {}, 'Publication'), h('div', { class: 'hint' }, actual ? `publié le ${fmtDay(actual)}` : planned ? `prévu le ${fmtDay(planned)}${op.publishTime ? ` à ${op.publishTime}` : ''}` : 'pas encore de date')),
      h('span', { class: `badge badge-ms badge-ms-${st.state}` }, st.label)),
    h('div', { class: 'milestone-row' },
      h('span', { class: 'milestone-k' }, 'Prévu'),
      datePicker(planned, setPlanned, { disabled: ro, placeholder: 'Fixer une date' }),
      h('input', { class: 'input input-time', type: 'time', value: op.publishTime || '', disabled: ro, 'aria-label': 'Heure de publication', onChange: (e) => set({ publishTime: e.target.value }, `a réglé l’heure de « ${op.title} »`) }),
      ro ? null : h('span', { class: 'milestone-quick' }, quick('+1 j', { weeks: 0 }), quick('+1 sem', { weeks: 1 }), quick('+2 sem', { weeks: 2 }),
        planned ? h('button', { type: 'button', class: 'chip chip-btn', onClick: () => setPlanned('') }, 'Effacer') : null)),
    h('div', { class: 'milestone-row' },
      h('span', { class: 'milestone-k' }, 'Publié'),
      actual ? [datePicker(actual, setActual, { disabled: ro }), ro ? null : h('button', { type: 'button', class: 'chip chip-btn', onClick: () => setActual('') }, 'Annuler')]
        : h('span', { class: 'dim' }, 'passe le coup en « Publié » pour dater automatiquement')));
}

/** Contenu : légende, hashtags, visuel. */
export function renderContent(ctx, op, ro) {
  const patch = (p, label) => ctx.act(label, (d) => updateOp(d, op.id, p, ctx.meta()));
  const asset = op.assetUrl;
  return h('section', { class: 'panel glass' },
    h('div', { class: 'section-head' }, h('h3', {}, 'Contenu'), h('span', { class: 'hint' }, 'ce qui part réellement en ligne')),
    h('div', { class: 'field' }, h('label', { for: 'op-caption' }, 'Légende / texte du post'),
      h('textarea', { id: 'op-caption', class: 'textarea caption', placeholder: 'Le texte tel qu’il sera publié. Emoji bienvenus.', disabled: ro, dataset: { key: `caption:${op.id}` }, onChange: (e) => patch({ caption: e.target.value }, `a écrit la légende de « ${op.title} »`) }, op.caption),
      op.caption ? h('span', { class: 'hint counter' }, `${op.caption.length} caractères`) : null),
    h('div', { class: 'grid-2', style: { marginTop: '12px' } },
      h('div', { class: 'field' }, h('label', { for: 'op-hashtags' }, 'Hashtags'), h('input', { id: 'op-hashtags', class: 'input', value: op.hashtags, placeholder: '#futnow #five', disabled: ro, dataset: { key: `hashtags:${op.id}` }, onChange: (e) => patch({ hashtags: e.target.value }, `a modifié les hashtags de « ${op.title} »`) })),
      h('div', { class: 'field' }, h('label', { for: 'op-asset' }, 'Visuel / vidéo (lien)'),
        h('div', { class: 'asset-row' },
          h('input', { id: 'op-asset', class: 'input', type: 'url', value: asset, placeholder: 'https://canva.com/… ou Drive', disabled: ro, dataset: { key: `asset:${op.id}` }, onChange: (e) => { const v = e.target.value.trim(); if (v && !isSafeUrl(v)) { ctx.toast('Il faut une URL http(s).', { kind: 'error' }); e.target.value = asset; return; } patch({ assetUrl: v }, `a lié le visuel de « ${op.title} »`); } }),
          asset && isSafeUrl(asset) ? h('a', { class: 'btn btn-sm', href: asset, target: '_blank', rel: 'noopener noreferrer' }, icon('link'), 'Ouvrir') : null))));
}

/** Validation en un clic : qui, quand, et un refus commenté si besoin. */
export function renderValidation(ctx, op, ro) {
  const last = lastVerdict(op);
  const history = [...op.reviews].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const review = (verdict, notes) => ctx.act(verdict === 'ok' ? `a validé « ${op.title} »` : `a refusé « ${op.title} »`, (d) => addReview(d, op.id, { id: newId('r'), verdict, notes, ...ctx.meta() }));
  const refuse = () => { const notes = prompt('Qu’est-ce qui doit changer ?'); if (notes !== null) review('ko', notes.trim()); };
  return h('section', { class: `panel glass validation${last ? ` is-${last.verdict}` : ''}` },
    h('div', { class: 'section-head' }, h('h3', {}, 'Validation'), h('span', { class: 'hint' }, 'un GO débloque « Publié »')),
    h('div', { class: 'validation-state' },
      last ? [avatar(last.by, 30), h('div', {}, h('b', {}, last.verdict === 'ok' ? `Validé par ${last.by?.login || '—'}` : `Refusé par ${last.by?.login || '—'}`), h('div', { class: 'muted' }, `${fmtDay(last.at)} · ${relTime(last.at)}`), last.notes ? h('p', { class: 'validation-notes' }, last.notes) : null)]
        : h('div', { class: 'muted' }, 'Pas encore validé.'),
      ro ? null : h('div', { class: 'validation-actions' },
        h('button', { type: 'button', class: 'btn btn-ok', onClick: () => review('ok', '') }, icon('check'), last?.verdict === 'ok' ? 'Revalider' : 'Valider'),
        h('button', { type: 'button', class: 'btn btn-danger', onClick: refuse }, icon('close'), 'Refuser'))),
    history.length > 1 ? h('details', { class: 'validation-history', dataset: { key: `vhist:${op.id}` } },
      h('summary', {}, `${history.length} décisions`),
      h('div', { class: 'test-list', style: { marginTop: '8px' } }, history.map((r) => h('div', { class: 'test-item' },
        h('span', { class: `badge badge-${r.verdict}` }, r.verdict === 'ok' ? 'GO' : 'KO'),
        h('div', {}, h('b', {}, r.by?.login || ''), h('span', { class: 'test-when' }, ` · ${fmtDay(r.at)}`)),
        ro ? h('span') : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => ctx.act(`a retiré une validation de « ${op.title} »`, (d) => removeReview(d, op.id, r.id, ctx.meta())) }, icon('close')),
        r.notes ? h('p', {}, r.notes) : null)))) : null);
}

/** Résultats par canal : un petit tableau, une ligne par canal coché. */
export function renderResults(ctx, op, ro) {
  const doc = ctx.doc;
  const published = op.stageId === doc.gates.finalStageId;
  const chans = op.channels.map((id) => doc.channels.find((c) => c.id === id)).filter(Boolean);
  const save = (channel, field, value) => ctx.act(`a saisi les résultats de « ${op.title} »`, (d) => setResults(d, op.id, { channel, metrics: { [field]: value } }, ctx.meta()));
  const totals = Object.fromEntries(RESULT_FIELDS.map((f) => [f.id, chans.reduce((s, c) => s + (op.results.channels[c.id]?.[f.id] || 0), 0)]));
  return h('section', { class: 'panel glass results' },
    h('div', { class: 'section-head' }, h('h3', {}, 'Résultats'), h('span', { class: 'hint' }, published ? 'à J+7 puis J+30' : 'à remplir après publication')),
    chans.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table results-table' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Canal'), RESULT_FIELDS.map((f) => h('th', {}, f.label)))),
      h('tbody', {},
        chans.map((c) => h('tr', {},
          h('td', {}, h('span', { class: 'channel-dot', style: { '--ch': c.color } }, c.icon), ` ${c.label}`),
          RESULT_FIELDS.map((f) => h('td', {}, h('input', { class: 'input input-metric', type: 'number', min: 0, inputmode: 'numeric', value: op.results.channels[c.id]?.[f.id] || '', placeholder: '0', disabled: ro, 'aria-label': `${f.label} ${c.label}`, dataset: { key: `res:${c.id}:${f.id}:${op.id}` }, onChange: (e) => save(c.id, f.id, e.target.value) }))))),
        chans.length > 1 ? h('tr', { class: 'results-total' }, h('td', {}, 'Total'), RESULT_FIELDS.map((f) => h('td', {}, totals[f.id] ? new Intl.NumberFormat('fr-FR').format(totals[f.id]) : h('span', { class: 'dim' }, '—')))) : null)))
      : h('p', { class: 'hint' }, 'Coche au moins un canal pour saisir des résultats.'),
    h('textarea', { class: 'textarea', style: { marginTop: '10px', minHeight: '56px' }, placeholder: 'Ce qu’on retient : ce qui a marché, à refaire, à éviter…', disabled: ro, dataset: { key: `resnotes:${op.id}` }, onChange: (e) => ctx.act(`a annoté les résultats de « ${op.title} »`, (d) => setResults(d, op.id, { notes: e.target.value.trim() }, ctx.meta())) }, op.results.notes || ''));
}

export function addLink(ctx, op) {
  const url = prompt('URL du lien (post publié, Drive, Notion…)');
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
      : h('span', { class: 'dim' }, 'Aucun lien (post publié, Drive, brief…)')));
}
