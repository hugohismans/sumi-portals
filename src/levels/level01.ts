import type { BoxDef, LevelDef } from '../core/types.js';

/**
 * « La cour »
 *
 * Le joueur démarre à taille normale sur la place, face au grand torii
 * vermillon. Au sud-ouest, la tour de l'objectif : 3,3 unités, presque deux
 * fois sa taille, impossible à escalader. À l'est, une cour creusée de 3,2 de
 * profondeur : on y tombe, on n'en remonte pas.
 *
 * Au fond de cette cour se trouve la petite porte indigo. La traverser fait
 * ressortir par le grand torii, quatre fois plus grand — et de là, la tour
 * n'est plus qu'une marche.
 *
 *   place ×1 → on tombe dans la cour → porte indigo → place ×4 → la tour
 *
 * LA CONTRAINTE QUI TIENT TOUT : les portails ont une taille FIXE dans le
 * monde. À ×4 le joueur mesure 7,2 et la petite porte 2,8 : il n'y rentre
 * physiquement plus, donc il ne peut plus grandir. La limite de taille n'est
 * pas une règle qu'on énonce, c'est une porte qu'on ne franchit plus. Et comme
 * la cour ne fait que 3,2 de fond, un joueur à ×4 en ressort d'une enjambée :
 * aucun risque de s'y retrouver coincé.
 */

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, ...opts });

const GROUND_TOP = 0;
const GROUND_BOTTOM = -8;

// Cour creusée : assez profonde pour piéger à ×1, assez peu pour qu'on en
// sorte d'une enjambée à ×4.
//
// ATTENTION : c'est la profondeur PLUS la hauteur de margelle qu'il faut
// enjamber, pas la profondeur seule. Avec 3,2 de fond et 0,5 de margelle, on
// se retrouvait à devoir franchir 3,7 pour une enjambée de 3,6 — piégé pour
// dix centimètres. D'où 3,0 + 0,3, qui laisse une vraie marge.
const COURT_FLOOR = -3.0;
const CURB_H = 0.3;
const CURB_W = 1.0;
/** Retrait de la margelle par rapport à l'arête du trou. Voir plus bas. */
const CURB_GAP = 0.06;
const COURT_X0 = 10;
const COURT_X1 = 22;
const COURT_Z0 = -6;
const COURT_Z1 = 6;

// Tour de l'objectif : infranchissable à ×1, une marche à ×4.
const TOWER_H = 2.9;
const TOWER_CAP = 3.3;
const TOWER_X0 = -25;
const TOWER_X1 = -11;
const TOWER_Z0 = -17;
const TOWER_Z1 = -3;

const FAR = 120;

/** Générateur pseudo-aléatoire déterministe — le décor doit être reproductible. */
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/**
 * Immeubles-témoins. C'est à eux qu'on mesure sa propre taille : sans ce
 * repère, changer d'échelle ne se verrait pas.
 *
 * Les emplacements évitent trois couloirs : la ligne de sortie du grand
 * portail, l'emprise de la tour, et la cour.
 */
const buildings = (): BoxDef[] => {
  const rng = makeRng(20260801);
  const out: BoxDef[] = [];

  const spots: [number, number][] = [
    [-24, 16], [-38, 4], [-34, 26], [-16, 30], [0, 32], [16, 28],
    [30, 20], [40, 4], [34, -14], [40, -30], [22, -26], [4, -40],
    [-10, -42], [-26, -34], [-40, -18], [-44, 30], [18, 44], [-6, 46],
    [46, 34], [-46, -40],
  ];

  for (const [cx, cz] of spots) {
    const w = 2.5 + rng() * 3.5;
    const d = 2.5 + rng() * 3.5;
    const h = 3 + rng() * 13;
    // Les volumes s'enfoncent dans le sol et les toitures mordent sur les
    // façades : deux faces exactement coplanaires se disputeraient la
    // profondeur et clignoteraient.
    out.push(box([cx - w, -0.5, cz - d], [cx + w, GROUND_TOP + h, cz + d], 1 + ((rng() * 2) | 0)));
    out.push(
      box(
        [cx - w - 0.5, GROUND_TOP + h - 0.12, cz - d - 0.5],
        [cx + w + 0.5, GROUND_TOP + h + 0.45, cz + d + 0.5],
        2,
      ),
    );
  }
  return out;
};

