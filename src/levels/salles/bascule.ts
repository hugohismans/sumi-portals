import type { Haut } from '../../core/pesanteur.js';
import type { BoxDef, CarryableDef, PortalFaceDef, PortalPairDef } from '../../core/types.js';
import { mainDEncre } from '../mains.js';
import type { SalleModule } from './contrat.js';

/**
 * L'ENVERS — *le plafond est un sol, et il est meublé.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA PREMIÈRE SALLE DU CHAPITRE, ET ELLE NE DEMANDE RIEN.
 *
 * Une salle de dix mètres sur seize, sept de haut, fermée de partout. Au sol,
 * un lavoir : deux bassins contre le mur ouest, un banc contre le mur est, des
 * galets qui traînent, une main d'encre au mur. Au plafond, LE MÊME LAVOIR,
 * tourné d'un demi-tour autour de l'axe est-ouest de la salle : les bassins
 * pendent, le banc pend, trois galets sont collés là-haut comme s'ils étaient
 * posés. Une rotation, pas un miroir : la main du plafond est la même main que
 * celle du sol, la tête en bas.
 *
 * Entre les deux, UNE PORTE VIOLETTE, plane, qui ne change pas la taille. Sa
 * face A est debout au sol, au milieu de l'allée ; sa face B pend du plafond,
 * sa jumelle exacte par le même demi-tour. On franchit A en marchant vers le
 * nord, on ressort de B en marchant vers le nord — les pieds au plafond. La
 * salle qu'on a devant soi est alors celle qu'on avait dans le dos : le lavoir,
 * vu depuis l'autre bout. Rien n'a changé, sauf le bas.
 *
 * On reprend B par devant (en marchant vers le sud) et l'on retombe debout
 * devant A. La sortie est au bout de l'allée, au sol : on peut ne jamais
 * passer la porte violette. Une salle qui présente une porte nouvelle SEULE,
 * sans rien exiger, c'est ce qu'on a appris des miroirs — « introduite seule ».
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE QU'ON Y FAIT POUR LE PLAISIR : prendre un galet au sol, passer la porte en
 * le tenant, le lancer — il « tombe vers le haut », vers le plafond qui est
 * désormais son sol aussi. Et l'inverse : un galet du plafond, lancé par la
 * porte depuis là-haut, revient debout. La pesanteur appartient à chaque corps.
 *
 * RÈGLE 8 — LE LIEU REVISITÉ : le lavoir de la descente, où l'on apprenait que
 * le monde ne change pas quand on change. Ici non plus, il ne change pas : on
 * change de bas.
 *
 * LES NOMBRES QUI TIENNENT LA SALLE, et ils ne se devinent pas :
 *
 *   – SEPT MÈTRES DE HAUT. Qui marche au plafond a l'œil à 7 − 1,656 = 5,34 ;
 *     en sautant (1,29 vers SON haut, donc vers le sol), à 4,05 ; debout sur le
 *     banc du plafond (0,48), à 3,57. La face A et la sortie montent à 2,85 :
 *     on ne les attrape jamais par le haut. À six mètres, le banc suspendu
 *     suffisait à mettre l'œil dans la sortie, la tête en bas — et l'on serait
 *     arrivé dans le puits en marchant sur son plafond.
 *   – B commence à 4,15. Du sol, l'œil culmine à 2,95 ; sur le banc du sol ou
 *     la margelle d'un bassin, à 3,5. On n'entre dans B que depuis le plafond.
 *   – La salle est CLOSE sur ses six faces : dans les deux pesanteurs qu'on y
 *     prend, tout ce qui tombe tombe sur quelque chose.
 */

const NOM = 'bascule';

/** L'intérieur de la salle. */
const X0 = -505;
const X1 = -495;
const Z0 = 3892;
const Z1 = 3908;
const H = 7;
/** Le milieu de l'allée, nord-sud : l'axe du demi-tour. */
const ZC = (Z0 + Z1) / 2;
const CX = (X0 + X1) / 2;

/**
 * L'ÉPAISSEUR DES PAROIS : trois mètres, et ce n'est pas de la maçonnerie.
 * Une pièce tenue se porte à 0,34 + 2 × son arête devant soi, et la main
 * traverse la pierre : face à un mur, un cube de 0,80 est déjà 2,34 m plus
 * loin que son porteur. Lâché ou lancé de là, il se recale contre le mur —
 * pourvu qu'il ne soit pas passé DE L'AUTRE CÔTÉ. À un mètre, il y passait, et
 * tombait hors du monde (le rattrapage le rendait, mais on l'avait vu
 * disparaître). Et ici le mur est parfois le sol, le plafond parfois le mur :
 * les six faces portent la même épaisseur.
 */
const EPAISSEUR = 3;

