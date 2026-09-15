# context.md — metier-dofus

## C'est quoi

Outil web personnel pour **monter les 19 métiers de Dofus 3 en partant de zéro kama**
et **savoir quoi crafter** à chaque instant. Page statique (HTML + CSS + JS, aucun
framework, aucun serveur), publiée sur GitHub Pages :
https://kanycl.github.io/metier-dofus/

Dépôt : `KanyCl/metier-dofus` (public). **Il ne vit pas dans le dépôt `atelier`** —
il y est ignoré via `.gitignore`, même montage que `allemand` et `TymFit`.

## Pourquoi une page statique

Le projet a été démarré depuis un iPhone. Contrainte : rien à installer, rien à
compiler, tout doit tourner dans un navigateur. Les données de jeu viennent en
direct de l'API publique **DofusDB** (`api.dofusdb.fr`), les données personnelles
(prix, ventes, progression, notes) restent dans le `localStorage` du navigateur.

## Les huit onglets

| Onglet | Ce qu'il répond |
|---|---|
| ⚒️ Recettes & rentabilité | Ce craft mérite-t-il mes kamas ? *(onglet d'accueil)* |
| 🧮 Ma calculette | Ce craft précis est-il rentable ? Recette auto, prix à saisir |
| 🚀 Craft ou brisage | Je le vends ou je le brise ? Avec ou sans focus ? |
| 📈 Optimiser ma montée | Combien de crafts pour monter, avec quoi, pour combien ? |
| 🛠️ Mes métiers | Où j'en suis — **la source de vérité de tout l'outil** |
| 📋 Feuille de route | Dans quel ordre monter quoi, et avec quel capital |
| 🌾 Que récolter | À mon niveau, quelle ressource rapporte le plus d'XP |
| 🧭 La méthode | Pourquoi, les paliers, les synergies, la tier list |

L'onglet ouvert est mémorisé d'une visite à l'autre.

⚠️ **Trois onglets seulement sont affichés aujourd'hui** (🧮, 🚀 et 🛠️). Les cinq autres
sont intacts, juste masqués — voir `ONGLETS_VISIBLES` dans `app.js` et l'entrée du
15 septembre (3) plus bas.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la structure des huit onglets |
| `style.css` | l'apparence (palette Catppuccin Mocha) |
| `app.js` | toute la logique : API, calculs, affichage, sauvegardes |
| `feuille-route.js` | **données** : principes, phases, investissements passifs, synergies |
| `methode.js` | **données** : ratios, paliers par métier, tier list, socles du profit, événements |
| `recolte.js` | **données** : métiers de récolte, entrées à ignorer, tranches, pistes d'API |
| `xp.js` | **règles de calcul** de l'XP métier — fonctions pures, aucune dépendance |
| `brisage.js` | **règles de calcul** du brisage — fonctions pures, aucune dépendance |
| `test-xp.js` | contrôle de `xp.js` — `node test-xp.js`, ou `lancerTestsXp()` en console |

Règle de rangement : `app.js` ne contient aucune donnée de jeu, les fichiers de
données ne contiennent aucune logique. `xp.js` fait exception assumée : il porte
des **règles** (des formules), pas des données ni de l'affichage — il est isolé
précisément pour pouvoir être vérifié tout seul par `test-xp.js`.

## 30 août 2026 — intégration du guide DAIGO

Le projet reposait jusque-là sur une méthode reconstituée de mémoire. Il a été
recalé sur le guide **« 0 à 200 FULL MÉTIERS — GUIDE DOFUS 3 »** de DAIGO
(https://youtu.be/u2eHffxtrBw, 45 min). Ce qui a changé :

### Les deux ratios, qui manquaient complètement
L'outil ne calculait que `coût → prix de vente → profit`. Or, dans le guide,
**la marge seule ne veut rien dire**. Ajoutés :
- **marge journalière** = marge en kamas × ventes par jour → le potentiel brut ;
- **indice de profitabilité** = ventes par jour × marge en % → le rendement du capital.

La quantité vendue **sur 30 jours** se saisit sur chaque carte de recette
(`localStorage: dofus_ventes`), et deux tris ont été ajoutés.

**Marge % = profit ÷ prix de vente.** Vérifié en rejouant l'exemple chiffré du
guide (épée de boisaille : 10 490 ventes/30 j, craft 1 600, vente 2 700) →
349,7 ventes/jour, 40,7 % de marge, 384 633 k/jour, indice 14 246. Le guide
annonce 350, 40 %, 384 000 et ~13 400. ✅

⚠️ Sur son second exemple (huile de coude), l'auteur annonce 55 % de marge, ce
qui ne colle pas avec les prix qu'il donne lui-même (4 500 → 7 500, soit 40 %).
Sa conclusion tient quand même, et c'est elle qui compte : l'huile gagne en marge
journalière, l'épée gagne en indice de profitabilité.

### La feuille de route, refaite d'après la « run opti »
Elle passe de **4 à 7 phases**, avec les paliers de capital réels du guide :
0 → 0 → **30 000** → **200 000** → **1 000 000** → **5 000 000** → 10 000 000+.

Corrections notables par rapport à la version précédente :
- le départ se fait à **Incarnam** par le farm (Chasseur 10 + Mineur 10 en passant),
  pas à Astrub par la récolte — au niveau 1, un métier de récolte ne rapporte rien ;
- il manquait le palier des **30 000 kamas** (Alchimiste 20 → 30), qui est le tout
  premier achat du parcours et conditionne toute la chaîne de récolte ;
- **Mineur 40 était placé à 200 000 kamas ; c'est 1 000 000.** Sa montée coûte
  500 000 à 600 000 kamas de perte sèche assumée ;
- Façonneur (boucliers, trophées 50 puis 100) était totalement absent ;
- les métiers de FM se montent **un à la fois**, directement au 110, et on
  n'attaque le suivant qu'après avoir récupéré sa mise.

### Nouveau fichier `methode.js` et nouvel onglet 🧭
Il porte tout ce que le guide explique et que l'outil ne disait nulle part :
- les **paliers (power spikes)** de chaque métier, avec le niveau et la raison ;
- les **synergies chiffrées** (Alchimiste 30/95/135/175 → Bûcheron 40/100/140/180 ;
  Paysan ⇄ Alchimiste à 20-40 niveaux d'écart ; Alchimiste X → Pêcheur X+20) ;
- la **tier list** et ses quatre critères ;
- les **cinq socles du profit** — et surtout pourquoi le brisage est une *rente
  informationnelle* périssable là où la forgemagie est une *compétence* durable ;
- la **répartition des HDV** (50 / 30 / 15 / 5) et la règle 80 / 20 ;
- les **événements** qui bougent les prix (Almanax, mises à jour, réseaux sociaux,
  l'HDV lui-même) et la règle d'actualisation des prix (taxe 2 % / 1 %) ;
- les deux pièges : **coût d'opportunité** et **XP de craft dégressive**.

### Ce qui a été délibérément laissé de côté
- **La partie sponsorisée** (placement produit pour un autre jeu) : hors sujet.
- **Le placement complet de la tier list** : le guide n'en commente que quatre
  entrées à l'oral, le reste n'est qu'affiché à l'écran. Le fichier le dit
  explicitement (`TIERLIST_RESERVE`) plutôt que de combler au jugé.
- **Le 20ᵉ métier** : écarté par l'auteur, marché déréglé. Documenté comme tel.
- **Le transcript verbatim** n'est pas versionné : seule la méthode (les idées,
  les chiffres) est encodée, avec crédit et lien vers la source.

## Vérification

Pas de Node ni de Python sur le poste : les tests passent par **Chrome headless
piloté en CDP** (WebSocket depuis PowerShell). Le contrôle vérifie que les six
fichiers `.js` s'exécutent sans erreur, que les 7 phases / 27 étapes /
11 investissements / 8 métiers / 32 paliers / 6 couples / 4 tiers / 5 socles /
4 HDV / 4 événements sont bien rendus, que la bascule d'onglets fonctionne, et
que `calculerRatios` reproduit les chiffres du guide.

## Pistes non faites (à valider)

- Récupérer automatiquement les volumes de vente : **aucune API publique ne les
  expose**, ils se relèvent à la main dans l'HDV du jeu. C'est la limite dure de
  l'outil aujourd'hui.
- Un comparateur côte à côte de deux crafts sur les deux ratios.
- Un rappel Almanax du jour (offrande → ressources concernées).

## Rappel

Les niveaux et les montants sont des **repères de marché**, pas des règles du jeu :
ils dépendent du serveur et de la date. Le guide le dit lui-même — il ne donne
volontairement aucune « recette miracle », parce qu'une recette rentable partagée
cesse d'être rentable.

## 30 août 2026 — les niveaux de métiers pilotent l'outil

Jusqu'ici, le niveau de métier se ressaisissait dans chaque onglet et ne servait
qu'à filtrer les recettes. Il devient la **donnée centrale**.

### Nouvel onglet 🛠️ Mes métiers
Le niveau de chaque métier, saisi **une seule fois**
(`localStorage: dofus_niveaux_metiers`). Les autres onglets s'y abonnent :
Rentabilité pré-remplit son niveau, Récolte cale sa tranche, Optimisation en fait
le point de départ du plan. Corriger le niveau depuis Rentabilité mettra aussi la
fiche à jour : les deux onglets ne peuvent pas se contredire.

### Nouvel onglet 📈 Optimiser ma montée
Répond à « combien de crafts pour monter ce métier ? ». L'outil parcourt le métier
**niveau par niveau**, retient à chaque niveau la recette qui rapporte le plus
d'XP parmi celles réellement réalisables, regroupe les niveaux consécutifs qui
partagent la même recette, et produit :

- le plan **palier par palier** (« du niveau 48 au 55 : 13 × Amulette Dragodinde ») ;
- le **nombre total de crafts** et l'XP à gagner ;
- la **liste de courses** : tous les ingrédients et leurs quantités cumulées ;
- les **synergies** — quels ingrédients sont fabricables par mes autres métiers,
  lesquels demandent encore des niveaux, lesquels sont à acheter. C'est le
  chaînage des métiers de la méthode, appliqué à un parcours concret ;
- le **chiffrage** : coût des ingrédients, revente des objets craftés, **bilan
  net** et coût par niveau. Les prix se saisissent sur place et alimentent le
  carnet partagé avec l'onglet Rentabilité.

### Le moteur d'XP (`xp.js`)
Ankama ne publie aucune formule ; ces règles viennent des relevés de la communauté
et sont regroupées en haut du fichier pour rester ajustables :

| Règle | Valeur |
|---|---|
| Coût d'un niveau de métier | 20 × le niveau |
| XP d'un craft | dépend **du seul niveau de la recette** (table calibrée) |
| Pénalité d'écart de niveau | **elle n'existe pas** |
| Cases d'ingrédients | 2 au niv. 1, 3 au niv. 10, 4 au niv. 20, puis +1 tous les 20 |

Vérifié sur l'exemple de référence de la communauté (objet niveau 40 : 800 XP à
niveau égal, ~400 à 8 niveaux d'écart, 200 à 22). ✅

Conséquence sur l'onglet Rentabilité : « crafts de mon niveau » tient désormais
compte des **cases débloquées** — une recette 5 cases n'est plus annoncée comme
réalisable à un niveau qui n'en ouvre que 4. Un tri **XP par craft** a été ajouté,
et chaque carte affiche l'XP qu'elle rapporte à mon niveau.

### Au passage
- `echapper()` neutralise le HTML des noms venus de l'API avant tout `innerHTML` ;
- `recupererRecettesDuMetier()` est partagé par les deux onglets qui en ont besoin ;
- la bascule d'onglets est devenue générique (`data-vue`) au lieu d'énumérer
  chaque vue à la main — les nouveaux onglets n'ont rien demandé de plus ;
- ⚠️ les classes CSS du plan de montée sont préfixées `plan-` : `.palier` et
  `.palier-corps` étaient **déjà pris** par la frise de l'onglet Méthode.

### Vérification
Trois séries, passées dans Chromium :
`test-xp.js` (19 contrôles du moteur), les nouveaux onglets (23 contrôles : saisie
des niveaux, report sur les autres onglets, plan, synergies, chiffrage, partage du
carnet de prix, échappement HTML), et une **non-régression** des quatre onglets
d'origine (7 phases / 27 étapes / 11 investissements / 8 métiers / 6 couples /
5 socles, bascule des 6 onglets, zéro erreur JS).

## Le piège du cache (à connaître avant toute publication)

Symptôme observé le 30 août : sur iPhone, après une mise à jour, les nouveaux
onglets s'affichaient bien (donc `index.html` et `style.css` étaient à jour) mais
cliquer sur « Mes métiers » ouvrait une **page entièrement vide**. Le navigateur
avait rechargé le HTML tout en gardant l'**ancien `app.js`** en cache : l'ancien
code ne connaissait que quatre vues, il mettait l'onglet en surbrillance sans
jamais démasquer la section correspondante.

Rien à voir avec un bug de code — les fichiers déployés étaient corrects.

**La parade :** chaque `<script>` et le `<link>` du CSS portent un numéro de
version dans leur adresse (`app.js?v=2026-08-30b`). Une adresse différente est un
fichier différent pour le navigateur : la mise à jour est forcément téléchargée.

👉 **Changer ce numéro dans `index.html` à chaque publication.** C'est la seule
étape manuelle du projet. L'oublier ne casse rien tout de suite : ça fait juste
resservir l'ancienne version à ceux qui ont déjà visité le site.

## Les entrées qui ne sont pas des métiers

L'API renvoie parmi les métiers des entrées internes — **« Base »**,
**« Bestiologue »** — qui ne se montent pas et ne se choisissent pas.

L'outil les écartait autrefois de façon indirecte, en ne gardant que les métiers
possédant au moins une recette. C'était fragile : ça reposait sur une propriété
qui pouvait changer côté API, et ça ne protégeait que le menu des recettes — les
entrées réapparaissaient dans « Mes métiers », qui reçoit la liste complète.

Elles sont désormais nommées dans `METIERS_INEXISTANTS` (`recolte.js`) et
écartées **à la réception**, dans `chargerMetiers` : elles n'atteignent aucun
onglet. La comparaison ignore accents et casse, et porte sur le **nom entier** —
un « contient » risquerait d'emporter un vrai métier. Un niveau qui aurait été
saisi pour l'une d'elles est effacé du navigateur, sans quoi il y resterait sans
jamais pouvoir s'afficher ni s'effacer.

Si une autre entrée fantôme apparaît un jour, il suffit d'ajouter son nom à cette
liste.

## 30 août 2026 (soir) — le moteur d'XP refait sur mesures réelles

La première version de `xp.js` reposait sur une formule glanée sur les forums :
« crafter un objet à son niveau rapporte 20 × son niveau », plus une pénalité
décroissante selon l'écart de niveau. Elle donnait **27 crafts** là où DofusDB en
annonce **159** — un facteur six.

### Ce qui était juste
La table d'XP par niveau : 20 × L pour passer de L à L+1, soit 10·L·(L−1) cumulés.
DofusDB annonce 398 046 XP pour aller de 1 à 200, la formule en donne 398 000.

### Ce qui était faux
- **L'XP d'un craft ne vaut pas 20 × le niveau de l'objet** — elle vaut environ
  **4/3** de ce niveau, soit quinze fois moins.
- **La pénalité d'écart de niveau n'existe pas.** Un objet niveau 40 rapporte
  autant au métier niveau 40 qu'au métier niveau 200. Toute la complexité de
  l'ancienne courbe était de l'invention.
- **L'XP se reporte d'un niveau à l'autre.** L'ancien code arrondissait à chaque
  niveau, ce qui surestimait le total — et rendait deux des vingt mesures
  arithmétiquement impossibles à reproduire. On n'arrondit plus qu'une fois par
  palier.

### La source
Vingt relevés sur l'outil **XP Métier** de DofusDB (Chasseur, 1 → 200, planifié
par tranches de dix) : pour chaque tranche, la recette et le nombre de crafts
annoncé. De ces vingt points on déduit l'XP par craft de chaque niveau de recette.
C'est un **calibrage, pas une théorie** : la table `XP_PAR_CRAFT_MESUREE` porte les
valeurs, `test-xp.js` rejoue les vingt mesures. Aucune ne peut plus casser en
silence.

Entre deux points mesurés, interpolation linéaire ; au-delà du niveau 190, la
dernière pente est prolongée.

### Ce qui reste à vérifier
Le calibrage vient du **seul Chasseur**. Si l'XP par craft dépendait aussi du
métier ou du nombre de cases de la recette, les autres métiers dériveraient.
Un relevé sur un métier d'équipement (Bijoutier, Cordonnier…) le dirait — et
s'ajouterait à `test-xp.js`.

### Ce que les vingt mesures ne peuvent pas dire

L'XP d'un craft baisse-t-elle quand le métier dépasse le niveau de la recette ?
Les joueurs le rapportent, mais **ces relevés ne permettent pas de le mesurer** :
dans le plan de DofusDB, chaque recette sert sur les dix niveaux qui la suivent,
donc l'écart va toujours de 0 à 9. Une perte liée à cet écart agit identiquement
sur les vingt mesures — elle y est absorbée, invisible.

Une perte proportionnelle au *rapport* des niveaux, elle, est réfutée : au niveau 1
utilisé jusqu'au niveau 9 (9× son niveau), elle prédirait ~2 100 crafts là où la
mesure en donne 77.

**Conséquence.** La table ne donne pas « l'XP d'un craft » mais « l'XP moyenne d'un
craft sur les dix niveaux suivants ». Tant qu'on crafte près de son niveau — ce que
fait le plan, qui prend toujours la recette la plus haute réalisable — c'est la
bonne valeur, et les vingt mesures le confirment. Au-delà de dix niveaux d'écart,
la valeur renvoyée est un **majorant**, et l'interface le dit : « ≤ 130 XP / craft »
sur les cartes de recette, et une alerte sur les paliers concernés.

**Ce qui trancherait.** Un relevé où une même recette sert sur beaucoup plus de dix
niveaux — ou, plus simple, l'XP réellement gagnée en jeu sur un craft bas niveau à
haut niveau de métier. Une seule mesure de ce genre suffirait à calibrer la chute.

## 15 septembre 2026 — la frise des paliers sait où j'en suis

Dernière piste de la liste du 30 août : l'onglet 🧭 La méthode affichait les
paliers de chaque métier sans jamais dire lesquels étaient derrière moi. Il fallait
comparer de tête avec l'onglet « Mes métiers ».

Les paliers se cochent maintenant **tout seuls**. Aucune saisie en plus : le niveau
déjà enregistré dans 🛠️ Mes métiers suffit.

- Palier passé → ✅ et affichage estompé.
- Palier suivant → badge de niveau surligné et « plus que N niveaux ».
- Compteur dans l'en-tête du métier : `niveau 60 · 3/7 paliers`.
- Tous les paliers passés → « 🏁 Tous les paliers de ce métier sont derrière toi ».

Trois cas qui demandaient de l'attention :

1. **Deux paliers au même niveau** (Alchimiste 60 en a deux). Le « prochain » se
   repère par son *niveau*, pas par son objet — sinon un seul des deux serait
   signalé.
2. **Les entrées génériques.** « Métiers de craft d'équipement » et « Métiers de
   forgemagie » désignent une famille, pas un métier : elles n'ont pas de niveau
   et restent neutres. `niveauDuMetierNomme` renvoie `null` pour elles.
3. **L'ordre de démarrage.** `afficherMethode()` s'exécute avant la réponse de
   l'API : à ce moment la liste des métiers est vide et rien n'est coché. La frise
   est refaite dans `enregistrerMetiers()`, puis à chaque changement de niveau via
   `surChangementDeNiveau`.

### Vérification
12 contrôles sur les six cas ci-dessus, joués sur les vraies données de
`methode.js` dans Chrome headless (`--dump-dom`) : 12/12. La page complète se
charge ensuite sans erreur, les 8 blocs de métiers sont rendus.

## 15 septembre 2026 — l'onglet 🧮 Ma calculette

L'onglet Rentabilité ne sait chiffrer que ce que DofusDB lui donne. Il ne répond
donc pas à « j'ai ces prix sous les yeux, est-ce que ça vaut le coup ? » quand
l'objet n'est pas dans l'API, quand c'est un achat-revente, ou quand on veut
simplement vérifier un relevé fait en jeu. C'est l'objet du nouvel onglet :
**tout est saisi à la main, rien n'est déduit**.

### Deux blocs
1. **La calculette** — nom de l'objet, une ligne par ingrédient (quantité × prix
   unitaire, sous-total à droite), prix de vente, taxe HDV, et facultativement le
   volume vendu sur 30 jours. Le calcul se refait à chaque frappe ; aucun bouton
   à presser pour voir le résultat.
