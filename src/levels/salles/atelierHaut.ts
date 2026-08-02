import type { BoxDef, PortalPairDef, TableauDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * L'ATELIER DU HAUT — la tuilerie de la côte rouge, prise par le toit. Elle joue LE PALIER 2
 * puis LE PALIER 3 de l'énigme chromatique (CONCEPTION § 3.5) dans un seul lieu, et suppose
 * lue `atelier.ts`, qui en jouait le palier 1.
 *
 *   LE TOIT (y = 14, on y est à ×4)  les tuiles, les faîtières, les mitres
 *   LA COUR (y =  0, on y est à ×1)  les pots, une pile de tuiles, un tableau
 *   à ×1 (1,80 m) on peint jusqu'à 0,99  →  les pots oui, les tuiles non
 *   à ×4 (7,20 m) on peint jusqu'à 3,96  →  les tuiles oui, les pots aussi
 *
 * On entre et l'on repart par le toit, à ×4, mais le palier 2 réclame les deux tailles. La
 * salle déclare donc SA PROPRE PORTE (`haut-descente`), sans condition, franchissable dans les
 * deux sens autant qu'on veut : le palier 2 est un aller-retour, pas un passage, et une porte
 * à sens unique ferait de la cour un piège.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * COMMENT LE VOYAGE EST RENDU OBLIGATOIRE — c'est LA question de cette salle, et la
 * quatrième ligne est le piège : à ×4 la loi de la main n'interdit rien, donc rien
 * n'obligerait à redescendre. Le texte de conception dit « le tableau ne se lit que d'en
 * bas » ; on l'a pris au pied de la lettre et rendu GÉOMÉTRIQUE, un angle de vue
 * défavorable n'étant pas une garantie. (a) LES POTS N'EXISTENT QUE DANS LA COUR — pas un
 * seul sur le toit, et c'est une décision : un seul suffirait à faire basculer toute la
 * famille sans qu'on ait bougé. D'en haut, le plus proche est vingt mètres plus bas et
 * cinquante plus loin quand la portée d'un géant vaut 11,52, donc `Familles.visee` ne le
 * désigne jamais : ce n'est pas « illisible », c'est hors de portée. (b) ON NE VOIT MÊME
 * PAS LA COUR D'EN HAUT, les parapets montant à plus de 6 m au-dessus du dallage, au-delà
 * du saut d'un géant (5,18) : la seule ouverture sur la cour est LA PORTE, ce qui est la
 * chose la plus juste que ce jeu puisse faire d'un portail. (c) RÉCIPROQUEMENT, la pile de
 * tuiles de la cour fait 3,00 et se refuse à un joueur de 1,80 : le « trop lourd » arrive
 * EN BAS, où il enseigne. Le tableau de la cour demandant les deux familles à la fois, il
 * est impossible à satisfaire sans avoir été en haut ET en bas.
 *
 * NOTE À L'ASSEMBLAGE : `haut-tableau-cour` est le SEUL des deux tableaux qui exige les
 * deux tailles, `haut-tableau-oeil` se satisfaisant sans descendre. **Si la sortie ne doit
 * s'ouvrir qu'après le voyage, c'est `haut-tableau-cour` qu'il faut lui donner comme
 * `condition`.** Et les stations du Pinceau passent du toit à la cour, donc à travers
 * vingt mètres de maçonnerie : `guidePorte` le corrigerait, mais il ne se déclare qu'à
 * l'assemblage.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * RÈGLE 8 — la côte rouge a quatre fours en ruche de trente mètres qui donnent le cap pendant
 * deux cents mètres de marche et qu'on n'approche jamais ; le cinquième est ici et l'on est
 * DANS SA COUR. RÈGLE 9 — l'étalon : les deux faces de `haut-descente` sont le même objet à
 * deux étages, 2,80 × 1,90 en bas et 11,20 × 7,60 en haut, et le mur nord de la cour fait
 * exactement cinq de ces portes. RÈGLE 10 — aller se faire refuser la pile met le joueur au
 * pied de trente-huit mètres de brique, nez en l'air. RÈGLE 11 — aucun logement, aucune
 * caisse : rien à trancher, et rien à craindre des QUATORZE MÈTRES devant soi auxquels un
 * géant repose ce qu'il porte.
 *
 * L'OBJET QUI DIT « C'EST CE LIEU-CI » EST LE FOUR, et il est dans les DEUX tableaux — le
 * remède au vrai risque, celui que la grande jarre soignait dans l'atelier de lavis. D'en bas
 * il prend 44 % de la largeur du cadre et déborde par le haut ; d'en haut, mesuré depuis le
 * tabouret, on en voit les dix-huit derniers mètres monter derrière le parapet, 17,5 % de la
 * largeur et 12,6 % de la hauteur, au milieu. Il n'appartient à AUCUNE famille et reste donc
 * gris dans les deux vues. Et PAS DE `pigment` ici, pour la raison de l'atelier de lavis :
 * une région à pigment se repeint d'un coup, et le rouge arriverait par le décor au lieu
 * d'arriver par le geste. La fée ne porte enfin que sa couleur — le joueur a le rouge, le
 * vert et le bleu, pas l'or.
 */

type V3 = [number, number, number];

const NOM = 'atelierHaut';

const box = (min: V3, max: V3, ink = 1, o: { famille?: string; outline?: boolean } = {}): BoxDef =>
  ({ min, max, ink, region: NOM, ...o });

// LES QUATRE FAMILLES. `Familles.taille` retient le PLUS GRAND membre : une seule boîte trop
// longue emporte la famille entière au-dessus du seuil et rend la salle insoluble sans que
// rien ne le laisse voir, donc chaque constructeur plus bas est écrit pour qu'aucune arête ne
// PUISSE dépasser sa cote. POT 0,86 au plus (0,853 mesuré), 86 % du seuil de ×1 · TUILE 3,00,
// refusée en bas et donnée en haut : c'est elle qui fait le voyage · FAITIERE 2,60 · MITRE
// 2,30, hors de portée à ×1, ce qui interdit de résoudre le palier 3 par en bas. On avait
// d'abord fait la tuile à 4,00, comme le mur de l'atelier de lavis : la salle était morte.
const F_POTS = 'haut-pots';
const F_TUILES = 'haut-tuiles';
const F_FAITIERES = 'haut-faitieres';
const F_MITRES = 'haut-mitres';
const POT = 0.86;
const TUILE = 3.0;
const FAITIERE = 2.6;
const MITRE = 2.3;

/** Les deux planchers : le zéro de la cour, et le dallage du toit. */
const SOL = 0.0;
const TOIT = 14.0;

/**
 * LE PARAPET SUD, ET LE NOMBRE QUI EMPÊCHE LA SALLE D'ÊTRE UN PIÈGE. Un géant tombé dans la
 * cour y resterait : la petite face fait 2,80 et il lui en faut 7,22. Le toit est donc clos de
 * quatre parapets, tous à plus de 5,18 m au-dessus du dallage — le saut d'un joueur de 7,20,
 * mesuré : 6,10 au sud, 9,40 au nord, 6,60 et 6,90 sur les côtés. Le sud est le plus bas parce
 * qu'il porte l'horizon du tableau de l'œil : à 6,10 il laisse voir le sommet du four, et rien
 * d'autre — surtout pas la cour.
 */
const PARAPET_SUD = 20.1;

// LE REPÈRE DU PEINTRE — tout le palier 3 est écrit dans ces coordonnées-là. On ne place RIEN
// d'important en x et z : on le place en PROFONDEUR et en ÉCART LATÉRAL le long de la visée
// du tabouret vers le four, et `vue()` convertit. Trois cheminées posées « à peu près par
// là » ne se seraient alignées d'aucun point de vue. Conséquence voulue et visible dès
// l'arrivée : l'axe fait 18,7° avec les murs, donc LA CRÊTE DE SÉCHAGE EST DE BIAIS SUR LE
// TOIT — elle a l'air posée de travers de partout ailleurs, premier indice qui ne dit rien.
const OEIL_X = 78.0;
const OEIL_Z = 2082.0;
const FOUR_X = 36.0;
const FOUR_Z = 1958.0;
const _len = Math.hypot(FOUR_X - OEIL_X, FOUR_Z - OEIL_Z);
/** `DIR` va vers le four ; `LAT` lui est perpendiculaire, c'est l'écart dans l'image. */
const DIR: [number, number] = [(FOUR_X - OEIL_X) / _len, (FOUR_Z - OEIL_Z) / _len];
const LAT: [number, number] = [DIR[1], -DIR[0]];

/** Un point du toit, donné par sa profondeur et son écart dans l'image. */
const vue = (d: number, l: number): [number, number] => [
  OEIL_X + DIR[0] * d + LAT[0] * l,
  OEIL_Z + DIR[1] * d + LAT[1] * l,
];

/**
 * LE TABOURET. 2,10 de haut, sous la marche automatique d'un géant (3,60) : on y monte en
 * marchant dessus, sans avoir décidé de le faire. Plateau de 3,40 de côté, un joueur à ×4 en
 * faisant 2,72 de large — un tabouret plus étroit que le corps qui doit s'y tenir est une
 * farce. L'œil est alors à 2,10 + 1,80 × 0,92 × 4 = 22,724 : c'est `EYE_FRACTION` × la
 * taille, et toute la géométrie du palier 3 en dépend au centimètre.
 */
const TABOURET_H = 2.1;
const OEIL_Y = TOIT + TABOURET_H + 1.8 * 0.92 * 4;

/** LA LIGNE : le dessus des faîtières, à 34 m. L'horizon artificiel du tableau. */
const CRETE_D = 34.0;
const CRETE_Y = 20.6;
/** Sa pente apparente vue du tabouret. Tout le reste en découle. */
const K = (CRETE_Y - OEIL_Y) / CRETE_D;

/**
 * LES TROIS CHEMINÉES — profondeur et écart ; la hauteur se déduit. Leurs souches ne font pas
 * la même hauteur (8,10 · 7,97 · 7,85 au-dessus du dallage) et c'est pour ça qu'elles
 * s'alignent : à des distances différentes, seules des hauteurs différentes tombent sur la
 * même ligne, et trois cheminées identiques ne se seraient alignées d'AUCUN point de vue. Les
 * profondeurs sont COURTES — 10, 12, 14 — quand la crête est à 34, et c'est cet écart qui rend
 * l'alignement sensible. Dessiné d'abord avec les mitres à 62 m et la crête à 76, l'écart
 * tombait à un pour cent : on ne voyait rien, et le tabouret ne servait à rien.
 */
const CHEMINEES: { d: number; l: number }[] = [
  { d: 10.0, l: +3.2 }, { d: 12.0, l: -2.5 }, { d: 14.0, l: -5.6 },
];
/** Pied de la mitre : le seul point qui doive tomber sur la ligne. */
const piedMitre = (d: number): number => OEIL_Y + K * d;

/**
 * Profondeur et écart des claies. Les six premières sont dans le cadre de l'œil, vérifié
 * sommet par sommet : au-delà de 0,85 demi-image d'écart la claie sort du champ et la
 * famille bleue cesse d'être lisible, ce qui est arrivé deux fois. Les deux dernières sont
 * derrière la crête, hors du tableau — le toit a plus de tuiles que l'image n'en montre.
 */
const CLAIES: [number, number][] = [
  [17, +7], [21, -8], [22, +2], [25, -9.5], [27, +12], [30, -3.5], [42, +30], [50, -26],
];

/** Une graine fixe : le désordre des pots est le même à chaque partie. */
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/** UN POT. Panse et col, comme au séchoir : un cube ne se lit pas comme une poterie, et trois
 *  boîtes par pot coûteraient cent cinquante boîtes pour rien. `r` ≤ 0,43, `h` ≤ 0,80. */
const pot = (cx: number, cz: number, r: number, h: number): BoxDef[] => [
  box([cx - r, SOL - 0.02, cz - r], [cx + r, SOL + h * 0.62, cz + r], 1, { famille: F_POTS }),
  box([cx - r * 0.66, SOL + h * 0.55, cz - r * 0.66], [cx + r * 0.66, SOL + h, cz + r * 0.66], 1, {
    famille: F_POTS,
  }),
];

/**
 * UNE CLAIE À TUILES : deux longrines et six tuiles de champ. Les longrines n'appartiennent à
 * aucune famille — c'est du bois de couvreur ; on ne peint pas « le meuble », on peint LA
 * TUILE, celle qu'un couvreur soulève. Chaque tuile fait 3,00 en x (la cote de la famille) et
 * 0,22 d'épaisseur, au pas de 0,60 : deux tuiles ne se touchent jamais, et les décalages
 * verticaux par tuile et par claie écartent les plans deux à deux.
 */
const claie = (px: number, pz: number, r: number): BoxDef[] => {
  const out = [
    box([px - 0.2, TOIT, pz - 0.15], [px + 3.2, TOIT + 0.07, pz + 0.15], 3),
    box([px - 0.2, TOIT, pz + 3.17], [px + 3.2, TOIT + 0.09, pz + 3.47], 3),
  ];
  for (let i = 0; i < 6; i++) {
    const y = TOIT + 0.04 + 0.011 * i + 0.004 * r;
    const z = pz + 0.6 * i;
    out.push(box([px, y, z], [px + TUILE, y + 1.98, z + 0.22], 2, { famille: F_TUILES }));
  }
  return out;
};

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // LA MASSE DU BÂTIMENT — une seule boîte de −9 à 14 : son dessus EST le dallage du toit,
  // donc pas une couture sous les pieds du géant. Puis LES QUATRE PARAPETS, quatre hauteurs
  // et quatre profondeurs d'ancrage : aucun plan partagé, et tous ont le dessous noyé.
  out.push(box([-8, -9, 1971], [118, TOIT, 2097], 2, { outline: false }));
  out.push(box([-5.2, 13.55, 1972.2], [115.4, PARAPET_SUD, 1979.6], 2));
  out.push(box([-5.6, 13.62, 2090.4], [115.8, 23.4, 2095.9], 2));
  out.push(box([-6.4, 13.68, 1972.6], [-0.6, 20.6, 2096.2], 2));
  out.push(box([110.4, 13.74, 1972.8], [116.6, 20.9, 2096.4], 2));

  // LA COUR, VINGT MÈTRES PLUS BAS : une dalle d'un seul tenant qui s'enfonce sous le bâtiment
  // (lequel fait le quatrième mur), et trois murs de huit — quatre fois et demie la taille du
  // joueur qui y arrive, donc rien à escalader.
  out.push(box([1.6, -3.4, 1906.2], [70.4, SOL, 1972.4], 1, { outline: false }));
  out.push(box([3.0, -3.0, 1907.0], [69.0, 8.4, 1911.0], 2));
  out.push(box([1.8, -3.1, 1907.4], [5.8, 8.6, 1971.4], 2));
  out.push(box([66.2, -3.2, 1907.6], [70.2, 8.2, 1971.2], 2));

  // L'auvent du tableau : dessous à 3,00, donc un joueur de 1,80 passe avec 1,20 de dégagement
  // et son corps ne pénètre jamais le linteau — voir MESURES.md § « LA CATAPULTE DU LINTEAU ».
  // C'est la SEULE pièce au-dessus d'un passage ; tout le reste est à ciel ouvert pour ça.
  out.push(box([33.4, 3.0, 1911.0], [38.6, 3.4, 1913.4], 3));

  // LE FOUR EN RUCHE : sept assises qui rentrent, trente-huit mètres, vingt-sept au pied.
  // Aucune famille — gris dans les deux tableaux comme dans les deux étages.
  const four: [number, number, number, number, number, number][] = [
    [22.6, -0.4, 1944.8, 49.4, 3.4, 1970.2], [24.0, 3.2, 1946.2, 48.0, 12.6, 1968.8],
    [25.6, 12.4, 1947.8, 46.4, 20.4, 1967.2], [27.8, 20.2, 1950.0, 44.2, 26.2, 1965.0],
    [30.4, 26.0, 1952.6, 41.6, 30.4, 1962.4], [33.0, 30.2, 1955.2, 39.0, 34.6, 1959.8],
    [31.8, 34.4, 1954.0, 40.2, 38.0, 1961.0],
  ];
  for (const [a, b, c, d, e, f] of four) out.push(box([a, b, c], [d, e, f], 2));

  // LA PILE DE TUILES, ADOSSÉE AU FOUR : sept tuiles à plat séparées de 2,3 cm, donc leurs
  // faces ne se rencontrent jamais. C'est l'objet du refus, 3,00 contre un seuil de 0,99.
  for (let i = 0; i < 7; i++) {
    const x = 26.5 + 0.04 * (i % 3);
    const y = SOL + 0.02 + 0.163 * i;
    out.push(box([x, y, 1938.0], [x + 1.9, y + 0.14, 1938.0 + TUILE], 2, { famille: F_TUILES }));
  }

  // LES POTS DE LA COUR. Cinq sur la planche, devant le cadre : à cinq mètres de l'objectif
  // chacun occupe un neuvième de la largeur de l'image, et une famille qu'on ne distingue pas
  // dans le tableau n'est pas une énigme, c'est une devinette. Sept autres au sol, jusqu'à
  // trente mètres : la bascule balaie la cour entière, et non un coin.
  out.push(box([32.6, SOL, 1916.4], [39.6, SOL + 0.75, 1917.6], 3));
  const r = rng(20824131);
  for (const x of [33.4, 34.8, 36.3, 37.8, 39.0]) {
    out.push(...pot(x, 1917.0 + (r() - 0.5) * 0.3, 0.2 + r() * 0.12, 0.34 + r() * 0.2));
  }
  const AU_SOL: [number, number][] = [
    [28.5, 1926], [33, 1931], [43, 1931], [45, 1936], [30, 1940], [38, 1943], [44, 1946],
  ];
  for (const [x, z] of AU_SOL) out.push(...pot(x, z, 0.28 + r() * 0.15, 0.42 + r() * 0.38));

  // LE CHAMP DE CLAIES DU TOIT.
  CLAIES.forEach(([d, l], i) => out.push(...claie(...vue(d, l), i)));

  // LA CRÊTE DE SÉCHAGE : un mur de biais, à 34 m de l'œil, sur lequel on met les faîtières à
  // durcir. Son dessus est à 19,58, soit 5,58 au-dessus du dallage, donc AU-DELÀ du saut d'un
  // géant (5,18) : on ne monte pas sur la crête, et l'on ne triche donc pas avec le point de
  // vue en s'y perchant — quarante centimètres de marge, mesurés, et c'est la seule raison de
  // cette hauteur-là. Trente-quatre plots qui se mordent de treize centimètres (bout à bout
  // ils partageraient une face) ; le dessus alterne entre 19,58 et 19,54.
  for (let k = 0; k < 34; k++) {
    const [x, z] = vue(CRETE_D, -21 + 1.2727 * k);
    out.push(box([x - 0.67, 13.7, z - 0.9], [x + 0.67, 19.58 - 0.04 * (k % 2), z + 0.9], 2));
  }
  // Quinze faîtières au pas de 2,70 pour une longueur de 2,60 : dix centimètres de jour
  // entre deux, donc jamais deux flancs dans le même plan. Leur DESSUS est à 20,60 : LA LIGNE.
  for (let k = 0; k < 15; k++) {
    const [x, z] = vue(CRETE_D, -20 + 2.8506 * k);
    out.push(box([x - FAITIERE / 2, 19.5, z - 0.53], [x + FAITIERE / 2, CRETE_Y, z + 0.53], 3, {
      famille: F_FAITIERES,
    }));
  }

  // LES TROIS CHEMINÉES. La souche est de la brique et n'appartient à rien ; la MITRE est la
  // coiffe de terre cuite — collerette et chapeau — et c'est elle, la famille : ce qu'on a
  // cuit dans ce four-là, et qu'un couvreur pose à la main.
  for (const { d, l } of CHEMINEES) {
    const [x, z] = vue(d, l);
    const y = piedMitre(d);
    out.push(box([x - 1.1, TOIT, z - 1.1], [x + 1.1, y + 0.05, z + 1.1], 2));
    out.push(box([x - MITRE / 2, y, z - MITRE / 2], [x + MITRE / 2, y + 0.62, z + MITRE / 2], 3, {
      famille: F_MITRES,
    }));
    out.push(box([x - 0.86, y + 0.55, z - 0.86], [x + 0.86, y + MITRE, z + 0.86], 3, {
      famille: F_MITRES,
    }));
  }

  // LE TABOURET DU PEINTRE. Une caisse de bois posée là. Rien ne l'annonce, il n'est ni au
  // centre ni sur un axe : une chose de plus sur un toit encombré. On ne peut pas savoir que
  // c'est le bon endroit avant d'y être — et en y montant, tout se referme.
  out.push(
    box([OEIL_X - 1.7, TOIT, OEIL_Z - 1.7], [OEIL_X + 1.7, TOIT + TABOURET_H, OEIL_Z + 1.7], 3),
  );

  return out;
};

