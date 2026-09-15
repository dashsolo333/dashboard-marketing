// Jeu de données de démo : une équipe marketing Futnow en pleine rentrée.
// Construit avec les vraies opérations du modèle, donc journal et dates cohérents.
import { emptyDoc } from './doc.js';
import { createOp, updateOp, moveOp, addReview, addChecklistItem, setChecklistStatus, setResults } from './ops.js';
import { applyTemplate } from './checklist.js';
import { addDays } from './calendar.js';

const NADIR = { login: 'nadir', avatar: '' };
const LEA = { login: 'lea', avatar: '' };
const at = (day, h = 10) => `${day}T${String(h).padStart(2, '0')}:00:00.000Z`;

export function demoDoc({ today }) {
  const day = (n) => addDays(today, n);
  let d = {
    ...emptyDoc(),
    campaigns: [
      { id: 'c_rentree', name: 'Rentrée 2026', icon: '🎒', goal: 'Matchs joués le soir en septembre', target: 400, actual: 265, startAt: day(-14), endAt: day(30) },
      { id: 'c_ligues', name: 'Lancement Ligues v2', icon: '🏆', goal: 'Ligues créées la première semaine', target: 10, actual: 0, startAt: day(10), endAt: day(45) },
    ],
  };

  const make = (id, opts, by = NADIR, when = day(-18)) => { d = createOp(d, { id, by, at: at(when), ...opts }); };
  const move = (id, stage, when, by = NADIR) => { d = moveOp(d, id, stage, { by, at: at(when, 14) }); };
  const go = (id, when, notes = '', by = LEA) => { d = addReview(d, id, { id: `r_${id}_${when}`, verdict: 'ok', notes, by, at: at(when, 12) }); };
  const ko = (id, when, notes, by = LEA) => { d = addReview(d, id, { id: `r_${id}_${when}`, verdict: 'ko', notes, by, at: at(when, 12) }); };
  const plan = (id, publishPlanned, publishTime = '', when = day(-17)) => { d = updateOp(d, id, { dates: { publishPlanned }, publishTime }, { by: NADIR, at: at(when) }); };
  const res = (id, channel, metrics, when) => { d = setResults(d, id, { channel, metrics }, { by: LEA, at: at(when) }); };

  // Publiés
  make('o_reel_rentree', { title: 'Reel « la rentrée c’est le soir »', icon: '🎬', kind: 'video', channels: ['instagram', 'tiktok'], urgent: false, campaignId: 'c_rentree', owner: 'lea', rubric: 'Ambiance', caption: 'La rentrée, c’est le soir. 20 h, 5 contre 5, caméras allumées. Rejoins un match avec ton code 👇', hashtags: '#futnow #five #foot', description: 'Reel 20 s : ambiance d’un match du soir, montage rapide, CTA « rejoins un match avec ton code ».' }, LEA, day(-20));
  plan('o_reel_rentree', day(-13), '18:30', day(-20));
  move('o_reel_rentree', 'brief', day(-19), LEA); move('o_reel_rentree', 'create', day(-18), LEA); move('o_reel_rentree', 'review', day(-16), LEA);
  go('o_reel_rentree', day(-15), 'Nickel, juste le logo à agrandir', NADIR);
  move('o_reel_rentree', 'scheduled', day(-15), LEA); move('o_reel_rentree', 'published', day(-13), LEA);
  res('o_reel_rentree', 'instagram', { views: 8400, likes: 610, comments: 32, shares: 71, clicks: 140 }, day(-6));
  res('o_reel_rentree', 'tiktok', { views: 4000, likes: 220, comments: 9, shares: 25, clicks: 70 }, day(-6));

  make('o_post_linkedin', { title: 'Post LinkedIn : chiffres de l’été', icon: '📊', kind: 'post', channels: ['linkedin'], campaignId: 'c_rentree', owner: 'nadir', caption: '3 chiffres de l’été chez Futnow : 1 240 matchs filmés, 9 800 replays vus, 14 centres partenaires. Et la rentrée arrive.', description: '3 chiffres clés de l’été + ce qui arrive à la rentrée.' }, NADIR, day(-15));
  plan('o_post_linkedin', day(-8), '09:00', day(-15));
  move('o_post_linkedin', 'brief', day(-14)); move('o_post_linkedin', 'create', day(-12)); move('o_post_linkedin', 'review', day(-10));
  go('o_post_linkedin', day(-9), 'GO');
  move('o_post_linkedin', 'scheduled', day(-9)); move('o_post_linkedin', 'published', day(-8));
  res('o_post_linkedin', 'linkedin', { views: 2300, likes: 64, comments: 9, shares: 7, clicks: 38 }, day(-2));

  make('o_story_sondage', { title: 'Story sondage : ton créneau préféré ?', icon: '🗳️', kind: 'story', channels: ['instagram'], campaignId: 'c_rentree', owner: 'lea', rubric: 'Sondage du jeudi', caption: 'Tu joues plutôt 19 h, 20 h ou 21 h ? Vote 👇' }, LEA, day(-9));
  plan('o_story_sondage', day(-6), '12:00', day(-9));
  move('o_story_sondage', 'create', day(-8), LEA); move('o_story_sondage', 'review', day(-7), LEA);
  go('o_story_sondage', day(-7), '', NADIR);
  move('o_story_sondage', 'published', day(-7), LEA);
  res('o_story_sondage', 'instagram', { views: 640, likes: 0, comments: 0, shares: 0, clicks: 0, signups: 0 }, day(-5));

  make('o_tiktok_bestof', { title: 'Best-of buts de la semaine #3', icon: '⚽', kind: 'video', channels: ['tiktok', 'instagram', 'youtube'], owner: 'lea', rubric: 'Best-of du lundi', caption: 'Les 5 plus beaux buts de la semaine, filmés par nos caméras. Le 4e est incroyable 🤯', hashtags: '#futnow #bestof #golazo', description: 'Format récurrent : les 5 plus beaux buts filmés par les caméras Futnow, musique tendance.' }, LEA, day(-8));
  plan('o_tiktok_bestof', day(-1), '18:00', day(-8));
  move('o_tiktok_bestof', 'brief', day(-7), LEA); move('o_tiktok_bestof', 'create', day(-5), LEA); move('o_tiktok_bestof', 'review', day(-2), LEA);
  ko('o_tiktok_bestof', day(-2), 'Le 3e but est flou, à remplacer', NADIR);
  go('o_tiktok_bestof', day(-1), 'Parfait maintenant', NADIR);
  move('o_tiktok_bestof', 'published', day(-1), LEA);
  res('o_tiktok_bestof', 'tiktok', { views: 3100, likes: 260, comments: 14, shares: 40 }, day(0));

  // Programmé
  make('o_newsletter_1', { title: 'Newsletter #1 — « Ce qui change à la rentrée »', icon: '✉️', kind: 'article', channels: ['newsletter'], urgent: true, campaignId: 'c_rentree', owner: 'nadir', rubric: 'Newsletter mensuelle', caption: 'Objet : Ce qui change à la rentrée ⚽', description: 'Première newsletter joueurs : nouveautés, replays, code promo centre partenaire.' }, NADIR, day(-6));
  plan('o_newsletter_1', day(2), '08:30', day(-6));
  move('o_newsletter_1', 'brief', day(-5)); move('o_newsletter_1', 'create', day(-4)); move('o_newsletter_1', 'review', day(-1));
  go('o_newsletter_1', day(-1), 'Relu, deux coquilles corrigées');
  move('o_newsletter_1', 'scheduled', day(0));

  // Validation
  make('o_ambassadeurs', { title: 'Programme ambassadeurs : recruter 10 capitaines', icon: '🤝', kind: 'ambassador', channels: ['ambassadors', 'instagram', 'field'], urgent: true, campaignId: 'c_rentree', owner: 'nadir', caption: 'Tu ramènes ton équipe, on t’offre tes matchs. Deviens capitaine Futnow de ton centre 👑', description: 'Un capitaine par centre partenaire : il ramène ses équipes, on lui offre des matchs + un maillot. Kit : visuel, message DM, page d’inscription.' }, NADIR, day(-12));
  plan('o_ambassadeurs', day(6), '19:00', day(-12));
  move('o_ambassadeurs', 'brief', day(-11)); move('o_ambassadeurs', 'create', day(-9)); move('o_ambassadeurs', 'review', day(-1));
  d = applyTemplate(d, 'o_ambassadeurs', { by: NADIR, at: at(day(-11)) });
  for (const [i, it] of d.ops.find((o) => o.id === 'o_ambassadeurs').items.entries()) {
    if (i < 7) d = setChecklistStatus(d, 'o_ambassadeurs', it.id, 'done', { by: i % 2 ? LEA : NADIR, at: at(day(-9 + i)) });
    else if (i === 7) d = setChecklistStatus(d, 'o_ambassadeurs', it.id, 'doing', { by: LEA, at: at(day(-1)) });
  }

  // Création
  make('o_video_ligues', { title: 'Vidéo teaser Ligues v2', icon: '🏆', kind: 'video', channels: ['instagram', 'tiktok', 'youtube', 'app'], urgent: true, campaignId: 'c_ligues', owner: 'lea', hashtags: '#futnow #ligues', description: 'Teaser 30 s : classement en direct, calendrier, cérémonie du tirage. Sortie le jour du lancement.' }, LEA, day(-4));
  plan('o_video_ligues', day(12), '18:00', day(-4));
  move('o_video_ligues', 'brief', day(-3), LEA); move('o_video_ligues', 'create', day(-1), LEA);
  d = addChecklistItem(d, 'o_video_ligues', { id: 'i_vl_1', text: 'Tournage au centre de Lyon', group: 'create', due: day(3), by: LEA, at: at(day(-1)) });
  d = addChecklistItem(d, 'o_video_ligues', { id: 'i_vl_2', text: 'Montage + sous-titres', group: 'create', due: day(6), by: LEA, at: at(day(-1)) });
  d = addChecklistItem(d, 'o_video_ligues', { id: 'i_vl_3', text: 'Musique libre de droits choisie', group: 'create', by: LEA, at: at(day(-1)) });
  d = setChecklistStatus(d, 'o_video_ligues', 'i_vl_3', 'done', { by: LEA, at: at(day(0)) });

  make('o_partenariat_centre', { title: 'Partenariat centre Five Marseille', icon: '🤝', kind: 'partnership', channels: ['linkedin', 'field'], owner: 'nadir', description: 'Annonce croisée avec le centre : affiche sur place + post LinkedIn commun.' }, NADIR, day(-10));
  plan('o_partenariat_centre', day(-2), '', day(-10));
  move('o_partenariat_centre', 'brief', day(-9)); move('o_partenariat_centre', 'create', day(-6));

  make('o_bestof_4', { title: 'Best-of buts de la semaine #4', icon: '⚽', kind: 'video', channels: ['tiktok', 'instagram', 'youtube'], owner: 'lea', rubric: 'Best-of du lundi', hashtags: '#futnow #bestof #golazo', description: 'Format récurrent : les 5 plus beaux buts filmés par les caméras Futnow.' }, LEA, day(0));
  plan('o_bestof_4', day(6), '18:00', day(0));
  move('o_bestof_4', 'brief', day(0), LEA); move('o_bestof_4', 'create', day(0), LEA);

  // Brief
  make('o_ugc_replays', { title: 'Campagne UGC : « ton plus beau replay »', icon: '📱', kind: 'campaign', channels: ['instagram', 'tiktok', 'app'], campaignId: 'c_ligues', description: 'Les joueurs partagent leur replay avec #FutnowReplay, on reposte les meilleurs. Dotation : un mois de matchs.' }, LEA, day(-2));
  plan('o_ugc_replays', day(20), '', day(-2));
  move('o_ugc_replays', 'brief', day(-1), LEA);

  make('o_event_tournoi', { title: 'Tournoi de lancement Ligues', icon: '🎉', kind: 'event', channels: ['field', 'instagram', 'ambassadors'], campaignId: 'c_ligues', description: 'Un tournoi d’un soir dans un centre partenaire pour lancer la saison des ligues.' }, NADIR, day(-1));
  plan('o_event_tournoi', day(25), '', day(-1));
  move('o_event_tournoi', 'brief', day(0));

  make('o_story_sondage_2', { title: 'Story sondage : ton poste préféré ?', icon: '🗳️', kind: 'story', channels: ['instagram'], owner: 'lea', rubric: 'Sondage du jeudi' }, LEA, day(0));
  plan('o_story_sondage_2', day(2), '12:00', day(0));
  move('o_story_sondage_2', 'brief', day(0), LEA);

  // Idées (sans date : à planifier)
  make('o_idea_podcast', { title: 'Mini-podcast « vestiaire » avec des joueurs', icon: '🎙️', kind: 'other', channels: ['youtube'], description: 'Idée : 10 min avec une équipe régulière, à tester une fois.' }, LEA, day(0));
  make('o_idea_maillot', { title: 'Maillot collector pour les ambassadeurs', icon: '👕', kind: 'other', channels: ['ambassadors'], description: 'À chiffrer : 50 maillots numérotés.' }, NADIR, day(0));

  return { ...d, updatedAt: at(day(0), 15) };
}
