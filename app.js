/* ============================================================
   Optimiseur de métiers Dofus — logique (JavaScript)
   ------------------------------------------------------------
   Les données viennent EN DIRECT de l'API publique de DofusDB.
   Tout tourne dans TON navigateur : les recettes sont
   téléchargées à la demande, et les prix / bénéfices que tu
   saisis sont sauvegardés en local (localStorage).
   ============================================================ */

// Adresse de base de l'API DofusDB (FeathersJS).
const API = "https://api.dofusdb.fr";

// ---- Mémoire de travail (remise à zéro à chaque rechargement de page) ----
let recettesCourantes = [];   // les recettes du métier sélectionné
let metierCourantNom = "";    // le nom du métier affiché (pour l'intitulé)
const cacheObjets = {};       // { idObjet: { nom, niveau, img } }  → évite de re-télécharger

// ---- Sauvegardes persistantes (restent d'une session à l'autre) ----
const prix = chargerJSON("dofus_prix", {});            // { idObjet: prixUnitaireEnKamas }
const ventes = chargerJSON("dofus_ventes", {});        // { idObjet: quantitéVendueSur30Jours }
let benefices = chargerJSON("dofus_benefices", {       // suivi global des gains
    totalProfit: 0,
    totalCrafts: 0
});
const craftsParRecette = chargerJSON("dofus_crafts", {}); // { idResultat: nombreDeCrafts }

// Petits raccourcis pour récupérer des éléments de la page
const $ = (id) => document.getElementById(id);


/* ============================================================
   1) OUTILS GÉNÉRIQUES
   ============================================================ */

// Lit une valeur JSON dans le localStorage, ou renvoie une valeur par défaut.
function chargerJSON(cle, defaut) {
    try {
        const brut = localStorage.getItem(cle);
        return brut ? JSON.parse(brut) : defaut;
    } catch (e) {
        return defaut;
    }
}

// Enregistre une valeur JSON dans le localStorage.
function sauverJSON(cle, valeur) {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur));
    } catch (e) {
        console.warn("Impossible d'enregistrer", cle, e);
    }
}

// Récupère le nom lisible : DofusDB renvoie souvent { fr, en, ... }.
function loc(nom) {
    if (!nom) return "?";
    if (typeof nom === "string") return nom;
    return nom.fr || nom.en || Object.values(nom)[0] || "?";
}

// Formate un nombre avec des espaces (1234567 → "1 234 567").
function formaterNombre(n) {
    return Math.round(n).toLocaleString("fr-FR");
}

// Appel générique à l'API. Renvoie l'objet JSON, ou lève une erreur.
async function appelAPI(chemin) {
    const reponse = await fetch(API + chemin);
    if (!reponse.ok) {
        throw new Error("Réponse " + reponse.status + " pour " + chemin);
    }
    return reponse.json();
}

// Met à jour le bandeau de statut en haut de page.
function statut(texte, type) {
    const el = $("statut");
    el.textContent = texte;
    el.className = "statut statut-" + type; // attente | ok | erreur
}


/* ============================================================
   2) CHARGEMENT DES MÉTIERS
   ============================================================ */

// Combien de recettes ce métier possède-t-il ? ($limit=0 : on ne veut que le total)
async function compterRecettes(jobId) {
    try {
        const data = await appelAPI("/recipes?jobId=" + jobId + "&$limit=0");
        return data.total ?? 0;
    } catch (e) {
        return 0;
    }
}

async function chargerMetiers() {
    statut("Connexion à DofusDB…", "attente");
    try {
        // On demande jusqu'à 100 métiers d'un coup.
        const data = await appelAPI("/jobs?$limit=100&lang=fr");
        const metiers = (data.data || data) // FeathersJS renvoie { data: [...] }
            .filter((m) => m && m.id != null)
            .sort((a, b) => loc(a.name).localeCompare(loc(b.name)));

        // L'API liste aussi des entrées internes qui ne sont pas de vrais
        // métiers de craft (« Base », « Bestiologue »…). Plutôt que de les
        // bloquer par leur nom, on ne garde que les métiers qui possèdent
        // réellement au moins une recette.
        statut("Vérification des métiers…", "attente");
        const compteurs = await Promise.all(
            metiers.map((m) => compterRecettes(m.id))
        );
        let vrais = metiers.filter((m, i) => compteurs[i] > 0);

        // Sécurité : si la vérification échoue (réseau capricieux), on
        // préfère afficher tous les métiers plutôt qu'une liste vide.
        if (vrais.length === 0) vrais = metiers;

        const select = $("selectMetier");
        for (const m of vrais) {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = loc(m.name);
            select.appendChild(opt);
        }
        preparerRecolte(metiers);
        statut("✅ Connecté à DofusDB (" + vrais.length + " métiers)", "ok");
    } catch (e) {
        console.error(e);
        statut("❌ Impossible de joindre DofusDB. Ouvre ce fichier dans un navigateur avec accès Internet, puis recharge la page.", "erreur");
    }
}


/* ============================================================
   3) CHARGEMENT DES RECETTES D'UN MÉTIER
   ============================================================ */

