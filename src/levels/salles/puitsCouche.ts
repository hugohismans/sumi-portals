import type { Haut } from '../../core/pesanteur.js';
import type { BoxDef, CarryableDef, PortalFaceDef, PortalPairDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LE PUITS COUCHÉ — *le mur qu'on ne grimpe pas est un couloir qu'on arpente.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA CHAÎNE
 *
 *   1. On arrive au fond d'un puits de vingt-quatre mètres, fermé en haut. La
 *      sortie est là, au fond, mais scellée : un creux attend un jeton de
 *      trente centimètres. Le jeton, on le voit — COLLÉ AU MUR OUEST, vingt
 *      mètres plus haut, comme un caillou posé sur un sol. Personne ne grimpe
 *      vingt mètres.
 *   2. Au fond, une porte violette debout, face au sud. À travers elle on voit
 *      le mur ouest… posé à plat, comme un couloir. Sa jumelle est COUCHÉE sur
 *      ce mur, trois mètres quarante au-dessus du fond, face au haut du puits ;
 *      son fil à plomb pend vers le mur, pas vers le sol.
 *   3. On la franchit. Le mur ouest est le sol, le haut du puits est devant
 *      soi : un couloir de vingt mètres, et au bout, le jeton, posé dessus.
 *   4. On le prend, on revient sur ses pas, on reprend la jumelle par devant —
 *      et l'on ressort debout au fond, le jeton dans les mains. IL A TOURNÉ
 *      AVEC NOUS : il tombe désormais vers le sol du fond, comme nous. On le
 *      pose dans le creux, la sortie se dessine.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE QU'ELLE ENSEIGNE : ce qu'on porte suit son porteur, pesanteur comprise.
 * La salle d'après fera l'inverse — ce qu'on POSE garde la pesanteur qu'on
 * avait en le posant — et c'est de là que viendra l'escalier.
 *
 * RÈGLE 8 — LE LIEU REVISITÉ : le conduit de la descente, quarante-deux mètres
 * de puits qu'on ne faisait que tomber. Le voici couché : on le parcourt à
 * pied, d'un bout à l'autre, et ses vires sont restées au mur d'en face.
 *
 * CE QUI NE PEUT PAS CASSER, et pourquoi :
 *
 *   – LE JETON NE SE PERD NULLE PART. La salle est close sur ses six faces.
 *     Lâché ou lancé sur le mur, il retombe sur le mur ; au fond, sur le fond ;
 *     lancé dans la jumelle depuis le mur, il ressort de la porte du fond,
 *     debout, et roule à nos pieds. Aucun endroit qu'il atteigne n'est hors de
 *     portée de l'une des deux pesanteurs.
 *   – LA JUMELLE COMMENCE À 3,40, et sa poche à 2,70. Du fond, l'œil culmine
 *     à 2,95 : on ne tombe jamais dedans par-dessus ; par-dessous, on se cogne
 *     la tête à la console, jamais à la porte. Et la porte du fond est à cinq mètres du mur ouest : qui marche
 *     au mur l'a l'œil à 2,95 au plus du mur, il ne la rencontre pas.
 *   – AUCUNE PORTE DE RACCORD N'EST DANS LE MUR OUEST. Qui marche au mur verrait
 *     une porte percée dans son sol comme une trappe, et y tomberait couché —
 *     jusque dans la salle suivante. Elles sont au fond, à deux mètres du mur
 *     est, loin de tout ce qu'on atteint couché.
 */

const NOM = 'puitsCouche';

const X0 = -305;
const X1 = -295;
const Z0 = 3894;
const Z1 = 3906;
/** Le plafond du puits : on ne sort pas par le haut, on n'en tombe pas non plus. */
const H = 24;
const ZM = 3900;

/** L'épaisseur des parois : voir `bascule.ts` — une pièce tenue traverse la pierre jusqu'à 2,34 m. */
const EPAISSEUR = 3;

const VIOLET = 0x7a4c8a;

type V3 = [number, number, number];

const REGION = {
  name: NOM,
  min: [-400, -80, 3800] as V3,
  max: [-200, 120, 4000] as V3,
  // La pierre du conduit, plus sèche, et le violet de la porte qui la couche.
  paper: '#ebe8e2',
  colors: ['#dedad1', '#b4ac9d', '#5e584e', '#7a4c8a'] as [string, string, string, string],
  ink: '#1d1b17',
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
 * LES VIRES DU CONDUIT, restées sur le mur EST : deux corniches qu'on
 * n'atteindra jamais, à huit et quinze mètres, et les assises du puits en
 * traits d'encre tous les quatre mètres. Elles ne servent qu'à dire « puits »
 * au premier regard, et à donner une échelle aux vingt mètres qu'on va
 * parcourir couché.
 */
const decor = (): BoxDef[] => {
  const out: BoxDef[] = [
    b([X1 - 1.2, 7.7, Z0 + 1], [X1, 8.0, Z1 - 1], 1),
    b([X1 - 1.2, 14.7, Z0 + 1], [X1, 15.0, Z1 - 1], 1),
  ];
  // Les assises : des traits d'encre sur les murs nord, sud et est. Pas sur le
  // mur ouest — c'est un sol, bientôt, et un sol n'a pas d'assises.
  for (let y = 4; y < H; y += 4) {
    out.push(b([X0 + 0.02, y - 0.03, Z0], [X1 - 0.02, y + 0.03, Z0 + 0.012], 2, { ghost: true }));
    out.push(b([X0 + 0.02, y - 0.03, Z1 - 0.012], [X1 - 0.02, y + 0.03, Z1], 2, { ghost: true }));
    out.push(b([X1 - 0.012, y - 0.03, Z0 + 0.02], [X1, y + 0.03, Z1 - 0.02], 2, { ghost: true }));
  }
  // LE SOCLE DU CREUX, au fond, contre le mur est : 0,55, on y pose sans lever les bras.
  out.push(b([X1 - 1.0, 0, 3902.2], [X1, 0.55, 3903.8], 3));
  return out;
};

/**
 * LA POCHE DE LA JUMELLE. Une face couchée à plat (sa normale est +y) ne doit
 * jamais avoir son dos à l'air : une pièce posée sur le dos d'une porte
 * horizontale ne s'y repose jamais (limite connue du moteur). Le dos de B est
 * donc fermé par une poche de cinquante centimètres — assez pour que le corps
 * de qui marche au mur y avance d'un rayon avant que l'œil ne passe le plan —
 * close de toutes parts : rien ne s'y loge, rien ne s'y pose. Vue du fond,
 * c'est une console pendue au mur, à 2,70, sous la porte.
 */
const POCHE = 0.5;
const poche = (): BoxDef[] => {
  const e = 0.2;
  const y0 = 3.4 - POCHE;
  const x1 = X0 + 0.05 + 2.8;
  return [
    b([X0, y0 - e, ZM - 0.95 - e], [x1 + e, y0, ZM + 0.95 + e], 2),
    b([X0, y0, ZM - 0.95 - e], [x1 + e, 3.4, ZM - 0.95], 2),
    b([X0, y0, ZM + 0.95], [x1 + e, 3.4, ZM + 0.95 + e], 2),
    b([x1, y0, ZM - 0.95], [x1 + e, 3.4, ZM + 0.95], 2),
  ];
};

// ─── LA PORTE ────────────────────────────────────────────────────────────────

/** A, debout au fond, face au sud : on la franchit en marchant vers le nord. */
const FACE_A: PortalFaceDef = { position: [-300, 0.05, 3901], yaw: Math.PI };
/**
 * B, couchée sur le mur ouest : son haut est +x (on s'y tient les pieds au
 * mur), sa face regarde +y, le haut du puits. On en ressort en marchant vers
 * le haut — c'est-à-dire, pour qui en ressort, droit devant soi.
 */
const FACE_B: PortalFaceDef = { position: [X0 + 0.05, 3.4, ZM], yaw: 0, haut: '+x', normale: '+y' };

const PORTE: PortalPairDef = {
  id: 'puitsCouche-porte',
  colorBig: VIOLET,
  colorSmall: VIOLET,
  plane: true,
  big: FACE_A,
  small: FACE_B,
};

const VECTEUR: Record<Haut, V3> = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1],
};

