/* ============================================================
   Métier Dofus — Moteur d'XP métier
   ------------------------------------------------------------
   Tout le calcul « combien de crafts pour monter ? » vit ici,
   en fonctions PURES (elles ne touchent ni à la page, ni au
   réseau). C'est ce qui permet de les vérifier avec le petit
   script de test `test-xp.js`.

   ⚠️ Les règles ci-dessous sont celles observées et documentées
   par la communauté Dofus — Ankama ne publie pas de formule
   officielle. Elles sont volontairement regroupées en haut du
   fichier pour être faciles à corriger si tu constates un écart
   en jeu.
   ============================================================ */

/* ------------------------------------------------------------
   Règle 1 — Le coût d'un niveau de métier
   ------------------------------------------------------------
   Crafter un objet exactement de son niveau fait gagner un
   niveau d'un seul coup. Comme un tel craft rapporte
   20 × niveau, il faut donc 20 × niveau d'XP pour passer du
   niveau L au niveau L+1.
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
   Règle 2 — La pénalité d'écart de niveau
   ------------------------------------------------------------
   Plus l'objet crafté est bas par rapport à ton niveau de
   métier, moins il rapporte. Ces paliers sont ceux relevés par
   les joueurs ; entre deux paliers, on interpole en ligne
   droite.
   ------------------------------------------------------------ */
const PALIERS_PENALITE = [
    [0,   1.00],   // objet pile à mon niveau  → 100 % de l'XP
    [1,   0.90],
    [3,   0.75],
    [8,   0.50],   // 8 niveaux d'écart        → la moitié
    [22,  0.25],
    [55,  0.10],
    [110, 0.05]    // au-delà, l'XP devient négligeable
];

// Quelle part de l'XP reste-t-il pour un écart de `ecart` niveaux ?
function penalite(ecart) {
    if (ecart <= 0) return 1;                       // objet à mon niveau ou au-dessus
    const dernier = PALIERS_PENALITE[PALIERS_PENALITE.length - 1];
    if (ecart >= dernier[0]) return dernier[1];

    for (let i = 1; i < PALIERS_PENALITE.length; i++) {
        const [ecartHaut, valHaut] = PALIERS_PENALITE[i];
        if (ecart <= ecartHaut) {
            const [ecartBas, valBas] = PALIERS_PENALITE[i - 1];
            // Interpolation linéaire entre les deux paliers encadrants.
            const part = (ecart - ecartBas) / (ecartHaut - ecartBas);
            return valBas + (valHaut - valBas) * part;
        }
    }
    return dernier[1];
}


/* ------------------------------------------------------------
   Règle 3 — Le nombre de cases (ingrédients) débloquées
   ------------------------------------------------------------
   Niveau 1 → 2 cases, niveau 10 → 3, niveau 20 → 4,
   puis +1 toutes les 20 niveaux, jusqu'à 8 cases maximum.
   Une recette qui demande plus de cases que ça est
   tout simplement impossible à réaliser.
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


/* ------------------------------------------------------------
   Règle 4 — L'XP rapportée par un craft
   ------------------------------------------------------------
   Base : 20 × le niveau de l'OBJET (elle ne bouge pas quand tu
   montes). C'est la pénalité d'écart qui fait fondre le gain au
   fil des niveaux.
   ------------------------------------------------------------ */
function xpParCraft(niveauObjet, niveauMetier) {
    const niv = Math.max(1, niveauObjet);
    if (niv > niveauMetier) return 0;   // pas encore craftable
    return XP_PAR_NIVEAU * niv * penalite(niveauMetier - niv);
}


/* ============================================================
   LE PLAN DE MONTÉE
   ------------------------------------------------------------
   Niveau par niveau, on choisit la recette qui rapporte le plus
   d'XP parmi celles réalisables, et on compte les crafts. Comme
   la meilleure recette change au fil de la montée, on regroupe
   ensuite les niveaux consécutifs qui utilisent la même recette
   en « paliers » — c'est ça, la feuille de route de montée.

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

        // Aucune recette réalisable : on ne peut rien proposer pour ce niveau.
        if (!meilleure || meilleureXp <= 0) { niveauxSansRecette++; continue; }

        const crafts = Math.ceil(xpPourMonterDe(niv) / meilleureXp);
        totalCrafts += crafts;

        // On cumule les ingrédients à réunir.
        for (const ing of meilleure.ingredients || []) {
            ingredientsTotaux[ing.id] = (ingredientsTotaux[ing.id] || 0) + ing.qte * crafts;
        }

        // Regroupement : même recette que le palier précédent → on l'étend.
        const precedent = paliers[paliers.length - 1];
        if (precedent && precedent.recette.id === meilleure.id) {
            precedent.auNiveau = niv + 1;
            precedent.crafts += crafts;
        } else {
            paliers.push({
                recette: meilleure,
                deNiveau: niv,
                auNiveau: niv + 1,
                crafts: crafts,
                xpParCraft: meilleureXp
            });
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
// sans rien casser dans le navigateur où tout est déjà global.
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        XP_PAR_NIVEAU, xpPourMonterDe, xpTotaleEntre, penalite,
        casesMax, craftPossible, xpParCraft, planDeMontee,
        meilleursCraftsMaintenant
    };
}