async function chargerRecettes(jobId) {
    recettesCourantes = [];
    $("listeRecettes").innerHTML = "";
    $("messageVide").style.display = "block";
    $("messageVide").textContent = "Chargement des recettes…";

    try {
        // On récupère toutes les recettes du métier (pagination par pages de 50).
        let toutes = [];
        let skip = 0;
        let total = Infinity;
        while (skip < total && skip < 600) { // garde-fou : 600 recettes max
            const data = await appelAPI(
                "/recipes?jobId=" + jobId + "&$limit=50&$skip=" + skip + "&lang=fr"
            );
            total = data.total ?? data.data.length;
            toutes = toutes.concat(data.data || []);
            skip += 50;
            if (!data.data || data.data.length === 0) break;
        }

        // Sécurité : on ne garde QUE les recettes dont le métier correspond
        // vraiment à celui qui a été choisi. Même si l'API renvoyait autre
        // chose, aucun objet d'un autre métier ne peut s'afficher.
        toutes = toutes.filter((r) => String(r.jobId) === String(jobId));

        // On rassemble tous les identifiants d'objets à nommer
        // (résultats + ingrédients) puis on les télécharge par lots.
        const idsAObtenir = new Set();
        for (const r of toutes) {
            if (r.resultId != null) idsAObtenir.add(r.resultId);
            for (const ing of r.ingredientIds || []) idsAObtenir.add(ing);
        }
        await chargerObjets([...idsAObtenir]);

        recettesCourantes = toutes;
        afficherRecettes();
    } catch (e) {
        console.error(e);
        $("messageVide").textContent = "❌ Erreur pendant le chargement des recettes. Vérifie ta connexion et réessaie.";
    }
}

// Télécharge les détails (nom, niveau, image) d'une liste d'objets, par lots de 40.
async function chargerObjets(ids) {
    const manquants = ids.filter((id) => !(id in cacheObjets));
    for (let i = 0; i < manquants.length; i += 40) {
        const lot = manquants.slice(i, i + 40);
        // Syntaxe FeathersJS : ?id[$in][]=1&id[$in][]=2 …
        const query = lot.map((id) => "id[$in][]=" + id).join("&");
        const data = await appelAPI("/items?" + query + "&$limit=40&lang=fr");
        for (const objet of data.data || []) {
            cacheObjets[objet.id] = {
                nom: loc(objet.name),
                niveau: objet.level ?? 0,
                img: objet.img || ""
            };
        }
    }
    // Sécurité : ce qui n'a pas été trouvé reçoit un nom neutre.
    for (const id of ids) {
        if (!(id in cacheObjets)) {
            cacheObjets[id] = { nom: "Objet #" + id, niveau: 0, img: "" };
        }
    }
}


/* ============================================================
   4) AFFICHAGE DES RECETTES
   ============================================================ */

// Niveau d'un objet (celui de l'objet, sinon celui indiqué par la recette).
function niveauDe(x) {
    return x.objet.niveau || x.recette.resultLevel || 0;
}

function afficherRecettes() {
    const conteneur = $("listeRecettes");
    conteneur.innerHTML = "";

    const monNiveau = parseInt($("niveauMetier").value) || 1;
    const filtreNiveau = $("filtreNiveau").value;
    const recherche = $("recherche").value.trim().toLowerCase();
    const tri = $("triRentabilite").value;

    // On prépare une liste enrichie (avec coût / profit calculés).
    let liste = recettesCourantes.map((r) => {
        const obj = cacheObjets[r.resultId] || { nom: "?", niveau: 0, img: "" };
        const calc = calculerRentabilite(r);
        return { recette: r, objet: obj, ...calc };
    });

    // Filtre par recherche textuelle
    if (recherche) {
        liste = liste.filter((x) => x.objet.nom.toLowerCase().includes(recherche));
    }

    // Filtre par niveau. Le niveau de l'objet sert de niveau de métier requis
    // pour le crafter : un objet niveau 60 demande un métier niveau 60.
    if (filtreNiveau === "realisables") {
        // Uniquement ce que je peux crafter maintenant.
        liste = liste.filter((x) => niveauDe(x) <= monNiveau);
    } else if (filtreNiveau === "xp") {
        // Les crafts réalisables les plus proches de mon niveau : ce sont eux
        // qui rapportent le plus d'XP (un objet très bas niveau n'en donne plus).
        liste = liste.filter((x) => {
            const niv = niveauDe(x);
            return niv <= monNiveau && niv >= monNiveau - 30;
        });
    }
    // "tous" : on n'enlève rien.

    // Tri
    liste.sort((a, b) => {
        if (tri === "marge-jour") return b.margeJour - a.margeJour;
        if (tri === "indice")     return b.indice - a.indice;
        if (tri === "profit") return b.profit - a.profit;
        if (tri === "cout")   return a.cout - b.cout;
        // Tri par niveau de l'objet : croissant (du + bas au + haut)
        // ou décroissant (du + haut au + bas).
        const ecart = niveauDe(a) - niveauDe(b);
        return tri === "niveau-desc" ? -ecart : ecart;
    });

    // Statistiques
    $("statNbRecettes").textContent = liste.length;
    document.querySelector("#statNbRecettes + .stat-label").textContent =
        metierCourantNom ? "recettes de " + metierCourantNom : "recettes chargées";
    $("messageVide").style.display = liste.length ? "none" : "block";
    if (!liste.length) {
        const nom = metierCourantNom || "ce métier";
        $("messageVide").textContent =
            $("filtreNiveau").value === "tous"
                ? "Aucune recette de " + nom + " ne correspond à cette recherche."
                : "Aucun craft de " + nom + " réalisable au niveau " + monNiveau +
                  ". Monte ton niveau, ou choisis « Tous les crafts du métier » pour voir la suite.";
    }

    // Création des cartes
    for (const x of liste) {
        conteneur.appendChild(creerCarteRecette(x, monNiveau));
    }
}

