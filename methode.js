/* ============================================================
   Métier Dofus — La méthode
   ------------------------------------------------------------
   Ce fichier ne contient QUE des données : les paliers, la
   tier list, les règles de lecture des ratios, les socles du
   profit et les événements de marché.

   Source : guide « 0 à 200 FULL MÉTIERS » de DAIGO (Dofus 3)
   https://youtu.be/u2eHffxtrBw
   Tout ce qui est écrit ici vient de ce guide. Quand un point
   n'y est pas explicité, c'est dit noir sur blanc plutôt que
   comblé au jugé.

   ⚠️ Les niveaux sont des repères de marché, pas des règles du
   jeu : ils dépendent des prix de ton serveur.
   ============================================================ */


/* ------------------------------------------------------------
   1) LES DEUX RATIOS QUI DÉCIDENT DE TOUT
   ------------------------------------------------------------ */
const REGLES_RATIOS = [
    {
        titre: "Ne jamais regarder la marge seule",
        texte: "Un objet à 80 % de marge qui se vend une fois par semaine perd contre un objet " +
               "à 20 % de marge qui part 50 fois par jour. C'est un commerce : mieux vaut un " +
               "produit qui tourne vite qu'un produit qui dort en rayon."
    },
    {
        titre: "Marge journalière = marge en kamas × ventes par jour",
        texte: "Le chiffre le plus important. Il dit ce qu'un objet peut te rapporter par jour, " +
               "en brut. Prends toujours la quantité vendue sur 30 jours divisée par 30 : les " +
               "dernières 24 h fluctuent trop pour servir de base."
    },
    {
        titre: "Indice de profitabilité = ventes par jour × marge en %",
        texte: "Il départage deux objets qui rapportent à peu près la même marge par jour. " +
               "Le plus élevé gagne : il rapporte autant en immobilisant moins de kamas. " +
               "Crafter à 3 000 pour revendre 6 000, ou crafter à 100 000 pour revendre 103 000, " +
               "donne la même marge brute — pas du tout le même investissement."
    },
    {
        titre: "Vélocité du capital",
        texte: "À quelle vitesse tes kamas redeviennent des kamas : acheter → crafter → vendre → " +
               "recommencer. Deux joueurs à marge égale ne s'enrichissent pas à la même vitesse " +
               "si l'un boucle son cycle deux fois plus vite. C'est le principe des intérêts composés."
    },
    {
        titre: "Un cycle court est aussi un cycle stable",
        texte: "100 substrats se craftent d'un clic, à partir de 5 ressources qui s'échangent par " +
               "millions. Un item forgemagé au même bénéfice dépend de la FM qui passe ou non, du " +
               "prix des runes, de la disponibilité des ressources. Même profit, beaucoup plus d'aléas."
    },
    {
        titre: "Les deux règles de compensation",
        texte: "Plus ta marge en % est grande, plus tu peux tolérer un faible volume de ventes — " +
               "et inversement. Et plus le niveau d'un objet monte, plus son volume de transaction " +
               "baisse, sauf aux paliers très joués."
    }
];


/* ------------------------------------------------------------
   2) LES PALIERS (« POWER SPIKES ») MÉTIER PAR MÉTIER
   ------------------------------------------------------------
   Un métier ne progresse pas de façon linéaire : certains
   niveaux débloquent d'un coup un craft rentable, ou un craft
   qui ne rapporte rien mais donne beaucoup d'XP pour presque
   rien. Ce sont eux qu'on vise — pas « le niveau suivant ».
   ------------------------------------------------------------ */