2. **Le tableau comparatif** — les crafts chiffrés, côte à côte, triables par
   bénéfice, marge, marge journalière ou indice. Modifiables et supprimables.

### La taxe HDV
Le calcul ne s'arrête plus à `vente − coût` : il passe par
`vente → taxe → ce que je touche vraiment → bénéfice`. Le taux est un **champ**
(2 % au départ), pas une constante : il dépend du mode de vente, et rien dans le
projet ne permet de l'affirmer pour tous les cas. Le mettre à 0 redonne
exactement le calcul de l'onglet Rentabilité — c'est d'ailleurs comme ça que les
tests rejouent l'exemple chiffré du guide.

### Le verdict
Trois états, avec un seuil assumé (`MARGE_CONFORTABLE = 15 %`) :
- bénéfice positif et marge ≥ 15 % → **✅ Rentable** ;
- bénéfice positif mais marge maigre → **⚠️ Rentable, mais de justesse** : un
  ingrédient qui monte ou un concurrent qui casse le prix efface le gain ;
- bénéfice nul ou négatif → **➖ tu rentres dans tes frais** / **❌ tu perds des kamas**.

Ce seuil est un repère de prudence, pas une règle du jeu. Il est nommé en haut du
bloc pour rester ajustable.

### Trois décisions de conception
1. **Carnet séparé** (`dofus_calculette`). Les crafts saisis ici n'ont aucun
   identifiant DofusDB : les ranger dans `dofus_prix` reviendrait à risquer
   d'écraser le prix d'un vrai objet.