// Calcule le coût de craft, le prix de vente et le profit d'une recette.
function calculerRentabilite(recette) {
    let cout = 0;
    const ingredients = (recette.ingredientIds || []).map((id, i) => {
        const qte = (recette.quantities || [])[i] || 1;
        const prixUnitaire = prix[id] || 0;
        cout += prixUnitaire * qte;
        return { id, qte, prixUnitaire };
    });
    const prixVente = prix[recette.resultId] || 0;
    const profit = prixVente - cout;
    return { cout, prixVente, profit, ingredients, ...calculerRatios(recette.resultId, profit, prixVente) };
}

/* Les deux indicateurs qui décident de tout (voir methode.js).
   La marge seule ne veut rien dire : c'est elle CROISÉE avec la vitesse
   de vente qui dit si un craft mérite tes kamas et ton temps.

   - marge journalière  = marge en kamas × ventes par jour → le potentiel brut
   - indice de profitab. = ventes par jour × marge en %     → le rendement du capital

   La quantité saisie est celle des 30 derniers jours : on divise par 30 plutôt
   que de lire les dernières 24 h, qui fluctuent trop pour servir de base. */
function calculerRatios(idResultat, profit, prixVente) {
    const ventes30 = ventes[idResultat] || 0;
    const ventesJour = ventes30 / 30;
    // Marge exprimée en pourcentage du prix de vente.
    const margePct = prixVente > 0 ? (profit / prixVente) * 100 : 0;
    return {
        ventes30,
        ventesJour,
        margePct,
        margeJour: profit * ventesJour,
        indice: ventesJour * margePct
    };
}

// Construit la carte HTML d'une recette.
function creerCarteRecette(x, monNiveau) {
    const { recette, objet } = x;
    const nivObjet = objet.niveau || recette.resultLevel || 0;
    // Réalisable à mon niveau ET assez proche de lui pour rapporter de l'XP.
    const dansFenetre = nivObjet <= monNiveau && nivObjet >= monNiveau - 30;

    const carte = document.createElement("div");
    carte.className = "carte-recette" + (dansFenetre ? " dans-fenetre" : "");

    // ---- En-tête (image + nom + niveau) ----
    const entete = document.createElement("div");
    entete.className = "recette-entete";
    entete.innerHTML = `
        ${objet.img ? `<img class="recette-img" src="${objet.img}" alt="" loading="lazy">` : `<div class="recette-img"></div>`}
        <div class="recette-titre">
            <div class="recette-nom">${objet.nom}</div>
            <div class="recette-niveau">Niveau ${nivObjet}</div>
        </div>
        ${dansFenetre ? `<span class="badge-fenetre">bon pour l'XP</span>` : ""}
    `;
    carte.appendChild(entete);

    // ---- Ingrédients (avec champ de prix) ----
    const boiteIng = document.createElement("div");
    boiteIng.className = "ingredients";
    for (const ing of x.ingredients) {
        const objIng = cacheObjets[ing.id] || { nom: "Objet #" + ing.id };
        const ligne = document.createElement("div");
        ligne.className = "ligne-ingredient";
        ligne.innerHTML = `
            <span class="nom-ingredient">
                <span class="qte">${ing.qte}×</span> ${objIng.nom}
                <span class="ingredient-craftable" data-ing="${ing.id}"
                      title="Voir si cet ingrédient est lui-même craftable (synergie)">🔗</span>
            </span>
            <span>prix u.</span>
            <input type="number" class="prix-input" min="0" value="${ing.prixUnitaire || ""}"
                   data-prix-objet="${ing.id}" placeholder="0">
        `;
        boiteIng.appendChild(ligne);
    }
    carte.appendChild(boiteIng);

    // Zone où s'affichera la synergie quand on clique sur le 🔗
    const synergie = document.createElement("div");
    synergie.dataset.synergiePour = recette.resultId;
    carte.appendChild(synergie);

    // ---- Bloc rentabilité ----
    const rent = document.createElement("div");
    rent.className = "rentabilite";
    rent.innerHTML = `
        <div class="ligne-calcul">
            <span>Coût de craft</span>
            <span class="valeur" data-cout>${formaterNombre(x.cout)} k</span>
        </div>
        <div class="prix-vente-ligne">
            <span>Prix de vente unitaire</span>
            <input type="number" class="prix-input" min="0" value="${x.prixVente || ""}"
                   data-prix-objet="${recette.resultId}" data-vente placeholder="0">
        </div>
        <div class="ligne-calcul">
            <span>Profit par craft</span>
            <span class="valeur ${x.profit >= 0 ? "profit-positif" : "profit-negatif"}" data-profit>
                ${formaterNombre(x.profit)} k
            </span>
        </div>
        <div class="ligne-calcul ligne-marge-pct">
            <span>Marge en % du prix de vente</span>
            <span class="valeur">${x.prixVente > 0 ? Math.round(x.margePct) + " %" : "–"}</span>
        </div>
        <div class="prix-vente-ligne">
            <span title="Relève-la en HDV : quantité vendue sur les 30 derniers jours">
                Vendus sur 30 jours
            </span>
            <input type="number" class="prix-input" min="0" value="${x.ventes30 || ""}"
                   data-ventes-objet="${recette.resultId}" placeholder="0">
        </div>
        <div class="ratios ${x.ventes30 ? "" : "ratios-vides"}">
            <div class="ligne-calcul">
                <span>Marge journalière</span>
                <span class="valeur ${x.margeJour >= 0 ? "profit-positif" : "profit-negatif"}">
                    ${x.ventes30 ? formaterNombre(x.margeJour) + " k/jour" : "renseigne les ventes"}
                </span>
            </div>
            <div class="ligne-calcul">
                <span>Indice de profitabilité</span>
                <span class="valeur">
                    ${x.ventes30 ? formaterNombre(x.indice) : "–"}
                </span>
            </div>
            ${x.ventes30
                ? `<div class="ratios-detail">${(x.ventesJour).toFixed(1)} ventes/jour en moyenne</div>`
                : ""}
        </div>
        <div class="actions-craft">
            <span class="compteur-craft">crafté ${craftsParRecette[recette.resultId] || 0}×</span>
            <button class="bouton-craft" data-craft="${recette.resultId}">+ J'ai crafté</button>
        </div>
    `;
    carte.appendChild(rent);

    return carte;
}


/* ============================================================
   5) SYNERGIES ENTRE MÉTIERS
   ------------------------------------------------------------
   On demande à l'API si un ingrédient possède lui-même une
   recette : si oui, il est fabriqué par un autre métier.
   ============================================================ */

async function afficherSynergie(idIngredient, zone) {
    zone.innerHTML = `<div class="synergie-box">Recherche…</div>`;
    try {
        const data = await appelAPI("/recipes?resultId=" + idIngredient + "&$limit=5&lang=fr");
        const recettes = data.data || [];
        const nomObjet = (cacheObjets[idIngredient] || {}).nom || ("Objet #" + idIngredient);

        if (!recettes.length) {
            zone.innerHTML = `<div class="synergie-box">
                <strong>${nomObjet}</strong> ne se craft pas : il faut le récolter, l'acheter ou le farmer (drop).
            </div>`;
            return;
        }

        // On récupère le nom du/des métiers concernés.
        const jobIds = [...new Set(recettes.map((r) => r.jobId).filter((j) => j != null))];
        let nomsMetiers = jobIds.join(", ");
        try {
            const q = jobIds.map((id) => "id[$in][]=" + id).join("&");
            const dataJobs = await appelAPI("/jobs?" + q + "&lang=fr");
            nomsMetiers = (dataJobs.data || []).map((j) => loc(j.name)).join(", ");
        } catch (e) { /* pas grave : on garde les identifiants */ }

        zone.innerHTML = `<div class="synergie-box">
            🔗 <strong>${nomObjet}</strong> est <strong>craftable</strong>
            ${nomsMetiers ? "par : <strong>" + nomsMetiers + "</strong>" : ""}.
            Le fabriquer toi-même peut réduire ton coût de craft !
        </div>`;
    } catch (e) {
        console.error(e);
        zone.innerHTML = `<div class="synergie-box">Impossible de vérifier la synergie pour l'instant.</div>`;
    }
}


