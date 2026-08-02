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
   * FAMILLE DE COULEUR à laquelle cette boîte appartient.
   *
   * Les sept pots d'un séchoir, les douze tuiles d'un toit. On ne peint jamais
   * un objet : on peint une FAMILLE, et tous ses membres basculent l'un après
   * l'autre sous les yeux du joueur. Sept objets qui changeraient au même
   * instant se liraient comme un interrupteur ; sept objets peints un par un
   * par quelqu'un qui traverse la pièce disent ce qu'est une famille sans
   * qu'un mot ait été prononcé.
   *
   * Une famille reçoit ses propres matériaux au rendu, exactement comme une
   * région reçoit les siens — c'est la même idée appliquée plus finement.
   */
  famille?: string;
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
   * CETTE PORTE SE DESSINE AVANT DE S'OUVRIR.
   *
   * Quand sa `condition` est remplie — une feuille posée sur un chevalet — la
   * porte ne s'ouvre pas encore : le Pinceau vient et la trace, tache par
   * tache, et l'on ne passe qu'une fois le dessin fini.
   *
   * Le tracé existait déjà (`src/render/tracage.ts`) mais il était câblé en dur
   * sur une seule paire du monde. En le déclarant ici, un niveau peut en
   * enchaîner autant qu'il veut — et c'est ce qui rend possible une suite de
   * salles où le Pinceau ouvre lui-même le chemin.
   *
   * La fiction et la mécanique disent la même chose : il n'y a rien derrière
   * tant que personne n'a tendu la page.
   */
  dessinee?: boolean;
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
  /**
   * CE QUE CET OBJET ÉCRIT. Un stylo, et la couleur de son encre.
   *
   * Tant qu'on le tient, le clic ne LANCE plus : il TRACE. C'est le seul objet
   * du jeu qui change ce que fait un bouton, et c'est assumé — on tient un
   * stylo comme on tient une arme dans un jeu de tir, et personne n'a jamais eu
   * besoin qu'on lui explique à quoi sert la gâchette.
   */
  encre?: string;
}

/**
 * Un logement qui n'accepte qu'une caisse de LA bonne taille.
 *
 * Or la taille d'une caisse ne se règle que d'une façon : en la faisant
 * traverser un portail. Le réceptacle fait donc du changement d'échelle un
 * objectif, et non plus seulement un moyen d'atteindre une plateforme.
 */
/**
 * UN TABLEAU AU MUR — la couleur qui devient une énigme.
 *
 * Il montre la pièce telle qu'elle devrait être. On s'approche d'un objet, on
 * appuie sur la touche d'action, et toute sa famille prend la couleur qu'on
 * porte. Quand la pièce ressemble au tableau, la porte suivante peut se
 * dessiner.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA LOI QUI REND CETTE ÉNIGME POSSIBLE DANS CE JEU-CI
 *
 *     On ne peint que ce qu'on pourrait tenir.
 *
 * Même seuil que pour soulever une caisse, même refus, même sensation que le
 * « trop lourd » déjà connu. Elle fait trois choses d'un coup :
 *
 * — elle MARIE LA COULEUR À L'ÉCHELLE. Un pot est peignable à ×1, un toit à ×4,
 *   une falaise à ×16. La palette accessible est partitionnée par la taille, et
 *   un tableau qui demande trois familles est une liste de trois tailles à
 *   devenir. La couleur cesse d'être une couche posée sur le jeu ;
 *
 * — elle PROLONGE LA LOI DES VEILLEURS. Un pinceau ne s'éveille que pour un
 *   joueur de la taille de son monde ; c'est la même phrase, appliquée au geste
 *   au lieu de la rencontre. Une seule idée gouverne tout ;
 *
 * — elle SUPPRIME LA VISÉE. Désigner un objet à travers la pièce serait un
 *   curseur, donc quelque chose de pénible au doigt sur un téléphone. On
 *   s'approche et l'on appuie : le même geste que réveiller, prendre, poser.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ET L'ON REPEINT AUTANT QU'ON VEUT. C'est la seule chose du jeu qui se défait,
 * délibérément à l'inverse d'un logement : un logement est un progrès, donc il
 * verrouille ; une couleur est une décision, donc elle se reprend.
 */
