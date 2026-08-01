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
  /** Région dont cette boîte emprunte les couleurs. Voir RegionDef. */
  region?: string;
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
  /**
   * Hauteur de la PETITE face, en mètres. La grande vaut quatre fois plus.
   *
   * C'est ce qui permet une spirale d'échelles : chaque étage a sa propre
   * paire, taillée pour le joueur qui l'atteint. Une porte de 2,8 sert un
   * joueur normal ; il faut une porte de 11,2 pour qu'un joueur déjà quatre
   * fois plus grand puisse continuer à monter. Sans ça, on ne franchit
   * jamais qu'un seul cran.
   */
  smallHeight?: number;
  smallWidth?: number;
  /** Grande face : la traverser rend PLUS PETIT. */
  big: PortalFaceDef;
  /** Petite face : la traverser rend PLUS GRAND. */
  small: PortalFaceDef;
}

/**
 * Une caisse qu'on peut soulever.
 *
 * Sa taille est celle du MONDE, pas celle du joueur : posée au sol, elle ne
 * bouge plus. C'est en la portant à travers un portail qu'elle change de
 * dimension, exactement dans la même proportion que son porteur — et c'est de
 * là que viennent les énigmes. Une caisse d'un mètre rapportée par la petite
 * porte en fait quatre, et devient la marche qui manquait.
 */
export interface CarryableDef {
  id: string;
  /** Centre du bas de la caisse. */
  position: [number, number, number];
  /** Arête du cube, en unités du monde. */
  size: number;
  ink?: number;
}

/**
 * Un logement qui n'accepte qu'une caisse de LA bonne taille.
 *
 * Or la taille d'une caisse ne se règle que d'une façon : en la faisant
 * traverser un portail. Le réceptacle fait donc du changement d'échelle un
 * objectif, et non plus seulement un moyen d'atteindre une plateforme.
 */
export interface SocketDef {
  id: string;
  /** Centre du bas du logement. */
  position: [number, number, number];
  /** Arête attendue. */
  size: number;
  /** Écart toléré, en proportion. Par défaut 12 %. */
  tolerance?: number;
  ink?: number;
}

/**
 * Une RÉGION du monde, avec ses propres couleurs.
 *
 * Franchir un portail doit donner l'impression d'entrer dans un autre univers.
 * Chaque région déclare donc son papier et ses encres — et l'on voit ces
 * couleurs-là À TRAVERS le portail avant même d'y entrer, ce qui est tout
 * l'effet recherché.
 *
 * LE PRINCIPE À TENIR : **la cohérence vient de la technique, la variété vient
 * de la palette.** Partout le même trait d'encre, les mêmes aplats francs, le
 * même grain de papier. Ce qui change, ce sont les teintes. C'est ainsi qu'un
 * livre illustré tient debout : un seul dessinateur, dix ambiances. Changer la
 * technique d'une région à l'autre ferait dix jeux collés bout à bout.
 */
export interface RegionDef {
  name: string;
  /** Boîte englobante : sert à savoir dans quelle région on se trouve. */
  min: [number, number, number];
  max: [number, number, number];
  /** Le papier : fond du ciel et couleur du brouillard. */
  paper: string;
  /** Quatre aplats, du plus clair au plus soutenu, plus l'accent. */
  colors: [string, string, string, string];
  /** Le trait. Rarement autre chose qu'un noir teinté. */
  ink?: string;
}

export interface LevelDef {
  name: string;
  spawn: [number, number, number];
  spawnYaw: number;
  boxes: BoxDef[];
  /** Régions colorées. La première contenant le joueur donne l'ambiance. */
  regions?: RegionDef[];
  carryables?: CarryableDef[];
  sockets?: SocketDef[];
  portals: PortalPairDef[];
  goal: { position: [number, number, number]; radius: number };
  /** Indices contextuels déclenchés par proximité. */
  hints?: { position: [number, number, number]; radius: number; text: string }[];
  /**
   * Jalons du Pinceau, dans l'ordre du voyage.
   *
   * Ce n'est pas un chemin à suivre : le guide ne s'en sert que pour savoir
   * dans quelle direction filer quand le joueur tourne en rond. Toute région
   * ajoutée au monde doit déclarer les siens — c'est ce qui permet au guide de
   * fonctionner partout sans rien savoir du contenu.
   */
  guide?: [number, number, number][];
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
  /** Maintenue, pas impulsion : la simulation détecte elle-même le front. */
  interact: boolean;
  /** Clic gauche : lancer ce qu'on porte. */
  throwIt: boolean;
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
  /** Une caisse vient d'être saisie ou reposée. */
  carry?: { id: string; taken: boolean };
  /** On a tenté de soulever une caisse trop grosse pour soi. */
  tooHeavy?: { id: string };
  /** Rien ne peut être posé ici : pas assez de place devant soi. */
  noRoom?: boolean;
  /** Une caisse vient d'être lancée. */
  thrown?: { id: string };
  /** Une caisse vient de s'emboîter dans son logement. */
  socketFilled?: { socketId: string; carryableId: string };
  /** Tous les logements sont pourvus. */
  allSocketsFilled?: boolean;
}