/* ============================================================
   6) SUIVI DES BÉNÉFICES
   ============================================================ */

function rafraichirTableauBord() {
    $("statProfitTotal").textContent = formaterNombre(benefices.totalProfit);
    $("statNbCrafts").textContent = formaterNombre(benefices.totalCrafts);
}

function enregistrerCraft(idResultat) {
    // On retrouve la recette pour connaître son profit actuel.
    const recette = recettesCourantes.find((r) => r.resultId === idResultat);
    if (!recette) return;
    const { profit } = calculerRentabilite(recette);

    benefices.totalProfit += profit;
    benefices.totalCrafts += 1;
    craftsParRecette[idResultat] = (craftsParRecette[idResultat] || 0) + 1;

    sauverJSON("dofus_benefices", benefices);
    sauverJSON("dofus_crafts", craftsParRecette);
    rafraichirTableauBord();
    afficherRecettes(); // met à jour le compteur « crafté N× »
}


/* ============================================================
   7) BRANCHEMENT DES ÉVÉNEMENTS (clics, saisies…)
   ============================================================ */

function brancherEvenements() {
    // Changement de métier → on charge ses recettes
    $("selectMetier").addEventListener("change", (e) => {
        // On retient le nom affiché dans le menu (ex : « Bijoutier »)
        metierCourantNom = e.target.options[e.target.selectedIndex].textContent;
        if (e.target.value) chargerRecettes(e.target.value);
    });

    // Les filtres réaffichent sans recharger l'API
    $("niveauMetier").addEventListener("input", afficherRecettes);
    $("filtreNiveau").addEventListener("change", afficherRecettes);
    $("triRentabilite").addEventListener("change", afficherRecettes);

    // Recherche : on attend un court instant pour ne pas rafraîchir à chaque touche
    let minuteur;
    $("recherche").addEventListener("input", () => {
        clearTimeout(minuteur);
        minuteur = setTimeout(afficherRecettes, 250);
    });

    // Délégation d'événements sur la liste des recettes (un seul écouteur pour tout)
    $("listeRecettes").addEventListener("input", (e) => {
        const champ = e.target.closest("[data-prix-objet]");
        if (champ) {
            const id = parseInt(champ.dataset.prixObjet);
            const val = parseFloat(champ.value) || 0;
            prix[id] = val;                 // met à jour le carnet de prix
            sauverJSON("dofus_prix", prix);
            recalculerCartesAffectees(id);  // recalcule uniquement ce qu'il faut
            return;
        }
        // Quantité vendue sur 30 jours : elle alimente les deux ratios.
        const champVentes = e.target.closest("[data-ventes-objet]");
        if (champVentes) {
            const id = parseInt(champVentes.dataset.ventesObjet);
            ventes[id] = parseFloat(champVentes.value) || 0;
            sauverJSON("dofus_ventes", ventes);
            recalculerCartesAffectees(id);
        }
    });

    $("listeRecettes").addEventListener("click", (e) => {
        // Bouton « j'ai crafté »
        const boutonCraft = e.target.closest("[data-craft]");
        if (boutonCraft) {
            enregistrerCraft(parseInt(boutonCraft.dataset.craft));
            return;
        }
        // Icône synergie 🔗
        const lienSyn = e.target.closest("[data-ing]");
        if (lienSyn) {
            const idIng = parseInt(lienSyn.dataset.ing);
            const carte = lienSyn.closest(".carte-recette");
            const zone = carte.querySelector("[data-synergie-pour]");
            afficherSynergie(idIng, zone);
        }
    });

    // Réinitialiser les bénéfices
    $("resetBenefices").addEventListener("click", () => {
        if (confirm("Remettre à zéro le bénéfice cumulé et le nombre de crafts ?")) {
            benefices = { totalProfit: 0, totalCrafts: 0 };
            for (const k in craftsParRecette) delete craftsParRecette[k];
            sauverJSON("dofus_benefices", benefices);
            sauverJSON("dofus_crafts", craftsParRecette);
            rafraichirTableauBord();
            afficherRecettes();
        }
    });

    // Notes Huzounet (sauvegarde automatique)
    const notes = $("notesHuzounet");
    notes.value = localStorage.getItem("dofus_notes_huzounet") || "";
    notes.addEventListener("input", () => {
        localStorage.setItem("dofus_notes_huzounet", notes.value);
    });
}