2. **Mêmes formules que l'onglet Rentabilité** — marge % = bénéfice ÷ prix
   affiché, ventes/jour = ventes sur 30 j ÷ 30, marge journalière et indice
   identiques. Sans quoi deux crafts venus des deux onglets ne seraient pas
   comparables.
3. **Écoute par délégation.** Les lignes d'ingrédients et les lignes du tableau
   sont recréées en permanence : les écouteurs sont posés sur les conteneurs
   (`#calcLignes`, `#calcCorps`), jamais sur les champs eux-mêmes, qui
   disparaîtraient avec leur écouteur au premier ajout de ligne.

Et un piège d'interface : **on ne redessine pas les lignes pendant la frappe**,
seulement à l'ajout ou au retrait d'une ligne. Refaire le HTML à chaque touche
ferait perdre le curseur du champ en cours de saisie.

### Vérification
Chrome headless (`--dump-dom`), sur une copie d'`index.html` où sont injectés un
`localStorage` en mémoire (file:// le refuse) et un piège à erreurs JS.

- **51/51** sur la calculette : le calcul, la taxe, les saisies bancales (champ
  vide, texte, virgule décimale — aucun `NaN`), les quatre verdicts, la saisie
  dans la page, l'enregistrement, les quatre tris, modifier sans créer de
  doublon, supprimer, l'échappement d'un nom piégé (`<img onerror=…>`), le refus
  d'une fiche vide, et le fait qu'il reste toujours au moins une ligne.
- Parmi eux, **quatre contrôles rejouent l'exemple du guide DAIGO** (épée de
  boisaille) taxe à 0 : 40,7 % de marge, 349,7 ventes/jour, 384 633 k/jour,
  indice 14 246. Les mêmes chiffres que ceux vérifiés le 30 août.
