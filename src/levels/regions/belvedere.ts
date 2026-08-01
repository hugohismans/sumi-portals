import type { BoxDef } from '../../core/types.js';
import type { RegionModule } from './contrat.js';

/**
 * LE BELVÉDÈRE — le sommet du monde, à l'échelle ×16.
 *
 * On arrive ici par la seconde porte, cent vingt mètres au-dessus du village.
 * Une dalle nue n'aurait rien récompensé : on serait monté pour constater qu'il
 * n'y a rien en haut. Il fallait donc que l'altitude ait un OCCUPANT — que
 * quelqu'un soit venu avant nous, ait taillé la pierre, et soit reparti.
 *
 * D'où le parti : un sanctuaire abandonné, pas un point de vue aménagé.
 *
 *   — LA VOIE, au sud : deux bordures et huit stèles qui grandissent à mesure
 *     qu'on avance. C'est le seul dispositif qui dise « continue » sans mot.
 *   — LE SEUIL : deux pylônes qui encadrent la porte par laquelle on est venu.
 *     Elle devient un monument dès qu'on l'a franchie.
 *   — LE SOCLE ET LA TOUR DU GUET, à l'ouest : la seule vraie ascension du
 *     lieu. Quatre marches géantes, une terrasse balustrée, trois gradins, un
 *     mât. C'est de là qu'on voit l'Aiguille par-dessus.
 *   — LA ROTONDE, à l'est : six colonnes, un architrave, un oculus, une vasque
 *     au centre. Un lieu où l'on entre, pas un objet qu'on regarde.
 *   — LE GNOMON : une aiguille de pierre de 162 de haut. L'écho exact de celle
 *     qu'on n'a pas pu gravir en bas et qu'on domine maintenant.
 *   — LA PORTE DU NORD : le terme. On la traverse et le voyage est fini.
 *
 * LA PALETTE : minérale, blanchie, presque effacée. En altitude la couleur
 * s'évapore ; il ne reste que la pierre, l'ombre, et un or pâle pour ce que la
 * main de l'homme a posé (lisses, chapiteaux, linteaux). Aucune technique
 * nouvelle : mêmes aplats francs, même trait, même grain que partout ailleurs.
 *
 * LE CALIBRAGE, une bonne fois : le joueur mesure 28,8. Il ENJAMBE 14,4 et
 * SAUTE 20,7 ; son diamètre est 10,9. Toutes les marches d'ici font 11 — donc
 * franchissables, jamais gratuites. Tous les garde-corps font 26 — donc
 * infranchissables, même en sautant. Rien n'est jugé à vue.
 *
 * L'ENFONCEMENT : la face supérieure de la dalle existante est à y = 120 pile.
 * Tout ce qui suit démarre à 119,5 ou plus bas, JAMAIS à 120 : deux faces au
 * même niveau se disputent la profondeur et grésillent.
 */

// --- Les nombres qui commandent tout ----------------------------------------

/** On s'enfonce sous la dalle : à 120 pile, les deux faces grésilleraient. */
const ASSISE = 119.5;

/** Hauteur de garde-corps : au-dessus du saut (20,7), donc rien à négocier. */
const RAIL_H = 26;
/** Écart entre montants : sous le diamètre du joueur (10,9), donc il ne passe pas. */
const RAIL_ECART = 8.4;
const RAIL_MONTANT = 3.2;

/**
 * Hauteur de marche unique du lieu : sous l'enjambée (14,4), donc gravissable.
 * Gardée en référence — c'est elle qui a servi à caler chaque gradin du lieu.
 */
export const MARCHE_BELVEDERE = 11;

/** Altitude de la terrasse du socle ouest, but de l'ascension. */
const TERRASSE = 164.2;

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'belvedere', ...opts });

/**
 * BALUSTRADE — même dispositif que partout dans le monde, à l'échelle du géant.
 * Un parapet plein aurait tué le sujet : on est monté pour voir en bas. Les
 * montants s'arrêtent SOUS la lisse, qui les coiffe en débordant, sans quoi
 * leurs faces hautes seraient exactement dans le plan de la lisse.
 */
