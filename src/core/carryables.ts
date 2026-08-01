import { GRAVITY, PLAYER_HEIGHT, PLAYER_RADIUS, EYE_FRACTION } from './constants.js';
import { vec3, type Vec3 } from './math.js';
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
export const LIFT_RATIO = 0.55;

/** Portée de saisie, en hauteurs de joueur. */
export const REACH = 1.6;

/** Vitesse de lancer, en hauteurs de joueur par seconde. */
const THROW_SPEED = 7;

/** Ce qui reste de la vitesse horizontale après une seconde au sol. */
const GROUND_DRAG = 0.02;

/** Rebond à l'atterrissage. Discret : une caisse n'est pas une balle. */
const BOUNCE = 0.18;

/**
 * Distance de portage, en multiples de la caisse. Généreuse à dessein : tenue
 * au ras du nez, une caisse mangeait la moitié du champ de vision.
 */
const HOLD_SPREAD = 2.0;

/** Décalage vers le bas, en hauteurs de joueur : la caisse pend sous le réticule. */
const HOLD_DROP = 0.28;

/**
 * Jusqu'où l'on peut rapprocher la caisse pour la caler contre un mur.
 *
 * Le plancher n'est pas décoratif : sous 0,34 environ, la caisse chevaucherait
 * son porteur, redeviendrait solide en se posant et le soulèverait. On garde
 * une marge confortable.
 */
const DROP_CLOSENESS_FLOOR = 0.4;

