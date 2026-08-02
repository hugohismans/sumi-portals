import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA LUCARNE DORÉE — *le village en maquette, derrière la dernière porte.*
 *
 * Douze salles pour aller chercher l'or, et la couleur ne se posait nulle part : on
 * réveillait le pinceau au bout de la vallée et le niveau s'arrêtait. Voici ce sur quoi
 * elle se pose. **On ne traverse pas cette salle : on la REGARDE**, depuis la vallée
 * encore grise, par une porte de quarante-quatre mètres.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE FACTEUR EST UN QUART, ET IL N'EST PAS APPROXIMATIF
 *
 * Un portail ne montre pas l'autre côté depuis là où l'on est : il le montre **depuis
 * là où l'on sera**. `computeVirtual` pose la caméra de la vue à un quart de son écart
 * à la grande face (`traversalScale` y vaut 1/4), justement pour tenir cette promesse :
 * ce qu'on voit ici est la salle vue par un corps de 7,20, pas par le géant de 28,80
 * qui regarde. Or un rapport de tailles ne connaît que le quotient — 7,20 devant un
 * village au quart, et 28,80 devant le village entier, c'est **le même nombre**. Bâtir
 * au quart, c'est offrir au joueur, à travers la porte, le village exactement à la
 * taille qu'il a en cet instant : pas un compromis de cadrage, la seule valeur qui
 * rende le tableau vrai. Une maison de huit mètres en fait deux, le torii treize
 * quarante en fait 3,35, la rue un sillon de deux mètres et demi.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE VILLAGE-CI EST CELUI DES « TOITS », ENCORE RÉDUIT D'UN CRAN : même générateur, même
 * graine (20260801), mêmes vingt emplacements, mêmes largeurs et mêmes faîtes à la
 * quatrième décimale, même cour creusée et sa margelle en retrait de six centimètres,
 * même torii, même maison basse à l'emprise de la tour du premier niveau. On recopie
 * plutôt qu'on n'importe, et la copie est la preuve : si quelqu'un retouche « la cour »,
 * les trois villages divergeront, et ça se verra dans un diff.
 *
 * LE DEMI-TOUR. L'entrée d'un raccord descendant est plantée avec `yaw: Math.PI`, normale
 * −Z : l'assemblage ne laisse pas le choix du cap. Le village est donc tourné d'un
 * demi-tour, ce qui fait entrer le regard par le sud — place devant, torii au fond, cour
 * à gauche, maison basse à droite : le cadrage de la première minute du jeu. Une
 * ROTATION, pas un miroir : la main du plan est intacte.
 *
 * LES TROIS OBJETS PAR LESQUELS ON RECONNAÎT LE VILLAGE : **le torii**, à l'aplomb de
 * [0, 20] comme partout ; **la cour creusée et sa margelle rouge**, seul vrai piège du
 * premier niveau, ici une flaque de trois mètres sur trois ; **la maison basse au toit
 * rouge**, emprise exacte de la tour de l'objectif, où le joueur a fini sa toute première
 * partie. Les trois sont VERMILLON, donc déjà peints (`pigmentAccent: 'rouge'`) : la
 * maquette naît en lavis gris avec trois taches de couleur dedans, et ces trois taches
 * sont ce qui la nomme. **La reconnaissance se fait AVANT l'or ; l'or n'ajoute que la
 * lumière.** L'Aiguille, quatrième témoin, donne une verticale au fond du plan.
 *
 * CE QUE L'OR PEINT : les POINTS DE LUMIÈRE, et rien d'autre — douze lanternes de la
 * place et de la cour, six portes entrouvertes avec leur rai et leur flaque au sol,
 * quatre bouches de four dans la ruelle, sept toitures mouillées, le fanal au sommet de
 * l'Aiguille. Quarante boîtes d'or semées de [588 · 0,90 · 2557] à [611 · 30,10 · 2524],
 * si bien que le front court sur toute la maquette au lieu de s'allumer dans un coin. ET
 * L'ON NE RÉSOUT RIEN : ni logement, ni caisse, ni porte interne, ni veilleur — un plan,
 * et un cul-de-sac dont on ressort par le seuil d'entrée, avec dix-neuf mètres et demi de
 * papier nu devant la porte et des parois à quatorze, au-dessus du saut de 5,18.
 */

const NOM = 'lucarneDoree';

