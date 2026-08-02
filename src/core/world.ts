import type { Vec3 } from './math.js';
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

  /**
   * Le dessous du monde : le point le plus bas de toute la géométrie solide.
   *
   * Il n'existait pas, et rien ne rattrapait donc une chute hors du décor. Le
   * joueur tombait indéfiniment — mesuré à **y = −208 221** une nuit où un
   * correctif de collision avait ouvert un trou. On croyait tenir la règle « on
   * ne piège jamais le joueur » parce que chaque salle prévoyait sa remontée ;
   * en réalité on la tenait salle par salle, à la main, et jamais une fois pour
   * toutes.
   */
  readonly plancher: number;

  constructor(level: LevelDef) {
    this.level = level;
    this.solids = level.boxes.filter((b) => !b.ghost).map(aabbFromBox);
    let bas = Infinity;
    for (const s of this.solids) if (s.minY < bas) bas = s.minY;
    this.plancher = Number.isFinite(bas) ? bas : 0;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * Y A-T-IL DE LA PIERRE ENTRE CES DEUX POINTS ?
   *
   * `Carryables.targeted` mesurait une distance et un angle, et **pas un mot sur
   * ce qu'il y a entre l'œil et l'objet**. On ramassait donc à travers les murs.
   *
   * C'est resté invisible tant qu'on jouait entre ×1/4 et ×1, parce que le rayon
   * de saisie suit la taille : 2,88 m à hauteur d'homme, et l'on est rarement à
   * moins de trois mètres d'un objet séparé de soi par une cloison. **À ×4 il
   * vaut 11,52 m, à ×16 il vaut 46 m** — et là, tout ce qui est dans la pièce
   * voisine, sous le plancher ou dans la cave est à portée de main. Le défaut ne
   * se manifeste donc que dans les salles fondées sur la grandeur, c'est-à-dire
   * dans celles qu'on écrit maintenant.
   *
   * Deux salles s'en sont protégées par de la géométrie qui n'existe que pour
   * ça : onze mètres de roche pleine dans l'escalier, des parapets relevés à
   * 9,40 m dans l'atelier du haut. Leurs autrices l'ont écrit toutes les deux.
   *
   * ON NE TESTE QUE LE DÉCOR FIXE, jamais les caisses posées. Deux raisons, et
   * la première suffit : l'objet qu'on vise EST une caisse posée, donc il
   * s'occulterait lui-même. La seconde est de conception — une caisse derrière
   * une caisse reste une chose qu'on voit et qu'on veut pouvoir prendre, et
   * c'est déjà assez de refuser à cause des murs.
   *
   * Méthode des tranches : pour chaque boîte on calcule l'intervalle de
   * paramètre où le segment est dedans sur chacun des trois axes, et l'on
   * intersecte. C'est exact, c'est six divisions, et le monde n'a que des boîtes
   * droites — il n'y a rien de plus simple qui soit juste.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  segmentLibre(a: Vec3, b: Vec3): boolean {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;

    for (const s of this.solids) {
      let t0 = 0;
      let t1 = 1;

      // Sur chaque axe : l'intervalle où le segment se trouve entre les deux
      // faces. Un rayon parallèle à un axe est traité à part — la division
      // donnerait l'infini, ce qui est juste mais bruyant à lire.
      for (let i = 0; i < 3 && t0 <= t1; i++) {
        const o = i === 0 ? a.x : i === 1 ? a.y : a.z;
        const d = i === 0 ? dx : i === 1 ? dy : dz;
        const min = i === 0 ? s.minX : i === 1 ? s.minY : s.minZ;
        const max = i === 0 ? s.maxX : i === 1 ? s.maxY : s.maxZ;

        if (Math.abs(d) < 1e-9) {
          // Parallèle : ou bien on est dans la tranche pour toujours, ou bien
          // jamais.
          if (o < min || o > max) {
            t0 = 1;
            t1 = 0;
          }
          continue;
        }
        let e = (min - o) / d;
        let f = (max - o) / d;
        if (e > f) {
          const g = e;
          e = f;
          f = g;
        }
        if (e > t0) t0 = e;
        if (f < t1) t1 = f;
      }

      if (t0 <= t1) return false;
    }
    return true;
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
