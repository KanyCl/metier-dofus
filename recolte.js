/* ============================================================
   Métier Dofus — Que récolter
   ------------------------------------------------------------
   Sert à répondre à une seule question : à mon niveau, quelle
   ressource dois-je récolter pour progresser le plus vite ?

   Le « où » (quelle ressource sur quelle map, en quelle
   quantité) n'existe dans aucune base ouverte : c'est une
   donnée construite par les joueurs sur des sites comme
   dofus-map.com. Elle n'est donc pas reproduite ici, et
   surtout pas inventée.
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
   Les compétences de récolte, telles que les nomment les
   données du jeu : parentJobId (le métier), levelMin (le niveau
   requis), gatheredRessourceItem (la ressource obtenue).
   ------------------------------------------------------------ */
const PISTES_RECOLTE = [
    { nom: "skills?parentJobId", url: (id) => "/skills?parentJobId=" + id + "&$limit=200&lang=fr" },
    { nom: "skills?jobId",       url: (id) => "/skills?jobId=" + id + "&$limit=200&lang=fr" }
];

const CHAMP_RESSOURCE = ["gatheredRessourceItem", "gatheredRessourceItemId", "gatheredResourceItem"];
const CHAMP_NIVEAU    = ["levelMin", "level", "minLevel"];

// Cherche la première valeur présente parmi plusieurs noms de champs.
function premierChamp(objet, noms) {
    for (const n of noms) {
        if (objet && objet[n] != null) return objet[n];
    }
    return null;
}