/** LE FACTEUR. Un quart, et c'est démontré ci-dessus. */
const Q = 0.25;
/** Centre du village dans la parcelle, et niveau de sa rue sur la plaque. */
const CX = 600;
const CZ = 2546;
const SOL = 0.9;
/** Dessous de la plaque, noyé dans le plancher de la chambre. */
const BAS = -1.6;

/** Les quatre encres PAR LEUR RÔLE : se tromper d'index, c'est peindre un mur. */
const MUR = 0;
const TOIT = 1;
const OR = 2;
const ROUGE = 3;

/** Village → salle, demi-tour compris : `mx` et `mz` DÉCROISSENT. */
const mx = (x: number): number => CX - x * Q;
const mz = (z: number): number => CZ - z * Q;
const mh = (h: number): number => SOL + h * Q;

type N3 = [number, number, number];

const b = (min: N3, max: N3, ink = 0, outline?: false): BoxDef =>
  outline === false ? { min, max, ink, region: NOM, outline } : { min, max, ink, region: NOM };

/** Une boîte EN COORDONNÉES DU VILLAGE — celles de `level01.ts`, lisibles à côté de
 *  l'original : seule façon de vérifier qu'on n'a rien réinventé. Les bornes
 *  s'échangent en x et z, le demi-tour renversant ces deux axes. */
const v = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, ink = 0)
  : BoxDef => b([mx(x1), mh(y0), mz(z1)], [mx(x0), mh(y1), mz(z0)], ink);

/** Le corps s'enfonce, le toit déborde et MORD : le geste de « la cour ». */
const maison = (cx: number, cz: number, dx: number, dz: number, faite: number, inkToit = TOIT)
  : BoxDef[] => [
  v(cx - dx, cx + dx, -0.5, faite - 0.45, cz - dz, cz + dz, MUR),
  v(cx - dx - 0.5, cx + dx + 0.5, faite - 0.57, faite, cz - dz - 0.5, cz + dz + 0.5, inkToit),
];

/** Générateur déterministe de « la cour ». Recopié au bit près. */
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Les vingt emplacements de « la cour ». Ils évitent la place, la tour, la cour. */
const SPOTS: [number, number][] = [
  [-24, 16], [-38, 4], [-34, 26], [-16, 30], [0, 32], [16, 28], [30, 20], [40, 4],
  [34, -14], [40, -30], [22, -26], [4, -40], [-10, -42], [-26, -34], [-40, -18],
  [-44, 30], [18, 44], [-6, 46], [46, 34], [-46, -40],
];

interface Toit { cx: number; cz: number; dx: number; dz: number; faite: number }

/** LES VINGT MAISONS-TÉMOINS. L'ORDRE DES QUATRE TIRAGES EST PORTANT — largeur,
 *  profondeur, hauteur, encre : les intervertir donne un autre village, aussi plausible
 *  et complètement étranger. On tire donc la quatrième SANS S'EN SERVIR (une maquette
 *  est taillée dans une seule matière, et murs pâles sur toits sombres se lisent d'un
 *  coup d'œil) ; la supprimer, elle, décalerait les dix-neuf maisons suivantes. */
const village = (): Toit[] => {
  const rng = makeRng(20260801);
  return SPOTS.map(([cx, cz]) => {
    const dx = 2.5 + rng() * 3.5;
    const dz = 2.5 + rng() * 3.5;
    const faite = 3 + rng() * 13 + 0.45;
    rng();
    return { cx, cz, dx, dz, faite };
  });
};

const MAISONS = village();

// ─── LES POINTS DE LUMIÈRE ───────────────────────────────────────────────────

/** UNE LANTERNE — le seul objet qui ne soit PAS au quart. Réduite honnêtement, sa boîte
 *  de lumière ferait vingt et un centimètres : à quarante mètres, un grain de riz. Une
 *  lumière n'a pas de taille mais une portée, et une maquette dont le sujet est
 *  invisible n'a pas de sujet. Fanal 36, mât 90. */
const lanterne = (vx: number, vz: number): BoxDef[] => {
  const x = mx(vx);
  const z = mz(vz);
  return [
    b([x - 0.07, SOL - 0.06, z - 0.07], [x + 0.07, SOL + 0.9, z + 0.07], TOIT),
    b([x - 0.18, SOL + 0.86, z - 0.18], [x + 0.18, SOL + 1.24, z + 0.18], OR),
  ];
};

