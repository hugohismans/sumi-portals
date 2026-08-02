import type { BoxDef, LevelDef } from '../core/types.js';
import { BELVEDERE } from './regions/belvedere.js';
import { JARDIN, SOMMET_DU_TAS } from './regions/jardin.js';
import { ROUGE } from './regions/rouge.js';
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
 *   jardin      x [ 300, 520]  y [ -6,  60]   z [-120, 100]   échelle ×1/4
 *   côte rouge  x [-520,-300]  y [ -6, 120]   z [-120, 100]   échelle ×4
 *
 * Le jardin est à part : il n'est pas un étage de la spirale mais un DÉTOUR.
 * On y descend d'un cran au lieu de monter, et l'on en revient par où l'on est
 * entré. Il est donc volontairement absent du guide du Pinceau — c'est un lieu
 * qu'on trouve, pas un lieu où l'on est mené.
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
    // LE DERNIER GRADIN S'ARRÊTE 12 CM SOUS L'ÉTAGE QU'IL DESSERT.
    //
    // Écrêté à `yEnd` tout rond, sa face supérieure tombait dans le plan exact
    // de la dalle d'arrivée. Deux faces confondues se disputent la profondeur,
    // et vues en enfilade depuis le haut des marches, ça donnait une grande
    // écharpe scintillante en travers de la terrasse.
    //
    // Enfoncé de 12 cm, le gradin disparaît simplement DANS la dalle : plus
    // aucune face commune, et rien à voir puisque c'est la dalle qui fait le
    // sol à cet endroit. Douze centimètres ne se sentent à aucune échelle —
    // le plus petit joueur du jeu enjambe déjà 22 cm.
    out.push(box([x0, yStart - 4, z], [x1, Math.min(y, yEnd - 0.12), z + depth], ink));
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

/**
 * LA MAQUETTE — la seule chose du jeu qui explique quelque chose, et elle le
 * fait sans un mot.
 *
 * Problème constaté en jouant : on arrive face à l'Aiguille, on la voit, elle
 * est immense — et l'on n'a aucune raison de penser qu'elle a un rapport avec
 * quoi que ce soit. Elle est du décor. On se retourne, on trouve les portes, on
 * part, et le sommet ne sera jamais un objectif parce qu'il n'a jamais été
 * présenté comme tel.
 *
 * D'où ceci : une réduction de l'Aiguille, à hauteur d'œil, sur un socle au
 * pied de la vraie. Et sur sa pointe minuscule, un encrier. On regarde la
 * maquette, on lève les yeux, on voit la même pointe, vide. La phrase
 * « il faut porter quelque chose là-haut » n'a jamais été écrite nulle part, et
 * pourtant elle a été dite.
 *
 * C'est aussi le sujet du jeu tout entier, posé dès la première minute : un
 * monde qu'on regarde d'abord en modèle réduit, et qu'on finira par parcourir
 * en vrai.
 */
const maquette = (cx: number, cz: number): BoxDef[] => [
  // Le socle, à hauteur de table pour un joueur de 1,80.
  box([cx - 1.35, -0.4, cz - 1.35], [cx + 1.35, 0.78, cz + 1.35], 1),
  box([cx - 1.5, 0.62, cz - 1.5], [cx + 1.5, 0.74, cz + 1.5], 2),
  // Le fût, à l'échelle 1/40 : la vraie Aiguille fait 114, celle-ci 2,85.
  box([cx - 0.17, 0.65, cz - 0.17], [cx + 0.17, 2.62, cz + 0.17], 2),
  // Le chapiteau, et l'encrier posé dessus. C'est LUI qu'on vient regarder.
  box([cx - 0.52, 2.55, cz - 0.52], [cx + 0.52, 2.79, cz + 0.52], 3),
  box([cx - 0.15, 2.72, cz - 0.15], [cx + 0.15, 3.02, cz + 0.15], 3),
];

/**
 * LA GALERIE DES PIÉDESTAUX — la carte du jeu, dite en volumes.
 *
 * Cinq socles alignés sur la place, tous vides au départ. Chacun attend la
 * couleur d'un monde, et **c'est sa TAILLE qui dit lequel** :
 *
 *   — un grand creux pour le monde où l'on est petit, donc d'où l'on revient
 *     avec quelque chose d'énorme ;
 *   — un creux minuscule pour le monde dont la porte est étroite, où il faut
 *     rapetisser pour entrer et d'où l'on ne rapporte qu'une miette ;
 *   — un socle RETOURNÉ, suspendu sous un linteau, pour le monde du plafond.
 *
 * On les voit à la première minute, gris et vides, et l'on comprend deux choses
 * sans un mot : qu'il y a cinq voyages à faire, et qu'ils ne se ressemblent pas.
 * C'est la même intention que la maquette au pied de l'Aiguille — montrer la
 * forme de ce qui manque plutôt que de l'annoncer.
 *
 * Ils sont dans le village, donc en lavis gris tant qu'on n'a rien rapporté.
 * Chacun prendra sa couleur en se remplissant : la galerie EST la jauge de
 * progression, et elle ne ressemble à aucune barre.
 */