- **Non-régression** : 0 erreur JS au chargement, `lancerTestsXp()` → 36/36, les
  six onglets d'origine basculent toujours, 7 phases / 8 blocs de paliers /
  5 socles toujours rendus.

Un détail à savoir si un test échoue sur deux textes qui *semblent* identiques :
`toLocaleString("fr-FR")` sépare les milliers par une **espace insécable fine**
(U+202F), pas par une espace ordinaire. Il faut normaliser avant de comparer.

## 15 septembre 2026 (suite) — la calculette va chercher les recettes du jeu

La première version de l'onglet 🧮 était 100 % manuelle : il fallait retaper le nom
de chaque ingrédient et sa quantité. Elle sait maintenant **chercher n'importe quel
craft du jeu et poser sa recette toute seule** ; il ne reste que les prix à saisir.

### Le chemin retenu, et pourquoi les autres ont été écartés

L'API DofusDB ne propose pas de « chercher une recette par nom » utilisable tel quel.
Quatre relevés au curl ont tranché :

1. **`/recipes?resultName.fr[$search]=…` marche mais est accent-sensible.**
   « Épée » → 33 résultats, « epee » → **0**. Inutilisable : personne ne tape les
   accents dans un champ de recherche, encore moins sur un téléphone.
2. **`$regex` est refusé** par le serveur (`Invalid query parameter $options`).
3. **`/items?slug.fr[$search]=…` est accent-insensible** — « epee » → 99 items — et
   accepte les **préfixes** (« bouf » → 259, « bouftou » → 149). C'est la bonne porte
   d'entrée : on cherche sur le slug, pas sur le nom.
