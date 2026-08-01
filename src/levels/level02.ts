import type { BoxDef, LevelDef } from '../core/types.js';

/**
 * « La caisse »
 *
 * Une tour de six unités, et une caisse de soixante-quinze centimètres. Ni
 * l'une ni l'autre ne servent à rien telles quelles : à taille normale on ne
 * monte pas sur la tour, et la caisse est un marchepied dérisoire. Même devenu
 * quatre fois plus grand, on ne franchit toujours pas six unités.
 *
 * La solution tient dans un geste : **emporter la caisse en traversant**. Elle
 * subit exactement le même sort que son porteur et ressort à trois unités —
 * la marche qui manquait. Reposée, elle garde cette taille pour de bon.
 *
 *   ×1, caisse en main → porte indigo → ×4, caisse de 3 → poser, monter, gagner
 *
 * Les nombres sont choisis pour qu'aucun raccourci n'existe :
 * - à ×1, l'enjambée fait 0,9 et le saut 1,3 : la tour est hors d'atteinte ;
 * - à ×4, l'enjambée fait 3,6 et le saut 5,2 : six unités restent hors d'atteinte ;
 * - poser la caisse d'origine au pied de la tour ne donne que 1,65 de portée ;
 * - une fois à trois unités, la caisse mène à 6,6 — et la tour est prise.
 */

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, ...opts });

const FAR = 90;
const TOWER_H = 6;

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];
  // Repères de taille, à l'écart des chemins.
  const spots: [number, number, number][] = [
    [-30, 18, 5], [-22, 26, 9], [-6, 30, 3], [10, 28, 14],
    [26, 22, 6], [34, 4, 11], [30, -18, 4], [16, -26, 8],
    [-4, -30, 12], [-24, -24, 5], [-36, -6, 7], [-34, 30, 16],
  ];
  for (const [x, z, h] of spots) {
    const w = Math.max(1.2, h * 0.3);
    out.push(box([x - w, -0.5, z - w], [x + w, h, z + w], 1 + ((h * 3) % 2 | 0)));
    out.push(box([x - w - 0.4, h - 0.1, z - w - 0.4], [x + w + 0.4, h + 0.4, z + w + 0.4], 2));
  }
  return out;
};

export const LEVEL_02: LevelDef = {
  name: 'La caisse',
  spawn: [2, 0.2, 10],
  spawnYaw: Math.PI * 0.5, // regard vers l'est et la porte indigo

  boxes: [
    box([-FAR, -6, -FAR], [FAR, 0, FAR], 0, { outline: false }),

    // Tour de l'objectif. Six unités : inaccessible à toutes les tailles
    // atteignables, sauf en montant sur quelque chose.
    box([-20, -0.5, -12], [-12, TOWER_H, -4], 2),
    box([-20.7, TOWER_H - 0.15, -12.7], [-11.3, TOWER_H + 0.6, -3.3], 3),

    // Socle de la caisse : une estrade basse pour qu'on la remarque en arrivant.
    box([2.6, -0.4, 5.4], [5.4, 0.12, 8.2], 1),

    ...decor(),
  ],

  carryables: [
    // Soixante-quinze centimètres : soulevable à taille normale, dérisoire comme
    // marchepied. Trois unités une fois rapportée par la petite porte.
    { id: 'caisse', position: [4, 0.12, 6.8], size: 0.75, ink: 3 },
  ],

  portals: [
    {
      id: 'torii',
      colorBig: 0xc8492e,
      colorSmall: 0x2f4b7c,
      // Grand torii au nord, regardant le sud : tout le niveau est devant lui,
      // donc on ne le retraverse jamais par accident en allant vers la tour.
      big: { position: [0, 0, 20], yaw: Math.PI },
      // Petite porte à l'est, de plain-pied : on doit pouvoir y aller les bras
      // chargés, sans saut ni chute.
      small: { position: [16, 0, 0], yaw: -Math.PI / 2 },
    },
  ],

  goal: { position: [-16, TOWER_H + 0.6, -8], radius: 4 },

  hints: [
    {
      position: [3, 0, 9],
      radius: 9,
      text: 'E pour prendre la caisse. Elle est bien trop petite pour servir de marche… en l’état.',
    },
    {
      position: [13, 0, 0],
      radius: 8,
      text: 'La porte indigo rend quatre fois plus grand. Ce qu’on porte aussi.',
    },
    {
      position: [-14, 0, -2],
      radius: 10,
      text: 'Pose la caisse contre la tour, monte dessus, puis sur la tour.',
    },
  ],
};
