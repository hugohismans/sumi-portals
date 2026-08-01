import { GRAVITY, PLAYER_HEIGHT, PLAYER_RADIUS } from './constants.js';
import { vec3, yawToForward, type Vec3 } from './math.js';
import type { CarryableDef } from './types.js';
import type { Aabb, World } from './world.js';

/**
 * Les caisses.
 *
 * Règle unique, dont découle tout le reste : **une caisse posée garde sa taille
 * dans le monde, une caisse portée suit son porteur.** Traverser un portail les
 * bras chargés multiplie donc la caisse par le même facteur que soi.
 *
 * C'est ce qui en fait un outil d'énigme et pas un décor : on va chercher une
 * caisse d'un mètre, on la rapporte par la petite porte, elle en fait quatre, et
 * c'était la marche qui manquait.
 *
 * Corollaire important : ce qu'on peut soulever dépend de sa propre taille. Un
 * cube qu'un joueur normal cale sous son bras est un immeuble pour un joueur
 * minuscule, et un caillou pour un géant.
 */

/** Part de sa propre hauteur qu'on arrive à soulever. */
const LIFT_RATIO = 0.55;

/** Portée de saisie, en hauteurs de joueur. */
const REACH = 1.6;

export interface Carryable {
  id: string;
  /** Centre du bas. */
  position: Vec3;
  velocity: Vec3;
  size: number;
  ink: number;
  held: boolean;
  grounded: boolean;
}

export const aabbOfCarryable = (c: Carryable, out: Aabb): Aabb => {
  const h = c.size * 0.5;
  out.minX = c.position.x - h;
  out.maxX = c.position.x + h;
  out.minY = c.position.y;
  out.maxY = c.position.y + c.size;
  out.minZ = c.position.z - h;
  out.maxZ = c.position.z + h;
  return out;
};

const scratch: Aabb = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
const hits: Aabb[] = [];

export class Carryables {
  readonly items: Carryable[] = [];
  private readonly defs: CarryableDef[];

  constructor(defs: CarryableDef[] = []) {
    this.defs = defs;
    this.reset();
  }

  reset(): void {
    this.items.length = 0;
    for (const d of this.defs) {
      this.items.push({
        id: d.id,
        position: vec3(d.position[0], d.position[1], d.position[2]),
        velocity: vec3(0, 0, 0),
        size: d.size,
        ink: d.ink ?? 3,
        held: false,
        grounded: false,
      });
    }
  }

  get held(): Carryable | null {
    return this.items.find((c) => c.held) ?? null;
  }

  /** Rafraîchit la liste des obstacles mobiles vue par le monde. */
  publishSolids(world: World): void {
    world.dynamic.length = 0;
    for (const c of this.items) {
      if (c.held) continue; // dans les bras, une caisse ne fait plus obstacle
      world.dynamic.push(aabbOfCarryable(c, { ...scratch }));
    }
  }

  /** Ce joueur peut-il soulever cette caisse ? */
  canLift(c: Carryable, playerScale: number): boolean {
    return c.size <= PLAYER_HEIGHT * playerScale * LIFT_RATIO;
  }

  /**
   * Caisse visée : la plus proche devant soi, à portée. On renvoie même celles
   * qui sont trop grosses, pour pouvoir le dire au joueur plutôt que de laisser
   * la touche sans effet.
   */
  targeted(playerPos: Vec3, yaw: number, playerScale: number): Carryable | null {
    const reach = PLAYER_HEIGHT * playerScale * REACH;
    const eyeY = playerPos.y + PLAYER_HEIGHT * playerScale * 0.6;
    const fwd = yawToForward(yaw);

    let best: Carryable | null = null;
    let bestDist = Infinity;
    for (const c of this.items) {
      if (c.held) continue;
      const cx = c.position.x - playerPos.x;
      const cy = c.position.y + c.size * 0.5 - eyeY;
      const cz = c.position.z - playerPos.z;
      const dist = Math.hypot(cx, cy, cz);
      if (dist > reach + c.size * 0.5) continue;
      // Devant soi, pas dans le dos.
      const flat = Math.hypot(cx, cz) || 1;
      if ((cx / flat) * fwd.x + (cz / flat) * fwd.z < 0.25) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    return best;
  }

  /** Colle la caisse portée devant son porteur, à hauteur de poitrine. */
  followCarrier(c: Carryable, playerPos: Vec3, yaw: number, playerScale: number): void {
    const fwd = yawToForward(yaw);
    const reach = PLAYER_RADIUS * playerScale + c.size * 0.65;
    c.position.x = playerPos.x + fwd.x * reach;
    c.position.z = playerPos.z + fwd.z * reach;
    c.position.y = playerPos.y + PLAYER_HEIGHT * playerScale * 0.42 - c.size * 0.5;
    c.velocity.x = 0;
    c.velocity.y = 0;
    c.velocity.z = 0;
  }

  /**
   * Cherche où poser la caisse sans l'encastrer.
   *
   * Sans ça, lâcher une caisse contre un mur la coince dedans, et la résolution
   * de pénétration la fait jaillir par le haut — on la retrouvait sur le toit
   * de la tour qu'elle était censée aider à gravir. On la ramène donc vers son
   * porteur jusqu'à trouver de l'air.
   */
  placeForDrop(c: Carryable, world: World, playerPos: Vec3, yaw: number, playerScale: number): void {
    const fwd = yawToForward(yaw);
    const far = PLAYER_RADIUS * playerScale + c.size * 0.65;
    const y = playerPos.y + PLAYER_HEIGHT * playerScale * 0.42 - c.size * 0.5;

    for (let step = 0; step <= 10; step++) {
      const reach = far * (1 - step / 10);
      c.position.x = playerPos.x + fwd.x * reach;
      c.position.z = playerPos.z + fwd.z * reach;
      c.position.y = y;
      aabbOfCarryable(c, scratch);
      if (world.queryStatic(scratch, hits).length === 0) return;
    }
    // Dernier recours : aux pieds du porteur, quitte à ce que ce soit serré.
    c.position.x = playerPos.x;
    c.position.z = playerPos.z;
    c.position.y = playerPos.y;
  }

  /**
   * Chute libre des caisses posées.
   *
   * La gravité est celle du MONDE, sans mise à l'échelle : une caisse n'a pas
   * de taille de joueur, elle tombe comme un objet du décor. Elles ne se
   * heurtent qu'aux solides fixes, pas entre elles — un empilement approximatif
   * vaut mieux qu'un tremblement perpétuel.
   */
  step(world: World, dt: number): void {
    for (const c of this.items) {
      if (c.held) continue;

      c.velocity.y -= GRAVITY * dt;
      c.position.y += c.velocity.y * dt;
      c.grounded = false;

      aabbOfCarryable(c, scratch);
      const touching = world.queryStatic(scratch, hits);
      if (touching.length > 0) {
        if (c.velocity.y < 0) {
          let top = -Infinity;
          for (const h of touching) top = Math.max(top, h.maxY);
          c.position.y = top;
          c.grounded = true;
        } else {
          let bottom = Infinity;
          for (const h of touching) bottom = Math.min(bottom, h.minY);
          c.position.y = bottom - c.size;
        }
        c.velocity.y = 0;
      }
    }
  }
}
