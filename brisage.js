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
   communauté : Vitalité 0,2 · Initiative 0,1 · Pods 0,25 ·
   Force/Intel/Chance/Agi 1 · Puissance 2 · Sagesse et Prospection 3 ·
   Portée 51 · PM 90 · PA 100. Ils ne sont PAS écrits en dur ici :
   `brisage.js` les reçoit.

   SÛR — la correspondance effet → rune : chaque rune est un objet du
   jeu qui porte l'`effectId` de la caractéristique qu'elle représente
   (Rune Ga Pa → 111 = PA, Rune Ré Per Feu → 213 = % Résistance Feu).
   Elle est lue dans les données, pas devinée à partir des noms.

   SÛR DEPUIS LE RECALAGE — la VALEUR d'une rune, c'est-à-dire le
   nombre de points de caractéristique qu'elle donne. Elle est lue sur
   la rune elle-même (`possibleEffects[0].diceNum`) :
   Rune Vi = 5 vitalité · Rune Ini = 10 initiative · Rune Pod = 10 pods ·
   toutes les autres = 1. Les paliers le confirment (Pa = ×3, Ra = ×10 :
   Pa Vi 15 et Ra Vi 50 · Pa Ini 30 et Ra Ini 100).

   LA FORMULE — recalée sur DoFocus (15 septembre 2026)
   ----------------------------------------------------
   Relevée dans le code public de dofocus.fr (`/assets/index-*.js`),
   à sa fonction de calcul, et transcrite telle quelle :

       poids(jet, W, L, V) = jet < 0  ?  3·jet / (200·V) + 1
                                      :  3·jet·W·L / (200·V) + 1

       runes sans focus = poids × coefficient/100 ÷ W
       runes avec focus = [ poids(cible) + ½·Σ poids(autres) ]
                          × coefficient/100 ÷ W(cible)

   où **W est le poids d'UNE RUNE** et **V sa valeur**. Et 3/200 = 0,015,
   le facteur que le projet portait déjà.

   Comme W = poids d'un point × V (Rune Vi : 0,2 × 5 = 1 ; Rune Ini :
   0,1 × 10 = 1 — les deux chiffres que le guide DoFocus donne en
   exemple), le poids de ligne se simplifie et redevient exactement
   celui qu'on avait :

       poids de ligne = jet × poids d'un point × niveau × 0,015 + 1

   CE QUI ÉTAIT FAUX, ET DE COMBIEN
   --------------------------------
   Le poids de ligne était juste. La **conversion en runes** ne l'était
   pas : on divisait par le poids d'UN POINT au lieu du poids d'UNE
   RUNE. On annonçait donc V fois trop de runes —

       · Vitalité   ×5   (la stat la plus répandue du jeu)
       · Initiative ×10
       · Pods       ×10
       · tout le reste : exact, V valant 1.

   Autrement dit : presque tous les objets étaient surévalués au
   brisage, la vitalité étant à peu près partout.

   AJOUTÉ AUSSI — les jets négatifs. Un objet peut porter un malus
   (« −3 PA »). DoFocus le traite à part : la branche négative ignore
   le poids ET le niveau. Une caractéristique dont le MINIMUM est
   négatif ne produit aucune rune et ne peut pas être prise en focus,
   mais elle compte quand même dans le total d'un focus, à 50 % comme
   les autres lignes. Elle y pèse très peu : sans le niveau ni le
   poids, son poids tourne autour de 1 là où une ligne normale en pèse
   des dizaines. Et il faut un malus énorme — au-delà de 200·V/3, soit
   environ −67 pour une rune de valeur 1 — pour qu'il devienne négatif
   et tire vraiment le total vers le bas. Le projet ignorait
   complètement ce cas.

   INCERTAIN — la formule reste une estimation. Elle n'est pas publiée
   par Ankama : DoFocus dit appliquer « la même formule que le jeu »
   sans la démontrer, et un autre calculateur de référence mesure sur
   lui-même « un résultat faux 34 fois sur 200, erreur max 7 % ».
   Ce recalage rapproche l'outil de la référence du domaine ; il ne
   prouve pas la formule. L'interface doit continuer de le dire.

   INCERTAIN AUSSI — le coefficient de brisage. Il n'existe AUCUN
   « taux par objet » à récupérer : il est propre au serveur et bouge
   en permanence selon le volume brisé (1 % à 4000 %). C'est un réglage
   que l'utilisateur saisit, pas une donnée.

   HORS PÉRIMÈTRE — DoFocus ajoute au total d'un focus les effets de
   chasse des objets de chasse, toujours à 50 %. L'outil ne traite pas
   ces objets.

   Sources : code public de dofocus.fr et son guide du brisage,
   calculateur ouvert KamelAkar/Calculateur_Brisage_Dofus,
   API DofusDB, forums officiels Dofus.
   ============================================================ */

// Constante de la formule : 3/200. Isolée pour rester ajustable si un
// relevé en jeu montrait qu'elle dérive.
const BRISAGE_FACTEUR = 0.015;

