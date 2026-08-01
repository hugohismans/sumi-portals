import type { BoxDef, LevelDef } from '../core/types.js';
import { BELVEDERE } from './regions/belvedere.js';
import { TERRASSE } from './regions/terrasse.js';

/**
 * LE MONDE — un voyage en spirale.
 *
 * Pas une succession de niveaux : un seul lieu continu, qu'on parcourt en
 * changeant de taille. Chaque étage franchi révèle le précédent VU D'EN HAUT.
 * Le village où l'on marchait devient une maquette ; la terrasse d'où on le
 * contemplait devient à son tour une dalle posée en contrebas.
 *
 * L'ANCRE : l'Aiguille. Une tour effilée plantée à l'origine du monde, visible
 * depuis les trois étages. À taille normale c'est un colosse qu'on ne peut pas
 * gravir ; depuis la terrasse c'est un mât ; depuis le belvédère on en surplombe
 * la pointe. C'est elle qui tient la promesse du voyage : quelque chose de
 * reconnaissable qui revient, et dont le seul changement est le regard qu'on
 * porte dessus.
 *
 * LA RÈGLE DE TRACÉ, à respecter pour toute région ajoutée :
 * **chaque étage doit voir le précédent.** Un portail qui ne dépose pas en
 * surplomb de là où l'on était fait perdre tout l'intérêt du voyage.
 *
 * LE RETOUR : chaque étage est relié au précédent par un escalier dont les
 * marches sont calibrées pour la taille de cet étage. Un géant remonte à pied
 * ce qu'un joueur normal ne peut pas gravir. Ce n'est pas un détail de confort :
 * sans lui, un joueur qui saute de la terrasse se retrouverait piégé en bas,
 * trop grand pour la petite porte et trop petit pour remonter.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARCELLES RÉSERVÉES — contrat pour la fabrication en parallèle
 *
 * Chaque région occupe une boîte de coordonnées qui n'appartient qu'à elle.
 * Deux régions ne peuvent donc pas se percuter, même écrites séparément.
 *
 *   village     x [-90,  90]   y [ -6,  28]   z [-110,  16]   échelle ×1
 *   escalier A  x [ 44,  86]   y [ -6,  30]   z [  14,  52]   ×1 → ×4
 *   terrasse    x [-90,  90]   y [ 24,  118]  z [  46, 130]   échelle ×4
 *   escalier B  x [ 38,  92]   y [ 24, 120]   z [ 126, 200]   ×4 → ×16
 *   belvédère   x [-260, 260]  y [ 114, 300]  z [ 190, 380]   échelle ×16
 * ═══════════════════════════════════════════════════════════════════════════
 */

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean; region?: string } = {},
): BoxDef => ({ min, max, ink, ...opts });

/** Tout ce qui appartient aux hauteurs porte ses couleurs. */
const haut = <T extends BoxDef>(b: T): T => ({ ...b, region: 'hauteurs' });

// --- Altitudes des trois étages ---------------------------------------------
const VILLAGE_Y = 0;
const TERRASSE_Y = 30;
const BELVEDERE_Y = 120;

/** Hauteur de l'Aiguille. Sa pointe passe JUSTE sous l'œil du belvédère. */
const AIGUILLE_H = 110;

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * Escalier à marches calibrées : franchissable à une taille, mur à l'autre.
 * `rise` est la hauteur de marche ; un joueur l'enjambe si elle est inférieure
 * à la moitié de sa propre taille.
 */
const escalier = (
  x0: number,
  x1: number,
  zStart: number,
  yStart: number,
  yEnd: number,
  rise: number,
  depth: number,
  ink: number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  const n = Math.ceil((yEnd - yStart) / rise);
  for (let i = 0; i < n; i++) {
    const y = yStart + (i + 1) * rise;
    const z = zStart + i * depth;
    out.push(box([x0, yStart - 4, z], [x1, Math.min(y, yEnd), z + depth], ink));
  }
  return out;
};

/**
 * BALUSTRADE — on ne passe pas, mais on voit.
 *
 * Un parapet plein résolvait la chute et créait pire : depuis le bord de la
 * terrasse, il masquait le village. Or c'est LA seule chose qui justifie d'être
 * monté. Protéger en aveuglant, c'est perdre le sujet.
 *
 * Des montants serrés règlent les deux : l'écart est plus étroit que le joueur,
 * donc il ne passe pas ; et l'on voit entre eux. La hauteur dépasse son saut,
 * pour qu'il ne puisse pas non plus monter dessus.
 *
 * `gap` doit rester sous le DIAMÈTRE du joueur de l'étage — 2,7 à ×4, 10,9 à
 * ×16 — et `h` au-dessus de son saut : 5,2 et 20,7.
 */
