/* ============================================================
   RÈGLES DU BRISAGE — fonctions pures, aucune dépendance
   ------------------------------------------------------------
   Ce fichier ne contient ni données de jeu ni affichage : il porte
   les FORMULES. Même statut que `xp.js`, et pour la même raison —
   pouvoir être vérifié tout seul par des tests.

   ⚠️ CE QUI EST SÛR ET CE QUI NE L'EST PAS
   ----------------------------------------
   SÛR — les poids : ils viennent de l'API DofusDB (`effectPowerRate`
   sur /effects) et recoupent exactement la table connue de la
   communauté : Vitalité 0,2 · Pods 0,25 · Force/Intel/Chance/Agi 1 ·
   Puissance 2 · Sagesse et Prospection 3 · Portée 51 · PM 90 · PA 100.
   Ils ne sont donc PAS écrits en dur ici : `brisage.js` les reçoit.

   SÛR — la correspondance effet → rune : chaque rune est un objet du
   jeu qui porte l'`effectId` de la caractéristique qu'elle représente
   (Rune Ga Pa → 111 = PA, Rune Ré Per Feu → 213 = % Résistance Feu).
   Elle est lue dans les données, pas devinée à partir des noms.

   INCERTAIN — la formule elle-même. Ankama ne la publie pas. Celle
   retenue ici est celle des calculateurs de la communauté :

       poids de ligne = (valeur × poids de la rune × niveau × 0,015) + 1
       nombre de runes = poids de ligne × (coefficient / 100) ÷ poids de la rune

   Un des calculateurs de référence mesure lui-même « un résultat faux
   34 fois sur 200, avec une erreur max de 7 % ». C'est donc une
   ESTIMATION, et l'interface doit le dire. Le projet s'est déjà fait
   avoir une fois avec une formule d'XP reconstituée de mémoire, fausse
   d'un facteur six : la règle est d'annoncer l'incertitude, pas de la
   cacher derrière un chiffre net.

   INCERTAIN AUSSI — le coefficient de brisage. Il n'existe AUCUN
   « taux par objet » à récupérer : le coefficient est propre au serveur
   et bouge en permanence selon le volume brisé (1 % à 4000 %). C'est un
   réglage que l'utilisateur saisit, pas une donnée.

   Sources : calculateur ouvert KamelAkar/Calculateur_Brisage_Dofus,
   guide DoFocus, forums officiels Dofus.
   ============================================================ */

// Constante de la formule. Isolée pour rester ajustable si un relevé
// en jeu montrait qu'elle dérive.
const BRISAGE_FACTEUR = 0.015;

/* Part du poids conservée par les lignes NON ciblées quand on brise
   avec un focus. Le focus concentre tout sur une caractéristique :
   celle-ci rend 100 %, les autres ne contribuent que pour moitié —
   mais leur contribution devient de la rune ciblée. */
const BRISAGE_PART_HORS_FOCUS = 0.5;

/* Le poids d'une ligne de statistique.
   `valeur` est le jet retenu (minimum, moyen ou maximum), `poidsRune`
   le poids de la caractéristique, `niveau` celui de l'objet brisé. */
function poidsDeLigne(valeur, poidsRune, niveau) {
    if (!(valeur > 0) || !(poidsRune > 0) || !(niveau > 0)) return 0;
    return (valeur * poidsRune * niveau * BRISAGE_FACTEUR) + 1;
}

/* Convertit un poids en runes. La partie décimale n'est pas perdue :
   dans le jeu, elle donne la CHANCE d'obtenir une rune de plus. On la
   renvoie séparément plutôt que d'arrondir — arrondir à chaque ligne
   biaiserait le total, l'erreur commise autrefois sur l'XP. */
function poidsEnRunes(poids, poidsRune) {
    if (!(poids > 0) || !(poidsRune > 0)) return { entier: 0, chance: 0, exact: 0 };
    const exact = poids / poidsRune;
    const entier = Math.floor(exact);
    return { entier, chance: exact - entier, exact };
}

/* Brisage SANS focus : chaque ligne donne ses propres runes.
   `lignes` : [{ effectId, valeur, poidsRune }]
   `coefficient` : celui du serveur, en pourcentage (100 = neutre). */
