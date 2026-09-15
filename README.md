# Futnow · Marketing

Dashboard d'équipe pour suivre tous les coups marketing Futnow (posts, vidéos, TikTok,
newsletter, partenariats, programme d'ambassadeurs, événements…) de l'idée à la publication.

Page statique hébergée sur GitHub Pages, données dans `data/marketing.json` versionnées
par Git : chaque modification faite depuis la page devient un commit au nom de la personne
connectée. Même architecture que `futnow-features-dashboard`.

## Ce que ça fait

- **Six vues** : **Tableau** kanban par étape (glisser-déposer), **Avancement** (plein
  écran, un coup à la fois, flèches ← → et touche `f`), **Liste** triable avec sélection
  multiple et colonne checklist x/x, **Calendrier** éditorial semaine par semaine,
  **Campagnes** (objectif + fenêtre qui regroupent des coups), **Journal**.
- **Pipeline** : Idée → Brief → Création → Validation → Programmé → Publié. Modulable dans
  les réglages (renommer, recolorer, réordonner, ajouter). Deux gardes :
  - entrer en **Validation** date automatiquement la validation ;
  - entrer en **Publié** exige un **dernier GO** (forçable, journalisé).
- **Canaux libres** (réglages → Canaux) : Instagram, TikTok, LinkedIn, YouTube, Newsletter,
  Ambassadeurs, App / Site, Terrain par défaut ; ajoute ce qui vous sert (Discord, affichage,
  podcast…).
- **Page par coup** (lien `#c=<id>` partageable) : jauge et pipeline, bouton « Passer en … »,
  canaux, format, priorité, campagne, responsable, **checklist** groupée par étape
  (checklist type brief → publié), brief, **validations** GO/KO avec retour, **résultats**
  (vues, likes, clics, inscriptions…), dates cible/réelles, frise, liens, historique.
- **Suivi** : jauge = position dans le pipeline + avancement dans l'étape ; checklist x/x
  visible sur les cartes, dans la Liste et dans les Campagnes ; retard en rouge dès qu'une
  date cible est dépassée.

## Écrire depuis la page

1. Être collaborateur du dépôt.
2. Créer un token avec accès complet au dépôt (lien pré-rempli, la case `repo` est cochée) :
   https://github.com/settings/tokens/new?scopes=repo&description=Futnow%20Marketing
   Alternative restrictive : token fine-grained limité à ce dépôt, Contents : *Read and write*.
3. Dans la page, « Connexion » → coller le token → Vérifier.

Le token reste dans le navigateur (localStorage). Sans token, la page est en lecture. Les
conflits d'écriture (deux personnes en même temps) sont résolus en rejouant les opérations
locales sur la version distante.

## Développement

```bash
npm test               # tests du modèle (node --test)
npm run test:coverage
npm run serve          # http://127.0.0.1:4173/?dev=1  (utilisateur simulé, rien n'est écrit)
                       # …&fail=1 : les écritures échouent, pour tester le bandeau d'alerte
npm run seed -- --force   # régénérer data/marketing.json avec le jeu de démo
npm run seed -- --force --empty   # repartir d'un document vide
```

Raccourcis : `n` nouveau coup · `/` recherche · `1`–`6` vues · `← →` coup suivant en
Avancement · `f` plein écran · `Échap` fermer / désélectionner.

## Mise en ligne

1. Créer le dépôt GitHub `dashsolo333/dashboard-marketing` et pousser `main`.
2. Settings → Pages → Source : branche `main`, dossier `/ (root)`.
3. La page lit et écrit `data/marketing.json` sur ce dépôt. Sur un autre nom de dépôt,
   l'owner/repo est déduit de l'URL GitHub Pages ; en local, voir `js/config.js`.

## Structure

```
index.html            coquille
styles/               tokens, base, composants, vues, marketing
js/model/             modèle pur (doc, stages, ops, channels, checklist, roadmap…) — testé
js/github.js          API GitHub Contents (lecture ETag, écriture avec sha)
js/store.js           état + file d'opérations optimistes + rejeu sur conflit
js/ui/                vues et composants (aucun innerHTML)
data/marketing.json   la base de données
```
