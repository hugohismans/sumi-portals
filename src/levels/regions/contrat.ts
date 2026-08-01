import type { BoxDef, CarryableDef, RegionDef, SocketDef } from '../../core/types.js';

/**
 * CONTRAT D'UNE RÉGION DU MONDE.
 *
 * Chaque région est un fichier autonome qui n'exporte que des DONNÉES. Elle ne
 * touche à aucun autre fichier, ce qui permet d'en écrire plusieurs en même
 * temps sans qu'elles se percutent — c'est l'assemblage final, dans monde.ts,
 * qui les réunit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES RÈGLES, dans l'ordre d'importance
 *
 * 1. RESTER DANS SA PARCELLE. Toute boîte doit tenir dans `bounds`. Deux
 *    régions dont les parcelles ne se chevauchent pas ne peuvent pas
 *    s'interpénétrer, quoi qu'elles contiennent.
 *
 * 2. NE JAMAIS FAIRE COÏNCIDER DEUX FACES. Dans un monde de boîtes, deux
 *    surfaces exactement dans le même plan se disputent la profondeur et
 *    grésillent. Qu'une pièce morde sur l'autre (chevauchement de 10 cm) ou
 *    s'en écarte franchement. C'est le défaut le plus fréquent du projet.
 *
 * 3. LA COHÉRENCE VIENT DE LA TECHNIQUE, LA VARIÉTÉ VIENT DE LA PALETTE.
 *    Soyez très libres sur les couleurs — une région peut être glacée, une
 *    autre brûlante. Mais n'inventez aucune technique : partout le même trait
 *    d'encre, les mêmes aplats, le même grain. Un seul dessinateur, dix
 *    ambiances.
 *
 * 4. CALIBRER SUR LA TAILLE DU JOUEUR qui traverse la région. Il mesure
 *    1,8 × son échelle. Il ENJAMBE la moitié de sa taille et SAUTE 0,72 fois
 *    sa taille. À ×1 : marche de 0,9, saut de 1,3. À ×4 : 3,6 et 5,2. À ×16 :
 *    14,4 et 20,7. Un obstacle se calibre sur ces nombres, jamais à vue.
 *
 * 5. NE JAMAIS PIÉGER. Tout endroit où l'on peut entrer doit pouvoir être
 *    quitté. Un joueur coincé sans recours est le pire défaut possible.
 *
 * 6. LE VIDE SE PROTÈGE PAR DES BALUSTRADES, pas par des murs pleins : on doit
 *    voir en contrebas, c'est tout l'intérêt d'être monté. Montants espacés de
 *    moins d'un diamètre de joueur, plus hauts que son saut.
 *
 * 7. LE PINCEAU VOLE, LE JOUEUR NON. C'est de cet écart que naissent les
 *    énigmes : posez une station là où l'on voit le pinceau sans pouvoir
 *    l'atteindre d'un pas, et laissez le joueur trouver sa route.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface RegionModule {
  /** Palette et bornes colorimétriques de la région. */
  region: RegionDef;

  /**
   * Parcelle réservée. Aucune boîte ne doit en sortir — c'est ce qui garantit
   * que deux régions écrites séparément ne se percuteront jamais.
   */
  bounds: { min: [number, number, number]; max: [number, number, number] };

  /** Le décor. Chaque boîte doit porter `region: <nom>`. */
  boxes: BoxDef[];

  /**
   * Stations du Pinceau traversant la région, dans l'ordre du voyage.
   * Il s'y pose et attend d'être rejoint.
   */
  stations: [number, number, number][];

  /** Caisses, si la région en propose. */
  carryables?: CarryableDef[];

  /** Réceptacles, si la région en propose. */
  sockets?: SocketDef[];

  /**
   * Par où l'on entre et par où l'on sort, en coordonnées exactes.
   * C'est le raccord avec le reste du monde : il doit être tenu au mètre près.
   */
  entree: [number, number, number];
  sortie: [number, number, number];
}

/** Vérifie qu'une région respecte sa parcelle. Appelé par npm run check. */
export const verifierParcelle = (m: RegionModule): string[] => {
  const fautes: string[] = [];
  const { min, max } = m.bounds;
  for (const b of m.boxes) {
    for (let i = 0; i < 3; i++) {
      if (b.min[i] < min[i] - 1e-6 || b.max[i] > max[i] + 1e-6) {
        fautes.push(
          `${m.region.name} : une boîte sort de sa parcelle sur l'axe ${'xyz'[i]} ` +
            `(${b.min[i]}…${b.max[i]} hors de ${min[i]}…${max[i]})`,
        );
        break;
      }
    }
  }
  return fautes;
};
