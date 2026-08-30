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

## Les six onglets

| Onglet | Ce qu'il répond |
|---|---|
| ⚒️ Recettes & rentabilité | Ce craft mérite-t-il mes kamas ? *(onglet d'accueil)* |
| 📈 Optimiser ma montée | Combien de crafts pour monter, avec quoi, pour combien ? |
| 🛠️ Mes métiers | Où j'en suis — **la source de vérité de tout l'outil** |
| 📋 Feuille de route | Dans quel ordre monter quoi, et avec quel capital |
| 🌾 Que récolter | À mon niveau, quelle ressource rapporte le plus d'XP |
| 🧭 La méthode | Pourquoi, les paliers, les synergies, la tier list |

L'onglet ouvert est mémorisé d'une visite à l'autre.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la structure des quatre onglets |
| `style.css` | l'apparence (palette Catppuccin Mocha) |
| `app.js` | toute la logique : API, calculs, affichage, sauvegardes |
| `feuille-route.js` | **données** : principes, phases, investissements passifs, synergies |
| `methode.js` | **données** : ratios, paliers par métier, tier list, socles du profit, événements |
| `recolte.js` | **données** : métiers de récolte, entrées à ignorer, tranches, pistes d'API |
| `xp.js` | **règles de calcul** de l'XP métier — fonctions pures, aucune dépendance |
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
- Cocher les paliers atteints métier par métier dans l'onglet Méthode.

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
| Craft d'un objet à son niveau | 20 × le niveau de l'objet (= un niveau gagné) |
| Pénalité d'écart | ~90 % à 1 niveau, 75 % à 3, 50 % à 8, 25 % à 22, 10 % à 55 |
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
