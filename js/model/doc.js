// Document racine stocké dans data/marketing.json. Tout est immuable :
// chaque opération renvoie un nouveau document.
import { DEFAULT_STAGES, DEFAULT_GATES } from './stages.js';

export const DOC_VERSION = 2;
export const ACTIVITY_CAP = 500;

/** Canaux par défaut — éditables dans les réglages (le doc porte sa propre liste). */
export const DEFAULT_CHANNELS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#f472b6' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#22d3ee' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#4f8cff' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', color: '#f87171' },
  { id: 'blog', label: 'Blog Futnow', icon: '📝', color: '#f5c451' },
  { id: 'ambassadors', label: 'Ambassadeurs', icon: '🤝', color: '#b5f03a' },
  { id: 'app', label: 'App / Site', icon: '📱', color: '#a78bfa' },
  { id: 'field', label: 'Terrain', icon: '⚽', color: '#fb923c' },
];

/** Formats de coup. */
export const KINDS = [
  { id: 'post', label: 'Post' },
  { id: 'story', label: 'Story' },
  { id: 'video', label: 'Vidéo / Reel' },
  { id: 'article', label: 'Article / Blog' },
  { id: 'campaign', label: 'Campagne' },
  { id: 'partnership', label: 'Partenariat' },
  { id: 'event', label: 'Événement' },
  { id: 'ambassador', label: 'Ambassadeurs' },
  { id: 'other', label: 'Autre' },
];

/** Durée de travail estimée : valeur + unité (heures, jours, semaines). */
export const EFFORT_UNITS = [
  { id: 'h', short: 'h', label: 'heures', hours: 1 },
  { id: 'd', short: 'J', label: 'jours', hours: 8 },
  { id: 'w', short: 'S', label: 'semaines', hours: 40 },
];

export function normalizeEffort(e) {
  const value = Number(e?.value);
  const unit = EFFORT_UNITS.some((u) => u.id === e?.unit) ? e.unit : 'h';
  return { value: Number.isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null, unit };
}

/** « 3 h », « 2 J », « 1 S » ; '' si aucune estimation. */
export function formatEffort(e) {
  if (!e || e.value === null) return '';
  const u = EFFORT_UNITS.find((x) => x.id === e.unit) || EFFORT_UNITS[0];
  return `${String(e.value).replace('.', ',')} ${u.short}`;
}

/** Équivalent en heures, pour trier. */
export function effortHours(e) {
  if (!e || e.value === null) return 0;
  return e.value * (EFFORT_UNITS.find((x) => x.id === e.unit)?.hours || 1);
}

