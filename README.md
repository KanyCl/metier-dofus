# ⚒️ Métier Dofus

Outil web pour **monter ses 19 métiers Dofus en partant de zéro kama** et **savoir quoi
crafter** à chaque instant.

👉 **Utiliser l'outil : https://kanycl.github.io/metier-dofus/**

Les recettes sont récupérées **en direct** depuis l'API publique de
[DofusDB](https://dofusdb.fr/) (`api.dofusdb.fr`) : rien n'est stocké en dur, tout est à jour.

## Les huit onglets

L'onglet ouvert est mémorisé d'une visite à l'autre.

> ⚠️ **En ce moment, seuls trois onglets sont affichés** : 🧮 Ma calculette,
> 🚀 Craft ou brisage et 🛠️ Mes métiers.
> Les cinq autres ne sont pas supprimés — leurs sections et leur code sont intacts, seul
> leur bouton est masqué. Pour en remettre un en service, ajoute son nom dans
> `ONGLETS_VISIBLES`, en haut de la section « LES ONGLETS » d'`app.js`. C'est la seule
> ligne à changer.


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

### 🧮 Ma calculette
**Cherche un objet du jeu : sa recette se remplit toute seule.** Les ingrédients et leurs
quantités viennent de DofusDB et ne sont pas modifiables — il ne te reste que le **prix de
chaque ressource** à saisir. La recherche ignore accents et majuscules (« epee » trouve
« Épée ») et accepte plusieurs mots (« amulette bouftou »).

Un mot trop large ramène parfois des centaines de crafts : la liste affiche alors les
**25 plus proches de ce que tu as tapé** et **te dit combien il y en a en tout**, pour que
tu saches qu'il faut préciser. « potion » → 114 crafts ; « potion vieillesse » → celui que
tu cherches, en tête.

Tu peux aussi partir d'une fiche vide et tout taper à la main : un craft absent de l'API,
un achat-revente, ou simplement un prix relevé en jeu.

Le calcul se refait pendant que tu tapes et rend un verdict en clair : **rentable**,
**rentable de justesse** (moins de 15 % de marge — un ingrédient qui monte suffit à effacer
le bénéfice) ou **tu perds des kamas**. Le détail montre la chaîne complète :
coût → prix de vente → **taxe HDV** → ce que tu touches vraiment → bénéfice.

La taxe est réglable (2 % par défaut) : c'est une donnée de serveur et de mode de vente,
pas une constante du jeu. À 0 %, tu retrouves exactement le calcul de l'onglet Rentabilité.

Les prix saisis sur un craft venu du jeu rejoignent le **carnet commun** : ils s'affichent
aussi dans l'onglet Rentabilité, et reviennent tout seuls la prochaine fois. Une fiche tapée
à la main n'a pas d'identifiant et ne peut donc rien y écraser.

**Tout ce que tu tapes est enregistré au fil de la frappe** : la fiche en cours survit à
un rechargement de page, à un navigateur fermé, à un téléphone mis en veille. Rien à
sauvegarder à la main.

**🔗 Où sert cet objet ?** — le petit 🔗 au bout d'une ligne d'ingrédient (et le lien sous
le nom de l'objet) liste **tous les crafts qui consomment cette ressource**, avec pour
chacun son coût de craft et son prix de vente d'après ton carnet, et le bénéfice qui en
découle. Tu notes le prix d'une Potion de Souvenir, tu cliques, et tu vois d'un coup les
8 crafts où elle entre et lequel vaut le coup. Un coût calculé sur des prix encore
inconnus s'affiche en orange avec un « ≥ » : c'est un minimum, pas un coût. Clique sur un
craft pour l'ouvrir dans la calculette et compléter ce qui manque.

Chaque craft chiffré peut rejoindre le **tableau comparatif** du bas, qui les affiche côte à
côte et se trie par bénéfice, marge, marge journalière ou indice de profitabilité — les mêmes
formules que l'onglet Rentabilité, pour que les chiffres des deux onglets restent comparables.

### 🚀 Craft ou brisage
Part de tes niveaux saisis dans 🛠️ Mes métiers, liste **tout ce que tu peux fabriquer**,
et met trois chiffres côte à côte : ce que le craft **coûte**, ce qu'il se **vend**, et ce
qu'il vaut **brisé**. Plus un verdict : vendre, ou briser.

Le brisage ne dépend d'**aucun prix d'ingrédient** — seulement des statistiques de l'objet
et du prix de tes runes. Cette colonne est donc utile dès le premier jour, quand le carnet
de prix est encore vide.

**Avec ou sans focus ?** L'outil compare les deux et te dit laquelle gagne, et de combien.
Le focus concentre la production sur une caractéristique : celle-ci rend 100 %, les autres
50 %, et tout devient de la rune ciblée. Il gagne quand une rune vaut nettement plus cher
que les autres.

**Le prix de tes runes** se saisit une fois, dans le tableau de l'onglet, et reste dans ton
navigateur. Rien n'est pré-rempli : DoFocus ne laisse aucun autre outil lire ses prix, et un
chiffre inventé serait pire que pas de chiffre. Une rune sans prix est **ignorée** dans les
calculs, et l'outil annonce alors ses montants comme des minimums.

**Ce qui est sûr, ce qui ne l'est pas.** Les poids des caractéristiques viennent de l'API
DofusDB et recoupent la table connue de la communauté (Vitalité 0,2 · Pods 0,25 · Force 1 ·
Sagesse 3 · Portée 51 · PM 90 · PA 100). La correspondance rune ↔ caractéristique est lue
dans les données, jamais déduite des abréviations. **La formule, elle, est une estimation** :
Ankama ne la publie pas, et les calculateurs de la communauté annoncent eux-mêmes plusieurs
pour cent d'erreur. Utilise les montants pour *comparer* des objets entre eux, pas comme une
promesse.

Enfin, il n'existe pas de « taux de brisage par objet » : le **coefficient** est propre à ton
serveur et bouge en permanence selon le volume brisé (1 % à 4000 %). C'est un réglage en haut
de l'onglet, pas une donnée à récupérer.

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
| `index.html` | la structure des huit onglets |
| `style.css` | l'apparence |
| `app.js` | toute la logique : appels API, calculs, affichage, sauvegardes |
| `feuille-route.js` | **données** : principes, phases, investissements passifs, synergies |
| `methode.js` | **données** : ratios, paliers par métier, tier list, socles du profit, événements |
| `recolte.js` | **données** : métiers de récolte, tranches de niveau |
| `brisage.js` | **règles de calcul** du brisage — fonctions pures, aucune dépendance |

`app.js` ne contient aucune donnée de jeu ; les trois autres `.js` ne contiennent aucune logique.

> Projet d'apprentissage — non affilié à Ankama.

## Données et licence

Les données de jeu proviennent de l'API publique [DofusDB](https://dofusdb.fr/)
(`api.dofusdb.fr`).

> **Données issues de DofusDB. Utilisation soumise à la
> [LPNC-IA 1.0](https://api.dofusdb.fr/).**

La LPNC-IA 1.0 est une licence publique **non commerciale**. Ce projet est gratuit,
sans publicité ni monétisation d'aucune sorte.
Le texte complet est dans le fichier [LICENSE](LICENSE).
