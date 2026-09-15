// Jeu de données de démo : une équipe marketing Futnow en pleine rentrée.
// Construit avec les vraies opérations du modèle, donc journal et dates cohérents.
import { emptyDoc } from './doc.js';
import { createOp, updateOp, moveOp, addReview, addChecklistItem, setChecklistStatus, setResults } from './ops.js';
import { applyTemplate } from './checklist.js';
import { addDays } from './roadmap.js';

const NADIR = { login: 'nadir', avatar: '' };
const LEA = { login: 'lea', avatar: '' };
const at = (day, h = 10) => `${day}T${String(h).padStart(2, '0')}:00:00.000Z`;

export function demoDoc({ today }) {
  const d0 = addDays(today, 0);
  const day = (n) => addDays(d0, n);
  let d = {
    ...emptyDoc(),
    campaigns: [
      { id: 'c_rentree', name: 'Rentrée 2026', icon: '🎒', goal: 'Remplir les créneaux du soir : +30 % de matchs en septembre', startAt: day(-14), endAt: day(30) },
      { id: 'c_ligues', name: 'Lancement Ligues v2', icon: '🏆', goal: '10 ligues créées la première semaine', startAt: day(10), endAt: day(45) },
    ],
  };

  const make = (id, opts, by = NADIR, when = day(-18)) => {
    d = createOp(d, { id, by, at: at(when), ...opts });
  };
  const move = (id, stage, when, by = NADIR, force = false) => { d = moveOp(d, id, stage, { by, at: at(when, 14), force }); };
  const ok = (id, when, notes = '', by = LEA) => { d = addReview(d, id, { id: `r_${id}_${when}`, verdict: 'ok', notes, by, at: at(when, 12) }); };
  const ko = (id, when, notes, by = LEA) => { d = addReview(d, id, { id: `r_${id}_${when}`, verdict: 'ko', notes, by, at: at(when, 12) }); };
  const dates = (id, patch, when = day(-17)) => { d = updateOp(d, id, { dates: patch }, { by: NADIR, at: at(when) }); };

  // Publiés
  make('o_reel_rentree', { title: 'Reel « la rentrée c’est le soir »', icon: '🎬', kind: 'video', channels: ['instagram', 'tiktok'], priority: 'p1', campaignId: 'c_rentree', owner: 'lea', description: 'Reel 20 s : ambiance d’un match du soir, montage rapide, CTA « rejoins un match avec ton code ».' }, LEA, day(-20));
  dates('o_reel_rentree', { reviewPlanned: day(-16), publishPlanned: day(-13) }, day(-20));
  move('o_reel_rentree', 'brief', day(-19), LEA); move('o_reel_rentree', 'create', day(-18), LEA); move('o_reel_rentree', 'review', day(-16), LEA);
  ok('o_reel_rentree', day(-15), 'Nickel, juste le logo à agrandir', NADIR);
  move('o_reel_rentree', 'scheduled', day(-15), LEA); move('o_reel_rentree', 'published', day(-13), LEA);
  d = setResults(d, 'o_reel_rentree', { views: 12400, likes: 830, comments: 41, shares: 96, clicks: 210 }, { by: LEA, at: at(day(-6)) });

  make('o_post_linkedin', { title: 'Post LinkedIn : chiffres de l’été', icon: '📊', kind: 'post', channels: ['linkedin'], priority: 'p2', campaignId: 'c_rentree', owner: 'nadir', description: '3 chiffres clés de l’été + ce qui arrive à la rentrée.' }, NADIR, day(-15));
  dates('o_post_linkedin', { publishPlanned: day(-8) }, day(-15));
  move('o_post_linkedin', 'brief', day(-14)); move('o_post_linkedin', 'create', day(-12)); move('o_post_linkedin', 'review', day(-10));
  ok('o_post_linkedin', day(-9), 'GO');
  move('o_post_linkedin', 'scheduled', day(-9)); move('o_post_linkedin', 'published', day(-8));
  d = setResults(d, 'o_post_linkedin', { views: 2300, likes: 64, comments: 9, shares: 7, clicks: 38 }, { by: NADIR, at: at(day(-2)) });

  make('o_story_sondage', { title: 'Story sondage : ton créneau préféré ?', icon: '🗳️', kind: 'story', channels: ['instagram'], priority: 'p3', campaignId: 'c_rentree', owner: 'lea' }, LEA, day(-9));
  dates('o_story_sondage', { publishPlanned: day(-6) }, day(-9));
  move('o_story_sondage', 'create', day(-8), LEA); move('o_story_sondage', 'review', day(-7), LEA);
  ok('o_story_sondage', day(-7), '', NADIR);
  move('o_story_sondage', 'published', day(-7), LEA);
  d = setResults(d, 'o_story_sondage', { views: 640, likes: 0, comments: 0, shares: 0, clicks: 0, signups: 0 }, { by: LEA, at: at(day(-5)) });

  make('o_tiktok_bestof', { title: 'TikTok best-of buts de la semaine', icon: '⚽', kind: 'video', channels: ['tiktok', 'instagram', 'youtube'], priority: 'p1', owner: 'lea', description: 'Format récurrent : les 5 plus beaux buts filmés par les caméras Futnow, musique tendance.' }, LEA, day(-8));
  dates('o_tiktok_bestof', { publishPlanned: day(-1) }, day(-8));
  move('o_tiktok_bestof', 'brief', day(-7), LEA); move('o_tiktok_bestof', 'create', day(-5), LEA); move('o_tiktok_bestof', 'review', day(-2), LEA);
  ko('o_tiktok_bestof', day(-2), 'Le 3e but est flou, à remplacer', NADIR);
  ok('o_tiktok_bestof', day(-1), 'Parfait maintenant', NADIR);
  move('o_tiktok_bestof', 'published', day(-1), LEA);

  // Programmé
  make('o_newsletter_1', { title: 'Newsletter #1 — « Ce qui change à la rentrée »', icon: '✉️', kind: 'article', channels: ['newsletter'], priority: 'p1', campaignId: 'c_rentree', owner: 'nadir', description: 'Première newsletter joueurs : nouveautés, replays, code promo centre partenaire.' }, NADIR, day(-6));
  dates('o_newsletter_1', { reviewPlanned: day(-1), publishPlanned: day(2) }, day(-6));
  move('o_newsletter_1', 'brief', day(-5)); move('o_newsletter_1', 'create', day(-4)); move('o_newsletter_1', 'review', day(-1));
  ok('o_newsletter_1', day(-1), 'Relu, deux coquilles corrigées');
  move('o_newsletter_1', 'scheduled', day(0));

  // Validation
  make('o_ambassadeurs', { title: 'Programme ambassadeurs : recruter 10 capitaines', icon: '🤝', kind: 'ambassador', channels: ['ambassadors', 'instagram', 'field'], priority: 'p0', campaignId: 'c_rentree', owner: 'nadir', description: 'Un capitaine par centre partenaire : il ramène ses équipes, on lui offre des matchs + un maillot. Kit : visuel, message DM, page d’inscription.' }, NADIR, day(-12));
  dates('o_ambassadeurs', { reviewPlanned: day(1), publishPlanned: day(6) }, day(-12));
  move('o_ambassadeurs', 'brief', day(-11)); move('o_ambassadeurs', 'create', day(-9)); move('o_ambassadeurs', 'review', day(-1));
  d = applyTemplate(d, 'o_ambassadeurs', { by: NADIR, at: at(day(-11)) });
  for (const [i, it] of d.ops.find((o) => o.id === 'o_ambassadeurs').items.entries()) {
    if (i < 7) d = setChecklistStatus(d, 'o_ambassadeurs', it.id, 'done', { by: i % 2 ? LEA : NADIR, at: at(day(-9 + i)) });
    else if (i === 7) d = setChecklistStatus(d, 'o_ambassadeurs', it.id, 'doing', { by: LEA, at: at(day(-1)) });
  }

  // Création
  make('o_video_ligues', { title: 'Vidéo teaser Ligues v2', icon: '🏆', kind: 'video', channels: ['instagram', 'tiktok', 'youtube', 'app'], priority: 'p0', campaignId: 'c_ligues', owner: 'lea', description: 'Teaser 30 s : classement en direct, calendrier, cérémonie du tirage. Sortie le jour du lancement.' }, LEA, day(-4));
  dates('o_video_ligues', { reviewPlanned: day(7), publishPlanned: day(12) }, day(-4));
  move('o_video_ligues', 'brief', day(-3), LEA); move('o_video_ligues', 'create', day(-1), LEA);
  d = addChecklistItem(d, 'o_video_ligues', { id: 'i_vl_1', text: 'Tournage au centre de Lyon', group: 'create', due: day(3), by: LEA, at: at(day(-1)) });
  d = addChecklistItem(d, 'o_video_ligues', { id: 'i_vl_2', text: 'Montage + sous-titres', group: 'create', due: day(6), by: LEA, at: at(day(-1)) });
  d = addChecklistItem(d, 'o_video_ligues', { id: 'i_vl_3', text: 'Musique libre de droits choisie', group: 'create', by: LEA, at: at(day(-1)) });
  d = setChecklistStatus(d, 'o_video_ligues', 'i_vl_3', 'done', { by: LEA, at: at(day(0)) });

  make('o_partenariat_centre', { title: 'Partenariat centre Five Marseille', icon: '🤝', kind: 'partnership', channels: ['linkedin', 'field'], priority: 'p1', owner: 'nadir', description: 'Annonce croisée avec le centre : affiche sur place + post LinkedIn commun.' }, NADIR, day(-10));
  dates('o_partenariat_centre', { publishPlanned: day(-2) }, day(-10));
  move('o_partenariat_centre', 'brief', day(-9)); move('o_partenariat_centre', 'create', day(-6));

  // Brief
  make('o_ugc_replays', { title: 'Campagne UGC : « ton plus beau replay »', icon: '📱', kind: 'campaign', channels: ['instagram', 'tiktok', 'app'], priority: 'p2', campaignId: 'c_ligues', description: 'Les joueurs partagent leur replay avec #FutnowReplay, on reposte les meilleurs. Dotation : un mois de matchs.' }, LEA, day(-2));
  dates('o_ugc_replays', { publishPlanned: day(20) }, day(-2));
  move('o_ugc_replays', 'brief', day(-1), LEA);

  make('o_event_tournoi', { title: 'Tournoi de lancement Ligues', icon: '🎉', kind: 'event', channels: ['field', 'instagram', 'ambassadors'], priority: 'p1', campaignId: 'c_ligues', description: 'Un tournoi d’un soir dans un centre partenaire pour lancer la saison des ligues.' }, NADIR, day(-1));
  dates('o_event_tournoi', { publishPlanned: day(25) }, day(-1));
  move('o_event_tournoi', 'brief', day(0));

  // Idées
  make('o_idea_podcast', { title: 'Mini-podcast « vestiaire » avec des joueurs', icon: '🎙️', kind: 'other', channels: ['youtube'], priority: 'p3', description: 'Idée : 10 min avec une équipe régulière, à tester une fois.' }, LEA, day(0));
  make('o_idea_maillot', { title: 'Maillot collector pour les ambassadeurs', icon: '👕', kind: 'other', channels: ['ambassadors'], priority: 'p2', description: 'À chiffrer : 50 maillots numérotés.' }, NADIR, day(0));

  return { ...d, updatedAt: at(day(0), 15) };
}
