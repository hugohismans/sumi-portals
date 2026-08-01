import {
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PORTAL_BIG_H,
  PORTAL_BIG_W,
  PORTAL_SMALL_H,
  PORTAL_SMALL_W,
  SCALE_RATIO,
} from './constants.js';
import { rotateY, sub, vec3, wrapAngle, yawToForward, type Vec3 } from './math.js';
import type { PortalFaceDef, PortalPairDef } from './types.js';

export type FaceKind = 'big' | 'small';

export interface PortalFace {
  pairId: string;
  kind: FaceKind;
  /** Centre du bas de la face, dans le monde. */
  position: Vec3;
  yaw: number;
  /** Normale (côté « avant » de la face). */
  normal: Vec3;
  /** Largeur dans le monde, en mètres. Constante. */
  width: number;
  /** Hauteur dans le monde, en mètres. Constante. */
  height: number;
  /** L'autre face de la paire. */
  twin: PortalFace;
}

const makeFace = (
  pairId: string,
  kind: FaceKind,
  def: PortalFaceDef,
): Omit<PortalFace, 'twin'> => ({
  pairId,
  kind,
  position: vec3(def.position[0], def.position[1], def.position[2]),
  yaw: def.yaw,
  normal: yawToForward(def.yaw),
  width: kind === 'big' ? PORTAL_BIG_W : PORTAL_SMALL_W,
  height: kind === 'big' ? PORTAL_BIG_H : PORTAL_SMALL_H,
});

export const buildFaces = (pairs: PortalPairDef[]): PortalFace[] => {
  const faces: PortalFace[] = [];
  for (const pair of pairs) {
    const big = makeFace(pair.id, 'big', pair.big) as PortalFace;
    const small = makeFace(pair.id, 'small', pair.small) as PortalFace;
    big.twin = small;
    small.twin = big;
    faces.push(big, small);
  }
  return faces;
};

/**
 * Facteur d'échelle appliqué en traversant `face`.
 *
 *   grande face → on ressort par la petite → on rétrécit → 1/4
 *   petite face → on ressort par la grande → on grandit  → 4
 *
 * C'est exactement le rapport des largeurs des deux faces, ce qui garantit que
 * ce qu'on VOIT à travers le portail et ce qui nous ARRIVE en le traversant
 * sont gouvernés par la même constante. Une seule source de vérité.
 */
export const traversalScale = (face: PortalFace): number =>
  face.kind === 'big' ? 1 / SCALE_RATIO : SCALE_RATIO;

/** Variation de palier d'échelle : -1 par la grande face, +1 par la petite. */
export const traversalLevelDelta = (face: PortalFace): number =>
  face.kind === 'big' ? -1 : +1;

/**
 * Taille de la face dans le monde. Elle ne dépend PAS du joueur : un portail
 * est un monument posé au sol, il garde le même rapport au décor qui l'entoure.
 * C'est le joueur qui rapetisse ou grandit par rapport à lui.
 */
export const faceWorldSize = (face: PortalFace): { width: number; height: number } => ({
  width: face.width,
  height: face.height,
});

/**
 * Le joueur tient-il dans cette face ?
 *
 * C'est cette règle, et elle seule, qui borne la montée en taille : à ×4 on ne
 * rentre plus dans la petite porte, donc on ne peut plus grandir. Aucun palier
 * arbitraire à expliquer — ça se voit.
 */
export const canPass = (face: PortalFace, playerScale: number): boolean =>
  PLAYER_HEIGHT * playerScale <= face.height * 0.96 &&
  PLAYER_RADIUS * 2 * playerScale <= face.width * 0.9;

/** Distance signée d'un point au plan de la face (positive = devant). */
export const signedDistance = (face: PortalFace, p: Vec3): number => {
  const d = sub(p, face.position);
  return d.x * face.normal.x + d.y * face.normal.y + d.z * face.normal.z;
};

/**
 * Le point d'intersection tombe-t-il dans le rectangle de la face ?
 * `t` est le paramètre d'interpolation entre `from` et `to` au moment du
 * franchissement du plan.
 */
export const withinFaceRect = (face: PortalFace, from: Vec3, to: Vec3, t: number): boolean => {
  const hit = vec3(
    from.x + (to.x - from.x) * t,
    from.y + (to.y - from.y) * t,
    from.z + (to.z - from.z) * t,
  );
  const local = rotateY(sub(hit, face.position), -face.yaw);
  // Un chouïa de marge : mieux vaut téléporter que laisser passer au travers.
  return (
    Math.abs(local.x) <= face.width * 0.5 + 0.02 &&
    local.y >= -0.05 &&
    local.y <= face.height
  );
};

/**
 * Transporte un POINT à travers `face` vers sa jumelle.
 *
 * On exprime le point dans le repère de la face, on le retourne de 180° autour
 * de Y, on multiplie son écart par le rapport d'échelle, puis on le replace
 * dans le repère de la face jumelle.
 */
export const transformPoint = (face: PortalFace, p: Vec3): Vec3 => {
  const s = traversalScale(face);
  const local = rotateY(sub(p, face.position), -face.yaw);
  const flipped = vec3(-local.x * s, local.y * s, -local.z * s);
  const world = rotateY(flipped, face.twin.yaw);
  return vec3(
    face.twin.position.x + world.x,
    face.twin.position.y + world.y,
    face.twin.position.z + world.z,
  );
};

/**
 * Transporte un VECTEUR (vitesse, direction) à travers `face`.
 * Même rotation que pour un point, mais sans translation. L'échelle s'applique
 * parce que la vitesse est proportionnelle à la taille du joueur.
 */
export const transformVector = (face: PortalFace, v: Vec3, applyScale: boolean): Vec3 => {
  const s = applyScale ? traversalScale(face) : 1;
  const local = rotateY(v, -face.yaw);
  const flipped = vec3(-local.x * s, local.y * s, -local.z * s);
  return rotateY(flipped, face.twin.yaw);
};

/** Rotation de lacet subie en traversant `face`. */
export const yawDelta = (face: PortalFace): number =>
  wrapAngle(face.twin.yaw + Math.PI - face.yaw);