// LES DEUX TABLEAUX SONT CARRÉS, et ce n'est pas un goût : la prise se fait dans une cible de
// 512 × 512 avec une caméra de rapport 1, donc une toile plus large que haute étirerait l'image
// et le tableau mentirait sur ce qu'on lui demande — montrer la pièce. Le second est quatre
// fois plus grand que le premier : on le lit avec des yeux à 6,62 m du sol.

/**
 * PALIER 2 — LE TABLEAU DE LA COUR. Point de vue non déclaré : il est peint depuis son propre
 * mur, seul point de vue qu'un joueur retrouve sans le chercher — il lit, il se retourne,
 * l'image se referme ; pour la salle qui inaugure l'aller-retour, faire de l'angle une
 * question serait une seconde inconnue. Champ de 58°, donc un demi-champ qui ouvre de 0,554
 * par mètre : les pots à cinq mètres (chacun 11 % de la largeur), la pile de tuiles à
 * vingt-huit mètres sur la gauche, le four qui en prend 44 %. Cadre de 1,10 centré à 1,60.
 */
const tableauCour: TableauDef = {
  id: 'haut-tableau-cour',
  position: [36, 1.6, 1911.05],
  yaw: 0,
  largeur: 1.1,
  hauteur: 1.1,
  attendu: { [F_POTS]: 'rouge', [F_TUILES]: 'bleu' },
};