const balustrade = (
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  h: number,
  gap: number,
  post: number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  const long = x1 - x0 > z1 - z0;
  const from = long ? x0 : z0;
  const to = long ? x1 : z1;
  // Les montants s'arrêtent SOUS la lisse, qui les coiffe en débordant. Sans ce
  // décalage, leurs faces hautes et latérales seraient exactement coplanaires
  // avec celles de la lisse — et deux surfaces au même endroit, c'est le
  // grésillement qu'on a déjà chassé deux fois.
  const hp = h - 0.35 * (post / 0.7);
  for (let t = from; t < to; t += gap + post) {
    const a = t;
    const b = Math.min(t + post, to);
    out.push(
      long ? box([a, y - 2, z0], [b, y + hp, z1], 3) : box([x0, y - 2, a], [x1, y + hp, b], 3),
    );
  }
  // Lisse haute, débordante de tous côtés : elle relie les montants et donne au
  // bord sa ligne d'encre.
  const o = post * 0.22;
  out.push(box([x0 - o, y + hp - post * 0.5, z0 - o], [x1 + o, y + h, z1 + o], 3));
  return out;
};

/**
 * LE VILLAGE.
 *
 * Il ne suffit pas de semer des boîtes : il faut que ça fasse un LIEU, qu'on
 * s'y repère, et qu'on le reconnaisse plus tard vu d'en haut. Trois choses y
 * suffisent, et ce sont celles de n'importe quel village réel.
 *
 * **Une rue.** Un axe qu'on suit sans y penser. Elle part de la place, sous
 * l'Aiguille, et descend droit vers la porte étroite : le chemin est lisible
 * sans qu'on l'explique.
 *
 * **Une place.** Un vide au milieu du plein. C'est le vide qui se reconnaît
 * d'en haut, pas les maisons — vu de la terrasse, c'est cette trouée claire
 * autour de l'Aiguille qui dira « c'est là que j'étais ».
 *
 * **Des repères qu'on nomme.** Le puits, l'étang, les étals. On ne dit pas
 * « la maison numéro sept », on dit « près du puits ».
 */

/** Maison : un corps et une toiture débordante, qui pose la ligne d'encre. */
const maison = (cx: number, cz: number, w: number, d: number, h: number, ink: number): BoxDef[] => [
  box([cx - w, -0.6, cz - d], [cx + w, h, cz + d], ink),
  box([cx - w - 0.7, h - 0.15, cz - d - 0.7], [cx + w + 0.7, h + 0.55, cz + d + 0.7], 2),
];

/** Lanterne : un mât et sa boîte de lumière. Elles donnent son rythme à la rue. */
const lanterne = (cx: number, cz: number): BoxDef[] => [
  box([cx - 0.16, 0, cz - 0.16], [cx + 0.16, 2.6, cz + 0.16], 2),
  box([cx - 0.42, 2.6, cz - 0.42], [cx + 0.42, 3.3, cz + 0.42], 3),
];

