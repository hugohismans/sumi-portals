import type { BoxDef, LevelDef } from '../core/types.js';

/**
 * LE MONDE — un voyage en spirale.
 *
 * Pas une succession de niveaux : un seul lieu continu, qu'on parcourt en
 * changeant de taille. Chaque étage franchi révèle le précédent VU D'EN HAUT.
 * Le village où l'on marchait devient une maquette ; la terrasse d'où on le
 * contemplait devient à son tour une dalle posée en contrebas.
 *
 * L'ANCRE : l'Aiguille. Une tour effilée plantée à l'origine du monde, visible
 * depuis les trois étages. À taille normale c'est un colosse qu'on ne peut pas
 * gravir ; depuis la terrasse c'est un mât ; depuis le belvédère on en surplombe
 * la pointe. C'est elle qui tient la promesse du voyage : quelque chose de
 * reconnaissable qui revient, et dont le seul changement est le regard qu'on
 * porte dessus.
 *
 * LA RÈGLE DE TRACÉ, à respecter pour toute région ajoutée :
 * **chaque étage doit voir le précédent.** Un portail qui ne dépose pas en
 * surplomb de là où l'on était fait perdre tout l'intérêt du voyage.
 *
 * LE RETOUR : chaque étage est relié au précédent par un escalier dont les
 * marches sont calibrées pour la taille de cet étage. Un géant remonte à pied
 * ce qu'un joueur normal ne peut pas gravir. Ce n'est pas un détail de confort :
 * sans lui, un joueur qui saute de la terrasse se retrouverait piégé en bas,
 * trop grand pour la petite porte et trop petit pour remonter.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARCELLES RÉSERVÉES — contrat pour la fabrication en parallèle
 *
 * Chaque région occupe une boîte de coordonnées qui n'appartient qu'à elle.
 * Deux régions ne peuvent donc pas se percuter, même écrites séparément.
 *
 *   village     x [-90,  90]   y [ -6,  28]   z [-110,  12]   échelle ×1
 *   escalier A  x [ 40,  90]   y [ -6,  30]   z [ -20,  20]   ×1 → ×4
 *   terrasse    x [-90,  90]   y [ 24,  118]  z [  16,  96]   échelle ×4
 *   escalier B  x [ 96, 190]   y [ 24,  120]  z [  40, 120]   ×4 → ×16
 *   belvédère   x [-260, 260]  y [ 114, 300]  z [ 110, 300]   échelle ×16
 * ═══════════════════════════════════════════════════════════════════════════
 */

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, ...opts });

// --- Altitudes des trois étages ---------------------------------------------
const VILLAGE_Y = 0;
const TERRASSE_Y = 30;
const BELVEDERE_Y = 120;

/** Hauteur de l'Aiguille. Sa pointe passe JUSTE sous l'œil du belvédère. */
const AIGUILLE_H = 110;

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * Escalier à marches calibrées : franchissable à une taille, mur à l'autre.
 * `rise` est la hauteur de marche ; un joueur l'enjambe si elle est inférieure
 * à la moitié de sa propre taille.
 */
const escalier = (
  x0: number,
  x1: number,
  zStart: number,
  yStart: number,
  yEnd: number,
  rise: number,
  depth: number,
  ink: number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  const n = Math.ceil((yEnd - yStart) / rise);
  for (let i = 0; i < n; i++) {
    const y = yStart + (i + 1) * rise;
    const z = zStart + i * depth;
    out.push(box([x0, yStart - 4, z], [x1, Math.min(y, yEnd), z + depth], ink));
  }
  return out;
};

/** Le village : quelques maisons autour de l'Aiguille. */
const village = (): BoxDef[] => {
  const r = rng(31415);
  const out: BoxDef[] = [];
  const spots: [number, number][] = [
    [-26, -18], [-14, -36], [-30, -52], [-8, -62], [10, -48], [22, -30],
    [30, -58], [-42, -30], [-46, -66], [6, -84], [-22, -88], [26, -78],
    [-56, -12], [40, -14], [16, -14], [-16, -8],
  ];
  for (const [cx, cz] of spots) {
    const w = 3 + r() * 4;
    const d = 3 + r() * 4;
    const h = 3.5 + r() * 5;
    out.push(box([cx - w, -0.6, cz - d], [cx + w, h, cz + d], 1 + ((r() * 2) | 0)));
    out.push(box([cx - w - 0.6, h - 0.12, cz - d - 0.6], [cx + w + 0.6, h + 0.5, cz + d + 0.6], 2));
  }
  return out;
};

