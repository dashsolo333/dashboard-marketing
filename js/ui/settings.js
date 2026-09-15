import { h, icon, avatar, fmtDay } from './dom.js';
import { CONFIG } from '../config.js';
import { renameStage, recolorStage, addStage, removeStage, moveStage, setGate } from '../model/stages.js';
import { addChannel, renameChannel, removeChannel, moveChannel } from '../model/channels.js';
import { newId } from '../model/doc.js';
import { addCampaign, updateCampaign, removeCampaign } from '../model/campaigns.js';

const TABS = [
  { id: 'account', label: 'Compte' }, { id: 'pipeline', label: 'Pipeline' }, { id: 'channels', label: 'Canaux' },
  { id: 'campaigns', label: 'Campagnes' },
];

export function renderSettings(ctx) {
  const tab = ctx.settingsTab || 'account';
  const body = { account: renderAccount, pipeline: renderPipeline, channels: renderChannels, campaigns: renderCampaignsSettings }[tab] || renderAccount;
  return h('div', { class: 'overlay', onClick: (e) => { if (e.target === e.currentTarget) ctx.closeModal(); } },
    h('div', { class: 'modal modal-wide glass', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
      h('div', { class: 'modal-head' },
        h('h2', { id: 'settings-title' }, 'Réglages'),
        h('nav', { class: 'tabs' }, TABS.map((t) => h('button', { type: 'button', class: 'tab', 'aria-selected': tab === t.id ? 'true' : 'false', onClick: () => ctx.openSettings(t.id) }, t.label))),
        h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Fermer', onClick: ctx.closeModal }, icon('close'))),
      ctx.doc || tab === 'account' ? body(ctx) : h('p', { class: 'hint' }, 'Chargement…')));
}

function renderAccount(ctx) {
  const { state } = ctx.store;
  let input;
  const classicUrl = `https://github.com/settings/tokens/new?scopes=repo&description=${encodeURIComponent(`Futnow Marketing (${CONFIG.repo})`)}`;
  const fineUrl = 'https://github.com/settings/personal-access-tokens/new';
  return h('div', { style: { display: 'grid', gap: '16px' } },
    state.user ? h('div', { class: 'user-card' }, avatar(state.user, 40),
      h('div', { style: { flex: 1 } }, h('b', {}, state.user.name), h('div', { class: 'muted' }, `@${state.user.login} · ${state.user.canWrite ? 'peut écrire' : 'lecture seule sur ce dépôt'}`)),
      h('button', { type: 'button', class: 'btn btn-sm', onClick: async () => { await ctx.store.setToken(''); ctx.rerender(); } }, 'Se déconnecter')) : null,
    h('div', { class: 'field' },
      h('label', { for: 'token' }, state.user ? 'Remplacer le token' : 'Token GitHub personnel'),
      h('div', { style: { display: 'flex', gap: '8px' } },
        input = h('input', { id: 'token', class: 'input', type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: false }),
        h('button', { type: 'button', class: 'btn btn-cta', onClick: async () => {
          try { const u = await ctx.store.setToken(input.value); ctx.toast(u.canWrite ? `Connecté : ${u.login}` : `${u.login} connecté, mais sans droit d’écriture`, { kind: u.canWrite ? 'ok' : 'error' }); ctx.rerender(); }
          catch (e) { ctx.toast(`Token refusé : ${e.message}`, { kind: 'error' }); }
        } }, 'Vérifier'))),
    h('div', { class: 'token-help glass' },
      h('b', {}, 'Créer un token qui peut tout faire sur ce dépôt'),
      h('ol', { class: 'token-steps' },
        h('li', {}, h('a', { href: classicUrl, target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-cta btn-sm', style: { display: 'inline-flex' } }, 'Ouvrir GitHub avec les bons réglages ↗'),
          h('span', { class: 'hint' }, ' la case « repo » est déjà cochée, tu n’as qu’à choisir la durée.')),
        h('li', {}, 'Clique « Generate token » en bas, copie le token (il commence par ', h('code', {}, 'ghp_'), ').'),
        h('li', {}, 'Colle-le ci-dessus et clique « Vérifier ».')),
      h('p', { class: 'hint' }, 'Il faut être collaborateur du dépôt ', h('code', {}, `${CONFIG.owner}/${CONFIG.repo}`), '. Alternative plus restrictive : un token ', h('a', { href: fineUrl, target: '_blank', rel: 'noopener noreferrer' }, 'fine-grained'), ' limité à ce dépôt avec Contents : Read and write.'),
      h('p', { class: 'hint' }, 'Le token reste dans ce navigateur (localStorage) et sert uniquement à écrire ', h('code', {}, CONFIG.dataPath), '. Chaque modification devient un commit à ton nom. La page vérifie le droit d’écriture du token lui-même à la connexion.')));
}

function rowActions(ctx, { ro, i, n, onUp, onDown, onRemove }) {
  return h('div', { class: 'row-actions' },
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro || i === 0, 'aria-label': 'Monter', onClick: onUp }, icon('up')),
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro || i === n - 1, 'aria-label': 'Descendre', onClick: onDown }, icon('down')),
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro, 'aria-label': 'Supprimer', onClick: onRemove }, icon('trash')));
}

