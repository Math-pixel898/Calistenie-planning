/* =====================================================================
   PROGRAMME.JS — TES EXERCICES, TES SÉANCES, TON PLANNING, TES RÈGLES
   ---------------------------------------------------------------------
   C'est le SEUL fichier à modifier pour changer ton entraînement.
   Tu n'as pas besoin de toucher à app.js.

   Règles d'écriture (sinon l'app ne se charge plus) :
   - Le texte va entre guillemets "comme ceci".
   - Chaque élément d'une liste est séparé par une virgule.
   - Un "id" ne contient ni espace ni accent (ex. "pompes-diamant").
   - Si l'app affiche une page blanche après une modif, c'est souvent
     une virgule ou un guillemet oublié : annule ta dernière modif.

   Signification des champs d'un exercice :
   - nom        : le nom affiché
   - type       : "reps" (répétitions) ou "temps" (secondes de maintien)
   - series     : { debut: séries des semaines 1-2, plein: séries ensuite }
   - cible      : [minimum, maximum] de reps (ou de secondes si type "temps")
   - parCote    : true si la cible est à faire de CHAQUE côté / CHAQUE main
   - repos      : [minimum, maximum] de repos en secondes entre deux séries
   - niveau     : la difficulté / résistance, en texte
   - chargeKg   : (optionnel) la charge en kg, pour le gripper
   - etapes     : comment faire, en quelques étapes
   - facile     : version plus facile
   - difficile  : version plus difficile
   - note       : (optionnel) prudence, doute, conseil
   ===================================================================== */

