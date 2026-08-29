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
        if (tri === "profit") return b.profit - a.profit;
        if (tri === "cout")   return a.cout - b.cout;
        // par défaut : par niveau de l'objet
        const na = a.objet.niveau || a.recette.resultLevel || 0;
        const nb = b.objet.niveau || b.recette.resultLevel || 0;
        return na - nb;
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
    return { cout, prixVente, profit, ingredients };
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
    const idActif = actif && actif.dataset ? actif.dataset.prixObjet : null;
    const estVente = actif && actif.dataset ? actif.dataset.vente !== undefined : false;
    const posCurseur = actif && actif.selectionStart;

    afficherRecettes();

    // On tente de redonner le focus au champ que l'utilisateur était en train de remplir.
    if (idActif) {
        const selecteur = `[data-prix-objet="${idActif}"]${estVente ? "[data-vente]" : ":not([data-vente])"}`;
        const nouveau = document.querySelector(selecteur);
        if (nouveau) {
            nouveau.focus();
            try { nouveau.setSelectionRange(posCurseur, posCurseur); } catch (e) {}
        }
    }
}


/* ============================================================
   8) DÉMARRAGE
   ============================================================ */

brancherEvenements();
rafraichirTableauBord();
chargerMetiers();
