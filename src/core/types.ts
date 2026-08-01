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
  /**
   * Identifiant d'un logement qui tient cette porte scellée.
   *
   * C'est la seule addition qu'il ait fallu au moteur pour rendre possibles des
   * énigmes qu'une personne seule ne peut pas résoudre : l'un pose la caisse,
   * la porte de l'autre s'ouvre. Aucune géométrie mobile, aucune physique
   * nouvelle — donc aucun des ennuis habituels du jeu à plusieurs.
   */
  condition?: string;
  /**
   * Cette paire échange la gauche et la droite.
   *
   * Ce qui la traverse en ressort en image miroir — et une forme asymétrique ne
   * peut revenir à sa forme d'origine qu'en la retraversant, jamais en la
   * tournant. C'est la chiralité, et c'est une idée qu'un jeu transmet mieux
   * qu'un cours.
   */
  miroir?: boolean;
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
  /**
   * Main de l'objet, s'il est chiral.
   *
   * Une forme chirale ne peut pas être superposée à son reflet — comme une main
   * gauche et une main droite. Aucune rotation ne transforme l'une en l'autre :
   * il faut un miroir. C'est vrai en géométrie, et c'est vrai dans le vivant,
   * dont les protéines n'emploient qu'une seule des deux formes possibles.
   */
  main?: 'L' | 'D';
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
  /** Main exigée. Le logement refuse l'autre, comme une serrure biologique. */
  main?: 'L' | 'D';
  /** Centre du bas du logement. */
  position: [number, number, number];
  /** Arête attendue. */
  size: number;
  /** Écart toléré sur la TAILLE, en proportion. Par défaut 12 %. */
  tolerance?: number;
  /**
   * Rayon d'accueil, en mètres. Par défaut trois quarts de l'arête attendue.
   *
   * Il existe parce qu'un joueur repose ce qu'il porte à DEUX FOIS SA TAILLE
   * devant lui : à ×4, cela fait huit mètres. Viser un socle de deux mètres à
   * huit mètres de distance est un exercice d'adresse, et ce jeu n'en est pas
   * un — encore moins au doigt sur un téléphone. Un socle qui doit être garni
   * par quelqu'un de grand se donne donc un rayon large.
   */
  portee?: number;
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
  /**
   * Pigment qui manque à cette région.
   *
   * Tant qu'on ne l'a pas rapporté, la région est en lavis gris : les valeurs
   * y sont, la couleur non. Une région sans `pigment` est peinte d'emblée —
   * ce sont les mondes où l'on VA chercher les couleurs, et ils les ont
   * forcément, sinon il n'y aurait rien à y prendre.
   */
  pigment?: string;
  /**
   * PIGMENT DE L'ACCENT, s'il n'est pas celui du reste.
   *
   * Une région entière valait une couleur, et ça ne pouvait pas marcher. Le
   * rouge ne repeignait que les hauteurs : on revenait de son monde, on rendait
   * sa couleur, on regardait autour de soi — et rien ne changeait, parce que
   * tout se passait cent mètres plus haut et derrière. Le plus beau moment du
   * jeu se jouait hors champ.
   *
   * Le quatrième aplat de chaque palette est son ACCENT : les auvents du
   * marché, les rambardes, les lanternes, la garde d'un torii. Il court dans
   * TOUT le monde, y compris sous les pieds du joueur. En le confiant au rouge,
   * on obtient l'effet là où l'on se tient — sans déplacer un seul mur.
   *
   * Et ça se raconte tout seul : le vert rend au monde sa MATIÈRE, le rouge lui
   * rend ses ÉCLATS. Deux pinceaux, deux rôles, et l'on voit d'un coup d'œil
   * lequel manque encore.
   */
  pigmentAccent?: string;
  /**
   * Portée du brouillard dans cette région, en unités de monde.
   *
   * Elle existe pour une raison précise : les mondes de couleur sont des poches
   * posées à côté du monde central, et un talus ne peut cacher que ce qui est
   * au sol. Le belvédère est à cent vingt mètres d'altitude et à deux cent
   * soixante-cinq du jardin — aucune butte n'y peut rien, et l'on voyait donc
   * flotter un morceau du monde principal au-dessus d'une forêt d'herbe.
   *
   * Rapprocher le brouillard le fait disparaître sans rien coûter à la poche
   * elle-même, à condition de rester au-delà de sa propre profondeur. C'est un
   * réglage par lieu, pas un réglage global : le monde central garde le sien,
   * et il en a besoin pour montrer ses trois étages d'un coup.
   */
  brouillard?: number;
}

/**
 * Un seuil : une porte du hall qui mène ailleurs.
 *
 * Le choix du mode de jeu est SPATIAL, pas administratif. Pas de menu, pas de
 * bouton « chercher une partie » — trois arches côte à côte, on prend celle
 * qu'on veut. C'est cohérent avec un jeu qui n'explique jamais rien par du
 * texte, et c'est la raison pour laquelle ceci vit dans le niveau et non dans
 * une interface.
 */
