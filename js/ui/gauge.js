import { h } from './dom.js';
import { stageIndex } from '../model/stages.js';

/** Stepper cliquable de la fiche : une étape allumée, les précédentes faites. */
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
