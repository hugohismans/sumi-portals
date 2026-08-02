import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA LUCARNE BLEUE — *le village entier, posé sur une table, et il attend.*
 *
 * On traverse six salles pour aller chercher le bleu, on le réveille au fond du bol, et le niveau
 * s'arrête : la couleur ne se pose nulle part. Le village ne peut pas venir jusqu'ici — les mondes
 * sont des poches séparées, et les fondre est un chantier qu'on refuse — mais rien n'interdit qu'un
 * MORCEAU DU VILLAGE SOIT DANS LA SALLE, À UNE AUTRE TAILLE. On ne le traverse pas : on le REGARDE,
 * et quand le bleu s'éveille il se peint sous les yeux du joueur, depuis la salle encore grise où
 * il se tient.
 *
 * LA SEULE LIGNE DONT TOUT DÉPEND : `pigment: 'bleu'` — sans elle la salle naît colorée et ne se
 * peint jamais. Le front d'encre part du Pinceau, qui est dans le bol (x −300, z +1300, donc au
 * NORD-EST) : la vague entre par le coin le plus proche de la porte et balaie la maquette en
 * s'éloignant du joueur. Personne n'a réglé ça, c'est la géométrie des parcelles. ET CE QU'ELLE
 * PEINT, C'EST L'EAU : le bassin, la cour creusée pleine de pluie, le puits, les gouttières, le
 * filet de la rigole. **Le quatrième aplat ne sert à rien d'autre qu'à l'eau**, ni torii ni
 * margelle — un village gris où seule l'eau prend la couleur, et l'on voit d'un coup ce qu'un
 * pinceau bleu est venu faire au monde.
 *
 * LES TROIS OBJETS DE LA RECONNAISSANCE — si je ne pouvais pas les nommer, je n'aurais pas fini :
 * **l'AIGUILLE**, l'ancre du monde, 7,14 m au milieu de la table, avec le socle vide qu'on n'atteint
 * jamais ; **le TORII VERMILLON** au premier plan, seul sur le terrain nu au nord de la place, dont
 * la taille n'est pas choisie mais déduite (voir `torii`) ; **la RUE DROITE ET SES LANTERNES
 * APPARIÉES**, qui s'en va vers le fond entre deux rangs de maisons. En second rideau : la cour
 * creusée et sa margelle vermillon, la maison basse dont le toit à 3,40 était hors d'atteinte, le
 * puits et sa potence, les cinq étals du marché, le bassin au fond à droite.
 *
 * ET CE VILLAGE-CI EST L'AUTRE, LITTÉRALEMENT : le générateur, la graine (31415) et l'ORDRE DES SIX
 * TIRAGES par maison sont recopiés de `monde.ts`, et les quatorze maisons sortent aux mêmes places,
 * aux mêmes faîtes, à la quatrième décimale — vérifié au banc. On recopie plutôt qu'on n'importe,
 * une salle ne dépendant d'aucun fichier, et la copie est la preuve : le jour où le village bougera,
 * la divergence se verra dans un diff plutôt que dans la tête du joueur.
 */

const NOM = 'lucarneBleue';

/**
 * LE FACTEUR DE RÉDUCTION : UN SEIZIÈME, ET C'EST TOUT LE TRAVAIL DE LA SALLE.
 *
 * Il n'est pas choisi joli, il est choisi SUR LE RÉSEAU. Le jeu n'a qu'un verbe, ×4 ; un seizième,
 * c'est deux crans, donc deux portes, et ce point de vue existe déjà : c'est le belvédère, à ×16,
 * d'où « l'Aiguille n'est plus qu'un piquet ». Un joueur d'1,80 devant cette table voit exactement
 * ce que voit le géant de 28,80 m qui domine le vrai village — l'image la plus haute du premier
 * mouvement, rendue au fond du second. Le compte tombe juste de l'autre côté de la porte aussi : on
 * arrive du bol à 45 cm, la petite face du raccord vaut 2,8 × 4⁻¹ = 0,70 m, et la vue à travers un
 * portail est reportée à l'échelle de la traversée (`traversalScale`, ×4 par une petite face), donc
 * l'œil virtuel se pose à 1,656 m au-dessus du palier, exactement là où seront ses yeux une seconde
 * plus tard. **On voit d'abord ce qu'on habitera ensuite.** Maison de 8 m → 0,50 m · bassin de 22 m
 * de côté → 1,375 m de bleu · Aiguille de 114,2 m → 7,14 m, trois fois la taille du joueur, parce
 * qu'un village dont l'ancre serait devenue un bibelot n'est plus ce village-là.
 */
