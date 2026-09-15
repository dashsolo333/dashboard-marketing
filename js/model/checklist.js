// Checklist : groupes alignés sur le pipeline, checklist type marketing.
import { addChecklistItem } from './ops.js';

export const DEFAULT_TEMPLATE = [
  { group: 'brief', text: 'Objectif et cible écrits (pourquoi ce coup, pour qui)' },
  { group: 'brief', text: 'Message clé + appel à l’action choisis' },
  { group: 'brief', text: 'Canaux et format tranchés' },
  { group: 'create', text: 'Visuel / vidéo produit' },
  { group: 'create', text: 'Texte, légende et hashtags rédigés' },
  { group: 'create', text: 'Lien / code de suivi prêt' },
  { group: 'review', text: 'Relecture ortho + ton Futnow' },
  { group: 'review', text: 'Validation OK enregistrée' },
  { group: 'scheduled', text: 'Programmé dans l’outil (date + heure)' },
  { group: 'scheduled', text: 'Équipe prévenue pour relayer' },
  { group: 'published', text: 'Publié et vérifié en ligne' },
  { group: 'published', text: 'Résultats saisis à J+7' },
];

export function applyTemplate(doc, opId, { by, at }) {
  const op = doc.ops.find((o) => o.id === opId);
  if (!op) throw new Error('Coup introuvable');
  const existing = new Set(op.items.map((i) => i.text.trim().toLowerCase()));
  let next = doc;
  let n = 0;
  for (const tpl of DEFAULT_TEMPLATE) {
    if (existing.has(tpl.text.toLowerCase())) continue;
    n += 1;
    next = addChecklistItem(next, opId, { id: `i_${at}_${n}`, text: tpl.text, group: tpl.group, by, at, silent: true });
  }
  if (!n) return doc;
  const o2 = next.ops.find((o) => o.id === opId);
  return { ...next, activity: [...next.activity, { id: `a_${at}_${opId}_template`, at, by, opId, type: 'update', text: `a ajouté la checklist type (${n} tâches) à « ${o2.title} »` }] };
}

export const STATUSES = [
  { id: 'todo', label: 'À faire', color: '#8b8fa8' },
  { id: 'doing', label: 'En cours', color: '#8b5cf6' },
  { id: 'blocked', label: 'Bloquée', color: '#f87171' },
  { id: 'done', label: 'Faite', color: '#b5f03a' },
];

/** Synthèse d'avancement de la checklist. */
export function checklistStats(op, today) {
  const items = op.items || [];
  const count = (st) => items.filter((i) => i.status === st).length;
  const open = items.filter((i) => i.status !== 'done');
  const late = open.filter((i) => i.due && i.due < today);
  const upcoming = open.filter((i) => i.due && i.due >= today).sort((a, b) => a.due.localeCompare(b.due));
  const doneItems = items.filter((i) => i.status === 'done' && i.doneAt).sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));
  const done = count('done');
  return {
    total: items.length, done, doing: count('doing'), blocked: count('blocked'), todo: count('todo'),
    late: late.length, lateItems: late, pct: items.length ? Math.round((done / items.length) * 100) : 0,
    nextDue: upcoming[0] || null, lastDone: doneItems[0] || null,
  };
}

/** Regroupe les tâches par étape du pipeline, dans l'ordre du pipeline. */
export function groupItems(doc, op) {
  const order = doc.stages.map((s) => s.id);
  const byGroup = new Map();
  for (const it of op.items || []) {
    const g = order.includes(it.group) ? it.group : '';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(it);
  }
  const groups = [...byGroup.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : order.indexOf(a) - order.indexOf(b)));
  return groups.map(([id, items]) => {
    const stage = doc.stages.find((s) => s.id === id);
    const done = items.filter((i) => i.status === 'done').length;
    return {
      id, label: stage?.label || 'Autre', color: stage?.color || '#8b8fa8', items, done,
      doing: items.filter((i) => i.status === 'doing').length,
      blocked: items.filter((i) => i.status === 'blocked').length,
      pct: items.length ? Math.round((done / items.length) * 100) : 0,
    };
  });
}
