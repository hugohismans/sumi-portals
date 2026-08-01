import type { BoxDef } from '../../core/types.js';
import type { RegionModule } from './contrat.js';

/**
 * LA CÔTE ROUGE — LE VERSANT DES FOURS.
 *
 * À l'ouest du village, la terre change de couleur. On y a creusé l'argile, on
 * l'a cuite, et l'on est parti. Il reste un chantier de potiers : une cour
 * jonchée de tessons, quatre fours en ruche, des bassins où la barbotine sèche
 * encore, et tout au fond une falaise d'ocre crue qui ferme le monde.
 *
 * CE QUI FAIT LE LIEU, et ce n'est pas la couleur :
 *
 * **On avance à contre-jour d'un objet trop grand.** Le dernier four, trente
 * mètres de haut, se voit dès la cour d'entrée. On marche vers lui pendant deux
 * cents mètres. C'est lui qui donne la direction, jamais un couloir.
 *
 * **La route se longe, elle ne se traverse pas.** Une voie de chariots — deux
 * ornières d'encre — file droit d'un bout à l'autre. Trois séchoirs la
 * chevauchent en alternance, à gauche puis à droite : on la suit sans jamais
 * marcher droit.
 *
 * **Tout ce qui monte tourne le dos au chemin.** Les trois perchoirs du pinceau
 * sont visibles depuis la voie et n'offrent, de ce côté-là, que du mur. Les
 * marches sont derrière, à chaque fois.
 *
 * LA TECHNIQUE NE CHANGE PAS. Mêmes aplats, même trait, même grain que le
 * village et les hauteurs. Ce qui change, c'est la gamme : terre cuite, laque
 * brûlée, poussière d'argile, et la braise pour l'accent. On est dans une
 * estampe, pas dans un volcan — rien n'ici ne coule et rien ne brûle, tout a
 * DÉJÀ brûlé.
 */

/** Le nom que porte chaque boîte de la région. */
const R = 'cote-rouge';

/** Face supérieure du sol. La région porte le sien : le village s'arrête bien avant. */
const SOL = 0;

/**
 * Tout part de soixante centimètres SOUS le sol visible.
 *
 * Une base posée à 0 pile partagerait son plan avec la dalle, et deux faces au
 * même niveau se disputent la profondeur. En s'enfonçant, la jonction n'existe
 * simplement plus — et la face basse se retrouve noyée dans la masse du sol,
 * donc invisible et hors de cause.
 */
const ANCRAGE = -0.6;

// ─── Les nombres du joueur, à ×4 ─────────────────────────────────────────────
//
// Il mesure 7,20. Il ENJAMBE 3,60, il SAUTE 5,18, il fait 2,72 de diamètre, et
// il repose ce qu'il porte à HUIT MÈTRES devant lui. Aucune hauteur de cette
// région n'a été choisie à vue : une marche de 3,2 se franchit sans y penser,
// une marche de 6,6 est un mur, et il n'existe rien entre les deux qui ne soit
// pas voulu.
const ENJAMBEE = 3.6;
const SAUT = 5.18;
const DIAMETRE = 2.72;
const PORTEE = 8.0;

type Opts = { ghost?: boolean; outline?: boolean };

const b = (
  min: [number, number, number],
  max: [number, number, number],
  ink: number,
  opts: Opts = {},
): BoxDef => ({ min, max, ink, ...opts, region: R });

/** Volume posé sur le sol. `h` est la hauteur VUE, mesurée depuis la dalle. */
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

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * VOLÉE DE MARCHES, en X.
 *
 * Chaque marche mord de 0,7 sur la suivante : jamais de fente par où l'on
 * verrait le vide, et surtout jamais deux flancs dans le même plan. Les bords
 * en z dérivent de quelques centimètres par marche pour la même raison — sans
 * cette dérive, les huit marches d'une même volée partageraient toutes leur
 * face nord, ce qui fait huit surfaces confondues d'un coup.
 *
 * `montee` se choisit sous l'enjambée (3,60) quand la volée doit se gravir, et
 * bien au-dessus du saut (5,18) quand elle ne le doit pas.
 */
