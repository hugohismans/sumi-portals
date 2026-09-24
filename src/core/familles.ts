import type { BoxDef, TableauDef } from './types.js';

/**
 * LES FAMILLES DE COULEUR — et le tableau qui dit ce qu'on attend d'elles.
 *
 * Une famille est un groupe de boîtes qu'un tableau nomme d'un seul mot : les
 * sept pots d'un séchoir, les douze tuiles d'un toit. On en peint un membre,
 * TOUTE la famille prend la couleur — un tableau parle de « les pots », pas du
 * troisième pot en partant de la gauche.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ON PEINT TOUT, ET L'ÉNIGME N'EST QUE LE MÊME GESTE
 *
 * La couleur se posait par une touche d'action qui « disait » la couleur
 * suivante, et seulement sur ce qu'on aurait pu soulever. Signalé en jouant :
 * « l'étape où il y a un tableau et qu'on doit peindre des éléments, c'est pas
 * super clair ; ce serait cool qu'on ait un inventaire de nos pinceaux, qu'on
 * puisse absolument tout colorer comme on le souhaite, et que lors des
 * énigmes à couleur on doive juste peindre comme on le fait pour le fun. »
 *
 * C'est donc ainsi. On choisit un pinceau dans l'inventaire, on vise, on
 * clique : la boîte prend la couleur — n'importe quelle boîte du décor. Une
 * boîte qui appartient à une famille la peint tout entière, et c'est tout ce
 * qu'une énigme de couleur demande : que la pièce ressemble à son tableau.
 *
 * La « loi de la main » (on ne peignait que ce qu'on pourrait tenir) a cédé
 * la place à une loi de PORTÉE : on peint ce qu'on atteint, et l'on atteint
 * plus loin quand on est plus grand (voir `Simulation.PORTEE_PINCEAU`). Un
 * homme ne touche pas les tuiles d'un toit à quatorze mètres ; un géant, si.
 * Changer de taille reste une façon d'atteindre, sans plus jamais être une
 * interdiction qu'on doit deviner.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ET L'ON REPEINT AUTANT QU'ON VEUT. C'est la seule chose du jeu qui se défait,
 * délibérément à l'inverse d'un logement : un logement est un progrès, donc il
 * verrouille ; une couleur est une décision, donc elle se reprend.
 */
export class Familles {
  /** Les boîtes de chaque famille, par leur rang dans le décor du niveau. */
  readonly membres = new Map<string, number[]>();
  /** Teinte courante de chaque famille. Absente = encore en lavis. */
  readonly teintes = new Map<string, string>();
  /** Tableaux dont la pièce a fini par leur ressembler. */
  readonly satisfaits = new Set<string>();

  private readonly tableaux: TableauDef[];

  constructor(boxes: BoxDef[] = [], tableaux: TableauDef[] = []) {
    this.tableaux = tableaux;
    boxes.forEach((b, i) => {
      if (!b.famille) return;
      const lot = this.membres.get(b.famille);
      if (lot) lot.push(i);
      else this.membres.set(b.famille, [i]);
    });
  }

  reset(): void {
    this.teintes.clear();
    this.satisfaits.clear();
  }

  /** Les familles connues. Sert aux vérifications et à la construction du décor. */
  get noms(): string[] {
    return [...this.membres.keys()];
  }

  /** Donne une couleur à une famille. Toujours permis, toujours réversible. */
  peindre(famille: string, pigment: string): void {
    this.teintes.set(famille, pigment);
  }

  /** Rend une famille au lavis : c'est ce que fait l'eau. */
  laver(famille: string): void {
    this.teintes.delete(famille);
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