function renderPipeline(ctx) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const act = (label, op) => ctx.act(label, op);
  const gateSel = (gate, label) => h('div', { class: 'field' }, h('label', {}, label),
    h('select', { class: 'select', disabled: ro, onChange: (e) => act(`a changé la garde ${label}`, (d) => setGate(d, gate, e.target.value)) },
      doc.stages.map((s) => h('option', { value: s.id, selected: doc.gates[gate] === s.id }, s.label))));
  return h('div', { style: { display: 'grid', gap: '16px' } },
    h('p', { class: 'hint' }, 'Les étapes sont libres : renomme, recolore, réordonne, ajoute. L’étape « Publié » porte la garde : on n’y entre qu’avec un GO (forçable).'),
    h('div', { class: 'settings-list' }, doc.stages.map((s, i) => h('div', { class: 'settings-row' },
      h('input', { type: 'color', value: s.color, disabled: ro, 'aria-label': 'Couleur', onChange: (e) => act(`a recoloré l’étape ${s.label}`, (d) => recolorStage(d, s.id, e.target.value)) }),
      h('div', {}, h('input', { class: 'input', value: s.label, disabled: ro, 'aria-label': 'Nom de l’étape', onChange: (e) => { if (e.target.value.trim()) act(`a renommé l’étape ${s.label} en ${e.target.value.trim()}`, (d) => renameStage(d, s.id, e.target.value.trim())); } }),
        s.id === doc.gates.finalStageId ? h('span', { class: 'gate-tag' }, 'garde · GO requis') : null),
      rowActions(ctx, { ro, i, n: doc.stages.length,
        onUp: () => act('a réordonné le pipeline', (d) => moveStage(d, s.id, i - 1)),
        onDown: () => act('a réordonné le pipeline', (d) => moveStage(d, s.id, i + 1)),
        onRemove: () => { if (confirm(`Supprimer l’étape ${s.label} ? Ses coups reculent d’une étape.`)) act(`a supprimé l’étape ${s.label}`, (d) => removeStage(d, s.id)); } })))),
    ro ? null : h('button', { type: 'button', class: 'btn', style: { justifySelf: 'start' }, onClick: () => { const label = prompt('Nom de la nouvelle étape'); if (label?.trim()) act(`a ajouté l’étape ${label.trim()}`, (d) => addStage(d, { label: label.trim() }, d.stages.length - 2)); } }, icon('plus'), 'Ajouter une étape'),
    h('div', { class: 'grid-2' }, gateSel('finalStageId', 'Étape « publié » (GO requis)')));
}

function renderChannels(ctx) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const act = (label, op) => ctx.act(label, op);
  return h('div', { style: { display: 'grid', gap: '16px' } },
    h('p', { class: 'hint' }, 'Un canal = un endroit où un coup se diffuse : réseau social, newsletter, programme d’ambassadeurs, terrain, événement… Ajoute ce qui vous sert, retire le reste.'),
    h('div', { class: 'settings-list' }, doc.channels.map((c, i) => h('div', { class: 'settings-row settings-row-channel' },
      h('input', { type: 'color', value: c.color, disabled: ro, 'aria-label': 'Couleur', onChange: (e) => act(`a recoloré le canal ${c.label}`, (d) => renameChannel(d, c.id, { color: e.target.value })) }),
      h('input', { class: 'input input-emoji', value: c.icon, maxlength: 4, disabled: ro, 'aria-label': 'Icône', onChange: (e) => act(`a changé l’icône du canal ${c.label}`, (d) => renameChannel(d, c.id, { icon: e.target.value.trim() || '•' })) }),
      h('input', { class: 'input', value: c.label, disabled: ro, 'aria-label': 'Nom du canal', onChange: (e) => { if (e.target.value.trim()) act(`a renommé le canal ${c.label} en ${e.target.value.trim()}`, (d) => renameChannel(d, c.id, { label: e.target.value.trim() })); } }),
      h('span', { class: 'gate-tag' }, `${doc.ops.filter((o) => o.channels.includes(c.id)).length} coup${doc.ops.filter((o) => o.channels.includes(c.id)).length > 1 ? 's' : ''}`),
      rowActions(ctx, { ro, i, n: doc.channels.length,
        onUp: () => act('a réordonné les canaux', (d) => moveChannel(d, c.id, i - 1)),
        onDown: () => act('a réordonné les canaux', (d) => moveChannel(d, c.id, i + 1)),
        onRemove: () => { if (confirm(`Retirer le canal ${c.label} ? Il sera décoché sur tous les coups.`)) act(`a retiré le canal ${c.label}`, (d) => removeChannel(d, c.id)); } })))),
    ro ? null : h('button', { type: 'button', class: 'btn', style: { justifySelf: 'start' }, onClick: () => {
      const label = prompt('Nom du canal (ex. Discord, Affichage centre, Podcast…)');
      if (!label?.trim()) return;
      const emoji = prompt('Icône (un emoji)', '✨') || '✨';
      act(`a ajouté le canal ${label.trim()}`, (d) => addChannel(d, { label: label.trim(), icon: emoji.trim() }));
    } }, icon('plus'), 'Ajouter un canal'));
}

