import { scaleOfLevel } from '../core/constants.js';
import type { LevelDef, PortalPairDef } from '../core/types.js';
import type { SalleModule } from './salles/contrat.js';
import { RIVE } from './salles/rive.js';
import { GRAIN } from './salles/grain.js';
import { SEUIL, SEUIL_BUT } from './salles/seuil.js';

/**
 * LA MESURE — le troisième mouvement, et il ne rapporte pas de couleur.
 *
 * La descente allait chercher le bleu en rapetissant ; la montée l'or en
 * grandissant. Celui-ci ne va rien chercher : il retire, une par une, les
 * choses qui permettaient de savoir quelle taille on fait — et il les rend.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROIS SALLES, ET CE QUE CHACUNE FAIT DE LA MESURE
 *
 *     rive   (×4, ×4)    poser la main où l'on ne posera jamais le pied :
 *                        une baie trop basse pour soi, et l'on y met quand
 *                        même la pièce — sa portée n'est pas sa taille.
 *     grain  (×1, ×1)    la salle-thèse : deux lobes bâtis du même tirage,
 *                        l'un quatre fois l'autre, un goulet coudé entre les
 *                        deux, et l'affichage qui se tait. On ne sait plus.
 *                        La sortie est une mesure — une graine qu'on soulève,
 *                        une autre qu'on ne soulève pas.
 *     seuil  (×1/4)      un palier nu, et la porte derrière soi qui redit de
 *                        quelle taille on est.
 *
 * Les deux premières existaient depuis un mois, écrites au mètre près par
 * deux mains différentes, et n'étaient reliées à rien : on ne pouvait les
 * voir qu'en lisant leur fichier. Le harnais le disait à sa façon — « on ne
 * réclame pas encore la chaîne complète : les dernières salles ne sont pas
 * nées ». Elles l'étaient. Il manquait ce fichier.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA LOI DE L'ENCHAÎNEMENT tient : rive → grain descend d'un cran, grain →
 * seuil d'un autre. Et LA PREMIÈRE PORTE DU VOYAGE QUI SE FERME DERRIÈRE SOI
 * est ici : on entre dans le grain par le haut, en tombant de trente et un
 * mètres dans un puits, et l'on ne remonte pas. Ce n'est pas un piège — l'avant
 * reste ouvert — mais c'est voulu : pour que la salle morde, il ne faut pas
 * pouvoir se retourner et voir le cadre par lequel on est entré.
 *
 * APRÈS LE SEUIL, LA BOÎTE À FORMES : elle se dit elle-même l'avant-dernière
 * salle du jeu, celle qui n'enseigne rien et vérifie tout. Elle n'était dans
 * aucune chaîne. Le lien de fin y mène désormais — voir `NIVEAU_SUIVANT`.
 */
const SALLES: SalleModule[] = [RIVE, GRAIN, SEUIL];

export interface Raccord {
  depuis: number;
  vers: number;
  cran: number;
  condition?: string;
  depart?: [number, number, number];
}

/**
 * Ce qui relie les salles. Les deux portes sont scellées, chacune par le
 * logement de la salle qu'on quitte : on ne quitte la rive qu'en ayant garni
 * la serrure de la baie, et le grain qu'en ayant logé la graine — c'est-à-dire
 * mesuré.
 */
const RACCORDS: Raccord[] = [
  { depuis: 0, vers: 1, cran: -1, condition: 'serrure-rive' },
  { depuis: 1, vers: 2, cran: -1, condition: 'creux-grain' },
];

export const ecartDeRaccord = (a: SalleModule, b: SalleModule): number =>
  b.entree.echelle - a.sortie.echelle;

const raccorder = (r: Raccord): PortalPairDef => {
  const a = SALLES[r.depuis];
  const b = SALLES[r.vers];
  const [ax, ay, az] = r.depart ?? a.sortie.position;
  const [bx, by, bz] = b.entree.position;
  const departEstGrand = r.cran < 0;
  return {
    id: `mesure-${a.nom}-${b.nom}`,
    condition: r.condition,
    dessinee: r.condition !== undefined,
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    // La petite face suit la taille du joueur qui la franchit : 2,80 pour
    // l'homme qui quitte la rive géant et arrive homme ; 0,70 pour celui qui
    // quitte le grain homme et arrive quart d'homme. Le grain a un plafond de
    // 7,50 : une grande face de 11,20 l'aurait crevé.
    smallHeight: 2.8 * Math.pow(4, Math.min(a.sortie.echelle, b.entree.echelle)),
    smallWidth: 1.9 * Math.pow(4, Math.min(a.sortie.echelle, b.entree.echelle)),
    big: departEstGrand
      ? { position: [ax, ay, az], yaw: 0 }
      : { position: [bx, by, bz], yaw: Math.PI },
    small: departEstGrand
      ? { position: [bx, by, bz], yaw: Math.PI }
      : { position: [ax, ay, az], yaw: 0 },
  };
};

const assembler = (): LevelDef => ({
  name: 'La mesure',
  spawn: RIVE.entree.position,
  spawnYaw: 0,
  spawnScale: RIVE.entree.echelle,
  regions: SALLES.map((s) => s.region),
  boxes: SALLES.flatMap((s) => s.boxes),
  carryables: SALLES.flatMap((s) => s.carryables ?? []),
  sockets: SALLES.flatMap((s) => s.sockets ?? []),
  tableaux: SALLES.flatMap((s) => s.tableaux ?? []),
  veilleurs: SALLES.flatMap((s) => s.veilleurs ?? []),
  averse: SALLES.flatMap((s) => (s.averse ? [s.averse] : [])),
  portals: [...SALLES.flatMap((s) => s.portals ?? []), ...RACCORDS.map(raccorder)],
  guide: SALLES.flatMap((s) => s.stations),
  // Des TAILLES, jamais des paliers — la seule exception du projet, et elle a
  // déjà produit un Pinceau de taille zéro. Le grain aurait voulu décider
  // jalon par jalon (un Pinceau d'un mètre au pied d'un rocher de douze
  // annonce la taille du rocher) : `stationsEchelle` est là pour ça, et le
  // jour où il le remplit, l'assemblage le suivra sans qu'on y touche.
  guideEchelle: SALLES.flatMap(
    (s) => s.stationsEchelle ?? s.stations.map(() => scaleOfLevel(s.entree.echelle)),
  ),
  guidePorte: SALLES.flatMap((s) => s.stationsPorte ?? s.stations.map(() => null)),
  // Le but est au bout de la dalle du seuil : à dix secondes de la porte, pour
  // qu'on ait le temps de se retourner et de la regarder.
  goal: { position: SEUIL_BUT, radius: 6 * Math.pow(4, SEUIL.entree.echelle) },
});

export const MESURE: LevelDef = assembler();

/** Les salles et leurs raccords, pour les vérifications. */
export const SALLES_MESURE = SALLES;
export const RACCORDS_MESURE = RACCORDS;
