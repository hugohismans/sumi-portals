import type { BoxDef, RegionDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LE SEUIL — là où le monde redit de quelle taille on est.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL ENSEIGNE : rien. C'est un palier, et il n'a qu'un rôle — recevoir
 * le joueur qui sort du grain, où il vient de passer un quart d'heure sans
 * savoir quelle taille il faisait, et le poser devant un étalon.
 *
 * L'étalon est la porte elle-même. On arrive par sa petite face, soixante-dix
 * centimètres, la plus petite porte du jeu : on fait 45 cm, elle en fait
 * soixante-dix, et l'on n'a plus rien à mesurer. Le grain retirait tout ce qui
 * permet de se comparer ; le seuil ne donne qu'une chose, et c'est assez.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * UNE DALLE NUE, ET LE BROUILLARD. Vingt mètres de côté, quarante-quatre corps
 * pour qui vient d'arriver : on marche dix secondes vers le but, et pendant ces
 * dix secondes la porte derrière soi dit ce qu'on est. Rien d'autre à voir.
 * Ce mouvement n'a pas de couleur à rendre — pas encore : le monde retourné
 * qui « rend le ciel » est décidé, pas bâti. Le seuil tient la place de la
 * lucarne en attendant, sans faire semblant d'être une fin.
 *
 * LA PARCELLE est à l'est de la rive, dans la même bande que le mouvement :
 * x 300…400, z 3400…3600. Rien ne s'y voit depuis la rive, dont la falaise
 * ferme l'horizon à trente mètres.
 */

const REGION: RegionDef = {
  name: 'seuil',
  min: [300, -80, 3400],
  max: [400, 80, 3600],
  paper: '#f2f1ec',
  colors: ['#e9e7e0', '#d2cfc5', '#aaa69b', '#7a766c'],
  ink: '#26241f',
  brouillard: 120,
};

const b = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'seuil', ...opts });

const CX = 350;
const Z0 = 3480;
const Z1 = 3520;

const decor = (): BoxDef[] => [
  // La dalle. Dessus à zéro, épaisse : rien ne se traverse.
  b([CX - 10, -3, Z0], [CX + 10, 0, Z1], 1, { outline: false }),
  // Un liseré tout autour, douze centimètres SOUS le dessus : deux dessus dans
  // le même plan se disputent la profondeur et grésillent.
  b([CX - 10.6, -3.01, Z0 - 0.6], [CX + 10.6, -0.12, Z1 + 0.6], 2, { outline: false }),
  // Quatre bornes basses aux angles, à l'échelle de qui arrive : 22 cm, un
  // demi-corps. Elles ne servent qu'à ce que la dalle ait une taille.
  b([CX - 9.4, 0, Z0 + 0.6], [CX - 9.0, 0.22, Z0 + 1.0], 3),
  b([CX + 9.0, 0, Z0 + 0.6], [CX + 9.4, 0.22, Z0 + 1.0], 3),
  b([CX - 9.4, 0, Z1 - 1.0], [CX - 9.0, 0.22, Z1 - 0.6], 3),
  b([CX + 9.0, 0, Z1 - 1.0], [CX + 9.4, 0.22, Z1 - 0.6], 3),
];

export const SEUIL: SalleModule = {
  nom: 'seuil',
  region: REGION,
  bounds: { min: [300, -80, 3400], max: [400, 80, 3600] },
  boxes: decor(),

  // Le Pinceau traverse la dalle du nord au sud, à hauteur de qui arrive.
  stations: [
    [CX, 0.6, Z1 - 8],
    [CX, 0.5, Z0 + 6],
  ],

  /**
   * ON ARRIVE PETIT, AU NORD DE LA DALLE, FACE AU SUD — la dalle devant soi, la
   * porte dans le dos. On ne la voit qu'en se retournant, et c'est le geste :
   * on marche vers le but, on se retourne, on la regarde. Une arrivée face à la
   * porte aurait fait repasser le premier pas à travers elle, dans l'autre
   * sens, jusqu'au grain.
   *
   * ET L'ON NE REPART PAS D'ICI — c'est la fin du mouvement. `echelle` EST UN
   * PALIER : −1 = ×1/4. La sortie n'est déclarée que parce que le contrat
   * l'exige ; aucun raccord ne la prend.
   */
  entree: { position: [CX, 0.05, Z1 - 6], echelle: -1 },
  sortie: { position: [CX, 0.05, Z0 + 4], echelle: -1 },
};

/** Le but du mouvement : au bout de la dalle, à dix secondes de marche. */
export const SEUIL_BUT: [number, number, number] = [CX, 0.05, Z0 + 6];
