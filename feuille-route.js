/* ============================================================
   Métier Dofus — Feuille de route
   ------------------------------------------------------------
   Le parcours encodé ici suit la « run optimisée » du guide
   « 0 à 200 FULL MÉTIERS » de DAIGO (Dofus 3) :
   https://youtu.be/u2eHffxtrBw

   L'idée directrice : on ne progresse pas « par niveau » mais
   par PALIERS DE CAPITAL. Chaque étape sert à débloquer un
   produit qu'on pourra vendre en continu (un « investissement
   passif »), et les kamas gagnés financent l'étape suivante.

   ⚠️ Les niveaux et montants sont des REPÈRES, pas des règles
   officielles : les prix changent d'un serveur à l'autre.
   Les données de méthode (paliers par métier, tier list,
   ratios, socles du profit) sont dans methode.js.
   ============================================================ */

/* ---------- Les principes réutilisables de la méthode ---------- */
const PRINCIPES = [
    {
        titre: "L'argent ne dort jamais",
        texte: "Garde environ 80 % de ta trésorerie investie en permanence, répartie sur " +
               "plusieurs marchés. Un capital immobilisé en banque est garanti de rapporter zéro. " +
               "Les 20 % restants servent à sauter sur une opportunité."
    },
    {
        titre: "Vise le palier, pas le niveau",
        texte: "Un niveau n'a d'intérêt que s'il débloque un produit vendable en continu, ou un " +
               "craft qui donne beaucoup d'XP pour presque rien. Monte jusqu'au palier utile, " +
               "puis exploite-le."
    },
    {
        titre: "La marge seule ne veut rien dire",
        texte: "80 % de marge sur un objet qui part une fois par semaine perd contre 20 % sur un " +
               "objet qui part 50 fois par jour. Regarde la marge journalière (marge × ventes/jour) " +
               "et l'indice de profitabilité (ventes/jour × marge %)."
    },
    {
        titre: "Le coût d'opportunité",
        texte: "Chaque heure passée sur une activité est une heure retirée à la plus rentable " +
               "disponible. Farmer soi-même une ressource « puisqu'on a le métier » est rarement " +
               "le meilleur usage de ton temps."
    },
    {
        titre: "Crafter à perte est parfois rentable",
        texte: "Accepter de perdre des kamas pour franchir un palier est un investissement, " +
               "à condition que le palier ouvre une source de revenus durable."
    },
    {
        titre: "Raccourcis ton cycle",
        texte: "Acheter → crafter → vendre → recommencer : à marge égale, celui qui boucle deux " +
               "fois plus vite s'enrichit deux fois plus vite. Un craft d'un clic à partir de " +
               "ressources abondantes bat un craft rare à aléas multiples."
    },
    {
        titre: "Diversifie tes marchés",
        texte: "Répartis tes ventes entre ressources, runes et équipements — mais seulement si " +
               "ces marchés ne réagissent pas aux mêmes événements. C'est ce qui absorbe un coup " +
               "de mou sur l'un d'eux."
    },
    {
        titre: "Chaîne tes métiers de récolte",
        texte: "Alchimiste nourrit Bûcheron, Paysan nourrit Alchimiste qui nourrit Paysan en " +
               "retour. Bien enchaînés, ils se montent quasiment sans dépenser."
    },
    {
        titre: "Le brisage paie ton XP",
        texte: "Crafter pour briser transforme la montée d'un métier de craft en source de " +
               "revenus : tu récupères des runes, dont les volumes de vente sont énormes. " +
               "Mais tu paies d'abord l'information, à coups de tests ratés."
    }
];