const K = 1 / 16;

/**
 * LE PIÈGE DES DÉTAILS, PAYÉ D'AVANCE. À un seizième, un mât de lanterne de 32 cm devient DEUX
 * MILLIMÈTRES — plus fin qu'un trait d'encre, donc une lamelle qui scintille et qu'on ne verra
 * jamais. Tout ce qui mesure moins de 0,64 m dans le vrai village est donc épaissi à 0,64 avant
 * réduction, soit quatre centimètres ici : la plus petite chose qu'on ait le droit de dessiner. On
 * arrondit vers le haut. Coupables : mâts de lanterne, poteaux d'auvent, potence du puits.
 */
const FIN = 0.64;

/** Origine de la maquette : village (0, 0, 0) tombe ici. */
const X0 = -600;
const Y0 = 0.36;
const Z0 = 700;

type P = [number, number, number];
type Opt = { ghost?: boolean; outline?: boolean };

const b = (min: P, max: P, ink = 0, opts: Opt = {}): BoxDef => ({ min, max, ink, region: NOM, ...opts });

/** Boîte donnée EN MÈTRES DU VILLAGE : toute la maquette passe par ici, donc `K` seul décide. */
const v = (min: P, max: P, ink = 0, opts: Opt = {}): BoxDef =>
  b([X0 + min[0] * K, Y0 + min[1] * K, Z0 + min[2] * K],
    [X0 + max[0] * K, Y0 + max[1] * K, Z0 + max[2] * K], ink, opts);

/** Le générateur de `monde.ts`, au caractère près. Le recopier EST la fidélité. */
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * LES QUATRE APLATS : 0 pierre pâle · 1 torchis · 2 TERRE CUITE · 3 EAU, et rien qu'elle. `monde`
 * tire 1 ou 2 pour le corps d'une maison ; ici ce sont 0 et 1, le 2 allant aux toits et au torii —
 * sans ce décalage la moitié des murs serait vermillon et les toitures ne se liraient plus.
 * Brouillard 140 : vingt mètres de chambre, parois franches, un peu de papier derrière la maquette.
 */
const REGION = {
  name: NOM,
  min: [-700, -40, 600] as P,
  max: [-500, 60, 800] as P,
  paper: '#e9edee',
  colors: ['#e0e5e4', '#cbb896', '#a6553c', '#2e6f9b'] as [string, string, string, string],
  ink: '#181e21',
  /** LA LIGNE. Voir l'en-tête : tout le dispositif tient dessus. */
  pigment: 'bleu',
  brouillard: 140,
};

/** Maison de `monde.ts` : un corps, une toiture débordante. Le débord varie d'une maison à l'autre. */
const maison = (cx: number, cz: number, w: number, d: number, h: number, ink: number, deb = 0.7): BoxDef[] => [
  v([cx - w, -0.6, cz - d], [cx + w, h, cz + d], ink),
  v([cx - w - deb, h - 0.15, cz - d - deb], [cx + w + deb, h + 0.55, cz + d + deb], 2),
];

/** Lanterne. Son mât fait 0,32 dans le vrai village : épaissi à FIN, sinon il n'existe pas. */
const lanterne = (cx: number, cz: number): BoxDef[] => [
  v([cx - FIN / 2, -0.5, cz - FIN / 2], [cx + FIN / 2, 2.6, cz + FIN / 2], 1),
  v([cx - 0.42, 2.6, cz - 0.42], [cx + 0.42, 3.3, cz + 0.42], 2),
];

/** Étal du marché : une table, un auvent, deux poteaux (0,40 → FIN). */
const etal = (ex: number, ez: number): BoxDef[] => [
  v([ex - 2.6, -0.5, ez - 2], [ex + 2.6, 1.1, ez + 2], 1),
  v([ex - 3.2, 2.3, ez - 2.6], [ex + 3.2, 2.8, ez + 2.6], 2),
  v([ex - 3.2, -0.5, ez - 2.6], [ex - 3.2 + FIN, 2.4, ez - 2.6 + FIN], 1),
  v([ex + 3.2 - FIN, -0.5, ez - 2.6], [ex + 3.2, 2.4, ez - 2.6 + FIN], 1),
];