const village = (): BoxDef[] => {
  const r = rng(31415);
  const out: BoxDef[] = [];

  // --- La place, au pied de l'Aiguille -------------------------------------
  // Un dallage à peine surélevé. C'est la trouée qu'on reconnaîtra d'en haut.
  out.push(box([-19, -0.5, -27], [19, 0.25, 9], 1));
  out.push(box([-19, -0.5, -27], [-17.6, 0.7, 9], 3));
  out.push(box([17.6, -0.5, -27], [19, 0.7, 9], 3));

  // --- La rue, de la place à la porte ---------------------------------------
  out.push(box([-6, -0.5, -74], [6, 0.2, -27], 1));
  for (let z = -32; z >= -68; z -= 11) {
    out.push(...lanterne(-7.4, z), ...lanterne(7.4, z));
  }

  // --- Les maisons qui la bordent -------------------------------------------
  // Alignées mais jamais identiques : c'est l'irrégularité qui fait une rue.
  for (let z = -31; z >= -70; z -= 12) {
    for (const cote of [-1, 1]) {
      const w = 4 + r() * 2.4;
      const d = 3.6 + r() * 2.2;
      const h = 4 + r() * 4.5;
      out.push(...maison(cote * (9 + w), z + (r() - 0.5) * 3, w, d, h, 1 + ((r() * 2) | 0)));
    }
  }

  // --- La maison basse : le premier vrai obstacle ---------------------------
  //
  // Son toit culmine à 3,4. À taille normale c'est hors d'atteinte — on saute
  // à 1,3. Une fois quatre fois plus grand, l'enjambée fait 3,6 : ce qui était
  // un toit devient une marche. C'est là que le pinceau se pose, et c'est là
  // que le joueur comprend la règle du jeu sans qu'on lui dise un mot.
  out.push(box([-31, -0.6, -25], [-17, 3.0, -15], 1));
  out.push(box([-31.8, 2.85, -25.8], [-16.2, 3.4, -14.2], 3));

  // --- Le puits, sur la place -----------------------------------------------
  const px = 12;
  const pz = -18;
  out.push(box([px - 2, 0, pz - 2], [px + 2, 1.5, pz + 2], 2));
  out.push(box([px - 1.2, 1.5, pz - 1.2], [px + 1.2, 1.8, pz + 1.2], 0));
  out.push(box([px - 1.9, 0, pz - 0.3], [px - 1.5, 4.4, pz + 0.3], 2));
  out.push(box([px + 1.5, 0, pz - 0.3], [px + 1.9, 4.4, pz + 0.3], 2));
  out.push(box([px - 2.7, 4.2, pz - 1.6], [px + 2.7, 5.1, pz + 1.6], 3));

  // --- Le marché : des étals bas, serrés ------------------------------------
  for (let i = 0; i < 5; i++) {
    const ex = -44 + (i % 3) * 8;
    const ez = -10 - ((i / 3) | 0) * 9;
    out.push(box([ex - 2.6, 0, ez - 2], [ex + 2.6, 1.1, ez + 2], 1));
    out.push(box([ex - 3.2, 2.3, ez - 2.6], [ex + 3.2, 2.8, ez + 2.6], 3));
    out.push(box([ex - 3.1, 0, ez - 2.5], [ex - 2.7, 2.4, ez - 2.1], 2));
    out.push(box([ex + 2.7, 0, ez - 2.5], [ex + 3.1, 2.4, ez - 2.1], 2));
  }

  // --- L'étang : un creux d'eau claire ---------------------------------------
  // La seule surface pâle du village : c'est elle qui brillera d'en haut.
  out.push(box([28, -3, -58], [50, -1.1, -36], 0));
  out.push(box([27, -3, -59], [28, 0.6, -35], 2));
  out.push(box([50, -3, -59], [51, 0.6, -35], 2));
  out.push(box([27, -3, -59], [51, 0.6, -58], 2));
  out.push(box([27, -3, -36], [51, 0.6, -35], 2));

  // --- Quelques maisons à l'écart, pour que le village ait des bords ---------
  for (const [cx, cz] of [[-38, -46], [-30, -62], [-48, -70], [34, -18], [44, -26], [24, -74]]) {
    const w = 3.4 + r() * 2;
    const d = 3.4 + r() * 2;
    out.push(...maison(cx, cz, w, d, 4 + r() * 4, 1 + ((r() * 2) | 0)));
  }

  return out;
};