const piedestal = (cx: number, cz: number, creux: number, retourne = false): BoxDef[] => {
  // Le socle est proportionné à ce qu'il attend : un grand creux demande un
  // grand socle, sinon la rangée ne se lit plus au premier coup d'œil.
  const r = Math.max(0.55, creux * 0.85);
  const h = Math.max(0.5, Math.min(1.15, creux * 0.75));
  if (!retourne) {
    return [
      box([cx - r, -0.4, cz - r], [cx + r, h, cz + r], 1),
      // Le rebord déborde et MORD sur le corps : affleurant, les deux faces se
      // disputeraient la profondeur.
      box([cx - r - 0.14, h - 0.1, cz - r - 0.14], [cx + r + 0.14, h + 0.12, cz + r + 0.14], 2),
      // Le creux : quatre lèvres qui laissent un vide au milieu. C'est ce vide
      // qu'on lit, et sa dimension est toute l'information.
      box([cx - r - 0.14, h + 0.12, cz - r - 0.14], [cx - creux * 0.5, h + 0.3, cz + r + 0.14], 2),
      box([cx + creux * 0.5, h + 0.12, cz - r - 0.14], [cx + r + 0.14, h + 0.3, cz + r + 0.14], 2),
      box([cx - creux * 0.5, h + 0.12, cz - r - 0.14], [cx + creux * 0.5, h + 0.3, cz - creux * 0.5], 2),
      box([cx - creux * 0.5, h + 0.12, cz + creux * 0.5], [cx + creux * 0.5, h + 0.3, cz + r + 0.14], 2),
    ];
  }
  // LE SOCLE RETOURNÉ. Il pend sous un linteau porté par deux montants : le
  // creux regarde le sol. On ne peut rien y poser tant qu'on n'a pas trouvé le
  // moyen de marcher au plafond — et c'est précisément ce qu'il annonce.
  const t = 2.9;
  return [
    box([cx - r - 0.5, -0.4, cz - 0.3], [cx - r, t, cz + 0.3], 1),
    box([cx + r, -0.4, cz - 0.3], [cx + r + 0.5, t, cz + 0.3], 1),
    box([cx - r - 0.8, t, cz - 0.45], [cx + r + 0.8, t + 0.4, cz + 0.45], 2),
    box([cx - r, t - h, cz - r], [cx + r, t - 0.06, cz + r], 1),
    box([cx - r - 0.14, t - h - 0.12, cz - r - 0.14], [cx + r + 0.14, t - h + 0.1, cz + r + 0.14], 2),
  ];
};

/**
 * BOURRELET D'HORIZON — ce qui empêche de voir dehors depuis une poche.
 *
 * Les deux mondes de couleur sont des poches posées à côté du monde central, et
 * l'on y voyait la dalle du monde principal : mesure faite, elle est à
 * cinquante unités de l'entrée du jardin, et le brouillard porte à trois cents.
 * On entrait dans un ailleurs et l'on apercevait le bord du décor.
 *
 * C'est une conséquence directe d'un correctif précédent — le sol a été étendu
 * pour empêcher une chute sans fin, et il s'est approché des poches. On ne le
 * reprend pas : il rattrape des chutes, c'est plus important. On ferme
 * l'horizon par le décor de la poche elle-même, ce qui est de toute façon plus
 * juste : un jardin a des talus, une carrière a des fronts de taille.
 *
 * LA HAUTEUR SE CALCULE, elle ne se choisit pas. Il faut que la ligne de visée
 * partant de l'œil et rasant le sommet du bourrelet passe AU-DESSUS de tout ce
 * qui traîne au-delà. Avec un œil à 0,41 (joueur à ×1/4), un bourrelet à 2,20
 * cache tout ce qui est au niveau du sol jusqu'à bien plus loin que le
 * brouillard. À ×4 l'œil est à 6,62, et il faut 14.
 *
 * Ils sont posés JUSTE À L'EXTÉRIEUR de la parcelle de leur région : rien n'y
 * traîne, et ça évite de bousculer un décor déjà calibré au centimètre.
 */
const bourrelet = (
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  haut: number,
  ink: number,
  region: string,
): BoxDef[] => {
  const e = haut * 2.2; // épaisseur : un talus, pas une palissade
  return [
    box([x0 - e, -6, z0 - e], [x0, haut, z1 + e], ink, { region }),
    box([x1, -6, z0 - e], [x1 + e, haut, z1 + e], ink, { region }),
    box([x0, -6, z0 - e], [x1, haut, z0], ink, { region }),
    box([x0, -6, z1], [x1, haut, z1 + e], ink, { region }),
  ];
};