/**
 * GOUTTIÈRE ET DESCENTE. Elles n'existent pas dans le vrai village et sont pourtant ce qui justifie
 * la salle : sans elles le bleu n'a que trois flaques éparses à allumer ; avec elles l'eau part des
 * toits, longe les façades et rejoint la rigole, et le front TRACE un réseau à travers tout le
 * village. Elles débordent de 15 cm du larmier : à ras, leur joue tombait dans le plan du toit.
 */
const gouttiere = (cx: number, cz: number, w: number, d: number, h: number, deb: number): BoxDef[] => [
  v([cx - w - deb, h - 0.5, cz + d + deb - 0.5], [cx + w + deb, h + 0.15, cz + d + deb + 0.15], 3),
  v([cx + w + deb - 0.9, -0.5, cz + d + deb - 0.7], [cx + w + deb - 0.1, h - 0.4, cz + d + deb + 0.1], 3),
];

/**
 * LE PUITS, en anneau et non en bloc — il faut qu'on voie l'eau dedans. Elle est à 1,32, quinze
 * centimètres sous le couronnement, donc visible sous les 15,9° de plongée qu'on a depuis la porte ;
 * au fond d'un puits de quatre mètres, elle n'aurait montré qu'une ombre. Montants de potence
 * épaissis, et écartés de la margelle pour ne pas enterrer leur pied dedans.
 */
const puits = (cx: number, cz: number): BoxDef[] => [
  v([cx - 2, -0.5, cz - 2], [cx + 2, 1.5, cz - 1.2], 1),
  v([cx - 2, -0.5, cz + 1.2], [cx + 2, 1.5, cz + 2], 1),
  v([cx - 2, -0.5, cz - 1.2], [cx - 1.2, 1.5, cz + 1.2], 1),
  v([cx + 1.2, -0.5, cz - 1.2], [cx + 2, 1.5, cz + 1.2], 1),
  v([cx - 1.2, -0.5, cz - 1.2], [cx + 1.2, 1.32, cz + 1.2], 3),
  v([cx - 2.9, -0.5, cz - 0.4], [cx - 2.9 + FIN, 4.4, cz + 0.4], 1),
  v([cx + 2.9 - FIN, -0.5, cz - 0.4], [cx + 2.9, 4.4, cz + 0.4], 1),
  v([cx - 3.6, 4.2, cz - 1.6], [cx + 3.6, 5.1, cz + 1.6], 2),
];

/**
 * LE BASSIN — l'étang de `monde.ts`, REMONTÉ AU-DESSUS DU TERRAIN. Là-bas il est creusé, l'eau à
 * −1,10 ; creusé ici, sous les 14,2° de plongée qu'on a à cette distance, sa lèvre nord aurait mangé
 * la moitié de sa surface. On le monte en vasque, l'eau à +0,30 : c'est « le bassin du village » de
 * la conception, et la plus grande tache bleue de la table, 1,375 m de côté. Margelles nord et sud
 * six centimètres plus hautes — à hauteur égale leurs dessus se confondaient aux quatre coins, et
 * `monde.ts` a déjà payé ce défaut-là.
 */
const bassin = (): BoxDef[] => [
  v([27, -0.5, -59], [28, 0.6, -35], 1),
  v([50, -0.5, -59], [51, 0.6, -35], 1),
  v([27, -0.5, -59], [51, 0.66, -58], 1),
  v([27, -0.5, -36], [51, 0.66, -35], 1),
  v([28, -0.5, -58], [50, 0.3, -36], 3),
];

/**
 * LA COUR CREUSÉE ET SA MARGELLE, importées de « la cour » : douze mètres sur douze, trois de fond,
 * la margelle EN RETRAIT de six centimètres sur l'arête du trou — le seul chiffre du niveau d'origine
 * sans raison visible, qui existe parce qu'à ras la barre vermillon grésillait, et qu'on recopie tel
 * quel. Plantée à l'est de la place, où `monde.ts` laisse du terrain nu : l'emprise de `level01`
 * tombait sur la galerie des piédestaux. ET ELLE EST PLEINE DE PLUIE — une maquette laissée dehors
 * se remplit, et le trou dont on ne remontait pas est devenu la flaque la plus proche du joueur.
 */
