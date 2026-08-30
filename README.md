# ⚒️ Métier Dofus

Outil web pour **monter ses 19 métiers Dofus en partant de zéro kama** et **savoir quoi
crafter** à chaque instant.

👉 **Utiliser l'outil : https://kanycl.github.io/metier-dofus/**

Les recettes sont récupérées **en direct** depuis l'API publique de
[DofusDB](https://dofusdb.fr/) (`api.dofusdb.fr`) : rien n'est stocké en dur, tout est à jour.

## Les quatre onglets

### 📋 Feuille de route
Un parcours en **7 phases**, débloquées par la **trésorerie** plutôt que par le niveau :
0 → 30 000 → 200 000 → 1 000 000 → 5 000 000 → 10 000 000+ kamas. Chaque étape dit l'action
à mener, ce qu'elle débloque et pourquoi. Progression cochable et sauvegardée.

À côté : les **principes** de la méthode, la **chaîne des métiers de récolte**, et les
**investissements passifs** — les produits à garder en vente en permanence, qui se
débloquent au fil des étapes cochées.

### 🌾 Que récolter
Choisis un métier de récolte et ta tranche de niveau : les ressources sont classées de la
plus haute à la plus basse, la première étant celle qui rapporte le plus d'XP.

### ⚒️ Recettes & rentabilité
Choisis un métier, l'outil liste ses crafts. Saisis le prix des ingrédients et le prix de
vente — les prix forment un « carnet » réutilisé partout — et tu obtiens :

- **coût de craft, profit, marge en %** ;
- **marge journalière** = marge en kamas × ventes par jour → *le potentiel brut du craft* ;
- **indice de profitabilité** = ventes par jour × marge en % → *le rendement de ton capital*.

> **Ne juge jamais un craft sur sa marge seule.** Un objet à 80 % de marge qui part une fois
> par semaine perd contre un objet à 20 % qui part 50 fois par jour. Renseigne la quantité
> vendue en HDV **sur les 30 derniers jours** (l'outil divise par 30 : les dernières 24 h
> fluctuent trop pour servir de base).

Également : **filtre par niveau** (crafts réalisables / meilleurs pour l'XP / tous), **tris**
par marge journalière, indice, profit, coût ou niveau, **synergies** (pour chaque ingrédient,
est-il lui-même craftable, et par quel métier), **suivi des bénéfices** (« j'ai crafté »), et
une section **[Huzounet](https://huzounet.fr/)** pour repérer les équipements populaires par
tranche de niveau — utile pour choisir sa cible de forgemagie.

### 🧭 La méthode
Le « pourquoi » derrière tout le reste :

- les **paliers** de chaque métier — le niveau exact qui débloque un craft rentable, ou un
  craft qui ne vaut rien mais donne beaucoup d'XP pour presque rien ;
- les **synergies chiffrées** : Alchimiste 30 / 95 / 135 / 175 couvre le Bûcheron
  40 / 100 / 140 / 180 ; Paysan ⇄ Alchimiste à 20-40 niveaux d'écart ; Alchimiste X nourrit
  le Pêcheur X + 20 ;
- la **tier list** et ses quatre critères (accessibilité, facilité, rentabilité, synergie) ;
- **d'où vient le profit** : pourquoi le brisage est une *rente informationnelle* périssable,
  et la forgemagie une *compétence* durable ;
- **répartir son capital** : 80 % investi / 20 % liquide, et 50 / 30 / 15 / 5 entre les HDV ;
- **ce qui fait bouger les prix** : Almanax, mises à jour, réseaux sociaux, l'HDV lui-même ;
- les deux pièges : le **coût d'opportunité** et l'**XP de craft dégressive**.

## Source de la méthode

La feuille de route et l'onglet Méthode encodent le guide
**« 0 à 200 FULL MÉTIERS — GUIDE DOFUS 3 »** de [DAIGO](https://youtu.be/u2eHffxtrBw).

Les niveaux et les montants sont des **repères de marché**, pas des règles du jeu : ils
dépendent de ton serveur et de la date. Quand un point n'est pas explicité dans le guide,
c'est écrit noir sur blanc dans le code plutôt que comblé au jugé.

## Confidentialité

Les prix saisis, les volumes de vente, les bénéfices, la progression et les notes sont
enregistrés **dans ton navigateur** (`localStorage`). Rien n'est envoyé sur Internet, en
dehors des appels de lecture à l'API DofusDB.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la structure des quatre onglets |
| `style.css` | l'apparence |
| `app.js` | toute la logique : appels API, calculs, affichage, sauvegardes |
| `feuille-route.js` | **données** : principes, phases, investissements passifs, synergies |
| `methode.js` | **données** : ratios, paliers par métier, tier list, socles du profit, événements |
| `recolte.js` | **données** : métiers de récolte, tranches de niveau |

`app.js` ne contient aucune donnée de jeu ; les trois autres `.js` ne contiennent aucune logique.

> Projet d'apprentissage — non affilié à Ankama.