const volee = (
  xDepart: number,
  sens: 1 | -1,
  zc: number,
  larg: number,
  n: number,
  pas: number,
  montee: number,
  premier: number,
  ink: number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  for (let i = 0; i < n; i++) {
    const a = xDepart + sens * i * pas;
    const c = a + sens * (pas + 0.7);
    out.push(
      pose(
        Math.min(a, c),
        Math.max(a, c),
        zc - larg / 2 - i * 0.14,
        zc + larg / 2 + i * 0.11,
        premier + i * montee,
        ink,
      ),
    );
  }
  return out;
};

/**
 * UN FOUR EN RUCHE.
 *
 * Quatre assises qui rétrécissent en se décalant — un four n'est pas un cube,
 * il s'arrondit vers le haut. Les proportions sont fixes : la première assise
 * culmine à 40 % de la hauteur totale, ce qui met la première vire à 8 mètres
 * au moins sur tous les fours de la région. Le saut plafonne à 5,18 : AUCUN
 * four ne se gravit, quelle que soit sa taille, et ce n'est pas un hasard mais
 * la définition même de la forme.
 *
 * Les coefficients de rétrécissement sont tous différents d'une face à l'autre
 * (0,86 / 0,82 / 0,84 / 0,88) : deux assises ne peuvent donc jamais aligner
 * leurs flancs, ce qui serait le grésillement classique du projet.
 */
const four = (cx: number, cz: number, r: number, h: number): BoxDef[] => {
  const t1 = h * 0.4;
  const t2 = h * 0.7;
  const t3 = h * 0.88;
  return [
    pose(cx - r, cx + r, cz - r, cz + r, t1, 2),
    sur(cx - r * 0.86, cx + r * 0.82, cz - r * 0.84, cz + r * 0.88, SOL + t1, t2 - t1, 1),
    sur(cx - r * 0.62, cx + r * 0.67, cz - r * 0.69, cz + r * 0.6, SOL + t2, t3 - t2, 2),
    sur(cx - r * 0.33, cx + r * 0.29, cz - r * 0.27, cz + r * 0.32, SOL + t3, h - t3, 3),
  ];
};

/**
 * LA GUEULE DU FOUR — deux piédroits, un linteau, et la braise au fond.
 *
 * C'est le seul endroit de la région où l'on voit l'accent en grand : un pan
 * entier de braise, encadré de laque, tourné vers la voie. De loin c'est une
 * tache ; de près c'est une porte par laquelle on ne passe pas.
 *
 * LES PIÉDROITS FONT 5,60 ET 5,45, et ces deux nombres sont choisis JUSTE
 * au-dessus du saut de 5,18. Un piédroit de cinq mètres aurait fait de chaque
 * gueule un marchepied vers la première vire du four, et toute la région se
 * serait escaladée par ses portes.
 *
 * Le linteau part de 5,20, donc SOUS le sommet des piédroits et sous celui de
 * la braise : leurs faces hautes se retrouvent enterrées dedans au lieu de
 * l'affleurer.
 */
const gueule = (cx: number, czFace: number, sens: 1 | -1, h: number): BoxDef[] => {
  const dedans = czFace - sens * 2.4; // ancré dans la masse du four
  const dehors = czFace + sens * 4.2;
  const nez = czFace + sens * 5.2; // le linteau déborde encore
  const braise = czFace + sens * 3.4;
  const lo = (p: number, q: number) => Math.min(p, q);
  const hi = (p: number, q: number) => Math.max(p, q);
  return [
    pose(cx - 6.4, cx - 2.8, lo(dedans, dehors), hi(dedans, dehors), 5.6, 2),
    pose(cx + 2.8, cx + 6.4, lo(dedans, dehors) + 0.5, hi(dedans, dehors) - 0.3, 5.45, 2),
    // La braise mord de 20 cm dans chaque piédroit : pas de fente sur les côtés.
    pose(cx - 3.0, cx + 3.0, lo(dedans, braise), hi(dedans, braise), 5.3, 3),
    b([cx - 7.2, SOL + 5.2, lo(dedans, nez)], [cx + 7.2, SOL + h, hi(dedans, nez)], 1),
  ];
};

