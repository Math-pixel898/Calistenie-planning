/* =====================================================================
   ILLUSTRATIONS.JS — les petites animations des exercices
   ---------------------------------------------------------------------
   Chaque exercice est dessiné par un bonhomme en bâtons, vu de côté
   (sauf indication), qui passe d'une position à l'autre en boucle.

   Comment c'est décrit (pour les curieux) :
   - L'image fait 200 de large. Le sol est à la hauteur SOL (114).
     Les x vont de gauche à droite, les y de haut en bas.
   - Une "pose" donne : la position de la hanche, l'angle du tronc
     (en degrés : 0 = vers la droite, 90 = vers le bas, -90 = vers le haut),
     puis les bras et les jambes :
       · soit deux angles  [angle du bras, angle de l'avant-bras]
       · soit un point à atteindre  { c: [x, y], s: 1 ou -1 }
         (s = de quel côté se plie le coude ou le genou)
   - droit(cheville, angle) = corps bien droit (planche, pompe).
   - recherche = ce qui est cherché sur YouTube par le bouton « Voir des vidéos ».
   ===================================================================== */

const ILLUSTRATIONS = (() => {
  const SOL = 114;

  // Corps tendu de la cheville aux épaules, incliné de "angle" degrés
  // (le corps pivote d'un bloc autour des pieds pendant l'animation)
  function droit(cheville, angle) {
    return { corps: [cheville[0], cheville[1], angle], tronc: angle, jambes: { c: cheville, s: -1 } };
  }
  const debout = { hanche: [100, 62], tronc: -90, jambes: { c: [100, SOL], s: -1 } };

  return {
    /* ===================== POUSSER ===================== */
    "pompes-mur": {
      recherche: "pompes contre le mur",
      accessoires: [{ t: "mur", x: 152 }],
      poses: [
        { ...droit([92, SOL], -73), bras: { c: [150, 38], s: 1 } },
        { ...droit([92, SOL], -62), bras: { c: [150, 38], s: 1 } }
      ],
      duree: 1.3
    },
    "pompes-classiques": {
      recherche: "pompes bonne technique",
      poses: [
        { ...droit([62, SOL], -23), bras: { c: [140, SOL], s: 1 } },
        { ...droit([62, SOL], -7), bras: { c: [140, SOL], s: 1 } }
      ],
      duree: 1.2
    },
    "pompes-ecartees": {
      recherche: "pompes mains écartées",
      legende: "Vu de côté. En haut à droite : les mains vues de dessus, plus écartées que les épaules.",
      accessoires: [{ t: "reperes", forme: "larges" }],
      poses: [
        { ...droit([62, SOL], -23), bras: { c: [140, SOL], s: 1 } },
        { ...droit([62, SOL], -7), bras: { c: [140, SOL], s: 1 } }
      ],
      duree: 1.2
    },
    "pompes-diamant": {
      recherche: "pompes diamant",
      legende: "Vu de côté. En haut à droite : les mains vues de dessus, qui forment un losange.",
      accessoires: [{ t: "reperes", forme: "diamant" }],
      poses: [
        { ...droit([62, SOL], -23), bras: { c: [133, SOL], s: 1 } },
        { ...droit([62, SOL], -8), bras: { c: [133, SOL], s: 1 } }
      ],
      duree: 1.2
    },
    "chenille": {
      recherche: "inchworm push up",
      poses: [
        { hanche: [70, 62], tronc: -90, bras: { c: [70, 63], s: 1 }, jambes: { c: [70, SOL], s: -1 } },
        { hanche: [72, 64], tronc: 72, tete: 85, bras: { c: [108, SOL - 1], s: 1 }, jambes: { c: [70, SOL], s: -1 } },
        { ...droit([70, SOL], -23), bras: { c: [148, SOL], s: 1 } },
        { ...droit([70, SOL], -7), bras: { c: [148, SOL], s: 1 } },
        { ...droit([70, SOL], -23), bras: { c: [148, SOL], s: 1 } },
        { hanche: [72, 64], tronc: 72, tete: 85, bras: { c: [108, SOL - 1], s: 1 }, jambes: { c: [70, SOL], s: -1 } }
      ],
      durees: [1.2, 1.4, 0.9, 0.9, 1.4, 1.2]
    },
    "pompes-piquees": {
      recherche: "pike push up",
      poses: [
        { hanche: [86, 69], tronc: 55, tete: 62, bras: { c: [130, SOL], s: -1 }, jambes: { c: [60, SOL], s: -1 } },
        { hanche: [92, 72], tronc: 62, tete: 30, bras: { c: [130, SOL], s: -1 }, jambes: { c: [60, SOL], s: -1 } }
      ],
      duree: 1.3
    },

    /* ===================== ABDOS ===================== */
    "dead-bug": {
      recherche: "dead bug exercice",
      legende: "Allongé sur le dos : un bras et la jambe opposée s'allongent, puis l'autre côté.",
      poses: [
        { hanche: [90, 107], tronc: 0, tete: -6, bras: [[-90, -90], [-90, -90]], jambes: [[270, 180], [270, 180]] },
        { hanche: [90, 107], tronc: 0, tete: -6, bras: [[-90, -90], [-8, -8]], jambes: [[188, 188], [270, 180]] },
        { hanche: [90, 107], tronc: 0, tete: -6, bras: [[-90, -90], [-90, -90]], jambes: [[270, 180], [270, 180]] },
        { hanche: [90, 107], tronc: 0, tete: -6, bras: [[-8, -8], [-90, -90]], jambes: [[270, 180], [188, 188]] }
      ],
      duree: 1.3
    },
    "planche": {
      recherche: "gainage planche bonne technique",
      poses: [{ ...droit([60, SOL], -13), bras: [90, 0] }]
    },
    "planche-laterale": {
      recherche: "gainage latéral",
      legende: "Vu de face : appui sur un avant-bras, l'autre bras vers le haut, corps aligné.",
      poses: [{ ...droit([60, SOL], -13), bras: [[90, 0], [-90, -90]] }]
    },
    "releves-jambes": {
      recherche: "relevés de jambes allongé",
      poses: [
        { hanche: [100, 107], tronc: 0, tete: -6, bras: [175, 175], jambes: [188, 188] },
        { hanche: [100, 107], tronc: 0, tete: -6, bras: [175, 175], jambes: [272, 272] }
      ],
      duree: 1.6
    },
    "position-creuse": {
      recherche: "hollow body hold",
      poses: [{ hanche: [100, 108], tronc: -12, tete: -16, bras: [-14, -14], jambes: [193, 193] }]
    },
    "grimpeurs-lents": {
      recherche: "mountain climbers lents",
      poses: [
        { ...droit([62, SOL], -23), bras: { c: [140, SOL], s: 1 }, jambes: [{ c: [62, SOL], s: -1 }, { c: [62, SOL], s: -1 }] },
        { ...droit([62, SOL], -23), bras: { c: [140, SOL], s: 1 }, jambes: [{ c: [104, SOL - 3], s: -1 }, { c: [62, SOL], s: -1 }] },
        { ...droit([62, SOL], -23), bras: { c: [140, SOL], s: 1 }, jambes: [{ c: [62, SOL], s: -1 }, { c: [62, SOL], s: -1 }] },
        { ...droit([62, SOL], -23), bras: { c: [140, SOL], s: 1 }, jambes: [{ c: [62, SOL], s: -1 }, { c: [104, SOL - 3], s: -1 }] }
      ],
      duree: 0.9
    },

    /* ===================== JAMBES ===================== */
    "squat": {
      recherche: "squat poids du corps technique",
      poses: [
        { ...debout, bras: [0, 0], pied: 0 },
        { hanche: [80, 90], tronc: -58, bras: [-4, -4], jambes: { c: [100, SOL], s: -1 }, pied: 0 }
      ],
      duree: 1.4
    },
    "fentes-arriere": {
      recherche: "fentes arrière",
      poses: [
        { ...debout, bras: [95, 95], jambes: [{ c: [100, SOL], s: -1 }, { c: [100, SOL], s: -1 }] },
        { hanche: [97, 66], tronc: -90, bras: [95, 95], jambes: [{ c: [100, SOL], s: -1 }, { c: [78, SOL - 10], s: -1 }] },
        { hanche: [90, 86], tronc: -90, bras: [95, 95], jambes: [{ c: [100, SOL], s: -1 }, { c: [60, SOL], s: -1 }] },
        { hanche: [97, 66], tronc: -90, bras: [95, 95], jambes: [{ c: [100, SOL], s: -1 }, { c: [78, SOL - 10], s: -1 }] }
      ],
      durees: [0.6, 0.9, 0.9, 0.6]
    },
    "pont-fessier": {
      recherche: "pont fessier",
      poses: [
        { hanche: [95, 107], tronc: 0, tete: -6, bras: [178, 178], jambes: { c: [70, SOL], s: 1 } },
        { hanche: [95, 88], tronc: 34, tete: 8, bras: [178, 178], jambes: { c: [70, SOL], s: 1 } }
      ],
      duree: 1.3
    },
    "chaise-mur": {
      recherche: "chaise contre le mur exercice",
      accessoires: [{ t: "mur", x: 72 }],
      poses: [{ hanche: [78, 88], tronc: -90, bras: [90, 90], jambes: { c: [104, SOL], s: -1 }, pied: 0 }]
    },
    "fentes-laterales": {
      recherche: "fentes latérales",
      vue: "face",
      legende: "Vu de face : on plie une jambe en poussant les fesses en arrière, l'autre reste tendue.",
      poses: [
        { hanche: [100, 66], tronc: -90, largeur: 9, bras: [[100, 100], [80, 80]], jambes: [{ c: [72, SOL], s: 1 }, { c: [128, SOL], s: -1 }] },
        { hanche: [112, 73], tronc: -84, largeur: 9, bras: [[100, 100], [80, 80]], jambes: [{ c: [72, SOL], s: 1 }, { c: [128, SOL], s: -1 }] },
        { hanche: [100, 66], tronc: -90, largeur: 9, bras: [[100, 100], [80, 80]], jambes: [{ c: [72, SOL], s: 1 }, { c: [128, SOL], s: -1 }] },
        { hanche: [88, 73], tronc: -96, largeur: 9, bras: [[100, 100], [80, 80]], jambes: [{ c: [72, SOL], s: 1 }, { c: [128, SOL], s: -1 }] }
      ],
      duree: 1.2
    },
    "mollets": {
      recherche: "mollets debout poids du corps",
      poses: [
        { hanche: [100, 59], tronc: -90, bras: [95, 95], jambes: { c: [100, SOL - 3], s: -1 }, pied: 0 },
        { hanche: [100, 53], tronc: -90, bras: [95, 95], jambes: { c: [100, SOL - 9], s: -1 }, pied: 50 }
      ],
      duree: 0.9
    },

    /* ===================== DOS ===================== */
    "suspension-passive": {
      recherche: "dead hang barre",
      hauteur: 155, sol: null,
      accessoires: [{ t: "barre", y: 22, x1: 60, x2: 140 }],
      poses: [{ hanche: [100, 88], tronc: -90, bras: { c: [100, 22], s: 1 }, jambes: [95, 100] }]
    },
    "tirages-omoplates": {
      recherche: "scapula pull up",
      legende: "Bras toujours tendus : on tire seulement les épaules vers le bas, le corps monte un peu.",
      hauteur: 155, sol: null,
      accessoires: [{ t: "barre", y: 22, x1: 60, x2: 140 }],
      poses: [
        { hanche: [100, 88], tronc: -90, bras: { c: [100, 22], tendu: true }, jambes: [95, 100] },
        { hanche: [100, 82], tronc: -90, bras: { c: [100, 22], tendu: true }, jambes: [95, 100] }
      ],
      duree: 1
    },
    "tractions-negatives": {
      recherche: "tractions négatives",
      legende: "On part en haut (en sautant), puis on descend le plus lentement possible.",
      hauteur: 155, sol: null,
      accessoires: [{ t: "barre", y: 22, x1: 60, x2: 140 }],
      poses: [
        { hanche: [96, 57], tronc: -90, bras: { c: [100, 22], s: 1 }, jambes: [95, 125] },
        { hanche: [100, 88], tronc: -90, bras: { c: [100, 22], s: 1 }, jambes: [95, 125] }
      ],
      durees: [3.2, 0.9]
    },
    "tractions-australiennes": {
      recherche: "tractions australiennes",
      accessoires: [{ t: "barreBasse", x: 134, y: 56 }],
      poses: [
        { ...droit([54, SOL], -17), bras: { c: [134, 56], s: 1 } },
        { ...droit([54, SOL], -34), tete: -50, bras: { c: [134, 56], s: 1 } }
      ],
      duree: 1.3
    },
    "superman": {
      recherche: "superman exercice dos",
      legende: "Allongé sur le ventre : on décolle doucement bras, poitrine et jambes.",
      poses: [
        { hanche: [95, 107], tronc: 0, tete: -6, bras: [0, 0], jambes: [180, 180] },
        { hanche: [95, 107], tronc: -9, tete: -16, bras: [-13, -13], jambes: [191, 191] }
      ],
      duree: 1.4
    },
    "rowing-sac": {
      recherche: "rowing un bras sac à dos",
      accessoires: [{ t: "banc", x1: 132, x2: 170, y: 92 }, { t: "sac", main: 0 }],
      poses: [
        { hanche: [90, 70], tronc: -4, tete: -10, bras: [{ c: [122, 104], s: 1 }, { c: [146, 92], s: 1 }], jambes: { c: [88, SOL], s: -1 } },
        { hanche: [90, 70], tronc: -4, tete: -10, bras: [{ c: [106, 80], s: 1 }, { c: [146, 92], s: 1 }], jambes: { c: [88, SOL], s: -1 } }
      ],
      duree: 1.2
    },
    "ytw": {
      recherche: "exercice YTW allongé",
      vue: "dessus", sol: null,
      legende: "Vu de dessus, allongé sur le ventre : les bras dessinent un Y, puis un T, puis un W.",
      poses: [
        { hanche: [100, 68], tronc: -90, largeur: 9, bras: [[-120, -120], [-60, -60]], jambes: [[92, 92], [88, 88]] },
        { hanche: [100, 68], tronc: -90, largeur: 9, bras: [[-180, -180], [0, 0]], jambes: [[92, 92], [88, 88]] },
        { hanche: [100, 68], tronc: -90, largeur: 9, bras: [[-210, -120], [30, -60]], jambes: [[92, 92], [88, 88]] }
      ],
      duree: 1.1, pause: 0.7
    },
    "anges-inverses": {
      recherche: "reverse snow angels",
      vue: "dessus", sol: null,
      legende: "Vu de dessus, allongé sur le ventre : les bras glissent des hanches jusqu'au-dessus de la tête.",
      poses: [
        { hanche: [100, 68], tronc: -90, largeur: 9, bras: [[100, 100], [80, 80]], jambes: [[92, 92], [88, 88]] },
        { hanche: [100, 68], tronc: -90, largeur: 9, bras: [[260, 260], [-80, -80]], jambes: [[92, 92], [88, 88]] }
      ],
      duree: 2
    },
    "ecartement-serviette": {
      recherche: "towel pull apart isometric",
      vue: "face",
      legende: "Vu de face : on tire la serviette comme pour l'écarter, sans bouger.",
      accessoires: [{ t: "serviette", de: "main0", a: "main1" }],
      poses: [
        { hanche: [100, 62], tronc: -90, largeur: 9, bras: [[160, 175], [20, 5]], jambes: [[95, 95], [85, 85]] },
        { hanche: [100, 62], tronc: -90, largeur: 9, bras: [[163, 178], [17, 2]], jambes: [[95, 95], [85, 85]] }
      ],
      duree: 0.8
    },

    /* ===================== BRAS ===================== */
    "pompes-serrees": {
      recherche: "pompes serrées triceps",
      poses: [
        { ...droit([62, SOL], -23), bras: { c: [135, SOL], s: 1 } },
        { ...droit([62, SOL], -8), bras: { c: [135, SOL], s: 1 } }
      ],
      duree: 1.2
    },
    "dips-chaise": {
      recherche: "dips sur chaise",
      accessoires: [{ t: "chaise", x1: 62, x2: 94, y: 80 }],
      poses: [
        { hanche: [104, 79], tronc: -90, bras: { c: [92, 80], s: 1 }, jambes: { c: [136, SOL], s: -1 } },
        { hanche: [105, 96], tronc: -90, bras: { c: [92, 80], s: 1 }, jambes: { c: [136, SOL], s: -1 } }
      ],
      duree: 1.3
    },
    "curl-sac": {
      recherche: "curl biceps sac à dos",
      accessoires: [{ t: "sac", main: 0 }],
      poses: [
        { ...debout, bras: [[90, 88], [92, 92]], pied: 0 },
        { ...debout, bras: [[90, -75], [92, 92]], pied: 0 }
      ],
      duree: 1.2
    },
    "curl-serviette": {
      recherche: "towel bicep curl isometric",
      legende: "Un pied sur la serviette, coudes à 90° : on tire vers le haut sans bouger.",
      accessoires: [{ t: "serviette", de: "main0", a: "pied0" }],
      poses: [{ hanche: [100, 62], tronc: -90, bras: [[90, 0], [92, 2]], jambes: [{ c: [108, SOL], s: -1 }, { c: [96, SOL], s: -1 }], pied: 0 }]
    },
    "pompes-sphinx": {
      recherche: "sphinx push up",
      legende: "Des avant-bras posés au sol aux bras tendus, mains au même endroit.",
      poses: [
        { ...droit([60, SOL], -13), bras: { c: [156, SOL - 1], s: 1 } },
        { ...droit([60, SOL], -20), bras: { c: [156, SOL - 1], s: 1 } }
      ],
      duree: 1.3
    },
    "pompes-doigts": {
      recherche: "fingertip incline push up",
      legende: "Mains sur une table stable, appui sur le bout des doigts.",
      accessoires: [{ t: "table", x1: 146, x2: 186, y: 84 }],
      poses: [
        { ...droit([60, SOL], -38), bras: { c: [150, 84], s: 1 } },
        { ...droit([60, SOL], -29), bras: { c: [150, 84], s: 1 } }
      ],
      duree: 1.3
    },

    /* ===================== GRIP : vidéos seulement ===================== */
    "grip-normale": { recherche: "hand gripper technique" },
    "grip-inversee": { recherche: "hand gripper reverse grip" },
    "grip-negatifs": { recherche: "hand gripper negatives" },
    "grip-90": { recherche: "hand gripper 90 degrees" },
    "grip-maintien": { recherche: "hand gripper hold" },
    "grip-lente-inversee": { recherche: "hand gripper reverse grip slow" }
  };
})();