export const LEVEL_01: LevelDef = {
  name: 'La cour',
  spawn: [0, 0.2, 12],
  spawnYaw: 0, // regard vers +Z : le torii vermillon est droit devant

  boxes: [
    // --- Sol, percé par la cour ----------------------------------------------
    // `outline: false` : le sol est découpé en quatre dalles pour ménager le
    // trou, et sans ça chaque couture serait tracée à l'encre en plein terrain.
    box([-FAR, GROUND_BOTTOM, -FAR], [COURT_X0, GROUND_TOP, FAR], 0, { outline: false }),
    box([COURT_X1, GROUND_BOTTOM, -FAR], [FAR, GROUND_TOP, FAR], 0, { outline: false }),
    box([COURT_X0, GROUND_BOTTOM, -FAR], [COURT_X1, GROUND_TOP, COURT_Z0], 0, { outline: false }),
    box([COURT_X0, GROUND_BOTTOM, COURT_Z1], [COURT_X1, GROUND_TOP, FAR], 0, { outline: false }),
    // Fond de la cour. Celui-ci garde son contour : c'est lui qui dessine la
    // cour en creux.
    box([COURT_X0, GROUND_BOTTOM, COURT_Z0], [COURT_X1, COURT_FLOOR, COURT_Z1], 2),

    // --- Margelle -------------------------------------------------------------
    // Elle annonce le trou de loin, et retient le joueur minuscule.
    //
    // Elle est RETIRÉE de CURB_GAP par rapport au bord du trou, et c'est
    // essentiel : posée pile sur l'arête, ses faces tombaient exactement dans
    // le même plan que celles des dalles de sol. Deux surfaces au même endroit,
    // et la carte graphique tranche pixel par pixel, en changeant d'avis à
    // chaque image — la barre rouge se mettait à grésiller, surtout vue de biais.
    box(
      [COURT_X0 - CURB_GAP - CURB_W, -0.3, COURT_Z0 - CURB_GAP - CURB_W],
      [COURT_X0 - CURB_GAP, GROUND_TOP + CURB_H, COURT_Z1 + CURB_GAP + CURB_W],
      3,
    ),
    box(
      [COURT_X1 + CURB_GAP, -0.3, COURT_Z0 - CURB_GAP - CURB_W],
      [COURT_X1 + CURB_GAP + CURB_W, GROUND_TOP + CURB_H, COURT_Z1 + CURB_GAP + CURB_W],
      3,
    ),
    box(
      [COURT_X0 - CURB_GAP, -0.3, COURT_Z0 - CURB_GAP - CURB_W],
      [COURT_X1 + CURB_GAP, GROUND_TOP + CURB_H, COURT_Z0 - CURB_GAP],
      3,
    ),
    box(
      [COURT_X0 - CURB_GAP, -0.3, COURT_Z1 + CURB_GAP],
      [COURT_X1 + CURB_GAP, GROUND_TOP + CURB_H, COURT_Z1 + CURB_GAP + CURB_W],
      3,
    ),

    // --- Tour de l'objectif ---------------------------------------------------
    box([TOWER_X0, -0.5, TOWER_Z0], [TOWER_X1, GROUND_TOP + TOWER_H, TOWER_Z1], 2),
    box(
      [TOWER_X0 - 0.8, GROUND_TOP + TOWER_H - 0.15, TOWER_Z0 - 0.8],
      [TOWER_X1 + 0.8, GROUND_TOP + TOWER_CAP, TOWER_Z1 + 0.8],
      3,
    ),

    ...buildings(),
  ],

  portals: [
    {
      id: 'torii',
      colorBig: 0xc8492e, // vermillon
      colorSmall: 0x2f4b7c, // indigo
      // Grand torii : plaqué au nord, regardant le sud. Tout le niveau est
      // devant lui, donc on ne le retraverse jamais par accident en chemin.
      big: { position: [0, GROUND_TOP, 20], yaw: Math.PI }, // normale -Z
      // Petite porte : au fond de la cour. C'est la vraie sortie.
      small: { position: [18, COURT_FLOOR, 0], yaw: -Math.PI / 2 }, // normale -X
    },
  ],

  goal: { position: [-18, GROUND_TOP + TOWER_CAP, -10], radius: 5 },

  hints: [
    {
      position: [0, 0, 12],
      radius: 11,
      text: 'La tour, au sud-ouest, est trop haute. La cour creusée, à l’est, est le seul autre chemin.',
    },
    {
      position: [14, COURT_FLOOR, 0],
      radius: 13,
      text: 'La porte indigo est la plus petite : la traverser fait ressortir par le grand torii, quatre fois plus grand.',
    },
    {
      position: [-14, GROUND_TOP, -2],
      radius: 10,
      text: 'À cette taille, la tour se monte d’une simple enjambée.',
    },
  ],
};