const courCreusee = (x0: number, x1: number, z0: number, z1: number): BoxDef[] => {
  const g = 0.06;
  const w = 1;
  return [
    v([x0, -4.2, z0], [x1, -3, z1], 1),
    v([x0 - g - w, -0.5, z0 - g - w], [x0 - g, 0.34, z1 + g + w], 2),
    v([x1 + g, -0.5, z0 - g - w], [x1 + g + w, 0.34, z1 + g + w], 2),
    v([x0 - g, -0.5, z0 - g - w], [x1 + g, 0.34, z0 - g], 2),
    v([x0 - g, -0.5, z1 + g], [x1 + g, 0.34, z1 + g + w], 2),
    // L'eau à −0,55, presque à ras bord : la paroi nord n'en cache plus qu'un dixième au lieu des
    // deux tiers. C'est ce seul nombre qui fait d'un trou noir une flaque.
    v([x0 + 0.1, -3, z0 + 0.1], [x1 - 0.1, -0.55, z1 - 0.1], 3),
  ];
};

/**
 * LE TORII VERMILLON, ET SA TAILLE N'EST PAS CHOISIE, ELLE EST DÉDUITE.
 *
 * C'est la grande face du portail de « la cour », `PORTAL_BIG_W × PORTAL_BIG_H`, 7,60 × 11,20 m ;
 * réduite d'un seizième, **0,475 × 0,700 m.** Or la petite face du raccord par lequel on arrive du
 * bol vaut 1,90 × 4⁻¹ sur 2,80 × 4⁻¹, c'est-à-dire **0,475 × 0,700 m** — le même nombre aux deux
 * bouts, sans l'avoir cherché, et c'est la règle 9 servie gratuitement : on regarde la maquette À
 * TRAVERS une ouverture dont le jumeau exact se tient au premier plan. On n'estime rien, on compare
 * une porte à une porte, et l'on en tire tout le reste du village.
 */
const torii = (cz: number): BoxDef[] => [
  v([-4.9, -0.8, cz - 0.6], [-3.8, 10.6, cz + 0.6], 2),
  v([3.8, -0.8, cz - 0.6], [4.9, 10.6, cz + 0.6], 2),
  v([-6.2, 8.6, cz - 0.45], [6.2, 9.5, cz + 0.45], 2),
  v([-7.6, 10.6, cz - 0.8], [7.6, 11.2, cz + 0.8], 2),
];

/**
 * LA MAQUETTE, en mètres du VRAI VILLAGE.
 *
 * LA RÈGLE QUI ÉVITE CENT FAUTES : tout ce qui pose au sol part de −0,50 ou plus bas, donc SOUS le
 * terrain. Toutes les faces inférieures sont enterrées, et `facesConfondues` les ignore par
 * construction puisqu'elle ne signale que l'exposé ; il ne reste que les DESSUS à surveiller, tous
 * à des altitudes distinctes ou sans recouvrement en plan. Mesuré : zéro, même au seuil de 0,05 m²,
 * vingt fois plus sévère que celui des vérifications.
 */