const PALIERS_METIERS = [
    {
        metier: "Chasseur",
        famille: "farm",
        resume: "Le seul métier de farm. Il suit le niveau de ton personnage : garde-le au " +
                "niveau de ce que tu tues. Progression linéaire, aucun palier.",
        paliers: [
            { niveau: 1,  quoi: "Arme de chasse",  pourquoi: "Accessible immédiatement, coût nul." },
            { niveau: 80, quoi: "Viandes 80 à 90", pourquoi: "Souvent chères : à finir en fin de parcours." }
        ]
    },
    {
        metier: "Alchimiste",
        famille: "recolte",
        resume: "Le point de départ de presque toutes les synergies : il ne dépend quasiment " +
                "de personne, et il alimente Bûcheron, Paysan et Pêcheur.",
        paliers: [
            { niveau: 30,  quoi: "Potion de souvenir", pourquoi: "Rend la montée du Bûcheron presque gratuite. Le vrai premier palier." },
            { niveau: 60,  quoi: "Potion de téléportation Village des Éleveurs", pourquoi: "Craft purement XP : environ 1 100 XP pour 1 000 kamas investis. Excellent ratio." },
            { niveau: 60,  quoi: "Teinture magique rouge", pourquoi: "Un peu de kamas, mais marché de niche." },
            { niveau: 95,  quoi: "Potion de vieillesse", pourquoi: "Alimente les substrats du Bûcheron 100 à 120." },
            { niveau: 100, quoi: "Vulbis (récolte)", pourquoi: "La première plante qui rapporte vraiment." },
            { niveau: 135, quoi: "Potion des ancêtres", pourquoi: "Couvre à 100 % le Bûcheron 140 à 160." },
            { niveau: 175, quoi: "Potion de glandage", pourquoi: "Nécessaire aux substrats du Bûcheron 180 et 200." }
        ]
    },
    {
        metier: "Bûcheron",
        famille: "recolte",
        resume: "Proche du meilleur métier du jeu : les substrats sont au cœur de l'économie " +
                "et les bois se vendent bien en récolte pure. Son seul défaut est une " +
                "accessibilité moyenne.",
        paliers: [
            { niveau: 20, quoi: "Premier substrat",   pourquoi: "Rarement rentable, mais il ouvre le cycle." },
            { niveau: 40, quoi: "Substrat de bocage", pourquoi: "Le premier substrat vraiment rentable. Palier majeur." },
            { niveau: 90, quoi: "Récoltes 90 et plus", pourquoi: "Les bois deviennent nettement plus intéressants." }
        ],
        note: "Au-delà de 100 à 120, chaque nouveau substrat (140, 160…) n'ajoute qu'une marge " +
              "faible face à tout ce que tu craftes déjà depuis le 40."
    },
    {
        metier: "Paysan",
        famille: "recolte",
        resume: "Moyen partout mais sans défaut : accessible, facile à monter, bonnes synergies. " +
                "Plus tu as de kamas, moins il est intéressant.",
        paliers: [
            { niveau: 20,  quoi: "Orge (récolte)", pourquoi: "Se vend déjà correctement, et il y en a beaucoup." },
            { niveau: 32,  quoi: "Huile de coude et huile de noix", pourquoi: "Servent aux pierres d'âme. Premier investissement passif du parcours." },
            { niveau: 100, quoi: "Seigle (récolte)", pourquoi: "Vaut assez cher, et alimente la potion de vieillesse (Alchimiste 95)." },
            { niveau: 160, quoi: "Céréales haut niveau", pourquoi: "Encore plus chères." }
        ]
    },
    {
        metier: "Mineur",
        famille: "recolte",
        resume: "Autosuffisant : il vit dans son coin avec ses alliages, qu'on ne craft que " +
                "quand ils sont rentables. Il peut dormir jusqu'au 120.",
        paliers: [
            { niveau: 40,  quoi: "Alliages", pourquoi: "Gros pic. Avant, il n'y a rien." },
            { niveau: 100, quoi: "Étain (récolte)", pourquoi: "Les minerais deviennent nettement plus intéressants." },
            { niveau: 120, quoi: "Récoltes 120 à 160", pourquoi: "Le vrai rendement du métier. Les alliages, eux, s'essoufflent." }
        ]
    },
    {
        metier: "Pêcheur",
        famille: "recolte",
        resume: "Soit tu le montes vers 100 à 150, soit tu ne le montes pas : il n'offre rien " +
                "avant. Le drop rare de poisson n'est pas rentable au taux horaire.",
        paliers: [
            { niveau: 80,  quoi: "Brandade (craft XP)", pourquoi: "Environ 720 XP pour 1 000 kamas. Ne vaut rien à la revente, mais fait monter le métier." },
            { niveau: 95,  quoi: "Jus de poisson", pourquoi: "Le premier craft qui rapporte." },
            { niveau: 120, quoi: "Brandade 120 et récoltes", pourquoi: "Même logique, plus haut niveau." },
            { niveau: 170, quoi: "Récoltes 170 et plus", pourquoi: "Les poissons chers." }
        ]
    },
    {
        metier: "Métiers de craft d'équipement",
        famille: "craft",
        resume: "Bijoutier, Tailleur, Cordonnier, Sculpteur, Forgeron, Façonneur… Règle simple : " +
                "soit tu les montes au 60, soit tu ne les montes pas. Leur intérêt n'est pas de " +
                "vendre l'objet, c'est de le BRISER.",
        paliers: [
            { niveau: 25,  quoi: "Crafts d'objets de quête", pourquoi: "Épées de boisaille, anneaux de bandit, marteaux, casques… Se vendent tels quels, mais le catalogue est limité." },
            { niveau: 50,  quoi: "Test de brisage quotidien", pourquoi: "Le métier commence à financer sa propre montée." },
            { niveau: 60,  quoi: "Accès à quasiment toutes les runes", pourquoi: "Le palier décisif. En dessous, le métier ne produit rien d'intéressant." },
            { niveau: 100, quoi: "Élargissement du catalogue à briser", pourquoi: "Plus d'items testables chaque jour." },
            { niveau: 150, quoi: "Items riches en caractéristiques", pourquoi: "Meilleurs coefficients de brisage." }
        ]
    },
    {
        metier: "Métiers de forgemagie",
        famille: "fm",
        resume: "La FM suit la demande des JOUEURS, pas la logique du métier : elle épouse les " +
                "paliers de stuff d'un personnage qui progresse. Elle se monte d'un coup, tard, " +
                "avec du capital — et un métier à la fois.",
        paliers: [
            { niveau: 60,  quoi: "Stuffs 60", pourquoi: "Tranche survendue : beaucoup de personnages y passent." },
            { niveau: 110, quoi: "Stuffs 110", pourquoi: "La meilleure cible pour démarrer : gros volume, et la FM y est plus simple à réussir." },
            { niveau: 150, quoi: "Stuffs 150", pourquoi: "Tranche correcte, moins dense que 110." },
            { niveau: 190, quoi: "Stuffs 190 à 200", pourquoi: "Le haut du marché, très demandé." }
        ]
    }
];