/** UNE PORTE ENTROUVERTE — trois boîtes, deux métiers. Le chambranle est la PORTE
 *  D'HOMME des « toits », 1,10 sur 2,05 : la seule mesure que le joueur connaisse par
 *  cœur, donc la règle 9, sans quoi un village vu d'en haut est un tas de blocs sans
 *  échelle — et vermillon, il dit cette taille avant l'or. Le rai est DÉCENTRÉ (une
 *  porte poussée, pas ouverte) et sa flaque est la seule tache d'or au ras du sol. */
const porte = (vcx: number, vzFace: number): BoxDef[] => {
  const x = mx(vcx);
  const z = mz(vzFace);
  return [
    b([x - 0.14, SOL - 0.03, z - 0.005], [x + 0.14, SOL + 0.512, z + 0.023], ROUGE),
    b([x - 0.1, SOL + 0.005, z + 0.006], [x + 0.01, SOL + 0.44, z + 0.03], OR),
    b([x - 0.16, SOL + 0.004, z + 0.032], [x + 0.1, SOL + 0.02, z + 0.46], OR),
  ];
};

/** UNE BOUCHE DE FOUR, sur la paroi qui regarde la ruelle (vers −x). Les quatre remises
 *  adossées des « toits » sont ici les FOURS DU VILLAGE : mêmes boîtes, mêmes cotes au
 *  centimètre, on leur a seulement percé une gueule. Elles montent d'ouest en est, donc
 *  leurs braises aussi — seule diagonale de lumière du plan. */
const braise = (xParoi: number, zc: number): BoxDef[] => [
  b([xParoi - 0.05, SOL + 0.03, zc - 0.34], [xParoi + 0.03, SOL + 0.45, zc + 0.34], OR),
  b([xParoi - 0.52, SOL + 0.006, zc - 0.3], [xParoi - 0.045, SOL + 0.022, zc + 0.3], OR),
];

/** LE REFLET D'UNE TOITURE MOUILLÉE. Il mord de 12 mm dans la tuile et dépasse de 21 :
 *  d'affleurement, sa face et celle du toit se disputeraient la profondeur. Débords
 *  dissymétriques (0,56 / 0,49 et 0,63 / 0,55) pour qu'aucune bande n'en touche une
 *  autre — les faîtes diffèrent tous, mais on ne compte pas là-dessus. */
const reflet = (m: Toit): BoxDef =>
  b(
    [mx(m.cx + m.dx * 0.56), mh(m.faite) - 0.012, mz(m.cz + m.dz * 0.63)],
    [mx(m.cx - m.dx * 0.49), mh(m.faite) + 0.021, mz(m.cz - m.dz * 0.55)],
    OR,
  );

// ─── LA CHAMBRE, LA PLAQUE, LE VILLAGE ───────────────────────────────────────

/** LA CHAMBRE. Plancher de quatorze mètres d'épaisseur — à ×4 le joueur pèse lourd et une
 *  dalle mince se traverse — et quatre parois de quatorze, sans plafond : la lumière
 *  tombe d'en haut, c'est ce que le nom promet. Elles passent le saut de 5,18, donc on ne
 *  sort d'ici que par la porte. Aucune ne partage un plan avec une autre ni avec le
 *  plancher : quatre boîtes autour d'un rectangle se recouvrent aux angles. */
const chambre = (): BoxDef[] => [
  b([552, -14, 2500], [648, 0, 2592], TOIT, false),
  b([552.4, -13.6, 2500.7], [556.6, 13.9, 2591.3], TOIT),
  b([643.5, -13.2, 2500.4], [647.6, 14.3, 2591.6], TOIT),
  b([552.9, -12.8, 2500.5], [647.1, 14.1, 2505.2], TOIT),
  b([552.6, -13.4, 2586.9], [647.4, 13.7, 2591.1], TOIT),
];

/** La cour creusée, aux cotes de « la cour ». */
const COUR = { x0: 10, x1: 22, z0: -6, z1: 6, fond: -3.0 };
const RETRAIT = 0.06;

/** Un morceau de plaque, en coordonnées du village, du dessous à la rue. */
const dalle = (x0: number, x1: number, z0: number, z1: number): BoxDef =>
  b([mx(x1), BAS, mz(z1)], [mx(x0), SOL, mz(z0)], MUR, false);

/** LA PLAQUE — pâle, découpée en quatre pour ménager le trou de la cour. C'est son BORD
 *  qui fait la maquette : quatre-vingt-dix centimètres de socle sur le papier de la
 *  chambre, et l'on sait qu'on regarde un objet et non un pays. CLAIRE quand les toits
 *  sont sombres — d'en haut, un village n'est que ses toits sur son sol. */
