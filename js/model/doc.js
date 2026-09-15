// Document racine stocké dans data/marketing.json. Tout est immuable :
// chaque opération renvoie un nouveau document.
import { DEFAULT_STAGES, DEFAULT_GATES } from './stages.js';

export const DOC_VERSION = 1;
export const ACTIVITY_CAP = 500;

/** Canaux par défaut — éditables dans les réglages (le doc porte sa propre liste). */
export const DEFAULT_CHANNELS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#f472b6' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#22d3ee' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#4f8cff' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', color: '#f87171' },
  { id: 'newsletter', label: 'Newsletter', icon: '✉️', color: '#f5c451' },
  { id: 'ambassadors', label: 'Ambassadeurs', icon: '🤝', color: '#b5f03a' },
  { id: 'app', label: 'App / Site', icon: '📱', color: '#a78bfa' },
  { id: 'field', label: 'Terrain', icon: '⚽', color: '#fb923c' },
];

/** Formats de coup. */
export const KINDS = [
  { id: 'post', label: 'Post' },
  { id: 'story', label: 'Story' },
  { id: 'video', label: 'Vidéo / Reel' },
  { id: 'article', label: 'Article / Newsletter' },
  { id: 'campaign', label: 'Campagne' },
  { id: 'partnership', label: 'Partenariat' },
  { id: 'event', label: 'Événement' },
  { id: 'ambassador', label: 'Ambassadeurs' },
  { id: 'other', label: 'Autre' },
];

export const PRIORITIES = [
  { id: 'p0', label: 'Critique' },
  { id: 'p1', label: 'Haute' },
  { id: 'p2', label: 'Normale' },
  { id: 'p3', label: 'Basse' },
];

export const RESULT_FIELDS = [
  { id: 'views', label: 'Vues' },
  { id: 'likes', label: 'Likes' },
  { id: 'comments', label: 'Commentaires' },
  { id: 'shares', label: 'Partages' },
  { id: 'clicks', label: 'Clics' },
  { id: 'signups', label: 'Inscriptions' },
];

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
    ...base,
    ...raw,
    stages: Array.isArray(raw.stages) && raw.stages.length ? raw.stages : base.stages,
    gates: { ...base.gates, ...(raw.gates || {}) },
    channels,
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns.map(normalizeCampaign) : [],
    ops: Array.isArray(raw.ops) ? raw.ops.map((o) => normalizeOp(o, known)) : [],
    activity: Array.isArray(raw.activity) ? raw.activity : [],
  };
}

export function normalizeChannel(c) {
  return { id: String(c.id), label: c.label || c.id, icon: c.icon || '•', color: c.color || '#8b8fa8' };
}

export function normalizeCampaign(c) {
  return { id: String(c.id), name: c.name || 'Campagne', icon: c.icon || '', goal: c.goal || '', startAt: c.startAt || '', endAt: c.endAt || '' };
}

export function normalizeResults(r) {
  const out = {};
  for (const f of RESULT_FIELDS) {
    const n = Number(r?.[f.id]);
    out[f.id] = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }
  return { ...out, notes: String(r?.notes || '') };
}

export function normalizeOp(o, knownChannels = null) {
  const channels = Array.isArray(o.channels) ? o.channels.map(String) : [];
  return {
    id: String(o.id),
    title: o.title || 'Sans titre',
    description: o.description || '',
    icon: o.icon || '',
    kind: KINDS.some((k) => k.id === o.kind) ? o.kind : 'other',
    channels: knownChannels ? channels.filter((c) => knownChannels.has(c)) : channels,
    priority: PRIORITIES.some((p) => p.id === o.priority) ? o.priority : 'p2',
    owner: o.owner || '',
    stageId: o.stageId || 'idea',
    stepProgress: Number.isFinite(o.stepProgress) ? o.stepProgress : 0,
    campaignId: o.campaignId || '',
    links: Array.isArray(o.links) ? o.links : [],
    dates: { reviewPlanned: '', reviewActual: '', publishPlanned: '', publishActual: '', ...(o.dates || {}) },
    reviews: Array.isArray(o.reviews) ? o.reviews : [],
    items: Array.isArray(o.items) ? o.items.map(normalizeItem) : [],
    results: normalizeResults(o.results),
    publishedBy: o.publishedBy || null,
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