/* ------------------------------------------------------------
   3) LES SYNERGIES CHIFFRÉES
   ------------------------------------------------------------
   Ce ne sont pas des « affinités » vagues : ce sont des écarts
   de niveaux précis à maintenir entre deux métiers.
   ------------------------------------------------------------ */
const COUPLES_SYNERGIE = [
    {
        titre: "Alchimiste → Bûcheron",
        detail: [
            "Alchimiste 30 (potion de souvenir) couvre le Bûcheron 40 à 60",
            "Alchimiste 95 (potion de vieillesse) couvre le Bûcheron 100 à 120",
            "Alchimiste 135 (potion des ancêtres) couvre le Bûcheron 140 à 160",
            "Alchimiste 175 (potion de glandage) couvre le Bûcheron 180 à 200"
        ],
        regle: "L'Alchimiste doit toujours avoir une longueur d'avance sur le substrat visé."
    },
    {
        titre: "Paysan ⇄ Alchimiste",
        detail: [
            "Paysan 100 fournit les ressources de la potion Alchimiste 95",
            "Paysan 120 fournit celles de la potion Alchimiste 135",
            "Paysan 160 à 180 fournissent celles de la potion Alchimiste 175",
            "En retour, Alchimiste X fournit les récoltes du craft Paysan X + 20"
        ],
        regle: "Le seul couple qui s'auto-alimente. Maintiens 20 à 40 niveaux d'écart entre les deux."
    },
    {
        titre: "Alchimiste → Pêcheur",
        detail: [
            "Le craft consommable du Pêcheur 120 demande un Alchimiste 100"
        ],
        regle: "Même écart que pour le Paysan : Alchimiste X nourrit le Pêcheur X + 20."
    },
    {
        titre: "Alchimiste → Bûcheron → Forgeron",
        detail: [
            "Alchimiste et Bûcheron partagent les mêmes cartes en forêt d'Astrub",
            "Le Bûcheron produit le frêne, dont le Forgeron fait des épées de boisaille",
            "Les épées de boisaille servent aux quêtes d'alignement : gros volume de ventes"
        ],
        regle: "Le combo de départ : deux récoltes gratuites alimentent un craft vendable."
    },
    {
        titre: "Mineur — autosuffisant",
        detail: ["Ne dépend d'aucun autre métier, et n'en alimente aucun."],
        regle: "À monter quand tu en as les moyens, jamais en urgence."
    },
    {
        titre: "Chasseur — aucune synergie",
        detail: ["Son unique point faible : il ne sert à rien d'autre qu'à lui-même."],
        regle: "Largement compensé : il ne coûte rien et monte tout seul."
    }
];


/* ------------------------------------------------------------
   4) LA TIER LIST
   ------------------------------------------------------------
   Quatre critères, notés pour un joueur qui PART DE ZÉRO.
   Avec beaucoup de kamas au départ, ce classement ne tient plus.
   ------------------------------------------------------------ */
const TIERLIST_CRITERES = [
    { nom: "Accessibilité", desc: "Difficulté à atteindre le premier palier intéressant." },
    { nom: "Facilité",      desc: "Longueur et coût de l'ensemble du leveling, de 1 à 200." },
    { nom: "Rentabilité",   desc: "Ce que le métier rapporte, comparé aux autres métiers." },
    { nom: "Synergie",      desc: "Ce que le métier apporte aux autres métiers." }
];