4. **La recherche ne prend qu'UN mot.** « epee boisaille » → 0, « boisaille » → 8.
   L'outil envoie donc le **mot le plus long** de la saisie (le plus discriminant) et
   filtre les autres mots lui-même, sur le nom désaccentué.

### Le point qui décide de tout : `recipeSlots`

Savoir si un objet est craftable sans interroger `/recipes` pour chaque candidat était
indispensable : **la route `/recipes` renvoie ~15 Ko par recette et `$select` n'y change
rien** (le serveur ajoute d'office l'objet `result` complet). 50 recettes = 786 Ko.

Les items, eux, portent `recipeSlots`. Vérifié dans les deux sens sur un lot de 50 :
les 17 items à `recipeSlots > 0` ont tous une recette, les items à 0 n'en ont aucune.
Les ressources brutes (Bois de Frêne, Plume Chimérique) sont à 0, l'Épée de Boisaille
à 2 — son nombre d'ingrédients.

Conséquence : **une seule requête légère pour chercher** (`/items` avec `$select`,
15 Ko au lieu de 460 Ko), et **une seule requête lourde au clic**, pour la recette
réellement demandée.

⚠️ **`img` est un champ calculé à partir de `iconId`.** Si `iconId` n'est pas dans le
`$select`, l'API renvoie `.../items/undefined.png` sans prévenir. Les deux vont ensemble.