/**
 * UN BASSIN DE DÉCANTATION.
 *
 * Quatre margelles autour d'une nappe de barbotine. C'est la seule surface pâle
 * horizontale de la région — celle qui accrochera la lumière quand on regardera
 * la côte depuis les hauteurs, comme l'étang le fait pour le village.
 *
 * Les quatre margelles sont à quatre altitudes voisines (1,20 / 1,30 / 1,45 /
 * 1,55) et leurs emprises se recouvrent en se décalant : quatre plans distincts
 * là où il n'y en aurait eu qu'un. Rien ne dépasse 1,55, très en dessous de
 * l'enjambée de 3,60 : un bassin ne doit jamais devenir un obstacle, on entre
 * dedans et l'on en ressort sans y penser. C'est la règle du « ne jamais
 * piéger » qui fixe ce plafond, pas le dessin.
 */
const bassin = (x0: number, x1: number, z0: number, z1: number): BoxDef[] => [
  pose(x0, x1, z0, z0 + 3.0, 1.45, 2),
  pose(x0 - 0.3, x1 + 0.3, z1 - 3.2, z1, 1.3, 2),
  pose(x0 - 0.2, x0 + 3.0, z0 + 1.6, z1 - 1.6, 1.55, 2),
  pose(x1 - 3.2, x1 + 0.2, z0 + 1.4, z1 - 1.4, 1.2, 2),
  // La nappe passe SOUS les margelles au lieu de s'aligner sur elles.
  pose(x0 + 1.2, x1 - 1.2, z0 + 1.2, z1 - 1.2, 0.85, 0),
];

/** Un tas — de tessons, d'argile, de cendre. Décor pur : jamais plus haut que l'enjambée. */
const tas = (cx: number, cz: number, w: number, d: number, h: number, ink: number): BoxDef =>
  pose(cx - w, cx + w, cz - d, cz + d, h, ink);

