import type { BoxDef, LevelDef } from './types.js';

export interface Aabb {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export const aabbFromBox = (b: BoxDef): Aabb => ({
  minX: b.min[0],
  minY: b.min[1],
  minZ: b.min[2],
  maxX: b.max[0],
  maxY: b.max[1],
  maxZ: b.max[2],
});

export const overlaps = (a: Aabb, b: Aabb): boolean =>
  a.minX < b.maxX &&
  a.maxX > b.minX &&
  a.minY < b.maxY &&
  a.maxY > b.minY &&
  a.minZ < b.maxZ &&
  a.maxZ > b.minZ;

/** Géométrie de collision du niveau. Pas de rendu ici, uniquement des boîtes. */
export class World {
  readonly level: LevelDef;
  /** Décor fixe. */
  readonly solids: Aabb[];
  /**
   * Obstacles mobiles — les caisses posées. Réécrit à chaque tick par
   * Carryables.publishSolids(). C'est ce qui permet de MONTER sur une caisse
   * qu'on vient de déposer, et donc d'en faire une marche.
   */
  readonly dynamic: Aabb[] = [];

  constructor(level: LevelDef) {
    this.level = level;
    this.solids = level.boxes.filter((b) => !b.ghost).map(aabbFromBox);
  }

  /** Tout ce qui peut arrêter le joueur : décor et caisses posées. */
  query(box: Aabb, out: Aabb[]): Aabb[] {
    out.length = 0;
    for (const s of this.solids) {
      if (overlaps(box, s)) out.push(s);
    }
    for (const s of this.dynamic) {
      if (overlaps(box, s)) out.push(s);
    }
    return out;
  }

  /** Décor fixe uniquement — ce sur quoi les caisses elles-mêmes retombent. */
  queryStatic(box: Aabb, out: Aabb[]): Aabb[] {
    out.length = 0;
    for (const s of this.solids) {
      if (overlaps(box, s)) out.push(s);
    }
    return out;
  }
}
