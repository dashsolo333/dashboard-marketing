// Campagnes : un objectif chiffré et une fenêtre qui regroupent des coups.
import { normalizeCampaign } from './doc.js';

export function campaignById(doc, id) {
  return doc.campaigns.find((c) => c.id === id) || null;
}

export function addCampaign(doc, { id, name, ...rest }) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Le nom de la campagne est obligatoire.');
  return { ...doc, campaigns: [...doc.campaigns, normalizeCampaign({ ...rest, id, name: clean })] };
}

export function updateCampaign(doc, id, patch) {
  if (patch.name !== undefined && !String(patch.name).trim()) throw new Error('Le nom de la campagne est obligatoire.');
  return { ...doc, campaigns: doc.campaigns.map((c) => (c.id === id ? normalizeCampaign({ ...c, ...patch }) : c)) };
}

export function removeCampaign(doc, id) {
  return {
    ...doc,
    campaigns: doc.campaigns.filter((c) => c.id !== id),
    ops: doc.ops.map((o) => (o.campaignId === id ? { ...o, campaignId: '' } : o)),
  };
}