// ═════════════════════════════════════════════════════════════════════════════
// LE DÉCOR
// ═════════════════════════════════════════════════════════════════════════════

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const r = rng(60217);

  // ───────────────────────────────────────────────────────────────────────────
  // LE SOL. La région le porte elle-même : la dalle du village s'arrête à
  // x = -230, cent mètres avant d'arriver ici. Une seule pièce, sans couture —
  // deux dalles voisines au même niveau auraient partagé leur face haute sur
  // toute la longueur du recouvrement, et c'est le pire cas possible.
  // `outline: false` pour la même raison que la dalle du village : on ne veut
  // pas d'un trait d'encre en travers du terrain.
  // ───────────────────────────────────────────────────────────────────────────
  out.push(b([-520, -5.6, -120], [-300, SOL, 100], 1, { outline: false }));

  // ═══════════════════════════════════════════════════════════════════════════
  // A — LA COUR DES TESSONS.  x de -302 à -368
  //
  // On est déposé en [-310, 0, 0], le regard vers l'ouest. La première image
  // doit tout dire : deux bornes qui encadrent la vue, une cour d'argile pâle
  // qui part droit devant, et tout au fond la silhouette du dernier four.
  // ═══════════════════════════════════════════════════════════════════════════

  // Le parvis d'argile battue. Cinquante centimètres : on ne le sent pas sous
  // le pied, mais son BORD est net, et c'est le bord qui fait la cour.
  out.push(pose(-366, -304, -28.4, 27.6, 0.5, 0));
  out.push(pose(-366.8, -303.2, -30.6, -27.8, 1.15, 2));
  out.push(pose(-365.4, -302.6, 26.9, 29.7, 1.35, 2));
  // La bordure ouest est coupée en deux : les dix-huit mètres laissés au milieu
  // sont la sortie de la cour, et c'est par là que part la voie.
  out.push(pose(-367.6, -364.2, -31.4, -8.6, 1.6, 2));
  out.push(pose(-368.2, -364.8, 9.2, 30.4, 1.45, 2));

  // Les deux bornes du seuil. 8,10 et 8,50 : plus hautes que le joueur (7,20),
  // donc elles l'encadrent VRAIMENT au lieu de lui arriver à l'épaule. Leur fût
  // fait 6,60 et 7,00, tous deux au-dessus du saut : on ne monte pas dessus
  // pour voir plus loin, on passe entre.
  out.push(pose(-318.0, -313.6, -13.2, -8.4, 6.6, 2));
  out.push(sur(-319.0, -312.6, -14.0, -7.6, SOL + 6.6, 1.5, 3));
  out.push(pose(-317.4, -313.0, 8.8, 13.6, 7.0, 2));
  out.push(sur(-318.4, -312.0, 8.0, 14.4, SOL + 7.0, 1.5, 3));

  // Le mur des rebuts, au sud de la cour : les pots ratés, empilés puis
  // abandonnés. 3,30 au total, donc SOUS l'enjambée : il borde le regard sans
  // jamais barrer le pas.
  out.push(pose(-362.0, -322.0, -24.8, -20.6, 2.9, 2));
  out.push(sur(-363.0, -321.0, -25.6, -19.8, SOL + 2.9, 0.4, 1));

  // ─── LA PILE DE BRIQUES — station 1 ────────────────────────────────────────
  //
  // Dix-huit mètres de côté, 7,40 de haut : exactement la taille du joueur, ce
  // qui en fait l'étalon de toute la région. On la voit dès l'arrivée, et le
  // pinceau est dessus.
  //
  // Le corps monte d'un seul jet à 6,90 et sa coiffe DÉBORDE d'un mètre sur
  // tout le pourtour. Cet encorbellement supprime toute prise : depuis la voie,
  // au sud, c'est une falaise lisse. Les deux marches sont au NORD, derrière.
  // Rien n'est caché — il suffit de faire le tour, ce qui est la seule chose
  // que la station demande. C'est la leçon inaugurale.
  //
  // Le sommet fait 18,2 × 17,6, soit plus du double de la portée du bras (8) :
  // ce qu'on y pose y reste, on ne le sème pas par-dessus bord.
  out.push(pose(-348.6, -332.4, 11.8, 27.4, 6.9, 2));
  out.push(sur(-349.6, -331.4, 10.8, 28.4, SOL + 6.9, 0.5, 3));
  // 0 → 3,20 → 6,60 → 7,40. Trois pas de 3,20, 3,40 et 0,80, tous sous
  // l'enjambée : l'ascension est gratuite À CONDITION d'être allé la chercher.
  out.push(pose(-344.8, -336.2, 27.0, 32.2, 6.6, 1));
  out.push(pose(-343.4, -335.6, 31.6, 37.4, 3.2, 3));

  // Les tessons de la cour. Aucun ne dépasse 2,60 : c'est du décor au sol, et
  // du décor au sol ne doit jamais faire hésiter sur la route.
  out.push(tas(-330.2, -15.4, 3.8, 3.2, 1.8, 3));
  out.push(tas(-353.1, -9.6, 3.1, 2.8, 1.1, 0));
  out.push(tas(-356.8, 17.8, 3.6, 3.2, 2.4, 3));
  out.push(tas(-326.4, 19.6, 3.8, 3.2, 1.4, 0));
  out.push(tas(-369.7, -17.3, 2.9, 2.9, 2.0, 3));

  // ═══════════════════════════════════════════════════════════════════════════
  // B — LES FOURS.  x de -368 à -454
  //
  // Quatre ruches d'argile cuite, deux au nord, deux au sud, et la voie qui
  // serpente entre elles. Aucune ne se gravit : leur première vire est à huit
  // mètres au moins, et le joueur saute 5,18.
  // ═══════════════════════════════════════════════════════════════════════════

  // La voie des chariots. Deux ornières d'encre, hautes de 0,90 et 0,75 — assez
  // pour porter une ombre, trop peu pour se sentir sous le pied. C'est le seul
  // trait continu de la région, et il dit « par ici » sans qu'un mot soit écrit.
  out.push(pose(-457.0, -358.0, -5.4, -3.6, 0.9, 3));
  out.push(pose(-455.4, -359.6, 3.5, 5.1, 0.75, 3));

  // Les trois séchoirs : des tables de plaques d'argile mises à sécher. Ils
  // chevauchent la voie en alternance — sud, nord, sud — de sorte qu'on ne
  // marche jamais droit plus de vingt mètres. Les deux premiers font 3,45 et
  // 3,20, sous l'enjambée : on les traverse. Le troisième fait 4,80, au-dessus
  // de l'enjambée et sous le saut : c'est le seul obstacle de la voie qui
  // demande une décision, et l'on peut toujours le contourner.
  out.push(pose(-406.0, -401.6, -13.4, 2.2, 3.0, 2));
  out.push(sur(-407.0, -400.6, -14.2, 3.0, SOL + 3.0, 0.45, 0));
  out.push(pose(-436.0, -431.6, -1.8, 13.6, 2.7, 2));
  out.push(sur(-437.0, -430.6, -2.6, 14.4, SOL + 2.7, 0.5, 0));
  out.push(pose(-446.8, -442.4, -11.0, 4.6, 4.3, 2));
  out.push(sur(-447.8, -441.4, -11.8, 5.4, SOL + 4.3, 0.5, 0));

  // Les trois fours intacts, et leurs gueules tournées vers la voie.
  out.push(...four(-392, -34, 13.5, 20.4), ...gueule(-392, -20.5, 1, 7.4));
  out.push(...four(-378, 36, 15.5, 25.6), ...gueule(-378, 20.5, -1, 7.8));
  out.push(...four(-438, -36, 14.5, 22.8), ...gueule(-438, -21.5, 1, 8.2));

  // ─── LE FOUR ÉVENTRÉ — station 2 ───────────────────────────────────────────
  //
  // Le morceau de bravoure, et la vraie énigme de la région.
  //
  // Vu de la voie, au sud, c'est un mur : 6,80 d'assise puis 5,40 de seconde
  // assise, aucune prise, et tout en haut, sur la lèvre brisée, le pinceau à
  // 16,80. On le voit très bien. On n'a aucun moyen d'y aller.
  //
  // La réponse est de l'autre côté, à l'OUEST : le mur du four s'est écroulé et
  // ses débris font un escalier. Il faut abandonner la voie, contourner
  // quarante mètres de four, et découvrir l'éboulis. Rien n'est caché — c'est
  // simplement invisible depuis l'endroit d'où l'on regarde.
  out.push(pose(-437, -403, 15, 49, 6.8, 2));
  out.push(sur(-433.6, -406.4, 18.2, 45.6, SOL + 6.8, 5.4, 1));

  // La lèvre, en quatre pans de hauteurs différentes : une poterie ne se casse
  // pas droit. 13,40 à l'ouest (la brèche), puis 14,60, 15,90 et 16,80 — on
  // monte en spirale, de 1,20 puis 1,30 puis 0,90. Le cratère au milieu a son
  // fond à 12,20 et ses parois les plus hautes font 4,60 : on en ressort d'un
  // saut (5,18), quoi qu'il arrive. On ne piège jamais.
  //
  // Les quatre pans n'ont AUCUNE cote en commun — ni bord, ni sommet. Quatre
  // murs d'un même anneau, c'est le cas type où l'on aligne huit faces sans
  // s'en apercevoir.
  out.push(sur(-432.4, -407.6, 19.4, 25.4, SOL + 12.2, 4.6, 2)); // sud, le perchoir
  out.push(sur(-431.8, -408.2, 38.4, 44.6, SOL + 12.2, 2.4, 1)); // nord
  out.push(sur(-413.2, -408.6, 24.8, 39.0, SOL + 12.2, 3.7, 2)); // est
  out.push(sur(-431.4, -426.4, 24.6, 39.4, SOL + 12.2, 1.2, 3)); // ouest, la brèche

  // L'éboulis. 3,30 → 6,50 → (vire du four à 6,80) → 10,10 → (brèche à 13,40).
  // Quatre pas de 3,30, 3,20, 0,30, 3,30 et 3,30 : pas un seul ne dépasse
  // l'enjambée de 3,60, et pas un seul ne s'en approche à moins de trente
  // centimètres. Une marche calibrée au ras du possible est une marche qui
  // finira par ne plus passer.
  out.push(pose(-451.4, -441.6, 22.4, 34.6, 3.3, 3));
  out.push(pose(-445.2, -436.2, 24.6, 36.0, 6.5, 1));
  out.push(pose(-437.8, -429.6, 26.2, 33.4, 10.1, 3));

  // La gueule du four éventré, elle, reste tournée vers la voie : c'est ce
  // qu'on voit, et c'est ce qui ne sert à rien. Son linteau plafonne à 6,20,
  // sous la vire de 6,80 — et ses piédroits dépassent le saut, donc on n'y
  // grimpe pas davantage.
  out.push(...gueule(-420, 15, -1, 6.2));

  // Quelques tessons hors de la voie, pour que le sol ne soit pas nu.
  out.push(tas(-400.0, 6.0, 3.6, 3.1, 2.6, 3));
  out.push(tas(-452.0, -5.9, 3.6, 3.3, 1.6, 0));

  // ═══════════════════════════════════════════════════════════════════════════
  // C — LES BASSINS DE DÉCANTATION.  x de -452 à -484
  //
  // Trois cuves de barbotine. Celle du milieu est EN TRAVERS de la voie : on la
  // traverse forcément, on marche dans la boue claire, et pendant vingt mètres
  // le sol devient pâle. C'est le seul endroit de la région où l'on change de
  // valeur sous les pieds.
  // ═══════════════════════════════════════════════════════════════════════════
  out.push(...bassin(-478, -458, -16.6, 14.2));
  out.push(...bassin(-482, -460, -52, -24));
  out.push(...bassin(-472, -452, 22, 46));

  // ═══════════════════════════════════════════════════════════════════════════
  // D — LE BOL DU FOND.  x de -474 à -520
  //
  // La côte se referme. Deux épaulements avancent du nord et du sud, la falaise
  // ferme l'ouest, et l'on sort au milieu, en [-510, 0, 0].
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── LA FALAISE, en bandes verticales ──────────────────────────────────────
  //
  // Pas un mur : une paroi de carrière, taillée en tranches inégales. Chaque
  // bande a sa hauteur (de 24 à 52) et son propre retrait, et le retrait est
  // CALCULÉ pour creuser une alcôve au milieu : la bande la plus profonde est
  // celle qui fait face à la sortie. On sort donc dans un renfoncement, pas
  // contre une planche.
  //
  // Les bandes mordent de 0,60 l'une sur l'autre, et leur face arrière prend
  // quatre valeurs différentes à tour de rôle : deux bandes voisines ne peuvent
  // donc jamais partager un plan, ni devant ni derrière.
  for (let i = 0; i < 14; i++) {
    const z0 = -72 + i * 10.6;
    const zc = z0 + 5.3;
    const creux = 3.0 * Math.exp(-((zc / 34) ** 2));
    // Le dos ne touche JAMAIS x = -520 : c'est la lisière de la parcelle, et
    // c'est aussi la tranche ouest de la dalle. Une bande calée dessus mettait
    // sa face arrière dans le plan exact du bord du sol — sept mètres carrés
    // grésillants, quatre fois de suite.
    const dos = -519.7 + (i % 4) * 0.35;
    const face = -515.4 - creux - (i % 3) * 0.27;
    const haut = 24 + ((i * 7) % 5) * 5.4 + (i % 3) * 1.3;
    out.push(pose(dos, face, z0, z0 + 11.2, haut, i % 2 ? 2 : 1));
  }

  // ─── LES ÉPAULEMENTS ───────────────────────────────────────────────────────
  // Deux masses par côté, la seconde plus haute et plus reculée que la
  // première. Les écarts (12,60 puis 9,80 au sud ; 15,40 puis 11,60 au nord)
  // dépassent tous largement le saut : les épaulements se regardent, ils ne se
  // gravissent pas. Ils servent à fermer le bol, pas à y jouer.
  out.push(pose(-517.0, -488.0, -96.0, -60.0, 12.6, 2));
  out.push(pose(-518.6, -496.0, -118.0, -92.0, 22.4, 1));
  out.push(pose(-517.4, -484.0, 70.0, 96.0, 15.4, 2));
  out.push(pose(-519.0, -492.0, 88.0, 99.6, 27.0, 1));

  // ─── LE DERNIER FOUR — station 3 ───────────────────────────────────────────
  //
  // Trente mètres. On le voit depuis la cour d'entrée, deux cents mètres à
  // l'est : c'est lui qui donne le cap pendant toute la traversée. Ses trois
  // assises montent de 11,40, 10,40 et 8,20 — trois murs, aucune prise, jamais.
  //
  // Sa couronne fait 22 × 22, presque trois fois la portée du bras : c'est la
  // plus grande surface haute de la région, et de loin la plus belle place où
  // poser quelque chose.
  out.push(pose(-510, -474, 16, 52, 11.4, 2));
  out.push(sur(-506.6, -477.4, 19.4, 48.8, SOL + 11.4, 10.4, 1));
  out.push(sur(-503.4, -481.2, 23.2, 45.4, SOL + 21.8, 8.2, 2));
  // La mitre : un simple bourrelet de 1,50 au bord ouest de la couronne. Il
  // découpe la silhouette sur le ciel sans jamais gêner le pas.
  out.push(sur(-503.0, -497.6, 24.6, 44.0, SOL + 30.0, 1.5, 3));

  // ─── LA RAMPE DES CHARIOTS ─────────────────────────────────────────────────
  //
  // Le vrai détour de la région, et il se mérite.
  //
  // On arrive dans le bol par le sud-ouest, la sortie droit devant. Le pinceau
  // est là-haut, plein nord, sur une couronne inaccessible. La seule route est
  // une rampe de terre battue qui commence QUARANTE MÈTRES EN ARRIÈRE, à
  // x = -448, tout au nord : il faut rebrousser chemin, longer les bassins, et
  // remonter huit paliers de 3,20 avant de redescendre vers le four.
  //
  // C'est délibérément le contraire du chemin le plus court : celui-là passe
  // devant le four sans jamais montrer par où l'on monte.
  out.push(...volee(-448, -1, 61.5, 9.0, 8, 5.4, 3.2, 3.2, 1));
  // Le dernier tronçon vire au sud et vient mordre dans la couronne : 25,60 →
  // 28,80 → 30,00. Neuf mètres de large, donc on y marche à l'aise et l'on
  // peut même y poser ce qu'on porte.
  out.push(pose(-498.0, -489.0, 45.0, 61.2, 28.8, 1));

  // ─── LE BOL ────────────────────────────────────────────────────────────────

  // La cheminée abattue. 4,60 : au-dessus de l'enjambée, sous le saut. Elle ne
  // mène nulle part et c'est très bien ainsi — c'est une image, pas une énigme.
  out.push(pose(-502.0, -481.0, -44.0, -37.6, 4.6, 2));
  out.push(sur(-503.0, -480.0, -42.6, -39.0, SOL + 4.6, 0.6, 1));

  // Les bornes de sortie. Elles répondent à celles de l'entrée, deux cents
  // mètres plus loin et deux mètres plus hautes : on entre dans la côte par une
  // porte, on en sort par une porte. Fûts de 8,80 et 9,20, hors d'atteinte.
  out.push(pose(-505.6, -501.2, -14.0, -9.2, 8.8, 2));
  out.push(sur(-506.6, -500.2, -14.8, -8.4, SOL + 8.8, 1.6, 3));
  out.push(pose(-505.0, -500.6, 9.4, 14.2, 9.2, 2));
  out.push(sur(-506.0, -499.6, 8.6, 15.0, SOL + 9.2, 1.6, 3));
  // Et deux bordures qui prolongent l'alcôve jusqu'à la falaise, à quatorze
  // mètres de l'axe : elles cadrent la sortie sans jamais s'en approcher.
  out.push(pose(-514.6, -503.4, -15.4, -13.2, 1.05, 2));
  out.push(pose(-513.8, -502.6, 13.4, 15.6, 0.9, 2));

  out.push(tas(-492.4, -19.2, 4.1, 3.7, 2.2, 3));
  out.push(tas(-482.7, 9.4, 3.3, 3.2, 1.3, 0));

  // ═══════════════════════════════════════════════════════════════════════════
  // LE LOINTAIN — les crassiers.
  //
  // Tout ce qui précède tient dans une bande de cent trente mètres. Le reste de
  // la parcelle est le terril : des tas d'argile et de cendre, semés au hasard,
  // qui donnent une profondeur au regard sans jamais rien proposer. On n'y va
  // pas, on les regarde.
  //
  // Aucun ne dépasse 3,20 — sous l'enjambée. Un tas qu'on peut escalader
  // deviendrait une question, or ce n'en est pas une.
  // ═══════════════════════════════════════════════════════════════════════════
  const libre = (x: number, z: number): boolean => {
    if (z > -58 && z < 70) return false; // tout le chantier
    if (x < -478) return false; // les épaulements du fond
    return true;
  };
  for (let i = 0; i < 90; i++) {
    const x = -514 + r() * 208;
    const z = -114 + r() * 208;
    if (!libre(x, z)) continue;
    const w = 3 + r() * 9;
    const d = 3 + r() * 8;
    if (x - w < -518 || x + w > -302 || z - d < -118 || z + d > 98) continue;
    out.push(tas(x, z, w, d, 0.8 + r() * 2.4, r() < 0.35 ? 3 : r() < 0.7 ? 0 : 2));
  }

  return out;
};