export interface Carryable {
  id: string;
  /** Centre du bas. */
  position: Vec3;
  velocity: Vec3;
  /** Orientation d'affichage. La collision, elle, reste une boîte droite. */
  rotation: Vec3;
  spin: Vec3;
  size: number;
  /** Main courante. Elle BASCULE à chaque passage par un portail miroir. */
  main?: 'L' | 'D';
  ink: number;
  held: boolean;
  grounded: boolean;
  /**
   * Logée dans son réceptacle, donc figée pour de bon.
   *
   * On ne la reprend plus : un progrès qu'on peut défaire par accident en
   * frôlant la touche de saisie n'est pas un progrès.
   */
  locked: boolean;
  /**
   * Œil du porteur au moment du lâcher, ou null.
   *
   * Portée, une caisse est tendue devant soi : elle franchit donc le plan du
   * portail AVANT son porteur. Si on la lâche là, elle se retrouve derrière
   * sans avoir traversé — coincée du mauvais côté, à la mauvaise taille. En
   * repartant de l'œil, qui est resté devant, le segment coupe le plan et la
   * traversée se déclenche comme elle le doit.
   */
  releasedAt: Vec3 | null;
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

/** Direction du regard, inclinaison comprise. */
export const lookDirection = (yaw: number, pitch: number): Vec3 => {
  const cp = Math.cos(pitch);
  return vec3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
};

/**
 * Où se tient la caisse : à distance HORIZONTALE fixe devant soi, à la hauteur
 * que désigne le regard.
 *
 * On a d'abord essayé de la poser au bout du rayon du regard, tout simplement.
 * Erreur : en baissant les yeux, ce rayon rapproche la caisse, jusqu'à ce
 * qu'elle chevauche le joueur — et une caisse lâchée là redevient solide sous
 * ses pieds et le soulève. En figeant l'écart horizontal, on garantit qu'elle
 * ne peut jamais retomber sur son porteur, tout en laissant l'inclinaison
 * commander la hauteur, ce qui est bien le geste attendu.
 */
const holdPoint = (
  c: Carryable,
  playerPos: Vec3,
  yaw: number,
  pitch: number,
  playerScale: number,
  closeness: number,
): Vec3 => {
  // L'écart est proportionnel à la caisse, et généreux : tenue au ras du nez,
  // elle mangeait la moitié de l'écran. Elle est aussi décalée vers le bas,
  // sous le réticule, pour qu'on garde la vue dégagée en la portant.
  const flat = PLAYER_RADIUS * playerScale + c.size * HOLD_SPREAD * closeness;
  const eyeY = playerPos.y + PLAYER_HEIGHT * EYE_FRACTION * playerScale;
  const drop = PLAYER_HEIGHT * playerScale * HOLD_DROP;
  // Bornée : à la verticale, une tangente part à l'infini.
  const slope = Math.tan(Math.max(-1.15, Math.min(1.15, pitch)));
  // Jamais sous ses propres pieds : en visant le sol de près, la ligne du
  // regard passe sous le plancher, et la caisse s'y enfonçait — donc refusait
  // de se poser, faute d'y trouver de la place.
  const y = Math.max(eyeY + slope * flat - c.size * 0.5 - drop, playerPos.y);
  return vec3(
    playerPos.x + Math.sin(yaw) * flat,
    y,
    playerPos.z + Math.cos(yaw) * flat,
  );
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
        rotation: vec3(0, 0, 0),
        spin: vec3(0, 0, 0),
        size: d.size,
        main: d.main,
        ink: d.ink ?? 3,
        held: false,
        grounded: false,
        locked: false,
        releasedAt: null,
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
    const fwd = lookDirection(yaw, 0);

    let best: Carryable | null = null;
    let bestDist = Infinity;
    for (const c of this.items) {
      if (c.held || c.locked) continue;
      const cx = c.position.x - playerPos.x;
      const cy = c.position.y + c.size * 0.5 - eyeY;
      const cz = c.position.z - playerPos.z;
      const dist = Math.hypot(cx, cy, cz);
      if (dist > reach + c.size * 0.5) continue;
      const flat = Math.hypot(cx, cz) || 1;
      if ((cx / flat) * fwd.x + (cz / flat) * fwd.z < 0.25) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    return best;
  }

  /**
   * Position de portage : au bout du regard, inclinaison comprise.
   *
   * C'est ce qui rend le maniement agréable. Tenue à hauteur de poitrine et
   * toujours à l'horizontale, la caisse était impossible à placer : on ne
   * pouvait ni la lever ni la poser où l'on visait.
   */
  followCarrier(
    c: Carryable,
    playerPos: Vec3,
    yaw: number,
    pitch: number,
    playerScale: number,
  ): void {
    const p = holdPoint(c, playerPos, yaw, pitch, playerScale, 1);
    c.position.x = p.x;
    c.position.y = p.y;
    c.position.z = p.z;
    c.velocity.x = 0;
    c.velocity.y = 0;
    c.velocity.z = 0;
    c.spin.x = 0;
    c.spin.y = 0;
    c.spin.z = 0;
  }

  /**
   * Cherche où poser la caisse, en partant du point visé et en se rapprochant.
   *
   * Deux obstacles à éviter, et le second est le plus vicieux : le décor, bien
   * sûr, mais aussi LE JOUEUR LUI-MÊME. Sans ce test, une caisse lâchée faute
   * de place atterrissait entre ses pieds, redevenait solide, et le soulevait —
   * on se retrouvait perché dessus sans l'avoir voulu.
   *
   * Si rien n'est libre, on ne pose pas : mieux vaut un refus explicite qu'un
   * objet qui surgit dans le dos ou sous les semelles.
   */
  placeForDrop(
    c: Carryable,
    world: World,
    playerPos: Vec3,
    yaw: number,
    pitch: number,
    playerScale: number,
  ): boolean {
    // L'écart horizontal étant déjà garanti par holdPoint, il ne reste qu'à
    // éviter le décor. On se rapproche progressivement pour pouvoir caler la
    // caisse contre un mur sans l'y encastrer.
    const steps = 8;
    for (let step = 0; step <= steps; step++) {
      const closeness = 1 - (1 - DROP_CLOSENESS_FLOOR) * (step / steps);
      const p = holdPoint(c, playerPos, yaw, pitch, playerScale, closeness);
      c.position.x = p.x;
      c.position.y = p.y;
      c.position.z = p.z;

      aabbOfCarryable(c, scratch);
      if (world.queryStatic(scratch, hits).length === 0) return true;
    }
    return false;
  }

  /** Lance la caisse dans la direction du regard, avec une culbute. */
  throwIt(c: Carryable, yaw: number, pitch: number, playerScale: number): void {
    const look = lookDirection(yaw, pitch);
    const speed = THROW_SPEED * PLAYER_HEIGHT * playerScale;
    c.held = false;
    c.velocity.x = look.x * speed;
    // Un peu de hauteur : sans ça, viser droit devant fait raser le sol.
    c.velocity.y = look.y * speed + speed * 0.18;
    c.velocity.z = look.z * speed;
    // La culbute vient du lancer, pas d'un tirage au sort : elle tourne autour
    // d'un axe perpendiculaire au jet, comme un objet qu'on a poussé.
    const tumble = 6;
    c.spin.x = -look.z * tumble;
    c.spin.z = look.x * tumble;
    c.spin.y = (look.x - look.z) * tumble * 0.2;
  }

  /**
   * Vol et chute des caisses libres.
   *
   * La gravité est celle du MONDE, sans mise à l'échelle : une caisse n'a pas
   * de taille de joueur, elle tombe comme un objet du décor. Elles ne se
   * heurtent qu'aux solides fixes, pas entre elles — un empilement approximatif
   * vaut mieux qu'un tremblement perpétuel.
   */
  step(world: World, dt: number): void {
    for (const c of this.items) {
      if (c.held || c.locked) continue;

      c.velocity.y -= GRAVITY * dt;
      c.grounded = false;

      moveCarryableAxis(c, world, 'x', c.velocity.x * dt);
      moveCarryableAxis(c, world, 'z', c.velocity.z * dt);
      const vertical = c.velocity.y;
      if (moveCarryableAxis(c, world, 'y', vertical * dt)) {
        if (vertical < 0) {
          c.grounded = true;
          // Rebond bref, qui meurt vite : une caisse n'est pas une balle.
          c.velocity.y = -vertical * BOUNCE;
          if (Math.abs(c.velocity.y) < GRAVITY * dt * 3) c.velocity.y = 0;
        } else {
          c.velocity.y = 0;
        }
      }

      if (c.grounded) {
        const keep = Math.pow(GROUND_DRAG, dt);
        c.velocity.x *= keep;
        c.velocity.z *= keep;
        c.spin.x *= keep;
        c.spin.y *= keep;
        c.spin.z *= keep;
      }

      c.rotation.x += c.spin.x * dt;
      c.rotation.y += c.spin.y * dt;
      c.rotation.z += c.spin.z * dt;

      // Une fois immobile, la caisse se remet d'aplomb. Indispensable : sa
      // collision reste une boîte droite, donc la laisser reposer de travers
      // ferait mentir l'image sur l'endroit où l'on peut poser le pied.
      if (c.grounded && Math.hypot(c.spin.x, c.spin.y, c.spin.z) < 0.6) {
        const settle = 1 - Math.exp(-dt / 0.12);
        c.rotation.x += (nearestRightAngle(c.rotation.x) - c.rotation.x) * settle;
        c.rotation.y += (nearestRightAngle(c.rotation.y) - c.rotation.y) * settle;
        c.rotation.z += (nearestRightAngle(c.rotation.z) - c.rotation.z) * settle;
      }
    }
  }
}

const nearestRightAngle = (a: number): number =>
  Math.round(a / (Math.PI / 2)) * (Math.PI / 2);

/** Déplace la caisse sur un axe puis la ressort de tout décor pénétré. */
const moveCarryableAxis = (
  c: Carryable,
  world: World,
  axis: 'x' | 'y' | 'z',
  amount: number,
): boolean => {
  if (amount === 0) return false;
  c.position[axis] += amount;

  const half = c.size * 0.5;
  const posExtent = axis === 'y' ? c.size : half;
  const negExtent = axis === 'y' ? 0 : half;

  aabbOfCarryable(c, scratch);
  const touching = world.queryStatic(scratch, hits);
  if (touching.length === 0) return false;

  const minKey = axis === 'x' ? 'minX' : axis === 'y' ? 'minY' : 'minZ';
  const maxKey = axis === 'x' ? 'maxX' : axis === 'y' ? 'maxY' : 'maxZ';

  let resolved = c.position[axis];
  if (amount > 0) {
    for (const h of touching) resolved = Math.min(resolved, h[minKey] - posExtent);
  } else {
    for (const h of touching) resolved = Math.max(resolved, h[maxKey] + negExtent);
  }
  c.position[axis] = resolved;

  // Un choc latéral arrête net dans cette direction.
  if (axis !== 'y') c.velocity[axis] = 0;
  return true;
};
