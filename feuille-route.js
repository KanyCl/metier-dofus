/* ============================================================
   Métier Dofus — Feuille de route
   ------------------------------------------------------------
   La méthode encodée ici vient d'une stratégie de joueur.
   L'idée directrice : on ne progresse pas « par niveau » mais
   par PALIERS DE CAPITAL. Chaque étape sert à débloquer un
   produit qu'on pourra vendre en continu (un « investissement
   passif »), et les kamas gagnés financent l'étape suivante.

   ⚠️ Les niveaux et montants sont des REPÈRES, pas des règles
   officielles : les prix changent d'un serveur à l'autre.
   ============================================================ */

/* ---------- Les principes réutilisables de la méthode ---------- */
const PRINCIPES = [
    {
        titre: "L'argent ne dort jamais",
        texte: "Garde environ 80 % de ta trésorerie investie en permanence, répartie sur plusieurs marchés. " +
               "Un capital immobilisé en banque ne rapporte rien."
    },
    {
        titre: "Vise le palier, pas le niveau",
        texte: "Un niveau n'a d'intérêt que s'il débloque un produit vendable en continu. " +
               "Monte jusqu'au palier utile, puis exploite-le."
    },
    {
        titre: "Crafter à perte est parfois rentable",
        texte: "Accepter de perdre des kamas pour franchir un palier est un investissement, " +
               "à condition que le palier ouvre une source de revenus durable."
    },
    {
        titre: "Diversifie tes marchés",
        texte: "Répartis tes ventes sur 5 à 10 marchés différents (ressources, runes, équipements). " +
               "Si l'un s'effondre, les autres continuent de tourner."
    },
    {
        titre: "Chaîne tes métiers de récolte",
        texte: "Chaque métier de récolte alimente le suivant. Bien enchaînés, ils se montent " +
               "quasiment sans dépenser."
    },
    {
        titre: "Le brisage paie ton XP",
        texte: "Crafter pour briser transforme la montée d'un métier de craft en source de revenus : " +
               "tu récupères des runes revendables."
    }
];

