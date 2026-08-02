import type { BoxDef, LevelDef } from '../core/types.js';

/**
 * Le hall.
 *
 * Ce n'est pas une salle d'attente, c'est la première leçon. Une paire de
 * portails est plantée bien en vue, au milieu, et les gens jouent avec sans
 * qu'on leur dise rien. On arrive, on voit un inconnu traverser un torii et
 * devenir minuscule, et on a compris la règle du jeu — sans texte, sans
 * tutoriel, juste en regardant quelqu'un d'autre.
 *
 * Les deux faces sont volontairement DÉCALÉES et ne se regardent pas : face à
 * face, elles se refléteraient l'une l'autre à l'infini, ce qui est spectaculaire
 * mais coûteux, et surtout on traverserait l'une en voulant atteindre l'autre.
 *
 * Au nord, l'arche d'Aventure mène à la première énigme.
 */

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, ...opts });

const FAR = 70;

/** Repères de taille. Sans eux, changer d'échelle ne se verrait pas. */
const markers = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const spots: [number, number, number][] = [
    // x, z, hauteur — un escalier de repères, du pavé à la tour
    [-20, 16, 0.5],
    [-14, 18, 1.2],
    [-8, 20, 2.4],
    [0, 22, 4.8],
    [8, 20, 9.6],
    [16, 17, 19.2],
    [-24, -14, 3],
    [22, -12, 6],
    [26, 8, 12],
    [-28, 4, 1.8],
  ];
  for (const [x, z, h] of spots) {
    const w = Math.max(0.6, h * 0.32);
    out.push(box([x - w, -0.5, z - w], [x + w, h, z + w], 1 + ((h * 7) % 2 | 0)));
    out.push(box([x - w - 0.22, h - 0.08, z - w - 0.22], [x + w + 0.22, h + 0.3, z + w + 0.22], 2));
  }
  return out;
};

/**
 * Une arche : deux montants et un linteau, à l'échelle d'un humain.
 *
 * `cx` est le milieu du passage, `w` sa demi-largeur. La traverse basse est
 * volontairement DÉCALÉE en profondeur (t * 0,9 contre t) : deux faces
 * exactement dans le même plan se disputent la profondeur et grésillent.
 */
const arche = (cx: number, z: number, w: number, h: number, ink: number, t = 0.45): BoxDef[] => [
  box([cx - w - t, -0.4, z - t], [cx - w, h, z + t], ink),
  box([cx + w, -0.4, z - t], [cx + w + t, h, z + t], ink),
  box([cx - w - t * 2.4, h, z - t * 1.3], [cx + w + t * 2.4, h + t * 1.2, z + t * 1.3], ink),
  // La traverse basse rentre de 4 cm dans les montants au lieu d'affleurer :
  // à l'identique, ses joues gauche et droite se confondaient avec les leurs.
  box([cx - w - t + 0.04, h * 0.82, z - t * 0.9], [cx + w + t - 0.04, h * 0.82 + t * 0.45, z + t * 0.9], 2),
];

/**
 * LES TROIS SORTIES DU HALL.
 *
 * Elles ne portent aucune inscription, et c'est délibéré : **elles se
 * distinguent par leur forme.** Une seule ouverture pour partir seul, deux
 * ouvertures jumelles pour partir à deux, une arche de guingois pour le rêve.
 * On comprend laquelle mène où avant d'avoir lu quoi que ce soit — comme on
 * comprend la règle des portails en regardant un inconnu rapetisser.
 *
 * Les pavés au sol répètent le même signe : un devant la première, deux côte à
 * côte devant la deuxième, une poignée dispersée devant la troisième.
 */
const SEUIL_Z = -24;
// Le solo est AU MILIEU, face au point d'arrivée. C'est l'arche qu'on franchit
// sans réfléchir, en marchant droit devant — et c'est la seule qui fonctionne
// toujours. Mettre le duo là aurait laissé un joueur seul attendre dans le vide
// pour n'avoir fait que marcher tout droit.
export const ARCHE_SOLO_X = 0;
export const ARCHE_DUO_X = -27;
export const ARCHE_REVE_X = 27;

