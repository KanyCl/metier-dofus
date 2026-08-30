/* ============================================================
   Métier Dofus — Moteur d'XP métier
   ------------------------------------------------------------
   Tout le calcul « combien de crafts pour monter ? » vit ici,
   en fonctions PURES (elles ne touchent ni à la page, ni au
   réseau). C'est ce qui permet de les vérifier avec
   `test-xp.js`.

   ⚠️ Ce fichier a été REFAIT le 30 août 2026. La version
   précédente reposait sur une formule reprise de forums —
   « un craft à ton niveau rapporte 20 × ton niveau », plus une
   pénalité d'écart de niveau — et sous-estimait gravement :
   27 crafts annoncés là où il en fallait 159. Elle est
   remplacée par un calibrage sur des mesures réelles.
   ============================================================ */

/* ------------------------------------------------------------
   1) Le coût d'un niveau de métier
   ------------------------------------------------------------
   Passer du niveau L au niveau L+1 coûte 20 × L d'XP, ce qui
   donne 10 × L × (L−1) d'XP cumulée pour atteindre le niveau L.

   Vérifié : l'outil « XP Métier » de DofusDB annonce 398 046 XP
   pour aller de 1 à 200, la formule en donne 398 000 — 0,01 %
   d'écart. Cette partie-là était déjà juste.
   ------------------------------------------------------------ */
const XP_PAR_NIVEAU = 20;

// XP nécessaire pour passer du niveau L au niveau L+1.
function xpPourMonterDe(niveau) {
    return XP_PAR_NIVEAU * niveau;
}

// XP totale pour aller du niveau `depart` au niveau `cible`.
function xpTotaleEntre(depart, cible) {
    let total = 0;
    for (let n = depart; n < cible; n++) total += xpPourMonterDe(n);
    return total;
}


/* ------------------------------------------------------------
   2) Ce que rapporte un craft
   ------------------------------------------------------------
   ⚠️ CE QUE CETTE TABLE MESURE, EXACTEMENT.

   Dans les relevés de DofusDB, chaque recette est utilisée sur
   les DIX niveaux qui la suivent : l'écart entre le métier et la
   recette va toujours de 0 à 9, jamais plus. Une perte d'XP liée
   à cet écart agirait donc de la même façon sur les vingt
   mesures — elle y est ABSORBÉE, sans jamais se laisser voir.

   Autrement dit : ces valeurs ne sont pas « l'XP d'un craft »
   mais « l'XP MOYENNE d'un craft sur les dix niveaux suivants ».
   Tant qu'on crafte près de son niveau — ce que fait le plan de
   montée, qui prend toujours la recette la plus haute possible —
   c'est exactement la bonne valeur, et les vingt mesures le
   confirment.

   Au-delà de dix niveaux d'écart, en revanche, les joueurs
   rapportent que l'XP continue de fondre. Ces données-là ne
   permettent pas de mesurer cette chute : hors de ce domaine,
   la valeur renvoyée est donc un MAJORANT, pas une prévision.
   `ecartMesure()` dit si l'on est dans le domaine vérifié.

   La table ci-dessous est un CALIBRAGE, pas une théorie. Chaque
   valeur est déduite des quantités annoncées par l'outil
   « XP Métier » de DofusDB pour le Chasseur, niveau 1 → 200,
   planifié par tranches de dix niveaux. `test-xp.js` rejoue les
   vingt mesures d'origine : si une valeur bouge ici, le contrôle
   le dit aussitôt.

   L'allure approche 4/3 × le niveau de la recette, mais pas assez
   exactement pour s'y fier : ce sont les mesures qui font foi.
   ------------------------------------------------------------ */
const XP_PAR_CRAFT_MESUREE = [
    [  1,  11.765],   // Bouillon de Chair
    [ 10,  18.297],   // Boulette de Viande
    [ 20,  24.937],   // Beignet Astrubien
    [ 30,  37.809],   // Roulade de Carne
    [ 40,  51.003],   // Papillote au Citron
    [ 50,  63.930],   // Salade Sufokienne
    [ 60,  77.016],   // Friture Amaknéenne
    [ 70,  90.031],   // Parmentier à l'Oignon
    [ 80, 103.365],   // Terrine Bontarienne
    [ 90, 116.309],   // Pot-au-feu Goûteux
    [100, 129.413],   // Poêlée Paysanne
    [110, 141.797],   // Pemmican aux Haricots
    [120, 155.142],   // Grillade Brâkmarienne
    [130, 168.654],   // Marinade Sucrée-Salée
    [140, 181.193],   // Boudin Noir
    [150, 194.955],   // Daube aux Épices
    [160, 207.573],   // Mijoté Récréatif
    [170, 220.191],   // Filet Mignon
    [180, 234.288],   // Quenelle Tijan
    [190, 246.987]    // Andouillette de Gibier
];

/* Combien d'XP rapporte le craft d'une recette de ce niveau ?
   Entre deux points mesurés on interpole en ligne droite ; au-delà
   du dernier, on prolonge la pente des deux derniers. */
function xpParCraftDeLaRecette(niveauRecette) {
    const niv = Math.max(1, niveauRecette);
    const table = XP_PAR_CRAFT_MESUREE;

    // En dessous du premier point mesuré, on reste proportionnel.
    if (niv <= table[0][0]) return table[0][1] * (niv / table[0][0]);

    for (let i = 1; i < table.length; i++) {
        const [nivHaut, xpHaut] = table[i];
        if (niv <= nivHaut) {
            const [nivBas, xpBas] = table[i - 1];
            const part = (niv - nivBas) / (nivHaut - nivBas);
            return xpBas + (xpHaut - xpBas) * part;
        }
    }

    // Au-delà du dernier point mesuré : on prolonge la dernière pente.
    const [nivA, xpA] = table[table.length - 2];
    const [nivB, xpB] = table[table.length - 1];
    return xpB + (niv - nivB) * ((xpB - xpA) / (nivB - nivA));
}

