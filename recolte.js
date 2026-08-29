/* ============================================================
   Métier Dofus — Onglet Récolte
   ------------------------------------------------------------
   Deux choses ici :

   1. QUOI récolter à chaque niveau. Fiable : DofusDB expose les
      compétences de récolte, avec le métier, le niveau requis et
      la ressource obtenue.

   2. OÙ, et dans quel ORDRE. Le lien « telle ressource sur telle
      map » n'existe dans aucune source ouverte : il vit dans les
      fichiers de map du jeu. L'outil tente donc de l'obtenir de
      DofusDB ; à défaut, tu colles les coordonnées en une fois et
      l'outil calcule tout seul le trajet le plus court.
      Des coordonnées inventées feraient tourner en rond : il n'y
      en a aucune d'écrite en dur ici.
   ============================================================ */

// Les métiers de récolte de Dofus.
const METIERS_RECOLTE = [
    "Paysan", "Bûcheron", "Alchimiste", "Mineur", "Pêcheur", "Chasseur"
];

// Tranches de niveau utilisées pour organiser la progression.
const TRANCHES = [
    { min: 1,   max: 20 },  { min: 21,  max: 40 },
    { min: 41,  max: 60 },  { min: 61,  max: 80 },
    { min: 81,  max: 100 }, { min: 101, max: 120 },
    { min: 121, max: 140 }, { min: 141, max: 160 },
    { min: 161, max: 180 }, { min: 181, max: 200 }
];

/* ------------------------------------------------------------
   Les compétences de récolte.
   Les noms de champs sont ceux des données du jeu :
   parentJobId (le métier), gatheredRessourceItem (la ressource
   obtenue), levelMin (le niveau requis), interactiveId (l'objet
   à récolter sur la map).
   ------------------------------------------------------------ */
const PISTES_RECOLTE = [
    { nom: "skills?parentJobId", url: (id) => "/skills?parentJobId=" + id + "&$limit=200&lang=fr" },
    { nom: "skills?jobId",       url: (id) => "/skills?jobId=" + id + "&$limit=200&lang=fr" }
];

const CHAMP_RESSOURCE  = ["gatheredRessourceItem", "gatheredRessourceItemId", "gatheredResourceItem"];
const CHAMP_NIVEAU     = ["levelMin", "level", "minLevel"];
const CHAMP_INTERACTIF = ["interactiveId", "interactive"];

/* ------------------------------------------------------------
   Pistes pour retrouver les maps où pousse une ressource.
   Ces chemins ne sont pas documentés publiquement : on les
   essaie, et on n'affiche un trajet automatique que si l'un
   d'eux répond vraiment.
   ------------------------------------------------------------ */
const PISTES_MAPS = [
    { nom: "map-positions?interactive", url: (i) => "/map-positions?interactiveId=" + i + "&$limit=200" },
    { nom: "interactives?id",           url: (i) => "/interactives?id=" + i + "&$limit=200" },
    { nom: "maps?interactive",          url: (i) => "/maps?interactiveId=" + i + "&$limit=200" }
];

// Cherche la première valeur présente parmi plusieurs noms de champs.
function premierChamp(objet, noms) {
    for (const n of noms) {
        if (objet && objet[n] != null) return objet[n];
    }
    return null;
}

/* ------------------------------------------------------------
   Calcul du trajet le plus court.
   On se déplace de map en map sur une grille : la distance
   entre deux maps est donc |Δx| + |Δy| (distance de Manhattan).
   Méthode du « plus proche voisin » : depuis la map courante,
   on va toujours à la plus proche non encore visitée. Simple,
   rapide, et très efficace sur ce type de trajet.
   ------------------------------------------------------------ */
function distanceMaps(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function optimiserTrajet(etapes) {
    if (etapes.length < 3) return etapes.slice();

    const restantes = etapes.slice();
    const trajet = [restantes.shift()]; // on part de la première map saisie

    while (restantes.length) {
        const derniere = trajet[trajet.length - 1];
        let meilleure = 0;
        let meilleureDist = Infinity;
        restantes.forEach((e, i) => {
            const d = distanceMaps(derniere, e);
            if (d < meilleureDist) { meilleureDist = d; meilleure = i; }
        });
        trajet.push(restantes.splice(meilleure, 1)[0]);
    }
    return trajet;
}

// Longueur totale d'un trajet, en comptant le retour au départ (boucle).
function longueurTrajet(etapes) {
    if (etapes.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < etapes.length - 1; i++) total += distanceMaps(etapes[i], etapes[i + 1]);
    total += distanceMaps(etapes[etapes.length - 1], etapes[0]); // boucle
    return total;
}

/* ------------------------------------------------------------
   Lecture d'un collage de coordonnées.
   Accepte à peu près tout : « -2,13 » « [3,-5] » « 1;4 »
   « -2 13 », séparés par des virgules, des sauts de ligne ou
   des barres obliques.
   ------------------------------------------------------------ */
function lireCoordonnees(texte) {
    const trouvees = [];
    // Chaque paire de nombres (éventuellement négatifs) forme une map.
    const motif = /(-?\d+)\s*[,;: ]\s*(-?\d+)/g;
    let m;
    while ((m = motif.exec(texte)) !== null) {
        trouvees.push({ x: Number(m[1]), y: Number(m[2]), note: "" });
    }
    return trouvees;
}