const plaque = (): BoxDef[] => [
  dalle(-58, COUR.x0, -58, 100),
  dalle(COUR.x1, 58, -58, 100),
  dalle(COUR.x0, COUR.x1, COUR.z1, 100),
  dalle(COUR.x0, COUR.x1, -58, COUR.z0),
  // Le fond de la cour garde son contour : c'est lui qui la dessine en creux. Trois
  // mètres sur trois, soixante-quinze de fond — le seul piège du premier niveau tient
  // dans une flaque qu'on enjambe sans s'en apercevoir.
  v(COUR.x0, COUR.x1, -8, COUR.fond, COUR.z0, COUR.z1, TOIT),
  // LA MARGELLE, quatre barres vermillon en retrait de six centimètres de l'arête.
  // Jointives et jamais superposées : c'est ce qui les sauve.
  v(COUR.x0 - RETRAIT - 1, COUR.x0 - RETRAIT, -0.3, 0.3, COUR.z0 - RETRAIT - 1, COUR.z1 + RETRAIT + 1, ROUGE),
  v(COUR.x1 + RETRAIT, COUR.x1 + RETRAIT + 1, -0.3, 0.3, COUR.z0 - RETRAIT - 1, COUR.z1 + RETRAIT + 1, ROUGE),
  v(COUR.x0 - RETRAIT, COUR.x1 + RETRAIT, -0.3, 0.3, COUR.z0 - RETRAIT - 1, COUR.z0 - RETRAIT, ROUGE),
  v(COUR.x0 - RETRAIT, COUR.x1 + RETRAIT, -0.3, 0.3, COUR.z1 + RETRAIT, COUR.z1 + RETRAIT + 1, ROUGE),
];

/** LA PLACE. « La cour » la laisse vide ; le monde central la dalle et la borde de deux
 *  liserés vermillon — « la trouée qu'on reconnaîtra d'en haut ». On reprend ce dallage,
 *  car une place sans marque est un manque de maisons, et l'on ne reconnaît pas un
 *  manque. Liserés RENTRÉS de dix centimètres : bord à bord, leurs faces tombaient dans
 *  le même plan sur trois mètres carrés. */
const place = (): BoxDef[] => [
  v(-9, 9, -1.6, 0.24, -12, 16, MUR),
  v(8.1, 8.9, -1.4, 0.52, -11.6, 15.6, ROUGE),
  v(-8.9, -8.1, -1.4, 0.52, -11.6, 15.6, ROUGE),
];

/** LE GRAND TORII, à l'aplomb de [0, 20], regardant le sud. Le linteau MORD. */
const torii = (): BoxDef[] => [
  v(-4.4, -3.6, -0.5, 12.9, 19.6, 20.4, ROUGE),
  v(3.6, 4.4, -0.5, 12.9, 19.6, 20.4, ROUGE),
  v(-6.6, 6.6, 12.6, 13.4, 19.4, 20.6, ROUGE),
  v(-5.2, 5.2, 9.4, 10.0, 19.7, 20.3, ROUGE),
];

/** Les quatre appentis des « toits », devenus les fours. Cotes inchangées. */
const APPENTIS: [number, number, number][] = [
  [-1.0, 2.2, 6.3], [2.2, 5.4, 9.2], [5.4, 8.6, 12.1], [8.6, 11.4, 15.0],
];

const ruelle = (): BoxDef[] => [
  ...APPENTIS.flatMap(([z0, z1, faite]) => maison(-22, (z0 + z1) / 2, 4, (z1 - z0) / 2, faite)),
  // La gueule se perce en mx(-18), la face qui regarde le village — donc celle que le
  // joueur voit ; l'autre flanc lui tourne le dos et ne servirait à personne.
  ...APPENTIS.flatMap(([z0, z1]) => braise(mx(-18), mz((z0 + z1) / 2))),
];

/** L'AIGUILLE — la seule greffe de cette maquette, et elle est déclarée. Elle vient du
 *  monde central, pas de « la cour » : cent dix mètres plantés à l'origine, colosse
 *  depuis le village, mât depuis la terrasse, piquet depuis le belvédère. Seul objet que
 *  le joueur ait regardé depuis les trois étages du jeu — sans elle au fond, ce serait
 *  le village de quelqu'un d'autre. Elle fait ici 27,50, au nord du torii. Son chapiteau
 *  porte l'encrier qu'on a vu VIDE à la première minute du jeu ; ici il est plein, point
 *  d'or le plus haut, donc le dernier peint. */