/** Le fil à plomb, pendu au linteau vers les pieds de qui ressortira : sous B, vers le mur. */
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

/** Le jeton : sur le mur ouest, à vingt mètres, `position` au ras du mur (son sol). */
export const JETON_PUITS: CarryableDef = { id: 'jeton-puits', position: [X0, 20, ZM], size: 0.3, ink: 3, haut: '+x' };

export const PUITS_COUCHE: SalleModule = {
  nom: NOM,
  region: REGION,
  bounds: { min: [-400, -80, 3800], max: [-200, 120, 4000] },

  boxes: [...coque(), ...decor(), ...poche(), ...filAPlomb(FACE_A), ...filAPlomb(FACE_B)],
  carryables: [JETON_PUITS],

  sockets: [
    // UN SEUL CREUX, donc la règle 11 ne peut pas mordre. Il verrouille : c'est
    // un progrès. Et il n'accepte qu'une pièce DEBOUT — un creux est au sol —
    // ce qui tombe bien : le jeton ne peut y arriver qu'après avoir tourné avec
    // son porteur par la porte, jamais lancé du mur à l'aveugle.
    { id: 'creux-puits', position: [X1 - 0.5, 0.55, 3903], size: 0.3, ink: 3, portee: 0.6 },
  ],

  portals: [PORTE],

  /**
   * Le Pinceau attend au fond, passe devant A, puis MONTE le long du mur ouest
   * jusqu'au jeton — du fond, on le voit s'élever dans le puits, et c'est ce
   * qui dit « là-haut ». Il redescend au creux, puis à la sortie.
   */
  stations: [
    [-298, 2.4, 3897.2],
    [-300, 2.4, 3899.6],
    [X0 + 2.4, 12, ZM],
    [X0 + 2.4, 20.8, ZM],
    [X1 - 1.6, 2.4, 3903],
    [-298, 2.4, 3903.6],
  ],

  /**
   * On arrive au sud du fond, face au nord : A est à cinq mètres et demi, le
   * jeton au-dessus d'elle, à vingt mètres. La sortie est au nord du fond, à
   * un mètre du mur, et l'on y va en marchant vers le nord.
   */
  entree: { position: [-298, 0.05, Z0 + 1.5], echelle: 0, lacet: 0 },
  sortie: { position: [-298, 0.05, Z1 - 1.1], echelle: 0, lacet: 0 },
};

export const PUITS_COUCHE_PORTE = PORTE.id;