// Quand un prix change, on recalcule seulement les cartes qui utilisent cet objet
// (soit comme ingrédient, soit comme résultat). Plus rapide que tout redessiner.
function recalculerCartesAffectees(idObjet) {
    const cartes = document.querySelectorAll(".carte-recette");
    let indice = 0;
    // On refait le même filtrage/tri que l'affichage pour retrouver l'ordre.
    // Plus simple et sûr : on redessine tout. Les saisies restent car on relit `prix`.
    // On garde toutefois le focus sur le champ en cours si possible.
    const actif = document.activeElement;
    const dataActif = actif && actif.dataset ? actif.dataset : {};
    const idActif = dataActif.prixObjet || dataActif.ventesObjet || null;
    const estVentes = dataActif.ventesObjet !== undefined;
    const estVente = dataActif.vente !== undefined;
    const posCurseur = actif && actif.selectionStart;

    afficherRecettes();

    // On tente de redonner le focus au champ que l'utilisateur était en train de remplir.
    if (idActif) {
        const selecteur = estVentes
            ? `[data-ventes-objet="${idActif}"]`
            : `[data-prix-objet="${idActif}"]${estVente ? "[data-vente]" : ":not([data-vente])"}`;
        const nouveau = document.querySelector(selecteur);
        if (nouveau) {
            nouveau.focus();
            try { nouveau.setSelectionRange(posCurseur, posCurseur); } catch (e) {}
        }
    }
}


/* ============================================================
   9) FEUILLE DE ROUTE
   ------------------------------------------------------------
   Les données (principes, phases, investissements) sont dans
   feuille-route.js. Ici, on les affiche et on suit la progression.
   ============================================================ */

// Étapes cochées : { idEtape: true }   ·   Produits mis en vente : { idInvest: true }
const etapesFaites = chargerJSON("dofus_plan_etapes", {});
const investEnVente = chargerJSON("dofus_plan_invest", {});

// Toutes les étapes, à plat et dans l'ordre du parcours.
function toutesLesEtapes() {
    return PHASES.flatMap((ph) => ph.etapes.map((e) => ({ ...e, phase: ph })));
}

// La prochaine étape à faire = la première non cochée.
function etapeCourante() {
    return toutesLesEtapes().find((e) => !etapesFaites[e.id]) || null;
}

function afficherPrincipes() {
    $("listePrincipes").innerHTML = PRINCIPES.map((p) => `
        <div class="carte-principe">
            <div class="principe-titre">${p.titre}</div>
            <div class="principe-texte">${p.texte}</div>
        </div>
    `).join("");
}

function afficherSynergies() {
    $("listeSynergies").innerHTML = `<div class="chaine">` + SYNERGIES.map((s) => `
        <div class="maillon">
            <span class="maillon-de">${s.de}</span>
            <span class="maillon-via">${s.via} ↓</span>
            <span class="maillon-vers">${s.vers}</span>
        </div>
    `).join("") + `</div>`;
}

