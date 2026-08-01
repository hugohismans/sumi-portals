import { PLAYER_HEIGHT, scaleOfLevel } from './constants.js';

/**
 * A-T-IL MARCHÉ, OU A-T-IL FRANCHI UNE PORTE ?
 *
 * Les autres joueurs sont affichés par lissage : leur silhouette POURSUIT la
 * position qu'ils publient, au lieu de s'y poser sèchement. C'est ce qui donne
 * une démarche continue malgré dix envois par seconde et un aller-retour de
 * réseau.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MAIS UNE PORTE N'EST PAS UN DÉPLACEMENT.
 *
 * Rapporté en jouant à deux : « celui qui traverse voit un passage fluide ;
 * celui qui regarde voit l'autre faire un téléport bizarre ».
 *
 * Quand quelqu'un franchit un portail, la position qu'il publie saute de cent
 * cinquante mètres et son échelle est divisée par quatre. Le lissage, lui, ne
 * sait pas ce qu'est une porte : il faisait donc GLISSER la silhouette d'un
 * bout à l'autre du monde, à travers les murs, pendant que sa taille changeait
 * d'un coup. Un corps qui traverse la pierre en rapetissant — c'est ce qu'on
 * voyait, et rien dans le jeu ne l'expliquait.
 *
 * On distingue donc les deux. Marcher, c'est se rapprocher un peu de là où l'on
 * était ; franchir, c'est changer de taille, ou parcourir en un dixième de
 * seconde ce qu'aucune paire de jambes ne parcourt. Dans le second cas on ne
 * lisse pas : on POSE la silhouette de l'autre côté, ce qui est exactement ce
 * que fait le portail pour celui qui le traverse.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Marge sur ce qu'un joueur peut parcourir entre deux envois.
 *
 * À dix envois par seconde, on couvre au plus une hauteur de corps ou deux. Six
 * laisse largement place à une chute, à un saut lancé, et à un envoi perdu qui
 * fait doubler l'écart — sans jamais atteindre la distance entre deux faces
 * d'un portail, qui se compte en dizaines de hauteurs.
 */
const MARGE = 6;

/**
 * `echelle` : le palier annoncé maintenant. `echelleAvant` : celui d'avant.
 * Un changement d'échelle suffit à trancher — dans ce jeu, on ne change de
 * taille QUE par une porte.
 */
export const estUnSaut = (
  de: { x: number; y: number; z: number },
  vers: { x: number; y: number; z: number },
  echelle: number,
  echelleAvant: number,
): boolean => {
  if (echelle !== echelleAvant) return true;
  const seuil = MARGE * PLAYER_HEIGHT * scaleOfLevel(echelle);
  const dx = vers.x - de.x;
  const dy = vers.y - de.y;
  const dz = vers.z - de.z;
  return dx * dx + dy * dy + dz * dz > seuil * seuil;
};
