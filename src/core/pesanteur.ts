/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA PESANTEUR, PAR AXE.
 *
 * Le haut d'un joueur — ou d'une pièce — est l'un des six sens des axes du
 * monde. Pour chacun, un REPÈRE : une permutation signée des axes, de
 * déterminant +1, dont l'axe y local est ce haut. Passer du monde au repère,
 * et retour, ne fait que CHOISIR et NIER des coordonnées : c'est exact en
 * virgule flottante, sans le moindre arrondi. Toute la physique du joueur —
 * les marches, les linteaux, les ulps de `physics.ts` — tourne donc telle
 * quelle dans le repère, et c'est ce qui rend la chose sûre : on n'a rien
 * réécrit de ce qui tient en équilibre sur le contact exact.
 *
 * Pourquoi des axes seulement : la boîte du joueur reste alors une boîte
 * droite, sa hauteur le long d'un axe, dans un monde de boîtes droites. Une
 * pesanteur de biais demanderait des boîtes tournées, et tout ce que le moteur
 * a appris sur le contact exact serait à refaire.
 *
 * On ne transforme JAMAIS le monde : on transforme la boîte de la question
 * vers le monde, et les boîtes de la réponse vers le repère (`VueTournee`).
 * Pour le haut ordinaire, `vueDe` rend le monde lui-même — même objet, même
 * calcul, au bit près.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { Vec3 } from './math.js';
import type { Aabb, World } from './world.js';

/** Le haut : un sens d'axe du monde. '+y' est le haut ordinaire. */
export type Haut = '+y' | '-y' | '+x' | '-x' | '+z' | '-z';
export const HAUTS: readonly Haut[] = ['+y', '-y', '+x', '-x', '+z', '-z'];

type Axe = 'x' | 'y' | 'z';
type Signe = 1 | -1;

/**
 * Un repère : `local[i] = signes[i] · monde[axes[i]]`, donc
 * `monde[axes[i]] = signes[i] · local[i]`. L'axe local y est le haut.
 */
export interface Repere {
  readonly haut: Haut;
  readonly axes: readonly [Axe, Axe, Axe];
  readonly signes: readonly [Signe, Signe, Signe];
}

/** Les six repères. Chacun est une rotation (déterminant +1), jamais un miroir. */
export const REPERES: Readonly<Record<Haut, Repere>> = {
  '+y': { haut: '+y', axes: ['x', 'y', 'z'], signes: [1, 1, 1] },
  '-y': { haut: '-y', axes: ['x', 'y', 'z'], signes: [1, -1, -1] },
  '+x': { haut: '+x', axes: ['y', 'x', 'z'], signes: [-1, 1, 1] },
  '-x': { haut: '-x', axes: ['y', 'x', 'z'], signes: [1, -1, 1] },
  '+z': { haut: '+z', axes: ['x', 'z', 'y'], signes: [1, 1, -1] },
  '-z': { haut: '-z', axes: ['x', 'z', 'y'], signes: [1, -1, 1] },
};

/** Le haut ordinaire ? `undefined` en est un : c'est l'état de tout l'existant. */
export const estDebout = (h: Haut | undefined): boolean => h === undefined || h === '+y';

/** Un vecteur du monde, lu dans le repère. `out` peut être `v`. */
export const versLocal = (r: Repere, v: Vec3, out: Vec3): Vec3 => {
  const x = r.signes[0] * v[r.axes[0]];
  const y = r.signes[1] * v[r.axes[1]];
  const z = r.signes[2] * v[r.axes[2]];
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
};

/** Un vecteur du repère, remis dans le monde. `out` peut être `v`. */
export const versMonde = (r: Repere, v: Vec3, out: Vec3): Vec3 => {
  const a = r.signes[0] * v.x;
  const b = r.signes[1] * v.y;
  const c = r.signes[2] * v.z;
  out[r.axes[0]] = a;
  out[r.axes[1]] = b;
  out[r.axes[2]] = c;
  return out;
};

/** La hauteur d'un point le long du haut : sa coordonnée y dans le repère. */
export const hauteurDans = (r: Repere, v: Vec3): number => r.signes[1] * v[r.axes[1]];

const MIN = { x: 'minX', y: 'minY', z: 'minZ' } as const;
const MAX = { x: 'maxX', y: 'maxY', z: 'maxZ' } as const;
const LOC: readonly Axe[] = ['x', 'y', 'z'];

/** Une boîte du monde, lue dans le repère. Nier un axe échange son min et son max. */
export const boiteVersLocal = (r: Repere, b: Aabb, out: Aabb): Aabb => {
  for (let i = 0; i < 3; i++) {
    const a = r.axes[i];
    const lo = r.signes[i] > 0 ? b[MIN[a]] : -b[MAX[a]];
    const hi = r.signes[i] > 0 ? b[MAX[a]] : -b[MIN[a]];
    out[MIN[LOC[i]]] = lo;
    out[MAX[LOC[i]]] = hi;
  }
  return out;
};

