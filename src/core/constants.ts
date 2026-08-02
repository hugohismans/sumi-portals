/** Réglages de la simulation. Une seule source de vérité, partagée sim + rendu. */

/** Pas de simulation fixe (60 Hz) — indispensable pour un futur netcode. */
export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE;

// --- Joueur, à l'échelle 1 ---------------------------------------------------
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.34;
/** Hauteur des yeux, en fraction de la taille du joueur. */
export const EYE_FRACTION = 0.92;
/** Marche d'escalier franchissable, en fraction de la taille du joueur. */
export const STEP_FRACTION = 0.5;

// --- Physique, à l'échelle 1 -------------------------------------------------
// Tout ceci est multiplié par l'échelle courante du joueur : un joueur 4x plus
// petit tombe 4x moins vite en m/s, donc *exactement* pareil en tailles-de-corps
// par seconde. C'est ce qui fait que le déplacement se ressent identique à
// toutes les échelles — seul le monde a l'air de changer de taille.
export const GRAVITY = 26;
export const MOVE_SPEED = 7.6;
/** Sprint (Maj). Multiplie la vitesse, jamais le saut ni la gravité — sinon
 *  les hauteurs franchissables changeraient et l'énigme partirait en morceaux. */
export const SPRINT_MULTIPLIER = 1.8;
export const JUMP_SPEED = 8.2;
export const AIR_CONTROL = 0.35;
export const GROUND_FRICTION = 13;

// --- Échelles ----------------------------------------------------------------
/** Rapport de taille entre les deux portails d'une paire. */
export const SCALE_RATIO = 4;
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ON DESCEND AUSSI LOIN QU'ON VEUT, ET C'EST LE MONDE QUI DIT NON.
 *
 * La butée basse valait −2, et elle se faisait sentir : devant une grande porte
 * manifestement ouverte, on lisait un refus qui ne parlait que du moteur. Or
 * dans ce jeu, **une porte doit refuser pour une raison qu'on voit**.
 *
 * La bonne borne existait déjà et elle est physique : on ne franchit pas une
 * porte où l'on n'entre pas. C'est elle qui interdit de GRANDIR sans fin —
 * grandir se fait par la petite face, et l'on finit par ne plus y tenir. Rien
 * n'interdisait de RAPETISSER, puisqu'une grande face accueille tout le monde.
 *
 * On descend donc de cinq crans au lieu de deux, jusqu'à un millimètre et demi.
 * Et ce n'est pas une permission sans conséquence : plus on descend, moins le
 * monde est praticable. À ×1/256 un pavé est une plaine, à ×1/1024 le grain du
 * sol tremble sous les pieds parce que les nombres de la carte graphique n'ont
 * plus assez de décimales pour un corps de deux millimètres.
 *
 * C'est exactement ce qu'on veut : la limite n'est plus une règle énoncée, elle
 * est une SENSATION. On peut toujours entrer dans la porte suivante ; c'est le
 * monde d'après qui ne vaut plus la peine.
 *
 * Cinq et pas six : au sixième cran le corps devient plus petit que la
 * précision des coordonnées, et l'on traverserait le sol. Le vertige, oui ; la
 * panne, non.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const SCALE_MIN_LEVEL = -5;
/**
 * Butée haute. Ce n'est qu'un garde-fou, et il ne devrait jamais servir : c'est
 * la taille des portails qui borne réellement la montée, paire par paire, et
 * elle le fait d'une manière que le joueur VOIT — il ne rentre pas.
 */
export const SCALE_MAX_LEVEL = 3;

export const scaleOfLevel = (level: number): number => Math.pow(SCALE_RATIO, level);

// --- Portails ----------------------------------------------------------------
// Tailles FIXES dans le monde, en mètres. Ce sont des monuments posés au sol,
// pas des objets qui suivent le joueur.
//
// Une première version les faisait grandir avec le joueur, pour garantir qu'on
// puisse toujours les franchir. Mauvaise idée : à ×16 le portail dépassait du
// décor et ne voulait plus rien dire. Avec des tailles fixes, la règle devient
// physique et se lit d'un coup d'œil — à ×4 on ne rentre tout simplement plus
// dans la petite porte, et c'est ça qui borne la montée en taille.
// Taille PAR DÉFAUT de la petite face. Chaque paire peut fixer la sienne :
// c'est ce qui permet d'enchaîner les étages (voir PortalPairDef.smallHeight).
export const PORTAL_SMALL_H = 2.8;
export const PORTAL_SMALL_W = 1.9;
export const PORTAL_BIG_H = PORTAL_SMALL_H * SCALE_RATIO;
export const PORTAL_BIG_W = PORTAL_SMALL_W * SCALE_RATIO;
