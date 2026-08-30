/* ============================================================
   Vérification du moteur d'XP (xp.js)
   ------------------------------------------------------------
   Deux façons de lancer ces contrôles :

   · avec Node   →  node test-xp.js
   · sans rien   →  ouvre index.html, puis dans la console du
                    navigateur (F12) tape :  lancerTestsXp()

   Le cœur de ces contrôles, ce sont les VINGT MESURES relevées
   sur l'outil « XP Métier » de DofusDB pour le Chasseur, niveau
   1 → 200. Ce ne sont pas des hypothèses : ce sont les chiffres
   que l'outil de référence annonce. Si le moteur s'en écarte,
   c'est le moteur qui a tort.
   ============================================================ */

function lancerTestsXp(moteur) {
    // En Node on reçoit le module ; dans le navigateur tout est déjà global.
    const m = moteur || (typeof window !== "undefined" ? window : {});
    const lignes = [];
    let reussis = 0, echoues = 0;

    function verifier(intitule, obtenu, attendu, tolerance) {
        const ok = Math.abs(obtenu - attendu) <= (tolerance || 0);
        if (ok) { reussis++; lignes.push("  ✅ " + intitule + "  (" + Math.round(obtenu) + ")"); }
        else {
            echoues++;
            lignes.push("  ❌ " + intitule + "  → obtenu " + Math.round(obtenu) +
                        ", attendu " + attendu + " (±" + (tolerance || 0) + ")");
        }
    }

    lignes.push("\n— Le coût d'un niveau —");
    verifier("Monter du niveau 40 coûte 800 XP", m.xpPourMonterDe(40), 800);
    verifier("Aller du niveau 1 au niveau 3 coûte 20+40=60 XP", m.xpTotaleEntre(1, 3), 60);
    // DofusDB annonce 398 046 XP pour le parcours complet.
    verifier("Niveau 1 → 200 coûte environ 398 000 XP",
             m.xpTotaleEntre(1, 200), 398046, 50);

    lignes.push("\n— Les 20 mesures relevées sur DofusDB (Chasseur, 1 → 200) —");
    /* Chaque ligne : la recette, son niveau, et le nombre de crafts que
       l'outil « XP Métier » annonce pour les dix niveaux qui suivent. */
    const MESURES_DOFUSDB = [
        ["Bouillon de Chair",        1,  77], ["Boulette de Viande",     10, 159],
        ["Beignet Astrubien",       20, 197], ["Roulade de Carne",       30, 183],
        ["Papillote au Citron",     40, 175], ["Salade Sufokienne",      50, 171],
        ["Friture Amaknéenne",      60, 168], ["Parmentier à l'Oignon",  70, 166],
        ["Terrine Bontarienne",     80, 164], ["Pot-au-feu Goûteux",     90, 163],
        ["Poêlée Paysanne",        100, 162], ["Pemmican aux Haricots", 110, 162],
        ["Grillade Brâkmarienne",  120, 161], ["Marinade Sucrée-Salée", 130, 160],
        ["Boudin Noir",            140, 160], ["Daube aux Épices",      150, 159],
        ["Mijoté Récréatif",       160, 159], ["Filet Mignon",          170, 159],
        ["Quenelle Tijan",         180, 158], ["Andouillette de Gibier",190, 158]
    ];
    for (const [nom, niveau, craftsAttendus] of MESURES_DOFUSDB) {
        const fin = niveau === 1 ? 10 : niveau + 10;
        // On impose CETTE recette, exactement comme le fait DofusDB.
        const plan = m.planDeMontee(
            [{ id: 1, nom: nom, niveauObjet: niveau, nbCases: 2, ingredients: [] }],
            niveau, fin);
        verifier(nom.padEnd(23) + " niv. " + String(niveau).padStart(3) +
                 " → " + String(fin).padStart(3), plan.totalCrafts, craftsAttendus);
    }

    lignes.push("\n— Ce que l'XP ne dépend PAS —");
    verifier("Un objet trop haut niveau ne rapporte rien", m.xpParCraft(80, 40), 0);
    /* Le point sur lequel la version précédente se trompait : il n'y a pas
       de pénalité d'écart de niveau. Un objet niveau 40 rapporte autant au
       métier niveau 40 qu'au métier niveau 200. */
    verifier("Le niveau du métier ne change pas le gain",
             m.xpParCraft(40, 200), m.xpParCraft(40, 40), 0.001);

    lignes.push("\n— Les cases débloquées —");
    verifier("Niveau 1 → 2 cases", m.casesMax(1), 2);
    verifier("Niveau 10 → 3 cases", m.casesMax(10), 3);
    verifier("Niveau 20 → 4 cases", m.casesMax(20), 4);
    verifier("Niveau 40 → 5 cases", m.casesMax(40), 5);
    verifier("Niveau 100 → 8 cases", m.casesMax(100), 8);
    verifier("Niveau 200 → 8 cases (plafond)", m.casesMax(200), 8);

    lignes.push("\n— Le plan de montée —");
    // Avec plusieurs recettes disponibles, le moteur doit toujours retenir la
    // plus haute réalisable : c'est elle qui rapporte le plus.
    const choix = [
        { id: 1, nom: "basse", niveauObjet: 10, nbCases: 2, ingredients: [{ id: 9, qte: 1 }] },
        { id: 2, nom: "haute", niveauObjet: 50, nbCases: 2, ingredients: [{ id: 9, qte: 2 }] }
    ];
    const plan = m.planDeMontee(choix, 50, 60);
    verifier("À niveau 50, c'est la recette niveau 50 qui est retenue",
             plan.paliers[0].recette.id, 2);
    verifier("…et elle donne le même total que la mesure DofusDB",
             plan.totalCrafts, 171);
    verifier("Les ingrédients suivent : 171 crafts × 2 unités",
             plan.ingredientsTotaux[9], 342);

    // Une recette trop grande pour le niveau ne doit jamais être proposée.
    const planCases = m.planDeMontee(
        [{ id: 1, nom: "Recette 6 cases", niveauObjet: 1, nbCases: 6, ingredients: [] }], 1, 5);
    verifier("Une recette 6 cases est refusée à bas niveau", planCases.totalCrafts, 0);
    verifier("…et les niveaux concernés sont signalés", planCases.niveauxSansRecette, 4);

    lignes.push("\n========================================");
    lignes.push(reussis + " vérifications réussies, " + echoues + " échouées");
    lignes.push("========================================\n");

    console.log(lignes.join("\n"));
    return { reussis, echoues };
}

// En Node : on charge xp.js et on lance tout de suite.
if (typeof module !== "undefined" && module.exports) {
    const resultat = lancerTestsXp(require("./xp.js"));
    process.exit(resultat.echoues > 0 ? 1 : 0);
}
