import type { BoxDef } from '../../core/types.js';
import type { RegionModule } from './contrat.js';

/**
 * LA TERRASSE — LE JARDIN SEC DES HAUTEURS.
 *
 * Une dalle nue à trente mètres au-dessus du village n'est qu'un toit. Pour en
 * faire un LIEU, il lui fallait une raison d'être : c'est une cour de temple à
 * l'abandon, un jardin de gravier ratissé qu'on entretient encore d'un côté et
 * qu'on a laissé s'écrouler de l'autre.
 *
 * Le parti pris tient en trois gestes :
 *
 * **Le bord sud reste vide.** Rien entre z=50 et z=58. C'est la seule chose que
 * la terrasse promet vraiment — voir le village d'où l'on vient — et on ne
 * meuble pas une promesse. Tout ce qui est construit commence plus au nord.
 *
 * **La voie centrale ne se traverse pas, elle se longe.** Le couloir entre les
 * deux portails reste libre, mais il est bordé de banquettes, de lanternes et
 * de deux stèles qui l'encadrent au sud. On peut le suivre droit ; on n'en a
 * pas envie.
 *
 * **Ce qu'on veut est toujours à côté, jamais devant.** Les trois stations du
 * pinceau tirent le joueur à l'ouest, puis en arrière vers le nord-est, puis
 * en haut de l'autel. Le chemin le plus court d'un portail à l'autre est le
 * seul qui ne montre rien.
 */

/** Le nom que porte chaque boîte de la région. */
const R = 'terrasse-jardin';

/** Face supérieure de la dalle. Imposée par le monde, jamais recalculée. */
const SOL = 30;

/**
 * Tout part d'un demi-mètre SOUS le sol visible.
 *
 * Une base posée à 30 pile partagerait son plan avec la dalle, et deux faces au
 * même niveau se disputent la profondeur : c'est le grésillement classique du
 * projet. En s'enfonçant, la jonction n'existe simplement plus.
 */
const ANCRAGE = 29.5;

type Opts = { ghost?: boolean; outline?: boolean };

const b = (
  min: [number, number, number],
  max: [number, number, number],
  ink: number,
  opts: Opts = {},
): BoxDef => ({ min, max, ink, ...opts, region: R });

/** Volume posé sur la dalle. `h` est la hauteur VUE, mesurée depuis le sol. */
const pose = (
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  h: number,
  ink: number,
  opts: Opts = {},
): BoxDef => b([x0, ANCRAGE, z0], [x1, SOL + h, z1], ink, opts);

/**
 * Volume posé sur un AUTRE volume. Il mord de 0,4 dans son support : sa face
 * basse se retrouve noyée dans la masse au lieu d'affleurer la face haute.
 */
const sur = (
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  base: number,
  h: number,
  ink: number,
): BoxDef => b([x0, base - 0.4, z0], [x1, base + h, z1], ink);

/**
 * LANTERNE DE PIERRE — 7,4 de haut, soit la taille du joueur (7,2).
 *
 * C'est l'unité de mesure du jardin : tout le reste se lit par rapport à elle.
 * Le fût est étroit, la boîte de lumière déborde de tous côtés et coiffe le
 * sommet du fût, qui disparaît dedans.
 */
const lanterne = (cx: number, cz: number): BoxDef[] => [
  pose(cx - 0.9, cx + 0.9, cz - 0.9, cz + 0.9, 5.0, 2),
  sur(cx - 1.9, cx + 1.9, cz - 1.9, cz + 1.9, SOL + 5.0, 2.4, 3),
];

/**
 * PIERRE DRESSÉE. Le couronnement est plus étroit ET décalé : une pierre de
 * jardin n'est pas un poteau, elle penche un peu.
 */
const pierre = (
  cx: number,
  cz: number,
  w: number,
  d: number,
  h: number,
  ink: number,
): BoxDef[] => [
  pose(cx - w, cx + w, cz - d, cz + d, h, ink),
  sur(cx - w * 0.78, cx + w * 0.71, cz - d * 0.69, cz + d * 0.84, SOL + h, 0.9, ink === 1 ? 2 : 1),
];

/**
 * COLONNE. Fût carré, chapiteau débordant qui pose la ligne d'encre en haut.
 * `h` reste toujours au-dessus de 13 : une colonne entière ne doit jamais
 * ressembler à un objet sur lequel on pourrait monter.
 */