const village = (): BoxDef[] => {
  const r = rng(31415);
  const out: BoxDef[] = [];
  // La place et ses deux bordures.
  out.push(v([-19, -0.5, -27], [19, 0.25, 9], 0));
  out.push(v([-19, -0.5, -27], [-17.6, 0.7, 9], 2));
  out.push(v([17.6, -0.5, -27], [19, 0.7, 9], 2));
  // L'Aiguille. Son socle est vide ici aussi, et c'est la même promesse : on ne l'atteindra
  // jamais, on l'aura seulement regardé.
  out.push(v([-3, -0.5, -3], [3, 110, 3], 1));
  out.push(v([-12, 108.6, -12], [12, 113.6, 12], 2));
  out.push(v([-9.6, 113.6, -9.6], [9.6, 114.2, 9.6], 1));
  // Le torii, seul au nord de la place. Puis la rue et ses lanternes appariées.
  out.push(...torii(20));
  out.push(v([-6, -0.5, -74], [6, 0.2, -27], 0));
  for (let z = -32; z >= -68; z -= 11) out.push(...lanterne(-7.4, z), ...lanterne(7.4, z));

  // LES MAISONS DE LA RUE. SIX TIRAGES, DANS CET ORDRE : largeur, profondeur, hauteur, décalage,
  // encre, débord. Les intervertir donne un autre village, tout aussi plausible et complètement
  // étranger — c'est la seule ligne du fichier qu'on ne puisse pas relire à l'œil.
  for (let z = -31; z >= -70; z -= 12) {
    for (const cote of [-1, 1]) {
      const w = 4 + r() * 2.4;
      const d = 3.6 + r() * 2.2;
      const h = 4 + r() * 4.5;
      const cz = z + (r() - 0.5) * 3;
      const ink = (r() * 2) | 0;
      const deb = 0.58 + r() * 0.24;
      const cx = cote * (9 + w);
      out.push(...maison(cx, cz, w, d, h, ink, deb));
      // Gouttière sur les trois maisons de l'est qui donnent sur la rigole : partout, ça aurait fait
      // un village en tuyaux.
      if (cote === 1 && z >= -55) out.push(...gouttiere(cx, cz, w, d, h, deb));
    }
  }

  // La maison basse, dont le toit à 3,40 était hors d'atteinte.
  out.push(v([-31, -0.6, -25], [-17, 3, -15], 1));
  out.push(v([-31.8, 2.85, -25.8], [-16.2, 3.4, -14.2], 2));
  out.push(...puits(12, -18));
  for (let i = 0; i < 5; i++) out.push(...etal(-44 + (i % 3) * 8, -10 - ((i / 3) | 0) * 9));
  out.push(...bassin());
  out.push(...courCreusee(24, 36, -8, 4));

  // LA RIGOLE, du puits au bassin. Elle AFFLEURE à +0,14 au lieu d'être creusée : à un seizième,
  // un caniveau en creux est une rainure d'un demi-centimètre qu'aucune plongée ne montrerait.
  // Un filet posé sur le sol se lit — et c'est ce qu'un maquettiste fait d'un cours d'eau.
  out.push(v([13.9, -0.5, -18.7], [27.2, 0.14, -17.9], 3));
  out.push(v([26.4, -0.5, -46.4], [27.2, 0.14, -18.7], 3));
  out.push(v([26.4, -0.5, -46.4], [28.6, 0.14, -45.6], 3));
  // Les maisons à l'écart, pour que le village ait des bords.
  for (const [cx, cz] of [[-38, -46], [-30, -62], [-48, -70], [34, -18], [44, -26], [24, -74]]) {
    const w = 3.4 + r() * 2;
    const d = 3.4 + r() * 2;
    out.push(...maison(cx, cz, w, d, 4 + r() * 4, (r() * 2) | 0, 0.58 + r() * 0.24));
  }
  return out;
};

/**
 * LE SOCLE ET SON TERRAIN. Le socle déborde de deux mètres de village (12,5 cm ici) : le terrain posé
 * à ras aurait partagé ses quatre flancs, soit un mètre et demi carré de faces confondues sur l'objet
 * même qu'on vient regarder. Le débord fait en plus ce qu'un socle de musée fait — il dit « ceci est
 * un objet », pas « ceci est le sol ». Le terrain est en quatre dalles qui ménagent le trou de la
 * cour, sans contour : c'est le socle qui porte la ligne.
 */
const socle = (): BoxDef[] => [
  b([X0 - 3.75, -0.2, Z0 - 5.375], [X0 + 3.75, Y0 - 0.225, Z0 + 1.875], 1),
  ...([[-58, -84, 24, 28], [36, -84, 58, 28], [24, -84, 36, -8], [24, 4, 36, 28]] as const)
    .map(([x0, z0, x1, z1]) => v([x0, -4.2, z0], [x1, 0, z1], 0, { outline: false })),
];

/**
 * LA CHAMBRE, ET LE SEUL NOMBRE QU'ELLE AVAIT À TROUVER : DIX MÈTRES CINQ.
 *
 * C'est la distance de la porte au bord du socle, et elle n'est pas un goût. Un joueur d'1,80 a l'œil
 * à 1,656 ; l'écran le plus étroit du jeu — 72° de champ vertical tenu en portrait — ne laisse que
 * ±22,1° de large, donc pour que les DEUX COINS AVANT du socle, à 3,75 m de l'axe, y tiennent, il
 * faut au moins 9,23 m. On en donne 10,525, soit 14 % de marge, et le compte mesuré au banc vaut :
 * coins avant 19,6° de côté et 20,5° sous l'horizon · pointe de l'Aiguille 14,4° au-dessus · coins
 * arrière 11,9° de côté et 12,9° dessous. **Toute la maquette dans 34,9° de haut et 39,2° de large,
 * donc dans une seule image, sans faire un pas** — la seule chose qui compte, puisque ce joueur ne
 * bougera peut-être jamais. En paysage la marge double ; à travers la porte, la vue est reportée ×4
 * et la grande face laisse ±38°, pourvu qu'on se tienne à moins de 90 cm de la lucarne, deux fois sa
 * propre taille. C'est là qu'on se met.
 */