/* Part du poids conservée par les lignes NON ciblées quand on brise
   avec un focus. Le focus concentre tout sur une caractéristique :
   celle-ci rend 100 %, les autres ne contribuent que pour moitié —
   mais leur contribution devient de la rune ciblée. C'est le « malus
   de génération de runes de 50 % » annoncé par Ankama. */
const BRISAGE_PART_HORS_FOCUS = 0.5;

/* Le poids d'UNE RUNE — à ne pas confondre avec le poids d'un point de
   caractéristique. C'est par lui qu'on divise pour obtenir un nombre de
   runes, et c'est toute la correction du recalage.
   Rune Vi : 0,2 × 5 = 1 · Rune Ini : 0,1 × 10 = 1 · Rune Fo : 1 × 1 = 1.
   Une valeur absente vaut 1 : la rune donne alors un seul point, le cas
   de l'immense majorité d'entre elles. */
function poidsDUneRune(poidsParPoint, valeurRune) {
    if (!(poidsParPoint > 0)) return 0;
    return poidsParPoint * (valeurRune > 0 ? valeurRune : 1);
}

/* Une ligne est un MALUS si son jet minimum est négatif (« −3 PA »).
   C'est le minimum qui tranche, pas le jet retenu : un intervalle
   −1 à +5 reste un malus même si sa moyenne est positive. */
function estMalus(ligne) {
    if (!ligne) return false;
    const min = (ligne.jetMin != null) ? ligne.jetMin : ligne.valeur;
    return min < 0;
}

/* Le poids d'une ligne de statistique.
   `valeur` est le jet retenu (minimum, moyen ou maximum), `poidsParPoint`
   le poids d'un point de la caractéristique, `niveau` celui de l'objet
   brisé, `valeurRune` le nombre de points que donne une rune.
   Sur un jet négatif, ni le poids ni le niveau n'interviennent. */
function poidsDeLigne(valeur, poidsParPoint, niveau, valeurRune) {
    if (!(poidsParPoint > 0)) return 0;
    const v = valeurRune > 0 ? valeurRune : 1;
    if (valeur < 0) return (valeur * BRISAGE_FACTEUR / v) + 1;
    if (!(valeur > 0) || !(niveau > 0)) return 0;
    return (valeur * poidsParPoint * niveau * BRISAGE_FACTEUR) + 1;
}

/* Convertit un poids en runes, en divisant par le poids d'UNE RUNE.
   La partie décimale n'est pas perdue : dans le jeu, elle donne la
   CHANCE d'obtenir une rune de plus. On la renvoie séparément plutôt
   que d'arrondir — arrondir à chaque ligne biaiserait le total,
   l'erreur commise autrefois sur l'XP. */
function poidsEnRunes(poids, poidsRune) {
    if (!(poids > 0) || !(poidsRune > 0)) return { entier: 0, chance: 0, exact: 0 };
    const exact = poids / poidsRune;
    const entier = Math.floor(exact);
    return { entier, chance: exact - entier, exact };
}

/* Brisage SANS focus : chaque ligne donne ses propres runes.
   `lignes` : [{ effectId, valeur, jetMin, poidsRune, valeurRune, niveau }]
   où `poidsRune` est le poids d'un POINT de la caractéristique.
   `coefficient` : celui du serveur, en pourcentage (100 = neutre).
   Une ligne de malus ne produit rien. */
function brisageSansFocus(lignes, coefficient) {
    const part = (coefficient || 0) / 100;
    return (lignes || [])
        .filter((l) => !estMalus(l))
        .map((l) => {
            const pr = poidsDUneRune(l.poidsRune, l.valeurRune);
            const poids = poidsDeLigne(l.valeur, l.poidsRune, l.niveau, l.valeurRune) * part;
            return { effectId: l.effectId, poidsRune: pr, ...poidsEnRunes(poids, pr) };
        })
        .filter((r) => r.exact > 0);
}

/* Brisage AVEC focus sur une caractéristique : la ligne ciblée compte
   pour 100 %, les autres pour 50 %, et TOUT devient de la rune ciblée.
   Les lignes de malus entrent dans le total (elles le tirent vers le
   bas) mais ne peuvent pas être la cible. */
function brisageAvecFocus(lignes, effectIdCible, coefficient) {
    const part = (coefficient || 0) / 100;
    const cible = (lignes || []).find((l) => l.effectId === effectIdCible);
    if (!cible || estMalus(cible)) return null;

    let poids = 0;
    for (const l of lignes) {
        const p = poidsDeLigne(l.valeur, l.poidsRune, l.niveau, l.valeurRune);
        poids += (l.effectId === effectIdCible) ? p : p * BRISAGE_PART_HORS_FOCUS;
    }
    poids *= part;

    const pr = poidsDUneRune(cible.poidsRune, cible.valeurRune);
    return { effectId: effectIdCible, poidsRune: pr, ...poidsEnRunes(poids, pr) };
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
        poidsDUneRune, estMalus, poidsDeLigne, poidsEnRunes,
        brisageSansFocus, brisageAvecFocus,
        valeurDesRunes, meilleurBrisage, jetRetenu
    };
}
