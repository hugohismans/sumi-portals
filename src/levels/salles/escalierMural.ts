import type { Haut } from '../../core/pesanteur.js';
import type { BoxDef, CarryableDef, PortalFaceDef, PortalPairDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * L'ESCALIER MURAL — *ce qu'on pose garde le bas qu'on avait.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA CHAÎNE
 *
 *   1. Une cour couverte, douze mètres sur dix, neuf de haut. Au mur nord, à
 *      4,20, un balcon ; au bout du balcon, une porte percée dans le mur ouest.
 *      C'est la sortie, et 4,20 est trois sauts de trop.
 *   2. Des cubes de 0,80 au sol — cinq, dont un de rechange. Au sol, ils ne
 *      font rien : une pièce ne se pose que sur la pierre, jamais sur une
 *      autre pièce — on n'empile pas.
 *   3. La porte violette du milieu ressort COUCHÉE SUR LE MUR NORD, sous le
 *      plafond, face au sol. On y porte un cube ; le mur nord est le sol ; on y
 *      POSE le cube. Il y reste, collé : il tombe vers le mur, parce que c'est
 *      là qu'était le bas de qui l'a posé.
 *   4. On en pose quatre, EN DIAGONALE : chacun 0,80 « plus loin » que le
 *      précédent — c'est-à-dire, redevenu debout, 0,80 plus HAUT — et décalé
 *      d'un bon pas de côté. On repasse la porte, on revient debout, et l'on
 *      monte un escalier qui tient au mur : 0,80 · 1,60 · 2,40 · 3,20, puis le
 *      saut d'un mètre jusqu'au balcon.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ERREUR UNIVERSELLE, et elle est faite exprès : LA COLONNE. Couché sur le
 * mur, le balcon est « devant » ; on pose ses cubes droit devant soi, en file.
 * Redevenu debout, on a bâti un pilier de 3,20 aux flancs lisses : aucune
 * marche. Le réglet peint à côté de la console — 0,80, 1,60, 2,40, 3,20, en
 * colonne justement — dit les hauteurs sans dire le décalage. Se tromper coûte
 * quatre allers-retours, jamais la salle : les cubes se reprennent sur le mur
 * et se reposent ailleurs.
 *
 * L'ÉTALON (règle 9) : LA CONSOLE, un bloc de 0,80 pendu au mur nord à 0,80 du
 * sol, à l'est. C'est un cube collé au mur, en pierre, avant qu'on en ait collé
 * un seul : on voit d'emblée qu'une chose tenue au mur à cette hauteur est une
 * marche. Et le réglet se peint, comme tout le reste, pour le plaisir.
 *
 * RÈGLE 8 — LE LIEU REVISITÉ : l'escalier de la montée, qu'on bâtissait pour
 * une taille qu'on n'avait pas encore. Celui-ci se bâtit pour un BAS qu'on n'a
 * plus : couché, on construit pour soi debout.
 *
 * TOLÉRANCES — mesurées, pas promises. Une pièce posée ne s'empile pas mais se
 * RECOUVRE : deux cubes posés l'un « derrière » l'autre à moins d'une arête
 * s'interpénètrent, et le dessus du premier disparaît sous le second. Il suffit
 * donc que chaque dessus soit à moins d'un saut (1,29) du précédent et à côté
 * de lui, et que le dernier soit à moins d'un saut du balcon : trois cubes bien
 * posés suffisent, l'escalier en demande quatre, et l'on en donne cinq.
 *
 * LA SORTIE EST DANS UN TUNNEL, et c'est une précaution. Qui marche au mur nord
 * a le corps couché le long de z, 1,80 de long ; le tunnel ne fait que 1,70 de
 * large : il n'y entre jamais, couché, et ne rencontre donc jamais la porte de
 * sortie — il y serait refusé (« trop grand »), ce qui serait faux, ou pire,
 * il arriverait couché dans la salle suivante. Debout, on y entre de face.
 */

const NOM = 'escalierMural';

const X0 = -106;
const X1 = -94;
const Z0 = 3895;
const Z1 = 3905;
const H = 9;

/** Le balcon : son dessus, son dessous, son bord est et sa profondeur. */
const BALCON = 4.2;
const BALCON_DESSOUS = 3.9;
const BALCON_EST = -102;
const BALCON_SUD = 3902.5;

/** Le tunnel de sortie, dans le mur ouest : 1,70 de large, 3,00 de haut. */
const TUNNEL_SUD = 3902.9;
const TUNNEL_NORD = 3904.6;
const TUNNEL_HAUT = 7.2;
const TUNNEL_FOND = -109;
/** Épaisseur du mur ouest, qui porte le tunnel. */
const MUR_OUEST = -111;

/** L'épaisseur des parois : voir `bascule.ts` — une pièce tenue traverse la pierre jusqu'à 2,34 m. */
const EPAISSEUR = 3;

const CUBE = 0.8;
const VIOLET = 0x7a4c8a;

type V3 = [number, number, number];

const REGION = {
  name: NOM,
  min: [-200, -80, 3800] as V3,
  max: [0, 120, 4000] as V3,
  // Craie sèche d'une cour d'atelier, et la couleur du chapitre aux cadres.
  paper: '#f0ece6',
  colors: ['#e8e2d8', '#c8bead', '#7b7162', '#7a4c8a'] as [string, string, string, string],
  ink: '#1f1c18',
  brouillard: 120,
};

const b = (min: V3, max: V3, ink = 0, opts: { outline?: boolean; ghost?: boolean; famille?: string } = {}): BoxDef => ({
  min,
  max,
  ink,
  region: NOM,
  ...opts,
});

/**
 * LA COQUE, et son mur ouest est épais de cinq mètres parce qu'il porte le
 * tunnel : cinq blocs autour du trou — dessous, dessus, au sud, au nord, et le
 * fond derrière la porte.
 */
const coque = (): BoxDef[] => {
  const t = EPAISSEUR;
  return [
    b([MUR_OUEST - 0.1, -t, Z0 - t - 0.1], [X1 + t + 0.1, 0, Z1 + t + 0.1], 1, { outline: false }),
    b([MUR_OUEST - 0.2, H, Z0 - t - 0.2], [X1 + t + 0.2, H + t, Z1 + t + 0.2], 1, { outline: false }),
    b([X1, -0.5, Z0 - t], [X1 + t, H + 0.5, Z1 + t], 0),
    b([X0, -0.5, Z0 - t], [X1, H + 0.5, Z0], 0),
    b([X0, -0.5, Z1], [X1, H + 0.5, Z1 + t], 0),
    // Le mur ouest, autour du tunnel.
    b([MUR_OUEST, -0.5, Z0 - t], [X0, BALCON, Z1 + t], 0),
    b([MUR_OUEST, TUNNEL_HAUT, Z0 - t], [X0, H + 0.5, Z1 + t], 0),
    b([MUR_OUEST, BALCON, Z0 - t], [X0, TUNNEL_HAUT, TUNNEL_SUD], 0),
    b([MUR_OUEST, BALCON, TUNNEL_NORD], [X0, TUNNEL_HAUT, Z1 + t], 0),
    b([MUR_OUEST, BALCON, TUNNEL_SUD], [TUNNEL_FOND, TUNNEL_HAUT, TUNNEL_NORD], 1),
  ];
};

/**
 * LE BALCON, pendu aux murs nord et ouest. Trente centimètres d'épaisseur, et
 * rien dessous : du sol, on voit son dessous et le cadre de la porte au fond.
 */
const balcon = (): BoxDef[] => [b([X0, BALCON_DESSOUS, BALCON_SUD], [BALCON_EST, BALCON, Z1], 2)];

/**
 * LA CONSOLE ET LE RÉGLET. La console : un cube de pierre de 0,80 pendu au mur
 * nord, son dessus à 0,80 — l'étalon. Le réglet : cinq traits peints sur le
 * mur au-dessus d'elle, à 0,80, 1,60, 2,40, 3,20 et 4,20 (le balcon). En
 * colonne, comme l'erreur qu'on va faire. Une famille : on les peint si l'on
 * veut, d'une couleur rapportée, et rien ne l'exige.
 */
const CONSOLE_X = X1 - 0.9;
const console_ = (): BoxDef[] => {
  const out: BoxDef[] = [b([CONSOLE_X - CUBE / 2, 0.55, Z1 - CUBE], [CONSOLE_X + CUBE / 2, 0.8, Z1], 3)];
  for (const y of [0.8, 1.6, 2.4, 3.2, BALCON]) {
    out.push(b([CONSOLE_X - 0.3, y - 0.025, Z1 - 0.012], [CONSOLE_X + 0.3, y + 0.025, Z1], 2, { ghost: true, famille: `${NOM}-reglet` }));
  }
  // Le montant du réglet, du sol au balcon.
  out.push(b([CONSOLE_X + 0.3, 0.8, Z1 - 0.011], [CONSOLE_X + 0.34, BALCON, Z1], 2, { ghost: true, famille: `${NOM}-reglet` }));
  return out;
};

/**
 * LA POCHE DE LA JUMELLE. B est couchée à plat, face au sol (sa normale est
 * −y) : son dos regarde le plafond, et une pièce qui s'y poserait ne s'y
 * reposerait jamais (limite connue du moteur). On le ferme donc d'une poche
 * de cinquante centimètres, close de toutes parts — assez pour que le corps de
 * qui marche au mur y avance d'un rayon avant que l'œil ne passe le plan. Du
 * sol, c'est un caisson pendu au mur nord, à 6,50, la porte violette dessous.
 */
const POCHE = 0.5;
const poche = (): BoxDef[] => {
  const e = 0.2;
  const xB = -97.5;
  const yB = 6.5;
  const zB = Z1 - 0.05 - 2.8;
  return [
    b([xB - 0.95 - e, yB + POCHE, zB - e], [xB + 0.95 + e, yB + POCHE + e, Z1], 2),
    b([xB - 0.95 - e, yB, zB - e], [xB - 0.95, yB + POCHE, Z1], 2),
    b([xB + 0.95, yB, zB - e], [xB + 0.95 + e, yB + POCHE, Z1], 2),
    b([xB - 0.95, yB, zB - e], [xB + 0.95, yB + POCHE, zB], 2),
  ];
};

// ─── LA PORTE ────────────────────────────────────────────────────────────────

/** A, debout au milieu de la cour, face au sud. */
const FACE_A: PortalFaceDef = { position: [-97.5, 0.05, 3900], yaw: Math.PI };
/**
 * B, couchée sur le mur nord à 6,50 : son haut est −z (on s'y tient les pieds
 * au mur), sa face regarde le sol. On en ressort en marchant vers le bas du
 * mur, le coin du sol devant soi. Du sol, on n'y touche pas : l'œil culmine
 * à 2,95, et même debout sur le quatrième cube (3,20), à 6,15.
 */
const FACE_B: PortalFaceDef = { position: [-97.5, 6.5, Z1 - 0.05], yaw: 0, haut: '-z', normale: '-y' };

const PORTE: PortalPairDef = {
  id: 'escalierMural-porte',
  colorBig: VIOLET,
  colorSmall: VIOLET,
  plane: true,
  big: FACE_A,
  small: FACE_B,
};

const VECTEUR: Record<Haut, V3> = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1],
};