### Deux sortes de lignes d'ingrédient
- **Ligne venue du jeu** (elle porte l'`id` DofusDB) : nom et quantité sont affichés en
  texte, pas en champ — ce sont ceux de la recette officielle, les retoucher n'aurait
  pas de sens. Seul le **prix** se saisit. Liseré violet à gauche.
- **Ligne manuelle** (pas d'`id`) : tout reste modifiable, comme avant.

### Le carnet de prix redevient commun
Un craft venu du jeu a un identifiant : son prix de vente, son volume de ventes et le
prix de chacun de ses ingrédients **rejoignent `dofus_prix` / `dofus_ventes`**, le carnet
que lit l'onglet ⚒️ Recettes & rentabilité. Ils y sont relus au prochain chargement du
même craft. Une fiche tapée à la main n'a pas d'identifiant : elle ne peut donc **rien**
y écraser — c'était la raison du carnet séparé, elle tient toujours pour ce cas-là.

### Les courses de requêtes
Taper vite lance plusieurs recherches. Une réponse partie tôt peut revenir **après** une
plus récente et écraser ses résultats. Chaque recherche porte un numéro
(`calcNumeroRecherche`) ; seule la dernière a le droit d'écrire à l'écran. Un test le
vérifie en retardant volontairement une réponse de 700 ms.

### Vérification
- **34/34** sur la recherche, contre une **fausse API** calquée sur les réponses réelles
  relevées au curl : filtrage des ressources brutes, tri par niveau, accents, recherche
  multi-mots (un seul appel, le bon pivot), remplissage de la calculette, lignes
  verrouillées, partage du carnet dans les deux sens, fiche manuelle qui n'écrase rien,
  recette sans ingrédient, objet sans recette, temporisation de la frappe, réponse en
  retard ignorée, identité conservée dans le tableau comparatif.
- **Essai contre la vraie API** : « epee boisaille » → Épée de Boisaille, « gelano » →
  Gelano (niv 60), « amulette bouftou » → 2 résultats. Le Gelano s'ouvre avec ses
  8 gelées et leurs quantités réelles (50 / 50 / 50 / 20 / 2 / 2 / 2 / 2).
- **Non-régression** : 51/51 sur la calculette manuelle, `lancerTestsXp()` 36/36,
  0 erreur JS, les six onglets d'origine intacts.

### Piste non faite
`chargerObjets()` interroge `/items` **sans `$select`** : ~460 Ko par lot de 50 là où
15 Ko suffiraient. La fonction est partagée par trois onglets, la changer accélérerait
tout l'outil. Non fait ici pour ne pas mélanger avec cette feature.

## 15 septembre 2026 (3) — recentrage sur deux onglets, sauvegarde continue, « où ça sert »

### Cinq onglets mis de côté — sans rien supprimer
Seuls 🧮 Ma calculette et 🛠️ Mes métiers sont affichés. Les cinq autres **n'ont pas été
retirés** : leurs sections, leurs données et leur code tournent exactement comme avant,
seul leur bouton est masqué.

Tout tient dans une constante en haut de la section « LES ONGLETS » d'`app.js` :

```js
const ONGLETS_VISIBLES = ["calculette", "metiers"];
```

`brancherOnglets()` masque les boutons absents de cette liste, et `activerOnglet()` refuse
un onglet masqué en retombant sur le premier visible — sinon un `activerOnglet("plan")`
oublié quelque part afficherait une vue sans bouton pour en sortir. Le dernier onglet
mémorisé (`dofus_onglet`) passe par le même garde-fou : quelqu'un qui avait quitté l'outil
sur « Feuille de route » ne tombe pas sur une page morte.

**Pour en remettre un en service : ajouter son nom dans cette liste. Rien d'autre.**
La non-régression vérifie justement que les sept sections sont toujours construites.

### La fiche en cours est enregistrée au fil de la frappe
Jusqu'ici seuls le carnet de prix et le tableau comparatif survivaient à un rechargement :
une fiche à moitié remplie était perdue. Elle est maintenant écrite dans
`dofus_calc_brouillon` **depuis `rafraichirCalc()`** — le seul point de passage obligé de
toutes les modifications de la fiche. Le poser là garantit qu'aucune saisie ne peut
échapper à la sauvegarde ; le poser sur chaque écouteur aurait été une promesse à tenir
à chaque ajout futur.

`calcNormaliser()` remet d'aplomb ce qui est relu : une fiche d'une version antérieure,
sans `resultId` ou sans tableau de lignes, ne doit pas casser la page au démarrage.

### 🔗 « Où sert cet objet ? »
Répond à : *je note le prix d'une Potion de Souvenir — dans quels crafts entre-t-elle, et
lesquels valent le coup ?*

Un 🔗 au bout de chaque ligne d'ingrédient venue du jeu, plus un lien sous le nom de
l'objet fini (qui peut lui-même être l'ingrédient d'autre chose). Le panneau liste les
crafts concernés avec, pour chacun, son coût d'après le carnet, son prix de vente et le
bénéfice. Un clic ouvre ce craft dans la calculette.

**La route de l'API :** `/recipes?ingredientIds[$in][]=<id>`. Elle renvoie `resultName`
localisé, `resultLevel`, `ingredientIds` et `quantities` — tout ce qu'il faut pour chiffrer,
en **une seule requête**, sans aller chercher les noms ailleurs. Vérifié sur la Potion de
Souvenir (id 7652) : 8 recettes.

**Deux honnêtetés dans l'affichage**, parce qu'un chiffre faux est pire que pas de chiffre :
- un coût calculé alors que des prix d'ingrédients manquent au carnet est un **minimum** :
  il s'affiche en orange, précédé de `≥`, et le bénéfice est annoncé « au mieux » ;
- un craft dont le prix de vente est inconnu n'affiche **aucun bénéfice** (« prix de vente
  à renseigner ») et passe en bas de la liste, plutôt que d'exhiber une marge de −100 %.

Le tri est donc : d'abord ceux qu'on peut juger, puis les autres.

Même garde-fou de course que la recherche (`calcNumeroUsages`), et le panneau se referme
tout seul quand on change de fiche — il parlerait d'un objet qui n'est plus à l'écran.

### Vérification
- **59/59** sur la calculette, dont les nouveaux contrôles : 2 boutons visibles sur 7,
  les 7 sections toujours présentes, un onglet masqué inatteignable même en appelant
  `activerOnglet`, la fiche enregistrée à chaque frappe (nom, prix de vente, lignes), et
  `calcNormaliser` face à une fiche abîmée.
- **49/49** sur la recherche et « où ça sert » : les crafts listés, celui sans prix de
  vente relégué en bas, le coût repris du carnet, le `≥` sur un coût incomplet, le clic
  qui ouvre le craft, le panneau qui se referme, le 🔗 absent des lignes manuelles, un
  objet qui n'entre dans aucune recette.
- **Essai réel** sur la Potion de Souvenir : 8 crafts listés, Substrat de Fascine en tête
  (+41 400 k, 63,7 %), les cinq sans prix de vente relégués en bas.
- **Non-régression** : `lancerTestsXp()` 36/36, 0 erreur JS, 7 sections construites,
  7 phases / 8 blocs de paliers / 5 socles toujours rendus.

## 15 septembre 2026 (4) — la recherche cachait la moitié du jeu

**Symptôme :** « je ne trouve pas la Potion de Vieillesse ». L'objet existe pourtant
(id 17060, niveau 95, `recipeSlots` 2) et aurait dû passer tous les filtres.

### Trois défauts cumulés

1. **Une seule page de 50 objets.** `slug.fr[$search]=potion` correspond à **315 objets**.
   On n'en téléchargeait que les 50 premiers, dans l'ordre de l'API — et la Potion de
   Vieillesse n'y était pas. Aucun message : elle semblait ne pas exister.
2. **Le tri des craftables se faisait côté navigateur.** Sur ces 50 objets, la plupart
   étaient des ressources brutes écartées ensuite : on payait 50 objets pour en garder
   une poignée, et on ratait les crafts situés plus loin.
3. **La liste était coupée à 15 en silence.** Même en trouvant l'objet, il pouvait être
   tronqué sans que rien ne le signale.

Et un quatrième, plus discret : **le tri se faisait par niveau**. Sur une recherche
« potion », vingt potions de niveau 1 passaient devant celle de niveau 95.

### Ce qui a changé

- **`recipeSlots[$gt]=0` dans la requête.** Le serveur ne renvoie plus que des objets
  craftables : « potion » passe de 315 objets à **114 crafts**. Chaque objet téléchargé
  est désormais un candidat réel.
- **Pagination** jusqu'à 4 pages de 50 (`CALC_PAGES_MAX`), soit 200 crafts examinés. Les
  114 « potion » tiennent donc largement : on les voit tous.
- **Tri par pertinence** (`scorePertinence`) avant le niveau : nom exact (0), nom qui
  commence par la saisie (1), mots qui débutent les mots du nom (2) — « pot vieil » trouve
  « Potion de Vieillesse » —, simple présence ailleurs (3). Le découpage des mots est fait
  à la main plutôt qu'avec une expression régulière : la saisie peut contenir des
  caractères qui y auraient un sens (`(`, `*`…).
- **La liste dit ce qu'elle ne montre pas.** `chercherCraftsDuJeu` renvoie maintenant
  `{ total, examines, retenus, affiches }` au lieu d'un simple tableau, et l'affichage en
  tire : « **114 crafts** correspondent — voici les 25 plus proches de ce que tu as tapé.
  Ajoute un mot pour préciser. » Une liste complète n'affiche aucun avertissement.
- Plafond d'affichage porté de 15 à 25, la liste défilant dans sa boîte pour ne pas
  repousser la calculette hors de l'écran.

### Résultat mesuré sur la vraie API
| Saisie | total API | examinés | retenus | Potion de Vieillesse |
|---|---|---|---|---|
| `potion` | 114 | 114 | 114 | absente des 25, **mais annoncé** |
| `vieillesse` | 1 | 1 | 1 | position 1 |
| `potion de vieillesse` | 1 | 1 | 1 | position 1 |
| `pot vieil` | 2 | 2 | 1 | position 1 |

### La leçon
Le filtre était bon, la recherche était bonne — c'est la **fenêtre** qui était trop
petite, et surtout **muette**. Un résultat manquant sans explication se lit comme une
absence de l'objet : tout affichage tronqué doit dire qu'il l'est.

### Vérification
**65/65** sur la recherche et « où ça sert ». Les nouveaux contrôles reproduisent le bug
exact : une fausse API de 120 crafts « potion » avec celui qu'on cherche en 118ᵉ position.
Sont vérifiés : les 3 pages parcourues, les `$skip` successifs (0, 50, 100), le filtre
serveur bien présent dans l'URL, les 4 niveaux de pertinence, une saisie contenant un
caractère spécial, l'avertissement de troncature, et son absence quand tout est affiché.
Plus : 59/59 sur la calculette, `lancerTestsXp()` 36/36, 0 erreur JS.

## 15 septembre 2026 (5) — l'onglet 🚀 Craft ou brisage

Troisième onglet en service. Il part des niveaux de 🛠️ Mes métiers, liste tout ce
qui est fabricable, et met en regard : coût du craft (carnet), prix de vente
(carnet), **valeur de brisage** (runes × prix de mes runes), et le verdict —
vendre ou briser, avec ou sans focus.

Point de conception qui a décidé du reste : **le brisage ne dépend d'aucun prix
d'ingrédient.** Il ne tient qu'aux statistiques de l'objet et au prix des runes.
L'onglet est donc utile dès le premier jour, carnet vide ; la colonne « craft »
se remplit ensuite.

### Ce que la recherche a établi — et ce qu'elle a écarté

**La licence de l'API a changé.** `api.dofusdb.fr` sert désormais la
**LPNC-IA 1.0**. Deux clauses comptent : attribution obligatoire (déjà en place,
en README et en pied de page) et, clause 4.2, exclusion du champ de la licence
de tout projet produit « en majorité » par une IA, l'appréciation étant laissée
à la bonne foi de l'utilisateur. Signalé à l'auteur du projet ; décision la
sienne.

**Les poids : authentiques.** `effectPowerRate` sur `/effects` EST la table des
poids de brisage. Recoupée point par point avec celle de la communauté :
Vitalité 0,2 · Pods 0,25 · Initiative 0,1 · Force/Intel/Chance/Agilité 1 ·
Puissance 2 · Sagesse et Prospection 3 · Dommages 20 · Portée 51 · PM 90 · PA 100.
⚠️ Ce sont des **décimaux**, stockés en flottant 32 bits : la Vitalité revient en
`0.20000000298023224`. Arrondi à la réception — une lecture entière l'aurait
écrasée à 0, et la Vitalité est la stat la plus répandue du jeu. (Un premier
diagnostic a d'ailleurs conclu à tort qu'elle valait 0 : le `grep` coupait au
point décimal.)

**La correspondance rune ↔ caractéristique : lue, pas devinée.** Chaque rune est
un objet du jeu qui **porte l'`effectId`** de sa caractéristique. Rune Ga Pa →
111 (PA), Rune Ré Per Feu → 213 (% Résistance Feu). Aucune abréviation n'est
interprétée : « Ga », « Ré Per », « Pme » auraient toutes demandé de deviner.
Les paliers `Rune Pa X` / `Rune Ra X` sont écartés (ils se fusionnent, ne se
brisent pas), et une rune sans poids connu aussi.

**L'import des prix Dofocus : impossible, et on n'insiste pas.** Leur front
appelle `dofocus.fr/api/servers`, `/api/runes`, `/api/runes/{serveur}/prices` —
routes trouvées dans leur bundle. Toutes répondent **« Accès refusé. »** à une
requête extérieure, y compris avec un User-Agent de navigateur ordinaire. C'est
un contrôle d'accès délibéré de leur auteur : le contourner (usurper Origin ou
Referer) n'était pas envisageable. Aucun en-tête CORS non plus, donc un
navigateur serait bloqué de toute façon. → **Table de prix vide, saisie à la
main, enregistrée dans le navigateur.** Une rune sans prix est ignorée et les
totaux sont annoncés comme des minimums.