const PROGRAMME = {

  /* ----- Catégories : ajoute-en une ici si tu veux (ex. "souplesse") ----- */
  categories: {
    pousser: { nom: "Pompes / pousser", emoji: "💪" },
    abdos:   { nom: "Abdos / gainage",  emoji: "🧱" },
    jambes:  { nom: "Jambes",           emoji: "🦵" },
    dos:     { nom: "Dos",              emoji: "🔙" },
    bras:    { nom: "Bras",             emoji: "🦾" },
    grip:    { nom: "Grip (avant-bras)", emoji: "✊" }
  },

  /* ----- Planning de la semaine -----
     Pour chaque jour : la liste des séances (leurs "id", voir plus bas).
     Une liste entre crochets dans la liste = "au choix" (ex. dos à la barre
     OU dos à la maison). Un jour vide [] = repos. */
  planning: {
    lundi:    ["pousser", "abdos", "grip-a"],
    mardi:    [],
    mercredi: ["jambes", ["dos-barre", "dos-maison"], "grip-b"],
    jeudi:    [],
    vendredi: ["bras", "grip-a"],
    samedi:   ["jambes", "abdos"],   // jour facultatif
    dimanche: []
  },
  joursFacultatifs: ["samedi"],

  /* ----- Règles générales ----- */
  regles: {
    semainesPhaseDebut: 2,       // semaines 1-2 = séries "debut", ensuite "plein"
    semainesAvantMonter: [2, 3], // rester 2 à 3 semaines au top avant de monter
    plusPetitCranKg: 1,          // ⚠️ à vérifier sur TON gripper (peut-être 0,5 kg)
    rappels: [
      "Reprise après une pause : vas-y progressivement, même si ça paraît trop facile au début.",
      "Grip : au moins un jour de repos entre deux séances de grip.",
      "Les tendons s'adaptent plus lentement que les muscles : on monte la charge prudemment.",
      "Une douleur vive (différente de la fatigue musculaire) = on arrête l'exercice."
    ]
  },

  /* ----- Séances : une séance = une liste d'exercices, dans l'ordre ----- */
  seances: {
    "pousser": {
      nom: "Pompes / pousser", categorie: "pousser",
      exercices: ["pompes-mur", "pompes-classiques", "pompes-ecartees",
                  "pompes-diamant", "chenille", "pompes-piquees"]
    },
    "abdos": {
      nom: "Abdos / gainage", categorie: "abdos",
      exercices: ["dead-bug", "planche", "planche-laterale",
                  "releves-jambes", "position-creuse", "grimpeurs-lents"]
    },
    "jambes": {
      nom: "Jambes", categorie: "jambes",
      exercices: ["squat", "fentes-arriere", "pont-fessier",
                  "chaise-mur", "fentes-laterales", "mollets"]
    },
    "dos-barre": {
      nom: "Dos — à la barre (dehors)", categorie: "dos",
      exercices: ["suspension-passive", "tirages-omoplates", "tractions-negatives",
                  "tractions-australiennes", "superman"]
    },
    "dos-maison": {
      nom: "Dos — à la maison", categorie: "dos",
      exercices: ["superman", "rowing-sac", "ytw", "anges-inverses", "ecartement-serviette"]
    },
    "bras": {
      nom: "Bras", categorie: "bras",
      exercices: ["pompes-serrees", "dips-chaise", "curl-sac",
                  "curl-serviette", "pompes-sphinx", "pompes-doigts"]
    },
    "grip-a": {
      nom: "Grip — Séance A", categorie: "grip",
      exercices: ["grip-normale", "grip-inversee", "grip-negatifs"]
    },
    "grip-b": {
      nom: "Grip — Séance B", categorie: "grip",
      exercices: ["grip-90", "grip-maintien", "grip-lente-inversee"]
    }
  },

  /* ----- Exercices ----- */
  exercices: {

    /* ===================== POUSSER ===================== */
    "pompes-mur": {
      nom: "Pompes au mur (échauffement)", type: "reps",
      series: { debut: 1, plein: 2 }, cible: [15, 20], repos: [30, 45],
      niveau: "Très facile — sert à chauffer épaules et poignets",
      etapes: [
        "Debout face au mur, mains à hauteur d'épaules, un peu plus écartées qu'elles.",
        "Recule les pieds d'un grand pas, corps bien droit.",
        "Descends la poitrine vers le mur, coudes à environ 45° du corps.",
        "Pousse pour revenir, sans cambrer le dos."
      ],
      facile: "Pieds plus proches du mur.",
      difficile: "Pompes inclinées, mains sur une table ou un plan de travail stable."
    },
    "pompes-classiques": {
      nom: "Pompes classiques", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [10, 15], repos: [60, 90],
      niveau: "Moyen — environ la moitié de ton max (30) pour la reprise",
      etapes: [
        "Mains sous les épaules, corps gainé de la tête aux talons.",
        "Descends en 2 secondes jusqu'à frôler le sol avec la poitrine.",
        "Coudes à environ 45° du corps (pas en croix).",
        "Remonte en poussant fort, sans laisser tomber les hanches."
      ],
      facile: "Mains surélevées (table, lit) ou sur les genoux.",
      difficile: "Descente lente en 3-4 secondes + pause 1 s en bas."
    },
    "pompes-ecartees": {
      nom: "Pompes écartées", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [8, 12], repos: [60, 90],
      niveau: "Moyen — insiste sur les pectoraux",
      etapes: [
        "Mains nettement plus écartées que les épaules, doigts vers l'avant.",
        "Corps gainé, descends la poitrine entre tes mains.",
        "Ne descends pas plus bas que ce qui est confortable pour les épaules.",
        "Remonte en contrôlant."
      ],
      facile: "Sur les genoux ou mains surélevées.",
      difficile: "Pieds surélevés sur une chaise ou un lit.",
      note: "Si les épaules tirent de façon désagréable, réduis l'écartement."
    },
    "pompes-diamant": {
      nom: "Pompes diamant", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [6, 10], repos: [60, 90],
      niveau: "Difficile — insiste sur les triceps",
      etapes: [
        "Mains rapprochées sous la poitrine, pouces et index qui forment un losange.",
        "Corps gainé, coudes qui restent près du corps.",
        "Descends jusqu'à ce que la poitrine approche des mains.",
        "Remonte en poussant."
      ],
      facile: "Sur les genoux, ou mains un peu moins rapprochées.",
      difficile: "Pieds surélevés.",
      note: "Cet exercice peut charger les poignets et les coudes : si ça gêne, prends la version facile."
    },
    "chenille": {
      nom: "Chenille (inchworm) + pompe", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [5, 8], repos: [45, 60],
      niveau: "Moyen — mobilité + gainage + pousser",
      etapes: [
        "Debout, penche-toi et pose les mains au sol (plie les genoux si besoin).",
        "Avance les mains une à une jusqu'à la position de pompe.",
        "Fais une pompe.",
        "Ramène les mains vers les pieds en marchant, puis redresse-toi. = 1 rep."
      ],
      facile: "Sans la pompe au milieu.",
      difficile: "Avance les mains plus loin que la position de pompe avant de faire la pompe."
    },
    "pompes-piquees": {
      nom: "Pompes piquées (prépa poirier)", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [6, 10], repos: [60, 90],
      niveau: "Moyen à difficile — épaules, prépare au poirier",
      etapes: [
        "Position de pompe, puis monte les hanches : le corps forme un V à l'envers.",
        "Mains largeur d'épaules, regarde entre tes mains.",
        "Plie les coudes pour amener le haut de la tête vers le sol, devant les mains.",
        "Pousse pour revenir en haut."
      ],
      facile: "Pieds plus loin des mains (angle moins vertical), amplitude réduite.",
      difficile: "Pieds surélevés sur une chaise ou un lit."
    },

    /* ===================== ABDOS ===================== */
    "dead-bug": {
      nom: "Dead bug", type: "reps", parCote: true,
      series: { debut: 2, plein: 3 }, cible: [6, 10], repos: [30, 45],
      niveau: "Facile — apprend à gainer sans cambrer",
      etapes: [
        "Allongé sur le dos, bras tendus vers le plafond, genoux pliés à 90° en l'air.",
        "Plaque le bas du dos contre le tapis.",
        "Tends lentement un bras derrière toi et la jambe opposée vers l'avant.",
        "Reviens et change de côté. Le dos ne doit pas décoller."
      ],
      facile: "Bouge seulement les jambes.",
      difficile: "Mouvement très lent (3 s pour tendre)."
    },
    "planche": {
      nom: "Gainage planche", type: "temps",
      series: { debut: 2, plein: 3 }, cible: [20, 45], repos: [30, 45],
      niveau: "Moyen",
      etapes: [
        "Sur les avant-bras, coudes sous les épaules.",
        "Corps aligné de la tête aux talons, fesses serrées.",
        "Rentre légèrement le nombril, respire normalement.",
        "Arrête dès que le bas du dos se creuse."
      ],
      facile: "Sur les genoux.",
      difficile: "Lever un pied ou un bras en alternance."
    },
    "planche-laterale": {
      nom: "Gainage latéral", type: "temps", parCote: true,
      series: { debut: 2, plein: 2 }, cible: [15, 30], repos: [30, 45],
      niveau: "Moyen",
      etapes: [
        "Sur le côté, coude sous l'épaule.",
        "Jambes tendues l'une sur l'autre (ou pieds décalés).",
        "Monte les hanches pour aligner le corps.",
        "Tiens, puis change de côté."
      ],
      facile: "Genoux pliés au sol.",
      difficile: "Lever la jambe du dessus."
    },
    "releves-jambes": {
      nom: "Relevés de jambes allongé", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [8, 12], repos: [45, 60],
      niveau: "Moyen",
      etapes: [
        "Allongé sur le dos, mains sous les fesses ou le long du corps.",
        "Bas du dos plaqué au sol.",
        "Monte les jambes jusqu'à la verticale.",
        "Redescends lentement sans toucher le sol si possible."
      ],
      facile: "Genoux pliés.",
      difficile: "Descente en 4 secondes, ou relevés suspendu à la barre (genoux)."
    },
    "position-creuse": {
      nom: "Position creuse (hollow hold)", type: "temps",
      series: { debut: 2, plein: 2 }, cible: [15, 30], repos: [30, 45],
      niveau: "Difficile — base de la gym au sol",
      etapes: [
        "Allongé sur le dos, bas du dos plaqué au sol.",
        "Décolle les épaules et les jambes tendues du sol.",
        "Bras tendus le long des oreilles (ou vers les pieds, plus facile).",
        "Tiens sans que le bas du dos décolle."
      ],
      facile: "Genoux pliés et bras vers les pieds.",
      difficile: "Jambes plus basses, bras derrière la tête."
    },
    "grimpeurs-lents": {
      nom: "Grimpeurs lents (mountain climbers)", type: "reps", parCote: true,
      series: { debut: 2, plein: 2 }, cible: [8, 12], repos: [30, 45],
      niveau: "Facile à moyen",
      etapes: [
        "Position de pompe, bras tendus.",
        "Amène un genou vers la poitrine lentement, sans monter les fesses.",
        "Repose le pied et change de jambe.",
        "Garde le dos plat tout le long."
      ],
      facile: "Mains sur une chaise ou un lit.",
      difficile: "Genou vers le coude opposé."
    },

    /* ===================== JAMBES ===================== */
    "squat": {
      nom: "Squat au poids du corps", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [12, 20], repos: [45, 60],
      niveau: "Facile à moyen",
      etapes: [
        "Pieds un peu plus larges que les hanches, pointes légèrement ouvertes.",
        "Descends en poussant les fesses en arrière, comme pour t'asseoir.",
        "Genoux dans l'axe des pieds, talons au sol, dos droit.",
        "Remonte en poussant dans tout le pied."
      ],
      facile: "S'asseoir sur une chaise et se relever.",
      difficile: "Pause de 2 s en bas, ou descente en 3 s."
    },
    "fentes-arriere": {
      nom: "Fentes arrière alternées", type: "reps", parCote: true,
      series: { debut: 2, plein: 3 }, cible: [8, 10], repos: [45, 60],
      niveau: "Moyen",
      etapes: [
        "Debout, fais un grand pas en arrière.",
        "Descends le genou arrière vers le sol sans le cogner.",
        "Le genou avant reste au-dessus du pied.",
        "Pousse sur la jambe avant pour revenir, puis change de jambe."
      ],
      facile: "Une main au mur pour l'équilibre, amplitude réduite.",
      difficile: "Fente bulgare : pied arrière posé sur une chaise ou un lit."
    },
    "pont-fessier": {
      nom: "Pont fessier", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [12, 20], repos: [45, 60],
      niveau: "Facile",
      etapes: [
        "Allongé sur le dos, genoux pliés, pieds à plat près des fesses.",
        "Pousse dans les talons pour monter le bassin.",
        "Serre les fesses 1 seconde en haut, sans cambrer.",
        "Redescends lentement."
      ],
      facile: "Amplitude réduite.",
      difficile: "Sur une seule jambe."
    },
    "chaise-mur": {
      nom: "Chaise contre le mur", type: "temps",
      series: { debut: 2, plein: 2 }, cible: [20, 45], repos: [45, 60],
      niveau: "Moyen",
      etapes: [
        "Dos contre le mur, descends comme pour t'asseoir.",
        "Cuisses vers l'horizontale (ou moins bas au début).",
        "Genoux au-dessus des chevilles.",
        "Tiens en respirant normalement."
      ],
      facile: "Moins bas.",
      difficile: "Cuisses à l'horizontale, ou un pied décollé."
    },
    "fentes-laterales": {
      nom: "Fentes latérales", type: "reps", parCote: true,
      series: { debut: 1, plein: 2 }, cible: [6, 8], repos: [30, 45],
      niveau: "Moyen",
      etapes: [
        "Pieds écartés largement.",
        "Pousse les fesses en arrière et plie une jambe, l'autre reste tendue.",
        "Talons au sol, dos droit.",
        "Reviens au centre et change de côté."
      ],
      facile: "Amplitude réduite, une main sur une chaise.",
      difficile: "Descendre plus bas, pause de 2 s."
    },
    "mollets": {
      nom: "Mollets debout", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [15, 25], repos: [30, 45],
      niveau: "Facile",
      etapes: [
        "Debout, une main au mur pour l'équilibre.",
        "Monte sur la pointe des pieds le plus haut possible.",
        "Tiens 1 seconde en haut.",
        "Redescends lentement."
      ],
      facile: "Amplitude réduite.",
      difficile: "Sur une jambe, avant du pied sur une marche (talon dans le vide)."
    },

    /* ===================== DOS ===================== */
    "suspension-passive": {
      nom: "Suspension à la barre", type: "temps",
      series: { debut: 2, plein: 3 }, cible: [15, 30], repos: [60, 90],
      niveau: "Facile à moyen — sollicite aussi le grip",
      etapes: [
        "Attrape la barre, mains largeur d'épaules, paumes vers l'avant.",
        "Laisse-toi pendre, bras tendus.",
        "Respire calmement.",
        "Lâche avant de glisser, en reposant les pieds."
      ],
      facile: "Garder les pieds au sol pour prendre une partie du poids.",
      difficile: "Suspension plus longue."
    },
    "tirages-omoplates": {
      nom: "Tirages d'omoplates (scapula pull-ups)", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [6, 10], repos: [60, 75],
      niveau: "Facile à moyen",
      etapes: [
        "Suspendu, bras tendus.",
        "Sans plier les coudes, tire les épaules vers le bas (loin des oreilles).",
        "Le corps monte de quelques centimètres.",
        "Relâche lentement."
      ],
      facile: "Pieds au sol pour s'aider.",
      difficile: "Tenir 2 secondes en position haute."
    },
    "tractions-negatives": {
      nom: "Tractions négatives", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [3, 5], repos: [90, 120],
      niveau: "Difficile",
      etapes: [
        "Monte en haut de la barre en sautant (ou avec un banc), menton au-dessus.",
        "Descends le plus lentement possible : vise 3 à 5 secondes.",
        "Contrôle jusqu'aux bras tendus.",
        "Repose les pieds, remonte, recommence."
      ],
      facile: "Descente en 2 secondes, ou tractions australiennes à la place.",
      difficile: "Vraies tractions complètes.",
      note: "Ça fatigue beaucoup : peu de reps, beaucoup de repos."
    },
    "tractions-australiennes": {
      nom: "Tractions australiennes (barre basse)", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [6, 12], repos: [60, 90],
      niveau: "Moyen",
      etapes: [
        "Barre à hauteur de taille environ, allonge-toi dessous.",
        "Attrape la barre, corps droit, talons au sol.",
        "Tire la poitrine vers la barre en serrant les omoplates.",
        "Redescends lentement."
      ],
      facile: "Barre plus haute (corps plus vertical), genoux pliés.",
      difficile: "Pieds surélevés.",
      note: "Je ne sais pas si ta barre extérieure a une hauteur basse : si non, saute cet exercice."
    },
    "superman": {
      nom: "Superman au sol", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [10, 15], repos: [30, 45],
      niveau: "Facile",
      etapes: [
        "Allongé sur le ventre, bras tendus devant.",
        "Décolle doucement bras, poitrine et jambes.",
        "Tiens 2 secondes, regard vers le sol.",
        "Redescends lentement."
      ],
      facile: "Lever seulement les bras, ou seulement les jambes.",
      difficile: "Tenir 5 secondes en haut."
    },
    "rowing-sac": {
      nom: "Rowing avec sac à dos", type: "reps", parCote: true,
      series: { debut: 2, plein: 3 }, cible: [10, 15], repos: [45, 60],
      niveau: "Moyen — le poids dépend de ce que tu mets dans le sac",
      etapes: [
        "Remplis un sac à dos (livres, bouteilles d'eau).",
        "Une main et un genou sur une chaise ou un lit, dos plat.",
        "Tire le sac vers la hanche en serrant l'omoplate.",
        "Redescends lentement, puis change de bras."
      ],
      facile: "Sac plus léger.",
      difficile: "Sac plus lourd, ou pause de 2 s en haut.",
      note: "Vérifie que les bretelles du sac sont solides."
    },
    "ytw": {
      nom: "Y-T-W allongé", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [6, 8], repos: [30, 45],
      niveau: "Facile — haut du dos et épaules",
      etapes: [
        "Allongé sur le ventre, front sur une serviette.",
        "Bras en Y, pouces vers le haut : décolle les bras, redescends.",
        "Même chose bras en T, puis en W (coudes pliés).",
        "Y + T + W = 1 rep."
      ],
      facile: "Seulement Y et T.",
      difficile: "Tenir 2 secondes chaque position."
    },
    "anges-inverses": {
      nom: "Anges inversés (au sol)", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [8, 12], repos: [30, 45],
      niveau: "Facile",
      etapes: [
        "Allongé sur le ventre, bras le long du corps, décollés du sol.",
        "Fais glisser les bras en arc de cercle jusqu'au-dessus de la tête.",
        "Reviens le long du corps sans toucher le sol.",
        "Mouvement lent et contrôlé."
      ],
      facile: "Reposer les bras entre chaque rep.",
      difficile: "Mouvement très lent (4 s par trajet)."
    },
    "ecartement-serviette": {
      nom: "Écartement de serviette (isométrique)", type: "temps",
      series: { debut: 2, plein: 2 }, cible: [15, 30], repos: [30, 45],
      niveau: "Facile",
      etapes: [
        "Debout, tiens une serviette tendue devant toi, bras tendus.",
        "Tire comme pour l'écarter, en serrant les omoplates.",
        "Garde les épaules basses.",
        "Tiens en respirant."
      ],
      facile: "Tirer moins fort.",
      difficile: "Tirer plus fort et tenir plus longtemps."
    },

    /* ===================== BRAS ===================== */
    "pompes-serrees": {
      nom: "Pompes serrées (triceps)", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [8, 12], repos: [60, 90],
      niveau: "Moyen",
      etapes: [
        "Mains largeur d'épaules (ou un peu moins), sous les épaules.",
        "Coudes qui frôlent les côtes en descendant.",
        "Descends en 2 secondes.",
        "Remonte en tendant complètement les bras."
      ],
      facile: "Mains surélevées ou sur les genoux.",
      difficile: "Pompes diamant, ou pieds surélevés."
    },
    "dips-chaise": {
      nom: "Dips sur chaise", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [8, 12], repos: [60, 90],
      niveau: "Moyen",
      etapes: [
        "Chaise stable calée contre un mur. Dos à la chaise, mains sur le bord.",
        "Jambes devant toi, genoux pliés.",
        "Plie les coudes vers l'arrière pour descendre, sans aller trop bas.",
        "Pousse pour remonter."
      ],
      facile: "Pieds plus proches, moins de profondeur.",
      difficile: "Jambes tendues.",
      note: "Ça peut gêner l'avant des épaules : reste sur une petite amplitude, arrête si ça pince."
    },
    "curl-sac": {
      nom: "Curl biceps avec sac à dos", type: "reps",
      series: { debut: 2, plein: 3 }, cible: [10, 15], repos: [45, 60],
      niveau: "Moyen — dépend du poids du sac",
      etapes: [
        "Debout, tiens le sac par la poignée du haut, bras tendu.",
        "Plie le coude pour monter le sac, coude collé au corps.",
        "Descends lentement en 2-3 secondes.",
        "Change de bras après la série."
      ],
      facile: "Sac plus léger.",
      difficile: "Sac plus lourd, ou à deux mains à la barre : tractions paumes vers toi.",
      note: "Sans haltères, les biceps sont difficiles à charger : la barre (tractions supination) sera plus efficace plus tard."
    },
    "curl-serviette": {
      nom: "Curl isométrique serviette", type: "temps",
      series: { debut: 2, plein: 2 }, cible: [15, 25], repos: [30, 45],
      niveau: "Facile à moyen",
      etapes: [
        "Mets un pied sur le milieu d'une serviette, tiens les deux bouts.",
        "Coudes pliés à 90°.",
        "Tire vers le haut le plus fort possible, sans bouger.",
        "Tiens en respirant (ne bloque pas la respiration)."
      ],
      facile: "Tirer à 50 % de ta force.",
      difficile: "Changer d'angle (coudes à 45°, puis 120°)."
    },
    "pompes-sphinx": {
      nom: "Pompes sphinx (triceps)", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [6, 10], repos: [60, 75],
      niveau: "Difficile",
      etapes: [
        "Position de planche sur les avant-bras.",
        "Pousse dans les paumes pour décoller les coudes et tendre les bras.",
        "Redescends sur les avant-bras en contrôlant.",
        "Corps gainé tout le long."
      ],
      facile: "Contre un mur ou sur les genoux.",
      difficile: "Mains un peu plus en avant."
    },
    "pompes-doigts": {
      nom: "Pompes inclinées bout des doigts", type: "reps",
      series: { debut: 2, plein: 2 }, cible: [5, 10], repos: [60, 90],
      niveau: "Moyen — le gripper ne travaille pas l'appui au sol",
      etapes: [
        "Mains sur un plan de travail ou une table stable, sur le bout des doigts écartés.",
        "Doigts légèrement pliés, en « tente ».",
        "Fais des pompes inclinées lentes.",
        "Arrête si les doigts s'écrasent à plat."
      ],
      facile: "Contre le mur.",
      difficile: "Plus bas (chaise), puis au sol sur les genoux.",
      note: "À faire de temps en temps, sans forcer : les doigts sont fragiles."
    },

    /* ===================== GRIP (gripper réglable, 12 kg max) =====================
       Les kg sont des points de départ à ajuster, pas des valeurs prouvées.
       Positions inversée et 90° = variantes, sans preuve qu'elles soient
       meilleures que la position normale.
       Résistances : haute ≈ 10 kg, haute+ ≈ 11 kg, moyenne ≈ 9 kg, basse ≈ 8 kg */
    "grip-normale": {
      nom: "Gripper — position normale", type: "reps", parCote: true,
      series: { debut: 2, plein: 4 }, cible: [5, 8], repos: [60, 120],
      niveau: "Haute résistance", chargeKg: 10,
      etapes: [
        "Doigts le plus bas possible sur la poignée du haut, serrés.",
        "Ferme à fond.",
        "Ouvre lentement.",
        "Fais la série avec une main, puis avec l'autre."
      ],
      facile: "Résistance moyenne (≈ 9 kg).",
      difficile: "Monter d'un cran — seulement après 2-3 semaines au top de la fourchette."
    },
    "grip-inversee": {
      nom: "Gripper — position inversée", type: "reps", parCote: true,
      series: { debut: 2, plein: 3 }, cible: [6, 10], repos: [60, 120],
      niveau: "Basse résistance", chargeKg: 8,
      etapes: [
        "Retourne le gripper dans la main.",
        "Ferme à fond.",
        "Ouvre lentement.",
        "Une main, puis l'autre."
      ],
      facile: "Un cran plus bas.",
      difficile: "Un cran plus haut, après 2-3 semaines au top."
    },
    "grip-negatifs": {
      nom: "Gripper — négatifs (position normale)", type: "reps", parCote: true,
      series: { debut: 2, plein: 2 }, cible: [4, 5], repos: [120, 120],
      niveau: "Haute+ (négatifs)", chargeKg: 11,
      etapes: [
        "Ferme le gripper avec les deux mains.",
        "Lâche une main.",
        "Ouvre lentement avec une seule main, en 4 à 5 secondes.",
        "Une main, puis l'autre."
      ],
      facile: "Haute résistance (≈ 10 kg).",
      difficile: "Descente plus lente (6 s) avant d'augmenter la charge."
    },
    "grip-90": {
      nom: "Gripper — position à 90°", type: "reps", parCote: true,
      series: { debut: 2, plein: 3 }, cible: [6, 10], repos: [60, 120],
      niveau: "Basse résistance", chargeKg: 8,
      etapes: [
        "Tiens le gripper tourné à 90° dans la main.",
        "Ferme à fond.",
        "Ouvre lentement.",
        "Une main, puis l'autre."
      ],
      facile: "Un cran plus bas.",
      difficile: "Un cran plus haut, après 2-3 semaines au top."
    },
    "grip-maintien": {
      nom: "Gripper — maintien fermé", type: "temps", parCote: true,
      series: { debut: 2, plein: 3 }, cible: [10, 20], repos: [60, 120],
      niveau: "Résistance moyenne", chargeKg: 9,
      etapes: [
        "Position normale.",
        "Ferme le gripper (aide-toi de l'autre main si besoin).",
        "Tiens fermé avec la main d'entraînement seule.",
        "Une main, puis l'autre."
      ],
      facile: "Basse résistance (≈ 8 kg).",
      difficile: "Maintien plus long avant de monter de charge."
    },
    "grip-lente-inversee": {
      nom: "Gripper — série lente inversée", type: "reps", parCote: true,
      series: { debut: 2, plein: 2 }, cible: [10, 12], repos: [60, 120],
      niveau: "Basse résistance", chargeKg: 8,
      etapes: [
        "Gripper retourné dans la main.",
        "Ferme à fond.",
        "Ouvre en 3 secondes.",
        "Une main, puis l'autre."
      ],
      facile: "Un cran plus bas.",
      difficile: "Ouverture en 4 secondes."
    }
  }
};