const arches = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // Seul — une porte franche, sans ornement. La plus simple des trois.
  out.push(...arche(ARCHE_SOLO_X, SEUIL_Z, 2.6, 5.0, 3));
  out.push(box([ARCHE_SOLO_X - 1.1, -0.35, -19.2], [ARCHE_SOLO_X + 1.1, 0.16, -17.4], 2));

  // À deux — deux passages jumeaux sous un même linteau. Le montant du milieu
  // est mince : on voit à travers, on comprend qu'il en faut deux.
  out.push(...arche(ARCHE_DUO_X - 2.9, SEUIL_Z, 2.1, 5.4, 3));
  out.push(...arche(ARCHE_DUO_X + 2.9, SEUIL_Z, 2.1, 5.4, 3));
  // Linteau commun, posé PAR-DESSUS les deux. Il mord de 20 cm en largeur, et
  // surtout il DESCEND de 10 cm dans les deux arches (5,3 au lieu de 5,4) :
  // posé pile sur leur sommet, sa face inférieure se confondait avec la leur.
  out.push(box([ARCHE_DUO_X - 6.0, 5.3, SEUIL_Z - 0.75], [ARCHE_DUO_X + 6.0, 6.1, SEUIL_Z + 0.75], 2));
  out.push(box([ARCHE_DUO_X - 2.6, -0.35, -19.2], [ARCHE_DUO_X - 0.5, 0.16, -17.4], 2));
  out.push(box([ARCHE_DUO_X + 0.5, -0.35, -19.2], [ARCHE_DUO_X + 2.6, 0.16, -17.4], 2));

  // Rêve — de guingois. Montants de hauteurs inégales, linteau qui ne repose
  // pas d'aplomb, un fragment qui flotte au-dessus sans rien toucher. Rien
  // n'est cassé : c'est dessiné comme ça.
  const rx = ARCHE_REVE_X;
  out.push(box([rx - 3.05, -0.4, SEUIL_Z - 0.45], [rx - 2.6, 5.6, SEUIL_Z + 0.45], 3));
  out.push(box([rx + 2.6, -0.4, SEUIL_Z - 0.6], [rx + 3.05, 4.3, SEUIL_Z + 0.3], 3));
  out.push(box([rx - 3.5, 4.9, SEUIL_Z - 0.7], [rx + 2.2, 5.5, SEUIL_Z + 0.2], 2));
  out.push(box([rx + 1.4, 5.9, SEUIL_Z - 0.2], [rx + 3.6, 6.4, SEUIL_Z + 0.7], 3, { ghost: true }));
  for (const [dx, dz] of [[-1.9, -1.4], [0.3, -2.2], [1.8, -0.6], [-0.6, 0.4]] as const) {
    out.push(box([rx + dx - 0.5, -0.35, -18.4 + dz], [rx + dx + 0.5, 0.13, -17.5 + dz], 2));
  }

  return out;
};

/**
 * LA FENTE BASSE — la leçon « rapetisse », et elle n'a pas un mot.
 *
 * Une dalle posée sur deux murets, 75 centimètres de jour. Un joueur à taille
 * normale mesure 1,80 : il n'a même pas à essayer. Rapetissé une fois, il en
 * mesure 45 et passe à l'aise. Le pinceau attend au fond, bien en vue depuis
 * l'extérieur — c'est ça qui donne envie, pas une consigne.
 *
 * Ouverte du seul côté du torii vermillon, celui qui fait rapetisser. On
 * regarde la fente, on regarde la porte qui est juste à côté, et l'on a compris.
 */
const fenteBasse = (): BoxDef[] => [
  box([-31, 0.75, 5.6], [-18, 1.7, 12.4], 2),
  box([-31.2, -0.4, 5.2], [-17.6, 0.75, 5.9], 1),
  box([-31.2, -0.4, 12.1], [-17.6, 0.75, 12.8], 1),
  box([-31.6, -0.4, 5.2], [-31, 0.9, 12.8], 1),
];


