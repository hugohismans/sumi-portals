import {
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
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
  /**
   * Identifiant du logement qui descelle cette paire. Tant qu'il est vide, on
   * ne passe pas. Absent : la porte est toujours ouverte.
   */
  condition?: string;
  /** Elle doit être dessinée avant de s'ouvrir. Voir PortalPairDef.dessinee. */
  dessinee?: boolean;
  /** Cette paire échange la gauche et la droite. Voir `mainDe`. */
  miroir?: boolean;
}

const makeFace = (
  pairId: string,
  kind: FaceKind,
  def: PortalFaceDef,
  smallW: number,
  smallH: number,
): Omit<PortalFace, 'twin'> => ({
  pairId,
  kind,
  position: vec3(def.position[0], def.position[1], def.position[2]),
  yaw: def.yaw,
  normal: yawToForward(def.yaw),
  width: kind === 'big' ? smallW * SCALE_RATIO : smallW,
  height: kind === 'big' ? smallH * SCALE_RATIO : smallH,
});

/**
 * Une paire scellée est fermée DES DEUX CÔTÉS.
 *
 * C'est ce qui la rend utilisable en coopération sans piéger personne : si
 * seule l'entrée était scellée, on pourrait passer, voir le logement se vider
 * derrière soi, et rester enfermé de l'autre côté.
 */
export const estScelle = (face: PortalFace, logementsPourvus: ReadonlySet<string>): boolean =>
  face.condition !== undefined && !logementsPourvus.has(face.condition);

export const buildFaces = (pairs: PortalPairDef[]): PortalFace[] => {
  const faces: PortalFace[] = [];
  for (const pair of pairs) {
    // Taille propre à la paire, sinon celle d'origine. C'est ce qui autorise
    // une spirale : une porte par étage, taillée pour qui l'atteint.
    const w = pair.smallWidth ?? PORTAL_SMALL_W;
    const h = pair.smallHeight ?? PORTAL_SMALL_H;
    const big = makeFace(pair.id, 'big', pair.big, w, h) as PortalFace;
    const small = makeFace(pair.id, 'small', pair.small, w, h) as PortalFace;
    big.twin = small;
    small.twin = big;
    big.condition = pair.condition;
    small.condition = pair.condition;
    big.dessinee = pair.dessinee;
    small.dessinee = pair.dessinee;
    big.miroir = pair.miroir;
    small.miroir = pair.miroir;
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
  const flipped = vec3(mainDe(face) * local.x * s, local.y * s, -local.z * s);
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
  const flipped = vec3(mainDe(face) * local.x * s, local.y * s, -local.z * s);
  return rotateY(flipped, face.twin.yaw);
};

/**
 * LA CHIRALITÉ, en un seul signe.
 *
 * Une porte ordinaire retourne le repère de 180° autour de la verticale : la
 * composante latérale change de signe en même temps que la profondeur. Une
 * porte MIROIR ne retourne que la profondeur, et laisse la latérale telle
 * quelle — ce qui échange la gauche et la droite.
 *
 * Mathématiquement, la différence est celle d'un déterminant : +1 pour la
 * rotation, −1 pour la réflexion. Une transformation de déterminant négatif ne
 * peut PAS être obtenue en tournant l'objet, quelque nombre de fois qu'on
 * l'essaie. C'est exactement ce qu'on veut faire éprouver au joueur avec la
 * molécule : sa main gauche ne deviendra jamais une main droite, il faut la
 * faire passer par le miroir.
 *
 * Conséquence à ne pas oublier côté rendu : un déterminant négatif inverse
 * aussi le sens de parcours des triangles.
 */
export const mainDe = (face: PortalFace): 1 | -1 => (face.miroir ? 1 : -1);

/**
 * Rotation de lacet subie en traversant `face`.
 *
 * Ne vaut que pour une porte ordinaire. Une réflexion n'est pas une rotation :
 * il n'existe aucun angle qui la décrive, et c'est pourquoi la simulation
 * déduit le nouveau cap du vecteur transformé plutôt que de l'additionner.
 */
export const yawDelta = (face: PortalFace): number =>
  wrapAngle(face.twin.yaw + Math.PI - face.yaw);