/**
 * LES MONTAGNES DU FOND — invisibles pendant toute la partie, et c'est l'idée.
 *
 * Elles sont plantées à six cents mètres et au-delà, très loin derrière tout ce
 * qu'on parcourt. Or le brouillard du jeu porte à trois cents : **on ne les voit
 * jamais.** Elles ne coûtent rien à regarder, puisqu'on ne les regarde pas.
 *
 * Et puis vient le sacre. Le plan de fin ouvre le brouillard à quinze cents et
 * recule à quatre cents mètres — et elles apparaissent, d'un coup, alors qu'on
 * croyait avoir fait le tour du monde. On découvre que le monde continue.
 *
 * C'est le seul endroit du jeu où l'on ajoute du décor pour être vu une fois,
 * quinze secondes. Ça vaut le coup : la dernière image d'un jeu est celle qu'on
 * garde, et un horizon vide dirait « c'était tout ».
 *
 * Purement décoratives (`ghost`) : rien n'y monte, rien n'y bute.
 */
const montagnes = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const r = rng(90210);
  // Deux rangs : les proches, franches et sombres ; les lointaines, hautes et
  // pâles. C'est cet étagement, et lui seul, qui donne la profondeur — une
  // seule rangée aurait fait un mur.
  // LES RAYONS SONT ÉNORMES, ET ILS DOIVENT L'ÊTRE.
  //
  // Elles étaient à 620 et 980 de l'origine, ce qui paraissait très loin — et
  // c'était faux, parce que les mondes de couleur ne sont PAS à l'origine. Le
  // jardin s'étend jusqu'à x = 520 : une montagne à 508 se retrouvait à deux
  // cents mètres de lui, bien dans son brouillard, et l'on se prenait un mur
  // gris de deux cents mètres de haut en pleine figure au milieu d'une forêt
  // d'herbe.
  //
  // À 1400 et 1900, le point jouable le plus avancé (le fond du jardin) en est
  // à plus de sept cents — trois fois son brouillard. Elles redeviennent
  // invisibles partout, et ne réapparaissent qu'au sacre.
  // ET ELLES SONT ÉTROITES, ce qui compte autant que leur éloignement.
  //
  // Première tentative : larges comme hautes. Une montagne de mille mètres
  // faisait donc mille mètres de large, et son BORD arrivait cinq cents mètres
  // avant son centre — on se prenait un mur gris en pleine figure au milieu
  // d'une forêt d'herbe, alors que le calcul sur les centres disait « très
  // loin ». Ce qu'on voit d'un relief, c'est son bord, jamais son milieu.
  for (const [rayon, hMin, hMax, teinte] of [
    [1800, 240, 560, 2],
    [2500, 500, 1000, 1],
  ] as const) {
    const n = rayon < 2000 ? 30 : 24;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.16;
      const d = rayon * (0.82 + r() * 0.36);
      const cx = Math.sin(a) * d;
      const cz = Math.cos(a) * d + 60;
      const h = hMin + r() * (hMax - hMin);
      const w = h * (0.28 + r() * 0.24);
      // Trois blocs décalés par sommet : une seule boîte ferait un pilier, et
      // l'on veut une CRÊTE. Le décalage suffit à donner une silhouette.
      out.push(box([cx - w, -20, cz - w], [cx + w, h, cz + w], teinte, { ghost: true }));
      out.push(
        box(
          [cx - w * 0.62 + w * 0.5, -20, cz - w * 0.62 - w * 0.35],
          [cx + w * 0.62 + w * 0.5, h * (0.6 + r() * 0.3), cz + w * 0.62 - w * 0.35],
          teinte,
          { ghost: true },
        ),
      );
    }
  }
  return out;
};

