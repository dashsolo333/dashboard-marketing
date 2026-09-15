// Couche jeu : bandeau saison (toutes les vues) et vue « Saison » complète.
import { h, icon, avatar, fmtDay, today } from './dom.js';
import { ring } from './gauge.js';
import { KINDS } from '../model/doc.js';
import { totalXp, levelOf, streakWeeks, weeklyGoal, leaderboard, badges, seasonProgress, seasonXp, publishedOps, xpOf, xpBreakdown, XP_RULES, LEVELS } from '../model/game.js';

const GOLD = '#f5c451';

/** Bandeau compact au-dessus des KPI : niveau, XP, série, objectif de la semaine. */
export function renderSeasonStrip(ctx) {
  const doc = ctx.doc;
  const t = today();
  const xp = totalXp(doc);
  const lvl = levelOf(xp);
  const streak = streakWeeks(doc, t);
  const week = weeklyGoal(doc, t);
  const season = seasonProgress(doc, t);
  return h('button', { type: 'button', class: 'season-strip glass', onClick: () => ctx.setView('season'), title: 'Ouvrir la saison' },
    h('div', { class: 'strip-level' },
      h('div', { class: 'strip-ring' }, ring(lvl.pct, GOLD, 56, lvl.icon)),
      h('div', {},
        h('div', { class: 'strip-kicker' }, `Niveau ${lvl.index + 1}`),
        h('div', { class: 'strip-name' }, lvl.name),
        h('div', { class: 'strip-sub' }, lvl.next ? `${lvl.remaining} XP avant ${lvl.nextName}` : 'niveau max'))),
    h('div', { class: 'strip-xp' },
      h('div', { class: 'strip-xp-head' }, h('b', {}, `${xp} XP`), h('span', { class: 'dim' }, lvl.next ? ` / ${lvl.next}` : '')),
      h('div', { class: 'bar bar-gold' }, h('i', { style: { width: `${lvl.pct}%` } }))),
    h('div', { class: `strip-stat${streak ? ' is-hot' : ''}` },
      h('span', { class: 'strip-stat-icon' }, '🔥'),
      h('div', {}, h('b', {}, `${streak} sem.`), h('span', {}, streak ? 'de série' : 'série à lancer'))),
    h('div', { class: `strip-stat${week.reached ? ' is-done' : ''}` },
      h('span', { class: 'strip-stat-ring' }, ring(week.pct, week.reached ? '#b5f03a' : '#22d3ee', 40, `${week.done}`)),
      h('div', {}, h('b', {}, `${week.done} / ${week.goal}`), h('span', {}, 'publiés cette semaine'))),
    season.active ? h('div', { class: 'strip-stat strip-season' },
      h('span', { class: 'strip-stat-icon' }, '🏁'),
      h('div', {}, h('b', {}, season.name), h('span', {}, season.goal ? `${season.pct} % de l’objectif` : '', season.daysLeft !== null ? ` · J-${season.daysLeft}` : ''))) : null,
    h('span', { class: 'strip-go' }, icon('arrow')));
}