function afficherPhases() {
    const courante = etapeCourante();
    const tresor = parseFloat($("tresorerie").value) || 0;

    $("listePhases").innerHTML = PHASES.map((ph) => {
        // Une phase est « accessible » si la trésorerie atteint son palier.
        const accessible = tresor >= ph.capital;
        const manque = ph.capital - tresor;

        const etapes = ph.etapes.map((e) => {
            const faite = !!etapesFaites[e.id];
            const estCourante = courante && courante.id === e.id;
            return `
                <div class="etape ${faite ? "etape-faite" : ""} ${estCourante ? "etape-courante" : ""}">
                    <label class="etape-entete">
                        <input type="checkbox" data-etape="${e.id}" ${faite ? "checked" : ""}>
                        <span class="etape-titre">${e.titre}</span>
                        ${estCourante ? `<span class="badge-maintenant">à faire maintenant</span>` : ""}
                    </label>
                    <div class="etape-corps">
                        <p><strong>Action :</strong> ${e.action}</p>
                        <p class="etape-debloque"><strong>Débloque :</strong> ${e.debloque}</p>
                        <p class="etape-pourquoi">💡 ${e.pourquoi}</p>
                    </div>
                </div>`;
        }).join("");

        return `
            <div class="phase ${accessible ? "" : "phase-verrouillee"}">
                <div class="phase-entete">
                    <h3>${ph.titre}</h3>
                    <span class="phase-lieu">${ph.lieu}</span>
                </div>
                <p class="phase-resume">${ph.resume}</p>
                <p class="phase-capital">
                    ${ph.capital === 0
                        ? "🎬 Aucun capital nécessaire : c'est le point de départ."
                        : accessible
                            ? "✅ Palier atteint : " + formaterNombre(ph.capital) + " kamas"
                            : "🔒 Palier : " + formaterNombre(ph.capital) + " kamas — il te manque " +
                              formaterNombre(manque) + " k"}
                </p>
                ${etapes}
            </div>`;
    }).join("");
}

function afficherInvestissements() {
    $("listeInvestissements").innerHTML = INVESTISSEMENTS.map((inv) => {
        const debloque = !!etapesFaites[inv.debloquePar];
        const enVente = !!investEnVente[inv.id];
        return `
            <div class="invest ${debloque ? "" : "invest-verrouille"}">
                <label>
                    <input type="checkbox" data-invest="${inv.id}"
                           ${enVente ? "checked" : ""} ${debloque ? "" : "disabled"}>
                    <span class="invest-nom">${inv.nom}</span>
                </label>
                <span class="invest-note">${debloque ? inv.note : "Se débloque plus loin dans le parcours."}</span>
            </div>`;
    }).join("");
}

function rafraichirPlan() {
    const tresor = parseFloat($("tresorerie").value) || 0;
    // Règle des 80 % : la part du capital qui devrait être investie.
    $("statCapitalTravail").textContent = formaterNombre(tresor * 0.8);

    const toutes = toutesLesEtapes();
    const faites = toutes.filter((e) => etapesFaites[e.id]).length;
    $("statAvancement").textContent = Math.round((faites / toutes.length) * 100) + " %";

    const courante = etapeCourante();
    $("phaseCourante").textContent = courante
        ? "👉 Prochaine étape : " + courante.titre + " (" + courante.phase.titre + ")"
        : "🏆 Parcours terminé : tous tes métiers sont montés !";

    afficherPhases();
    afficherInvestissements();
}

function brancherPlan() {
    // Trésorerie (sauvegardée)
    const champTresor = $("tresorerie");
    champTresor.value = localStorage.getItem("dofus_tresorerie") || "";
    champTresor.addEventListener("input", () => {
        localStorage.setItem("dofus_tresorerie", champTresor.value);
        rafraichirPlan();
    });

    // Cocher une étape
    $("listePhases").addEventListener("change", (e) => {
        const c = e.target.closest("[data-etape]");
        if (!c) return;
        if (c.checked) etapesFaites[c.dataset.etape] = true;
        else delete etapesFaites[c.dataset.etape];
        sauverJSON("dofus_plan_etapes", etapesFaites);
        rafraichirPlan();
    });

    // Cocher un produit mis en vente
    $("listeInvestissements").addEventListener("change", (e) => {
        const c = e.target.closest("[data-invest]");
        if (!c) return;
        if (c.checked) investEnVente[c.dataset.invest] = true;
        else delete investEnVente[c.dataset.invest];
        sauverJSON("dofus_plan_invest", investEnVente);
    });

    // Remise à zéro de la progression
    $("resetPlan").addEventListener("click", () => {
        if (!confirm("Décocher toutes les étapes de la feuille de route ?")) return;
        for (const k in etapesFaites) delete etapesFaites[k];
        for (const k in investEnVente) delete investEnVente[k];
        sauverJSON("dofus_plan_etapes", etapesFaites);
        sauverJSON("dofus_plan_invest", investEnVente);
        rafraichirPlan();
    });

    // Onglets
    document.querySelectorAll(".onglet").forEach((bouton) => {
        bouton.addEventListener("click", () => {
            document.querySelectorAll(".onglet").forEach((b) => b.classList.remove("actif"));
            bouton.classList.add("actif");
            $("vue-plan").hidden     = bouton.dataset.onglet !== "plan";
            $("vue-recolte").hidden  = bouton.dataset.onglet !== "recolte";
            $("vue-recettes").hidden = bouton.dataset.onglet !== "recettes";
            $("vue-methode").hidden  = bouton.dataset.onglet !== "methode";
        });
    });

    afficherPrincipes();
    afficherSynergies();
    rafraichirPlan();
}


/* ============================================================
   10) QUE RÉCOLTER
   ============================================================ */

let ressourcesCourantes = [];   // les compétences de récolte du métier choisi

