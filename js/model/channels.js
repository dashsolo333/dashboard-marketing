// Canaux : liste libre portée par le document (réseaux, newsletter,
// programme d'ambassadeurs, terrain… tout ce qu'on juge utile).
import { normalizeChannel } from './doc.js';

export function channelById(doc, id) {
  return doc.channels.find((c) => c.id === id) || null;
}

export function slugify(label) {
  return String(label).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
}

export function addChannel(doc, { label, icon = '•', color = '#8b8fa8' }) {
  const clean = String(label || '').trim();
  if (!clean) throw new Error('Le nom du canal est obligatoire.');
  const id = slugify(clean) || `c_${Math.random().toString(36).slice(2, 8)}`;
  if (channelById(doc, id)) throw new Error(`Le canal « ${clean} » existe déjà.`);
  return { ...doc, channels: [...doc.channels, normalizeChannel({ id, label: clean, icon, color })] };
}

export function renameChannel(doc, id, patch) {
  return { ...doc, channels: doc.channels.map((c) => (c.id === id ? normalizeChannel({ ...c, ...patch }) : c)) };
}

export function moveChannel(doc, id, to) {
  const from = doc.channels.findIndex((c) => c.id === id);
  if (from < 0) return doc;
  const channels = [...doc.channels];
  const [c] = channels.splice(from, 1);
  channels.splice(Math.max(0, Math.min(channels.length, to)), 0, c);
  return { ...doc, channels };
}

export function removeChannel(doc, id) {
  return {
    ...doc,
    channels: doc.channels.filter((c) => c.id !== id),
    ops: doc.ops.map((o) => (o.channels.includes(id) ? { ...o, channels: o.channels.filter((c) => c !== id) } : o)),
  };
}
