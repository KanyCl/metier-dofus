# ⚒️ Métier Dofus

Outil web pour **optimiser la montée de mes métiers Dofus** et **calculer leur rentabilité**.

👉 **Utiliser l'outil : https://kanycl.github.io/metier-dofus/**

Les recettes sont récupérées **en direct** depuis l'API publique de
[DofusDB](https://dofusdb.fr/) (`api.dofusdb.fr`) : rien n'est stocké en dur, tout est à jour.

## Ce qu'il fait

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
| `app.js` | le comportement (appels à l'API, calculs) |

> Projet d'apprentissage — non affilié à Ankama.
