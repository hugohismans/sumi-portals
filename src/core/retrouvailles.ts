import type { Vec3 } from './math.js';

/**
 * LA CONDITION DE VICTOIRE DE L'AVENTURE À DEUX.
 *
 * Elle tient en une phrase : **être de la même taille, et chacun sur sa
 * dalle.** Ni l'un ni l'autre séparément ne compte, et c'est tout l'intérêt —
 * c'est la seule fin de partie du jeu qu'une personne seule ne peut pas
 * déclencher, quoi qu'elle fasse.
 *
 * Ce fichier ne connaît ni le réseau ni le rendu : il reçoit deux positions et
 * répond oui ou non. C'est ce qui permet de le vérifier sous Node, alors que
 * la situation qu'il décrit demande deux machines pour se produire vraiment.
 */

export interface Presence2 {
  position: Vec3;
  scaleLevel: number;
}

/** Une dalle : un disque posé à une hauteur donnée. */
export interface Dalle {
  centre: [number, number, number];
  rayon: number;
}

/**
 * Debout sur cette dalle ?
 *
 * On tolère 1,2 en hauteur parce qu'un joueur à ×1 mesure 1,80 et que sa
 * position est celle de ses PIEDS : quelques centimètres de flottement au
 * ressort d'un saut ne doivent pas annuler une retrouvaille réussie.
 */
export const surLaDalle = (p: Presence2, d: Dalle): boolean => {
  const dx = p.position.x - d.centre[0];
  const dz = p.position.z - d.centre[2];
  const dy = p.position.y - d.centre[1];
  return dx * dx + dz * dz <= d.rayon * d.rayon && dy >= -0.6 && dy <= 1.2;
};

/**
 * Les deux joueurs se sont-ils retrouvés ?
 *
 * Chacun sur UNE dalle, pas la même, et **à la même échelle**. On ne vérifie
 * pas qui est sur laquelle : arriver ensemble suffit, et exiger en plus la
 * bonne place transformerait un moment en formalité.
 */
export const retrouvailles = (a: Presence2, b: Presence2, dalles: [Dalle, Dalle]): boolean => {
  if (a.scaleLevel !== b.scaleLevel) return false;
  const [g, m] = dalles;
  return (surLaDalle(a, g) && surLaDalle(b, m)) || (surLaDalle(a, m) && surLaDalle(b, g));
};