/**
 * PALIER 3 — LE TABLEAU DE L'ŒIL, peint depuis le tabouret et de nulle part ailleurs.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * CE QUE LA COMPOSITION FAIT QUAND ELLE SE REFERME. De ce point-là, et de ce point-là
 * seulement, LE PIED DES TROIS MITRES SE POSE EXACTEMENT SUR LA LIGNE DES FAÎTIÈRES —
 * mesuré : les trois pieds et le dessus des quinze faîtières tombent tous à 0,1442 de la
 * demi-image, à zéro près. La crête, qui est de biais sur le toit et qui a l'air posée de
 * travers de partout ailleurs, redevient une horizontale franche en travers du cadre ; les
 * trois coiffes se dressent au-dessus d'elle, détachées, et la couronne du four monte entre
 * la première et la deuxième. Quatre masses sans rapport deviennent un rang.
 *
 * D'un pas de côté, ou simplement en descendant du tabouret, les trois pieds remontent de
 * 0,16, 0,20 et 0,27 de demi-image — jusqu'à 13 % de la hauteur du cadre, et de trois
 * quantités différentes, donc le rang lui-même se rompt. La ligne verte coupe alors les
 * mitres à mi-corps, et le vert et le rouge ne font plus qu'une seule masse dont personne ne
 * peut dire où l'une finit et où l'autre commence. Voilà l'énigme : le tableau montre UNE
 * ligne verte et TROIS coiffes rouges, et il faut trouver d'où quelqu'un regardait pour
 * savoir laquelle est laquelle.
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * `regarde` vise le flanc du four à mi-hauteur : la visée pique de 1,04°, ce qui met le
 * dallage hors cadre en deçà de seize mètres. Les claies bleues occupent tout le bas, la crête
 * verte barre le tiers inférieur, les mitres rouges le tiers médian, le four le milieu.
 */
