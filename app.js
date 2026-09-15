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

// Neutralise les caractères qui auraient un sens en HTML. À utiliser sur
// TOUT texte venu de l'extérieur (noms d'objets, de métiers…) avant de le
// placer dans un innerHTML.
function echapper(texte) {
    return String(texte == null ? "" : texte)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
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

/* « Base », « Bestiologue »… : ces entrées existent dans les données du
   jeu mais ne sont pas des métiers. On compare sans accent ni casse, et
   sur le nom ENTIER — un « contient » risquerait d'emporter un vrai
   métier dont le nom inclurait le mot. */
function estUnFauxMetier(metier) {
    const nom = sansAccent(loc(metier.name));
    return METIERS_INEXISTANTS.some((faux) => nom === sansAccent(faux));
}

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
        const recus = (data.data || data) // FeathersJS renvoie { data: [...] }
            .filter((m) => m && m.id != null);

        // On écarte les entrées qui ne sont pas de vrais métiers (voir
        // METIERS_INEXISTANTS dans recolte.js). C'est fait ici, à la source :
        // ainsi elles n'apparaissent dans AUCUN onglet.
        const faux = recus.filter(estUnFauxMetier);
        oublierNiveaux(faux.map((m) => m.id));
        const metiers = recus
            .filter((m) => !estUnFauxMetier(m))
            .sort((a, b) => loc(a.name).localeCompare(loc(b.name)));

        // L'API liste aussi des entrées internes qui ne sont pas de vrais
        // métiers de craft (« Base », « Bestiologue »…). Plutôt que de les
        // bloquer par leur nom, on ne garde que les métiers qui possèdent
        // réellement au moins une recette.
        statut("Vérification des métiers…", "attente");
        const compteurs = await Promise.all(
            metiers.map((m) => compterRecettes(m.id))
        );
        metiers.forEach((m, i) => { m.aDesRecettes = compteurs[i] > 0; });
        let vrais = metiers.filter((m) => m.aDesRecettes);

        // Sécurité : si la vérification échoue (réseau capricieux), on
        // préfère afficher tous les métiers plutôt qu'une liste vide.
        if (vrais.length === 0) {
            vrais = metiers;
            metiers.forEach((m) => { m.aDesRecettes = true; });
        }

        const select = $("selectMetier");
        for (const m of vrais) {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = loc(m.name);
            select.appendChild(opt);
        }
        // « Mes métiers » reçoit la liste complète : c'est la source de
        // vérité que liront les onglets Rentabilité, Optimisation et Récolte.
        enregistrerMetiers(metiers);
        remplirMetiersOptimisation();
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

/* Récupère les recettes d'un métier et le détail des objets qu'elles
   utilisent. Partagé par l'onglet Rentabilité et l'onglet Optimisation :
   les deux ont besoin exactement de la même chose. */
async function recupererRecettesDuMetier(jobId) {
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

    return toutes;
}

async function chargerRecettes(jobId) {
    recettesCourantes = [];
    $("listeRecettes").innerHTML = "";
    $("messageVide").style.display = "block";
    $("messageVide").textContent = "Chargement des recettes…";

    try {
        recettesCourantes = await recupererRecettesDuMetier(jobId);
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
    // « Réalisable » ne veut pas seulement dire « à mon niveau » : une recette
    // occupe aussi des cases d'ingrédients, qui se débloquent avec le niveau.
    // C'est le moteur d'XP (xp.js) qui porte cette règle.
    const fiche = (x) => ({
        niveauObjet: niveauDe(x),
        nbCases: (x.recette.ingredientIds || []).length
    });

    if (filtreNiveau === "realisables") {
        // Uniquement ce que je peux crafter maintenant.
        liste = liste.filter((x) => craftPossible(fiche(x), monNiveau));
    } else if (filtreNiveau === "xp") {
        // Les crafts réalisables les plus proches de mon niveau : ce sont eux
        // qui rapportent le plus d'XP (un objet très bas niveau n'en donne plus).
        liste = liste.filter((x) =>
            craftPossible(fiche(x), monNiveau) && niveauDe(x) >= monNiveau - 30);
    }
    // "tous" : on n'enlève rien.

    // Tri
    liste.sort((a, b) => {
        if (tri === "marge-jour") return b.margeJour - a.margeJour;
        if (tri === "indice")     return b.indice - a.indice;
        if (tri === "profit") return b.profit - a.profit;
        if (tri === "xp")     return xpParCraft(niveauDe(b), monNiveau)
                                   - xpParCraft(niveauDe(a), monNiveau);
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
    // Ce que ce craft rapporte en XP à mon niveau actuel (voir xp.js).
    const gainXp = xpParCraft(nivObjet, monNiveau);

    const entete = document.createElement("div");
    entete.className = "recette-entete";
    entete.innerHTML = `
        ${objet.img ? `<img class="recette-img" src="${echapper(objet.img)}" alt="" loading="lazy">` : `<div class="recette-img"></div>`}
        <div class="recette-titre">
            <div class="recette-nom">${echapper(objet.nom)}</div>
            <div class="recette-niveau">
                Niveau ${nivObjet}${gainXp > 0
                    ? (ecartFiable(nivObjet, monNiveau)
                        ? " · " + formaterNombre(gainXp) + " XP / craft"
                        : ` · <span class="xp-majorant" title="Cette recette est à plus de ${ECART_MESURE} niveaux sous le tien. L'XP réelle est plus basse : les mesures qui calibrent l'outil ne couvrent pas un tel écart.">≤ ${formaterNombre(gainXp)} XP / craft</span>`)
                    : ""}
            </div>
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
                <span class="qte">${ing.qte}×</span> ${echapper(objIng.nom)}
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
        if (!e.target.value) return;
        // Le niveau n'est plus à ressaisir : il vient de « Mes métiers ».
        $("niveauMetier").value = niveauDuMetier(e.target.value) || 1;
        chargerRecettes(e.target.value);
    });

    // Corriger le niveau ici met aussi à jour la fiche « Mes métiers » :
    // les deux onglets ne peuvent pas se contredire.
    $("niveauMetier").addEventListener("input", () => {
        const jobId = $("selectMetier").value;
        if (jobId) definirNiveauMetier(jobId, parseInt($("niveauMetier").value, 10));
        afficherRecettes();
    });
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

// Place le sélecteur de tranche sur celle qui contient mon niveau dans ce
// métier — plus besoin de la chercher à la main.
function calerTrancheSurMonNiveau() {
    const niveau = niveauDuMetier($("metierRecolte").value);
    if (!niveau) return;
    const tranche = TRANCHES.find((t) => niveau >= t.min && niveau <= t.max);
    if (tranche) $("trancheRecolte").value = tranche.min + "-" + tranche.max;
}

function brancherRecolte() {
    preparerTranches();
    $("metierRecolte").addEventListener("change", () => {
        calerTrancheSurMonNiveau();
        chargerRessources();
    });
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

/* Le niveau enregistré d'un métier désigné par son NOM dans methode.js.
   Renvoie null quand l'entrée ne désigne pas un métier précis : les lignes
   « Métiers de craft d'équipement » et « Métiers de forgemagie » parlent
   d'une famille entière, qui n'a aucun niveau à elle. Renvoie null aussi
   tant que l'API n'a pas répondu — on ne coche rien à l'aveugle. */
function niveauDuMetierNomme(nom) {
    const m = tousLesMetiers.find((x) => loc(x.name) === nom);
    return m ? niveauDuMetier(m.id) : null;
}

function afficherPaliers() {
    $("listePaliers").innerHTML = PALIERS_METIERS.map((m) => {
        const niveau = niveauDuMetierNomme(m.metier);
        // 0 = métier pas commencé : la frise reste neutre, comme avant.
        const situe = niveau > 0;
        const atteints = situe ? m.paliers.filter((p) => p.niveau <= niveau).length : 0;

        // Le prochain palier, par son niveau — pas par son objet : deux paliers
        // peuvent partager le même niveau (Alchimiste 60), et les deux sont
        // alors « le prochain ».
        const suivant = situe ? m.paliers.find((p) => p.niveau > niveau) : null;
        const niveauSuivant = suivant ? suivant.niveau : null;

        return `
        <div class="metier-paliers famille-${m.famille}">
            <div class="metier-entete">
                <h3>${m.metier}</h3>
                <span class="metier-famille">${m.famille}</span>
                ${situe ? `<span class="metier-avancement">niveau ${niveau} · ${atteints}/${m.paliers.length} paliers</span>` : ""}
            </div>
            <p class="metier-resume">${m.resume}</p>
            <div class="frise">
                ${m.paliers.map((p) => {
                    const atteint  = situe && p.niveau <= niveau;
                    const prochain = situe && p.niveau === niveauSuivant;
                    const etat = atteint ? " atteint" : prochain ? " prochain" : "";
                    return `
                    <div class="palier${etat}">
                        <span class="palier-niveau">${p.niveau}</span>
                        <div class="palier-corps">
                            <div class="palier-quoi">${atteint ? "✅ " : ""}${p.quoi}</div>
                            <div class="palier-pourquoi">${p.pourquoi}</div>
                            ${prochain ? `<div class="palier-reste">👉 Le prochain : plus que ${p.niveau - niveau} niveaux.</div>` : ""}
                        </div>
                    </div>`;
                }).join("")}
            </div>
            ${situe && !suivant ? `<p class="petite-note">🏁 Tous les paliers de ce métier sont derrière toi.</p>` : ""}
            ${m.note ? `<p class="petite-note">⚠️ ${m.note}</p>` : ""}
        </div>`;
    }).join("");
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
   12) MES MÉTIERS
   ------------------------------------------------------------
   La source de vérité de l'outil : le niveau de chacun de mes
   métiers est saisi ici, une seule fois, et les autres onglets
   viennent le lire — Rentabilité pour savoir ce que je peux
   crafter, Optimisation pour le plan de montée et les synergies,
   Récolte pour se caler sur ma tranche.
   ============================================================ */

// { idMetier: niveau }  —  sauvegardé dans le navigateur
const niveauxMetiers = chargerJSON("dofus_niveaux_metiers", {});

// La liste complète des métiers, telle que l'API l'a donnée.
let tousLesMetiers = [];

// Les fonctions à rappeler quand un niveau change, pour que les
// autres onglets se mettent à jour tout seuls.
const abonnesAuxNiveaux = [];

// Le niveau d'un métier (0 = « je ne l'ai pas commencé »).
function niveauDuMetier(idMetier) {
    return niveauxMetiers[String(idMetier)] || 0;
}

// Le nom d'un métier à partir de son identifiant.
function nomDuMetier(idMetier) {
    const m = tousLesMetiers.find((x) => String(x.id) === String(idMetier));
    return m ? loc(m.name) : "Métier #" + idMetier;
}

// Enregistre un niveau, puis prévient les autres onglets.
function definirNiveauMetier(idMetier, niveau) {
    const propre = Math.max(0, Math.min(200, Math.round(niveau) || 0));
    if (propre === 0) delete niveauxMetiers[String(idMetier)];
    else niveauxMetiers[String(idMetier)] = propre;

    sauverJSON("dofus_niveaux_metiers", niveauxMetiers);
    for (const prevenir of abonnesAuxNiveaux) prevenir();
}

/* Efface les niveaux enregistrés pour des entrées qui ne sont pas de
   vrais métiers. Sans ça, un niveau saisi avant leur retrait resterait
   dans le navigateur sans plus jamais s'afficher — ni pouvoir s'effacer. */
function oublierNiveaux(ids) {
    let modifie = false;
    for (const id of ids) {
        if (niveauxMetiers[String(id)] != null) {
            delete niveauxMetiers[String(id)];
            modifie = true;
        }
    }
    if (modifie) sauverJSON("dofus_niveaux_metiers", niveauxMetiers);
}

// Les métiers réellement commencés, du plus haut au plus bas.
function mesMetiersCommences() {
    return tousLesMetiers
        .filter((m) => niveauDuMetier(m.id) > 0)
        .sort((a, b) => niveauDuMetier(b.id) - niveauDuMetier(a.id));
}

// Permet à un autre onglet de dire : « préviens-moi quand un niveau change ».
function surChangementDeNiveau(fonction) {
    abonnesAuxNiveaux.push(fonction);
}

// Appelé une fois, quand l'API a répondu avec la liste des métiers.
function enregistrerMetiers(metiers) {
    tousLesMetiers = metiers.slice().sort((a, b) => loc(a.name).localeCompare(loc(b.name)));
    afficherMesMetiers();
    // La frise de l'onglet Méthode a été rendue avant la réponse de l'API,
    // donc sans savoir où j'en suis : on la refait maintenant qu'on le sait.
    afficherPaliers();
}

function afficherMesMetiers() {
    const conteneur = $("listeMesMetiers");
    if (!conteneur) return;

    if (!tousLesMetiers.length) {
        conteneur.innerHTML = `<p class="message-vide">Chargement de la liste des métiers…</p>`;
        return;
    }

    $("statMetiersCommences").textContent = mesMetiersCommences().length;
    $("statMetiersMax").textContent =
        tousLesMetiers.filter((m) => niveauDuMetier(m.id) >= 200).length;

    conteneur.innerHTML = tousLesMetiers.map((m) => {
        const niveau = niveauDuMetier(m.id);
        const part = Math.round((niveau / 200) * 100);
        return `
            <div class="carte-metier ${niveau > 0 ? "metier-commence" : ""}">
                <label class="metier-nom" for="niv-metier-${m.id}">${echapper(loc(m.name))}</label>
                <div class="metier-barre" title="${part} % du chemin vers le niveau 200">
                    <div class="metier-barre-remplie" style="width:${part}%"></div>
                </div>
                <input type="number" id="niv-metier-${m.id}" class="metier-niveau-input"
                       min="0" max="200" placeholder="0"
                       value="${niveau || ""}" data-niveau-metier="${m.id}">
            </div>`;
    }).join("");
}

// Met à jour la barre et les compteurs sans tout redessiner : le curseur
// resterait sinon coincé à chaque frappe.
function majBarreMetier(champ) {
    const carte = champ.closest(".carte-metier");
    const niveau = niveauDuMetier(champ.dataset.niveauMetier);
    const part = Math.round((niveau / 200) * 100);
    carte.querySelector(".metier-barre-remplie").style.width = part + "%";
    carte.querySelector(".metier-barre").title = part + " % du chemin vers le niveau 200";
    carte.classList.toggle("metier-commence", niveau > 0);

    $("statMetiersCommences").textContent = mesMetiersCommences().length;
    $("statMetiersMax").textContent =
        tousLesMetiers.filter((m) => niveauDuMetier(m.id) >= 200).length;
}

function brancherMesMetiers() {
    const conteneur = $("listeMesMetiers");
    if (!conteneur) return;

    conteneur.addEventListener("input", (e) => {
        const champ = e.target.closest("[data-niveau-metier]");
        if (!champ) return;
        definirNiveauMetier(champ.dataset.niveauMetier, parseInt(champ.value, 10));
        majBarreMetier(champ);
    });

    // Un niveau modifié depuis un AUTRE onglet doit se voir ici aussi —
    // sauf pendant qu'on tape dans cet onglet-ci.
    surChangementDeNiveau(() => {
        const enTrainDeSaisir = document.activeElement
            && document.activeElement.dataset
            && document.activeElement.dataset.niveauMetier;
        if (!enTrainDeSaisir) afficherMesMetiers();
    });

    $("resetMetiers").addEventListener("click", () => {
        if (!confirm("Effacer tous les niveaux de métiers enregistrés ?")) return;
        for (const cle in niveauxMetiers) delete niveauxMetiers[cle];
        sauverJSON("dofus_niveaux_metiers", niveauxMetiers);
        afficherMesMetiers();
        for (const prevenir of abonnesAuxNiveaux) prevenir();
    });
}


/* ============================================================
   13) OPTIMISER MA MONTÉE
   ------------------------------------------------------------
   « Pour monter CE métier jusqu'au niveau X, qu'est-ce que je
   crafte, combien de fois, avec quoi, et pour combien ? »

   Le calcul d'XP lui-même vit dans xp.js (fonctions pures,
   vérifiables par test-xp.js). Ici on va chercher les recettes,
   on lance le calcul, et on affiche — y compris les synergies :
   quels ingrédients je peux fabriquer moi-même plutôt que de
   les acheter, ce que le guide appelle chaîner ses métiers.
   ============================================================ */

let planCourant = null;      // le dernier plan calculé
let recettesPlan = [];       // les recettes du métier, au format attendu par xp.js
let synergiesPlan = {};      // { idIngredient: { jobId, nomMetier, monNiveau, … } }
let bornesPlan = { depart: 0, cible: 0 };

// Remplit le sélecteur de métier, en affichant mon niveau à côté.
function remplirMetiersOptimisation() {
    const select = $("metierOptim");
    if (!select) return;
    const retenu = select.value;
    select.innerHTML = `<option value="">— choisis un métier —</option>` +
        tousLesMetiers.filter((m) => m.aDesRecettes !== false).map((m) => {
            const niv = niveauDuMetier(m.id);
            return `<option value="${m.id}">${echapper(loc(m.name))}` +
                   `${niv > 0 ? " (niv. " + niv + ")" : ""}</option>`;
        }).join("");
    select.value = retenu;
}

// Quand on choisit un métier, on pré-remplit son niveau actuel.
function synchroniserNiveauxOptimisation() {
    const jobId = $("metierOptim").value;
    if (!jobId) return;
    const niv = niveauDuMetier(jobId);
    $("niveauDepartOptim").value = niv;
    const cible = parseInt($("niveauCibleOptim").value, 10) || 0;
    if (cible <= niv) {
        $("niveauCibleOptim").value =
            Math.min(200, Math.max(niv + 10, Math.ceil((niv + 1) / 10) * 10));
    }
}

async function calculerPlan() {
    const jobId = $("metierOptim").value;
    const zone = $("resultatOptim");
    const depart = parseInt($("niveauDepartOptim").value, 10) || 0;
    const cible = parseInt($("niveauCibleOptim").value, 10) || 0;

    if (!jobId) {
        zone.innerHTML = `<p class="message-vide">Choisis d'abord un métier. 👆</p>`;
        return;
    }
    if (cible <= depart) {
        zone.innerHTML = `<p class="message-vide">
            Le niveau visé doit être plus haut que le niveau actuel.</p>`;
        return;
    }

    // Le niveau saisi ici fait autorité : on le renvoie dans « Mes métiers ».
    definirNiveauMetier(jobId, depart);

    zone.innerHTML = `<p class="message-vide">Récupération des recettes de
        ${echapper(nomDuMetier(jobId))}…</p>`;

    try {
        const brutes = await recupererRecettesDuMetier(jobId);

        recettesPlan = brutes.map((r) => {
            const obj = cacheObjets[r.resultId] || { nom: "?", niveau: 0, img: "" };
            return {
                id: r.resultId,
                nom: obj.nom,
                img: obj.img,
                niveauObjet: obj.niveau || r.resultLevel || 1,
                nbCases: (r.ingredientIds || []).length,
                ingredients: (r.ingredientIds || []).map((id, i) => ({
                    id: id, qte: (r.quantities || [])[i] || 1
                }))
            };
        }).filter((r) => r.nbCases > 0);

        if (!recettesPlan.length) {
            zone.innerHTML = `<p class="message-vide">
                Aucune recette exploitable trouvée pour ce métier.</p>`;
            return;
        }

        planCourant = planDeMontee(recettesPlan, depart, cible);
        bornesPlan = { depart, cible };

        zone.innerHTML = `<p class="message-vide">Recherche des synergies avec tes autres métiers…</p>`;
        await chercherSynergies(Object.keys(planCourant.ingredientsTotaux).map(Number));

        afficherPlan(depart, cible);
    } catch (e) {
        console.error(e);
        zone.innerHTML = `<p class="message-vide">
            ❌ Erreur pendant le calcul. Vérifie ta connexion et réessaie.</p>`;
    }
}

/* Les synergies : « puis-je fabriquer cet ingrédient moi-même ? »
   On demande à l'API, par lots, quelles recettes produisent ces
   ingrédients. Si le métier qui les fabrique est un des miens et que mon
   niveau suffit, c'est une économie directe. */
async function chercherSynergies(idsIngredients) {
    synergiesPlan = {};
    if (!idsIngredients.length) return;

    for (let i = 0; i < idsIngredients.length; i += 40) {
        const lot = idsIngredients.slice(i, i + 40);
        const requete = lot.map((id) => "resultId[$in][]=" + id).join("&");
        try {
            const data = await appelAPI("/recipes?" + requete + "&$limit=50&lang=fr");
            for (const r of data.data || []) {
                if (r.resultId == null || r.jobId == null) continue;
                if (synergiesPlan[r.resultId]) continue;   // une seule suffit

                const objet = cacheObjets[r.resultId] || { niveau: 0 };
                const monNiveau = niveauDuMetier(r.jobId);
                synergiesPlan[r.resultId] = {
                    jobId: r.jobId,
                    nomMetier: nomDuMetier(r.jobId),
                    monNiveau: monNiveau,
                    niveauRequis: objet.niveau || 0,
                    jePeuxLeFaire: monNiveau > 0 && monNiveau >= (objet.niveau || 0)
                };
            }
        } catch (e) {
            // Pas de synergie pour ce lot : ce n'est pas bloquant.
            console.warn("Synergies indisponibles pour un lot", e);
        }
    }
}

/* Ce que coûte la montée. On réutilise le carnet de prix partagé avec
   l'onglet Rentabilité : un prix saisi ici s'applique aussi là-bas.
   Monter un métier n'est pas une dépense sèche — les objets produits se
   revendent — d'où le bilan net. */
function calculerCoutsPlan() {
    let coutIngredients = 0, sansPrix = 0, nbIngredients = 0;
    for (const [id, qte] of Object.entries(planCourant.ingredientsTotaux)) {
        nbIngredients++;
        const prixUnitaire = prix[id] || 0;
        if (!prixUnitaire) sansPrix++;
        coutIngredients += prixUnitaire * qte;
    }

    let revente = 0;
    for (const palier of planCourant.paliers) {
        revente += (prix[palier.recette.id] || 0) * palier.crafts;
    }

    const niveauxGagnes = Math.max(1, bornesPlan.cible - bornesPlan.depart);
    return {
        coutIngredients, revente,
        net: coutIngredients - revente,
        parNiveau: (coutIngredients - revente) / niveauxGagnes,
        sansPrix, nbIngredients
    };
}

// Recalcule les montants sans redessiner : les champs gardent le focus.
function rafraichirCoutsPlan() {
    if (!planCourant) return;
    const c = calculerCoutsPlan();

    const ecrire = (cle, texte) => {
        const el = document.querySelector(`[data-cout="${cle}"]`);
        if (el) el.textContent = texte;
    };
    ecrire("ingredients", formaterNombre(c.coutIngredients) + " k");
    ecrire("revente", "− " + formaterNombre(c.revente) + " k");

    /* Tant qu'aucun prix n'est saisi, il n'y a pas de bilan à annoncer :
       un « 0 k gagnés » laisserait croire que la montée est gratuite. */
    const sansAucunPrix = c.coutIngredients === 0 && c.revente === 0;
    // Un total négatif est un gain : autant l'écrire en toutes lettres
    // plutôt que de laisser lire un « moins » ambigu. Math.abs évite le
    // « -0 » que produit l'opposé de zéro.
    const enKamas = (v, gain, depense) =>
        Math.round(v) <= 0 ? formaterNombre(Math.abs(v)) + gain
                           : formaterNombre(v) + depense;
    ecrire("net", sansAucunPrix ? "—" : enKamas(c.net, " k gagnés", " k à sortir"));
    ecrire("parNiveau", sansAucunPrix ? "—" : enKamas(c.parNiveau, " k gagnés", " k"));

    const elNet = document.querySelector('[data-cout="net"]');
    if (elNet) {
        elNet.classList.toggle("profit-positif", !sansAucunPrix && c.net <= 0);
        elNet.classList.toggle("profit-negatif", !sansAucunPrix && c.net > 0);
    }

    const alerte = $("alertePrix");
    if (alerte) {
        alerte.innerHTML = c.sansPrix > 0
            ? `⚠️ ${c.sansPrix} ingrédient(s) sur ${c.nbIngredients} n'ont pas encore de
               prix : le total ci-dessus est <strong>incomplet</strong>.`
            : `✅ Tous les ingrédients ont un prix : le total est complet.`;
        alerte.className = c.sansPrix > 0 ? "avertissement" : "diagnostic diag-ok";
    }

    for (const [id, qte] of Object.entries(planCourant.ingredientsTotaux)) {
        const el = document.querySelector(`[data-sous-total="${id}"]`);
        if (el) el.textContent = formaterNombre((prix[id] || 0) * qte) + " k";
    }
    for (const palier of planCourant.paliers) {
        const el = document.querySelector(`[data-revente-plan="${palier.recette.id}"]`);
        if (el) el.textContent = formaterNombre((prix[palier.recette.id] || 0) * palier.crafts) + " k";
    }
}

function afficherPlan(depart, cible) {
    const p = planCourant;
    const nomMetier = nomDuMetier($("metierOptim").value);

    const resume = `
        <div class="tableau-bord">
            <div class="carte-stat">
                <span class="stat-valeur">${formaterNombre(p.totalCrafts)}</span>
                <span class="stat-label">crafts au total</span>
            </div>
            <div class="carte-stat">
                <span class="stat-valeur">${formaterNombre(p.xpTotale)}</span>
                <span class="stat-label">XP à gagner</span>
            </div>
            <div class="carte-stat">
                <span class="stat-valeur">${p.paliers.length}</span>
                <span class="stat-label">changements de recette</span>
            </div>
        </div>`;

    const alerte = p.niveauxSansRecette > 0 ? `
        <div class="avertissement">
            ⚠️ Sur ${p.niveauxSansRecette} niveau(x) de ce parcours, aucune recette de
            ${echapper(nomMetier)} n'est réalisable (recette trop grande pour tes cases,
            ou niveau non couvert). Ces niveaux ne sont pas comptés ci-dessus.
        </div>` : "";

    const paliers = p.paliers.map((pal, i) => `
        <div class="palier-plan">
            <div class="plan-numero">${i + 1}</div>
            <div class="plan-corps">
                <div class="plan-niveaux">Du niveau ${pal.deNiveau} au niveau ${pal.auNiveau}</div>
                <div class="plan-recette">
                    ${pal.recette.img ? `<img src="${echapper(pal.recette.img)}" alt="" loading="lazy">`
                                      : `<div class="sans-img"></div>`}
                    <div>
                        <div class="plan-objet">${echapper(pal.recette.nom)}</div>
                        <div class="plan-detail">
                            objet niveau ${pal.recette.niveauObjet} ·
                            ${pal.recette.nbCases} case(s) ·
                            ${pal.horsDomaine ? "≤ " : ""}${formaterNombre(pal.xpParCraft)} XP par craft
                        </div>
                        ${pal.horsDomaine ? `<div class="palier-alerte">
                            ⚠️ Ce métier n'offre rien de plus haut ici : tu crafterais à plus de
                            ${ECART_MESURE} niveaux sous toi, où l'XP réelle est plus basse que
                            l'estimation. Prévois <strong>plus</strong> de crafts que le chiffre affiché.
                        </div>` : ""}
                    </div>
                </div>
            </div>
            <div class="plan-crafts">
                <span class="plan-nombre">${formaterNombre(pal.crafts)}</span>
                <span class="stat-label">crafts</span>
            </div>
            <div class="plan-revente">
                <label>Prix de vente unitaire</label>
                <input type="number" class="prix-input" min="0" placeholder="0"
                       value="${prix[pal.recette.id] || ""}" data-prix-objet="${pal.recette.id}">
                <span class="revente-totale">
                    revente : <strong data-revente-plan="${pal.recette.id}">0 k</strong>
                </span>
            </div>
        </div>`).join("");

    const courses = Object.entries(p.ingredientsTotaux)
        .sort((a, b) => b[1] - a[1])
        .map(([id, qte]) => {
            const obj = cacheObjets[id] || { nom: "Objet #" + id, img: "" };
            const syn = synergiesPlan[id];

            let note = `<span class="syn-neutre">à récolter, acheter ou dropper</span>`;
            if (syn && syn.jePeuxLeFaire) {
                note = `<span class="syn-oui">✅ tu peux le fabriquer :
                    ${echapper(syn.nomMetier)} (ton niv. ${syn.monNiveau})</span>`;
            } else if (syn && syn.monNiveau > 0) {
                note = `<span class="syn-presque">⏳ ${echapper(syn.nomMetier)} le fabrique —
                    il te faut le niveau ${syn.niveauRequis} (tu es ${syn.monNiveau})</span>`;
            } else if (syn) {
                note = `<span class="syn-non">💡 fabriqué par ${echapper(syn.nomMetier)} —
                    un métier que tu n'as pas encore</span>`;
            }

            return `
                <div class="ligne-course">
                    ${obj.img ? `<img src="${echapper(obj.img)}" alt="" loading="lazy">`
                              : `<div class="sans-img"></div>`}
                    <div class="course-infos">
                        <div class="course-nom">${echapper(obj.nom)}</div>
                        <div class="course-synergie">${note}</div>
                        <div class="course-prix">
                            <span class="course-qte">${formaterNombre(qte)} ×</span>
                            <input type="number" class="prix-input" min="0" placeholder="prix u."
                                   value="${prix[id] || ""}" data-prix-objet="${id}">
                            <span class="course-sous-total">
                                = <strong data-sous-total="${id}">0 k</strong>
                            </span>
                        </div>
                    </div>
                </div>`;
        }).join("");

    const nbFabricables = Object.values(synergiesPlan).filter((s) => s.jePeuxLeFaire).length;

    $("resultatOptim").innerHTML = `
        <h3 class="titre-plan">Plan de montée — ${echapper(nomMetier)} :
            niveau ${depart} → ${cible}</h3>

        ${resume}
        ${alerte}

        <div class="bloc">
            <h2>🪜 Ce que tu crafts, palier par palier</h2>
            <p class="explication">
                À chaque niveau, l'outil retient la recette qui rapporte le plus d'XP parmi
                celles que tu peux réellement réaliser. Les niveaux qui utilisent la même
                recette sont regroupés.
            </p>
            ${paliers || `<p class="message-vide">Aucun palier réalisable.</p>`}
        </div>

        <div class="bloc">
            <h2>💸 Ce que va te coûter cette montée</h2>
            <p class="explication">
                Les prix viennent du <strong>carnet partagé</strong> avec l'onglet
                Rentabilité. Monter un métier n'est pas une dépense sèche — les objets
                craftés se revendent, d'où le <strong>bilan net</strong>.
            </p>
            <div class="grille-couts">
                <div class="ligne-cout">
                    <span>Ingrédients à acheter</span>
                    <span class="valeur" data-cout="ingredients">0 k</span>
                </div>
                <div class="ligne-cout">
                    <span>Revente des objets craftés</span>
                    <span class="valeur" data-cout="revente">− 0 k</span>
                </div>
                <div class="ligne-cout ligne-cout-total">
                    <span>Bilan net de la montée</span>
                    <span class="valeur" data-cout="net">0 k</span>
                </div>
                <div class="ligne-cout">
                    <span>Par niveau gagné</span>
                    <span class="valeur" data-cout="parNiveau">0 k</span>
                </div>
            </div>
            <p id="alertePrix" class="avertissement"></p>
            <p class="petite-note">
                💡 Le guide le rappelle : une montée coûteuse peut rester la bonne
                décision si le palier atteint ouvre un produit vendable en continu.
            </p>
        </div>

        <div class="bloc">
            <h2>🛒 Tout ce qu'il te faut réunir</h2>
            <p class="explication">
                Le total des ingrédients pour l'ensemble du parcours.
                ${nbFabricables > 0
                    ? `<strong>${nbFabricables}</strong> d'entre eux sont fabricables par tes
                       propres métiers : autant d'achats en moins.`
                    : `Aucun n'est fabricable par tes métiers actuels — renseigne tes niveaux
                       dans « Mes métiers » pour faire apparaître les synergies.`}
            </p>
            <div class="liste-courses">${courses || ""}</div>
        </div>`;

    rafraichirCoutsPlan();
}

function brancherOptimisation() {
    if (!$("metierOptim")) return;

    $("metierOptim").addEventListener("change", synchroniserNiveauxOptimisation);
    $("calculerPlan").addEventListener("click", calculerPlan);

    // Saisie d'un prix : on met à jour le carnet partagé, puis on recalcule
    // les montants (sans redessiner, pour garder le focus).
    $("resultatOptim").addEventListener("input", (e) => {
        const champ = e.target.closest("[data-prix-objet]");
        if (!champ) return;
        prix[parseInt(champ.dataset.prixObjet, 10)] = parseFloat(champ.value) || 0;
        sauverJSON("dofus_prix", prix);
        rafraichirCoutsPlan();
    });

    surChangementDeNiveau(remplirMetiersOptimisation);
    // Un niveau qui change recoche la frise des paliers, dans l'onglet Méthode.
    surChangementDeNiveau(afficherPaliers);
}


/* ============================================================
   14) LES ONGLETS
   ============================================================ */

/* Les onglets affichés aujourd'hui. Les autres ne sont PAS supprimés : leurs
   sections restent dans la page et leur code continue de tourner, seul leur
   bouton est masqué et on ne peut plus y basculer.
   👉 Pour en remettre un en service, ajoute son nom dans cette liste. C'est la
   seule ligne à toucher — rien d'autre n'a été retiré.
   Noms possibles : recettes · calculette · optim · metiers · plan · recolte · methode */
const ONGLETS_VISIBLES = ["calculette", "tremplin", "metiers"];

function estOngletVisible(nom) {
    return ONGLETS_VISIBLES.includes(nom);
}

function activerOnglet(nom) {
    // Un onglet masqué n'est plus atteignable : on retombe sur le premier visible.
    if (!estOngletVisible(nom)) nom = ONGLETS_VISIBLES[0];

    document.querySelectorAll(".onglet").forEach((b) =>
        b.classList.toggle("actif", b.dataset.onglet === nom));
    document.querySelectorAll(".vue").forEach((v) =>
        { v.hidden = v.dataset.vue !== nom; });
    localStorage.setItem("dofus_onglet", nom);

    // Un prix saisi dans l'onglet Optimisation appartient au même carnet :
    // on redessine les recettes pour qu'il s'affiche ici aussi.
    if (nom === "recettes" && recettesCourantes.length) afficherRecettes();
}

function brancherOnglets() {
    document.querySelectorAll(".onglet").forEach((bouton) => {
        // On masque le bouton des onglets mis de côté (voir ONGLETS_VISIBLES).
        bouton.hidden = !estOngletVisible(bouton.dataset.onglet);
        bouton.addEventListener("click", () => activerOnglet(bouton.dataset.onglet));
    });

    // Les raccourcis posés dans le corps des pages (ex. « saisir tous mes
    // niveaux ») basculent vers l'onglet visé, et remontent en haut : sinon
    // on arrive au milieu de la nouvelle page sans comprendre où on est.
    document.querySelectorAll("[data-va-vers]").forEach((lien) => {
        lien.addEventListener("click", () => {
            activerOnglet(lien.dataset.vaVers);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });
    /* On rouvre l'outil sur le dernier onglet consulté — sauf s'il a été mis
       de côté depuis, auquel cas activerOnglet retombe sur le premier visible. */
    const dernier = localStorage.getItem("dofus_onglet");
    const existe = dernier && document.querySelector(`.onglet[data-onglet="${dernier}"]`);
    activerOnglet(existe ? dernier : ONGLETS_VISIBLES[0]);
}


/* ============================================================
   15) CALCULETTE LIBRE
   ------------------------------------------------------------
   Rien ici ne vient de DofusDB : tous les chiffres sont saisis à
   la main. C'est le pendant de l'onglet Rentabilité pour ce que
   l'API ne connaît pas — un craft absent, un achat-revente, ou
   simplement un prix relevé en jeu qu'on veut vérifier.

   Les crafts chiffrés vivent dans leur propre carnet
   (`dofus_calculette`) : ils ne portent aucun identifiant DofusDB,
   ils ne peuvent donc pas rejoindre `dofus_prix` sans risquer d'y
   écraser le prix d'un vrai objet.
   ============================================================ */

/* Taxe prélevée par l'HDV à la mise en vente, en % du prix affiché.
   Valeur de DÉPART seulement : le champ reste modifiable, parce que le
   taux dépend du mode de vente et n'est pas une constante du jeu. */
const TAXE_HDV_DEFAUT = 2;

/* En dessous de ce pourcentage de marge, le craft est annoncé comme
   « juste » : un ingrédient qui monte un peu, un concurrent qui casse
   le prix, et le bénéfice a disparu. Repère de prudence, pas une
   règle du jeu. */
const MARGE_CONFORTABLE = 15;

// Le tableau comparatif, tel qu'il est enregistré dans le navigateur.
let craftsCompares = chargerJSON("dofus_calculette", []);

/* Le craft en cours de saisie. `id` non nul → on modifie une ligne du tableau.
   Il est relu du navigateur au démarrage : une fiche à moitié remplie survit
   à un rechargement de page, à une fermeture d'onglet, à un téléphone qui met
   le navigateur en veille. Rien de ce qui est tapé ne se perd. */
let calcBrouillon = chargerJSON("dofus_calc_brouillon", null) || calcVierge();

// Remet d'aplomb une fiche relue du navigateur (ancienne version, données abîmées).
function calcNormaliser(brouillon) {
    const propre = { ...calcVierge(), ...(brouillon || {}) };
    if (!Array.isArray(propre.lignes) || !propre.lignes.length) {
        propre.lignes = [{ nom: "", qte: 1, prix: 0 }];
    }
    return propre;
}
calcBrouillon = calcNormaliser(calcBrouillon);

function calcVierge() {
    return {
        id: null,
        // Identifiant DofusDB de l'objet fini, quand le craft vient du jeu.
        // `null` = fiche tapée entièrement à la main.
        resultId: null,
        nom: "",
        // L'icône de l'objet, quand il vient du jeu — on la garde avec la
        // fiche pour que le tableau reste illustré sans rappeler l'API.
        img: "",
        lignes: [{ nom: "", qte: 1, prix: 0 }],
        prixVente: 0,
        ventes30: 0,
        taxePct: TAXE_HDV_DEFAUT
    };
}

/* Lit un nombre tapé à la main. Accepte la virgule décimale, et rend 0
   plutôt que NaN sur un champ vide — sinon le « NaN » se propage dans
   tout le calcul dès qu'une case n'est pas remplie. */
function nombreSaisi(valeur) {
    const n = parseFloat(String(valeur == null ? "" : valeur).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

/* Le calcul, en un seul endroit.
   coût → prix de vente → taxe → ce que je touche vraiment → bénéfice.
   Les trois indicateurs de fin sont ceux de l'onglet Rentabilité (voir
   calculerRatios) : mêmes formules, mêmes conventions, pour que deux
   crafts venus des deux onglets restent comparables. */
function chiffrerCraft(craft) {
    let cout = 0;
    (craft.lignes || []).forEach((l) => {
        cout += nombreSaisi(l.qte) * nombreSaisi(l.prix);
    });

    const prixVente = nombreSaisi(craft.prixVente);
    const taxe = prixVente * (nombreSaisi(craft.taxePct) / 100);
    const netVente = prixVente - taxe;
    const profit = netVente - cout;

    // Marge en % du prix affiché — même convention que l'onglet Rentabilité.
    const margePct = prixVente > 0 ? (profit / prixVente) * 100 : 0;
    const ventesJour = nombreSaisi(craft.ventes30) / 30;

    return {
        cout, prixVente, taxe, netVente, profit, margePct, ventesJour,
        margeJour: profit * ventesJour,
        indice: ventesJour * margePct
    };
}

/* Un craft rangé dans le tableau garde ses propres prix… sauf pour ce que le
   jeu connaît. Dès qu'une ligne porte un identifiant DofusDB, son prix est relu
   dans le carnet commun : corriger le prix du Bois de Frêne quelque part met à
   jour TOUS les crafts qui en utilisent, sans avoir à les rouvrir un par un.
   Une ligne tapée à la main n'a pas d'identifiant : elle garde sa valeur, il
   n'y a rien d'autre à lire. */
function craftAJour(craft) {
    const aJour = { ...craft, lignes: (craft.lignes || []).map((l) => ({ ...l })) };
    aJour.lignes.forEach((l) => {
        if (l.id != null && prix[l.id] != null) l.prix = prix[l.id];
    });
    if (aJour.resultId != null) {
        if (prix[aJour.resultId] != null) aJour.prixVente = prix[aJour.resultId];
        if (ventes[aJour.resultId] != null) aJour.ventes30 = ventes[aJour.resultId];
    }
    return aJour;
}

// Y a-t-il assez de chiffres pour que le verdict veuille dire quelque chose ?
function calcRenseigne(craft) {
    const r = chiffrerCraft(craft);
    return r.cout > 0 || r.prixVente > 0;
}

function verdictDe(r) {
    if (r.profit > 0 && r.margePct >= MARGE_CONFORTABLE) {
        return {
            classe: "verdict-bon",
            titre: "✅ Rentable",
            texte: "Le bénéfice tient même si un prix bouge un peu."
        };
    }
    if (r.profit > 0) {
        return {
            classe: "verdict-juste",
            titre: "⚠️ Rentable, mais de justesse",
            texte: "Moins de " + MARGE_CONFORTABLE + " % de marge : un ingrédient qui monte " +
                   "ou un concurrent qui casse le prix efface le bénéfice."
        };
    }
    if (r.profit === 0) {
        return {
            classe: "verdict-juste",
            titre: "➖ Tu rentres tout juste dans tes frais",
            texte: "Ni gain ni perte — et ton temps de craft n'est pas payé."
        };
    }
    return {
        classe: "verdict-mauvais",
        titre: "❌ Tu perds des kamas",
        texte: "Revendre les ingrédients tels quels rapporterait davantage."
    };
}


/* ---------- Les lignes d'ingrédients ---------- */

/* Redessine la liste complète. À n'appeler QUE sur ajout ou suppression :
   pendant la frappe, refaire le HTML ferait perdre le curseur du champ en
   cours de saisie. */
function afficherLignesCalc() {
    $("calcLignes").innerHTML = calcBrouillon.lignes.map((ligne, i) => {
        /* Une ligne venue du jeu porte l'identifiant DofusDB de l'ingrédient :
           son nom et sa quantité sont ceux de la recette officielle, on ne les
           retouche pas. Il ne reste que le prix à saisir — c'est tout l'intérêt
           de la recherche. Une ligne tapée à la main reste modifiable partout. */
        const duJeu = ligne.id != null;
        const identite = duJeu
            ? `<span class="calc-ing-fixe">${echapper(ligne.nom)}</span>
               <span class="calc-x">×</span>
               <span class="calc-qte-fixe">${echapper(ligne.qte)}</span>`
            : `<input type="text" class="calc-ing-nom" data-champ="nom" placeholder="ingrédient"
                      value="${echapper(ligne.nom)}">
               <span class="calc-x">×</span>
               <input type="number" class="calc-ing-qte" data-champ="qte" min="0" step="1"
                      value="${echapper(ligne.qte)}">`;
        return `
        <div class="calc-ligne${duJeu ? " calc-ligne-jeu" : ""}" data-index="${i}">
            ${identite}
            <span class="calc-x">à</span>
            <input type="number" class="calc-ing-prix" data-champ="prix" min="0" step="1"
                   value="${echapper(ligne.prix)}" placeholder="0">
            <span class="calc-sous-total" data-total="${i}"></span>
            ${duJeu ? `<button type="button" class="calc-ou" data-ou-sert="${ligne.id}"
                    title="Voir les autres crafts qui utilisent cet ingrédient">🔗</button>` : ""}
            <button type="button" class="calc-retirer" data-retirer="${i}"
                    title="Retirer cette ligne">✕</button>
        </div>`;
    }).join("");
    rafraichirCalc();
}


/* ---------- Chercher un craft dans les données du jeu ---------- */

// Au-delà, la liste de propositions devient illisible sur un téléphone.
const CALC_MAX_RESULTATS = 25;

/* Combien de pages de 50 on accepte de parcourir. « potion » correspond à
   114 crafts : en rester à une seule page en cachait la plus grande partie,
   dont la Potion de Vieillesse. Quatre pages couvrent tous les termes courants
   et, au-delà, l'outil le DIT au lieu de tronquer en silence. */
const CALC_PAGES_MAX = 4;

/* Les réponses n'arrivent pas forcément dans l'ordre où on les demande : une
   recherche lancée tôt peut revenir APRÈS une plus récente et écraser ses
   résultats. Chaque recherche porte un numéro ; seule la dernière écrit à
   l'écran. */
let calcNumeroRecherche = 0;

/* Classe un nom par rapport à ce qui a été tapé. Trier par niveau seul mettait
   la Potion de Vieillesse (niveau 95) tout en bas d'une recherche « potion »,
   derrière vingt potions de niveau 20 — puis hors de la liste. Plus le score
   est bas, plus le résultat est pertinent. */
function scorePertinence(nom, saisie, mots) {
    const n = sansAccent(nom);
    const complet = sansAccent(saisie).replace(/\s+/g, " ").trim();

    if (n === complet) return 0;                       // le nom exact
    if (n.startsWith(complet)) return 1;               // commence par ce qu'on a tapé

    // Chaque mot tapé commence un mot du nom (« pot vie » → « Potion de Vieillesse »).
    // Découpage manuel plutôt qu'une expression régulière : la saisie peut
    // contenir des caractères qui auraient un sens dans une regex.
    const motsDuNom = n.split(/[^a-z0-9]+/).filter(Boolean);
    if (mots.every((m) => motsDuNom.some((w) => w.startsWith(m)))) return 2;

    return 3;                                          // les mots sont là, ailleurs
}

/* Renvoie { total, examines, retenus, affiches } plutôt qu'une simple liste :
   l'affichage a besoin de savoir ce qu'il ne montre PAS. */
async function chercherCraftsDuJeu(saisie) {
    const vide = { total: 0, examines: 0, retenus: 0, affiches: [] };
    const mots = sansAccent(saisie).split(/\s+/).filter((m) => m.length >= 2);
    if (!mots.length) return vide;

    /* L'API ne sait chercher qu'UN mot à la fois — « epee boisaille » ne
       renvoie rien du tout. On lui donne le plus long, le plus discriminant,
       et on filtre nous-mêmes sur les autres mots. */
    const pivot = mots.reduce((a, b) => (b.length > a.length ? b : a));

    /* On cherche sur le SLUG, pas sur le nom : le slug est sans accent, donc
       « epee » trouve « Épée de Boisaille ». Sur `resultName.fr`, la recherche
       est accent-sensible et il faudrait taper l'accent au clavier.
       ⚠️ `img` est calculé à partir de `iconId` : sans `iconId` dans le
       $select, l'API renvoie l'image « undefined.png ». */
    const champs = ["id", "name", "level", "iconId", "img", "recipeSlots"]
        .map((c) => "$select[]=" + c).join("&");

    /* `recipeSlots[$gt]=0` fait le tri des objets craftables CÔTÉ SERVEUR :
       « potion » passe de 315 objets à 114 crafts. Sans ça, une page de 50
       objets pouvait ne contenir presque que des ressources brutes, et le
       craft cherché se trouvait au-delà.
       Vérifié dans les deux sens : les ressources brutes sont à 0, les objets
       craftables portent leur nombre d'ingrédients. Ça évite d'interroger
       /recipes pour chaque candidat — cette route renvoie ~15 Ko par recette
       quoi qu'on demande, le $select n'y change rien. */
    const base = "/items?slug.fr[$search]=" + encodeURIComponent(pivot)
        + "&recipeSlots[$gt]=0&lang=fr&" + champs;

    let objets = [];
    let total = 0;
    for (let page = 0; page < CALC_PAGES_MAX; page++) {
        const data = await appelAPI(base + "&$limit=50&$skip=" + page * 50);
        total = data.total ?? 0;
        const lot = data.data || [];
        objets = objets.concat(lot);
        if (!lot.length || objets.length >= total) break;
    }

    const retenus = objets
        // Ceinture et bretelles : si le filtre serveur était un jour ignoré,
        // les ressources brutes ne remonteraient pas pour autant.
        .filter((o) => (o.recipeSlots || 0) > 0)
        .filter((o) => {
            const nom = sansAccent(loc(o.name));
            return mots.every((m) => nom.includes(m));
        })
        .map((o) => ({ objet: o, score: scorePertinence(loc(o.name), saisie, mots) }))
        .sort((a, b) => a.score - b.score
            || (a.objet.level || 0) - (b.objet.level || 0)
            || loc(a.objet.name).localeCompare(loc(b.objet.name), "fr"))
        .map((x) => x.objet);

    return {
        total,                      // crafts portant le mot pivot, d'après l'API
        examines: objets.length,    // ce qu'on a réellement regardé
        retenus: retenus.length,    // ce qui correspond à TOUS les mots tapés
        affiches: retenus.slice(0, CALC_MAX_RESULTATS)
    };
}

function viderResultatsRecherche() { $("calcResultats").innerHTML = ""; }

function messageRecherche(texte) {
    $("calcResultats").innerHTML = `<p class="calc-cherche">${echapper(texte)}</p>`;
}

function afficherResultatsRecherche(resultat) {
    const { affiches, retenus, total, examines } = resultat;
    if (!affiches.length) {
        messageRecherche("Aucun craft ne porte ce nom.");
        return;
    }

    /* Une liste tronquée en silence est un piège : on cherche « potion », on
       ne voit pas la Potion de Vieillesse, et on en conclut qu'elle n'existe
       pas. Tant qu'il reste quelque chose derrière, on le dit. */
    const avertissements = [];
    if (retenus > affiches.length) {
        avertissements.push(`<strong>${retenus} crafts</strong> correspondent — voici les
            ${affiches.length} plus proches de ce que tu as tapé.`);
    }
    if (examines < total) {
        avertissements.push(`Je n'ai regardé que ${examines} des ${total} crafts contenant
            ce mot.`);
    }
    const note = avertissements.length
        ? `<p class="calc-cherche">${avertissements.join(" ")}
               Ajoute un mot pour préciser (ex. « potion vieillesse »).</p>`
        : "";

    $("calcResultats").innerHTML = note + affiches.map((o) => `
        <button type="button" class="calc-resultat" data-ouvrir="${o.id}">
            <img src="${echapper(o.img)}" alt="" class="calc-resultat-img" loading="lazy">
            <span class="calc-resultat-nom">${echapper(loc(o.name))}</span>
            <span class="calc-resultat-niveau">niv. ${o.level || "?"}</span>
        </button>`).join("");
}

/* ---------- « Où sert cet objet ? » ---------- */

/* Au-delà, on télécharge beaucoup pour rien : la route /recipes renvoie ~12 Ko
   par recette quoi qu'on lui demande. Le compte réel est affiché quand il
   dépasse cette limite. */
const CALC_MAX_USAGES = 24;

// Même garde-fou que la recherche : seule la dernière demande écrit à l'écran.
let calcNumeroUsages = 0;

/* Chiffre une recette avec les prix DÉJÀ connus du carnet, sans rien demander
   à l'utilisateur. Sert à répondre « et ce craft-là, il vaut quoi ? » sans
   quitter la fiche en cours. */
function apercuDepuisLeCarnet(recette) {
    const ids = recette.ingredientIds || [];
    const lignes = ids.map((id, i) => ({
        qte: (recette.quantities || [])[i] || 1,
        prix: prix[id] || 0
    }));
    const chiffres = chiffrerCraft({
        lignes,
        prixVente: prix[recette.resultId] || 0,
        ventes30: ventes[recette.resultId] || 0,
        // La taxe réglée en haut de la calculette s'applique aussi ici.
        taxePct: nombreSaisi($("calcTaxe").value) || TAXE_HDV_DEFAUT
    });
    return {
        ...chiffres,
        // Un coût calculé sur des prix manquants est un coût sous-estimé : il
        // faut le dire, sinon l'aperçu ment par omission.
        manquants: ids.filter((id) => !prix[id]).length,
        nbIngredients: ids.length
    };
}

function viderOuSert() { $("calcOuSert").innerHTML = ""; }

function messageOuSert(texte) {
    $("calcOuSert").innerHTML = `<p class="calc-cherche">${echapper(texte)}</p>`;
}

/* Liste les crafts qui consomment cet objet, avec pour chacun ce qu'il coûte
   et ce qu'il se vend d'après le carnet. */
async function afficherOuSert(idObjet, nomConnu) {
    const numero = ++calcNumeroUsages;
    /* Le cache des objets est vidé à chaque rechargement de page : sur une fiche
       relue du navigateur, on n'a que le nom stocké dans la ligne. */
    const nom = nomConnu || (cacheObjets[idObjet] && cacheObjets[idObjet].nom) || "cet objet";
    messageOuSert("Recherche des crafts qui utilisent « " + nom + " »…");
    try {
        const data = await appelAPI("/recipes?ingredientIds[$in][]=" + idObjet
            + "&$limit=" + CALC_MAX_USAGES + "&lang=fr");
        if (numero !== calcNumeroUsages) return;

        const recettes = data.data || [];
        const total = data.total ?? recettes.length;
        if (!recettes.length) {
            messageOuSert("« " + nom + " » n'entre dans aucune recette connue.");
            return;
        }

        const monPrix = prix[idObjet] || 0;
        const lignes = recettes
            .map((r) => ({ recette: r, apercu: apercuDepuisLeCarnet(r) }))
            // Le plus rentable d'abord, mais ceux dont on ignore le prix de
            // vente restent en bas : leur bénéfice affiché ne veut rien dire.
            .sort((a, b) => (b.apercu.prixVente > 0) - (a.apercu.prixVente > 0)
                || b.apercu.profit - a.apercu.profit);

        $("calcOuSert").innerHTML = `
            <div class="ou-sert-entete">
                🔗 <strong>${echapper(nom)}</strong> sert dans
                ${total} craft${total > 1 ? "s" : ""}${total > recettes.length
                    ? ` — les ${recettes.length} premiers` : ""}.
                ${monPrix > 0
                    ? `Tu l'as noté à <strong>${formaterNombre(monPrix)} k</strong> l'unité.`
                    : `Tu n'as pas encore noté son prix.`}
                <button type="button" class="lien-onglet" id="ouSertFermer">fermer</button>
            </div>
            <div class="ou-sert-liste">
                ${lignes.map(({ recette, apercu }) => ligneOuSert(recette, apercu)).join("")}
            </div>
            <p class="petite-note">
                Les coûts viennent de ton carnet de prix. Clique sur un craft pour
                l'ouvrir dans la calculette et compléter ce qui manque.
            </p>`;
    } catch (e) {
        if (numero !== calcNumeroUsages) return;
        console.error(e);
        messageOuSert("❌ Impossible de chercher les crafts. Vérifie ta connexion.");
    }
}

function ligneOuSert(recette, a) {
    const nom = loc(recette.resultName) || ("Objet #" + recette.resultId);
    const coutSur = a.manquants === 0;
    const vendable = a.prixVente > 0;

    const cout = coutSur
        ? formaterNombre(a.cout) + " k"
        : `<span class="cout-partiel" title="${a.manquants} prix d'ingrédient manquant(s)">≥ ${formaterNombre(a.cout)} k</span>`;

    const verdict = vendable
        ? `<span class="${a.profit >= 0 ? "profit-positif" : "profit-negatif"}">
               ${a.profit >= 0 ? "+" : ""}${formaterNombre(a.profit)} k · ${a.margePct.toFixed(1)} %
           </span>${coutSur ? "" : ' <span class="cout-partiel">(au mieux)</span>'}`
        : `<span class="ou-sert-inconnu">prix de vente à renseigner</span>`;

    return `
        <button type="button" class="ou-sert-craft" data-ouvrir="${recette.resultId}">
            <span class="ou-sert-nom">${echapper(nom)}</span>
            <span class="ou-sert-niveau">niv. ${recette.resultLevel || "?"}</span>
            <span class="ou-sert-chiffres">
                craft ${cout} · vente ${vendable ? formaterNombre(a.prixVente) + " k" : "—"}
            </span>
            <span class="ou-sert-verdict">${verdict}</span>
        </button>`;
}


/* Charge la recette officielle et remplit la calculette : les ingrédients et
   leurs quantités sont posés, il ne reste qu'à saisir les prix. */
async function ouvrirCraftDuJeu(idObjet) {
    messageRecherche("Chargement de la recette…");
    try {
        const data = await appelAPI("/recipes?resultId=" + idObjet + "&$limit=1&lang=fr");
        const recette = (data.data || [])[0];
        if (!recette) { messageRecherche("Cet objet n'a finalement pas de recette."); return; }

        await chargerObjets([recette.resultId, ...(recette.ingredientIds || [])]);

        calcBrouillon = {
            id: null,
            resultId: recette.resultId,
            nom: cacheObjets[recette.resultId].nom,
            img: cacheObjets[recette.resultId].img || "",
            lignes: (recette.ingredientIds || []).map((idIng, i) => ({
                id: idIng,
                nom: cacheObjets[idIng].nom,
                qte: (recette.quantities || [])[i] || 1,
                // Carnet partagé : un prix déjà saisi dans un autre onglet revient ici.
                prix: prix[idIng] || 0
            })),
            prixVente: prix[recette.resultId] || 0,
            ventes30: ventes[recette.resultId] || 0,
            // On garde la taxe que l'utilisateur a réglée, il ne la retape pas.
            taxePct: nombreSaisi($("calcTaxe").value) || TAXE_HDV_DEFAUT
        };
        // Une recette sans ingrédient ne doit pas laisser la calculette sans ligne.
        if (!calcBrouillon.lignes.length) calcBrouillon.lignes = [{ nom: "", qte: 1, prix: 0 }];

        chargerBrouillonDansLaPage();
        afficherTableauCompare();
        $("calcRecherche").value = "";
        viderResultatsRecherche();
        // Le panneau « où ça sert » parlait de l'objet précédent : il ne doit
        // pas rester affiché au-dessus d'une autre fiche.
        calcNumeroUsages++;
        viderOuSert();
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
        console.error(e);
        messageRecherche("❌ Impossible de charger la recette. Vérifie ta connexion.");
    }
}


/* ---------- Le résumé et le verdict ---------- */

function rafraichirCalc() {
    const r = chiffrerCraft(calcBrouillon);

    /* On enregistre à chaque frappe. C'est le seul endroit par où passent
       TOUTES les modifications de la fiche : le poser ici garantit qu'aucune
       saisie ne peut échapper à la sauvegarde. */
    sauverJSON("dofus_calc_brouillon", calcBrouillon);

    // Le total de chaque ligne, affiché à droite de sa saisie.
    calcBrouillon.lignes.forEach((ligne, i) => {
        const cible = $("calcLignes").querySelector(`[data-total="${i}"]`);
        if (!cible) return;
        const total = nombreSaisi(ligne.qte) * nombreSaisi(ligne.prix);
        cible.textContent = total > 0 ? "= " + formaterNombre(total) + " k" : "";
    });

    const verdict = $("calcVerdict");
    const detail = $("calcDetail");

    if (!calcRenseigne(calcBrouillon)) {
        verdict.className = "calc-verdict calc-verdict-vide";
        verdict.textContent = "Renseigne au moins un prix pour voir le verdict.";
        detail.innerHTML = "";
        return;
    }

    const v = verdictDe(r);
    verdict.className = "calc-verdict " + v.classe;
    verdict.innerHTML = `
        <div class="verdict-titre">${v.titre}</div>
        <div class="verdict-chiffre">${r.profit >= 0 ? "+" : ""}${formaterNombre(r.profit)} k
            par craft · ${r.margePct.toFixed(1)} % de marge</div>
        <div class="verdict-texte">${v.texte}</div>`;

    const lignes = [
        ["Coût des ingrédients", "− " + formaterNombre(r.cout) + " k", ""],
        ["Prix de vente affiché", formaterNombre(r.prixVente) + " k", ""],
        ["Taxe HDV (" + nombreSaisi(calcBrouillon.taxePct) + " %)",
            "− " + formaterNombre(r.taxe) + " k", ""],
        ["Ce que je touche vraiment", formaterNombre(r.netVente) + " k", ""],
        ["Bénéfice par craft",
            (r.profit >= 0 ? "+" : "") + formaterNombre(r.profit) + " k",
            r.profit >= 0 ? "profit-positif" : "profit-negatif",
            "ligne-benefice"]
    ];

    // Les deux indicateurs du guide n'ont de sens qu'avec un volume de ventes.
    if (r.ventesJour > 0) {
        lignes.push(["Ventes par jour", r.ventesJour.toFixed(1), ""]);
        lignes.push(["Marge journalière", formaterNombre(r.margeJour) + " k",
            r.margeJour >= 0 ? "profit-positif" : "profit-negatif"]);
        lignes.push(["Indice de profitabilité", formaterNombre(r.indice), ""]);
    }

    detail.innerHTML = lignes.map(([nom, valeur, classe, classeLigne]) => `
        <div class="ligne-calcul ${classeLigne || ""}">
            <span>${nom}</span>
            <span class="valeur ${classe}">${valeur}</span>
        </div>`).join("")
        + (r.ventesJour > 0 ? "" : `
        <p class="petite-note">
            💡 Renseigne les ventes sur 30 jours en haut pour obtenir la marge
            journalière et l'indice de profitabilité — les deux chiffres qui
            départagent vraiment deux crafts.
        </p>`);
}


/* ---------- Le tableau comparatif ---------- */

function trierCraftsCompares(liste) {
    const tri = $("calcTri").value;
    const copie = liste.slice();
    if (tri === "nom") {
        copie.sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));
        return copie;
    }
    const cle = { profit: "profit", marge: "margePct", margeJour: "margeJour", indice: "indice" }[tri];
    copie.sort((a, b) => chiffrerCraft(craftAJour(b))[cle] - chiffrerCraft(craftAJour(a))[cle]);
    return copie;
}

function afficherTableauCompare() {
    const corps = $("calcCorps");
    const rien = craftsCompares.length === 0;

    $("calcVide").hidden = !rien;
    document.querySelector(".tableau-scroll").hidden = rien;
    if (rien) { corps.innerHTML = ""; return; }

    corps.innerHTML = trierCraftsCompares(craftsCompares).map((range) => {
        // Les prix du jeu sont relus dans le carnet : le tableau ne peut pas
        // montrer un prix qu'on a corrigé ailleurs entre-temps.
        const craft = craftAJour(range);
        const r = chiffrerCraft(craft);
        const classeProfit = r.profit >= 0 ? "profit-positif" : "profit-negatif";
        // La ligne en cours de modification se repère d'un coup d'œil.
        const enCours = craft.id === calcBrouillon.id ? "ligne-en-modification" : "";
        return `
        <tr class="${enCours}">
            <td class="col-nom">
                ${craft.img
                    ? `<img src="${echapper(craft.img)}" alt="" class="craft-img" loading="lazy">`
                    : `<span class="craft-img craft-img-vide" aria-hidden="true">🧩</span>`}
                <span class="craft-nom">${echapper(craft.nom || "sans nom")}</span>
            </td>
            <td>${formaterNombre(r.cout)}</td>
            <td>${formaterNombre(r.prixVente)}</td>
            <td>${formaterNombre(r.netVente)}</td>
            <td class="${classeProfit}">${r.profit >= 0 ? "+" : ""}${formaterNombre(r.profit)}</td>
            <td class="${classeProfit}">${r.margePct.toFixed(1)} %</td>
            <td>${r.ventesJour > 0 ? formaterNombre(r.margeJour) : "—"}</td>
            <td>${r.ventesJour > 0 ? formaterNombre(r.indice) : "—"}</td>
            <td class="col-actions">
                <button type="button" class="lien-onglet"
                        data-modifier="${echapper(craft.id)}">modifier</button>
                <button type="button" class="lien-onglet lien-danger"
                        data-supprimer="${echapper(craft.id)}">supprimer</button>
            </td>
        </tr>`;
    }).join("");
}


/* ---------- Enregistrer, modifier, supprimer ---------- */

function sauverCraftsCompares() {
    sauverJSON("dofus_calculette", craftsCompares);
    afficherTableauCompare();
}

function chargerBrouillonDansLaPage() {
    $("calcNom").value = calcBrouillon.nom;
    $("calcPrixVente").value = calcBrouillon.prixVente || "";
    $("calcTaxe").value = calcBrouillon.taxePct;
    $("calcVentes").value = calcBrouillon.ventes30 || "";
    $("calcEnregistrer").textContent = calcBrouillon.id ? "Mettre à jour" : "Ajouter au tableau";
    $("calcAnnuler").hidden = !calcBrouillon.id;
    // « Où sert cet objet ? » n'a de sens que pour un objet connu du jeu.
    $("calcOuSertResultat").hidden = calcBrouillon.resultId == null;
    afficherLignesCalc();
}

function enregistrerCraftCompare() {
    if (!calcRenseigne(calcBrouillon)) {
        statut("Renseigne au moins un prix avant d'ajouter le craft au tableau.", "erreur");
        return;
    }
    /* Copie profonde : le brouillon reste vivant après l'enregistrement et
       va continuer d'être modifié — sans copie, on modifierait la ligne
       déjà rangée dans le tableau. */
    const aRanger = JSON.parse(JSON.stringify(calcBrouillon));
    aRanger.nom = (aRanger.nom || "").trim() || "Craft sans nom";

    if (aRanger.id) {
        const i = craftsCompares.findIndex((c) => c.id === aRanger.id);
        if (i >= 0) craftsCompares[i] = aRanger; else craftsCompares.push(aRanger);
    } else {
        aRanger.id = "c" + Date.now() + Math.random().toString(36).slice(2, 6);
        craftsCompares.push(aRanger);
    }

    calcBrouillon = calcVierge();
    chargerBrouillonDansLaPage();
    sauverCraftsCompares();
    statut("« " + aRanger.nom + " » est dans le tableau.", "ok");
}

function modifierCraftCompare(id) {
    const craft = craftsCompares.find((c) => c.id === id);
    if (!craft) return;
    // On rouvre avec les prix à jour, pas avec ceux du jour de l'enregistrement.
    calcBrouillon = JSON.parse(JSON.stringify(craftAJour(craft)));
    if (!calcBrouillon.lignes.length) calcBrouillon.lignes = [{ nom: "", qte: 1, prix: 0 }];
    chargerBrouillonDansLaPage();
    afficherTableauCompare();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function supprimerCraftCompare(id) {
    const craft = craftsCompares.find((c) => c.id === id);
    if (!craft) return;
    if (!confirm("Retirer « " + craft.nom + " » du tableau ?")) return;
    craftsCompares = craftsCompares.filter((c) => c.id !== id);
    // Le formulaire ne doit pas rester pointé sur une ligne qui n'existe plus.
    if (calcBrouillon.id === id) {
        calcBrouillon.id = null;
        chargerBrouillonDansLaPage();
    }
    sauverCraftsCompares();
}


/* ---------- Branchement ---------- */

function brancherCalculette() {
    /* La recherche. On attend une pause dans la frappe : une requête par
       touche saturerait l'API pour rien. */
    let minuteurRecherche;
    $("calcRecherche").addEventListener("input", (e) => {
        clearTimeout(minuteurRecherche);
        const saisie = e.target.value;
        if (sansAccent(saisie).replace(/\s+/g, "").length < 2) {
            calcNumeroRecherche++;   // annule une recherche encore en vol
            viderResultatsRecherche();
            return;
        }
        minuteurRecherche = setTimeout(async () => {
            const numero = ++calcNumeroRecherche;
            messageRecherche("Recherche…");
            try {
                const objets = await chercherCraftsDuJeu(saisie);
                if (numero !== calcNumeroRecherche) return;  // une frappe plus récente a pris la main
                afficherResultatsRecherche(objets);
            } catch (err) {
                if (numero !== calcNumeroRecherche) return;
                console.error(err);
                messageRecherche("❌ Recherche impossible. Vérifie ta connexion.");
            }
        }, 350);
    });

    $("calcResultats").addEventListener("click", (e) => {
        const bouton = e.target.closest("[data-ouvrir]");
        if (bouton) ouvrirCraftDuJeu(parseInt(bouton.dataset.ouvrir, 10));
    });

    // Le panneau « où ça sert » : ouvrir un craft de la liste, ou refermer.
    $("calcOuSert").addEventListener("click", (e) => {
        if (e.target.closest("#ouSertFermer")) { viderOuSert(); return; }
        const craft = e.target.closest("[data-ouvrir]");
        if (craft) ouvrirCraftDuJeu(parseInt(craft.dataset.ouvrir, 10));
    });

    // « Où sert l'objet fini ? » — il peut lui-même être l'ingrédient d'un autre.
    $("calcOuSertResultat").addEventListener("click", () => {
        if (calcBrouillon.resultId != null) {
            afficherOuSert(calcBrouillon.resultId, calcBrouillon.nom);
        }
    });

    // L'en-tête : chaque frappe met le brouillon à jour et recalcule.
    const champs = {
        calcNom: "nom",
        calcPrixVente: "prixVente",
        calcTaxe: "taxePct",
        calcVentes: "ventes30"
    };
    Object.entries(champs).forEach(([idChamp, propriete]) => {
        $(idChamp).addEventListener("input", (e) => {
            calcBrouillon[propriete] =
                propriete === "nom" ? e.target.value : nombreSaisi(e.target.value);
            /* Quand le craft vient du jeu, il a un identifiant DofusDB : son prix
               de vente et son volume rejoignent le carnet commun, celui que lit
               l'onglet ⚒️ Recettes & rentabilité. Une fiche tapée à la main n'a
               pas d'identifiant et ne peut donc rien y écraser. */
            if (calcBrouillon.resultId != null) {
                if (propriete === "prixVente") {
                    prix[calcBrouillon.resultId] = calcBrouillon.prixVente;
                    sauverJSON("dofus_prix", prix);
                }
                if (propriete === "ventes30") {
                    ventes[calcBrouillon.resultId] = calcBrouillon.ventes30;
                    sauverJSON("dofus_ventes", ventes);
                }
            }
            rafraichirCalc();
        });
    });

    /* Les lignes d'ingrédients sont recréées en permanence : on écoute la
       ZONE qui les contient, pas chaque champ. Un écouteur posé sur un champ
       disparaîtrait avec lui au premier ajout de ligne. */
    $("calcLignes").addEventListener("input", (e) => {
        const ligne = e.target.closest(".calc-ligne");
        if (!ligne) return;
        const i = Number(ligne.dataset.index);
        const champ = e.target.dataset.champ;
        if (!champ || !calcBrouillon.lignes[i]) return;
        calcBrouillon.lignes[i][champ] =
            champ === "nom" ? e.target.value : nombreSaisi(e.target.value);
        // Même carnet partagé, pour les ingrédients cette fois.
        if (champ === "prix" && calcBrouillon.lignes[i].id != null) {
            prix[calcBrouillon.lignes[i].id] = calcBrouillon.lignes[i].prix;
            sauverJSON("dofus_prix", prix);
        }
        rafraichirCalc();
    });

    $("calcLignes").addEventListener("click", (e) => {
        // 🔗 « où sert cet ingrédient ? »
        const ouSert = e.target.closest("[data-ou-sert]");
        if (ouSert) {
            const i = Number(ouSert.closest(".calc-ligne").dataset.index);
            const ligne = calcBrouillon.lignes[i] || {};
            afficherOuSert(parseInt(ouSert.dataset.ouSert, 10), ligne.nom);
            return;
        }

        const bouton = e.target.closest("[data-retirer]");
        if (!bouton) return;
        calcBrouillon.lignes.splice(Number(bouton.dataset.retirer), 1);
        // Jamais zéro ligne : sinon il n'y a plus nulle part où taper.
        if (!calcBrouillon.lignes.length) calcBrouillon.lignes.push({ nom: "", qte: 1, prix: 0 });
        afficherLignesCalc();
    });

    $("calcAjouterLigne").addEventListener("click", () => {
        calcBrouillon.lignes.push({ nom: "", qte: 1, prix: 0 });
        afficherLignesCalc();
        // Le curseur va tout seul dans la ligne qui vient d'apparaître.
        const derniere = $("calcLignes").lastElementChild;
        if (derniere) derniere.querySelector(".calc-ing-nom").focus();
    });

    $("calcEnregistrer").addEventListener("click", enregistrerCraftCompare);

    $("calcAnnuler").addEventListener("click", () => {
        calcBrouillon = calcVierge();
        chargerBrouillonDansLaPage();
        afficherTableauCompare();
    });

    $("calcVider").addEventListener("click", () => {
        const id = calcBrouillon.id;   // on reste sur la même ligne si on la modifiait
        calcBrouillon = calcVierge();
        calcBrouillon.id = id;
        chargerBrouillonDansLaPage();
    });

    $("calcTri").addEventListener("change", (e) => {
        localStorage.setItem("dofus_calc_tri", e.target.value);
        afficherTableauCompare();
    });

    $("calcToutEffacer").addEventListener("click", () => {
        if (!craftsCompares.length) return;
        if (!confirm("Effacer les " + craftsCompares.length + " crafts du tableau ?")) return;
        craftsCompares = [];
        sauverCraftsCompares();
    });

    // Modifier / supprimer : même raison qu'au-dessus, on écoute le corps du tableau.
    $("calcCorps").addEventListener("click", (e) => {
        const modif = e.target.closest("[data-modifier]");
        if (modif) { modifierCraftCompare(modif.dataset.modifier); return; }
        const suppr = e.target.closest("[data-supprimer]");
        if (suppr) supprimerCraftCompare(suppr.dataset.supprimer);
    });

    const triRetenu = localStorage.getItem("dofus_calc_tri");
    if (triRetenu && $("calcTri").querySelector(`[value="${triRetenu}"]`)) {
        $("calcTri").value = triRetenu;
    }

    chargerBrouillonDansLaPage();
    afficherTableauCompare();
}


/* ============================================================
   16) TREMPLIN — craft ou brisage ?
   ------------------------------------------------------------
   Part des niveaux saisis dans 🛠️ Mes métiers, liste ce que je peux
   fabriquer, et met en regard trois chiffres : ce que le craft coûte
   (carnet de prix), ce qu'il se vend (carnet), et ce qu'il vaut brisé
   (runes × prix de mes runes).

   Le brisage ne dépend d'AUCUN prix d'ingrédient : il ne tient qu'aux
   statistiques de l'objet et au prix des runes. La colonne « brisage »
   est donc utile dès le premier jour, quand le carnet est encore vide.

   Les formules vivent dans `brisage.js`. Ici, on ne fait que collecter
   les données et afficher.
   ============================================================ */

/* Le référentiel : poids de chaque caractéristique, et quelle rune
   correspond à quel effet. Les deux viennent de l'API et ne changent
   qu'aux mises à jour du jeu — on les garde en mémoire du navigateur
   plutôt que de les retélécharger à chaque visite. */
let refBrisage = chargerJSON("dofus_ref_brisage", null);

// Prix des runes du serveur, saisis à la main : { effectId: prix }.
const prixRunes = chargerJSON("dofus_prix_runes", {});

// Statistiques des objets, par identifiant : { idObjet: [effets] }.
const statsObjets = {};

// Le dernier calcul, pour pouvoir retrier sans tout recommencer.
let tremplinLignes = [];

function coefficientBrisage() {
    const v = nombreSaisi($("tremplinCoef").value);
    return v > 0 ? v : 100;
}

function modeDeJet() {
    return $("tremplinJet").value || "moy";
}


/* ---------- Le référentiel ---------- */

/* À incrémenter dès que la FORME du référentiel change : un navigateur qui a
   gardé l'ancienne version la retélécharge alors tout seul, sans que personne
   ait à vider son cache. (Version 2 : poids arrondis à la réception.
   Version 3 : chaque rune porte aussi sa VALEUR, indispensable au
   calcul recalé sur DoFocus — voir l'en-tête de `brisage.js`.) */
const VERSION_REF_BRISAGE = 3;

async function chargerReferentielBrisage() {
    if (refBrisage && refBrisage.poids && refBrisage.runes
        && refBrisage.version === VERSION_REF_BRISAGE) return refBrisage;

    statutTremplin("Chargement des poids de caractéristiques…");
    /* `effectPowerRate` EST le poids de brisage : recoupé avec la table
       connue de la communauté (Vitalité 0,2 · Pods 0,25 · Sagesse 3 ·
       Portée 51 · PM 90 · PA 100). Attention, c'est un nombre décimal —
       une lecture entière écraserait la Vitalité à 0. */
    const poids = {};
    for (let saut = 0; saut < 1200; saut += 50) {
        const d = await appelAPI("/effects?$limit=50&$skip=" + saut + "&lang=fr"
            + "&$select[]=id&$select[]=effectPowerRate");
        const lot = d.data || [];
        lot.forEach((e) => {
            /* L'API stocke ces poids en flottant 32 bits : la Vitalité, qui
               vaut exactement 0,2, revient en « 0.20000000298023224 ». On
               arrondit à la réception — sinon ce bruit s'affiche tel quel
               dans l'interface et traîne dans tous les calculs. */
            if ((e.effectPowerRate || 0) > 0) {
                poids[e.id] = Math.round(e.effectPowerRate * 10000) / 10000;
            }
        });
        if (!lot.length || saut + 50 >= (d.total ?? 0)) break;
    }

    statutTremplin("Chargement des runes…");
    /* Chaque rune est un objet du jeu qui PORTE l'effet qu'elle
       représente : Rune Ga Pa → effet 111 (PA), Rune Ré Per Feu →
       effet 213 (% Résistance Feu). La correspondance est donc lue
       dans les données, jamais déduite des abréviations du nom.

       La rune porte aussi sa VALEUR — le nombre de points qu'elle
       donne : une Rune Vi vaut 5 vitalité, une Rune Ini 10 initiative,
       une Rune Pod 10 pods, toutes les autres 1. C'est `diceNum` de
       son propre effet. Sans cette valeur, la conversion d'un poids en
       nombre de runes est fausse d'un facteur 5 ou 10 — c'est
       exactement le bug que le recalage sur DoFocus a corrigé. */
    const runes = {};
    const d = await appelAPI("/items?slug.fr[$search]=rune&$limit=300&lang=fr"
        + "&$select[]=id&$select[]=name&$select[]=possibleEffects");
    for (const o of d.data || []) {
        const nom = loc(o.name);
        // On ne garde que les runes de base : « Rune Pa X » et « Rune Ra X »
        // sont des paliers supérieurs, qui s'obtiennent en fusionnant.
        if (!/^Rune /.test(nom) || /^Rune (Pa|Ra) /.test(nom)) continue;
        const effet = (o.possibleEffects || [])[0];
        if (!effet || effet.effectId == null) continue;
        // Sans poids connu, la rune ne peut pas entrer dans un calcul.
        if (!poids[effet.effectId]) continue;
        const valeur = effet.diceNum > 0 ? effet.diceNum : 1;
        runes[effet.effectId] = {
            id: o.id, nom, valeur,
            // Le poids d'UNE rune : c'est par lui qu'on divise.
            poidsRune: Math.round(poids[effet.effectId] * valeur * 10000) / 10000
        };
    }

    refBrisage = { version: VERSION_REF_BRISAGE,
                   date: new Date().toISOString().slice(0, 10), poids, runes };
    sauverJSON("dofus_ref_brisage", refBrisage);
    return refBrisage;
}


/* ---------- Les statistiques des objets ---------- */

/* Les effets alourdissent beaucoup la réponse (≈ 2,6 Ko par objet) :
   on ne les demande que pour les objets qu'on va vraiment afficher, et
   une seule fois grâce au cache. */
async function chargerStatsObjets(ids) {
    const manquants = ids.filter((id) => !(id in statsObjets));
    for (let i = 0; i < manquants.length; i += 50) {
        const lot = manquants.slice(i, i + 50);
        const query = lot.map((id) => "id[$in][]=" + id).join("&");
        const d = await appelAPI("/items?" + query + "&$limit=50&lang=fr"
            + "&$select[]=id&$select[]=possibleEffects");
        for (const o of d.data || []) statsObjets[o.id] = o.possibleEffects || [];
        statutTremplin("Statistiques : " + Math.min(i + 50, manquants.length)
            + " / " + manquants.length + " objets…");
    }
    // Ce qui n'est pas revenu ne doit pas être redemandé en boucle.
    ids.forEach((id) => { if (!(id in statsObjets)) statsObjets[id] = []; });
}

/* Transforme les effets bruts d'un objet en lignes exploitables par
   `brisage.js` : on ne garde que ce qui donne réellement une rune. */
function lignesDeBrisage(idObjet, niveau) {
    const mode = modeDeJet();
    return (statsObjets[idObjet] || [])
        .map((e) => {
            const rune = refBrisage.runes[e.effectId];
            return {
                effectId: e.effectId,
                valeur: jetRetenu(e, mode),
                // Le minimum de l'intervalle : c'est lui qui dit si la ligne
                // est un malus, pas le jet retenu.
                jetMin: e.diceNum || 0,
                poidsRune: refBrisage.poids[e.effectId] || 0,
                valeurRune: rune ? rune.valeur : 1,
                niveau
            };
        })
        /* Une caractéristique sans rune correspondante (dommages d'arme,
           effets de sort…) ne produit rien au brisage.

           ⚠️ Limite connue : les MALUS (« −3 PA ») portent chez DofusDB un
           effectId à eux, distinct de celui du gain, et aucune rune ne les
           porte — ils sont donc écartés ici et n'atteignent jamais le
           calcul. DoFocus, lui, les compte en négatif dans le total d'un
           focus. Nos totaux de focus sont donc légèrement optimistes sur
           les objets qui portent un malus. `brisage.js` sait déjà les
           traiter : il ne manque que la correspondance malus → rune. */
        .filter((l) => l.valeur > 0 && l.poidsRune > 0 && refBrisage.runes[l.effectId]);
}


/* ---------- Le calcul ---------- */

function statutTremplin(texte) {
    $("tremplinStatut").textContent = texte || "";
}

async function calculerTremplin() {
    const bouton = $("tremplinCalculer");
    bouton.disabled = true;
    $("tremplinResultat").innerHTML = "";
    try {
        await chargerReferentielBrisage();

        const metiers = mesMetiersCommences();
        if (!metiers.length) {
            statutTremplin("");
            $("tremplinResultat").innerHTML = `<p class="message-vide">
                Renseigne d'abord le niveau d'au moins un métier dans
                <strong>🛠️ Mes métiers</strong>.</p>`;
            return;
        }

        const lignes = [];
        const idsAStatuer = [];
        for (const m of metiers) {
            const niveauMetier = niveauDuMetier(m.id);
            statutTremplin("Recettes de " + nomDuMetier(m.id) + "…");
            const recettes = await recupererRecettesDuMetier(m.id);
            for (const r of recettes) {
                const objet = cacheObjets[r.resultId] || {};
                const niveauObjet = objet.niveau || r.resultLevel || 0;
                // « Ce que je peux fabriquer » : la recette doit être à ma portée.
                if (niveauObjet > niveauMetier) continue;
                lignes.push({
                    recette: r,
                    idObjet: r.resultId,
                    nom: objet.nom || ("Objet #" + r.resultId),
                    niveau: niveauObjet,
                    metier: nomDuMetier(m.id)
                });
                idsAStatuer.push(r.resultId);
            }
        }

        if (!lignes.length) {
            statutTremplin("");
            $("tremplinResultat").innerHTML = `<p class="message-vide">
                Aucune recette à ta portée pour l'instant. Monte un métier, ou
                corrige tes niveaux dans 🛠️ Mes métiers.</p>`;
            return;
        }

        await chargerStatsObjets(idsAStatuer);

        const coef = coefficientBrisage();
        tremplinLignes = lignes.map((l) => {
            const brisage = meilleurBrisage(
                lignesDeBrisage(l.idObjet, l.niveau), prixRunes, coef);
            const cout = coutDeLaRecette(l.recette);
            const prixVente = prix[l.idObjet] || 0;
            return { ...l, brisage, ...cout, prixVente };
        });

        statutTremplin("");
        afficherTremplin();
    } catch (e) {
        console.error(e);
        statutTremplin("");
        $("tremplinResultat").innerHTML = `<p class="message-vide">
            ❌ Le calcul a échoué. Vérifie ta connexion et réessaie.</p>`;
    } finally {
        bouton.disabled = false;
    }
}

/* Coût d'une recette d'après le carnet. Comme ailleurs dans l'outil, un
   coût auquel il manque des prix est un MINIMUM, et on le dit. */
function coutDeLaRecette(recette) {
    const ids = recette.ingredientIds || [];
    let cout = 0;
    let manquants = 0;
    ids.forEach((id, i) => {
        const p = prix[id] || 0;
        if (!p) manquants++;
        cout += p * ((recette.quantities || [])[i] || 1);
    });
    return { cout, coutManquants: manquants, nbIngredients: ids.length };
}


/* ---------- L'affichage ---------- */

function trierTremplin(lignes) {
    const tri = $("tremplinTri").value;
    const copie = lignes.slice();
    const gain = (l) => Math.max(l.brisage.meilleur.total, l.prixVente) - l.cout;
    const cles = {
        brisage: (l) => l.brisage.meilleur.total,
        vente: (l) => l.prixVente,
        gain: gain,
        niveau: (l) => l.niveau
    };
    if (tri === "nom") {
        copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
        return copie;
    }
    const cle = cles[tri] || cles.brisage;
    copie.sort((a, b) => cle(b) - cle(a));
    return copie;
}

function afficherTremplin() {
    if (!tremplinLignes.length) return;

    const sansPrix = Object.keys(refBrisage.runes)
        .filter((e) => !prixRunes[e]).length;
    const avertissement = sansPrix
        ? `<p class="calc-cherche">⚠️ ${sansPrix} runes n'ont pas encore de prix :
               les valeurs de brisage ci-dessous sont des <strong>minimums</strong>.
               Renseigne-les dans le tableau des runes au-dessus.</p>`
        : "";

    const lignes = trierTremplin(tremplinLignes);
    $("tremplinResultat").innerHTML = avertissement + `
        <div class="tableau-scroll">
            <table class="tableau-compare tableau-tremplin">
                <thead><tr>
                    <th>Objet</th><th>Niv.</th><th>Métier</th>
                    <th>Craft</th><th>Vente</th><th>Brisage</th>
                    <th>Focus</th><th>Que faire ?</th>
                </tr></thead>
                <tbody>${lignes.map(ligneTremplin).join("")}</tbody>
            </table>
        </div>
        <p class="petite-note">
            ${lignes.length} crafts à ta portée · coefficient ${coefficientBrisage()} %
            · jet ${{ min: "minimum", moy: "moyen", max: "maximum" }[modeDeJet()]}.
            Le brisage est une <strong>estimation</strong> (voir l'encart plus bas).
        </p>`;
}

function ligneTremplin(l) {
    const b = l.brisage;
    const brisage = b.meilleur.total;
    const coutSur = l.coutManquants === 0 && l.cout > 0;

    // Que faire de cet objet ? On ne tranche que si on a de quoi comparer.
    let verdict;
    if (!brisage && !l.prixVente) {
        verdict = `<span class="ou-sert-inconnu">à renseigner</span>`;
    } else if (brisage > l.prixVente) {
        verdict = `<span class="profit-positif">✨ briser</span>`;
    } else {
        verdict = `<span class="tremplin-vendre">vendre</span>`;
    }

    /* Avec ou sans focus ? C'est la question pratique du brisage. On ne
       conseille le focus que s'il rapporte VRAIMENT plus, et on dit sur
       quelle caractéristique. */
    let focus;
    if (!b.focus) {
        focus = `<span class="ou-sert-inconnu">—</span>`;
    } else if (b.gainDuFocus > 0) {
        const rune = refBrisage.runes[b.focus.effectId];
        focus = `<span class="profit-positif">${echapper(rune ? rune.nom : "?")}</span>
                 <span class="tremplin-ecart">+${formaterNombre(b.gainDuFocus)} k</span>`;
    } else {
        focus = `<span class="tremplin-vendre">sans focus</span>`;
    }

    return `
    <tr>
        <td class="col-nom">${echapper(l.nom)}</td>
        <td>${l.niveau}</td>
        <td class="tremplin-metier">${echapper(l.metier)}</td>
        <td>${l.cout > 0
            ? (coutSur ? formaterNombre(l.cout)
                       : `<span class="cout-partiel" title="${l.coutManquants} prix manquant(s)">≥ ${formaterNombre(l.cout)}</span>`)
            : "—"}</td>
        <td>${l.prixVente > 0 ? formaterNombre(l.prixVente) : "—"}</td>
        <td>${brisage > 0 ? formaterNombre(brisage) : "—"}</td>
        <td>${focus}</td>
        <td>${verdict}</td>
    </tr>`;
}


/* ---------- Le prix de mes runes ---------- */

function afficherPrixRunes() {
    const zone = $("tremplinRunes");
    if (!refBrisage || !refBrisage.runes) {
        zone.innerHTML = `<p class="calc-cherche">
            La liste des runes se charge au premier calcul.</p>`;
        return;
    }
    const entrees = Object.entries(refBrisage.runes)
        /* On affiche le poids d'UNE RUNE, pas celui d'un point : c'est
           celui qui compte dans le calcul, et c'est celui que donne la
           référence du domaine (Rune Vi 1, Rune Ini 1, Rune Ga Pa 100). */
        .map(([effectId, r]) => ({
            effectId, ...r,
            poids: r.poidsRune != null
                ? r.poidsRune
                : (refBrisage.poids[effectId] || 0) * (r.valeur || 1)
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

    const remplies = entrees.filter((e) => prixRunes[e.effectId] > 0).length;
    zone.innerHTML = `
        <p class="petite-note">
            ${remplies} / ${entrees.length} runes renseignées.
            Relève-les dans l'HDV de ton serveur — une rune sans prix est
            <strong>ignorée</strong> dans les calculs, jamais devinée.
        </p>
        <div class="grille-runes">
            ${entrees.map((e) => `
                <label class="rune-ligne${prixRunes[e.effectId] > 0 ? " rune-remplie" : ""}">
                    <span class="rune-nom">${echapper(e.nom)}</span>
                    <span class="rune-poids"
                          title="poids d'une rune${e.valeur > 1 ? ` — elle donne ${e.valeur} points` : ""}">${e.poids}</span>
                    <input type="number" min="0" step="1" class="prix-input"
                           data-prix-rune="${e.effectId}"
                           value="${prixRunes[e.effectId] || ""}" placeholder="0">
                </label>`).join("")}
        </div>`;
}


/* ---------- Branchement ---------- */

function brancherTremplin() {
    $("tremplinCalculer").addEventListener("click", calculerTremplin);
    $("tremplinTri").addEventListener("change", afficherTremplin);

    // Coefficient et mode de jet : on retient le réglage, et on refait le
    // calcul du brisage sans redemander les recettes à l'API.
    ["tremplinCoef", "tremplinJet"].forEach((id) => {
        $(id).addEventListener("input", () => {
            localStorage.setItem("dofus_" + id, $(id).value);
            recalculerBrisageTremplin();
        });
        const retenu = localStorage.getItem("dofus_" + id);
        if (retenu) $(id).value = retenu;
    });

    // Les prix de runes : un seul écouteur pour toute la grille.
    $("tremplinRunes").addEventListener("input", (e) => {
        const champ = e.target.closest("[data-prix-rune]");
        if (!champ) return;
        const effectId = champ.dataset.prixRune;
        const valeur = nombreSaisi(champ.value);
        if (valeur > 0) prixRunes[effectId] = valeur; else delete prixRunes[effectId];
        sauverJSON("dofus_prix_runes", prixRunes);
        champ.closest(".rune-ligne").classList.toggle("rune-remplie", valeur > 0);
        recalculerBrisageTremplin();
    });

    $("tremplinRecharger").addEventListener("click", async () => {
        if (!confirm("Retélécharger les poids et la liste des runes depuis DofusDB ?")) return;
        refBrisage = null;
        localStorage.removeItem("dofus_ref_brisage");
        await chargerReferentielBrisage();
        afficherPrixRunes();
        statutTremplin("Référentiel rechargé.");
    });

    afficherPrixRunes();
}

/* Un prix de rune ou un coefficient qui change ne demande AUCUN appel
   réseau : les statistiques des objets sont déjà en mémoire. On refait
   juste les calculs. */
function recalculerBrisageTremplin() {
    if (!tremplinLignes.length || !refBrisage) return;
    const coef = coefficientBrisage();
    tremplinLignes = tremplinLignes.map((l) => ({
        ...l,
        brisage: meilleurBrisage(lignesDeBrisage(l.idObjet, l.niveau), prixRunes, coef)
    }));
    afficherTremplin();
}

/* ============================================================
   8) DÉMARRAGE
   ============================================================ */

brancherOnglets();
brancherEvenements();
brancherMesMetiers();
brancherOptimisation();
brancherPlan();
brancherRecolte();
brancherCalculette();
brancherTremplin();
afficherMethode();
rafraichirTableauBord();
chargerMetiers();
