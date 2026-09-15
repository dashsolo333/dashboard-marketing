# Futnow · Marketing

Dashboard d'équipe pour piloter tous les coups marketing Futnow (posts, vidéos, TikTok,
newsletter, partenariats, programme d'ambassadeurs, événements…) de l'idée à la publication.

Page statique hébergée sur GitHub Pages, données dans `data/marketing.json` versionnées
par Git : chaque modification faite depuis la page devient un commit au nom de la personne
connectée. Même architecture que `futnow-features-dashboard`.

## Ce que ça fait

- **Calendrier éditorial** (vue d'accueil) : un mois, une case par jour, chaque coup posé sur
  sa date de publication avec la couleur de ses canaux et son heure. Glisser une carte
  replanifie. Le « + » d'une case crée un coup déjà daté. À droite : les coups à planifier
  (sans date) et l'agenda de la semaine.
- **Tableau** kanban par étape (glisser-déposer), **Liste** triable avec checklist `x/x`,
  actions groupées (étape, campagne, urgence, suppression), **Campagnes**, **Canaux**,
  **Journal**.
- **Pipeline** Idée → Brief → Création → Validation → Programmé → Publié, modulable dans
  les réglages. Entrer en **Publié** exige un **GO** (forçable, journalisé) et date la
  publication automatiquement.
- **Canaux libres** (réglages → Canaux) : Instagram, TikTok, LinkedIn, YouTube, Newsletter,
  Ambassadeurs, App / Site, Terrain par défaut ; ajoute ce qui vous sert.
- **Fiche par coup** (lien `#c=<id>` partageable) : étape + checklist groupée par étape
  (checklist type brief → publié), **contenu** (légende, hashtags, lien du visuel), brief,
  **publication** (date + heure, raccourcis +1 j / +1 sem), **validation en un clic**
  (Valider / Refuser avec commentaire, qui et quand), **résultats par canal** (vues, likes,
  commentaires, partages, clics, inscriptions + total), liens, frise, historique.
  Rubrique (« Best-of du lundi »…), responsable, drapeau **Urgent**, bouton **Dupliquer**
  (copie prête pour la semaine suivante).
- **Campagnes** : objectif chiffré (cible / réalisé, barre), fenêtre, coups rattachés avec
  date et étape, résultats cumulés.
- **Canaux** : par canal, ce qui sort cette semaine, ce mois, dans les 30 jours, les coups
  sans date, le rythme des 8 dernières semaines et les prochaines sorties. Un canal sans
  rien de prévu ressort en orange.

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

Raccourcis : `n` nouveau coup · `/` recherche · `1`–`6` vues · `Échap` fermer / désélectionner.

## Mise en ligne

1. Créer le dépôt GitHub `dashsolo333/dashboard-marketing` et pousser `main`.
2. Settings → Pages → Source : branche `main`, dossier `/ (root)`.
3. La page lit et écrit `data/marketing.json` sur ce dépôt. Sur un autre nom de dépôt,
   l'owner/repo est déduit de l'URL GitHub Pages ; en local, voir `js/config.js`.

## Structure

```
index.html            coquille
styles/               tokens, base, composants, vues, marketing (calendrier, canaux, fiche)
js/model/             modèle pur (doc, stages, ops, channels, campaigns, checklist, calendar, stats) — testé
js/github.js          API GitHub Contents (lecture ETag, écriture avec sha)
js/store.js           état + file d'opérations optimistes + rejeu sur conflit
js/ui/                vues et composants (aucun innerHTML)
data/marketing.json   la base de données
```