export interface SeuilDef {
  position: [number, number, number];
  radius: number;
  mode: 'solo' | 'duo' | 'reve';
  /** Ce qui est gravé sur le linteau. */
  label: string;
}

/**
 * UN PINCEAU QUI DORT, et qu'on réveille en appuyant sur E.
 *
 * Ce n'est pas un objet qu'on ramasse. Il y avait avant une caisse invisible
 * par-dessus laquelle on dessinait un pinceau : on « prenait » quelque chose
 * qu'on tenait dans les mains, alors qu'on devrait réveiller quelqu'un. Le
 * geste comptait autant que la chose, et il était faux.
 *
 * L'ÉCHELLE EXIGÉE est ce qui relie le verbe du jeu à son but. Une couleur ne
 * vit pas au bout d'un monde : elle vit à une TAILLE. Trop grand, on ne peut
 * pas le saisir — il est minuscule entre des doigts de sept mètres. Trop petit,
 * on ne peut pas le soulever. Il reste planté, il frémit, et l'on comprend
 * qu'il faut devenir ce que le lieu demande.
 */
export interface VeilleurDef {
  id: string;
  position: [number, number, number];
  /** Distance à laquelle on peut le réveiller. */
  radius: number;
  /** Palier d'échelle exigé du joueur. 0 = taille normale. */
  echelle: number;
}

export interface LevelDef {
  name: string;
  spawn: [number, number, number];
  spawnYaw: number;
  /**
   * Palier d'échelle au départ. 0 par défaut, c'est-à-dire taille normale.
   *
   * N'existe que pour l'aventure à deux, où l'un commence géant et l'autre
   * minuscule : c'est la première image du niveau, et elle ne s'obtient pas
   * autrement.
   */
  spawnScale?: number;
  boxes: BoxDef[];
  /** Régions colorées. La première contenant le joueur donne l'ambiance. */
  regions?: RegionDef[];
  carryables?: CarryableDef[];
  sockets?: SocketDef[];
  portals: PortalPairDef[];
  goal: { position: [number, number, number]; radius: number };
  /** Les sorties du hall. Absent partout ailleurs. */
  seuils?: SeuilDef[];
  /** Les pinceaux endormis qu'on réveille. Voir VeilleurDef. */
  veilleurs?: VeilleurDef[];
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
  /**
   * Taille du Pinceau à chaque jalon, dans le même ordre. 1 par défaut.
   *
   * ELLE EST DÉCLARÉE, PAS DEVINÉE, et c'est le fond de l'affaire. Le Pinceau
   * est un habitant du monde : sa taille est celle de l'ÉTAGE où il se tient,
   * jamais celle du joueur qui le regarde. Un jalon posé sur le belvédère est
   * seize fois plus gros qu'un jalon posé au village — et vu du belvédère, le
   * village reste minuscule, comme il doit l'être.
   *
   * On a d'abord fait suivre la taille du joueur, puis sa taille seulement
   * quand il était proche. Les deux étaient faux, et pour la même raison : ils
   * faisaient dépendre un objet du monde de qui le regarde.
   */
  guideEchelle?: number[];
  /**
   * Porte par laquelle le Pinceau doit PASSER pour rejoindre chaque jalon.
   * `null` ou absent : il y va en droite ligne.
   *
   * Il traversait le monde en ligne droite, quel que soit le jalon. Pour la
   * plupart c'est juste — il survole ce que le joueur devra contourner, et
   * c'est de cet écart que naît l'énigme. Mais pour un jalon qui se trouve
   * DERRIÈRE UN PORTAIL, la ligne droite lui faisait traverser cinq cents
   * mètres de vide jusqu'à une poche de monde inaccessible autrement. On ne
   * lisait pas « suis-moi », on lisait « il s'est téléporté », et le joueur
   * restait planté là sans savoir par où passer.
   *
   * Nommer la porte le fait entrer dedans sous vos yeux, disparaître, et
   * ressortir de l'autre côté. C'est une invitation, pas une disparition.
   */
  guidePorte?: (string | null)[];
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
    /**
     * `tooBig` : le joueur ne rentre pas. `scaleLimit` : garde-fou d'échelle.
     * `scelle` : le logement qui l'ouvre est encore vide.
     */
    reason: 'tooBig' | 'scaleLimit' | 'scelle';
  };
  /** L'objectif vient d'être atteint. */
  reachedGoal?: boolean;
  /** On vient de franchir un seuil du hall. */
  seuil?: { mode: 'solo' | 'duo' | 'reve'; label: string };
  /** Un pinceau endormi vient d'être réveillé. */
  eveil?: { id: string };
  /**
   * On a essayé d'en réveiller un, à la mauvaise taille.
   * `trop` dit dans quel sens, pour pouvoir le dire au joueur.
   */
  eveilRefuse?: { id: string; trop: 'grand' | 'petit' };
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
