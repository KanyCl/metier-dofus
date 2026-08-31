# ⚒️ Métier Dofus

Outil web pour **monter ses 19 métiers Dofus en partant de zéro kama** et **savoir quoi
crafter** à chaque instant.

👉 **Utiliser l'outil : https://kanycl.github.io/metier-dofus/**

Les recettes sont récupérées **en direct** depuis l'API publique de
[DofusDB](https://dofusdb.fr/) (`api.dofusdb.fr`) : rien n'est stocké en dur, tout est à jour.

## Les six onglets

L'onglet ouvert est mémorisé d'une visite à l'autre.

### 🛠️ Mes métiers
Le niveau de chacun de tes métiers, saisi **une seule fois**. C'est la source de vérité de
tout l'outil : les autres onglets viennent lire ces niveaux plutôt que de te les redemander.
Corriger un niveau depuis l'onglet Rentabilité met aussi la fiche à jour — les deux ne
peuvent pas se contredire.

### 📈 Optimiser ma montée
Répond à **« combien de crafts pour monter ce métier ? »**. L'outil parcourt le métier
niveau par niveau, retient à chaque niveau la recette qui rapporte le plus d'XP parmi
celles que tu peux **réellement** réaliser, et produit :

- le plan **palier par palier** — « du niveau 48 au 55 : 13 × Amulette Dragodinde » ;
- le **nombre total de crafts** et l'XP à gagner ;
- la **liste de courses** : tous les ingrédients et leurs quantités cumulées ;
- les **synergies** : quels ingrédients tu peux fabriquer toi-même avec tes autres métiers,
  lesquels demandent encore quelques niveaux, lesquels sont à acheter ;
- le **chiffrage** : coût des ingrédients, revente des objets craftés, **bilan net** et coût
  par niveau. Monter un métier n'est pas une dépense sèche — la revente peut tout financer.

**D'où viennent les chiffres d'XP.** Ankama ne publie pas de formule. Les chiffres de cet
outil ne sont donc pas déduits d'une théorie mais **calibrés sur des mesures** relevées sur
l'outil [XP Métier de DofusDB](https://dofusdb.fr/fr/tools/jobs-xp) : le Chasseur, du niveau
1 au niveau 200, planifié par tranches de dix.

| Règle | Valeur |
|---|---|
| Coût d'un niveau de métier | 20 × le niveau (soit 398 000 XP pour aller de 1 à 200) |
| XP d'un craft | dépend du **seul niveau de la recette** — table calibrée, ≈ 4/3 × ce niveau |
| Cases d'ingrédients débloquées | 2 au niv. 1, 3 au niv. 10, 4 au niv. 20, puis +1 tous les 20 |

`test-xp.js` **rejoue les vingt mesures d'origine** et les reproduit toutes exactement. Pour
les relancer : `node test-xp.js`, ou `lancerTestsXp()` dans la console du navigateur (F12) si
tu n'as pas Node.

> ⚠️ **Ce que ces mesures ne disent pas.** Dans le plan de DofusDB, chaque recette sert sur
> les dix niveaux qui la suivent : l'écart métier − recette va toujours de 0 à 9. Une perte
> d'XP liée à cet écart y est donc **absorbée**, invisible. Les valeurs de la table sont
> l'XP *moyenne* sur ces dix niveaux — la bonne valeur tant qu'on crafte près de son niveau,
> ce que fait le plan. Au-delà de dix niveaux d'écart, l'outil affiche « ≤ » : il annonce un
> majorant, pas une prévision.
>
> Le calibrage ne porte pour l'instant que sur le **Chasseur**.

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
