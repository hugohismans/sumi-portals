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

/** Arche d'Aventure : deux montants et un linteau, à l'échelle d'un humain. */
const archway = (): BoxDef[] => {
  const z = -24;
  const w = 3.2;
  const h = 5.0;
  const t = 0.45;
  return [
    box([-w - t, -0.4, z - t], [-w, h, z + t], 3),
    box([w, -0.4, z - t], [w + t, h, z + t], 3),
    box([-w - t * 2.4, h, z - t * 1.3], [w + t * 2.4, h + t * 1.2, z + t * 1.3], 3),
    box([-w - t, h * 0.82, z - t * 0.9], [w + t, h * 0.82 + t * 0.45, z + t * 0.9], 2),
  ];
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

    ...archway(),
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

  // Dans le hall, « l'objectif » n'est pas une victoire : c'est le seuil de
  // l'Aventure. Franchir l'arche lance la première énigme.
  goal: { position: [0, 1.2, -24], radius: 3.4 },

  hints: [
    {
      position: [0, 0, 4],
      radius: 9,
      text: 'Le torii vermillon rend quatre fois plus petit, la porte indigo quatre fois plus grande. Essaie — les autres te voient changer.',
    },
    {
      position: [0, 0, -20],
      radius: 8,
      text: 'Passe sous l’arche pour partir en Aventure.',
    },
  ],
};