/**
 * L'ÉTABLI — de quoi jouer, sans rien à gagner.
 *
 * Le hall enseignait trois choses et n'en laissait faire aucune : on regardait
 * un inconnu rapetisser, on franchissait une porte, on partait. Il manquait ce
 * qui donne envie de rester dix minutes — **des objets qu'on peut prendre, et
 * des creux qui les attendent.**
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX CREUX, DEUX BILLES IDENTIQUES, ET RIEN À DEVINER
 *
 * Les billes font toutes deux 0,30. Les creux font 0,30 et 1,20. L'une reste
 * où elle est ; l'autre doit franchir une porte, et elle en ressort quatre fois
 * plus grosse.
 *
 * Ce n'est pas une énigme, c'est un BAC À SABLE, et c'est délibéré : on
 * comprend ici, sans conséquence et sans qu'on nous l'ait dit, la règle sur
 * laquelle reposera toute la suite du jeu — **le nombre de portes qu'un objet
 * franchit est une variable.**
 *
 * DEUX ET PAS TROIS, et la raison est mécanique. Un troisième creux de 4,80
 * demanderait de faire franchir DEUX portes à une bille ; or le hall n'a
 * qu'une paire, et un joueur devenu géant ne repasse pas par sa petite face —
 * il n'y entre plus. La suite du jeu résoudra ça avec des paires imbriquées,
 * une par étage. Ici, un creux qu'on ne peut pas garnir serait une promesse
 * fausse, et une promesse fausse dans la première salle est le pire départ
 * possible.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Et le grand creux, celui qui exige deux passages, ouvre une petite porte vers
 * un cabinet où l'on voit ce qui attend. C'est la seule récompense du hall, et
 * elle ne donne aucun avantage : elle donne une envie.
 */
/**
 * L'établi est AU SUD, au-delà de z = 26.
 *
 * Ce n'est pas un goût : les repères de taille (`markers`) sont plantés partout
 * entre z = −14 et z = 24, et le plus haut d'entre eux fait six mètres de large
 * à sa base. La première version du grand creux était enterrée dedans, et c'est
 * la vérification « rien ne démarre dans un solide » qui l'a dit — pas l'œil.
 */
const CREUX_Z = 32;
const etabli = (): BoxDef[] => [
  // Le plateau, à hauteur de hanche : on y pose sans se baisser.
  box([1.4, -0.4, CREUX_Z - 2.2], [6.6, 0.62, CREUX_Z + 2.2], 1),
  box([1.2, 0.62, CREUX_Z - 2.4], [6.8, 0.78, CREUX_Z + 2.4], 2),

  // Le socle du grand creux est AU SOL et LARGE, et ce n'est pas un détail :
  // on y pose une bille de 4,80 en mesurant sept mètres, donc en la reposant à
  // huit mètres devant soi. Un plateau étroit rendrait le geste impossible sans
  // que rien ne le laisse voir — la faute a déjà coûté un niveau entier.
  box([12, -0.4, CREUX_Z - 6], [24, 0.3, CREUX_Z + 6], 1),
  box([11.7, 0.3, CREUX_Z - 6.3], [24.3, 0.5, CREUX_Z + 6.3], 2),

  // Le cabinet, muré : on n'y entre que par la petite porte, et seulement une
  // fois le grand creux garni. De l'extérieur on n'en voit que le toit.
  box([40, -0.4, 26], [56, 0.2, 42], 0),
  box([40, 0.2, 26], [56, 7, 26.7], 2),
  box([40, 0.2, 41.3], [56, 7, 42], 2),
  box([40, 0.2, 26.7], [40.7, 7, 41.3], 2),
  box([55.3, 0.2, 26.7], [56, 7, 41.3], 2),
  box([39.6, 7, 25.6], [56.4, 7.9, 42.4], 3),

  // Dedans : une Aiguille en réduction, la plume du monde qu'on ira remplir, et
  // cinq creux vides à ses pieds dont les tailles annoncent cinq voyages. Rien
  // n'est expliqué. On regarde, on se demande, on part.
  box([47.4, 0.2, 33.4], [48.6, 5.4, 34.6], 2),
  box([46.9, 5.4, 32.9], [49.1, 5.7, 35.1], 1),
  box([47.6, 5.7, 33.6], [48.4, 6.1, 34.4], 3),
  ...[
    [44.6, 0.34], [45.9, 0.5], [47.3, 0.8], [48.9, 1.2], [50.6, 0.62],
  ].map(([x, d]) => box([x - d * 0.7, 0.2, 30.2], [x + d * 0.7, 0.2 + d * 0.55, 30.2 + d * 1.4], 1)),
];