// Remplit les menus de l'onglet Récolte à partir des métiers déjà chargés.
// Enlève les accents et la casse : « Bûcheron » et « bucheron »
// deviennent le même mot, ce qui évite de rater un métier.
function sansAccent(texte) {
    return (texte || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function preparerRecolte(metiers) {
    let recolte = metiers.filter((m) => {
        const nom = sansAccent(loc(m.name));
        return METIERS_RECOLTE.some((connu) => nom.includes(sansAccent(connu)));
    });

    // Si aucun nom ne correspond (renommage côté API, autre langue…),
    // mieux vaut proposer tous les métiers qu'une liste vide.
    let repli = false;
    if (!recolte.length) { recolte = metiers; repli = true; }

    const selM = $("metierRecolte");
    for (const m of recolte) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = loc(m.name);
        selM.appendChild(opt);
    }

    if (repli) {
        $("diagRecolte").innerHTML = `<span class="diag-echec">
            Je n'ai pas reconnu les métiers de récolte par leur nom : tous les métiers
            sont proposés ci-dessus.</span>`;
    }
}

// Les tranches ne dépendent pas du réseau : on les remplit tout de suite.
function preparerTranches() {
    $("trancheRecolte").innerHTML = TRANCHES.map(
        (t) => `<option value="${t.min}-${t.max}">Niveau ${t.min} à ${t.max}</option>`
    ).join("");
}

// Récupère les compétences de récolte du métier (quoi récolter, à quel niveau).
async function chargerRessources() {
    const jobId = $("metierRecolte").value;
    const diag = $("diagRecolte");
    ressourcesCourantes = [];

    if (!jobId) {
        $("listeRessources").innerHTML = "";
        diag.textContent = "";
        return;
    }

    $("listeRessources").innerHTML = "";
    diag.textContent = "Recherche des ressources récoltables…";

    let brut = null;
    let pisteRetenue = "";
    for (const piste of PISTES_RECOLTE) {
        try {
            const data = await appelAPI(piste.url(jobId));
            const liste = data.data || (Array.isArray(data) ? data : null);
            if (liste && liste.length) { brut = liste; pisteRetenue = piste.nom; break; }
        } catch (e) { /* piste suivante */ }
    }

    if (!brut) {
        diag.innerHTML = `<span class="diag-echec">Impossible de récupérer les ressources
            récoltables depuis DofusDB. Utilise la carte interactive plus bas.</span>`;
        return;
    }

    // On ne garde que les compétences qui récoltent vraiment une ressource.
    ressourcesCourantes = brut.map((sk) => ({
        idRessource: premierChamp(sk, CHAMP_RESSOURCE),
        niveau: premierChamp(sk, CHAMP_NIVEAU) || 0
    })).filter((r) => r.idRessource != null);

    if (!ressourcesCourantes.length) {
        diag.innerHTML = `<span class="diag-echec">L'API a répondu (via « ${pisteRetenue} »)
            mais aucune ressource récoltable n'a été reconnue.</span>`;
        return;
    }

    await chargerObjets(ressourcesCourantes.map((r) => r.idRessource));
    diag.innerHTML = `<span class="diag-ok">✅ ${ressourcesCourantes.length} ressources trouvées</span>`;
    afficherRessources();
}

// Affiche les ressources de la tranche choisie.
function afficherRessources() {
    const [min, max] = $("trancheRecolte").value.split("-").map(Number);

    // Une ressource est utile dans la tranche si on peut déjà la récolter
    // à ce niveau (son niveau requis ne dépasse pas le haut de la tranche).
    const utiles = ressourcesCourantes
        .filter((r) => r.niveau <= max)
        .sort((a, b) => b.niveau - a.niveau);   // les plus hautes d'abord : meilleure XP

    if (!utiles.length) {
        $("listeRessources").innerHTML = `<p class="petite-note">
            Aucune ressource récoltable en dessous du niveau ${max}.</p>`;
        return;
    }

    $("listeRessources").innerHTML = `
        <p class="petite-note">
            Les plus hautes en premier : ce sont celles qui rapportent le plus d'XP
            à ta tranche (niveau ${min} à ${max}).
        </p>
        <div class="grille-ressources">
            ${utiles.map((r, i) => {
                const obj = cacheObjets[r.idRessource] || { nom: "Objet #" + r.idRessource, img: "" };
                const meilleure = i === 0;
                return `<div class="carte-ressource ${meilleure ? "ressource-top" : ""}">
                    ${obj.img ? `<img src="${obj.img}" alt="" loading="lazy">` : `<div class="sans-img"></div>`}
                    <div class="ressource-infos">
                        <div class="ressource-nom">${obj.nom}</div>
                        <div class="ressource-niveau">
                            récoltable dès le niveau ${r.niveau}
                            ${meilleure ? ` · <span class="marque-top">meilleure XP ici</span>` : ""}
                        </div>
                    </div>
                </div>`;
            }).join("")}
        </div>`;
}

function brancherRecolte() {
    preparerTranches();
    $("metierRecolte").addEventListener("change", chargerRessources);
    $("trancheRecolte").addEventListener("change", afficherRessources);
}


/* ============================================================
   11) LA MÉTHODE
   ------------------------------------------------------------
   Purement de l'affichage : toutes les données viennent de
   methode.js. Rien n'est calculé ici.
   ============================================================ */

function cartesTexte(liste, cleTitre, cleTexte) {
    return liste.map((e) => `
        <div class="carte-principe">
            <div class="principe-titre">${e[cleTitre]}</div>
            <div class="principe-texte">${e[cleTexte]}</div>
        </div>
    `).join("");
}

function afficherPaliers() {
    $("listePaliers").innerHTML = PALIERS_METIERS.map((m) => `
        <div class="metier-paliers famille-${m.famille}">
            <div class="metier-entete">
                <h3>${m.metier}</h3>
                <span class="metier-famille">${m.famille}</span>
            </div>
            <p class="metier-resume">${m.resume}</p>
            <div class="frise">
                ${m.paliers.map((p) => `
                    <div class="palier">
                        <span class="palier-niveau">${p.niveau}</span>
                        <div class="palier-corps">
                            <div class="palier-quoi">${p.quoi}</div>
                            <div class="palier-pourquoi">${p.pourquoi}</div>
                        </div>
                    </div>
                `).join("")}
            </div>
            ${m.note ? `<p class="petite-note">⚠️ ${m.note}</p>` : ""}
        </div>
    `).join("");
}

function afficherCouples() {
    $("listeCouples").innerHTML = COUPLES_SYNERGIE.map((c) => `
        <div class="couple">
            <h3>${c.titre}</h3>
            <ul>${c.detail.map((d) => `<li>${d}</li>`).join("")}</ul>
            <p class="couple-regle">👉 ${c.regle}</p>
        </div>
    `).join("");
}

function afficherTierlist() {
    $("listeCriteres").innerHTML = TIERLIST_CRITERES.map((c) => `
        <div class="critere">
            <div class="critere-nom">${c.nom}</div>
            <div class="critere-desc">${c.desc}</div>
        </div>
    `).join("");

    $("listeTierlist").innerHTML = TIERLIST.map((t) => `
        <div class="tier tier-${t.rang.toLowerCase()}">
            <div class="tier-rang">${t.rang}</div>
            <div class="tier-corps">
                <div class="tier-metiers">${t.metiers.join(" · ")}</div>
                <div class="tier-pourquoi">${t.pourquoi}</div>
            </div>
        </div>
    `).join("");

    $("noteTierlist").textContent = TIERLIST_RESERVE;

    $("metierEcarte").innerHTML = `
        <strong>🚫 ${METIER_ECARTE.quoi} — à écarter</strong>
        <p>${METIER_ECARTE.pourquoi}</p>`;
}

function afficherSocles() {
    $("listeSocles").innerHTML = SOCLES_PROFIT.map((s) => `
        <div class="socle socle-${s.statut === "écarté" ? "ecarte" : "central"}">
            <div class="socle-entete">
                <h3>${s.socle}</h3>
                <span class="socle-statut">${s.statut}</span>
            </div>
            <p>${s.texte}</p>
            ${s.consigne ? `<p class="socle-consigne">👉 ${s.consigne}</p>` : ""}
        </div>
    `).join("");
}

function afficherDiversification() {
    $("regleTresorerie").innerHTML = `
        <div class="jauge-tresorerie">
            <div class="jauge-part jauge-investi" style="width:${REGLE_TRESORERIE.investi}%">
                ${REGLE_TRESORERIE.investi} % investis
            </div>
            <div class="jauge-part jauge-cash" style="width:${REGLE_TRESORERIE.cash}%">
                ${REGLE_TRESORERIE.cash} % liquides
            </div>
        </div>
        <p>${REGLE_TRESORERIE.texte}</p>
        <p class="petite-note">${REGLE_TRESORERIE.nuance}</p>`;

    $("conditionDiversification").textContent = CONDITION_DIVERSIFICATION;

    $("listeHdv").innerHTML = REPARTITION_HDV.map((h) => `
        <div class="carte-hdv">
            <div class="hdv-part">${h.part} %</div>
            <div class="hdv-nom">${h.hdv}</div>
            <div class="hdv-vitesse">vitesse de vente : ${h.vitesse}</div>
        </div>
    `).join("");
}

function afficherEvenements() {
    $("listeEvenements").innerHTML = EVENEMENTS_MARCHE.map((e) => `
        <div class="evenement">
            <div class="evenement-entete">
                <h3>${e.nom}</h3>
                <span class="evenement-freq">${e.frequence}</span>
            </div>
            <p>${e.effet}</p>
            <p class="evenement-action">👉 ${e.quoi_faire}</p>
        </div>
    `).join("");

    $("actualisationPrix").innerHTML = `
        <strong>🔁 À quelle fréquence actualiser son prix de vente ?</strong>
        <p>${ACTUALISATION_PRIX.regle}</p>
        <p class="petite-note">
            Rappel des taxes du jeu : ${ACTUALISATION_PRIX.taxe_baisse} % si tu baisses le prix,
            ${ACTUALISATION_PRIX.taxe_hausse} % si tu le montes.
        </p>`;
}

function afficherMethode() {
    $("listePieges").innerHTML = cartesTexte(PIEGES, "titre", "texte");
    $("listeRatios").innerHTML = cartesTexte(REGLES_RATIOS, "titre", "texte");
    afficherPaliers();
    afficherCouples();
    afficherTierlist();
    afficherSocles();
    afficherDiversification();
    afficherEvenements();
}


/* ============================================================
   8) DÉMARRAGE
   ============================================================ */

brancherEvenements();
brancherPlan();
brancherRecolte();
afficherMethode();
rafraichirTableauBord();
chargerMetiers();
