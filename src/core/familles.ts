import { PLAYER_HEIGHT } from './constants.js';
import { LIFT_RATIO, REACH, lookDirection } from './carryables.js';
import type { Vec3 } from './math.js';
import type { BoxDef, TableauDef } from './types.js';

/**
 * LES FAMILLES DE COULEUR — et le tableau qui dit ce qu'on attend d'elles.
 *
 * On ne peint jamais un objet : on peint une FAMILLE. Les sept pots d'un
 * séchoir, les douze tuiles d'un toit. Le joueur s'approche d'un seul membre,
 * appuie sur la touche d'action, et tous basculent — l'un après l'autre, sous
 * ses yeux, portés par la fée qui traverse la pièce.
 *
 * Sept objets qui changeraient au même instant se liraient comme un
 * interrupteur. Sept objets peints un par un disent ce qu'est une famille sans
 * qu'un mot ait été prononcé, et le délai empêche de marteler la touche — donc
 * de résoudre par tâtonnement au lieu de raisonner.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ON NE PEINT QUE CE QU'ON POURRAIT TENIR
 *
 * Le seuil est CELUI DE LA CAISSE, au nombre près. Ce n'est pas une économie de
 * code : c'est ce qui fait que le refus est déjà connu du joueur au moment où
 * il le rencontre pour la première fois ici. Il a passé une heure à apprendre
 * que ce qui dépasse un peu la moitié de sa hauteur ne se soulève pas ; il
 * apprend en une seconde que ça ne se peint pas non plus.
 *
 * Et la conséquence est toute la mécanique : un pot se peint à ×1, un toit à
 * ×4, une falaise à ×16. **La palette accessible est partitionnée par la
 * taille**, et un tableau qui demande trois familles est une liste de trois
 * tailles à devenir. La couleur cesse d'être une couche posée sur le jeu et
 * devient une raison de plus de changer de grandeur.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ET L'ON REPEINT AUTANT QU'ON VEUT. C'est la seule chose du jeu qui se défait,
 * délibérément à l'inverse d'un logement : un logement est un progrès, donc il
 * verrouille ; une couleur est une décision, donc elle se reprend.
 */

interface Membre {
  cx: number;
  cy: number;
  cz: number;
  /** Plus grande arête : c'est elle qui décide si l'on peut la peindre. */
  taille: number;
}

export class Familles {
  /** Les membres de chaque famille, pour la visée et pour la loi de la main. */
  private readonly membres = new Map<string, Membre[]>();
  /** Teinte courante de chaque famille. Vide = encore en lavis. */
  readonly teintes = new Map<string, string>();
  /** Tableaux dont la pièce a fini par leur ressembler. */
  readonly satisfaits = new Set<string>();

  private readonly tableaux: TableauDef[];

  constructor(boxes: BoxDef[] = [], tableaux: TableauDef[] = []) {
    this.tableaux = tableaux;
    for (const b of boxes) {
      if (!b.famille) continue;
      const w = b.max[0] - b.min[0];
      const h = b.max[1] - b.min[1];
      const d = b.max[2] - b.min[2];
      const m: Membre = {
        cx: (b.min[0] + b.max[0]) * 0.5,
        cy: (b.min[1] + b.max[1]) * 0.5,
        cz: (b.min[2] + b.max[2]) * 0.5,
        taille: Math.max(w, h, d),
      };
      const lot = this.membres.get(b.famille);
      if (lot) lot.push(m);
      else this.membres.set(b.famille, [m]);
    }
  }

  reset(): void {
    this.teintes.clear();
    this.satisfaits.clear();
  }

  /** Les familles connues. Sert aux vérifications et à la construction du décor. */
  get noms(): string[] {
    return [...this.membres.keys()];
  }

  /**
   * La plus grande arête de la famille.
   *
   * On prend le PLUS GRAND membre, et non le plus proche : peindre est un geste
   * qui porte sur toute la famille, donc le refus doit porter sur toute la
   * famille aussi. Un joueur qui peut peindre le petit pot du bord et pas les
   * six autres vivrait une règle incompréhensible.
   */
  taille(famille: string): number {
    let max = 0;
    for (const m of this.membres.get(famille) ?? []) max = Math.max(max, m.taille);
    return max;
  }

  /** La loi de la main, au nombre près celle de `CarryableSet.canLift`. */
  peignable(famille: string, playerScale: number): boolean {
    return this.taille(famille) <= PLAYER_HEIGHT * playerScale * LIFT_RATIO;
  }

  /**
   * La famille visée : celle dont un membre est le plus proche devant soi, à
   * portée de bras. On renvoie MÊME celles qu'on ne peut pas peindre, pour
   * pouvoir le dire au joueur plutôt que de laisser la touche sans effet — un
   * refus énoncé est une leçon, une touche muette est une panne.
   */
  visee(playerPos: Vec3, yaw: number, playerScale: number): string | null {
    const portee = PLAYER_HEIGHT * playerScale * REACH;
    const oeilY = playerPos.y + PLAYER_HEIGHT * playerScale * 0.6;
    const fwd = lookDirection(yaw, 0);

    let meilleure: string | null = null;
    let meilleureDist = Infinity;
    for (const [nom, lot] of this.membres) {
      for (const m of lot) {
        const dx = m.cx - playerPos.x;
        const dy = m.cy - oeilY;
        const dz = m.cz - playerPos.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > portee + m.taille * 0.5) continue;
        const plat = Math.hypot(dx, dz) || 1;
        if ((dx / plat) * fwd.x + (dz / plat) * fwd.z < 0.25) continue;
        if (dist < meilleureDist) {
          meilleureDist = dist;
          meilleure = nom;
        }
      }
    }
    return meilleure;
  }

  /** Donne une couleur à une famille. Toujours permis, toujours réversible. */
  peindre(famille: string, pigment: string): void {
    this.teintes.set(famille, pigment);
  }

  /**
   * Recalcule quels tableaux sont satisfaits, et renvoie ceux qui viennent de
   * l'être. On ne les DÉ-satisfait jamais : un tableau réussi ouvre une porte,
   * et une porte ouverte par la réflexion ne doit pas se refermer parce qu'on a
   * continué à jouer avec les couleurs après coup.
   */
  verifier(): string[] {
    const neufs: string[] = [];
    for (const t of this.tableaux) {
      if (this.satisfaits.has(t.id)) continue;
      let bon = true;
      for (const [famille, attendu] of Object.entries(t.attendu)) {
        if (this.teintes.get(famille) !== attendu) {
          bon = false;
          break;
        }
      }
      if (bon) {
        this.satisfaits.add(t.id);
        neufs.push(t.id);
      }
    }
    return neufs;
  }
}
