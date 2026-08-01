import { PLAYER_HEIGHT, PLAYER_RADIUS, STEP_FRACTION } from './constants.js';
import type { Vec3 } from './math.js';
import type { Aabb, World } from './world.js';

/** Boîte de collision du joueur. `p` est la position des PIEDS. */
export const playerAabb = (p: Vec3, scale: number, out: Aabb): Aabb => {
  const half = PLAYER_RADIUS * scale;
  const height = PLAYER_HEIGHT * scale;
  out.minX = p.x - half;
  out.maxX = p.x + half;
  out.minY = p.y;
  out.maxY = p.y + height;
  out.minZ = p.z - half;
  out.maxZ = p.z + half;
  return out;
};

const scratchBox: Aabb = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
const scratchHits: Aabb[] = [];

/** Le joueur tient-il à cette position sans chevaucher un solide ? */
export const isClear = (world: World, p: Vec3, scale: number): boolean => {
  playerAabb(p, scale, scratchBox);
  return world.query(scratchBox, scratchHits).length === 0;
};

type Axis = 'x' | 'y' | 'z';

/**
 * Déplace le joueur sur un seul axe puis le ressort de tout solide pénétré.
 * Résoudre axe par axe est moins exact qu'un balayage continu, mais c'est
 * stable, déterministe, et parfaitement adapté à un monde fait de boîtes.
 */
const moveAxis = (
  world: World,
  p: Vec3,
  scale: number,
  axis: Axis,
  amount: number,
): boolean => {
  if (amount === 0) return false;
  p[axis] += amount;

  const half = PLAYER_RADIUS * scale;
  const height = PLAYER_HEIGHT * scale;
  // Débord de la boîte de part et d'autre de la position, sur cet axe.
  const posExtent = axis === 'y' ? height : half;
  const negExtent = axis === 'y' ? 0 : half;

  playerAabb(p, scale, scratchBox);
  const hits = world.query(scratchBox, scratchHits);
  if (hits.length === 0) return false;

  const minKey = axis === 'x' ? 'minX' : axis === 'y' ? 'minY' : 'minZ';
  const maxKey = axis === 'x' ? 'maxX' : axis === 'y' ? 'maxY' : 'maxZ';

  // On prend la résolution la plus extrême : gère plusieurs boîtes en une passe.
  let resolved = p[axis];
  if (amount > 0) {
    for (const h of hits) resolved = Math.min(resolved, h[minKey] - posExtent);
  } else {
    for (const h of hits) resolved = Math.max(resolved, h[maxKey] + negExtent);
  }
  p[axis] = resolved;
  return true;
};

export interface MoveResult {
  grounded: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
}

/**
 * Applique un déplacement complet avec gestion des marches.
 *
 * La hauteur de marche franchissable est proportionnelle à la taille du
 * joueur : un géant enjambe un immeuble, un nain bute sur un pavé. C'est le
 * cœur du level design — chaque obstacle devient un verrou d'échelle.
 */
export const moveAndCollide = (
  world: World,
  p: Vec3,
  velocity: Vec3,
  scale: number,
  dt: number,
  wasGrounded: boolean,
): MoveResult => {
  const result: MoveResult = { grounded: false, hitCeiling: false, hitWall: false };

  // --- Vertical ---
  const dy = velocity.y * dt;
  if (moveAxis(world, p, scale, 'y', dy)) {
    if (dy < 0) result.grounded = true;
    else result.hitCeiling = true;
    velocity.y = 0;
  }

  // --- Horizontal, avec tentative de marche ---
  const stepHeight = PLAYER_HEIGHT * STEP_FRACTION * scale;
  const dx = velocity.x * dt;
  const dz = velocity.z * dt;

  const beforeX = p.x;
  const beforeY = p.y;
  const beforeZ = p.z;

  const blockedX = moveAxis(world, p, scale, 'x', dx);
  const blockedZ = moveAxis(world, p, scale, 'z', dz);

  if ((blockedX || blockedZ) && (wasGrounded || result.grounded)) {
    // On rejoue le déplacement une marche plus haut. Si ça passe, c'était une
    // marche ; sinon on garde le résultat bloqué d'origine.
    const liftedX = beforeX;
    const liftedY = beforeY + stepHeight;
    const liftedZ = beforeZ;
    const probe = { x: liftedX, y: liftedY, z: liftedZ };

    if (isClear(world, probe, scale)) {
      const stepBlockedX = moveAxis(world, probe, scale, 'x', dx);
      const stepBlockedZ = moveAxis(world, probe, scale, 'z', dz);
      const improved =
        (blockedX && !stepBlockedX) || (blockedZ && !stepBlockedZ);

      if (improved) {
        // On repose le joueur sur la marche.
        moveAxis(world, probe, scale, 'y', -stepHeight);
        p.x = probe.x;
        p.y = probe.y;
        p.z = probe.z;
        result.grounded = true;
        result.hitWall = false;
        return result;
      }
    }
  }

  if (blockedX) velocity.x = 0;
  if (blockedZ) velocity.z = 0;
  result.hitWall = blockedX || blockedZ;

  // --- Accroche au sol -------------------------------------------------------
  // Sans ça, descendre une marche fait décoller le joueur d'une frame et la
  // caméra sautille. On sonde vers le bas d'une demi-marche.
  if (!result.grounded && wasGrounded && velocity.y <= 0) {
    const snap = { x: p.x, y: p.y, z: p.z };
    if (moveAxis(world, snap, scale, 'y', -stepHeight * 0.5)) {
      p.y = snap.y;
      result.grounded = true;
      velocity.y = 0;
    }
  }

  return result;
};