export function renderSeason(ctx) {
  const doc = ctx.doc;
  const t = today();
  const xp = totalXp(doc);
  const lvl = levelOf(xp);
  const streak = streakWeeks(doc, t);
  const week = weeklyGoal(doc, t);
  const season = seasonProgress(doc, t);
  const board = leaderboard(doc);
  const all = badges(doc, t);
  const earned = all.filter((b) => b.earned);
  const recent = [...publishedOps(doc)].sort((a, b) => b.dates.publishActual.localeCompare(a.dates.publishActual)).slice(0, 8);

  return h('div', { class: 'season' },
    h('section', { class: 'season-hero glass' },
      h('div', { class: 'season-hero-glow' }),
      h('div', { class: 'season-level' },
        h('div', { class: 'season-ring' }, ring(lvl.pct, GOLD, 168, ''), h('div', { class: 'season-ring-center' }, h('span', { class: 'season-ring-icon' }, lvl.icon), h('b', {}, `Niv. ${lvl.index + 1}`))),
        h('div', { class: 'season-level-text' },
          h('div', { class: 'strip-kicker' }, season.active ? season.name : 'Équipe marketing'),
          h('h1', { class: 'season-title' }, lvl.name),
          h('div', { class: 'season-xp' }, h('b', {}, xp), ' XP', lvl.next ? h('span', { class: 'muted' }, ` · encore ${lvl.remaining} pour ${lvl.nextName}`) : h('span', { class: 'muted' }, ' · niveau max atteint')),
          h('div', { class: 'bar bar-gold bar-lg' }, h('i', { style: { width: `${lvl.pct}%` } })),
          h('div', { class: 'season-ladder' }, LEVELS.map((l, i) => h('span', { class: `ladder-step${i <= lvl.index ? ' is-done' : ''}${i === lvl.index ? ' is-current' : ''}`, title: `${l.name} · ${l.xp} XP` }, l.icon))))),
      h('div', { class: 'season-tiles' },
        tile('🔥', `${streak}`, streak > 1 ? 'semaines de série' : 'semaine de série', streak ? 'is-hot' : ''),
        tile('🎯', `${week.done}/${week.goal}`, week.reached ? 'objectif hebdo atteint !' : `publiés cette semaine${week.scheduled ? ` · ${week.scheduled} prévu${week.scheduled > 1 ? 's' : ''}` : ''}`, week.reached ? 'is-done' : ''),
        tile('🏅', `${earned.length}/${all.length}`, 'badges débloqués'),
        season.active ? tile('🏁', season.goal ? `${season.pct} %` : `${seasonXp(doc)} XP`, season.goal ? `de l’objectif saison (${season.goal} XP)` : 'gagnés cette saison', season.daysLeft !== null && season.daysLeft <= 14 ? 'is-hot' : '')
          : h('button', { type: 'button', class: 'season-tile is-ghost', onClick: () => ctx.openSettings('game') }, h('span', { class: 'season-tile-icon' }, '🏁'), h('b', {}, 'Lancer une saison'), h('span', {}, 'nom, dates, objectif XP')))),

    h('div', { class: 'season-cols' },
      h('section', { class: 'panel glass' },
        h('div', { class: 'section-head' }, h('h3', {}, 'Classement'), h('span', { class: 'hint' }, 'XP crédités au responsable du coup')),
        board.length ? h('ol', { class: 'ladder' }, board.map((p, i) => h('li', { class: `ladder-row${i === 0 ? ' is-first' : ''}` },
          h('span', { class: 'ladder-rank' }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`),
          avatar({ login: p.login, avatar: p.avatar }, 30),
          h('div', { class: 'ladder-who' }, h('b', {}, p.login), h('span', { class: 'muted' }, `${p.published} publication${p.published > 1 ? 's' : ''}`)),
          h('div', { class: 'ladder-bar' }, h('div', { class: 'bar bar-gold' }, h('i', { style: { width: `${Math.round((p.xp / board[0].xp) * 100)}%` } }))),
          h('b', { class: 'ladder-xp' }, `${p.xp} XP`))))
          : h('div', { class: 'empty' }, h('b', {}, 'Personne au classement'), 'Publie un premier coup pour ouvrir le score.')),

      h('section', { class: 'panel glass' },
        h('div', { class: 'section-head' }, h('h3', {}, 'Badges')),
        h('div', { class: 'badges' }, all.map((b) => h('div', { class: `medal${b.earned ? ' is-earned' : ''}`, title: b.hint },
          h('span', { class: 'medal-icon' }, b.icon),
          h('b', {}, b.label),
          h('span', { class: 'medal-hint' }, b.hint),
          b.earned ? null : h('div', { class: 'bar medal-bar' }, h('i', { style: { width: `${Math.round(b.progress * 100)}%` } })),
          b.earned ? null : h('span', { class: 'medal-progress' }, `${b.value} / ${b.target}`)))))),

    h('div', { class: 'season-cols' },
      h('section', { class: 'panel glass' },
        h('div', { class: 'section-head' }, h('h3', {}, 'Derniers coups publiés')),
        recent.length ? h('div', { class: 'recent-list' }, recent.map((o) => {
          const b = xpBreakdown(doc, o);
          return h('button', { type: 'button', class: 'recent-item', onClick: () => ctx.openOp(o.id) },
            h('span', { class: 'recent-icon' }, o.icon || '•'),
            h('div', { class: 'recent-text' }, h('b', {}, o.title), h('span', { class: 'muted' }, `${fmtDay(o.dates.publishActual)} · ${o.owner || o.publishedBy?.login || '—'}`,
              b.onTime ? ' · à l’heure' : '', b.channels ? ` · ${o.channels.length} canaux` : '', b.results ? ' · vues 🚀' : '')),
            h('b', { class: 'xp-chip' }, `+${xpOf(doc, o)} XP`));
        })) : h('div', { class: 'empty' }, h('b', {}, 'Rien de publié'), 'Le premier coup publié rapporte ses XP ici.')),

      h('section', { class: 'panel glass rules' },
        h('div', { class: 'section-head' }, h('h3', {}, 'Comment on marque des points')),
        h('p', { class: 'hint' }, 'Un coup rapporte ses XP quand il passe en « Publié ». Tout est calculé automatiquement, rien à saisir.'),
        h('ul', { class: 'rules-list' },
          h('li', {}, h('b', {}, 'Format'), h('span', { class: 'rules-kinds' }, KINDS.map((k) => h('span', { class: 'chip' }, `${k.label} ${k.xp}`)))),
          h('li', {}, h('b', {}, 'Multicanal'), `+${XP_RULES.extraChannel} XP par canal en plus du premier`),
          h('li', {}, h('b', {}, 'À l’heure'), `+${XP_RULES.onTime} XP si publié au plus tard à la date prévue`),
          h('li', {}, h('b', {}, 'Résultats'), XP_RULES.results.map((r) => `+${r.xp} XP dès ${r.label}`).reverse().join(' · '), ' (saisis les vues sur la fiche)'),
          h('li', {}, h('b', {}, 'Série'), 'une semaine avec au moins une publication prolonge la série'),
          h('li', {}, h('b', {}, 'Objectif hebdo'), `${week.goal} publication${week.goal > 1 ? 's' : ''} par semaine`, ctx.canWrite() ? [' · ', h('button', { type: 'button', class: 'link-btn', onClick: () => ctx.openSettings('game') }, 'régler')] : null)))));
}

function tile(iconTxt, value, label, tone = '') {
  return h('div', { class: `season-tile ${tone}` }, h('span', { class: 'season-tile-icon' }, iconTxt), h('b', {}, value), h('span', {}, label));
}
