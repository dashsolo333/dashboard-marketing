import { h, svg } from './dom.js';
import { gaugeOf, stageIndex, stageById } from '../model/stages.js';

/** Anneau de progression, couleur de l'étape courante. */
export function ringGauge(doc, op, size = 44) {
  return ring(gaugeOf(doc, op), stageById(doc, op.stageId)?.color || '#8b8fa8', size);
}

/** Anneau générique : valeur 0..100, couleur, taille, libellé central optionnel. */
export function ring(value, color, size = 44, label = null) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  const el = svg('svg', { class: 'ring', viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img', 'aria-label': `${value} %` },
    svg('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-track' }),
    svg('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-value', stroke: color, 'stroke-dasharray': `${dash} ${c - dash}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }),
    svg('text', { x: '50%', y: '50%', class: 'ring-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, label ?? (value === 100 ? '✓' : `${value}`)));
  el.style.setProperty('--ring-glow', color);
  return el;
}

/** Barre segmentée : un segment par étape, remplis jusqu'à l'étape courante. */
export function stageBar(doc, op) {
  const idx = stageIndex(doc, op.stageId);
  return h('div', { class: 'stagebar', role: 'img', 'aria-label': `Étape ${idx + 1} sur ${doc.stages.length}` },
    doc.stages.map((s, i) => h('span', {
      class: `stagebar-seg${i < idx ? ' is-done' : ''}${i === idx ? ' is-current' : ''}`,
      style: i <= idx ? { background: s.color } : null,
      title: s.label,
    })));
}

/** Stepper cliquable de la fiche. */
export function stageStepper(doc, op, onPick) {
  const idx = stageIndex(doc, op.stageId);
  return h('ol', { class: 'stepper' },
    doc.stages.map((s, i) => h('li', {
      class: `step${i < idx ? ' is-done' : ''}${i === idx ? ' is-current' : ''}`,
      style: { '--step-color': s.color },
    },
    h('button', { type: 'button', class: 'step-btn', onClick: () => onPick(s.id), 'aria-current': i === idx ? 'step' : null },
      h('span', { class: 'step-dot' }),
      h('span', { class: 'step-label' }, s.label)))));
}

/** Ligne de progression lisible : barre colorée, pourcentage, étape. */
export function progressRow(doc, op) {
  const value = gaugeOf(doc, op);
  const stage = stageById(doc, op.stageId);
  const color = stage?.color || '#8b8fa8';
  return h('div', { class: 'progress', role: 'img', 'aria-label': `${value} % · ${stage?.label || ''}` },
    h('div', { class: 'bar', style: { '--bar': color } }, h('i', { style: { width: `${value}%` } })),
    h('span', { class: 'progress-pct' }, `${value} %`),
    h('span', { class: 'progress-stage', style: { '--dot': color } }, h('i'), stage?.label || '—', op.stepProgress && value < 100 ? h('span', { class: 'dim' }, ` · ${op.stepProgress} % de l’étape`) : null));
}

export function bigGauge(doc, op) {
  const value = gaugeOf(doc, op);
  const stage = stageById(doc, op.stageId);
  return h('div', { class: 'biggauge' },
    ringGauge(doc, op, 92),
    h('div', { class: 'biggauge-text' },
      h('div', { class: 'biggauge-value' }, `${value}`, h('span', {}, '%')),
      h('div', { class: 'biggauge-stage', style: { color: stage?.color } }, stage?.label || '—')));
}