function renderCampaignsSettings(ctx) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const update = (id, patch, label) => ctx.act(label, (d) => updateCampaign(d, id, patch));
  const campaigns = [...doc.campaigns].sort((a, b) => (a.startAt || '9999').localeCompare(b.startAt || '9999'));
  const field = (c, key, props, label) => h('input', { class: 'input', value: c[key] || '', disabled: ro, 'aria-label': label, title: label, ...props, onChange: (e) => update(c.id, { [key]: e.target.value.trim() }, `a modifié la campagne ${c.name}`) });
  return h('div', { style: { display: 'grid', gap: '16px' } },
    h('p', { class: 'hint' }, 'Une campagne = un objectif chiffré et une fenêtre de temps qui regroupent plusieurs coups (rentrée, lancement d’une feature, tournoi…). Le réalisé se met à jour depuis la vue Campagnes.'),
    h('div', { class: 'settings-list' }, campaigns.length ? campaigns.map((c) => h('div', { class: 'settings-row settings-row-campaign' },
      field(c, 'icon', { class: 'input input-emoji', maxlength: 4, placeholder: '✦' }, 'Icône'),
      h('div', { style: { display: 'grid', gap: '6px' } },
        h('input', { class: 'input', value: c.name, disabled: ro, 'aria-label': 'Nom', onChange: (e) => { if (e.target.value.trim()) update(c.id, { name: e.target.value.trim() }, `a renommé la campagne ${c.name}`); } }),
        h('div', { class: 'goal-fields' },
          field(c, 'goal', { placeholder: 'Objectif (ex. ligues créées)' }, 'Objectif'),
          h('input', { class: 'input', type: 'number', min: 0, value: c.target || '', placeholder: 'Cible', disabled: ro, 'aria-label': 'Cible', title: 'Cible chiffrée', onChange: (e) => update(c.id, { target: e.target.value }, `a fixé la cible de la campagne ${c.name}`) })),
        h('div', { class: 'goal-fields' },
          h('input', { class: 'input', type: 'date', value: c.startAt || '', disabled: ro, 'aria-label': 'Début', title: 'Début', onChange: (e) => update(c.id, { startAt: e.target.value }, `a daté la campagne ${c.name}`) }),
          h('input', { class: 'input', type: 'date', value: c.endAt || '', disabled: ro, 'aria-label': 'Fin', title: 'Fin', onChange: (e) => update(c.id, { endAt: e.target.value }, `a fixé la fin de la campagne ${c.name}`) }))),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro, 'aria-label': 'Supprimer', onClick: () => { if (confirm(`Supprimer la campagne ${c.name} ? Les coups restent, sans campagne.`)) ctx.act(`a supprimé la campagne ${c.name}`, (d) => removeCampaign(d, c.id)); } }, icon('trash'))))
      : h('div', { class: 'dim' }, 'Aucune campagne. Crée la première (ex. Rentrée 2026).')),
    ro ? null : h('button', { type: 'button', class: 'btn', style: { justifySelf: 'start' }, onClick: () => {
      const name = prompt('Nom de la campagne');
      if (!name?.trim()) return;
      ctx.act(`a créé la campagne ${name.trim()}`, (d) => addCampaign(d, { id: newId('c'), name: name.trim() }));
    } }, icon('plus'), 'Nouvelle campagne'));
}