export const MONDE: LevelDef = {
  name: 'Le monde',
  spawn: [0, 0.3, -22],
  spawnYaw: Math.PI, // dos à l'Aiguille, face au village et à la porte

  boxes: [
    // --- Étage 1 : le village -------------------------------------------------
    box([-90, -6, -110], [90, VILLAGE_Y, 12], 0, { outline: false }),

    // L'Aiguille. Colosse ici, mât depuis la terrasse, piquet depuis le
    // belvédère : c'est le même objet, et c'est tout le propos du voyage.
    box([-3, -6, -3], [3, AIGUILLE_H, 3], 2),
    box([-4.4, AIGUILLE_H - 1, -4.4], [4.4, AIGUILLE_H + 3, 4.4], 3),

    ...village(),

    // --- Escalier A : ×1 le regarde, ×4 le gravit -----------------------------
    // Marches de 3 : infranchissables à taille normale (enjambée 0,9),
    // triviales une fois quatre fois plus grand (enjambée 3,6).
    ...escalier(46, 84, -14, VILLAGE_Y, TERRASSE_Y, 3, 3.4, 3),

    // --- Étage 2 : la terrasse ------------------------------------------------
    // Son bord sud est une falaise : c'est de là qu'on découvre le village.
    box([-90, TERRASSE_Y - 8, 16], [90, TERRASSE_Y, 96], 0, { outline: false }),
    // Margelle du bord, pour qu'on sente le vide avant de l'atteindre.
    box([-90, TERRASSE_Y - 0.6, 16], [90, TERRASSE_Y + 1.4, 18], 3),

    // --- Escalier B : ×4 le regarde, ×16 le gravit ----------------------------
    // Marches de 12 : mur pour un joueur de 7,2, marche pour un joueur de 28,8.
    ...escalier(104, 182, 44, TERRASSE_Y, BELVEDERE_Y, 12, 9, 2),

    // --- Étage 3 : le belvédère -----------------------------------------------
    box([-260, BELVEDERE_Y - 20, 110], [260, BELVEDERE_Y, 300], 0, { outline: false }),
    box([-260, BELVEDERE_Y - 2, 110], [260, BELVEDERE_Y + 5, 116], 3),
  ],

  portals: [
    {
      // Paire A — taillée pour un joueur normal. Petite porte au village,
      // grand torii sur la terrasse : on ressort EN SURPLOMB du village.
      id: 'ascension-1',
      colorBig: 0xc8492e,
      colorSmall: 0x2f4b7c,
      smallHeight: 2.8,
      smallWidth: 1.9,
      small: { position: [0, VILLAGE_Y, -40], yaw: 0 }, // normale +Z
      big: { position: [0, TERRASSE_Y, 62], yaw: Math.PI }, // normale -Z, regarde le village
    },
    {
      // Paire B — quatre fois plus grande, pour le joueur déjà quatre fois plus
      // grand. C'est ce qui permet de continuer à monter : une seule paire ne
      // franchirait jamais qu'un cran.
      id: 'ascension-2',
      colorBig: 0xc8492e,
      colorSmall: 0x2f4b7c,
      smallHeight: 11.2,
      smallWidth: 7.6,
      // AU SUD du grand torii de la paire A, et c'est capital : placée
      // derrière lui, on le retraversait en allant la chercher — et l'on
      // rapetissait aussitôt, renvoyé au village. Un portail déjà franchi doit
      // toujours rester DERRIÈRE soi.
      small: { position: [0, TERRASSE_Y, 34], yaw: 0 }, // normale +Z
      big: { position: [0, BELVEDERE_Y, 210], yaw: Math.PI }, // normale -Z, regarde tout
    },
  ],

  goal: { position: [0, BELVEDERE_Y + 2, 150], radius: 14 },

  // Jalons du Pinceau : la direction du voyage, étage par étage. Il ne s'en
  // sert que si le joueur tourne en rond.
  guide: [
    [0, VILLAGE_Y, -40],
    [0, TERRASSE_Y, 34],
    [0, BELVEDERE_Y, 170],
  ],

  hints: [
    {
      position: [0, VILLAGE_Y, -24],
      radius: 16,
      text: 'L’Aiguille est trop haute pour toi. Au sud, une porte étroite.',
    },
    {
      position: [0, VILLAGE_Y, -40],
      radius: 14,
      text: 'La porte indigo rend quatre fois plus grand.',
    },
    {
      position: [0, TERRASSE_Y, 50],
      radius: 26,
      text: 'Retourne-toi : le village est là, en bas. Tu y marchais il y a un instant.',
    },
    {
      position: [0, TERRASSE_Y, 84],
      radius: 20,
      text: 'Une autre porte, quatre fois plus grande. Le voyage continue.',
    },
    {
      position: [0, BELVEDERE_Y, 170],
      radius: 40,
      text: 'D’ici, l’Aiguille n’est plus qu’un piquet. Et pourtant tu ne pouvais pas la gravir.',
    },
  ],
};