/* ---------- Le parcours, phase par phase ---------- */
const PHASES = [
    {
        titre: "Phase 1 — Incarnam, vraiment zéro kama",
        lieu: "Incarnam",
        capital: 0,
        resume: "Se faire un premier flux de kamas par le farm, pas par la récolte : au " +
                "niveau 1, un métier de récolte ne rapporte presque rien.",
        etapes: [
            {
                id: "p1-chasseur",
                titre: "Chasseur → 10",
                action: "Crafte une arme de chasse dès le départ et farme Incarnam. Vise " +
                        "77 bouillons pour passer le niveau 10, et revends les ressources de monstres.",
                debloque: "Le premier flux de kamas du parcours.",
                pourquoi: "Le farm en début d'aventure rapporte bien plus que les métiers de " +
                          "récolte niveau 1, et Chasseur ne coûte rien."
            },
            {
                id: "p1-mineur",
                titre: "Mineur → 10, en passant",
                action: "Incarnam est une petite île : profite de la proximité des récoltes pour " +
                        "monter Mineur pendant que tu farmes.",
                debloque: "Rien encore — c'est de l'avance prise gratuitement.",
                pourquoi: "Mineur ne servira qu'au million de kamas, mais ces niveaux-là sont " +
                          "gratuits en temps puisque tu es déjà sur place."
            }
        ]
    },
    {
        titre: "Phase 2 — Astrub, le premier investissement passif",
        lieu: "Astrub et sa forêt",
        capital: 0,
        resume: "Monter Paysan et Alchimiste ensemble sur des cartes communes, jusqu'au " +
                "premier produit qu'on laissera en vente en permanence.",
        etapes: [
            {
                id: "p2-paysan",
                titre: "Paysan → 32",
                action: "Privilégie les cartes qui portent à la fois du blé et de l'ortie. Revends " +
                        "les orties, et crafte du pain même à perte pour pousser le métier.",
                debloque: "Huile de coude et huile de noix → 1ᵉʳ investissement passif.",
                pourquoi: "On crafte à perte volontairement : le palier 32 ouvre deux produits " +
                          "très demandés (pierres d'âme) qu'on vendra ensuite en continu."
            },
            {
                id: "p2-alchi-20",
                titre: "Alchimiste → 20, Bûcheron en parallèle",
                action: "En forêt d'Astrub, Alchimiste et Bûcheron partagent les mêmes cartes. " +
                        "Farme de l'orge à côté. Revends orties, frêne et orge en continu.",
                debloque: "Un flux de kamas régulier, sans rien dépenser.",
                pourquoi: "Trois sources de revenus sur les mêmes trajets : c'est la synergie de " +
                          "lieu, avant même la synergie de recettes."
            }
        ]
    },
    {
        titre: "Phase 3 — 30 000 kamas : le premier achat",
        lieu: "Astrub",
        capital: 30000,
        resume: "Un investissement modeste ouvre la potion de souvenir, qui rend la montée " +
                "du Bûcheron quasiment gratuite.",
        etapes: [
            {
                id: "p3-alchi-30",
                titre: "Alchimiste 20 → 30",
                action: "Investis tes 30 000 kamas : environ 100 potions de chasseur de trésor, " +
                        "ou environ 190 potions de destination inconnue.",
                debloque: "La potion de souvenir.",
                pourquoi: "C'est le vrai premier palier de l'Alchimiste, et la clé de tout le " +
                          "reste de la chaîne de récolte."
            },
            {
                id: "p3-stock",
                titre: "Stocker orties et sauges",
                action: "À partir de maintenant, ne revends plus tes orties ni tes sauges : " +
                        "garde-les pour fabriquer tes potions de souvenir.",
                debloque: "Des potions de souvenir gratuites.",
                pourquoi: "Ce qui était ton revenu devient ta matière première."
            },
            {
                id: "p3-bucheron-20",
                titre: "Bûcheron → 20",
                action: "Crafte ton premier substrat avec les potions de souvenir issues de ton stock.",
                debloque: "Le premier substrat.",
                pourquoi: "Rarement rentable en soi, mais il amorce le cycle qui mène au 40."
            },
            {
                id: "p3-bucheron-40",
                titre: "Bûcheron → 40",
                action: "Enchaîne les substrats presque gratuits. Une fois au 40, bascule sur " +
                        "un cycle d'achat de ressources → craft → revente si le substrat de " +
                        "bocage est rentable tel quel.",
                debloque: "Substrat de bocage → 2ᵉ investissement passif.",
                pourquoi: "Le premier substrat vraiment rentable. En achetant les ressources " +
                          "plutôt qu'en les récoltant, tu raccourcis ton cycle et tu libères " +
                          "ton temps pour autre chose."
            },
            {
                id: "p3-souterrains",
                titre: "Souterrains d'Astrub",
                action: "Avec un meilleur stuff, farme les souterrains : viandes de Chasseur " +
                        "niveau 10+ et ressources qui valent déjà cher.",
                debloque: "De quoi atteindre le palier des 200 000 kamas.",
                pourquoi: "Le temps libéré par le cycle court du Bûcheron se réinvestit là où " +
                          "le taux horaire est le plus élevé."
            }
        ]
    },
    {
        titre: "Phase 4 — 200 000 kamas : les métiers de craft",
        lieu: "Bonta",
        capital: 200000,
        resume: "Un métier de craft ne sert pas à vendre l'objet, mais à le briser. " +
                "On répète l'opération à chaque nouveau palier de 200 000 kamas.",
        etapes: [
            {
                id: "p4-craft-25",
                titre: "Un métier de craft → 25 (XP pur)",
                action: "Choisis un métier — Bijoutier pour commencer — et monte-le uniquement " +
                        "avec les crafts qui donnent le plus d'XP par kama investi.",
                debloque: "L'accès aux premiers tests de brisage.",
                pourquoi: "En dessous de 25, le métier ne produit rien qui vaille la peine " +
                          "d'être vendu ou brisé."
            },
            {
                id: "p4-brisage-50",
                titre: "Du 25 au 50 : tests de brisage",
                action: "Crafte des objets bas niveau et brise-les pour trouver ceux dont le " +
                        "coefficient en runes est rentable. Revends les runes.",
                debloque: "Un marché des runes alimenté en continu.",
                pourquoi: "Les brisages ratés ne sont pas des pertes : tu paies l'information. " +
                          "Une fois le bon objet trouvé, la rente est à toi — jusqu'à ce que " +
                          "d'autres la trouvent aussi."
            },
            {
                id: "p4-repeter",
                titre: "Répéter à chaque 200 000 kamas",
                action: "Tailleur, Cordonnier, Sculpteur, Forgeron : même recette, un métier à " +
                        "la fois, dès que la revente des runes t'a rendu ta mise.",
                debloque: "Un catalogue d'objets à briser de plus en plus large.",
                pourquoi: "Chaque métier de craft niveau 50 devient un investissement passif : " +
                          "un test de brisage par jour."
            },
            {
                id: "p4-bucheron-60",
                titre: "Bûcheron → 60 (tout seul)",
                action: "À force de crafter des substrats 40, le métier monte sans effort. " +
                        "Ajoute le substrat 60 à tes ventes permanentes.",
                debloque: "Un deuxième substrat en investissement passif.",
                pourquoi: "C'est la récompense du cycle court : il monte le métier pendant " +
                          "que tu fais autre chose."
            }
        ]
    },
    {
        titre: "Phase 5 — 1 000 000 kamas : le Mineur et la chaîne haute",
        lieu: "Partout",
        capital: 1000000,
        resume: "Assumer une grosse perte temporaire pour ouvrir les alliages, et " +
                "commencer à aligner Alchimiste, Paysan et Bûcheron en haut niveau.",
        etapes: [
            {
                id: "p5-mineur-40",
                titre: "Mineur → 40",
                action: "À ne lancer que si les bonites offrent 20 à 25 % de marge. Compte " +
                        "environ 59 alliages bas niveau pour le 10 → 20, 65 aluminites pour le " +
                        "20 → 30, puis 171 aluminites pour le 30 → 40.",
                debloque: "L'ébonite → nouvel investissement passif.",
                pourquoi: "Cette montée coûte 500 000 à 600 000 kamas de perte sèche. C'est " +
                          "assumé : le produit débloqué se vend durablement. Vérifie les " +
                          "quantités exactes avec le calculateur XP de DofusDB."
            },
            {
                id: "p5-mineur-60",
                titre: "Mineur → 60",
                action: "Enchaîne sur l'ébonite jusqu'au palier suivant pour déverrouiller " +
                        "l'alliage d'après.",
                debloque: "Un deuxième alliage vendable.",
                pourquoi: "Mineur est autosuffisant : il vit dans son coin et on ne craft ses " +
                          "alliages que quand ils sont rentables."
            },
            {
                id: "p5-chaine-100",
                titre: "Alchimiste 80 → Paysan 100 → Alchimiste 95 → Bûcheron 100",
                action: "Monte l'Alchimiste à 80, ce qui permet de pousser le Paysan à 100. " +
                        "Les récoltes du Paysan 100 fabriquent la potion de vieillesse " +
                        "(Alchimiste 95), qui alimente les substrats du Bûcheron 100.",
                debloque: "Substrats haut niveau.",
                pourquoi: "C'est la première boucle complète : chaque métier finance le suivant, " +
                          "et le couple Paysan / Alchimiste s'auto-alimente."
            },
            {
                id: "p5-faconneur-50",
                titre: "Façonneur → 50, en parallèle",
                action: "Monte-le par craft et brisage de boucliers. Une fois au 50, crafte et " +
                        "revends des trophées 50.",
                debloque: "Les trophées 50, qui ont de bons volumes de vente.",
                pourquoi: "Un marché de plus, décorrélé des substrats et des runes."
            }
        ]
    },
    {
        titre: "Phase 6 — 5 000 000 kamas : la forgemagie",
        lieu: "Marchés haut niveau",
        capital: 5000000,
        resume: "Le passage à l'effet de levier. La FM demande un vrai capital, mais c'est " +
                "une compétence : sa rentabilité ne s'érode pas comme une information.",
        etapes: [
            {
                id: "p6-fm1",
                titre: "Un premier métier de FM → 110 directement",
                action: "Choisis-en un — Costumage par exemple — et monte-le d'une traite au 110, " +
                        "puis forgemage tout de suite des items de cette tranche.",
                debloque: "La marge la plus élevée du jeu.",
                pourquoi: "Le 110 est la meilleure cible de départ : gros volume de ventes, et " +
                          "la FM y est plus simple à réussir qu'en bas niveau. " +
                          "L'onglet Huzounet aide à repérer les pièces demandées."
            },
            {
                id: "p6-fm-suivant",
                titre: "Un métier de FM à la fois",
                action: "N'attaque le deuxième que quand le premier t'a rendu la trésorerie que " +
                        "tu avais avant de le monter. Puis le troisième.",
                debloque: "Plusieurs marchés de FM en parallèle.",
                pourquoi: "Monter deux métiers de FM en même temps immobilise trop de capital " +
                          "pour un retour incertain."
            },
            {
                id: "p6-chaine-140",
                titre: "Paysan 120 → Alchimiste 135 → Bûcheron 140-160",
                action: "Pousse le Paysan à 120 : ses ressources font la potion des ancêtres " +
                        "(Alchimiste 135), qui couvre à 100 % les substrats du Bûcheron 140 et 160.",
                debloque: "Les substrats 140 et 160.",
                pourquoi: "Le Bûcheron continue de monter tout seul grâce à ses ventes " +
                          "permanentes : il faut juste que l'Alchimiste garde son avance."
            },
            {
                id: "p6-faconneur-100",
                titre: "Façonneur → 100",
                action: "Plus de boucliers à crafter et briser, et des trophées 100 en " +
                        "craft-revente. Les trophées se brisent aussi, si c'est rentable.",
                debloque: "Trophées 100.",
                pourquoi: "Même logique que les métiers de craft : le catalogue à tester s'élargit."
            },
            {
                id: "p6-fm-autres",
                titre: "Armurerie-magie, Sculptemagie, Forgemagie",
                action: "Même règle qu'au premier métier de FM : un à la fois, monté directement " +
                        "à la tranche visée.",
                debloque: "L'ensemble des marchés de forgemagie.",
                pourquoi: "La compétence ne se copie pas : c'est ce qui rend ces marchés " +
                          "rentables dans la durée."
            }
        ]
    },
    {
        titre: "Phase 7 — Dizaines de millions par jour : finir",
        lieu: "Partout",
        capital: 10000000,
        resume: "Toutes les bases sont posées et la trésorerie ne freine plus rien. " +
                "On termine par les métiers secondaires et les derniers paliers.",
        etapes: [
            {
                id: "p7-secondaires",
                titre: "Les métiers secondaires → 100",
                action: "Pêcheur pour le jus de poisson 95, Chasseur pour les viandes 80-90 " +
                        "(souvent chères), et le Façonneur pour ses boucliers forgemagés.",
                debloque: "Les derniers marchés à bons volumes.",
                pourquoi: "Ils rapportent peu tant que le reste n'est pas en place — c'est " +
                          "exactement pour ça qu'ils arrivent maintenant."
            },
            {
                id: "p7-glandage",
                titre: "Alchimiste 140 → Paysan 180 → Alchimiste 175 → Bûcheron 200",
                action: "L'Alchimiste 140 permet le Paysan 180 ; les récoltes du Paysan 160 et " +
                        "180 font la potion de glandage (Alchimiste 175), qui sert aux substrats " +
                        "du Bûcheron 180 et 200.",
                debloque: "Les derniers substrats.",
                pourquoi: "Dernier maillon de la chaîne de récolte : après ça, elle tourne seule."
            },
            {
                id: "p7-mineur-recoltes",
                titre: "Accélérer le Mineur → 120-160",
                action: "Maintenant que la trésorerie suit, pousse-le pour ouvrir ses récoltes.",
                debloque: "Les minerais qui valent vraiment quelque chose.",
                pourquoi: "Le rendement du Mineur vient de sa récolte, pas de ses alliages " +
                          "haut niveau."
            },
            {
                id: "p7-craft-150",
                titre: "Métiers de craft → 150, puis FM → 150",
                action: "Plus d'items à tester en brisage, puis de nouvelles tranches de " +
                        "forgemagie à exploiter.",
                debloque: "Un catalogue quasi illimité.",
                pourquoi: "À ce stade la montée ne se ressent plus financièrement."
            },
            {
                id: "p7-200",
                titre: "Tout monter au 200",
                action: "Alchimiste 160 permet Paysan 200 et Pêcheur 200. Puis Mineur 200, " +
                        "métiers de craft 200, Alchimiste 200, et enfin Chasseur et Façonneur.",
                debloque: "Le parcours complet, 19 métiers au niveau 200.",
                pourquoi: "L'ordre suit toujours la même règle : celui qui nourrit les autres " +
                          "passe en premier."
            }
        ]
    }
];