export interface TableauDef {
  id: string;
  /** Centre du cadre. */
  position: [number, number, number];
  /** Orientation du mur qui le porte. */
  yaw: number;
  largeur: number;
  hauteur: number;
  /** Ce que le tableau montre : à chaque famille, le pigment attendu. */
  attendu: Record<string, string>;
  /**
   * D'où le tableau a été peint. Par défaut, depuis son propre mur.
   *
   * Le préciser sert à une chose, et elle vaut une salle entière : le point de
   * vue peut devenir l'énigme. Un tableau peint depuis l'intérieur d'un bassin,
   * à ×1/4, montre une vue qu'on ne reconnaît pas — des masses molles, une
   * paroi courbe, une lumière d'en dessous — et l'on cherche d'où quelqu'un
   * regardait, ce qui est l'occupation d'un peintre.
   */
  oeil?: [number, number, number];
  /**
   * Ce que ce point de vue regarde. Obligatoire dès qu'on précise `oeil` :
   * une position seule ne dit pas une vue, et deviner la direction produirait
   * un tableau qui montre un mur.
   */
  regarde?: [number, number, number];
}

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
  /**
   * CE LOGEMENT REND CE QU'ON LUI DONNE.
   *
   * Partout ailleurs, une caisse logée se verrouille, et c'est la bonne règle :
   * un progrès qu'on défait par accident en frôlant la touche de saisie n'est
   * pas un progrès.
   *
   * L'exception existe pour LE CHEVALET. On y pose une feuille, le Pinceau
   * dessine une porte dessus, et la taille de cette porte est celle de la
   * feuille — laquelle vaut 0,30 ou 1,20 ou 4,80 selon le nombre de portes
   * qu'on lui a fait franchir avant de la poser. Le contenu d'un chevalet n'est
   * donc jamais un progrès : c'est une DÉCISION sur la dimension où l'on veut
   * naître dans la salle d'après. Et une décision doit pouvoir se reprendre.
   *
   * Reprendre la feuille rescelle la porte, puisque `estScelle` se recalcule à
   * chaque image sur les logements pourvus. Le joueur voit donc son choix se
   * défaire, ce qui est exactement ce qu'il faut : rien à expliquer.
   */
  rend?: boolean;
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
/**
 * LE RAPPEL — un levier qui remet les objets où ils étaient.
 *
 * Le hall est un bac à sable : on y prend des choses, on les fait grossir, on
 * les pose n'importe où. Au bout de dix minutes une bille est au fond d'un
 * creux qui ne l'attendait pas, une autre a été jetée hors de portée, et il n'y
 * a plus rien à faire — un logement ordinaire verrouille pour de bon.
 *
 * Ailleurs, c'est la bonne règle : un progrès qu'on défait par accident n'est
 * pas un progrès. Mais dans un lieu où il n'y a RIEN À GAGNER, elle n'a aucun
 * sens : elle transforme un terrain de jeu en salle qu'on peut abîmer.
 *
 * D'où ce levier. On appuie, tout retourne à sa place. Il ne coûte rien parce
 * qu'il n'y a rien à perdre, et c'est précisément ce qui distingue le hall du
 * reste du jeu.
 */
/**
 * UN CANEVAS — un mur sur lequel on dessine, et la taille du trait est la vôtre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI C'EST LA MEILLEURE DÉMONSTRATION DU JEU
 *
 * Tout *Lavis* tient dans une phrase : le monde ne change pas, c'est vous qui
 * changez. On peut la dire, on peut la montrer par une falaise qui devient une
 * marche — ou on peut la mettre dans la main du joueur.
 *
 * Un géant trace des barres larges comme un bras. Un joueur de quarante-cinq
 * centimètres, sur le même mur, trace un fil. Et les deux dessins restent là,
 * côte à côte, sur la même toile. **On n'a rien expliqué, et il n'y a plus rien
 * à expliquer.**
 *
 * Et si le stylo passe un portail miroir, ce qu'on écrit sort à l'envers.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La toile est un plan, pas un objet : on vise, on appuie, ça marque. Le calcul
 * de l'impact est fait par la simulation et non par le rendu — c'est de la
 * géométrie pure, donc c'est vérifiable sans navigateur, et le trait qu'on voit
 * est exactement celui qui a été calculé.
 */
export interface CanevasDef {
  id: string;
  /** Centre de la toile. */
  position: [number, number, number];
  /** Orientation du mur. La toile regarde vers `+normale`. */
  yaw: number;
  largeur: number;
  hauteur: number;
  /**
   * Où l'on appuie pour tout effacer, et son rayon.
   *
   * Un canevas sans gomme est un canevas qu'on abîme une fois pour toutes. Ici
   * il n'y a rien à gagner : ce qui s'y trace est une expérience, pas un
   * progrès, et une expérience doit pouvoir se recommencer.
   */
  gomme?: { position: [number, number, number]; radius: number };
}

export interface RappelDef {
  position: [number, number, number];
  radius: number;
}

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
  /** Les cadres accrochés aux murs des ateliers. Voir TableauDef. */
  tableaux?: TableauDef[];
  /** Le levier qui remet le bac à sable en ordre. Voir RappelDef. */
  rappel?: RappelDef;
  /** Les murs sur lesquels on dessine. Voir CanevasDef. */
  canevas?: CanevasDef[];
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
  /** Un chevalet vient de rendre sa feuille. Voir SocketDef.rend. */
  socketVide?: { socketId: string };
  /** On a tiré le levier de rappel : tout est retourné à sa place. */
  rappele?: boolean;
  /**
   * Un trait vient d'être posé sur une toile. `u` et `v` vont de 0 à 1 sur la
   * toile, `rayon` est en fraction de sa largeur — donc proportionnel à la
   * taille de celui qui écrit, ce qui est tout l'intérêt.
   */
  trace?: { canevas: string; u: number; v: number; rayon: number; encre: string };
  /** Une toile vient d'être effacée. */
  effacee?: { canevas: string };
  /** Une famille vient de recevoir une couleur. */
  peinte?: { famille: string; pigment: string };
  /**
   * On a voulu peindre plus grand que soi. Ce refus est une leçon, pas une
   * panne : c'est le même seuil que « trop lourd », et il enseigne en une
   * seconde que la palette dépend de la taille qu'on a.
   */
  peintureRefusee?: { famille: string };
  /** Un tableau vient d'être satisfait : la pièce lui ressemble. */
  tableauSatisfait?: { id: string };
  /** Tous les logements sont pourvus. */
  allSocketsFilled?: boolean;
}