export const MONDE: LevelDef = {
  name: 'Le monde',
  spawn: [0, 0.3, -26],
  // Face à l'Aiguille : la toute première image du jeu doit être le colosse
  // qu'on ne peut pas gravir. C'est lui qu'on retrouvera plus tard sous ses
  // pieds, et il faut l'avoir regardé d'en bas pour que ça compte.
  spawnYaw: 0,

  // DEUX MONDES, UNE MAIN.
  //
  // Le village est chaud, ocre, terrien. Les hauteurs sont froides, pâles,
  // minérales. Même trait d'encre, mêmes aplats, même grain de papier — seules
  // les teintes changent. C'est ce qui permet de traverser sans avoir
  // l'impression de changer de jeu, tout en changeant d'univers.
  //
  // Et l'on voit ces couleurs À TRAVERS le portail avant d'y entrer : c'est là
  // que la promesse se fait.
  regions: [
    // Le jardin d'abord : sa parcelle est incluse dans celle des hauteurs, et
    // c'est la première trouvée qui gagne. Même papier de part et d'autre, donc
    // le passage de l'une à l'autre ne se voit pas — seuls les aplats changent.
    TERRASSE.region,
    BELVEDERE.region,
    {
      name: 'hauteurs',
      min: [-300, 20, 40],
      max: [300, 320, 420],
      paper: '#dde3e6',
      colors: ['#d6dee2', '#b6c2c9', '#7c8b95', '#c05a3c'],
      ink: '#1a2126',
    },
  ],

  boxes: [
    // --- Étage 1 : le village -------------------------------------------------
    box([-230, -6, -300], [230, VILLAGE_Y, 16], 0, { outline: false }),

    // L'Aiguille. Colosse ici, mât depuis la terrasse, piquet depuis le
    // belvédère : c'est le même objet, et c'est tout le propos du voyage.
    box([-3, -6, -3], [3, AIGUILLE_H, 3], 2),
    box([-4.4, AIGUILLE_H - 1, -4.4], [4.4, AIGUILLE_H + 3, 4.4], 3),

    ...village(),

    // --- Escalier A : ×1 le regarde, ×4 le gravit -----------------------------
    // Marches de 3 : infranchissables à taille normale (enjambée 0,9),
    // triviales une fois quatre fois plus grand (enjambée 3,6).
    ...escalier(46, 84, 14, VILLAGE_Y, TERRASSE_Y, 3, 3.6, 3),

    // --- Étage 2 : la terrasse ------------------------------------------------
    // Son bord sud est une falaise : c'est de là qu'on découvre le village.
    // Écartée du village : plaquée juste au-dessus, elle l'écrasait au lieu de
    // le dominer. De loin elle devient une promesse — on voit où l'on va.
    box([-90, TERRASSE_Y - 8, 46], [90, TERRASSE_Y, 130], 0, { outline: false, region: 'hauteurs' }),
    // Balustrade : on ne passe pas, on voit entre les montants. Brèches aux
    // arrivées d'escalier.
    ...balustrade(-88.4, 44, 47.3, 48.7, TERRASSE_Y, 6, 1.7, 0.7).map(haut),
    ...balustrade(86, 88.4, 47.3, 48.7, TERRASSE_Y, 6, 1.7, 0.7).map(haut),
    ...balustrade(-88.4, 38, 127.3, 128.7, TERRASSE_Y, 6, 1.7, 0.7).map(haut),
    ...balustrade(-88.7, -87.3, 47.3, 128.7, TERRASSE_Y, 6, 1.7, 0.7).map(haut),
    ...balustrade(87.3, 88.7, 47.3, 128.7, TERRASSE_Y, 6, 1.7, 0.7).map(haut),

    // Le jardin sec, posé sur la dalle. Région autonome : voir regions/terrasse.ts.
    ...TERRASSE.boxes,

    // --- Escalier B : ×4 le regarde, ×16 le gravit ----------------------------
    // Marches de 12 : mur pour un joueur de 7,2, marche pour un joueur de 28,8.
    ...escalier(40, 90, 126, TERRASSE_Y, BELVEDERE_Y, 12, 9, 2).map(haut),

    // --- Étage 3 : le belvédère -----------------------------------------------
    box([-260, BELVEDERE_Y - 20, 190], [260, BELVEDERE_Y, 380], 0, { outline: false, region: 'hauteurs' }),
    // Même principe à ×16, à l'échelle de l'étage.
    ...balustrade(-255, 36, 193, 196, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),
    ...balustrade(94, 255, 193, 196, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),
    ...balustrade(-256, -253, 193, 377, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),
    ...balustrade(253, 256, 193, 377, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),
    ...balustrade(-255, 255, 374, 377, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),

    // Le sommet du voyage. Région autonome : voir regions/belvedere.ts.
    ...BELVEDERE.boxes,
  ],

  portals: [
    {
      // Paire A — taillée pour un joueur normal. Petite porte au village,
      // grand torii sur la terrasse : on ressort EN SURPLOMB du village.
      id: 'ascension-1',
      colorBig: 0xc8492e,
      colorSmall: 0x2f4b7c,
      smallHeight: 2.8,
      smallWidth: 1.9,
      small: { position: [0, VILLAGE_Y, -40], yaw: 0 }, // normale +Z
      big: { position: [0, TERRASSE_Y, 110], yaw: Math.PI }, // normale -Z, regarde le village
    },
    {
      // Paire B — quatre fois plus grande, pour le joueur déjà quatre fois plus
      // grand. C'est ce qui permet de continuer à monter : une seule paire ne
      // franchirait jamais qu'un cran.
      id: 'ascension-2',
      colorBig: 0xc8492e,
      colorSmall: 0x2f4b7c,
      smallHeight: 11.2,
      smallWidth: 7.6,
      // AU SUD du grand torii de la paire A, et c'est capital : placée
      // derrière lui, on le retraversait en allant la chercher — et l'on
      // rapetissait aussitôt, renvoyé au village. Un portail déjà franchi doit
      // toujours rester DERRIÈRE soi.
      small: { position: [0, TERRASSE_Y, 70], yaw: Math.PI }, // normale -Z, prise en montant
      big: { position: [0, BELVEDERE_Y, 300], yaw: Math.PI }, // normale -Z, regarde tout
    },
  ],

  goal: { position: [0, BELVEDERE_Y + 2, 240], radius: 16 },

  // LES STATIONS DU PINCEAU — c'est le fil du jeu.
  //
  // Il se tient à chacune, vous laisse approcher, puis file vers la suivante
  // EN VOLANT. À vous de trouver votre propre route : la première étape se
  // rejoint en marchant, la deuxième exige de franchir la porte du village.
  // L'écart entre son vol et vos jambes, c'est l'énigme.
  guide: [
    // 1. Sur la place, à hauteur d'homme. On le rejoint en marchant : c'est la
    //    leçon gratuite, celle qui installe la règle.
    [6, VILLAGE_Y, -14],

    // 2-4. Le jardin sec de la terrasse. Le pinceau passe la petite porte sous
    //      vos yeux : c'est l'invitation, et la seule route possible. On le
    //      suit à ×4, on tourne dans son jardin.
    //
    //      L'ORDRE COMPTE, et pas pour la narration : ces trois stations sont
    //      AU NORD de la seconde porte, qui ne se déclenche qu'en montant vers
    //      le nord. Visitées maintenant — donc en arrivant par le nord et en
    //      redescendant vers le sud — on la longe sans jamais l'ouvrir. Placées
    //      après le toit, il fallait remonter du sud vers elles et l'on
    //      franchissait la porte par accident, expédié au belvédère en plein
    //      milieu du jardin.
    ...TERRASSE.stations,

    // 5. Retour au village, sur le toit de la maison basse — celui qu'on
    //    regardait tout à l'heure sans pouvoir y monter. On redescend
    //    l'escalier et le toit n'est plus qu'une marche : le monde n'a pas
    //    changé, c'est vous. C'est le cœur du jeu, et il fallait avoir habité
    //    le village à taille d'homme pour que le retour ait un poids.
    [-24, 3.4, -20],

    // 6. Devant la seconde porte, côté sud. Le pinceau s'y pose et derrière lui
    //    se dresse le grand torii : rien à expliquer.
    [0, TERRASSE_Y, 58],

    // 7-9. Le belvédère, d'où l'on voit tout ce qu'on vient de parcourir.
    //      Ses deux dernières stations sont au NORD du grand torii, mais très à
    //      l'écart de son axe (x=150 puis x=-192, pour une porte large de 30) :
    //      aucune route naturelle ne repasse dedans. Et si quelqu'un s'entête à
    //      remonter par le milieu, il redescend d'un étage — l'escalier le
    //      ramène. Contrariant, jamais bloquant.
    ...BELVEDERE.stations,
  ],

  hints: [
    {
      position: [0, VILLAGE_Y, -24],
      radius: 16,
      text: 'Le pinceau. Rejoins-le.',
    },
    {
      position: [0, VILLAGE_Y, -40],
      radius: 14,
      text: 'Il s’est posé trop haut. Mais il existe un moyen de grandir.',
    },
    {
      position: [0, TERRASSE_Y, 90],
      radius: 30,
      text: 'Retourne-toi : le village est là, en bas. Tu y marchais il y a un instant.',
    },
    {
      position: [0, TERRASSE_Y, 70],
      radius: 20,
      text: 'Une autre porte, quatre fois plus grande. Le voyage continue.',
    },
    {
      position: [0, BELVEDERE_Y, 260],
      radius: 50,
      text: 'D’ici, l’Aiguille n’est plus qu’un piquet. Et pourtant tu ne pouvais pas la gravir.',
    },
  ],
};
