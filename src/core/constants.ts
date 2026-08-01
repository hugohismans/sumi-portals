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
export const SCALE_MIN_LEVEL = -2;
/**
 * Butée haute. Elle n'est en pratique jamais atteinte : la taille fixe des
 * portails (voir plus bas) empêche déjà de dépasser ×4. C'est un garde-fou.
 */
export const SCALE_MAX_LEVEL = 1;

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
export const PORTAL_SMALL_H = 2.8;
export const PORTAL_SMALL_W = 1.9;
export const PORTAL_BIG_H = PORTAL_SMALL_H * SCALE_RATIO;
export const PORTAL_BIG_W = PORTAL_SMALL_W * SCALE_RATIO;
