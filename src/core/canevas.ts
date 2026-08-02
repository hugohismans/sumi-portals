import { PLAYER_HEIGHT } from './constants.js';
import { lookDirection } from './carryables.js';
import type { Vec3 } from './math.js';
import type { CanevasDef } from './types.js';

/**
 * OÙ LE TRAIT TOMBE SUR LA TOILE.
 *
 * De la géométrie pure : un rayon parti de l'œil, un plan, deux bornes. C'est
 * ici et non dans le rendu, pour une raison qui a déjà servi tout au long de ce
 * projet — **ce qui est dans `core/` se vérifie sans navigateur.** Le trait
 * qu'on voit est exactement celui qui a été calculé, et l'on peut le prouver.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ÉPAISSEUR DU TRAIT EST CELLE DE CELUI QUI ÉCRIT
 *
 * C'est tout l'intérêt, et c'est la seule ligne qui compte dans ce fichier :
 *
 *     rayon = RAYON × échelle du joueur ⁄ largeur de la toile
 *
 * Un géant de sept mètres trace des barres larges comme un bras. Un joueur de
 * quarante-cinq centimètres trace un fil. Sur la MÊME toile, et les deux
 * dessins restent là côte à côte.
 *
 * Le jeu tient dans une phrase — le monde ne change pas, c'est vous qui
 * changez — et c'est le seul endroit où on la met dans la main du joueur au
 * lieu de la lui montrer.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Rayon du trait, en fraction de la TAILLE DU STYLO.
 *
 * Et non de celle du joueur, alors que c'est ce qui vient d'abord à l'esprit.
 * La différence est tout l'intérêt : un stylo change de taille en franchissant
 * une porte, exactement comme le reste. Il y a donc DEUX molettes au lieu d'une.
 *
 * Un géant qui ramasse un gros stylo trace des barres larges comme un bras. Le
 * même géant qui ramasse un petit stylo trace un fil. Et l'on ne peut pas
 * soulever un stylo plus gros que soi, ce qui borne la chose sans qu'aucune
 * règle n'ait à être énoncée.
 *
 * La phrase à retenir tient en cinq mots : le trait fait la pointe.
 */
const RAYON = 0.34;

/**
 * Portée du stylo, en hauteurs de joueur.
 *
 * Plus longue que le bras (1,6) : on écrit sur un mur qu'on ne touche pas, et
 * l'obliger à le frôler donnerait une danse au lieu d'un geste. Mais pas
 * infinie non plus — au-delà, on ne vise plus, on espère.
 */
const PORTEE = 4.5;

export interface Impact {
  canevas: string;
  /** Position sur la toile, de 0 à 1. */
  u: number;
  v: number;
  /** Rayon du trait, en fraction de la LARGEUR de la toile. */
  rayon: number;
}

/**
 * Cherche ce qu'on vise. `oeil` est la position des yeux, pas des pieds.
 *
 * On renvoie la toile la plus proche devant soi, ou `null`. Les toiles sont
 * quelques-unes par niveau : on les parcourt toutes sans y penser.
 */
export const viser = (
  toiles: CanevasDef[],
  oeil: Vec3,
  yaw: number,
  pitch: number,
  playerScale: number,
  /** Arête du stylo tenu. C'est elle qui fait l'épaisseur du trait. */
  tailleStylo: number,
): Impact | null => {
  const dir = lookDirection(yaw, pitch);
  const portee = PLAYER_HEIGHT * playerScale * PORTEE;

  let meilleur: Impact | null = null;
  let meilleureDist = Infinity;

  for (const t of toiles) {
    // La normale de la toile, et les deux axes de son plan. `yaw` vaut 0 quand
    // elle regarde vers +Z, comme partout ailleurs dans ce jeu.
    const nx = Math.sin(t.yaw);
    const nz = Math.cos(t.yaw);
    // Vers la droite de la toile, vue depuis l'avant.
    const dx = nz;
    const dz = -nx;

    const denom = dir.x * nx + dir.z * nz;
    // On n'écrit que sur la FACE de la toile, jamais sur son dos, et jamais en
    // rasant : un trait posé à quatre-vingt-neuf degrés serait une traînée de
    // plusieurs mètres pour un geste d'un centimètre.
    if (denom > -0.2) continue;

    const ox = t.position[0] - oeil.x;
    const oy = t.position[1] - oeil.y;
    const oz = t.position[2] - oeil.z;
    const dist = (ox * nx + oz * nz) / denom;
    if (dist < 0 || dist > portee || dist >= meilleureDist) continue;

    // Le point d'impact, ramené dans le repère de la toile.
    const px = oeil.x + dir.x * dist - t.position[0];
    const py = oeil.y + dir.y * dist - t.position[1];
    const pz = oeil.z + dir.z * dist - t.position[2];
    const droite = px * dx + pz * dz;

    const u = droite / t.largeur + 0.5;
    const v = 0.5 - py / t.hauteur;
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;

    meilleureDist = dist;
    meilleur = {
      canevas: t.id,
      u,
      v,
      rayon: (RAYON * tailleStylo) / t.largeur,
    };
    // On garde le reste de la boucle : une autre toile pourrait être devant.
    void oy;
  }

  return meilleur;
};

/** Est-on assez près de la gomme pour effacer ? */
export const surLaGomme = (t: CanevasDef, position: Vec3): boolean => {
  if (!t.gomme) return false;
  const dx = position.x - t.gomme.position[0];
  const dy = position.y - t.gomme.position[1];
  const dz = position.z - t.gomme.position[2];
  return dx * dx + dy * dy + dz * dz <= t.gomme.radius * t.gomme.radius;
};