export const LOBBY: LevelDef = {
  name: 'Le hall',
  spawn: [0, 0.2, 6],
  spawnYaw: Math.PI, // regard vers le nord et l'arche d'Aventure

  boxes: [
    // Sol. Une seule dalle, donc aucune couture — mais sans contour tout de
    // même, sinon sa silhouette entière serait tracée à l'encre à l'horizon.
    box([-FAR, -6, -FAR], [FAR, 0, FAR], 0, { outline: false }),

    // Estrade centrale, entre les deux portails : un point de rendez-vous.
    box([-3.4, -0.4, -1.4], [3.4, 0.22, 1.4], 1),

    ...arches(),
    ...etabli(),
    ...markers(),
    ...fenteBasse(),
  ],

  /**
   * LE HALL EST UN APPRENTISSAGE, et le pinceau en est le maître.
   *
   * Il n'y était pas du tout : on arrivait, on voyait deux portails, on
   * comprenait vaguement qu'on pouvait changer de taille, et l'on partait. Rien
   * ne présentait le personnage qu'on allait suivre pendant tout le jeu.
   *
   * Quatre jalons, et chacun enseigne exactement une chose :
   *
   *   1. Il est là, à trois pas, à hauteur d'homme. On marche, on l'atteint.
   *      C'est la règle du jeu en une seconde : on le rejoint, il repart.
   *   2. Il se pose sur un plot de 2,70. On enjambe 0,90 et l'on saute 1,30 :
   *      c'est hors d'atteinte. Mais la porte indigo rend quatre fois plus
   *      grand, et un géant enjambe 3,60. Leçon « grandis ».
   *   3. Il se glisse sous une dalle qui laisse 75 centimètres. Un géant n'y
   *      pense même pas, un joueur normal non plus. Le torii vermillon rend
   *      quatre fois plus petit. Leçon « rapetisse ».
   *   4. Il se pose devant les trois arches, et l'on n'a plus qu'à choisir.
   *
   * À la fin de ce parcours, le joueur a appris les deux sens du changement de
   * taille, il sait que le pinceau se rejoint, et il sait qu'il le retrouvera
   * ailleurs. Aucune de ces trois choses n'a été écrite.
   */
  guide: [
    [4, 0.4, 3],
    [-8, 2.72, 20],
    [-26, 0.1, 9],
    [0, 0.4, -18],
  ],

  // Il se met à la taille de l'endroit où il se pose : normal sur la place,
  // grand sur le plot qu'on ne rejoint qu'en géant, minuscule sous la dalle où
  // seul un joueur rapetissé se glisse. Sa taille est donc, à elle seule, la
  // consigne — on voit ce qu'il faut devenir pour aller le chercher.
  guideEchelle: [1, 4, 0.25, 1],

  portals: [
    {
      id: 'hall',
      colorBig: 0xc8492e, // vermillon
      colorSmall: 0x2f4b7c, // indigo
      big: { position: [-8, 0, -5], yaw: Math.PI / 2 }, // normale +X, regarde l'est
      small: { position: [8, 0, 5], yaw: -Math.PI / 2 }, // normale -X, regarde l'ouest
    },
    {
      // LE CABINET. Scellé tant que le grand creux est vide — donc tant qu'on
      // n'a pas fait franchir deux portes à une bille. On voit la porte, on
      // voit qu'elle ne s'ouvre pas, et l'on voit à trois pas de là ce qui
      // l'ouvrira. Rien n'est écrit.
      id: 'cabinet',
      condition: 'creux-grand',
      colorBig: 0xb08a48,
      colorSmall: 0xb08a48,
      smallHeight: 2.4,
      smallWidth: 1.6,
      big: { position: [26.5, 0, CREUX_Z], yaw: -Math.PI / 2 },
      small: { position: [48, 0.2, 40.6], yaw: Math.PI },
    },
  ],

  // Dans le hall il n'y a rien à gagner : l'objectif est repoussé hors du
  // terrain pour ne jamais se déclencher. Ce sont les trois seuils qui mènent
  // quelque part.
  /**
   * TROIS BILLES IDENTIQUES. C'est leur ressemblance qui fait la démonstration :
   * elles ne se distinguent que par le nombre de portes qu'on leur fera
   * franchir, et rien d'autre ne les sépare.
   */
  carryables: [
    { id: 'bille-a', position: [2.6, 0.8, CREUX_Z + 1.2], size: 0.3, ink: 3 },
    { id: 'bille-b', position: [3.8, 0.8, CREUX_Z + 1.2], size: 0.3, ink: 3 },
    // Et une caisse à part, sans creux qui l'attende : celle-là ne sert à rien
    // qu'à être portée d'un bout à l'autre et à changer de taille en chemin.
    // Un bac à sable a besoin d'un objet qui ne demande rien.
    { id: 'caisse-libre', position: [-2, 0.3, 27], size: 0.6, ink: 2 },
  ],

  /**
   * Les trois creux, dans l'ordre des puissances de quatre. Aucun n'accepte la
   * taille d'un autre : la tolérance est de 12 %, et 0,30 · 1,20 · 4,80 sont
   * séparés par un facteur quatre. Aucun placement correct ne peut être une
   * faute.
   */
  sockets: [
    // Rayon d'accueil très large pour un si petit creux, et c'est voulu : un
    // joueur repose ce qu'il porte à trois mètres devant lui, et un établi ne
    // doit jamais être une épreuve de visée.
    { id: 'creux-petit', position: [3.2, 0.78, CREUX_Z - 1.4], size: 0.3, ink: 3, portee: 2.2 },
    // Le grand est AU SOL et son rayon d'accueil est très large, et ce n'est pas
    // un ornement : on vient le garnir en mesurant sept mètres, donc en reposant
    // ce qu'on porte à huit mètres devant soi. Viser un creux d'un mètre vingt à
    // cette distance serait une épreuve d'adresse, et ce jeu n'en est pas une.
    { id: 'creux-grand', position: [18, 0.5, CREUX_Z], size: 1.2, ink: 3, portee: 4.5 },
  ],

  goal: { position: [0, -900, 0], radius: 1 },

  seuils: [
    { position: [ARCHE_SOLO_X, 0, SEUIL_Z], radius: 3.0, mode: 'solo', label: 'Seul' },
    { position: [ARCHE_DUO_X, 0, SEUIL_Z], radius: 5.6, mode: 'duo', label: 'À deux' },
    { position: [ARCHE_REVE_X, 0, SEUIL_Z], radius: 3.0, mode: 'reve', label: 'Le rêve' },
  ],

  hints: [
    {
      position: [0, 0, 4],
      radius: 9,
      text: 'Deux portes. L’une te fera grand, l’autre te fera petit. Essaie, on ne casse rien.',
    },
    {
      position: [ARCHE_SOLO_X, 0, -18],
      radius: 7,
      text: 'Une seule ouverture. On part seul.',
    },
    {
      position: [ARCHE_DUO_X, 0, -18],
      radius: 7,
      text: 'Deux ouvertures jumelles. On n’y va pas seul — et si personne n’est là, on attend.',
    },
    {
      position: [ARCHE_REVE_X, 0, -18],
      radius: 7,
      text: 'Celle-ci ne tient pas droit. Derrière, rien n’est jamais deux fois pareil.',
    },
  ],
};