**Il n'existe pas de « taux de brisage par objet ».** Le coefficient est propre
au serveur et varie en permanence selon le volume brisé récemment (1 % à 4000 %).
C'est un réglage utilisateur, pas une donnée à récupérer. Dit explicitement dans
l'interface.

**La formule : sourcée, mais incertaine.** Retenue :
`poids de ligne = (valeur × poids de la rune × niveau × 0,015) + 1`, puis
`runes = poids × coefficient/100 ÷ poids de la rune`. Le focus suit la règle de
DoFocus : la caractéristique ciblée rend 100 %, les autres 50 %, et tout devient
de la rune ciblée. Un calculateur de référence mesure lui-même « un résultat faux
34 fois sur 200, erreur max 7 % ». Le projet s'étant déjà fait avoir par une
formule d'XP reconstituée de mémoire (fausse d'un facteur six), la règle tenue
ici est : formule **isolée dans `brisage.js`**, sources citées en tête,
incertitude affichée dans l'interface, et recalibrage prévu si un brisage réel
diverge.

### Trois autres choses réglées au passage
- **Un craft rangé dans le tableau suivait plus les prix.** Il gardait une photo
  du moment de l'enregistrement : corriger le prix d'un ingrédient ailleurs ne le
  mettait pas à jour. `craftAJour()` relit désormais le carnet pour toute ligne
  portant un identifiant DofusDB. Une fiche tapée à la main garde ses valeurs :
  elle n'a rien à relire.
- **Une icône** accompagne chaque craft du tableau comparatif (emoji neutre pour
  une fiche manuelle, qui n'en a pas).
- **Le référentiel de brisage est versionné** (`VERSION_REF_BRISAGE`) : changer
  sa forme suffit à ce que les navigateurs le retéléchargent seuls.

### Vérification
**222 contrôles**, tous au vert :
- **57** sur le brisage, dont 12 contre la **vraie API** (poids chargés, Vitalité
  qui garde sa décimale, Rune Fo et Rune Ga Pa trouvées, paliers Pa/Ra écartés,
  cache versionné) et 33 sur les formules pures : poids de ligne, conversion en
  runes avec la chance de rune supplémentaire, effet du coefficient, focus dans
  les deux sens, prix manquants signalés, choix du meilleur mode, jets min/moy/max.
- **70** sur la recherche et « où ça sert », dont les nouveaux sur `craftAJour`.
- **59** sur la calculette · `lancerTestsXp()` **36/36** · **0 erreur JS**.
- Essai réel : Bijoutier 60, coefficient 250 % — 30 runes listées, verdicts et
  focus calculés sur les vrais objets du jeu.

### Piste laissée ouverte
Le calcul charge les statistiques de tous les objets à portée (≈ 2,6 Ko par
objet). Sur un compte à 19 métiers montés, ça peut faire lourd. Si ça devient
gênant : ne charger les stats que des N premiers, ou filtrer par niveau minimum.

## 15 septembre 2026 (6) — le brisage recalé sur DoFocus

L'entrée précédente annonçait la formule de brisage comme « sourcée, mais
incertaine », avec recalibrage prévu. C'est fait — et elle était fausse.

### Comment on a eu la formule
L'API de DoFocus reste fermée (`/api/runes`, `/api/servers` : **403 « Accès
refusé. »**, vérifié à nouveau). On n'a pas cherché à la contourner. Mais leur
**front est public**, comme celui de n'importe quel site : `dofocus.fr` sert
`/assets/index-*.js`, et le calcul y est en clair. Relevé tel quel :