/** Maison : un corps et une toiture débordante, qui pose la ligne d'encre. */
const maison = (
  cx: number,
  cz: number,
  w: number,
  d: number,
  h: number,
  ink: number,
  // DÉBORD DE TOITURE, VARIABLE D'UNE MAISON À L'AUTRE.
  //
  // Il valait 0,70 partout, et deux maisons voisines de la rue se retrouvaient
  // avec la joue de leur toit dans le même plan : un demi-mètre carré qui
  // grésillait entre deux façades, en pleine rue. Le faire varier de quelques
  // centimètres suffit à les départager — et c'est de toute façon plus juste,
  // puisque rien d'autre dans ce village n'est identique deux fois.
  debord = 0.7,
): BoxDef[] => [
  box([cx - w, -0.6, cz - d], [cx + w, h, cz + d], ink),
  box([cx - w - debord, h - 0.15, cz - d - debord], [cx + w + debord, h + 0.55, cz + d + debord], 2),
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
      out.push(
        ...maison(cote * (9 + w), z + (r() - 0.5) * 3, w, d, h, 1 + ((r() * 2) | 0), 0.58 + r() * 0.24),
      );
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
  // LES QUATRE MARGELLES N'ONT PAS TOUTES LA MÊME HAUTEUR, et ce n'est pas un
  // caprice. À 0,60 tout rond, les margelles est et ouest partageaient leur
  // face supérieure avec celles du nord et du sud, sur un carré d'un mètre à
  // chaque angle — quatre coins qui grésillaient au bord de l'eau, visibles
  // depuis toute la place. Six centimètres d'écart suffisent à les départager,
  // et personne ne verra jamais qu'un rebord d'étang n'est pas d'aplomb.
  out.push(box([27, -3, -59], [28, 0.6, -35], 2));
  out.push(box([50, -3, -59], [51, 0.6, -35], 2));
  out.push(box([27, -3, -59], [51, 0.66, -58], 2));
  out.push(box([27, -3, -36], [51, 0.66, -35], 2));

  // --- Quelques maisons à l'écart, pour que le village ait des bords ---------
  for (const [cx, cz] of [[-38, -46], [-30, -62], [-48, -70], [34, -18], [44, -26], [24, -74]]) {
    const w = 3.4 + r() * 2;
    const d = 3.4 + r() * 2;
    out.push(...maison(cx, cz, w, d, 4 + r() * 4, 1 + ((r() * 2) | 0), 0.58 + r() * 0.24));
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
    // LE VILLAGE, ET SON LAVIS.
    //
    // Une région au nom vide : c'est la clef des boîtes qui n'en déclarent
    // aucune, donc tout le rez-de-chaussée du monde. Ses teintes sont celles
    // qui servaient déjà par défaut — rien n'a changé de couleur, on lui a
    // seulement donné un nom pour pouvoir la lui retirer.
    //
    // Elle attend le vert. Au début du jeu, le village où l'on naît est un
    // lavis d'encre sans couleur, et l'on ne s'en rend compte qu'en franchissant
    // la porte verte : de l'autre côté, le jardin, lui, a gardé la sienne.
    {
      name: '',
      min: [-300, -20, -320],
      max: [300, 30, 40],
      paper: '#efe7d6',
      // LE VERT DOIT SE VOIR, sinon le voyage qui le rapporte ne se lit pas.
      //
      // La palette était crème, beige, taupe : rendre le vert rendait du BRUN, et
      // l'on ne savait pas de quel monde on revenait. Le corps du village est la
      // part du pinceau vert depuis qu'on a séparé les aplats de l'accent ; il
      // porte donc sa couleur, et le vert franc va aux TOITURES, qui sont ce
      // qu'on voit le plus depuis la place comme depuis la terrasse.
      //
      // Le papier, lui, reste crème : c'est le papier du dessin, et le teinter
      // reviendrait à dire que le lavis n'était pas du lavis.
      colors: ['#dfe4d1', '#c3d2ae', '#5c7a4a', '#c05a3c'],
      pigment: 'vert',
      // Mais SES ÉCLATS attendent le rouge, et ils sont partout : les auvents du
      // marché, la margelle du puits, la garde des torii. C'est ce qui donne au
      // retour du monde rouge un effet sous les pieds du joueur, et non cent
      // mètres au-dessus de sa tête.
      pigmentAccent: 'rouge',
    },
    // Le jardin d'abord : sa parcelle est incluse dans celle des hauteurs, et
    // c'est la première trouvée qui gagne. Même papier de part et d'autre, donc
    // le passage de l'une à l'autre ne se voit pas — seuls les aplats changent.
    // LES HAUTEURS ATTENDENT LE ROUGE, TOUTES LES HAUTEURS.
    //
    // Ces deux régions n'avaient pas de pigment, donc elles naissaient en
    // couleur pendant que le reste du monde était en lavis — et l'on voyait
    // depuis la place du village deux taches colorées au sommet, sans raison.
    // Signalé en jouant, et je croyais l'avoir corrigé : je n'avais traité que
    // la région générique des hauteurs, pas les deux lieux qui l'occupent.
    //
    // Les mondes de POCHE, eux, gardent leur couleur : ce sont ceux où l'on VA
    // la chercher, et ils l'ont forcément, sinon il n'y aurait rien à y prendre.
    { ...TERRASSE.region, pigment: 'rouge' },
    { ...BELVEDERE.region, pigment: 'rouge' },
    // Les deux poches rapprochent leur brouillard : un talus cache ce qui est
    // au sol, pas le belvédère qui flotte à cent vingt mètres et à deux cent
    // soixante-cinq d'ici. 230 le fait disparaître et laisse la poche entière
    // lisible — elle ne fait que 220 de large.
    { ...JARDIN.region, brouillard: 230 },
    { ...ROUGE.region, brouillard: 230 },
    {
      name: 'hauteurs',
      // Les hauteurs attendent le ROUGE, le village le VERT. Deux mondes, deux
      // moitiés du monde central : ni l'un ni l'autre voyage ne suffit à tout
      // repeindre, et l'on voit exactement ce qu'il reste à faire.
      pigment: 'rouge',
      min: [-300, 20, 40],
      max: [300, 320, 420],
      paper: '#dde3e6',
      colors: ['#d6dee2', '#b6c2c9', '#7c8b95', '#c05a3c'],
      ink: '#1a2126',
    },
  ],

  boxes: [
    // --- Étage 1 : le village -------------------------------------------------
    // LE SOL VA JUSQU'AU BOUT DU MONDE, et c'est une correction, pas un décor.
    //
    // Il s'arrêtait à z = 16, c'est-à-dire au bord nord du village. Or la
    // terrasse est trente mètres plus haut et cent mètres plus au nord : en
    // sautant par-dessus son garde-corps depuis un bloc du jardin sec, on
    // passait à côté du sol et l'on tombait INDÉFINIMENT. Pas de mort, pas de
    // renvoi — une chute sans fin, qui est la pire chose qu'un jeu puisse
    // faire à quelqu'un.
    //
    // Le sol court maintenant sous les trois étages. On tombe, on atterrit, on
    // remonte par l'escalier. Et il y a un bénéfice qu'on n'avait pas cherché :
    // depuis le belvédère on voit désormais le fond du monde cent vingt mètres
    // plus bas, ce qui donne enfin le vertige qu'on attendait de la hauteur.
    box([-260, -6, -300], [260, VILLAGE_Y, 400], 0, { outline: false }),

    // L'Aiguille. Colosse ici, mât depuis la terrasse, piquet depuis le
    // belvédère : c'est le même objet, et c'est tout le propos du voyage.
    box([-3, -5.6, -3], [3, AIGUILLE_H, 3], 2),
    // LE CHAPITEAU, ET LE SOCLE VIDE QU'IL PORTE.
    //
    // On le voit de la place, à la première minute de jeu : une plateforme
    // minuscule tout là-haut, avec quelque chose dessus qui attend. On ne peut
    // ni l'atteindre ni comprendre comment on l'atteindra — et c'est
    // exactement le rôle qu'on lui demande. Toute la partie consiste à
    // apprendre le chemin qui y mène.
    box([-12, AIGUILLE_H - 1.4, -12], [12, AIGUILLE_H + 3.6, 12], 3),
    box([-9.6, AIGUILLE_H + 3.6, -9.6], [9.6, AIGUILLE_H + 4.2, 9.6], 2),

    ...village(),

    // Au pied de l'Aiguille, légèrement de côté pour ne pas la masquer : on
    // arrive en la regardant, et c'est la maquette qu'on rencontre d'abord.
    ...maquette(5.2, -11),

    // La galerie, en arc autour de la place. On la longe en allant du puits au
    // marché — donc on la voit forcément, sans avoir eu à s'en approcher exprès.
    ...piedestal(-16, -6, 1.44),
    ...piedestal(-10.5, -13.5, 0.36),
    ...piedestal(-3.5, -17.5, 0.7),
    ...piedestal(20.5, -8, 2.8),
    ...piedestal(24, -1, 0.9, true),

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
    // Les garde-corps latéraux sont 12 cm plus hauts que les frontaux : aux
    // angles, leurs lisses se coiffaient à l'altitude exacte. Même remède
    // qu'au belvédère, même cause.
    ...balustrade(-88.7, -87.3, 47.65, 128.35, TERRASSE_Y, 6.12, 1.7, 0.7).map(haut),
    ...balustrade(87.3, 88.7, 47.65, 128.35, TERRASSE_Y, 6.12, 1.7, 0.7).map(haut),

    // Le jardin sec, posé sur la dalle. Région autonome : voir regions/terrasse.ts.
    ...TERRASSE.boxes,

    // --- Escalier B : ×4 le regarde, ×16 le gravit ----------------------------
    // Marches de 12 : mur pour un joueur de 7,2, marche pour un joueur de 28,8.
    // Rentré à 89,6 : à 90 pile, sa joue est tombait dans le plan du bord de
    // la terrasse, seize mètres carrés de façade en pleine vue.
    ...escalier(40, 89.6, 126, TERRASSE_Y, BELVEDERE_Y, 12, 9, 2).map(haut),

    // --- Étage 3 : le belvédère -----------------------------------------------
    box([-260, BELVEDERE_Y - 20, 190], [260, BELVEDERE_Y, 380], 0, { outline: false, region: 'hauteurs' }),
    // Même principe à ×16, à l'échelle de l'étage.
    // Trouée à l'aplomb de l'éperon : sans elle, le garde-corps barrait la seule
    // route vers l'Aiguille.
    ...balustrade(-255, -20, 193, 196, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),
    ...balustrade(20, 36, 193, 196, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),
    ...balustrade(94, 255, 193, 196, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),
    // Les garde-corps latéraux sont 40 cm plus hauts que les frontaux : aux
    // quatre angles, leurs lisses se recouvraient à l'altitude exacte.
    ...balustrade(-256, -253, 193.35, 376.65, BELVEDERE_Y, 22.4, 6.5, 2.6).map(haut),
    ...balustrade(253, 256, 193.35, 376.65, BELVEDERE_Y, 22.4, 6.5, 2.6).map(haut),
    ...balustrade(-255, 255, 374, 377, BELVEDERE_Y, 22, 6.5, 2.6).map(haut),

    // Le sommet du voyage. Région autonome : voir regions/belvedere.ts.
    ...BELVEDERE.boxes,

    // --- L'ÉPERON --------------------------------------------------------------
    //
    // Une passerelle jetée du sommet du monde jusqu'à la pointe de l'Aiguille,
    // cent quatorze mètres au-dessus de la place où l'on a commencé. C'est le
    // dernier geste du voyage, et le seul endroit d'où l'on domine ce colosse
    // qu'on ne pouvait pas gravir.
    //
    // Elle est 6 mètres SOUS la dalle du belvédère : à ×16 on enjambe 14,4,
    // donc on y descend et l'on y remonte sans y penser. Et sa face supérieure
    // n'est au niveau de rien d'autre — deux dalles au même niveau, on connaît.
    box([-13.4, 111.5, 8], [13.4, 114.05, 196], 1, { region: 'hauteurs' }),
    // Les garde-corps démarrent 40 cm APRÈS la passerelle : commencés au même
    // z qu'elle, leur face sud tombait dans son plan. Mon propre éperon avait
    // le défaut que je chasse partout ailleurs.
    ...balustrade(-14.2, -13.0, 8.4, 196, 114.05, 26, 7.6, 2.6).map(haut),
    ...balustrade(13.0, 14.2, 8.4, 196, 114.05, 26, 7.6, 2.6).map(haut),

    // Le détour minuscule, loin à l'est. Région autonome : voir regions/jardin.ts.
    ...JARDIN.boxes,

    // Le versant des fours, loin à l'ouest. Région autonome : voir regions/rouge.ts.
    ...ROUGE.boxes,

    // Les montagnes du fond : jamais vues pendant la partie, révélées au sacre
    // quand le brouillard s'ouvre. Voir `montagnes`.
    ...montagnes().map(haut),

    // Les deux horizons fermés. Sans eux, on voit le monde central depuis les
    // poches — et une poche dont on voit le dehors n'est plus un ailleurs.
    ...bourrelet(300, 520, -120, 100, 2.2, 2, 'jardin'),
    ...bourrelet(-520, -300, -120, 100, 14, 2, 'cote-rouge'),
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
    {
      // Paire D — LA CÔTE ROUGE. Elle fait GRANDIR, comme la première porte du
      // village, mais elle mène ailleurs : un chantier de potiers abandonné, où
      // tout a déjà brûlé. Plantée à l'ouest lointain, à cinquante mètres de la
      // porte verte pour qu'on ne puisse pas les confondre — deux portes
      // voisines de couleurs différentes, c'est une seule porte pour le joueur.
      id: 'cote-rouge',
      colorBig: 0xcc7040,
      colorSmall: 0x7d2b1c,
      // Petite face au village : on la franchit vers l'ouest et l'on ressort
      // quatre fois plus grand, de l'autre côté du monde.
      small: { position: [-52, VILLAGE_Y, -30], yaw: Math.PI / 2 },
      // LA GRANDE FACE REGARDE VERS L'OUEST, pas vers l'est, et les deux lacets
      // ne sont donc pas les mêmes. On ressort en marchant dans le sens de la
      // normale : tournée vers l'est, elle déposait le joueur dos au monde
      // rouge, et son premier pas en avant lui faisait retraverser la porte —
      // renvoyé au village sans avoir rien vu, sans rien comprendre.
      big: { position: [-304, 0, 0], yaw: -Math.PI / 2 },
    },
    {
      // Paire C — LA DESCENTE. Les deux autres font monter ; celle-ci fait
      // l'inverse, et c'est tout son intérêt : le village qu'on connaît par
      // cœur devient une forêt dès qu'on y mesure quarante-cinq centimètres.
      //
      // Elle est plantée à l'écart de la route du Pinceau : personne n'y mène,
      // on tombe dessus. Un détour se mérite, il ne se signale pas.
      id: 'descente-jardin',
      colorBig: 0x4a7c59, // vert d'herbe : elle ne se confond pas avec les deux autres
      colorSmall: 0x8a6b3a,
      // Emplacement choisi par balayage du village, pas à l'œil : neuf mètres
      // de vide devant ET derrière, sinon on plante une porte dans un mur.
      big: { position: [-30, VILLAGE_Y, -32], yaw: Math.PI / 2 }, // normale +X : on la franchit vers l'ouest
      small: { position: [306, 0, 0], yaw: Math.PI / 2 }, // on ressort vers l'est, face au jardin
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // L'ENCRIER — ce qu'on va chercher, et ce qu'on rapporte.
  //
  // Un pinceau vous guide d'un bout à l'autre du monde. Ce qu'on lui rapporte,
  // c'est de l'encre. Il n'y avait rien d'autre à trouver.
  //
  // LES NOMBRES, et ils décident de tout. Il mesure 36 centimètres au fond du
  // jardin, et c'est la SEULE fenêtre possible :
  //
  //   — au-dessus de 24,75 cm, un joueur à ×1/4 ne peut pas le soulever. Donc
  //     entrer dans le jardin trop petit ne mène nulle part : on traverse tout
  //     ce monde immense, on trouve l'encrier, et on ne peut pas le prendre.
  //     Le jeu ne dit rien ; il laisse comprendre qu'on est venu mal grandi.
  //   — au-dessous de 42,75 cm, il passe encore par la petite porte du village
  //     une fois quadruplé. Un centimètre de plus et le retour était impossible.
  //
  // Il sort du jardin à 1,44, franchit la terrasse à 5,76, et c'est cette
  // taille-là, et aucune autre, que le socle du sommet accepte. On ne peut donc
  // pas tricher avec un caillou trouvé sur place : seul un objet ayant fait TOUT
  // le voyage a la bonne dimension. La preuve du parcours est l'objet lui-même.
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // LES DEUX PINCEAUX ENDORMIS, ET POURQUOI LEUR TAILLE COMPTE.
  //
  // On ne ramasse rien : on RENCONTRE quelqu'un. Chaque pinceau dort au bout de
  // son monde, planté, et l'on appuie sur E pour le réveiller. Il se met alors à
  // tourner autour de nous et nous suit jusqu'au retour au village, où il nous
  // quitte pour repeindre sa part du monde.
  //
  // L'ÉCHELLE EXIGÉE relie le verbe du jeu à son but. Une couleur ne vit pas au
  // bout d'un monde : elle vit à une TAILLE.
  //
  //   Le pinceau VERT dort dans le jardin et n'accepte que ×1. On y arrive à ×1
  //   en étant entré géant ; on y arrive à ×1/4 en étant entré normal — et
  //   alors il est trop grand pour nous, il frémit et reste planté. Venir mal
  //   grandi ne mène nulle part, et rien n'a eu besoin de le dire.
  //
  //   Le pinceau ROUGE dort sur la côte et n'accepte que ×4. C'est la taille où
  //   la porte de l'ouest dépose, donc il s'offre à qui a simplement suivi le
  //   chemin — c'est le premier des deux, il doit être le plus doux.
  // ═══════════════════════════════════════════════════════════════════════════
  veilleurs: [
    // Au SOMMET DU TAS DE FEUILLES, vingt bonds au-dessus du sol du jardin.
    // Il dormait au ras de l'herbe, et l'on n'avait qu'à marcher jusqu'à lui :
    // un monde joli et sans épreuve. La position vient de `jardin.ts` plutôt
    // que d'être recopiée ici — les assises du tas bougeront encore.
    { id: 'pinceau-vert', position: SOMMET_DU_TAS, radius: 3, echelle: 0 },
    { id: 'pinceau-rouge', position: [-500, 0, 0], radius: 9, echelle: 1 },
  ],

  /**
   * LE BUT EST LA POINTE DE L'AIGUILLE, et plus le belvédère.
   *
   * La fin se déclenchait au moment où l'on rendait la dernière couleur — donc
   * en franchissant une porte, au ras du sol, sans avoir rien gravi. On gagnait
   * en marchant tout droit, et le plan de fin arrivait par surprise pendant
   * qu'on regardait le pinceau peindre.
   *
   * Rendre les couleurs et ACHEVER LE VOYAGE sont deux choses. Le monde entier
   * est bâti autour d'une plume de cent dix mètres plantée à l'origine, visible
   * des trois étages, avec un encrier vide à sa pointe et une maquette qui la
   * montre pleine dès la première minute. C'est là-haut que ça se termine, et
   * nulle part ailleurs.
   */
  goal: { position: [0, AIGUILLE_H + 6, 0], radius: 18 },

  // LES STATIONS DU PINCEAU — c'est le fil du jeu.
  //
  // Il se tient à chacune, vous laisse approcher, puis file vers la suivante
  // EN VOLANT. À vous de trouver votre propre route : la première étape se
  // rejoint en marchant, la deuxième exige de franchir la porte du village.
  // L'écart entre son vol et vos jambes, c'est l'énigme.
  /**
   * ═════════════════════════════════════════════════════════════════════════
   * LE VOYAGE, ET SON ORDRE N'EST PAS UN GOÛT — IL DÉCOULE DES ÉCHELLES.
   *
   * On entre dans la côte rouge par une PETITE face : il faut mesurer 1,80. On
   * entre utilement dans le jardin par une GRANDE face, en étant DÉJÀ à ×4. Les
   * deux détours ne peuvent donc pas se faire au même moment du voyage.
   *
   * D'où cet ordre, et il enseigne quelque chose : le rouge d'abord, parce
   * qu'il se fait à taille normale, avant même d'avoir appris à grandir. Le
   * vert ensuite, parce qu'il exige d'être déjà géant. On descend avant de
   * monter, puis on monte pour pouvoir redescendre autrement.
   *
   * TROIS TABLEAUX PARALLÈLES : `guide`, `guideEchelle`, `guidePorte`. Un
   * décalage entre eux ne se voit pas à la compilation et donne un pinceau de
   * la mauvaise taille au mauvais endroit. On les écrit ensemble, on les relit
   * ensemble, et une vérification compte leurs longueurs.
   * ═════════════════════════════════════════════════════════════════════════
   */
  guide: [
    // ── LE VILLAGE, à taille d'homme. Le tour du propriétaire. ──────────────
    [6, VILLAGE_Y, -14], // la place, à trois pas : la leçon gratuite
    [15.5, VILLAGE_Y, -18], // le puits
    [-36, 1.1, -10], // un étal du marché : le premier geste qui n'est pas marcher
    [39, VILLAGE_Y, -33], // l'étang

    // ── LA CÔTE ROUGE. Premier détour, et le seul qu'on fasse petit. ────────
    [-46, VILLAGE_Y, -30], // devant la porte de l'ouest
    [-500, 0, 0], // au fond du chantier, près de la braise
    [-3.5, 1.2, -17.5], // et sur le petit socle, qui l'attendait depuis le début

    // ── LA TERRASSE. On grandit pour la première fois. ──────────────────────
    [-27.5, 31.4, 92.5],
    [45.8, 39.8, 106.4],
    [-50, 42.7, 76.3],

    // ── LE RETOUR AU VILLAGE EN GÉANT. Le cœur du jeu. ──────────────────────
    // Le toit qu'on regardait sans pouvoir l'atteindre n'est plus qu'une marche.
    // Le monde n'a pas changé, c'est vous.
    [-24, 3.4, -20],

    // ── LE JARDIN. Second détour, et il exige d'être déjà géant. ────────────
    [-30, VILLAGE_Y, -24], // devant la porte verte
    SOMMET_DU_TAS, // tout en haut du tas de feuilles, où dort le pinceau vert
    [-16, 1.5, -6], // et sur le grand socle

    // ── LA SECONDE PORTE, qu'il dessine lui-même, puis le sommet. ───────────
    [0, TERRASSE_Y, 58],
    [0, BELVEDERE_Y, 258],
    [150, 151.7, 312],
    [-192, 197.4, 330],
    // ET IL FINIT SUR LA POINTE. Le guide doit mener là où le jeu s'achève :
    // sans ce jalon il s'arrêtait au belvédère, et le joueur n'avait aucune
    // raison de deviner qu'il fallait encore prendre l'éperon.
    [0, AIGUILLE_H + 8, 0],
  ],

  /**
   * Sa taille à chaque jalon : celle de l'ÉTAGE, jamais celle du joueur. Elles
   * ne valent que des puissances de 4, ce qui revient à dire « il a franchi
   * une porte, puis une autre » — la seule façon de changer de taille ici.
   */
  guideEchelle: [
    1, 1, 1, 1, // village
    1, 4, 1, // côte rouge : on y va petit, on y est grand, on revient petit
    4, 4, 4, // terrasse
    4, // le toit, revu en géant
    4, 1, 4, // jardin : on y va grand, on y est normal, on revient grand
    4, // devant la seconde porte
    16, 16, 16, // belvédère
    16, // la pointe de l'Aiguille
  ],

  /**
   * Par où il PASSE. C'est ce qui distingue « suis-moi » de « il a disparu ».
   *
   * Les jalons derrière un portail sont dans des poches qu'on n'atteint pas
   * autrement : les survoler en droite ligne ne montrait rien, et le joueur
   * restait planté sans savoir par où entrer. Partout ailleurs il vole
   * par-dessus, et c'est voulu — c'est de l'écart entre son vol et vos jambes
   * que naît l'énigme. On ne lui interdit l'air que là où l'air ne mène nulle
   * part.
   */
  guidePorte: [
    null, null, null, null,
    null, // devant la porte de l'ouest : il l'atteint à pied
    'cote-rouge', // il y entre sous vos yeux
    'cote-rouge', // et il en ressort avec vous
    'ascension-1', // la petite porte du village, vers la terrasse
    null, null,
    null, // il redescend au village par les airs : on voit qu'on n'y peut pas
    null, // devant la porte verte
    'descente-jardin', // il y entre
    'descente-jardin', // et il en revient
    null,
    'ascension-2', // la porte qu'il vient de dessiner lui-même
    null, null,
    null, // il gagne la pointe par les airs : à nous de prendre l'éperon
  ],

  hints: [
    // Devant la maquette. C'est le seul endroit du jeu où l'on énonce le but,
    // et encore : la maquette l'a déjà dit toute seule. La phrase ne fait que
    // confirmer ce qu'on vient de comprendre en levant les yeux.
    {
      position: [5.2, VILLAGE_Y, -11],
      radius: 7,
      text: 'Une aiguille en réduction, un encrier sur sa pointe. Lève les yeux : la vraie est vide.',
    },
    {
      position: [0, VILLAGE_Y, -24],
      radius: 16,
      text: 'Le pinceau. Rejoins-le.',
    },
    // La porte verte. On la voit d'ici, et l'on voit surtout ce qu'il y a
    // derrière : un monde démesuré. C'est l'image, pas le texte, qui dit qu'on
    // s'y prendrait mal en entrant maintenant.
    {
      position: [-30, VILLAGE_Y, -26],
      radius: 12,
      text: 'Regarde à travers. À cette taille-là, ce jardin est un continent.',
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
