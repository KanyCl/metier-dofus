# ⚒️ Métier Dofus

Outil web pour **optimiser la montée de mes métiers Dofus** et **calculer leur rentabilité**.

👉 **Utiliser l'outil : https://kanycl.github.io/metier-dofus/**

Les recettes sont récupérées **en direct** depuis l'API publique de
[DofusDB](https://dofusdb.fr/) (`api.dofusdb.fr`) : rien n'est stocké en dur, tout est à jour.

## Ce qu'il fait

- **Feuille de route** — un parcours guidé pour monter ses métiers, organisé en phases
  débloquées par la **trésorerie** plutôt que par le niveau. Chaque étape indique l'action
  à mener, ce qu'elle débloque et pourquoi. Progression cochable et sauvegardée.
- **Principes de la méthode** — garder ~80 % du capital en mouvement, viser les paliers qui
  ouvrent un produit vendable en continu, diversifier les marchés, chaîner les métiers de récolte.
- **Investissements passifs** — les produits à garder en vente, débloqués au fil des étapes.

- **Recettes en direct** — choisis un métier, l'outil liste ses crafts (objet, niveau, ingrédients).
- **Rentabilité** — saisis le prix des ingrédients et le prix de vente : coût de craft, profit et marge
  sont calculés automatiquement. Les prix forment un « carnet » réutilisé partout.
- **Filtre par niveau** — par défaut, seuls les crafts **réalisables à mon niveau** sont affichés.
  Deux autres choix : « les meilleurs pour l'XP » (les plus proches de mon niveau) ou
  « tous les crafts du métier ».
- **Synergies entre métiers** — pour chaque ingrédient, vérifie s'il est lui-même craftable et par quel métier.
- **Suivi des bénéfices** — bouton « j'ai crafté » qui cumule le profit total et le nombre de crafts.
- **Section Huzounet** — lien vers [Huzounet.fr](https://huzounet.fr/) pour repérer les équipements
  populaires par tranche de niveau, avec une zone de notes.

Les prix saisis, les bénéfices et les notes sont enregistrés **dans le navigateur** (rien n'est envoyé sur Internet).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la structure de la page |
| `style.css` | l'apparence |
| `app.js` | le comportement (appels à l'API, calculs, feuille de route) |
| `feuille-route.js` | la méthode de progression (phases, principes, investissements) |

> Projet d'apprentissage — non affilié à Ankama.