const colonne = (cx: number, cz: number, h: number, ink = 1): BoxDef[] => [
  pose(cx - 2.4, cx + 2.4, cz - 2.4, cz + 2.4, h, ink),
  sur(cx - 3.1, cx + 3.1, cz - 3.1, cz + 3.1, SOL + h, 1.6, 2),
];

/**
 * BASSIN. Quatre margelles qui encadrent une nappe d'eau.
 *
 * La nappe est plus large que l'ouverture : ses quatre faces verticales passent
 * SOUS la pierre au lieu de s'aligner avec elle. Les margelles longues sont
 * légèrement plus hautes et plus basses que les courtes (1,45 et 1,35 contre
 * 1,40) — trois plans distincts là où il n'y en aurait eu qu'un.
 *
 * Rien ne dépasse 1,45 : un bassin ne doit jamais devenir un obstacle, on
 * l'enjambe sans y penser (l'enjambée fait 3,6).
 */
const bassin = (x0: number, x1: number, z0: number, z1: number): BoxDef[] => [
  pose(x0, x1, z0, z0 + 2.6, 1.4, 2),
  pose(x0, x1, z1 - 2.6, z1, 1.4, 2),
  pose(x0 - 0.2, x0 + 2.6, z0 + 1.4, z1 - 1.4, 1.35, 2),
  pose(x1 - 2.6, x1 + 0.2, z0 + 1.4, z1 - 1.4, 1.45, 2),
  pose(x0 + 1.1, x1 - 1.1, z0 + 1.1, z1 - 1.1, 0.8, 0),
];

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // LA VOIE — bordée, jamais barrée. Le couloir x[-13,13] reste intact.
  // ═══════════════════════════════════════════════════════════════════════════

  // Banquettes basses. Assise à 2,8 : pour un joueur de 7,2, c'est exactement
  // la hauteur d'un banc pour un homme de 1,8. À 1 mètre ç'aurait été une
  // brique perdue au sol ; à 2,8 on lit un banc au premier coup d'œil.
  for (const s of [-1, 1]) {
    out.push(pose(s > 0 ? 15.4 : -19.4, s > 0 ? 19.4 : -15.4, 65, 93, 2.3, 1));
    // La tablette déborde du corps et le coiffe : aucune face commune.
    out.push(sur(s > 0 ? 14.8 : -20, s > 0 ? 20 : -14.8, 64.4, 93.6, SOL + 2.3, 0.5, 2));
  }

  // Lanternes : le rythme de la marche. Espacées de 12, soit une tous les cinq
  // pas — assez pour scander, trop peu pour faire une haie.
  for (const z of [66, 78, 90]) {
    out.push(...lanterne(-23, z), ...lanterne(23, z));
  }

  // Les deux stèles du seuil sud. Elles encadrent le vide sans le masquer :
  // 3,6 de large chacune, 29 de vide entre elles. Hautes de 11,4, donc
  // définitivement hors d'atteinte (le saut plafonne à 5,2) : on ne monte pas
  // dessus pour voir plus loin, on passe entre.
  for (const s of [-1, 1]) {
    out.push(pose(s * 16.5 - 1.8, s * 16.5 + 1.8, 59, 62.6, 11.4, 2));
    out.push(sur(s * 16.5 - 2.6, s * 16.5 + 2.6, 58.2, 63.4, SOL + 11.4, 1.7, 3));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // L'AUTEL EN GRADINS — ouest. Le morceau de bravoure, et l'énigme.
  //
  // Douze mètres soixante-dix au-dessus de la dalle, en quatre gradins de 3,1
  // et 3,2 : chaque marche passe sous l'enjambée de 3,6, donc l'ascension est
  // gratuite — À CONDITION de la trouver.
  //
  // Car les gradins ne se retirent qu'à l'OUEST et au NORD (retrait de 5,4, de
  // quoi poser les pieds : le joueur fait 2,7 de diamètre). À l'est et au sud,
  // chaque gradin AVANCE de 0,4 sur celui du dessous. Cet encorbellement fait
  // deux choses d'un coup : il supprime toute prise de ce côté — depuis la voie
  // centrale, c'est un mur lisse de 12,7 — et il évite d'aligner les faces
  // verticales des quatre gradins dans un même plan.
  // ═══════════════════════════════════════════════════════════════════════════
  out.push(pose(-74.0, -44.0, 70.0, 100.0, 3.1, 1));
  out.push(pose(-68.6, -43.6, 69.6, 94.6, 6.3, 1));
  out.push(pose(-63.2, -43.2, 69.2, 89.2, 9.5, 2));
  out.push(pose(-57.8, -42.8, 68.8, 83.8, 12.7, 2));

  // La stèle du sommet, plantée au coin sud-est de la plate-forme : c'est elle
  // qu'on voit depuis la voie, découpée sur le vide, bien avant de comprendre
  // qu'on peut monter. Elle est décalée dans le coin pour ne pas encombrer les
  // 15 × 15 de la plate-forme.
  out.push(sur(-47.0, -43.2, 70.0, 73.8, SOL + 12.7, 9.6, 2));
  out.push(sur(-47.8, -42.6, 69.4, 74.4, SOL + 22.3, 1.5, 3));

  // Les pas japonais qui mènent au pied nord-ouest de l'autel. Hauts de 0,4 :
  // ils ne sont pas un obstacle, ils sont une phrase. Ils disent « contourne »,
  // ce qui est la solution de l'énigme, sans qu'un mot soit écrit.
  for (let i = 0; i < 8; i++) {
    const cx = -24 - i * 7.2;
    out.push(pose(cx - 1.7, cx + 1.7, 100.4, 102.6, 0.4, 1));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LE JARDIN RATISSÉ — nord-ouest. Le côté encore entretenu.
  // ═══════════════════════════════════════════════════════════════════════════

  // Le lit de gravier : 0,6 de haut. Un simple ourlet, franchi sans ralentir,
  // mais qui donne un bord net à la surface pâle — c'est le bord qui fait le
  // jardin, pas le gravier.
  out.push(pose(-79, -19, 103, 117.5, 0.6, 0));

  // Les sillons du râteau. Espacés de 3,3, larges de 1,2 : à l'échelle ×4 c'est
  // le pas d'un vrai ratissage. Ils culminent à 1,0, au-dessus du lit (0,6),
  // pour que l'ombre les détache.
  for (let z = 104.8; z < 116; z += 3.3) {
    out.push(pose(-77, -21, z, z + 1.2, 1.0, 1));
  }

  // Les deux rochers du jardin sec. 6,4 et 4,2 : le premier arrive à l'épaule,
  // le second se saute (5,2) sans se marcher (3,6). Assez pour qu'on hésite.
  out.push(...pierre(-64, 110, 3.2, 2.8, 6.4, 2));
  out.push(...pierre(-38, 107.6, 2.4, 3.4, 4.2, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // LA COUR RUINÉE — nord-est. Le même jardin, mais abandonné.
  // ═══════════════════════════════════════════════════════════════════════════

  out.push(pose(19, 66, 102.5, 116.5, 0.5, 0));

  // Les trois tambours de colonne effondrés. Leurs sommets — 3,2 puis 6,5 puis
  // 9,8 — montent de 3,2 et 3,3 : sous l'enjambée de 3,6 à chaque fois. Depuis
  // le portail d'arrivée on voit le pinceau perché à 9,8, hors de portée d'un
  // saut (5,2) ; l'escalier est là, mais il ne ressemble pas à un escalier.
  out.push(pose(29.0, 34.4, 103.5, 108.9, 3.2, 1));
  out.push(pose(35.6, 41.2, 104.8, 110.4, 6.5, 2));
  out.push(pose(42.4, 49.2, 103.2, 109.6, 9.8, 1));

  // Le fût couché. Hauteur 4,6 : au-dessus de l'enjambée, sous le saut. C'est
  // le seul obstacle du jardin qui demande vraiment une décision.
  out.push(pose(52.4, 64.2, 106, 110.8, 4.6, 2));
  out.push(sur(51.6, 65.0, 106.9, 109.9, SOL + 4.6, 0.6, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // LES BASSINS — est. La seule surface pâle horizontale : c'est elle qui
  // accrochera la lumière quand on regardera la terrasse depuis le belvédère,
  // comme l'étang le fait pour le village.
  // ═══════════════════════════════════════════════════════════════════════════
  out.push(...bassin(28, 60, 74, 99));
  out.push(...bassin(30, 48, 60, 71));

  // ═══════════════════════════════════════════════════════════════════════════
  // LA COLONNADE — bordure est. Elle tient tout le côté droit du regard.
  //
  // Le stylobate (1,2, une marche pour rien) court sous les six colonnes.
  // L'entraxe est de 9,6 pour un fût de 4,8 : il reste 4,8 de vide entre deux
  // colonnes, presque le double du diamètre du joueur (2,7). On passe partout,
  // donc on ne peut jamais s'y retrouver enfermé.
  //
  // Les deux dernières sont brisées : 7,8 et 4,4. La chute de hauteur raconte
  // la ruine et amène l'œil vers la cour effondrée, au nord.
  // ═══════════════════════════════════════════════════════════════════════════
  out.push(pose(69.8, 79.4, 56, 114, 1.2, 2));
  out.push(...colonne(74.6, 60, 14.6));
  out.push(...colonne(74.6, 69.6, 13.0, 2));
  out.push(...colonne(74.6, 79.2, 14.6));
  out.push(...colonne(74.6, 88.8, 13.0, 2));
  out.push(pose(72.2, 77.0, 96.0, 100.8, 7.8, 1));
  out.push(pose(72.2, 77.0, 105.6, 110.4, 4.4, 2));

  // ═══════════════════════════════════════════════════════════════════════════
  // LES PIERRES DU SUD — semées large, jamais alignées, toutes au nord de
  // z=60. Elles donnent une profondeur au vide qu'on regarde sans jamais se
  // mettre entre le joueur et le village.
  // ═══════════════════════════════════════════════════════════════════════════
  out.push(...pierre(-31, 66, 2.6, 2.2, 9.8, 2));
  out.push(...pierre(-48, 61.5, 3.4, 2.6, 5.9, 1));
  out.push(...pierre(-71, 64, 2.8, 3.2, 7.4, 2));
  out.push(...pierre(-80, 88, 3.6, 3.0, 11.2, 1));
  out.push(...pierre(55, 66, 3.0, 2.4, 8.6, 2));
  out.push(...pierre(62, 66.5, 2.6, 3.4, 6.2, 1));

  // Le socle de la première station : 1,4, une simple pierre plate au bord de
  // la voie. On y monte sans y penser — c'est la leçon gratuite, celle qui
  // apprend au joueur que le pinceau se rejoint.
  out.push(pose(-30, -25, 90, 95, 1.4, 2));
  out.push(sur(-30.6, -24.4, 89.4, 95.6, SOL + 1.4, 0.35, 1));

  return out;
};

export const TERRASSE: RegionModule = {
  // La région garde le papier froid et pâle des hauteurs — on ne change pas
  // d'univers en montant d'un étage — mais elle porte son propre nom et sa
  // propre gamme : des gris un peu plus clairs, plus minéraux, et le même
  // rouge d'accent que les balustrades du monde, pour que les lanternes et
  // les stèles répondent aux garde-corps.
  region: {
    name: R,
    min: [-86, 29.5, 50],
    max: [86, 110, 124],
    paper: '#dde3e6',
    colors: ['#e3e9eb', '#bfcad0', '#7b8a94', '#c05a3c'],
    ink: '#1a2126',
  },

  bounds: { min: [-86, 29.5, 50], max: [86, 110, 124] },

  boxes: decor(),

  stations: [
    // 1. Sur la pierre plate, à trois pas de l'arrivée. Rien à résoudre.
    [-27.5, 31.4, 92.5],
    // 2. Au sommet des tambours effondrés, à 9,8. Il faut REVENIR EN ARRIÈRE,
    //    vers le nord-est, alors que la sortie est au sud : c'est ce détour
    //    qui fait visiter la cour ruinée.
    [45.8, 39.8, 106.4],
    // 3. Sur l'autel, à 12,7. Visible depuis tout le jardin, inatteignable
    //    d'un pas : depuis la voie centrale, le gradin surplombe et n'offre
    //    aucune prise. Il faut contourner par l'ouest ou par le nord, où les
    //    quatre marches de 3,1 attendent.
    [-50.0, 42.7, 76.3],
  ],

  entree: [0, 30, 98],
  sortie: [0, 30, 70],
};