/** Une boîte du repère, remise dans le monde. */
export const boiteVersMonde = (r: Repere, b: Aabb, out: Aabb): Aabb => {
  for (let i = 0; i < 3; i++) {
    const a = r.axes[i];
    const l = LOC[i];
    const lo = r.signes[i] > 0 ? b[MIN[l]] : -b[MAX[l]];
    const hi = r.signes[i] > 0 ? b[MAX[l]] : -b[MIN[l]];
    out[MIN[a]] = lo;
    out[MAX[a]] = hi;
  }
  return out;
};

/** Le vecteur unité d'un haut. */
export const vecteurHaut = (h: Haut): Vec3 => {
  const s = h[0] === '+' ? 1 : -1;
  return { x: h[1] === 'x' ? s : 0, y: h[1] === 'y' ? s : 0, z: h[1] === 'z' ? s : 0 };
};

/**
 * Le haut porté par une direction, ou `null` si elle ne tombe pas sur un axe.
 * C'est ce qui décide si une porte peut faire passer une pesanteur : elle la
 * tourne comme une vitesse, et le résultat doit rester sur un axe.
 */
export const hautDe = (v: Vec3, tolerance = 1e-6): Haut | null => {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  const m = Math.max(ax, ay, az);
  const l = Math.hypot(v.x, v.y, v.z);
  if (l === 0 || m / l < 1 - tolerance) return null;
  if (m === ay) return v.y > 0 ? '+y' : '-y';
  if (m === ax) return v.x > 0 ? '+x' : '-x';
  return v.z > 0 ? '+z' : '-z';
};

/**
 * CE QUE LA PHYSIQUE DEMANDE AU MONDE. `World` l'offre déjà tel quel ; une
 * `VueTournee` l'offre dans un repère.
 */
export interface Collisions {
  query(box: Aabb, out: Aabb[]): Aabb[];
  queryStatic(box: Aabb, out: Aabb[]): Aabb[];
  segmentLibre(a: Vec3, b: Vec3): boolean;
  dessusDuSol(box: Aabb, tolerance: number): number;
  /** Le point le plus bas du décor, le long du haut. */
  readonly plancher: number;
}

const neuve = (): Aabb => ({ minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 });

/**
 * LE MONDE VU DEPUIS UN REPÈRE. Quelques affectations par requête : la boîte
 * de la question part vers le monde, les boîtes de la réponse reviennent dans
 * le repère. Les réponses vivent dans une réserve réutilisée d'une requête à
 * l'autre — comme `scratchHits` dans `physics.ts`, on ne les garde jamais
 * au-delà de la requête suivante.
 */
export class VueTournee implements Collisions {
  readonly plancher: number;
  private readonly question = neuve();
  private readonly brut: Aabb[] = [];
  private readonly reserve: Aabb[] = [];
  private readonly pa: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly pb: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly locale = neuve();

  constructor(
    readonly world: World,
    readonly repere: Repere,
  ) {
    const a = repere.axes[1];
    let bas = Infinity;
    for (const s of world.solids) {
      const v = repere.signes[1] > 0 ? s[MIN[a]] : -s[MAX[a]];
      if (v < bas) bas = v;
    }
    this.plancher = Number.isFinite(bas) ? bas : 0;
  }

  private rendre(hits: Aabb[], out: Aabb[]): Aabb[] {
    out.length = 0;
    for (let k = 0; k < hits.length; k++) {
      const b = this.reserve[k] ?? (this.reserve[k] = neuve());
      out.push(boiteVersLocal(this.repere, hits[k], b));
    }
    return out;
  }

  query(box: Aabb, out: Aabb[]): Aabb[] {
    return this.rendre(this.world.query(boiteVersMonde(this.repere, box, this.question), this.brut), out);
  }

  queryStatic(box: Aabb, out: Aabb[]): Aabb[] {
    return this.rendre(this.world.queryStatic(boiteVersMonde(this.repere, box, this.question), this.brut), out);
  }

  segmentLibre(a: Vec3, b: Vec3): boolean {
    return this.world.segmentLibre(versMonde(this.repere, a, this.pa), versMonde(this.repere, b, this.pb));
  }

  /** `World.dessusDuSol`, le long du haut du repère. */
  dessusDuSol(box: Aabb, tolerance: number): number {
    let haut = box.minY;
    for (const s of this.world.queryStatic(boiteVersMonde(this.repere, box, this.question), this.brut)) {
      const l = boiteVersLocal(this.repere, s, this.locale);
      if (l.maxY > haut && l.maxY <= box.minY + tolerance) haut = l.maxY;
    }
    return haut;
  }
}

const vues = new WeakMap<World, Map<Haut, VueTournee>>();

/** Le monde vu depuis ce haut. Pour le haut ordinaire : le monde lui-même. */
export const vueDe = (world: World, h: Haut | undefined): Collisions => {
  if (estDebout(h)) return world;
  let m = vues.get(world);
  if (!m) vues.set(world, (m = new Map()));
  let v = m.get(h!);
  if (!v) m.set(h!, (v = new VueTournee(world, REPERES[h!])));
  return v;
};