/** Le fil à plomb : sous B, il pend vers le mur nord. */
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
 * LES CUBES, en vrac au sud de la cour : quatre pour l'escalier, et UN DE PLUS.
 *
 * Trois bien posés suffisent (voir TOLÉRANCES) ; le cinquième n'est pas une
 * marche de plus, c'est une assurance. Un cube lancé dans le tunnel du balcon
 * passe la porte de sortie — les raccords laissent passer les pièces — et
 * attend dans la cuve, où l'on ne va qu'en ayant déjà monté l'escalier. Il en
 * faudrait lancer trois pour rester en bas : ce n'est plus une maladresse. Le
 * remède est celui du creux de la descente — une pièce de rechange —, parce
 * qu'aucune géométrie n'arrête un lancer sans arrêter le joueur.
 */
const cubes = (): CarryableDef[] =>
  ([
    [-101.2, 0.01, 3897.6],
    [-100.0, 0.01, 3897.2],
    [-101.6, 0.01, 3898.8],
    [-100.3, 0.01, 3898.5],
    [-102.5, 0.01, 3897.9],
  ] as V3[]).map((position, i) => ({ id: `cube-mural-${i + 1}`, position, size: CUBE, ink: i % 2 === 0 ? 1 : 2 }));

export const ESCALIER_MURAL: SalleModule = {
  nom: NOM,
  region: REGION,
  bounds: { min: [-200, -80, 3800], max: [0, 120, 4000] },

  boxes: [...coque(), ...balcon(), ...console_(), ...poche(), ...filAPlomb(FACE_A), ...filAPlomb(FACE_B)],
  carryables: cubes(),
  portals: [PORTE],

  /**
   * Le Pinceau attend à l'arrivée, passe devant A, se pose au pied du mur nord
   * — là où, couché, on posera le premier cube —, remonte en diagonale jusqu'au
   * bord du balcon, puis entre dans le tunnel.
   */
  stations: [
    [-97, 2.4, 3897.5],
    [-97.5, 2.4, 3899.4],
    [-97.5, 1.2, Z1 - 2.4],
    [-100.4, 3.6, Z1 - 1.6],
    [-104, BALCON + 2.4, 3903.7],
    [-107, BALCON + 2.4, 3903.75],
  ],

  /**
   * On arrive au sud, face au nord : la porte violette à trois mètres et demi,
   * le mur nord derrière elle, le balcon en haut à gauche. On repart par le
   * tunnel du balcon, en marchant vers l'ouest (`lacet` −π/2) : la face de
   * sortie regarde l'est, à 1,60 dans le tunnel.
   */
  entree: { position: [-97, 0.05, Z0 + 1.5], echelle: 0, lacet: 0 },
  sortie: { position: [X0 - 1.6, BALCON + 0.05, (TUNNEL_SUD + TUNNEL_NORD) / 2], echelle: 0, lacet: -Math.PI / 2 },
};

export const ESCALIER_MURAL_PORTE = PORTE.id;
/** Le dessus du balcon et son bord est, pour le pilote et les vérifications. */
export const ESCALIER_MURAL_BALCON = { dessus: BALCON, est: BALCON_EST, sud: BALCON_SUD };