/**
 * LA CÔTE ROUGE.
 *
 * Trois stations, et aucune ne se prend d'un pas :
 *
 *   1. la pile de briques, à 7,40 — la hauteur du joueur lui-même. Sa coiffe
 *      déborde d'un mètre : par le sud, aucune prise. Les deux marches sont
 *      derrière. Il suffit de faire le tour, et c'est tout ce qu'on demande.
 *
 *   2. la lèvre du four éventré, à 16,80. De la voie on la voit parfaitement
 *      et l'on n'a rien : douze mètres de mur lisse. L'éboulis qui y mène est
 *      sur l'autre face, plein ouest, et il faut contourner tout le four pour
 *      le découvrir.
 *
 *   3. la couronne du dernier four, à 30,00 — visible depuis l'entrée de la
 *      région. Trois assises infranchissables. La rampe qui y monte commence
 *      quarante mètres EN ARRIÈRE, au nord : il faut renoncer à la sortie qu'on
 *      a droit devant soi, rebrousser chemin, et gravir huit paliers. C'est le
 *      détour, et il est aussi long que le reste du chemin.
 */
export const ROUGE: RegionModule = {
  region: {
    name: R,
    min: [-520, -6, -120],
    max: [-300, 120, 100],
    // LE CONTREPOINT EXACT du village crème et des hauteurs glacées. Même
    // trait, mêmes aplats, même grain — seule la gamme bascule. On reste dans
    // une estampe : ce sont des terres et des laques, pas des flammes. Le seul
    // ton vif est la braise, et il ne sert qu'aux accents : les gueules des
    // fours, les ornières, les coiffes. Tout le reste est cuit et refroidi.
    paper: '#f3ded0',
    colors: [
      '#f0d0ab', // 0 — poussière d'argile crue : les cours, la barbotine
      '#cc7040', // 1 — terre cuite : le sol, les rampes, les briques
      '#7d2b1c', // 2 — laque brûlée : les fours, les murs, les bornes
      '#e8562a', // 3 — la braise : l'accent, et rien d'autre
    ],
    ink: '#2b1210',
  },

  bounds: { min: [-520, -6, -120], max: [-300, 120, 100] },

  boxes: decor(),

  stations: [
    // 1. La pile de briques, à 7,40. On fait le tour, les marches sont au nord.
    [-340.5, 7.4, 19.6],
    // 2. La lèvre sud du four éventré, à 16,80. Vue de la voie, imprenable de
    //    la voie : l'éboulis est à l'ouest, derrière quarante mètres de four.
    [-420.0, 16.8, 22.4],
    // 3. La couronne du dernier four, à 30,00. La rampe commence en arrière.
    [-492.0, 30.0, 34.0],
  ],

  entree: [-310, 0, 0],
  sortie: [-510, 0, 0],
};

/**
 * Les nombres du joueur à ×4 servent à calibrer, pas à décorer : on les rappelle
 * ici pour que personne ne retouche une hauteur « à l'œil ».
 */
export const CALIBRAGE_ROUGE = {
  taille: 7.2,
  enjambee: ENJAMBEE,
  saut: SAUT,
  diametre: DIAMETRE,
  portee: PORTEE,
};