/** L'encre des portes violettes : la couleur de ce chapitre, sur les deux faces. */
const VIOLET = 0x7a4c8a;

type V3 = [number, number, number];

const REGION = {
  name: NOM,
  min: [-600, -80, 3800] as V3,
  max: [-400, 120, 4000] as V3,
  // Le lavoir de la descente, à la lumière d'un soir : pierre mouillée, ardoise,
  // et l'accent — le violet qu'on vient chercher, déjà là dans les cadres.
  paper: '#e9e6ea',
  colors: ['#e1dde4', '#bab2c1', '#6c6475', '#7a4c8a'] as [string, string, string, string],
  ink: '#1c1a20',
  brouillard: 120,
};

const b = (min: V3, max: V3, ink = 0, opts: { outline?: boolean; ghost?: boolean } = {}): BoxDef => ({
  min,
  max,
  ink,
  region: NOM,
  ...opts,
});

/**
 * LE DEMI-TOUR : (x, y, z) → (x, H − y, 2·ZC − z). Une rotation d'un demi-tour
 * autour de l'axe est-ouest qui passe au milieu de la salle — le sol devient le
 * plafond, le sud devient le nord, et l'est reste l'est. Son déterminant vaut
 * +1 : c'est un retournement, jamais un reflet.
 */
const retourner = (x: BoxDef): BoxDef => ({
  ...x,
  min: [x.min[0], H - x.max[1], 2 * ZC - x.max[2]],
  max: [x.max[0], H - x.min[1], 2 * ZC - x.min[2]],
});

/** La coque : six faces, qui se recouvrent aux angles sans jamais partager un plan exposé. */
const coque = (): BoxDef[] => {
  const t = EPAISSEUR;
  return [
    b([X0 - t - 0.1, -t, Z0 - t - 0.1], [X1 + t + 0.1, 0, Z1 + t + 0.1], 1, { outline: false }),
    b([X0 - t - 0.2, H, Z0 - t - 0.2], [X1 + t + 0.2, H + t, Z1 + t + 0.2], 1, { outline: false }),
    b([X0 - t, -0.5, Z0 - t], [X0, H + 0.5, Z1 + t], 0),
    b([X1, -0.5, Z0 - t], [X1 + t, H + 0.5, Z1 + t], 0),
    b([X0, -0.5, Z0 - t], [X1, H + 0.5, Z0], 0),
    b([X0, -0.5, Z1], [X1, H + 0.5, Z1 + t], 0),
  ];
};

/** Un bassin du lavoir : quatre margelles de 0,55 et l'eau à 0,30. */
const bassin = (x0: number, x1: number, z0: number, z1: number): BoxDef[] => {
  const e = 0.22;
  return [
    b([x0, 0, z0], [x0 + e, 0.55, z1], 1),
    b([x1 - e, 0, z0], [x1, 0.55, z1], 1),
    b([x0 + e, 0, z0], [x1 - e, 0.55, z0 + e], 1),
    b([x0 + e, 0, z1 - e], [x1 - e, 0.55, z1], 1),
    b([x0 + e, 0, z0 + e], [x1 - e, 0.3, z1 - e], 2),
  ];
};

/** Le banc : une planche sur deux pieds, l'assise à 0,48. */
const banc = (x0: number, x1: number, z0: number, z1: number): BoxDef[] => [
  b([x0, 0.36, z0], [x1, 0.48, z1], 2),
  b([x0 + 0.1, 0, z0 + 0.2], [x1 - 0.1, 0.36, z0 + 0.6], 1),
  b([x0 + 0.1, 0, z1 - 0.6], [x1 - 0.1, 0.36, z1 - 0.2], 1),
];

/** Le lavoir du sol. Le plafond en recevra la copie retournée, boîte pour boîte. */
const lavoir = (): BoxDef[] => [
  ...bassin(X0 + 0.6, X0 + 2.8, 3894.6, 3897.4),
  ...bassin(X0 + 0.6, X0 + 2.8, 3899.2, 3902.0),
  ...banc(X1 - 1.9, X1 - 0.7, 3895.4, 3899.4),
  // LA MAIN D'ENCRE, au mur ouest près du départ : une main droite. Sa copie
  // du plafond est la même main droite, la tête en bas — et c'est toute la
  // différence entre une rotation et le miroir de la montée.
  ...mainDEncre(NOM, X0 + 0.03, 0.8, 3893.3, false, 1, 1),
];

// ─── LA PORTE ────────────────────────────────────────────────────────────────

/** A, debout au sol, face au sud : on la franchit en marchant vers le nord. */
const FACE_A: PortalFaceDef = { position: [CX, 0.05, 3897], yaw: Math.PI };
/**
 * B, sa jumelle par le demi-tour : pendue au plafond, son haut vers le bas,
 * face au nord. On en ressort en marchant vers le nord, la tête en bas.
 */