const CHAMBRE_H = 9.4;
const PALIER = 2.6;

const chambre = (): BoxDef[] => [
  // Le sol, retiré d'un décimètre sous les parois : à l'aplomb, leurs flancs extérieurs tombaient
  // dans le même plan et six mètres carrés grésillaient sur l'arête du monde.
  b([X0 - 5.9, -1.1, Z0 - 7.7], [X0 + 5.9, 0, Z0 + 14.2], 0, { outline: false }),
  b([X0 - 6, -0.3, Z0 - 7.8], [X0 - 5.3, CHAMBRE_H, Z0 + 14.5], 1),
  b([X0 + 5.3, -0.3, Z0 - 7.8], [X0 + 6, CHAMBRE_H, Z0 + 14.5], 1),
  b([X0 - 5.3, -0.3, Z0 - 7.8], [X0 + 5.3, CHAMBRE_H, Z0 - 7.1], 1),
  b([X0 - 5.3, -0.3, Z0 + 13.8], [X0 + 5.3, CHAMBRE_H, Z0 + 14.5], 1),

  /**
   * LA RIGOLE DE LA CHAMBRE — l'étalon de l'eau elle-même. Un filet court au sol autour du socle, à
   * taille réelle, et le même filet court dans la maquette seize fois plus fin : quand le bleu monte,
   * les deux prennent la couleur au même instant. Un fil de laiton n'aurait rien dit ; de l'eau à côté
   * d'eau dit tout. Les deux brins nord-sud affleurent cinq millimètres plus haut — à niveau égal leurs
   * dessus se recouvraient aux quatre angles sur 0,16 m², sous le seuil de la vérification donc
   * invisibles à la machine, et visibles à l'œil puisqu'on regarde au ras du sol.
   */
  ...([[-4.55, -5.8, -4.15, 2.4], [4.15, -5.8, 4.55, 2.4],
    [-4.55, -5.8, 4.55, -5.4], [-4.55, 2, 4.55, 2.4]] as const)
    .map(([x0, z0, x1, z1], i) => b([X0 + x0, -0.15, Z0 + z0], [X0 + x1, i < 2 ? 0.06 : 0.055, Z0 + z1], 3)),
  // La bouche qui l'alimente, dans la paroi du fond. Elle ne coule pas — rien ne coule dans ce
  // jeu — mais elle dit d'où l'eau vient, et c'est assez.
  b([X0 - 0.45, 0.02, Z0 - 7.15], [X0 + 0.45, 0.62, Z0 - 6.6], 2),
];

/**
 * LE PALIER, ET LE PARAPET QUI A FAILLI TOUT CACHER.
 *
 * Le palier est 2,60 m au-dessus du sol : c'est lui qui donne la plongée, sans quoi l'œil rase la
 * table et l'on voit une silhouette de village, pas un plan. Mais un palier haut demande un
 * garde-corps, et **le garde-corps est le vrai piège de cette salle** : œil 4,306 · rambarde à 1,40 m
 * devant · arête du socle à 10,525 m et 0,135 de haut ⇒ elle masque tout ce qui passe sous la droite
 * qui la rase, donc elle ne peut pas dépasser **1,15 m**. À 1,30 — la hauteur qui va de soi — les
 * quatre premiers mètres de la maquette disparaissent : le torii, la place et le pied de l'Aiguille,
 * et l'on aurait bâti la salle pour rien. D'où **0,95 m**, hanche d'un joueur d'1,80, et 20 cm de
 * marge : ce qu'elle cache s'arrête à 7,72 m, soit 2,80 m avant le socle. ELLE NE RETIENDRAIT PAS
 * QUELQU'UN QUI SAUTE (on saute 1,29 à cette taille) et c'est assumé : son travail est d'arrêter un
 * pas distrait, pas de faire une cage — qui la franchit tombe de 2,60 m, se relève et remonte par
 * l'escalier de l'est. On ne pouvait pas la mettre plus haut, et rien qu'un calcul ne l'aurait dit.
 */