const aiguille = (): BoxDef[] => {
  const x = mx(0);
  const z = mz(84);
  return [
    b([x - 0.75, SOL - 1.4, z - 0.75], [x + 0.75, SOL + 27.5, z + 0.75], TOIT),
    b([x - 3.0, SOL + 27.15, z - 3.0], [x + 3.0, SOL + 28.4, z + 3.0], ROUGE),
    b([x - 2.4, SOL + 28.33, z - 2.4], [x + 2.4, SOL + 28.55, z + 2.4], TOIT),
    b([x - 0.5, SOL + 28.48, z - 0.5], [x + 0.5, SOL + 29.2, z + 0.5], OR),
  ];
};

/** LES DOUZE LANTERNES : deux au pied du torii, six le long de la place, quatre autour
 *  de la cour — dans le vide que les vingt emplacements laissent, et nulle part ailleurs.
 *  La lumière d'un village suit ses passages, et ses passages sont ce qui reste entre
 *  les maisons. */
const LANTERNES: [number, number][] = [
  [-6.5, 20], [6.5, 20], [-7.5, 14], [7.5, 14], [-7.5, 4], [7.5, 4], [-7.5, -6],
  [7.5, -6], [16, 10.5], [16, -10.5], [24.2, 9.5], [24.2, -9.5],
];

/** Cinq maisons entrouvertes, plus la maison basse — prises aux quatre coins du
 *  plan et jamais côte à côte : l'or doit courir, pas s'attrouper. */
const PORTES = [1, 5, 9, 13, 17];
/** Sept toitures mouillées, un emplacement sur trois : elles font tout le tour. */
const MOUILLES = [0, 3, 6, 9, 12, 15, 18];

