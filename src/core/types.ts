import type { Vec3 } from './math.js';

/** Boîte alignée sur les axes — tout le décor du monde est fait de ça. */
export interface BoxDef {
  /** Coin min (x, y, z). */
  min: [number, number, number];
  /** Coin max (x, y, z). */
  max: [number, number, number];
  /** Teinte d'aplat, index dans la palette d'encre. */
  ink?: number;
  /** Purement décoratif : pas de collision. */
  ghost?: boolean;
  /**
   * Mettre à `false` pour ne pas encrer les arêtes de cette boîte.
   *
   * Indispensable pour le sol : il est découpé en plusieurs dalles pour ménager
   * les trous, et chaque couture se retrouverait tracée à l'encre en plein
   * milieu du terrain, comme un trait de crayon oublié.
   */
  outline?: boolean;
}

/**
 * Une face de portail. Position = CENTRE DU BAS de la face (au niveau du sol),
 * ce qui fait que la face garde le même point d'ancrage quand elle se
 * redimensionne avec le joueur, et que les pieds se mappent sur les pieds.
 *
 * Les portails sont des plans verticaux : seul le lacet (rotation autour de Y)
 * est réglable. Suffisant pour du level design, et ça garde les maths triviales.
 */
export interface PortalFaceDef {
  position: [number, number, number];
  /** Lacet en radians. La normale de la face est yawToForward(yaw). */
  yaw: number;
}

export interface PortalPairDef {
  id: string;
  /** Couleur d'encre de la grande face (vermillon par défaut). */
  colorBig: number;
  /** Couleur d'encre de la petite face (indigo par défaut). */
  colorSmall: number;
  /** Grande face : la traverser rend PLUS PETIT. */
  big: PortalFaceDef;
  /** Petite face : la traverser rend PLUS GRAND. */
  small: PortalFaceDef;
}

export interface LevelDef {
  name: string;
  spawn: [number, number, number];
  spawnYaw: number;
  boxes: BoxDef[];
  portals: PortalPairDef[];
  goal: { position: [number, number, number]; radius: number };
  /** Indices contextuels déclenchés par proximité. */
  hints?: { position: [number, number, number]; radius: number; text: string }[];
}

/** État complet du joueur — c'est ce qui transiterait sur le réseau. */
export interface PlayerState {
  /** Position des PIEDS (centre du bas de la boîte de collision). */
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  /** Palier d'échelle entier. 0 = taille normale. */
  scaleLevel: number;
  grounded: boolean;
}

/** Entrée d'un tick. Ce sont des COMMANDES, pas des mutations directes. */
export interface InputCommand {
  /** -1..1, avant/arrière. */
  forward: number;
  /** -1..1, droite/gauche. */
  strafe: number;
  jump: boolean;
  sprint: boolean;
  yaw: number;
  pitch: number;
}

/** Événements émis par un tick, pour que le rendu et l'UI puissent réagir. */
export interface TickEvents {
  /** Le joueur a traversé un portail ce tick. */
  traversed?: { pairId: string; from: 'big' | 'small'; newLevel: number };
  /** Le portail a refusé le passage. */
  refused?: {
    pairId: string;
    face: 'big' | 'small';
    /** `tooBig` : le joueur ne rentre pas. `scaleLimit` : garde-fou d'échelle. */
    reason: 'tooBig' | 'scaleLimit';
  };
  /** L'objectif vient d'être atteint. */
  reachedGoal?: boolean;
}
