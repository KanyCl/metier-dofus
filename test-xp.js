/* ============================================================
   Vérification du moteur d'XP (xp.js)
   ------------------------------------------------------------
   Deux façons de lancer ces contrôles, selon ce dont tu disposes :

   · avec Node      →  node test-xp.js
   · sans rien      →  ouvre index.html, puis dans la console du
                       navigateur (F12) tape :  lancerTestsXp()

   Les valeurs testées sont celles relevées par la communauté.
   Si tu ajustes les paliers dans xp.js, relance ces contrôles :
   ils diront tout de suite si quelque chose ne colle plus.
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

    lignes.push("\n— L'exemple de référence : la baguette niveau 40 —");
    // Relevé communautaire : à niveau égal le craft rapporte 20 × 40 = 800 XP,
    // puis l'XP fond à mesure que l'écart de niveau se creuse.
    verifier("Sculpteur niv. 40, objet niv. 40 → 800 XP", m.xpParCraft(40, 40), 800);
    verifier("Sculpteur niv. 48, objet niv. 40 → ~400 XP", m.xpParCraft(40, 48), 400, 10);
    verifier("Sculpteur niv. 62, objet niv. 40 → ~200 XP", m.xpParCraft(40, 62), 200, 10);

    lignes.push("\n— Les bornes —");
    verifier("Un objet trop haut niveau ne rapporte rien", m.xpParCraft(80, 40), 0);
    verifier("1 niveau d'écart → 90 % de l'XP", m.penalite(1), 0.9, 0.001);
    verifier("3 niveaux d'écart → 75 % de l'XP", m.penalite(3), 0.75, 0.001);

    lignes.push("\n— Les cases débloquées —");
    verifier("Niveau 1 → 2 cases", m.casesMax(1), 2);
    verifier("Niveau 10 → 3 cases", m.casesMax(10), 3);
    verifier("Niveau 20 → 4 cases", m.casesMax(20), 4);
    verifier("Niveau 40 → 5 cases", m.casesMax(40), 5);
    verifier("Niveau 100 → 8 cases", m.casesMax(100), 8);
    verifier("Niveau 200 → 8 cases (plafond)", m.casesMax(200), 8);

    lignes.push("\n— Le plan de montée —");
    // Cas idéal : une recette pile à chaque niveau. Un craft = un niveau,
    // donc monter de 10 à 20 doit demander exactement 10 crafts.
    const ideales = [];
    for (let n = 1; n <= 200; n++) {
        ideales.push({ id: n, nom: "Objet niv. " + n, niveauObjet: n, nbCases: 2,
                       ingredients: [{ id: 1000 + n, qte: 3 }] });
    }
    const planIdeal = m.planDeMontee(ideales, 10, 20);
    verifier("Recette parfaite à chaque niveau → 10 crafts pour 10 niveaux",
             planIdeal.totalCrafts, 10);
    verifier("Les ingrédients suivent : 10 crafts × 3 unités = 30 pièces",
             Object.values(planIdeal.ingredientsTotaux).reduce((a, b) => a + b, 0), 30);

    // Cas réaliste : une seule recette, bien en dessous du niveau visé.
    const planPauvre = m.planDeMontee(
        [{ id: 1, nom: "Petit objet", niveauObjet: 10, nbCases: 2, ingredients: [{ id: 5, qte: 2 }] }],
        10, 30);
    lignes.push("  ℹ️  Une seule recette niv. 10 pour monter de 10 à 30 : " +
                planPauvre.totalCrafts + " crafts (l'XP fond avec l'écart)");
    verifier("Ce plan demande plus de crafts que le plan idéal",
             planPauvre.totalCrafts > 20 ? 1 : 0, 1);

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