const balustrade = (
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  h = RAIL_H,
  ecart = RAIL_ECART,
  montant = RAIL_MONTANT,
): BoxDef[] => {
  const out: BoxDef[] = [];
  const long = x1 - x0 > z1 - z0;
  const from = long ? x0 : z0;
  const to = long ? x1 : z1;
  const hp = h - 0.35 * (montant / 0.7);
  for (let t = from; t < to - 0.3; t += ecart + montant) {
    const a = t;
    const b = Math.min(t + montant, to);
    out.push(
      long ? box([a, y - 2, z0], [b, y + hp, z1], 3) : box([x0, y - 2, a], [x1, y + hp, b], 3),
    );
  }
  const o = montant * 0.22;
  out.push(box([x0 - o, y + hp - montant * 0.5, z0 - o], [x1 + o, y + h, z1 + o], 3));
  return out;
};

/**
 * STÈLE — un socle débordant, un fût, un chapiteau plus large encore.
 * Les trois pièces s'interpénètrent verticalement : le bas du fût est noyé dans
 * le socle, le haut du fût dans le chapiteau. Aucune face ne reste exposée en
 * doublon, et le débord donne à chaque étage sa ligne d'encre.
 *
 * Une stèle de 3 mètres serait un caillou pour un joueur de 28,8 : ici la plus
 * petite dépasse 30 et la plus haute frôle 80.
 */
const stele = (cx: number, cz: number, demi: number, hauteur: number, teinte: number): BoxDef[] => {
  const s = demi + 2.4;
  const c = demi + 3.2;
  return [
    box([cx - s, 119.2, cz - s], [cx + s, 124.6, cz + s], 2),
    box([cx - demi, ASSISE, cz - demi], [cx + demi, hauteur, cz + demi], teinte),
    box([cx - c, hauteur - 3, cz - c], [cx + c, hauteur + 6, cz + c], 3),
  ];
};

/** Colonne de la rotonde. Sa base est noyée dans le stylobate, son sommet dans l'architrave. */
const colonne = (cx: number, cz: number): BoxDef => box([cx - 7, 132.8, cz - 7], [cx + 7, 196, cz + 7], 1);