const FACE_B: PortalFaceDef = { position: [CX, H - 0.05, 2 * ZC - 3897], yaw: 0, haut: '-y', normale: '+z' };

const PORTE: PortalPairDef = {
  id: 'bascule-porte',
  colorBig: VIOLET,
  colorSmall: VIOLET,
  plane: true,
  big: FACE_A,
  small: FACE_B,
};

const VECTEUR: Record<Haut, V3> = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1],
};

/**
 * LE FIL À PLOMB : pendu au linteau, tendu vers les pieds de qui ressortira de
 * cette face — le long de SON bas à elle. Sous A il pend comme un fil à plomb ;
 * sous B il « pend » vers le plafond, et l'on comprend avant d'avoir essayé
 * que là-haut, le bas est en haut. De l'encre, pas de la pierre : il ne
 * retient rien, on passe au travers.
 */
const filAPlomb = (f: PortalFaceDef): BoxDef[] => {
  const v = VECTEUR[f.haut ?? '+y'];
  const n: V3 = f.normale ? VECTEUR[f.normale] : [Math.round(Math.sin(f.yaw)), 0, Math.round(Math.cos(f.yaw))];
  // Trente-cinq centimètres devant la face, du côté où l'on arrive et d'où l'on repart.
  const point = (h: number): V3 => [0, 1, 2].map((i) => f.position[i] + v[i] * h + n[i] * 0.35) as V3;
  const segment = (h0: number, h1: number, demi: number, ink: number): BoxDef => {
    const a = point(h0);
    const c = point(h1);
    const min = [0, 1, 2].map((i) => (v[i] !== 0 ? Math.min(a[i], c[i]) : a[i] - demi)) as V3;
    const max = [0, 1, 2].map((i) => (v[i] !== 0 ? Math.max(a[i], c[i]) : a[i] + demi)) as V3;
    return b(min, max, ink, { ghost: true });
  };
  return [segment(2.78, 1.0, 0.015, 2), segment(1.0, 0.86, 0.07, 3)];
};

// ─── LES GALETS ──────────────────────────────────────────────────────────────

/** Trois galets au sol, près du banc ; leurs trois copies collées au plafond. */
const GALETS_DU_SOL: V3[] = [
  [X1 - 2.6, 0, 3893.9],
  [X1 - 3.4, 0, 3894.6],
  [X1 - 2.2, 0, 3894.85],
];

const galets = (): CarryableDef[] => [
  ...GALETS_DU_SOL.map((p, i): CarryableDef => ({ id: `galet-bascule-${i + 1}`, position: p, size: 0.34, ink: 1 + (i % 3) })),
  // Au plafond, `position` est le centre de la face qui touche SON sol — le
  // plafond — et son haut est −y : le demi-tour du galet du sol, exactement.
  ...GALETS_DU_SOL.map((p, i): CarryableDef => ({
    id: `galet-bascule-${i + 4}`,
    position: [p[0], H, 2 * ZC - p[2]],
    size: 0.34,
    ink: 1 + (i % 3),
    haut: '-y',
  })),
];

export const BASCULE: SalleModule = {
  nom: NOM,
  region: REGION,
  bounds: { min: [-600, -80, 3800], max: [-400, 120, 4000] },

  boxes: [...coque(), ...lavoir(), ...lavoir().map(retourner), ...filAPlomb(FACE_A), ...filAPlomb(FACE_B)],
  carryables: galets(),
  portals: [PORTE],

  /**
   * Le Pinceau part du seuil, s'arrête devant A, puis se pose SOUS LE BANC DU
   * PLAFOND — c'est-à-dire, pour qui y marche, au-dessus de son assise : une
   * invitation, pas une consigne. Puis il file à la sortie, au sol.
   */
  stations: [
    [CX, 2.4, 3894],
    [CX, 2.4, 3895.6],
    [X1 - 1.3, H - 2.4, 2 * ZC - 3897.4],
    [CX, 2.4, 3905.4],
  ],

  /**
   * On naît au sud de l'allée, face au nord : A est à trois mètres et demi,
   * et à travers elle on voit déjà le lavoir la tête en bas. La sortie est au
   * nord, au sol, et l'on y va en marchant vers le nord. `echelle` est un
   * PALIER : 0, taille d'homme — tout ce chapitre se joue à ×1.
   */
  entree: { position: [CX, 0.05, Z0 + 1.5], echelle: 0, lacet: 0 },
  sortie: { position: [CX, 0.05, Z1 - 1.5], echelle: 0, lacet: 0 },
};

/** La porte violette, pour les vérifications et le pilote. */
export const BASCULE_PORTE = PORTE.id;