/* Jusqu'à combien de niveaux d'écart les mesures font-elles foi ?
   Au-delà, l'XP annoncée est un majorant. */
const ECART_MESURE = 10;

// Suis-je dans le domaine où les mesures font foi ?
function ecartFiable(niveauObjet, niveauMetier) {
    return (niveauMetier - Math.max(1, niveauObjet)) <= ECART_MESURE;
}

/* L'XP que ce craft me rapporte, à MON niveau de métier. */
function xpParCraft(niveauObjet, niveauMetier) {
    const niv = Math.max(1, niveauObjet);
    if (niv > niveauMetier) return 0;   // pas encore craftable
    return xpParCraftDeLaRecette(niv);
}


/* ------------------------------------------------------------
   3) Le nombre de cases (ingrédients) débloquées
   ------------------------------------------------------------
   Niveau 1 → 2 cases, niveau 10 → 3, niveau 20 → 4, puis +1
   tous les 20 niveaux, jusqu'à 8 cases maximum. Une recette qui
   demande plus de cases que ça est impossible à réaliser.
   ------------------------------------------------------------ */
function casesMax(niveauMetier) {
    if (niveauMetier < 10) return 2;
    if (niveauMetier < 20) return 3;
    return Math.min(8, 4 + Math.floor((niveauMetier - 20) / 20));
}

// Puis-je réaliser cette recette au niveau où je suis ?
function craftPossible(recette, niveauMetier) {
    return recette.niveauObjet <= niveauMetier
        && recette.nbCases <= casesMax(niveauMetier);
}


/* ============================================================
   4) LE PLAN DE MONTÉE
   ------------------------------------------------------------
   Niveau par niveau, on retient la recette qui rapporte le plus
   d'XP parmi celles réalisables, et on compte les crafts. Comme
   l'XP ne dépend que du niveau de la recette, la meilleure est
   toujours la plus haute réalisable — et rester sur une recette
   basse n'a aucun intérêt.

   Les niveaux consécutifs qui partagent la même recette sont
   regroupés en paliers : c'est la feuille de route de montée.

   `recettes` : [{ id, nom, niveauObjet, nbCases, ingredients: [{id, qte}] }]
   ============================================================ */
function planDeMontee(recettes, niveauDepart, niveauCible) {
    const paliers = [];
    const ingredientsTotaux = {};   // { idIngredient: quantitéTotale }
    let totalCrafts = 0;
    let niveauxSansRecette = 0;

    for (let niv = niveauDepart; niv < niveauCible; niv++) {
        // La meilleure recette réalisable à CE niveau.
        let meilleure = null;
        let meilleureXp = 0;
        for (const r of recettes) {
            if (!craftPossible(r, niv)) continue;
            const gain = xpParCraft(r.niveauObjet, niv);
            if (gain > meilleureXp) { meilleureXp = gain; meilleure = r; }
        }

        // Aucune recette réalisable : rien à proposer pour ce niveau.
        if (!meilleure || meilleureXp <= 0) { niveauxSansRecette++; continue; }

        // Même recette que le palier précédent → on l'étend.
        const precedent = paliers[paliers.length - 1];
        if (precedent && precedent.recette.id === meilleure.id) {
            precedent.auNiveau = niv + 1;
            precedent.xpAGagner += xpPourMonterDe(niv);
            if (!ecartFiable(meilleure.niveauObjet, niv)) precedent.horsDomaine = true;
        } else {
            paliers.push({
                recette: meilleure,
                deNiveau: niv,
                auNiveau: niv + 1,
                xpAGagner: xpPourMonterDe(niv),
                xpParCraft: meilleureXp,
                // Vrai si, sur ce palier, on s'éloigne du domaine mesuré.
                horsDomaine: !ecartFiable(meilleure.niveauObjet, niv)
            });
        }
    }

    /* On ne compte les crafts qu'UNE FOIS par palier. L'XP en trop d'un
       craft n'est pas perdue : elle se reporte sur le niveau suivant.
       Arrondir à chaque niveau surestimait le total — et rendait deux des
       vingt mesures de DofusDB impossibles à reproduire. */
    for (const palier of paliers) {
        palier.crafts = Math.ceil(palier.xpAGagner / palier.xpParCraft);
        totalCrafts += palier.crafts;
        for (const ing of palier.recette.ingredients || []) {
            ingredientsTotaux[ing.id] =
                (ingredientsTotaux[ing.id] || 0) + ing.qte * palier.crafts;
        }
    }

    return {
        paliers,
        totalCrafts,
        ingredientsTotaux,
        niveauxSansRecette,
        xpTotale: xpTotaleEntre(niveauDepart, niveauCible)
    };
}


/* ------------------------------------------------------------
   Le classement « quoi crafter maintenant »
   ------------------------------------------------------------ */
function meilleursCraftsMaintenant(recettes, niveauMetier, combien) {
    return recettes
        .filter((r) => craftPossible(r, niveauMetier))
        .map((r) => ({ ...r, xp: xpParCraft(r.niveauObjet, niveauMetier) }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, combien || 5);
}


// Rend ces fonctions utilisables par le script de test (Node),
// sans rien changer dans le navigateur où tout est déjà global.
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        XP_PAR_NIVEAU, XP_PAR_CRAFT_MESUREE, ECART_MESURE, ecartFiable,
        xpPourMonterDe, xpTotaleEntre,
        xpParCraftDeLaRecette, xpParCraft, casesMax, craftPossible,
        planDeMontee, meilleursCraftsMaintenant
    };
}