const tableauOeil: TableauDef = {
  id: 'haut-tableau-oeil',
  position: [70, 20.4, 2090.35],
  // Normale = (sin yaw, 0, cos yaw). yaw = π → −z, donc face au toit.
  yaw: Math.PI,
  largeur: 4.4,
  hauteur: 4.4,
  attendu: { [F_TUILES]: 'bleu', [F_FAITIERES]: 'vert', [F_MITRES]: 'rouge' },
  oeil: [OEIL_X, OEIL_Y, OEIL_Z],
  regarde: [FOUR_X, 25.0, FOUR_Z],
};

// LA PORTE INTERNE — le seul chemin entre les deux étages. PAS DE `condition`, PAS DE
// `miroir`, PAS DE `dessinee` : on la franchit autant qu'on veut, dans les deux sens.
//
// L'ORIENTATION SE RAISONNE À L'ENVERS (`Simulation.findCrossing` : d0 > 0 puis d1 ≤ 0) — on
// franchit une face en marchant CONTRE sa normale, en venant de son avant, et l'on ressort
// DEVANT sa jumelle en marchant DANS le sens de celle-ci. Grande face (z = 2020, normale
// +z) : on l'aborde depuis le nord, donc depuis le toit, et l'on ressort devant la petite,
// au sud de 1926, dans la cour, marchant vers le sud — le cadre du palier 2 est alors à
// quinze mètres droit devant. Petite face (z = 1926, normale −z) : on l'aborde depuis le sud
// de la cour, et l'on ressort au nord de 2020 avec soixante-dix mètres de dallage devant soi.
//
// ET CHAQUE FACE N'EST ATTEIGNABLE QU'À LA BONNE TAILLE, ce qui est la vraie élégance du
// montage : la grande est sur le toit, où l'on n'arrive qu'à ×4 ; la petite est dans la cour,
// où l'on n'arrive qu'à ×1. Un joueur à ×1 ne peut donc jamais franchir la grande face et
// tomber à ×1/4 dans une salle qui n'a rien prévu pour lui — non qu'on le lui interdise, mais
// parce qu'il ne peut pas aller là où elle est.
//
// Les deux faces sont à quatre-vingt-quinze mètres l'une de l'autre et vingt de dénivelé, et
// toutes deux à plus de cinquante mètres de `entree` et de `sortie` : deux portes plantées au
// même point se disputent le passage, et l'on traverse celle qu'on ne voulait pas. Les pieds
// tombent sur les pieds, enfin, `transformPoint` multipliant l'écart vertical par le rapport
// d'échelle : une face à 14,00 et l'autre à 0,00 se raccordent exactement.
const portes: PortalPairDef[] = [
  {
    id: 'haut-descente',
    colorBig: 0xb4553a,
    colorSmall: 0x2f4b7c,
    // 2,80 × 1,90 : la porte d'origine du jeu, donc une grande face de 11,20 × 7,60. Un joueur
    // à ×4 y passe (il lui faut 7,22 de haut et 2,74 de large) ; à ×1 il passe dans la petite.
    smallHeight: 2.8,
    smallWidth: 1.9,
    big: { position: [96, TOIT, 2020], yaw: 0 },
    small: { position: [40, SOL, 1926], yaw: Math.PI },
  },
];