const palier = (): BoxDef[] => {
  const out: BoxDef[] = [
    b([X0 - 5.3, -0.25, Z0 + 10.55], [X0 + 5.3, PALIER, Z0 + 13.8], 1),
    // Retirée de 5 cm du nez du palier : à ras, sa face avant tombait dans le même plan que lui, trois
    // mètres carrés exposés en plein dans l'axe du regard. Elle laisse 1,40 m de dégagement devant la
    // porte, et le palier en offre 1,40 de plus derrière : on entre, on recule, on regarde.
    b([X0 - 5.3, PALIER - 0.15, Z0 + 10.6], [X0 + 3.1, PALIER + 0.95, Z0 + 11], 2),
  ];
  // L'ESCALIER, à l'est, HORS DU CÔNE DU REGARD : à 3,10 m de l'axe et deux mètres de l'œil, il occupe
  // 57° de côté quand la maquette en occupe 20. Il ne masque rien, et il suffit à ce que la salle ne
  // soit pas un piège — sept marches de 0,325, sous l'enjambée de 0,90 ; descente et remontée
  // vérifiées au banc, pas supposées.
  for (let i = 0; i < 7; i++) {
    out.push(b([X0 + 3.1, -0.3, Z0 + 10.55 - (i + 1) * 0.34],
      [X0 + 5.3, PALIER - (i + 1) * 0.325, Z0 + 10.55 - i * 0.34], 1));
  }
  return out;
};

export const LUCARNE_BLEUE: SalleModule = {
  nom: NOM,
  region: REGION,
  bounds: { min: [-700, -40, 600], max: [-500, 60, 800] },

  boxes: [...chambre(), ...palier(), ...socle(), ...village()],

  // Ni logement, ni caisse, ni porte interne, ni pinceau endormi : ON NE RÉSOUT RIEN ICI. C'est un plan,
  // pas une énigme — une salle qui demanderait quelque chose au moment exact où le jeu rend enfin
  // quelque chose serait une faute de rythme, et c'est la seule qu'on ne rattrape pas.

  /**
   * Le Pinceau entre par la porte, descend sur le torii, puis suit L'EAU — la cour pleine de pluie, le
   * puits, le bassin, la rue — avant de se poser sur la pointe de l'Aiguille : le dernier jalon du
   * guide du monde central, seize fois plus bas. Il finit là où le jeu finit.
   */
  stations: [
    [X0, 4.3, Z0 + 11.7], [X0, 1.3, Z0 + 1.25], [X0 + 1.875, 0.62, Z0 - 0.125],
    [X0 + 0.75, 0.72, Z0 - 1.125], [X0 + 2.44, 0.55, Z0 - 2.94], [X0, 0.75, Z0 - 3.7], [X0, 7.7, Z0],
  ],

  // ─── LE PINCEAU PASSE PAR LA PORTE, COMME NOUS ──────────────────────────
  //
  // Six cent soixante-dix unités séparent le fond du bol de cette chambre. Sans
  // cette ligne, le guide les franchit en ligne droite à travers la pierre, et
  // l'on ne lit plus « suis-moi » mais « il s'est téléporté » — c'est écrit dans
  // le contrat, et c'est déjà arrivé dans le monde central avec cinq cents
  // mètres de vide.
  //
  // L'autrice de la salle avait nommé la porte dans son rapport sans pouvoir
  // l'écrire : la paire n'existait pas encore, et une chaîne fausse est pire
  // que rien. Elle existe maintenant, et son nom est celui-là.
  //
  // SEUL LE PREMIER JALON L'EMPRUNTE. Les six autres sont déjà de ce côté-ci :
  // leur faire repasser la porte les ferait entrer et sortir pour rien.
  stationsPorte: ['raccord-bol-lucarneBleue', null, null, null, null, null, null],

  /**
   * ON ARRIVE À TAILLE D'HOMME sur le palier : la porte regarde −Z, donc le premier pas est vers la
   * maquette et il n'y a rien d'autre à faire que la voir. LA SORTIE EST AU MÊME PALIER, TROIS MÈTRES
   * PLUS À L'OUEST — cul-de-sac, on n'en repart pas, mais on n'y est pas prisonnier : la porte
   * d'entrée est une GRANDE face, la reprendre à rebours fait rapetisser et renvoie au bol. Les trois
   * mètres d'écart empêchent qu'une face plantée ici un jour n'en recouvre une autre.
   */
  entree: { position: [X0, PALIER + 0.05, Z0 + 12.4], echelle: 0 },
  sortie: { position: [X0 - 3, PALIER + 0.05, Z0 + 12.4], echelle: 0 },
};