/* ---------- Le parcours, phase par phase ---------- */
const PHASES = [
    {
        titre: "Phase 1 — Démarrer à zéro kama",
        lieu: "Incarnam & Astrub",
        capital: 0,
        resume: "Créer un premier flux de kamas sans rien dépenser, puis ouvrir les deux " +
                "premiers investissements passifs.",
        etapes: [
            {
                id: "p1-chasseur",
                titre: "Chasseur → 10",
                action: "Équipe une arme de chasse dès le départ et prépare des bouillons de viande.",
                debloque: "Premier flux de kamas : viandes et ressources de monstres revendues en HDV.",
                pourquoi: "C'est le seul revenu accessible quand on part vraiment de zéro."
            },
            {
                id: "p1-paysan",
                titre: "Paysan → 32",
                action: "Sur Astrub, privilégie les cartes qui portent à la fois du blé et de l'ortie. " +
                        "Revends les orties, et crafte du pain même à perte.",
                debloque: "Huiles de coude et huiles de noix → 1ᵉʳ investissement passif.",
                pourquoi: "Les orties financent la montée, et le palier ouvre un produit très demandé " +
                          "(pierres d'âme) que tu vendras en continu."
            },
            {
                id: "p1-alchimiste",
                titre: "Alchimiste → 30",
                action: "Avec tes premiers kamas, achète de quoi monter le métier. Ensuite, stocke " +
                        "toutes tes récoltes d'orties et de sauges.",
                debloque: "Potions de souvenir.",
                pourquoi: "Ces potions rendront la montée du Bûcheron presque gratuite."
            },
            {
                id: "p1-bucheron",
                titre: "Bûcheron → 20, puis 40",
                action: "Utilise tes potions de souvenir pour crafter tes premiers substrats sans frais.",
                debloque: "Substrats → 2ᵉ investissement passif.",
                pourquoi: "Premier vrai cycle rentable : acheter bois et potions, crafter, revendre."
            }
        ]
    },
    {
        titre: "Phase 2 — Premier capital",
        lieu: "Bonta",
        capital: 200000,
        resume: "Lancer les métiers de craft d'équipement et découvrir le brisage, " +
                "qui finance sa propre montée.",
        etapes: [
            {
                id: "p2-craft-25",
                titre: "Un métier de craft d'équipement → 25",
                action: "Choisis un métier (Bijoutier, Tailleur, Cordonnier, Forgeron, Sculpteur…) " +
                        "et monte-le uniquement avec des crafts à XP.",
                debloque: "L'accès au brisage.",
                pourquoi: "En dessous de 25, le métier ne produit encore rien de vendable."
            },
            {
                id: "p2-brisage-50",
                titre: "Du niveau 25 au 50 : mode brisage",
                action: "Crafte des objets bas niveau pour les briser et revendre les runes obtenues.",
                debloque: "Un marché des runes, alimenté en continu.",
                pourquoi: "Ta montée de métier devient elle-même une source de revenus."
            },
            {
                id: "p2-repeter",
                titre: "Répéter pour le métier de craft suivant",
                action: "Dès que la revente des runes t'a ramené le capital de départ, recommence " +
                        "avec un autre métier de craft.",
                debloque: "Un catalogue d'objets à briser de plus en plus large.",
                pourquoi: "C'est la diversification : plusieurs métiers, plusieurs marchés."
            },
            {
                id: "p2-mineur",
                titre: "Mineur → 40",
                action: "Une fois un capital confortable atteint, accepte d'investir une grosse part " +
                        "(et une perte temporaire) pour crafter les alliages nécessaires.",
                debloque: "Alliages complexes → nouvel investissement passif.",
                pourquoi: "Mineur coûte cher à monter : il faut attendre d'en avoir les moyens, " +
                          "mais le produit débloqué se vend durablement."
            }
        ]
    },
    {
        titre: "Phase 3 — Expansion et Forgemagie",
        lieu: "Marchés haut niveau",
        capital: 5000000,
        resume: "Passer à l'effet de levier : la forgemagie et les métiers de récolte haut niveau.",
        etapes: [
            {
                id: "p3-fm",
                titre: "Un premier métier de Forgemagie",
                action: "Monte-le d'une traite jusqu'au palier visé, puis forgemage des équipements " +
                        "d'une tranche de niveau très demandée par les joueurs.",
                debloque: "La marge la plus élevée du jeu.",
                pourquoi: "La FM demande un vrai capital de départ, mais rentabilise vite si tu vises " +
                          "une tranche recherchée. L'onglet Huzounet aide à la choisir."
            },
            {
                id: "p3-fm-suivant",
                titre: "Enchaîner les métiers de FM",
                action: "Une fois le premier investissement rentabilisé, passe au métier de " +
                        "forgemagie suivant.",
                debloque: "Plusieurs marchés de FM en parallèle.",
                pourquoi: "Même logique que pour les métiers de craft : on diversifie."
            },
            {
                id: "p3-recolte",
                titre: "Aligner les métiers de récolte haut niveau",
                action: "Fais monter Paysan, Alchimiste et Bûcheron en alternance, chacun " +
                        "fournissant au suivant ce dont il a besoin.",
                debloque: "Substrats haut niveau, très rentables.",
                pourquoi: "En alternant, aucun des trois ne coûte cher à monter."
            }
        ]
    },
    {
        titre: "Phase 4 — Finalisation",
        lieu: "Partout",
        capital: 10000000,
        resume: "Pousser tous les métiers au maximum et terminer par les secondaires.",
        etapes: [
            {
                id: "p4-craft-max",
                titre: "Monter les métiers de craft au maximum",
                action: "Avec la trésorerie générée par les runes, la FM et les substrats, " +
                        "pousse progressivement chaque métier de craft.",
                debloque: "Un catalogue d'objets à crafter ou briser quasi illimité.",
                pourquoi: "À ce stade la montée ne se ressent plus financièrement."
            },
            {
                id: "p4-secondaires",
                titre: "Terminer par les métiers secondaires",
                action: "Façonneur, Pêcheur, et la fin du Mineur pour les récoltes haut niveau.",
                debloque: "Le parcours complet.",
                pourquoi: "Moins prioritaires : ils rapportent peu tant que le reste n'est pas en place."
            }
        ]
    }
];

/* ---------- Les produits à garder en vente ---------- */
const INVESTISSEMENTS = [
    { id: "inv-huiles",    nom: "Huiles (coude, noix)", debloquePar: "p1-paysan",    note: "Très demandées pour les pierres d'âme." },
    { id: "inv-substrats", nom: "Substrats",            debloquePar: "p1-bucheron",  note: "Acheter bois et potions, crafter, revendre." },
    { id: "inv-runes",     nom: "Runes de brisage",     debloquePar: "p2-brisage-50", note: "Alimentées par tes crafts bas niveau." },
    { id: "inv-alliages",  nom: "Alliages complexes",   debloquePar: "p2-mineur",    note: "Produit stable et recherché." },
    { id: "inv-fm",        nom: "Équipements forgemagés", debloquePar: "p3-fm",      note: "Vise une tranche de niveau très jouée." },
    { id: "inv-substrats-thl", nom: "Substrats haut niveau", debloquePar: "p3-recolte", note: "Le plus rentable des produits de récolte." }
];

/* ---------- La chaîne des métiers de récolte ---------- */
const SYNERGIES = [
    { de: "Paysan",     vers: "Alchimiste", via: "céréales → potions" },
    { de: "Alchimiste", vers: "Bûcheron",   via: "potions → substrats" },
    { de: "Bûcheron",   vers: "Trésorerie", via: "substrats vendus en HDV" },
    { de: "Trésorerie", vers: "Paysan",     via: "réinvestissement dans le palier suivant" }
];