```js
Pe = (jet, W, L, V) => jet < 0 ? 3*jet/(200*V) + 1
                               : 3*jet*W*L/(200*V) + 1
runes sans focus = Pe × coefficient/100 / W
runes avec focus = [ Pe(cible) + ½·Σ Pe(autres) ] × coefficient/100 / W(cible)
```

`W` est le **poids d'une rune**, `V` sa **valeur**. Et 3/200 = 0,015, le facteur
que le projet portait déjà.

### L'erreur : on confondait deux poids
Une rune a deux nombres, pas un seul — le guide de DoFocus le dit noir sur blanc
(« une Rune Vi a un poids de 1, une Rune Ini a un poids de 1 mais une valeur
de 10 »). Nous n'en avions qu'un : `effectPowerRate`, le poids d'**un point**
de caractéristique.

Le poids de ligne, lui, était juste : comme `W = poids d'un point × V`, le
`/V` de la formule s'annule et on retrouve exactement
`jet × poids d'un point × niveau × 0,015 + 1`.

C'est la **conversion en runes** qui était fausse : on divisait par le poids d'un
point au lieu du poids d'une rune. On annonçait donc **V fois trop de runes** :

| Rune | Valeur | On annonçait |
|---|---|---|
| Vitalité | 5 | **×5 trop** |
| Initiative | 10 | ×10 trop |
| Pods | 10 | ×10 trop |
| les 27 autres | 1 | exact |

La vitalité étant présente sur à peu près tous les équipements du jeu, **presque
tous les objets étaient surévalués au brisage**. Les verdicts « brise plutôt que
vendre » sortis avant cette date sont à rejouer.

### La valeur d'une rune se lit, elle ne se devine pas
Elle est sur la rune elle-même : `possibleEffects[0].diceNum`. Les paliers le
confirment tout seuls (Pa = ×3, Ra = ×10) : Vi 5 → Pa Vi 15 → Ra Vi 50 ;
Ini 10 → Pa Ini 30 → Ra Ini 100.

Et le calcul recoupe **exactement** les deux seuls chiffres que DoFocus publie :
Rune Vi → 0,2 × 5 = **1** ✅, Rune Ini → 0,1 × 10 = **1** ✅. Deux sources
indépendantes qui tombent juste : c'est ce qui permet de dire que la
reconstruction tient.

### Les jets négatifs, qu'on ignorait complètement
Un objet peut porter un malus (« −3 PA »). DoFocus lui applique une branche à
part, qui **ignore le poids et le niveau**. Une caractéristique dont le minimum
est négatif ne produit aucune rune et ne peut pas être ciblée par un focus, mais
elle compte quand même dans le total d'un focus, à 50 % comme les autres.

Elle y pèse très peu (autour de 1, contre des dizaines pour une ligne normale),
et il faut un malus au-delà de **200·V/3** — environ −67 pour une rune de
valeur 1 — pour qu'elle devienne négative et tire vraiment le total vers le bas.
`brisage.js` sait maintenant le faire.

⚠️ **Mais ça ne se déclenche pas encore**, et c'est documenté dans le code :
DofusDB encode un malus comme un **effet distinct** (effet 168 = « −X PA », de
poids −50) que **porte aucune rune**. Nos lignes de malus sont donc écartées
avant d'atteindre la formule. Conséquence : nos totaux de focus restent
légèrement optimistes sur les objets à malus. Il ne manque que la correspondance
malus → rune, qu'on n'a pas voulu deviner.

### Ce qui a changé dans les fichiers
- `brisage.js` — `poidsDUneRune()` et `estMalus()` ajoutées ; `poidsDeLigne()`
  prend la valeur de la rune et gère les jets négatifs ; la conversion divise
  par le poids d'une rune. L'en-tête dit ce qui est sûr, ce qui ne l'est pas,
  et ce qui était faux.
- `app.js` — le référentiel stocke la valeur de chaque rune et le poids d'une
  rune (`VERSION_REF_BRISAGE` **2 → 3** : les navigateurs le retéléchargent
  seuls) ; `lignesDeBrisage()` transmet `valeurRune` et `jetMin` ; la grille des
  prix affiche le poids d'une rune, pas celui d'un point.
- `index.html` — l'encart d'honnêteté passe de trois certitudes à quatre, dit
  l'erreur et sa correction, et cite DoFocus comme source de la formule.
  Numéro de cache `2026-09-15e` → `2026-09-15f`.

### Vérification
**99 contrôles au vert**, dans Chrome headless (`--dump-dom`, ni Node ni Python
sur le poste). Le principe : la formule de DoFocus est **retranscrite telle
quelle dans le test**, et nos fonctions doivent lui rendre le même nombre, cas
par cas — poids de ligne, jets positifs et négatifs, nombre de runes, focus dans
les deux sens, coefficients de 1 % à 4000 %.

Sont vérifiés en plus : les 8 poids de rune réels, l'ampleur exacte du bug
corrigé (le rapport ancien/nouveau vaut bien 5, 10 et 1), deux cas chiffrés à la
main, les malus (exclusion, refus comme cible, seuil de bascule), les saisies
bancales (aucun `NaN`), l'arbitrage focus/sans focus et les runes sans prix.

À côté : les 6 fichiers `.js` se chargent sans erreur, `lancerTestsXp()`
**36/36**, **0 erreur JS**. Et le référentiel a été rejoué sur la **vraie API** :
30 runes de base, poids et valeurs conformes au tableau ci-dessus.

### Ce qui trancherait vraiment
Tout ceci aligne l'outil sur la **référence du domaine**, pas sur le jeu : ça ne
prouve pas la formule, ça supprime un écart connu. Un vrai brisage en jeu, noté
avec l'objet, son niveau, ses jets et le coefficient du moment, resterait la
seule mesure qui puisse départager — comme les vingt relevés qui ont sauvé le
moteur d'XP.
