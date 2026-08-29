/* ============================================================
   Métier Dofus — Onglet Récolte
   ------------------------------------------------------------
   Objectif : savoir QUOI récolter à chaque tranche de niveau,
   et se construire un trajet de récolte réutilisable.

   ⚠️ Important : les positions des maps ne sont PAS inventées
   ici. Elles viennent soit de l'API DofusDB (si elle les
   expose), soit de toi via le carnet de trajets. Un trajet
   inventé ferait tourner en rond en jeu.
   ============================================================ */

// Les métiers de récolte de Dofus. On les reconnaît par leur nom,
// car l'API ne distingue pas « récolte » et « craft ».
const METIERS_RECOLTE = [
    "Paysan", "Bûcheron", "Alchimiste", "Mineur", "Pêcheur", "Chasseur"
];

// Les tranches de niveau utilisées pour organiser la progression.
const TRANCHES = [
    { min: 1,   max: 20 },
    { min: 21,  max: 40 },
    { min: 41,  max: 60 },
    { min: 61,  max: 80 },
    { min: 81,  max: 100 },
    { min: 101, max: 120 },
    { min: 121, max: 140 },
    { min: 141, max: 160 },
    { min: 161, max: 180 },
    { min: 181, max: 200 }
];

/* ------------------------------------------------------------
   Pistes d'exploration de l'API.
   Je n'ai pas pu vérifier depuis mon environnement quel chemin
   DofusDB utilise pour les compétences de récolte : on les
   essaie donc l'un après l'autre, et on garde le premier qui
   répond. Le résultat est affiché pour qu'on puisse figer le
   bon chemin ensuite.
   ------------------------------------------------------------ */
const PISTES_RECOLTE = [
    { nom: "skills?parentJobId", url: (id) => "/skills?parentJobId=" + id + "&$limit=100&lang=fr" },
    { nom: "skills?jobId",       url: (id) => "/skills?jobId=" + id + "&$limit=100&lang=fr" },
    { nom: "jobs/:id",           url: (id) => "/jobs/" + id + "?lang=fr" }
];

// Noms de champs possibles pour la ressource récoltée et le niveau requis.
const CHAMPS_RESSOURCE = [
    "gatheredRessourceItem", "gatheredRessourceItemId",
    "gatheredResourceItem", "itemId", "resultId"
];
const CHAMPS_NIVEAU = ["levelMin", "level", "minLevel", "requiredLevel"];

// Cherche la première valeur présente parmi une liste de noms de champs.
function premierChamp(objet, noms) {
    for (const n of noms) {
        if (objet && objet[n] != null) return objet[n];
    }
    return null;
}
