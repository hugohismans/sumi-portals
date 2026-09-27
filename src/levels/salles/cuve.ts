import type { Haut } from '../../core/pesanteur.js';
import type { BoxDef, PortalFaceDef, PortalPairDef, VeilleurDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA CUVE — *le pinceau dort planté dans un mur, là où seul un mur est un sol.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNE TEINTURERIE, ET RIEN N'Y EST EXIGÉ.
 *
 * Quatorze mètres sur quatorze, dix de haut. Contre le mur ouest, une cuve de
 * cinq mètres sur six dont les parois montent à quatre mètres : du sol, on ne
 * voit pas dedans. Une coulure violette descend de sa lèvre jusqu'au carrelage
 * et s'y étale en flaque — quelque chose, là-dedans, déborde de couleur.
 *
 * La porte violette de la salle ressort couchée sur le mur ouest, à six mètres
 * cinquante, face au nord. On y marche ; la cuve est alors une fosse ouverte
 * DANS LE SOL qu'on foule, et au fond de cette fosse — sur le mur ouest, qui en
 * est la paroi — le pinceau violet dort, planté comme un roseau, debout pour
 * qui marche là où il est. On descend dans la fosse (c'est-à-dire, pour le
 * monde, on longe le mur ouest vers le bas, entre les parois de la cuve), on
 * le réveille à taille d'homme, on remonte, on reprend la porte.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POURQUOI ICI LE PINCEAU, ET POURQUOI PLANTÉ AU MUR. La règle du chapitre
 * est qu'on ne voit la couleur qu'en changeant de bas ; celle du jeu, qu'un
 * pinceau se voie (« pas caché derrière une porte »). Planté au mur de la cuve,
 * il est les deux : invisible du sol — quatre mètres de paroi —, en pleine vue
 * dès qu'on marche au mur, droit comme un arbre.
 *
 * LE RÉVEIL SE MESURE À LA DISTANCE, SANS REGARDER LES MURS. Le rayon est donc
 * choisi contre la géométrie : 2,60 autour du point où il sort du mur, à 1,30
 * au-dessus du fond. Debout contre l'extérieur de la cuve, on en reste à 3,6 m
 * au moins ; couché sur le mur au-dessus de la lèvre, à 3,04 ; il faut être
 * DANS la fosse. Vérifié plus bas, poste par poste.
 *
 * RÈGLE 10 — le plus beau plan est au fond de la cuve : la mare violette sous
 * soi comme un mur, les parois qui montent comme des falaises couchées, et la
 * salle entière, là-haut, qui tient au plafond de la fosse.
 */

const NOM = 'cuve';

const X0 = 93;
const X1 = 107;
const Z0 = 3893;
const Z1 = 3907;
const H = 10;

/** La cuve : l'intérieur contre le mur ouest, ses parois, sa lèvre. */
const CUVE_EST = 98;
const CUVE_SUD = 3897;
const CUVE_NORD = 3903;
const LEVRE = 4;
const PAROI = 0.3;

/** L'épaisseur des parois : voir `bascule.ts` — une pièce tenue traverse la pierre jusqu'à 2,34 m. */
const EPAISSEUR = 3;

const VIOLET = 0x7a4c8a;

type V3 = [number, number, number];

const REGION = {
  name: NOM,
  min: [0, -80, 3800] as V3,
  max: [200, 120, 4000] as V3,
  // Une teinturerie : chaux, bois lavé, ardoise, et le violet de la cuve.
  paper: '#ece6e8',
  colors: ['#e5dee1', '#c3b2ba', '#6d5a65', '#7a4c8a'] as [string, string, string, string],
  ink: '#1e1a1d',
  brouillard: 120,
};

const b = (min: V3, max: V3, ink = 0, opts: { outline?: boolean; ghost?: boolean } = {}): BoxDef => ({
  min,
  max,
  ink,
  region: NOM,
  ...opts,
});

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

/**
 * LA CUVE : trois parois contre le mur ouest, et la mare au fond. Les lèvres
 * ne sont pas au même centimètre — deux dessus au même plan se disputent la
 * profondeur aux angles.
 */
const cuve = (): BoxDef[] => [
  b([X0, 0, CUVE_SUD - PAROI], [CUVE_EST + PAROI, LEVRE, CUVE_SUD], 1),
  b([X0, 0, CUVE_NORD], [CUVE_EST + PAROI, LEVRE + 0.01, CUVE_NORD + PAROI], 1),
  b([CUVE_EST, 0, CUVE_SUD], [CUVE_EST + PAROI, LEVRE + 0.02, CUVE_NORD], 1),
  // La mare, au fond : douze centimètres de violet.
  b([X0, 0, CUVE_SUD], [CUVE_EST, 0.12, CUVE_NORD], 3),
];

/**
 * LA COULURE : trois filets violets qui descendent de la lèvre est, et la
 * flaque au pied. De l'encre — on marche dedans sans rien sentir.
 */
const coulure = (): BoxDef[] => [
  b([CUVE_EST + PAROI, 1.1, 3899.2], [CUVE_EST + PAROI + 0.02, LEVRE + 0.02, 3899.5], 3, { ghost: true }),
  b([CUVE_EST + PAROI, 0.02, 3900.4], [CUVE_EST + PAROI + 0.02, LEVRE + 0.02, 3900.9], 3, { ghost: true }),
  b([CUVE_EST + PAROI, 2.3, 3901.8], [CUVE_EST + PAROI + 0.02, LEVRE + 0.02, 3902.0], 3, { ghost: true }),
  b([CUVE_EST + PAROI + 0.02, 0.005, 3899.9], [CUVE_EST + PAROI + 1.6, 0.02, 3901.6], 3, { ghost: true }),
];

/**
 * L'ATELIER : des bacs bas le long du mur est, des perches et des draps qui
 * sèchent sous le plafond. Rien de plus haut qu'un mètre au sol — d'un bac on
 * ne saute qu'à 2,29, loin des quatre mètres de la cuve.
 */
const atelier = (): BoxDef[] => {
  const out: BoxDef[] = [];
  for (const [z0, z1, h] of [[3895.2, 3897.0, 0.8], [3898.4, 3900.0, 0.7], [3901.6, 3903.6, 0.85]] as const) {
    out.push(b([X1 - 1.8, 0, z0], [X1 - 0.3, h, z1], 2));
  }
  // Deux perches d'est en ouest sous le plafond, et des draps qui en pendent.
  for (const z of [3895.5, 3904.5]) {
    out.push(b([CUVE_EST + 1.5, 8.6, z - 0.05], [X1, 8.7, z + 0.05], 2, { ghost: true }));
    for (let i = 0; i < 3; i++) {
      const x = CUVE_EST + 2.2 + i * 2.2;
      out.push(b([x, 6.4 + (i % 2) * 0.5, z - 0.02], [x + 1.4, 8.6, z + 0.02], i === 1 ? 3 : 1, { ghost: true }));
    }
  }
  return out;
};

// ─── LA PORTE ────────────────────────────────────────────────────────────────

/** A, debout au sol, face au sud : on la franchit en marchant vers le nord. */
const FACE_A: PortalFaceDef = { position: [100.5, 0.05, 3898.5], yaw: Math.PI };
/**
 * B, couchée sur le mur ouest à 6,60, au sud de la cuve : son haut est +x, sa
 * face regarde le nord. On en ressort en marchant vers le nord, la lèvre de
 * la cuve à un pas et demi, et la fosse devant soi.
 */
const FACE_B: PortalFaceDef = { position: [X0 + 0.05, 6.6, 3895], yaw: 0, haut: '+x', normale: '+z' };

const PORTE: PortalPairDef = {
  id: 'cuve-porte',
  colorBig: VIOLET,
  colorSmall: VIOLET,
  plane: true,
  big: FACE_A,
  small: FACE_B,
};

const VECTEUR: Record<Haut, V3> = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1],
};