export const LUCARNE_DOREE: SalleModule = {
  nom: NOM,

  /** LA PALETTE, ET POURQUOI L'OR NE REPEINT QUE LA LUMIÈRE. `pigment: 'or'` sur le
   *  corps : sans cette ligne la salle naîtrait colorée et ne se peindrait jamais.
   *  `pigmentAccent: 'rouge'` : le quatrième aplat est déjà rentré — torii, margelle,
   *  toit de la maison basse, chambranles, liserés de la place. Le vrai réglage est
   *  dans les trois premières encres : le grisage tire chaque teinte vers sa LUMINANCE,
   *  donc une couleur peu saturée ne bouge presque pas, et le plâtre (#ded9cd, 217) et
   *  l'ardoise (#8d949a, 147) sont à deux doigts de leur propre gris quand l'ambre
   *  (#f0a324, 172) en est à cent lieues. Le front passé, la masse ne fait que tiédir
   *  et **seuls les quarante points de lumière s'allument**.
   *
   *  BROUILLARD 150, et il se calcule : la brume ne mord qu'au-delà de trente-quatre
   *  mètres, et la maquette tient entre vingt et cinquante-sept mètres de la porte —
   *  franche du bord au torii, l'Aiguille voilée d'un cinquième, la paroi du fond à
   *  moitié partie dans le papier. */
  region: {
    name: NOM,
    min: [500, -60, 2400],
    max: [700, 120, 2600],
    paper: '#dcd4c6',
    colors: ['#ded9cd', '#8d949a', '#f0a324', '#c8492e'],
    ink: '#1d1a17',
    pigment: 'or',
    pigmentAccent: 'rouge',
    brouillard: 150,
  },

  bounds: { min: [500, -60, 2400], max: [700, 120, 2600] },

  boxes: [
    ...chambre(),
    ...plaque(),
    ...place(),
    ...MAISONS.flatMap((m) => maison(m.cx, m.cz, m.dx, m.dz, m.faite)),
    // LA MAISON BASSE : emprise de la tour de l'objectif, faîte à 3,40, TOIT ROUGE.
    // Quatre-vingt-cinq centimètres ici — l'endroit exact où le joueur a fini sa
    // toute première partie.
    ...maison(-18, -10, 7, 7, 3.4, ROUGE),
    ...torii(),
    ...ruelle(),
    ...aiguille(),
    ...LANTERNES.flatMap(([x, z]) => lanterne(x, z)),
    ...PORTES.flatMap((i) => porte(MAISONS[i].cx, MAISONS[i].cz - MAISONS[i].dz)),
    ...porte(-18, -17),
    ...MOUILLES.map((i) => reflet(MAISONS[i])),
  ],

  // NI LOGEMENT, NI CAISSE, NI PORTE INTERNE, NI VEILLEUR : une salle qui ne demande
  // rien ne doit pas faire semblant.

  /** LE PINCEAU entre par la porte, survole la place, plonge sur la cour creusée, croise
   *  le torii et se pose sur le fanal de l'Aiguille : dans l'ordre, les cinq choses à
   *  regarder, la dernière étant le point qu'il allume. */
  stations: [
    [600, 6.5, 2572], [601.0, 5.2, 2549], [595.6, 4.4, 2546],
    [600, 6.6, 2541], [600, 31.0, 2525],
  ],

  /** LE RACCORD. `echelle` EST UN PALIER : 1 = ×4, surtout pas 4 ni 0,25. La vallée sort
   *  à 2 (×16), on entre à 1 : un cran, une porte, grande face 44,80 de haut, petite
   *  11,20 sur 7,60 — un corps de ×4 mesure 2,72 sur 7,20, il repasse par où il est venu
   *  sans discussion. ON NAÎT AU MILIEU DU SEUIL, sur le papier nu : 19,50 jusqu'au bord
   *  de la plaque, 6,90 jusqu'à la paroi de derrière, rien au-dessus ; mesuré, le sol est
   *  à 0,000 sous les deux points et aucune boîte ne coupe un corps posé là. LA SORTIE
   *  EST À NEUF MÈTRES DE CÔTÉ, seul nombre arbitraire du fichier : ce point ne sert à
   *  rien dans un cul-de-sac, mais si l'assemblage y plantait un jour une seconde face,
   *  elle ne doit pas tomber sur la première — neuf mètres contre 7,60 de large. */
  entree: { position: [600, 0.05, 2580], echelle: 1 },
  sortie: { position: [609, 0.05, 2580], echelle: 1 },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUI EST MESURÉ, ET LES DEUX RÉSERVES
 *
 * LE CADRAGE, balayé sur les 127 boîtes de la maquette, huit coins chacune, œil du
 * moteur (vue à 1/4, donc 6,62 au-dessus du seuil) : à 4, 8, 16 et 22 m de la porte dans
 * la vallée, ZÉRO coin hors cadre ; à 28 m et au-delà, quatre coins, et ce sont les deux
 * angles proches de la PLAQUE, jamais une maison. Le joueur réveille l'or à six mètres
 * du seuil : il voit tout sans faire un pas.
 *
 * RÉSERVE 1 — LA HAUTEUR D'ŒIL DE LA COMMANDE N'EST PAS CELLE DU MOTEUR. On m'a dit
 * « un portail ne réduit pas ce qu'on voit à travers », œil à 17 m ; `computeVirtual`
 * fait l'inverse (`makeScale(1/4)` par la grande face) : la vue est celle qu'on aura
 * APRÈS avoir traversé, œil à 6,62. Balayé les deux modèles — avec l'œil non réduit du
 * géant, **1016 coins sur 1016 sortent du cadre, à toute distance**, un linteau à 11,20
 * ne laissant pas un œil à 26,50 voir plus de sept mètres de sol derrière lui. J'ai donc
 * composé pour le moteur, et le plan vaut dans les deux cas : c'est aussi celui que voit
 * un joueur qui traverse pour de bon.
 *
 * RÉSERVE 2 — LE FRONT D'ENCRE ARRIVE ICI EN UN ÉCLAIR, ET CE FICHIER N'Y PEUT RIEN. Le
 * front est une sphère centrée sur le pinceau ; l'or dort à [-57,8 · 8,2 · 2798,4],
 * entre 646 et 763 m d'ici. En rejouant `Pigments.update` : première boîte peinte à
 * t = 4,19 s, dernière à 4,33, sur un geste de 4,60 — **la salle bascule en 0,14
 * seconde**, quatre secondes après le coup de pinceau, le front ayant passé les quatre
 * premières à balayer les trois cents mètres « visibles » autour de la vallée. Semer les
 * lumières n'en fait pas une course : ça reste un éclair, mais un éclair qui traverse la
 * maquette de bord en bord. Le levier est dans `pigments.ts`, jamais ici.
 *
 * ET TROIS DOUTES PLUS PETITS, dans le rapport : la taille du guide (`guideEchelle`
 * vaudra 4), la greffe de l'Aiguille, et des parois qui ferment ce qui pourrait rester
 * un plateau.
 * ═══════════════════════════════════════════════════════════════════════════
 */