export const ATELIER_HAUT: SalleModule = {
  nom: NOM,

  region: {
    name: NOM,
    min: [-40, -40, 1900],
    max: [200, 120, 2140],
    // Un lavis d'argile et de chaux, peint d'emblée : pas de `pigment`, voir l'en-tête.
    paper: '#f4f0e7',
    // Lait de chaux · terre battue de la cour · brique cuite grise (murs, parapets, LE FOUR) ·
    // bois du couvreur et terre cuite, qui est l'accent.
    colors: ['#efe9dd', '#cfc4ae', '#8f8674', '#6b6152'],
    ink: '#26221c',
    // La visée du palier 3 porte à cent trente et un mètres, du tabouret au four : un
    // brouillard plus court en mangerait le sommet, donc le repère lui-même.
    brouillard: 320,
  },

  bounds: { min: [-40, -40, 1900], max: [200, 120, 2140] },
  boxes: decor(),
  tableaux: [tableauCour, tableauOeil],
  portals: portes,

  // Le toit d'abord : il vole, le joueur marche, et il est déjà au-dessus des cheminées quand
  // on arrive. Puis la grande face, seule ouverture sur la cour ; puis en bas le cadre et la
  // pile qui refuse ; puis la crête, le tabouret, la sortie.
  stations: [
    [92, 17.5, 2072], [76.5, 26.0, 2069.8], [96, 18.0, 2023],
    [40, 2.4, 1922], [36, 2.0, 1914], [27.5, 3.0, 1939.5],
    [67, 22.0, 2049.8], [OEIL_X, 19.0, OEIL_Z], [16, 17.5, 2070],
  ],

  // TROIS STATIONS SONT DANS LA COUR, ET IL Y A VINGT MÈTRES DE MAÇONNERIE
  // ENTRE ELLES ET LE TOIT. Le Pinceau vole et ne connaît pas les murs : sans
  // cette ligne il les traverse en droite ligne, et l'on ne lit plus « suis-moi »
  // mais « il s'est téléporté ». Il passe donc par la porte de la salle, comme
  // le joueur — et il montre du même coup par où descendre, ce qui est
  // exactement son métier.
  stationsPorte: [
    null, null, null,
    'haut-descente', 'haut-descente', 'haut-descente',
    'haut-descente', null, null,
  ],

  // ON ENTRE ET L'ON SORT À ×4, SUR LE TOIT. `echelle` EST UN PALIER, PAS UN MULTIPLICATEUR :
  // −1 = ×1/4, 0 = ×1, 1 = ×4, 2 = ×16. L'entrée est au nord-est, dos aux claies : on arrive et
  // l'on ne voit qu'un toit encombré de tuiles trop grandes pour un homme, ce qu'il faut
  // justement ne pas comprendre tout de suite. La sortie est soixante-seize mètres à l'ouest.
  entree: { position: [92, TOIT + 0.02, 2076], echelle: 1 },
  sortie: { position: [16, TOIT + 0.02, 2074], echelle: 1 },
};

/**
 * Les cotes du calibrage, pour que personne ne retouche un nombre « à l'œil » : les seuils de
 * peinture, les quatre cotes de familles, le saut d'un géant (auquel tout parapet et toute
 * crête d'ici est supérieur), l'œil du tabouret, la ligne, et le pied de chaque mitre.
 */
export const CALIBRAGE_ATELIER_HAUT = {
  seuilsDePeinture: [0.99, 3.96],
  familles: { pot: POT, tuile: TUILE, faitiere: FAITIERE, mitre: MITRE },
  sautDuGeant: 5.18,
  oeil: OEIL_Y,
  ligne: K,
  piedsDeMitres: CHEMINEES.map(({ d }) => piedMitre(d)),
};