const boxes: BoxDef[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// LE PARVIS — ce qu'on foule en arrivant
//
// Deux dallages qui laissent l'axe central NU. C'est délibéré : l'entrée
// [0, 120, 250], la sortie [0, 120, 350] et la porte qui les relie sont sur
// cet axe, et une dalle même haute de 1 aurait fait arriver le joueur enfoncé
// dans la pierre. La bande sud dépasse le dallage vers le sud pour que leurs
// faces ne tombent pas dans le même plan.
// ═══════════════════════════════════════════════════════════════════════════
boxes.push(
  box([-236, ASSISE, 202], [-36, 120.9, 234], 0),
  box([36, ASSISE, 202], [160, 120.9, 234], 0),
  box([-236, 119.4, 200.8], [-36, 122.4, 208], 2),
  box([36, 119.4, 200.8], [160, 122.4, 208], 2),
);

// ═══════════════════════════════════════════════════════════════════════════
// LA VOIE DES STÈLES
//
// Deux bordures posent l'axe, larges de 54 entre elles — cinq fois le diamètre
// du joueur, donc une avenue et non un couloir. Les stèles intérieures
// GRANDISSENT vers le nord (166, 180, 194) : c'est le seul moyen de dire
// « avance » sans flèche ni texte. Les extérieures, plus basses et décalées,
// donnent la profondeur.
// ═══════════════════════════════════════════════════════════════════════════
boxes.push(
  box([-34, ASSISE, 238], [-27, 122.6, 286], 2),
  box([27, ASSISE, 238], [34, 122.6, 286], 2),
);

for (const cote of [-1, 1]) {
  boxes.push(
    ...stele(cote * 56, 220, 10, 166, 1),
    ...stele(cote * 56, 248, 10, 180, 1),
    ...stele(cote * 56, 274, 10, 194, 1),
    ...stele(cote * 104, 234, 8, 150, 2),
    ...stele(cote * 104, 262, 8, 162, 2),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE SEUIL — deux pylônes encadrant la porte
//
// La porte d'arrivée est à x = 0, z = 300, large de 30,4. Les pylônes s'ouvrent
// à 34 de l'axe : ils la cadrent sans jamais la toucher. Une fois franchie,
// elle cesse d'être un passage et devient le monument qu'on a derrière soi.
// ═══════════════════════════════════════════════════════════════════════════
for (const cote of [-1, 1]) {
  const a = cote < 0 ? -74 : 34;
  const b = cote < 0 ? -34 : 74;
  boxes.push(
    box([a, ASSISE, 294], [b, 196, 318], 1),
    box([a - 3.6, 193, 290.4], [b + 3.6, 205, 321.6], 3),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE GRAND ESCALIER DE L'OUEST
//
// Quatre marches de 11 : le joueur enjambe 14,4, donc il monte sans réfléchir.
// Ce n'est pas un obstacle, c'est une CÉRÉMONIE — on ne rejoint pas un
// sanctuaire de plain-pied. Chaque marche mord 1,5 sur la précédente et se
// rétrécit de 0,4 : sans ce léger fruit, leurs flancs tomberaient exactement
// dans le même plan là où elles se chevauchent.
// ═══════════════════════════════════════════════════════════════════════════
const MARCHES: { z0: number; z1: number; haut: number; retrait: number; base: number }[] = [
  { z0: 236, z1: 252, haut: 130.5, retrait: 0, base: 119.5 },
  { z0: 250.5, z1: 268, haut: 141.5, retrait: 0.4, base: 119.6 },
  { z0: 266.5, z1: 284, haut: 152.5, retrait: 0.8, base: 119.7 },
  // La dernière s'enfonce de 2 dans le socle : sa face nord disparaît dedans.
  { z0: 282.5, z1: 302, haut: 163.5, retrait: 1.2, base: 119.8 },
];

for (const m of MARCHES) {
  boxes.push(box([-194 + m.retrait, m.base, m.z0], [-162 - m.retrait, m.haut, m.z1], 1));
  // Bornes latérales : elles mordent de 3 sur la marche, donc rien ne coïncide.
  // Hautes de 9 au-dessus du giron, elles bordent sans jamais gêner le pas.
  const c = (m.z0 + m.z1) / 2;
  boxes.push(
    box([-203, 119.4, c - 6], [-191, m.haut + 9, c + 6], 2),
    box([-165, 119.4, c - 6], [-153, m.haut + 9, c + 6], 2),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE SOCLE ET SA TERRASSE
//
// 116 × 60 de pierre pleine, 44 au-dessus de la dalle. Sa face haute est à
// 164,2 quand la dernière marche s'arrête à 163,5 : ce ressaut de 0,7 est
// invisible au pied mais il évite deux faces jumelles.
//
// La balustrade court sur tout le pourtour SAUF là où l'escalier débouche
// (40 d'ouverture, largement de quoi passer). Les tronçons ne se touchent
// jamais : 4 à 5 de jeu aux angles — trop peu pour tomber, assez pour que deux
// lisses ne partagent pas leur face supérieure.
// ═══════════════════════════════════════════════════════════════════════════
boxes.push(box([-236, ASSISE, 300], [-120, TERRASSE, 360], 0));
boxes.push(
  ...balustrade(-233, -229, 303, 357, TERRASSE),
  ...balustrade(-127, -123, 303, 357, TERRASSE),
  ...balustrade(-224, -131, 353, 357, TERRASSE),
  ...balustrade(-224, -198, 303, 307, TERRASSE),
  ...balustrade(-158, -131, 303, 307, TERRASSE),
);

// ═══════════════════════════════════════════════════════════════════════════
// LA TOUR DU GUET — le point le plus haut où l'on met les pieds
//
// Trois gradins de 11, donc trois enjambées, donc aucune énigme de saut : la
// difficulté n'est pas de monter, elle est de COMPRENDRE qu'on peut monter. Le
// retrait est de 6 côté ouest et sud (impraticable, 6 < 10,9 : on le voit sans
// pouvoir y marcher) mais de 14 côté est : il n'existe qu'un seul chemin, et il
// se lit d'en bas.
//
// Le dernier gradin est ceinturé à l'ouest, au nord et au sud — c'est le seul
// endroit du belvédère d'où l'on pourrait franchir le garde-corps du monde et
// tomber de cent vingt mètres. Le côté est reste ouvert : c'est la porte, et
// tomber par là ne coûte que les 11 du gradin d'en dessous.
// ═══════════════════════════════════════════════════════════════════════════
const SOMMET = 197.2;
boxes.push(
  box([-224, 163.8, 309], [-152, 175.2, 350], 1),
  box([-218, 174.4, 315], [-166, 186.2, 344], 1),
  box([-212, 185.4, 321], [-180, SOMMET, 338], 1),
);
boxes.push(
  ...balustrade(-209, -205, 324, 335, SOMMET),
  ...balustrade(-200, -183, 331, 335, SOMMET),
  ...balustrade(-200, -183, 324, 328, SOMMET),
);
// Le mât et son fanal. Ils ne servent à rien — c'est justement pour ça qu'on
// les voit depuis la Voie, 100 mètres plus au sud : une silhouette au-dessus de
// la ligne d'horizon dit « il y a un dessus » avant qu'on sache comment y aller.
boxes.push(
  box([-204, 196.8, 328], [-196, 236, 334], 2),
  box([-210, 233, 323], [-190, 245, 339], 3),
);

// ═══════════════════════════════════════════════════════════════════════════
// LA ROTONDE DE L'EST — un lieu où l'on ENTRE
//
// Six colonnes, pas huit : à huit, les intervalles des petits côtés tombaient à
// 6 et refermaient l'édifice. Ici les passages font 22 et 14 — au-dessus du
// diamètre du joueur (10,9), donc on entre, et donc on ressort. Un monument
// hermétique aurait été un décor ; celui-ci est une salle.
//
// L'architrave, l'oculus : le centre reste ouvert sur le ciel. Un toit plein
// aurait fait une caisse, et de la seule chose qu'on ait ici — la lumière et le
// vide — il ne serait rien resté.
// ═══════════════════════════════════════════════════════════════════════════
boxes.push(
  // Stylobate à deux degrés de 6,9 : on y monte sans le remarquer.
  box([92, ASSISE, 282], [208, 126.4, 342], 0),
  box([100, 126.0, 290], [200, 133.3, 334], 1),
);
for (const cx of [114, 150, 186]) {
  boxes.push(colonne(cx, 298), colonne(cx, 326));
}
boxes.push(
  // Architrave. Les poutres est/ouest sont plus épaisses de 0,4 en haut comme
  // en bas : aux angles elles avalent les faces des poutres nord/sud au lieu de
  // les affronter dans le même plan.
  box([104, 194, 288], [196, 208, 308], 2),
  box([104, 194, 316], [196, 208, 336], 2),
  box([104, 193.6, 294], [124, 209.2, 330], 2),
  box([176, 193.6, 294], [196, 209.2, 330], 2),
  // Corniche en anneau, débordante : c'est elle qui donne au sommet sa ligne.
  box([100, 206, 284], [200, 214.6, 310], 3),
  box([100, 206, 314], [200, 214.6, 340], 3),
  box([100, 205.6, 308], [126, 215.4, 316], 3),
  box([174, 205.6, 308], [200, 215.4, 316], 3),
);
// L'autel et sa vasque. La vasque coiffe l'autel et le noie : sa face haute est
// à 151,5, soit 18,2 au-dessus du stylobate — sous le saut (20,7) mais très
// au-dessus de l'enjambée (14,4). On n'y monte donc pas en marchant : il faut
// sauter, et c'est le seul endroit du belvédère où l'on doive le faire.
boxes.push(
  box([138, 132.9, 308], [162, 146, 316], 2),
  box([134, 144, 306], [166, 151.5, 318], 3),
);

// ═══════════════════════════════════════════════════════════════════════════
// LE GNOMON — 162 au-dessus de la dalle
//
// L'Aiguille du village fait 110 et on n'a jamais pu la gravir ; d'ici on en
// surplombe la pointe. Alors on en replante une, plus haute encore, et
// toujours inaccessible : le voyage ne se termine pas sur un objet vaincu.
// Chaque tronçon se rétrécit et mord sur le précédent, si bien qu'aucun ressaut
// ne fait 14,4 — impossible de l'escalader, même par les gradins apparents.
// ═══════════════════════════════════════════════════════════════════════════
const GNOMON: [number, number, number, number, number][] = [
  [170, 210, 220, 260, 131],
  [176, 204, 226, 254, 152],
  [179, 201, 229, 251, 214],
  [181.5, 198.5, 231.5, 248.5, 256],
  [183, 197, 233, 247, 266],
  [185.5, 194.5, 235.5, 244.5, 274],
  [188, 192, 238, 242, 282],
];
let socleGnomon = 119.4;
for (const [x0, x1, z0, z1, haut] of GNOMON) {
  boxes.push(box([x0, socleGnomon, z0], [x1, haut, z1], socleGnomon > 250 ? 3 : 1));
  socleGnomon = haut - 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// LA PORTE DU NORD — le terme
//
// Deux piles lisses de 70 et un linteau qui les enjambe : rien à gravir, rien à
// résoudre. On passe dessous et c'est fini. L'ouverture fait 48 de large et 66
// sous linteau, soit plus de deux fois la taille du joueur — un portique ne
// doit jamais donner l'impression qu'on s'y faufile.
// ═══════════════════════════════════════════════════════════════════════════
boxes.push(
  box([-46, ASSISE, 344], [-24, 190, 362], 1),
  box([24, ASSISE, 344], [46, 190, 362], 1),
  box([-52, 186, 340], [52, 200, 366], 2),
  box([-58, 198, 336], [58, 208, 369], 3),
);
// Deux stèles l'encadrent de loin, pour que la porte ait un avant.
boxes.push(...stele(-76, 348, 11, 184, 1), ...stele(76, 348, 11, 184, 1));

// Garde-corps du promontoire nord. Le vrai bord du belvédère est encore plus
// loin ; celui-ci est une lisse de contemplation, posée là où l'on s'accoude.
// Sa base est à 121,2 — donc ses montants s'enfoncent de 0,8 dans la dalle
// sans jamais descendre sous 119, plancher de la parcelle.
boxes.push(...balustrade(-118, -60, 362, 366, 121.2), ...balustrade(60, 118, 362, 366, 121.2));

export const BELVEDERE: RegionModule = {
  region: {
    name: 'belvedere',
    min: [-250, 119, 200],
    max: [250, 300, 370],
    // Le papier est plus clair qu'en bas : à cette altitude la couleur s'évapore.
    paper: '#e9eeef',
    // Calcaire blanchi, pierre, ombre froide — et un or pâle réservé à ce que la
    // main a posé : lisses, chapiteaux, linteaux, corniches.
    colors: ['#dfe6e6', '#c3ccce', '#8e9ba1', '#b9a05a'],
    ink: '#1b2226',
  },

  bounds: { min: [-250, 119, 200], max: [250, 300, 370] },

  boxes,

  // LES STATIONS DU PINCEAU — de plus en plus haut, comme le lieu.
  stations: [
    // 1. Sur la Voie, au sol, à quelques pas de l'entrée : il accueille.
    [0, 120, 258],
    // 2. Sur la vasque de la rotonde, à 31,5 au-dessus de la dalle. On la voit
    //    entre les colonnes depuis la Voie, mais l'atteindre demande d'entrer,
    //    de monter deux degrés — et de sauter les 18,2 du dernier ressaut.
    [150, 151.7, 312],
    // 3. Au sommet de la tour du guet, 77 au-dessus de la dalle. Depuis
    //    l'entrée il n'est qu'une tache là-haut, à côté du mât : impossible de
    //    l'atteindre d'un pas, et rien n'indique la route. Elle existe pourtant,
    //    entière et sans saut — grand escalier, terrasse, trois gradins.
    [-192, 197.4, 330],
  ],

  entree: [0, 120, 250],
  sortie: [0, 120, 350],
};
