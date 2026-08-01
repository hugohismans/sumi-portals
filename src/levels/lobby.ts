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
    ...markers(),
  ],

  portals: [
    {
      id: 'hall',
      colorBig: 0xc8492e, // vermillon
      colorSmall: 0x2f4b7c, // indigo
      big: { position: [-8, 0, -5], yaw: Math.PI / 2 }, // normale +X, regarde l'est
      small: { position: [8, 0, 5], yaw: -Math.PI / 2 }, // normale -X, regarde l'ouest
    },
  ],

  // Dans le hall il n'y a rien à gagner : l'objectif est repoussé hors du
  // terrain pour ne jamais se déclencher. Ce sont les trois seuils qui mènent
  // quelque part.
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
      text: 'Le torii vermillon rend quatre fois plus petit, la porte indigo quatre fois plus grande. Essaie — les autres te voient changer.',
    },
    {
      position: [ARCHE_SOLO_X, 0, -18],
      radius: 7,
      text: 'Une seule ouverture : le voyage en solitaire.',
    },
    {
      position: [ARCHE_DUO_X, 0, -18],
      radius: 7,
      text: 'Deux ouvertures jumelles : on y part à deux. Si tu es seul, tu attendras ici que quelqu’un vienne.',
    },
    {
      position: [ARCHE_REVE_X, 0, -18],
      radius: 7,
      text: 'Cette arche-là ne tient pas droit. Derrière, rien n’est jamais deux fois pareil.',
    },
  ],
};