const TIERLIST = [
    {
        rang: "S",
        metiers: ["Chasseur"],
        pourquoi: "Accessible dès la première minute (une arme de chasse suffit), il monte " +
                  "passivement au fil de tes combats, et sa production ne repose sur rien : " +
                  "c'est du revenu purement passif, un drop de plus à chaque combat. Son seul " +
                  "défaut, zéro synergie. Il coûte si peu qu'il ne peut que rapporter."
    },
    {
        rang: "S",
        metiers: ["Paysan"],
        pourquoi: "Moyen partout mais sans aucun défaut : de l'orge dès le niveau 20, un craft " +
                  "utile dès le 32, beaucoup de récoltes pour monter facilement, et les potions " +
                  "qui font les substrats — or les substrats sont au cœur de l'économie. " +
                  "Attention : plus tu as de kamas, plus il redescend dans le classement."
    },
    {
        rang: "A",
        metiers: ["Bûcheron"],
        pourquoi: "Pas loin du S. Les substrats sont rentables (là où les alliages haut niveau " +
                  "du Mineur le sont moins) et les bois se vendent bien en récolte pure. " +
                  "Freiné par une accessibilité moyenne et un leveling moyen."
    },
    {
        rang: "A",
        metiers: ["Joaillomage", "Cordomage", "Costumage"],
        pourquoi: "Les métiers de forgemagie : le plus gros potentiel du jeu. Ils demandent du " +
                  "capital, donc ils arrivent tard dans le parcours."
    }
];

const TIERLIST_RESERVE =
    "Le guide ne commente à l'oral que ces quatre entrées : le reste du classement est " +
    "affiché à l'écran sans être détaillé. Rien n'a été inventé ici pour combler les trous.";

const METIER_ECARTE = {
    quoi: "Le 20ᵉ métier, tout juste sorti",
    pourquoi: "Son marché est complètement déréglé : beaucoup de joueurs le montent en même " +
              "temps (l'offre explose) alors que la demande est encore incertaine. " +
              "Économiquement inintéressant tant que ça n'a pas décanté."
};


/* ------------------------------------------------------------
   5) D'OÙ VIENT LE PROFIT
   ------------------------------------------------------------ */
const SOCLES_PROFIT = [
    {
        socle: "Le risque",
        statut: "écarté",
        texte: "C'est un jeu : l'idée qu'un risque justifie une rentabilité trouve vite ses limites."
    },
    {
        socle: "L'innovation",
        statut: "écarté",
        texte: "Pas de propriété intellectuelle dans le jeu : toute trouvaille est copiée très vite."
    },
    {
        socle: "L'information",
        statut: "central",
        texte: "C'est le brisage. Chaque objet a un coefficient de rentabilité en runes que tu ne " +
               "peux connaître qu'en testant. Les brisages ratés ne sont pas des kamas perdus : tu " +
               "paies l'information, exactement comme un forage pétrolier. Une fois trouvée, tu " +
               "captes une rente — mais elle est périssable : d'autres finiront par briser le même " +
               "objet, l'offre en runes montera, ta marge s'effondrera.",
        consigne: "Vends vite, et cherche sans cesse la prochaine information."
    },
    {
        socle: "La compétence",
        statut: "central",
        texte: "C'est la forgemagie. Contrairement au brisage, ça ne se transmet pas en une phrase : " +
               "c'est la maîtrise de règles mathématiques. Le marché des objets FM reste donc " +
               "rentable dans la durée — la compétence est une barrière à l'entrée. Même logique " +
               "pour une bonne gestion d'élevage de montures.",
        consigne: "Une information rapporte tant qu'elle est rare ; une compétence rapporte durablement."
    },
    {
        socle: "Le capital",
        statut: "central",
        texte: "Acheter en gros coûte moins cher à l'unité que racheter au compte-gouttes — et " +
               "racheter en boucle sur une offre limitée fait monter le prix toi-même. Avec du " +
               "capital tu peux aussi revendre au détail, ou faire du grossiste (racheter un lot, " +
               "revendre en lots plus petits et plus chers), ce qui apporte de la liquidité au marché.",
        consigne: "Racheter toute l'offre ou vendre à perte pour éliminer la concurrence n'apporte " +
                  "aucune valeur au marché : ça ne repose que sur la force du capital."
    }
];


/* ------------------------------------------------------------
   6) LA DIVERSIFICATION
   ------------------------------------------------------------ */