/* ---------- Les produits à garder en vente ---------- */
const INVESTISSEMENTS = [
    { id: "inv-huiles",        nom: "Huiles de coude et de noix", debloquePar: "p2-paysan",       note: "Très demandées pour les pierres d'âme. Le tout premier produit permanent." },
    { id: "inv-substrats-40",  nom: "Substrats 40 et 60",         debloquePar: "p3-bucheron-40",  note: "Acheter les ressources, crafter, revendre : le cycle le plus court du jeu." },
    { id: "inv-runes",         nom: "Runes de brisage",           debloquePar: "p4-brisage-50",   note: "Gros volumes de transaction. Cherche sans cesse le prochain objet rentable." },
    { id: "inv-brisage-quoti", nom: "Test de brisage quotidien",  debloquePar: "p4-repeter",      note: "Chaque métier de craft niveau 50 ajoute des objets à tester." },
    { id: "inv-alliages",      nom: "Ébonite et alliages",        debloquePar: "p5-mineur-40",    note: "À ne produire que quand la marge est là — sinon, on laisse dormir." },
    { id: "inv-trophees-50",   nom: "Trophées 50",                debloquePar: "p5-faconneur-50", note: "Bons volumes de vente, marché décorrélé des ressources." },
    { id: "inv-substrats-100", nom: "Substrats 100 et 120",       debloquePar: "p5-chaine-100",   note: "Alimentés par la potion de vieillesse (Alchimiste 95)." },
    { id: "inv-fm",            nom: "Équipements forgemagés 110", debloquePar: "p6-fm1",          note: "La marge la plus élevée. Une compétence, donc une rente durable." },
    { id: "inv-trophees-100",  nom: "Trophées 100",               debloquePar: "p6-faconneur-100", note: "Brisables aussi, si le coefficient est bon." },
    { id: "inv-substrats-160", nom: "Substrats 140 et 160",       debloquePar: "p6-chaine-140",   note: "Alimentés par la potion des ancêtres (Alchimiste 135)." },
    { id: "inv-substrats-200", nom: "Substrats 180 et 200",       debloquePar: "p7-glandage",     note: "Le bout de la chaîne de récolte." }
];

/* ---------- La chaîne des métiers de récolte ---------- */
/* Les couples détaillés, avec les niveaux exacts, sont dans
   methode.js (COUPLES_SYNERGIE) et s'affichent dans l'onglet Méthode. */
const SYNERGIES = [
    { de: "Paysan",     vers: "Alchimiste", via: "ses récoltes font les potions de l'Alchimiste (X + 20)" },
    { de: "Alchimiste", vers: "Paysan",     via: "et en retour, ses récoltes font les crafts du Paysan" },
    { de: "Alchimiste", vers: "Bûcheron",   via: "potions de souvenir, vieillesse, ancêtres, glandage" },
    { de: "Bûcheron",   vers: "Trésorerie", via: "substrats vendus en continu en HDV" },
    { de: "Alchimiste", vers: "Pêcheur",    via: "consommables du Pêcheur (X + 20)" }
];