function brisageSansFocus(lignes, coefficient) {
    const part = (coefficient || 0) / 100;
    return (lignes || [])
        .map((l) => {
            const poids = poidsDeLigne(l.valeur, l.poidsRune, l.niveau) * part;
            return { effectId: l.effectId, poidsRune: l.poidsRune, ...poidsEnRunes(poids, l.poidsRune) };
        })
        .filter((r) => r.exact > 0);
}

/* Brisage AVEC focus sur une caractéristique : la ligne ciblée compte
   pour 100 %, les autres pour 50 %, et TOUT devient de la rune ciblée. */
function brisageAvecFocus(lignes, effectIdCible, coefficient) {
    const part = (coefficient || 0) / 100;
    const cible = (lignes || []).find((l) => l.effectId === effectIdCible);
    if (!cible) return null;

    let poids = 0;
    for (const l of lignes) {
        const p = poidsDeLigne(l.valeur, l.poidsRune, l.niveau);
        poids += (l.effectId === effectIdCible) ? p : p * BRISAGE_PART_HORS_FOCUS;
    }
    poids *= part;

    return {
        effectId: effectIdCible,
        poidsRune: cible.poidsRune,
        ...poidsEnRunes(poids, cible.poidsRune)
    };
}

/* Ce que rapporte une liste de runes, d'après les prix saisis.
   `prixParEffet` : { effectId: prix unitaire de la rune }.
   On compte la chance de rune supplémentaire comme une fraction de
   rune : sur beaucoup de brisages, c'est ce qu'elle vaut en moyenne.
   `inconnues` liste les runes dont on ignore le prix — sans ça, un
   total amputé passerait pour un total. */
function valeurDesRunes(runes, prixParEffet) {
    let total = 0;
    const inconnues = [];
    for (const r of runes || []) {
        const prix = (prixParEffet || {})[r.effectId] || 0;
        if (!prix) { inconnues.push(r.effectId); continue; }
        total += r.exact * prix;
    }
    return { total, inconnues };
}

/* Compare le brisage sans focus et le meilleur focus possible, et dit
   lequel gagne. C'est LA question pratique : « je brise avec ou sans
   focus ? »

   Renvoie { sansFocus, focus, meilleur, gainDuFocus } où `focus` est la
   meilleure option ciblée (ou null), et `gainDuFocus` l'écart en kamas.
   Si un prix de rune manque, l'option concernée est rendue quand même,
   mais ses `inconnues` sont remplies : l'appelant doit le dire. */
function meilleurBrisage(lignes, prixParEffet, coefficient) {
    const runesSans = brisageSansFocus(lignes, coefficient);
    const sansFocus = { mode: "sans", runes: runesSans, ...valeurDesRunes(runesSans, prixParEffet) };

    let focus = null;
    for (const l of lignes || []) {
        const r = brisageAvecFocus(lignes, l.effectId, coefficient);
        if (!r) continue;
        const v = valeurDesRunes([r], prixParEffet);
        /* Un focus dont on ignore le prix de la rune ne peut pas être
           comparé : on ne le retient pas plutôt que de lui donner 0. */
        if (v.inconnues.length) continue;
        const candidat = { mode: "focus", effectId: l.effectId, runes: [r], ...v };
        if (!focus || candidat.total > focus.total) focus = candidat;
    }

    const meilleur = (focus && focus.total > sansFocus.total) ? focus : sansFocus;
    return {
        sansFocus,
        focus,
        meilleur,
        gainDuFocus: focus ? focus.total - sansFocus.total : 0
    };
}

/* Le jet retenu pour une ligne. L'API donne un intervalle
   (`diceNum` = minimum, `diceSide` = maximum ; un maximum à 0 signifie
   une valeur fixe). « moyen » est le défaut raisonnable : le minimum
   sous-estime tout, le maximum ne s'obtient presque jamais. */
function jetRetenu(effet, mode) {
    const min = effet.diceNum || 0;
    const max = effet.diceSide || 0;
    if (!max || max <= min) return min;
    if (mode === "min") return min;
    if (mode === "max") return max;
    return (min + max) / 2;
}

// Pour node (tests hors navigateur) comme pour le navigateur.
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        BRISAGE_FACTEUR, BRISAGE_PART_HORS_FOCUS,
        poidsDeLigne, poidsEnRunes, brisageSansFocus, brisageAvecFocus,
        valeurDesRunes, meilleurBrisage, jetRetenu
    };
}
