// Pipeline modulable : les étapes sont éditables ; l'étape finale porte une
// garde (dernier GO requis) référencée par id dans `gates`.

export const DEFAULT_STAGES = [
  { id: 'idea', label: 'Idée', color: '#8b8fa8' },
  { id: 'brief', label: 'Brief', color: '#a78bfa' },
  { id: 'create', label: 'Création', color: '#f472b6' },
  { id: 'review', label: 'Validation', color: '#f59e0b' },
  { id: 'scheduled', label: 'Programmé', color: '#22d3ee' },
  { id: 'published', label: 'Publié', color: '#b5f03a' },
];

export const DEFAULT_GATES = { finalStageId: 'published' };

export function stageIndex(doc, stageId) {
  return doc.stages.findIndex((s) => s.id === stageId);
}

export function stageById(doc, stageId) {
  return doc.stages.find((s) => s.id === stageId) || null;
}

export function latestReview(op) {
  const reviews = op.reviews || [];
  if (!reviews.length) return null;
  return [...reviews].sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1);
}

/** Garde : publier exige un dernier GO. */
export function canMoveTo(doc, op, stageId, { force = false } = {}) {
  if (stageId !== doc.gates.finalStageId || force) return { ok: true, reason: '' };
  const last = latestReview(op);
  if (!last) return { ok: false, reason: 'Pas encore validé. Clique « Valider » sur la fiche, ou force le passage.' };
  if (last.verdict !== 'ok') return { ok: false, reason: 'La dernière validation est un refus. Valide à nouveau ou force le passage.' };
  return { ok: true, reason: '' };
}

export function renameStage(doc, stageId, label) {
  return { ...doc, stages: doc.stages.map((s) => (s.id === stageId ? { ...s, label } : s)) };
}

export function recolorStage(doc, stageId, color) {
  return { ...doc, stages: doc.stages.map((s) => (s.id === stageId ? { ...s, color } : s)) };
}

export function addStage(doc, { label, color = '#8b8fa8' }, at = doc.stages.length) {
  const id = `s_${Math.random().toString(36).slice(2, 8)}`;
  const stages = [...doc.stages];
  stages.splice(at, 0, { id, label, color });
  return { ...doc, stages };
}

export function moveStage(doc, stageId, to) {
  const from = stageIndex(doc, stageId);
  if (from < 0) return doc;
  const stages = [...doc.stages];
  const [s] = stages.splice(from, 1);
  stages.splice(Math.max(0, Math.min(stages.length, to)), 0, s);
  return { ...doc, stages };
}

export function removeStage(doc, stageId) {
  if (stageId === doc.gates.finalStageId) {
    throw new Error('Cette étape porte la garde « publié » : change la garde avant de la supprimer.');
  }
  const idx = stageIndex(doc, stageId);
  if (idx < 0) return doc;
  const fallback = doc.stages[Math.max(0, idx - 1)].id;
  return {
    ...doc,
    stages: doc.stages.filter((s) => s.id !== stageId),
    ops: (doc.ops || []).map((o) => (o.stageId === stageId ? { ...o, stageId: fallback } : o)),
  };
}

export function setGate(doc, gate, stageId) {
  if (gate !== 'finalStageId') throw new Error('Garde inconnue');
  if (stageIndex(doc, stageId) < 0) throw new Error('Étape inconnue');
  return { ...doc, gates: { ...doc.gates, [gate]: stageId } };
}
