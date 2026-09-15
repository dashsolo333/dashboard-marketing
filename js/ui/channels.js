// Vue Canaux : le rythme de publication par canal, pour voir d'un coup d'œil ce qui est à sec.
import { h, icon, fmtDay, today } from './dom.js';
import { channelStats } from '../model/stats.js';
import { opDay } from '../model/ops.js';
import { stageById } from '../model/stages.js';

export function renderChannels(ctx) {
  const doc = ctx.doc;
  const t = today();
  const stats = channelStats(doc, t);
  const max = Math.max(1, ...stats.flatMap((s) => s.weeks));
  return h('div', { class: 'channels-view' },
    h('p', { class: 'hint channels-intro' }, 'Une ligne par canal : ce qui est sorti ou prévu cette semaine, dans les 30 jours, et le rythme des 8 dernières semaines. Un canal sans rien de prévu apparaît en orange.'),
    h('div', { class: 'channel-grid' }, stats.map((s) => renderChannel(ctx, s, max, t))));
}

function renderChannel(ctx, s, max, t) {
  const doc = ctx.doc;
  const dry = s.next30 === 0 && s.week === 0;
  const upcoming = doc.ops.filter((o) => o.channels.includes(s.channel.id) && o.stageId !== doc.gates.finalStageId && opDay(o) && opDay(o) >= t)
    .sort((a, b) => opDay(a).localeCompare(opDay(b))).slice(0, 4);
  return h('section', { class: `channel-card glass${dry ? ' is-dry' : ''}`, style: { '--ch': s.channel.color } },
    h('header', { class: 'channel-head' },
      h('span', { class: 'channel-icon' }, s.channel.icon),
      h('div', { class: 'channel-name' },
        h('h2', {}, s.channel.label),
        h('span', { class: 'channel-sub muted' },
          s.last ? `dernière publication ${fmtDay(s.last)}` : 'jamais publié',
          dry ? [' · ', h('span', { class: 'channel-dry' }, 'rien de prévu')] : null)),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm channel-cal', title: 'Voir ce canal dans le calendrier', onClick: () => ctx.setFilter({ channel: s.channel.id }, { view: 'calendar' }) }, 'Calendrier', icon('arrow'))),
    h('div', { class: 'channel-figures' },
      figure(s.week, 'cette semaine'),
      figure(s.next30, '30 prochains jours'),
      figure(s.unscheduled, 'sans date', s.unscheduled > 0 ? 'is-warn' : '')),
    s.weeks.every((n) => !n) ? h('div', { class: 'spark is-empty' }, 'Aucune publication sur les 8 dernières semaines')
      : h('div', { class: 'spark', role: 'img', 'aria-label': `Publications par semaine : ${s.weeks.join(', ')}` },
      s.weeks.map((n, i) => h('div', { class: `spark-col${i === s.weeks.length - 1 ? ' is-current' : ''}`, title: `Semaine du ${fmtDay(s.weekStarts[i])} : ${n}` },
        h('i', { style: { height: `${Math.max(4, (n / max) * 100)}%` } }), h('span', {}, n || '')))),
    upcoming.length ? h('div', { class: 'channel-next' }, upcoming.map((o) => h('button', { type: 'button', class: 'agenda-item', onClick: () => ctx.openOp(o.id) },
      h('span', { class: 'agenda-time' }, fmtDay(opDay(o))),
      h('span', { class: 'agenda-title' }, `${o.icon ? `${o.icon} ` : ''}${o.title}`),
      h('span', { class: 'chip chip-stage chip-xs', style: { '--dot': stageById(doc, o.stageId)?.color } }, h('i', { class: 'chip-dot' }), stageById(doc, o.stageId)?.label))))
      : h('div', { class: 'channel-empty' },
        h('span', { class: 'hint' }, 'Rien à venir.'),
        ctx.canWrite() ? h('button', { type: 'button', class: 'btn btn-sm', onClick: () => ctx.openCreate({ channels: [s.channel.id] }) }, icon('plus'), 'Créer un coup') : null));
}

function figure(value, label, tone = '') {
  return h('div', { class: `channel-figure ${tone}` }, h('b', {}, value), h('span', {}, label));
}