export const RESULT_FIELDS = [
  { id: 'views', label: 'Vues' },
  { id: 'likes', label: 'Likes' },
  { id: 'comments', label: 'Commentaires' },
  { id: 'shares', label: 'Partages' },
  { id: 'clicks', label: 'Clics' },
  { id: 'signups', label: 'Inscriptions' },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptyDoc() {
  return {
    version: DOC_VERSION,
    updatedAt: '',
    stages: DEFAULT_STAGES,
    gates: DEFAULT_GATES,
    channels: DEFAULT_CHANNELS,
    campaigns: [],
    ops: [],
    activity: [],
  };
}

/** Normalise un document lu depuis GitHub (anciens champs, valeurs manquantes). */
export function normalizeDoc(raw) {
  const base = emptyDoc();
  if (!raw || typeof raw !== 'object') return base;
  const channels = Array.isArray(raw.channels) && raw.channels.length ? raw.channels.map(normalizeChannel) : base.channels;
  const known = new Set(channels.map((c) => c.id));
  return {
    version: DOC_VERSION,
    updatedAt: raw.updatedAt || '',
    stages: Array.isArray(raw.stages) && raw.stages.length ? raw.stages : base.stages,
    gates: { finalStageId: raw.gates?.finalStageId || base.gates.finalStageId },
    channels,
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns.map(normalizeCampaign) : [],
    ops: Array.isArray(raw.ops) ? raw.ops.map((o) => normalizeOp(o, known)) : [],
    activity: Array.isArray(raw.activity) ? raw.activity : [],
  };
}

export function normalizeChannel(c) {
  return { id: String(c.id), label: c.label || c.id, icon: c.icon || '•', color: c.color || '#8b8fa8' };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0; };

export function normalizeCampaign(c) {
  return {
    id: String(c.id), name: c.name || 'Campagne', icon: c.icon || '', goal: c.goal || '',
    target: num(c.target), actual: num(c.actual), startAt: c.startAt || '', endAt: c.endAt || '',
  };
}

export function normalizeMetrics(m) {
  const out = {};
  for (const f of RESULT_FIELDS) out[f.id] = num(m?.[f.id]);
  return out;
}

/** Résultats par canal : { channels: { instagram: { views, … } }, notes }. */
export function normalizeResults(r, allowed = null) {
  const src = r && typeof r.channels === 'object' && r.channels ? r.channels : {};
  const channels = {};
  for (const [id, m] of Object.entries(src)) {
    if (allowed && !allowed.has(id)) continue;
    channels[id] = normalizeMetrics(m);
  }
  return { channels, notes: String(r?.notes || '') };
}

export function normalizeOp(o, knownChannels = null) {
  const channels = (Array.isArray(o.channels) ? o.channels.map(String) : []).filter((c) => !knownChannels || knownChannels.has(c));
  return {
    id: String(o.id),
    title: o.title || 'Sans titre',
    description: o.description || '',
    icon: o.icon || '',
    kind: KINDS.some((k) => k.id === o.kind) ? o.kind : 'other',
    channels,
    urgent: typeof o.urgent === 'boolean' ? o.urgent : ['p0', 'p1'].includes(o.priority),
    owner: o.owner || '',
    rubric: String(o.rubric || '').trim(),
    caption: o.caption || '',
    hashtags: String(o.hashtags || '').trim(),
    assetUrl: String(o.assetUrl || '').trim(),
    publishTime: TIME_RE.test(o.publishTime || '') ? o.publishTime : '',
    stageId: o.stageId || 'idea',
    campaignId: o.campaignId || '',
    links: Array.isArray(o.links) ? o.links : [],
    dates: { reviewPlanned: o.dates?.reviewPlanned || '', publishPlanned: o.dates?.publishPlanned || '', publishActual: o.dates?.publishActual || '' },
    reviews: Array.isArray(o.reviews) ? o.reviews : [],
    items: Array.isArray(o.items) ? o.items.map(normalizeItem) : [],
    results: normalizeResults(o.results, new Set(channels)),
    publishedBy: o.publishedBy || null,
    effort: normalizeEffort(o.effort),
    rank: Number.isFinite(o.rank) ? o.rank : null, // ordre manuel de la liste (null = jamais classé)
    createdAt: o.createdAt || '',
    createdBy: o.createdBy || null,
    updatedAt: o.updatedAt || o.createdAt || '',
    updatedBy: o.updatedBy || o.createdBy || null,
  };
}

function normalizeItem(i) {
  const status = ['todo', 'doing', 'blocked', 'done'].includes(i.status) ? i.status : (i.done ? 'done' : 'todo');
  return { group: '', due: '', note: '', doneAt: '', doneBy: null, ...i, status, done: status === 'done' };
}

export function pushActivity(doc, entry) {
  const activity = [...doc.activity, entry];
  const trimmed = activity.length > ACTIVITY_CAP ? activity.slice(activity.length - ACTIVITY_CAP) : activity;
  return { ...doc, activity: trimmed, updatedAt: entry.at || doc.updatedAt };
}

export function isoDay(iso) {
  return String(iso || '').slice(0, 10);
}

export function newId(prefix = 'o') {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

export function kindById(id) {
  return KINDS.find((k) => k.id === id) || KINDS.at(-1);
}