const REPARTITION_HDV = [
    { hdv: "HDV Ressources",  part: 50, vitesse: "la plus rapide" },
    { hdv: "HDV Runes",       part: 30, vitesse: "rapide" },
    { hdv: "HDV Équipements", part: 15, vitesse: "lente" },
    { hdv: "HDV Divers",      part: 5,  vitesse: "la plus lente" }
];

const REGLE_TRESORERIE = {
    investi: 80,
    cash: 20,
    texte: "Loi de Pareto : environ 80 % du capital investi, environ 20 % gardés en liquide. Les " +
           "kamas qui dorment dans ton inventaire sont garantis de rapporter zéro — mais une " +
           "petite réserve te permet de sauter sur une opportunité : un item forgemagé bradé, un " +
           "vendeur qui a oublié un zéro sur un lot, une offre du canal commerce.",
    nuance: "Les kamas immobilisés dans un stock qui tarde à partir ne comptent pas comme " +
            "dormants : c'est un risque assumé, choisi avec les ratios."
};

const CONDITION_DIVERSIFICATION =
    "La diversification ne protège que si les catégories ne réagissent pas aux mêmes événements. " +
    "Un choc sur la demande en ressources n'affecte pas forcément les runes : c'est là qu'elle " +
    "joue, quand un segment ralentit et que les autres absorbent le ralentissement.";


/* ------------------------------------------------------------
   7) LES ÉVÉNEMENTS QUI BOUGENT LES PRIX
   ------------------------------------------------------------ */
const EVENEMENTS_MARCHE = [
    {
        nom: "L'Almanax",
        frequence: "tous les jours",
        effet: "À lui seul, il peut quadrupler le prix de ressources utiles — directement ou " +
               "indirectement — à l'offrande du jour.",
        quoi_faire: "Regarde les offrandes à venir et anticipe la hausse."
    },
    {
        nom: "Les mises à jour",
        frequence: "irrégulier",
        effet: "Un nerf de panoplie ou un up de classe change la méta, donc la demande en " +
               "équipements, et par ricochet en ressources.",
        quoi_faire: "Surveille les notes de version avant d'immobiliser un gros stock."
    },
    {
        nom: "Les réseaux sociaux",
        frequence: "imprévisible",
        effet: "Le partage d'un stuff ou d'un craft rentable déplace le comportement de milliers " +
               "de joueurs. Le guide dont vient cette méthode en fait partie.",
        quoi_faire: "Une recette publique cesse d'être rentable. Cherche la tienne."
    },
    {
        nom: "L'HDV lui-même",
        frequence: "en continu",
        effet: "Si une rune ou un alliage monte soudain de 20 à 30 %, tout le monde le voit dans " +
               "l'historique de vente. Soit d'autres se mettent à en produire, soit les acheteurs " +
               "se mettent à le crafter eux-mêmes. Dans les deux cas, ton avantage fond à vue d'œil.",
        quoi_faire: "Quand tu détiens ce genre d'opportunité, vends vite."
    }
];

const ACTUALISATION_PRIX = {
    taxe_baisse: 2,
    taxe_hausse: 1,
    regle: "Plus le prix d'un objet s'écarte de sa moyenne des 30 derniers jours, plus tu as " +
           "intérêt à actualiser souvent : l'écart corrigé rapporte plus que la taxe ne coûte. " +
           "Sur un objet dont le prix ne bouge presque jamais, actualiser en boucle revient à " +
           "payer une taxe pour rien."
};


/* ------------------------------------------------------------
   8) DEUX PIÈGES À CONNAÎTRE
   ------------------------------------------------------------ */
const PIEGES = [
    {
        titre: "Le coût d'opportunité",
        texte: "Chaque heure passée sur une activité est une heure retirée à l'activité la plus " +
               "rentable disponible. Farmer soi-même la ressource dont on a besoin « puisqu'on a " +
               "le métier » est le piège classique : il y a peu de chances que ce soit, à cet " +
               "instant, ce que ton personnage peut faire de plus rentable. Un métier à " +
               "50 000 kamas/h quand il en existe un à 150 000, c'est 100 000 kamas perdus par " +
               "heure — même si tu as bien produit quelque chose."
    },
    {
        titre: "L'XP de craft est dégressive",
        texte: "Sur Dofus 3 — contrairement à Dofus Rétro, où elle est fixe — un craft niveau 60 " +
               "rapporte beaucoup moins d'XP quand tu es niveau 80, et certains paliers annulent " +
               "complètement l'XP d'une recette. Vérifie toujours avec le calculateur XP de " +
               "DofusDB avant de lancer une grosse série."
    }
];