/** Le fil à plomb : sous B, il pend vers le mur ouest. */
const filAPlomb = (f: PortalFaceDef): BoxDef[] => {
  const v = VECTEUR[f.haut ?? '+y'];
  const n: V3 = f.normale ? VECTEUR[f.normale] : [Math.round(Math.sin(f.yaw)), 0, Math.round(Math.cos(f.yaw))];
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

/**
 * LE PINCEAU VIOLET, planté dans le mur ouest au fond de la cuve, à 1,30 au-
 * dessus de la mare : `haut` +x, il sort du mur comme d'un sol. À taille
 * d'homme (palier 0) : tout ce chapitre se joue à ×1.
 */
export const PINCEAU_VIOLET: VeilleurDef = {
  id: 'pinceau-violet',
  position: [X0, 1.3, (CUVE_SUD + CUVE_NORD) / 2],
  radius: 2.6,
  echelle: 0,
  haut: '+x',
};

export const CUVE: SalleModule = {
  nom: NOM,
  region: REGION,
  bounds: { min: [0, -80, 3800], max: [200, 120, 4000] },

  boxes: [...coque(), ...cuve(), ...coulure(), ...atelier(), ...filAPlomb(FACE_A), ...filAPlomb(FACE_B)],
  veilleurs: [PINCEAU_VIOLET],
  portals: [PORTE],

  /**
   * Le Pinceau attend à l'arrivée, passe devant A, puis se pose sur le mur
   * ouest à la sortie de B — et descend dans la fosse, jusqu'au pinceau qui
   * dort. De là il revient à la porte du sol EN PASSANT PAR ELLE (sans quoi il
   * traverserait la paroi de la cuve), puis file à la sortie.
   */
  stations: [
    [103, 2.4, 3896],
    [100.5, 2.4, 3897.4],
    [X0 + 2.4, 6.6, 3896.4],
    [X0 + 2.4, 2.2, 3900],
    [100.5, 2.4, 3897.2],
    [103, 2.4, 3904.4],
  ],
  stationsPorte: [null, null, null, null, 'cuve-porte', null],

  /** On arrive au sud, face au nord ; on repart au nord, vers la lucarne. */
  entree: { position: [103, 0.05, Z0 + 1.5], echelle: 0, lacet: 0 },
  sortie: { position: [103, 0.05, Z1 - 1.5], echelle: 0, lacet: 0 },
};

export const CUVE_PORTE = PORTE.id;
export const CUVE_BORDS = { est: CUVE_EST, sud: CUVE_SUD, nord: CUVE_NORD, levre: LEVRE, paroi: PAROI };
