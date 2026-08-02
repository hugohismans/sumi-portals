import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA VALLÉE EN MAQUETTE — la seule salle du jeu qui ne demande rien.
 * ×16. Vingt-huit mètres quatre-vingts de haut, et sous les semelles la côte
 * rouge entière : la cour des tessons, la voie des chariots, les quatre fours en
 * ruche, le four éventré, les bassins, la falaise d'ocre qui fermait le monde.
 * On l'a traversée pendant deux cents mètres au premier mouvement ; on la
 * retraverse ici en huit enjambées.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUI FAIT LA SALLE : LA RECONNAISSANCE, ET RIEN D'AUTRE. Ni énigme, ni
 * logement, ni caisse — **on ne manipule rien à ×16**, règle du jeu et non
 * oubli. Tout tient dans une phrase que le joueur se dit tout seul : « je
 * connais cet endroit, j'ai mis dix minutes à le traverser, et je viens de le
 * faire en huit pas. » D'où la seule méthode possible : **on ne dessine pas une
 * vallée, on TRANSCRIT celle qui existe.** Toutes les cotes ci-dessous sont
 * celles de `regions/rouge.ts` passées par `mx / mz / mh` ; aucune n'a été
 * inventée. Une vallée neuve serait jolie et muette.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA MAQUETTE EST ANAMORPHIQUE, ET C'EST LA SEULE DÉCISION DE CE FICHIER.
 * Aucune réduction unique ne tient les deux exigences : la traversée doit faire
 * HUIT ENJAMBÉES (115 m, sur 218 m de côte réelle : 1/1,8) et le dernier four —
 * trente mètres qui donnaient le cap — doit arriver À MI-MOLLET (4 m pour un
 * joueur de 28,80 : 1/7,2). Un facteur unique donne soit une vallée de 29 m
 * qu'on franchit en deux pas, soit un four de 17 m qui arrive au ventre. On a
 * donc **écrasé les hauteurs quatre fois plus que le plan**, et c'est un choix :
 * *une maquette se regarde d'en haut, et d'en haut c'est le PLAN qui fait la
 * reconnaissance, jamais la silhouette.* L'œil est à vingt-six mètres, il lit la
 * côte comme une carte ; le plan est donc exact, et les reliefs sont de quoi
 * buter du pied, pas de quoi cacher. L'ÉTALON, C'EST SA BOTTE : la couronne du
 * dernier four faisait 22 × 22 et il y a marché, elle fait ici 12 × 12, et sa
 * boîte de collision en fait 10,88.
 *
 * NOMBRES DU JOUEUR à ×16 (aucune hauteur ne s'en écarte au hasard) : taille
 * 28,80 · enjambée 14,40 · saut 20,74 · corps 10,88 · bras 46,08
 * ON NE PIÈGE PERSONNE — mesuré, pas supposé. Déposé au fond du cratère du four
 * éventré on se pose à 2,46 et l'on en ressort en marchant ; déposé DERRIÈRE la
 * falaise on repasse par-dessus (9,15 de haut, on saute 20,74). Le seul vide est
 * le bord de la feuille, à 380 m : il se relève en rebord de trente-quatre et il
 * retient, vérifié en sprintant douze secondes dedans.
 */

const R = 'vallee';

/**
 * LA PALETTE SE SOUVIENT. La côte rouge est DÉJÀ peinte — le joueur a rapporté
 * le vermillon au premier mouvement, et une région sans `pigment` est une région
 * qui a la sienne : ce serait une faute de la lui reprendre pour décorer une
 * salle. Ce sont donc les encres de `rouge.ts`, à peine délavées. BROUILLARD 640
 * parce qu'à ×16, voir 460 m revient à en voir 29 — la portée d'une pièce
 * ordinaire ; en deçà, la vallée s'effacerait au lieu de s'ouvrir.
 */
const REGION = {
  name: R,
  min: [-400, -100, 2400] as [number, number, number],
  max: [400, 400, 3200] as [number, number, number],
  paper: '#f7e7d6',
  colors: ['#f2d8b4', '#c96f42', '#7b2c1e', '#e8562a'] as [string, string, string, string],
  ink: '#2b1210',
  brouillard: 640,
};

// LA TABLE DE CONVERSION — le cœur du fichier, et ses six lignes. `mx/mz/mh`
// prennent des coordonnées DE LA CÔTE RÉELLE et rendent celles de la maquette ;
// AXE = -411 est le milieu de la côte (-302 à -520), donc la vallée se retrouve
// centrée sur x = 0, l'est à +60,6 et l'ouest à -60,6, comme là-bas.
const PLAN = 0.556;
/** Un quart du plan. C'est l'anamorphose, et elle tient dans ce seul nombre. */
const HAUT = PLAN / 4;
const AXE = -411;
const Z0 = 2800;
/** Dessus de la côte : douze centimètres de terre rouge posés sur le papier. */
const SOL = 0.12;
/** 30 cm SOUS le papier : toute face basse est noyée au lieu d'affleurer. */
const ANCRAGE = -0.3;

const mx = (x: number): number => (x - AXE) * PLAN;
const mz = (z: number): number => Z0 + z * PLAN;
const mh = (h: number): number => SOL + h * HAUT;

type N3 = [number, number, number];
type Opts = { ghost?: boolean; outline?: boolean };

const b = (mn: N3, mx2: N3, ink: number, opts: Opts = {}): BoxDef =>
  ({ min: mn, max: mx2, ink, ...opts, region: R });

/** Volume posé sur la côte. Toutes les cotes sont CELLES DE LA CÔTE RÉELLE. */
const pose = (x0: number, x1: number, z0: number, z1: number, h: number, ink: number, opts: Opts = {}): BoxDef =>
  b([mx(x0), ANCRAGE, mz(z0)], [mx(x1), mh(h), mz(z1)], ink, opts);

/**
 * Volume posé sur un AUTRE volume. Il mord de 8 cm dans son support : posé pile
 * dessus, sa face basse et celle du support se disputeraient la profondeur.
 */
const sur = (x0: number, x1: number, z0: number, z1: number, base: number, h: number, ink: number): BoxDef =>
  b([mx(x0), mh(base) - 0.08, mz(z0)], [mx(x1), mh(base + h), mz(z1)], ink);

/**
 * UN FOUR EN RUCHE — quatre assises qui rétrécissent en se décalant, avec les
 * coefficients exacts de la côte (0,86 / 0,82 / 0,84 / 0,88), tous différents
 * d'une face à l'autre : deux assises n'alignent jamais leurs flancs.
 */
const four = (cx: number, cz: number, r: number, h: number): BoxDef[] => {
  const t1 = h * 0.4, t2 = h * 0.7, t3 = h * 0.88;
  return [
    pose(cx - r, cx + r, cz - r, cz + r, t1, 2),
    sur(cx - r * 0.86, cx + r * 0.82, cz - r * 0.84, cz + r * 0.88, t1, t2 - t1, 1),
    sur(cx - r * 0.62, cx + r * 0.67, cz - r * 0.69, cz + r * 0.6, t2, t3 - t2, 2),
    sur(cx - r * 0.33, cx + r * 0.29, cz - r * 0.27, cz + r * 0.32, t3, h - t3, 3),
  ];
};

/**
 * LA GUEULE DU FOUR. Là-bas, une porte de sept mètres devant laquelle on
 * s'arrêtait ; ici une tache de braise large comme une main — le seul accent vif
 * de la côte, et c'est lui qu'on reconnaît de loin. Le linteau part de `h − 2`
 * et la braise culmine à `h − 1,9`, donc elle mord dedans au lieu de l'affleurer
 * et les quatre gueules ont quatre plans distincts ; écrits en dur, les quatre
 * linteaux partageaient leur dessous.
 */
const gueule = (cx: number, czFace: number, sens: 1 | -1, h: number): BoxDef[] => {
  const dedans = czFace - sens * 2.4, nez = czFace + sens * 4.6;
  const lo = Math.min(dedans, nez), hi = Math.max(dedans, nez);
  return [
    pose(cx - 3.0, cx + 3.0, lo, hi, h - 1.9, 3),
    b([mx(cx - 7.2), mh(h - 2.0), mz(lo)], [mx(cx + 7.2), mh(h), mz(hi)], 1),
  ];
};

/**
 * UN BASSIN — quatre margelles à quatre altitudes voisines et la nappe de
 * barbotine, seule surface pâle horizontale de la côte. Vingt centimètres de
 * bord : on marche dedans sans le savoir.
 */
const bassin = (x0: number, x1: number, z0: number, z1: number): BoxDef[] => [
  pose(x0, x1, z0, z0 + 3.0, 1.45, 2),
  pose(x0 - 0.3, x1 + 0.3, z1 - 3.2, z1, 1.3, 2),
  pose(x0 - 0.2, x0 + 3.0, z0 + 1.6, z1 - 1.6, 1.55, 2),
  pose(x1 - 3.2, x1 + 0.2, z0 + 1.4, z1 - 1.4, 1.2, 2),
  pose(x0 + 1.2, x1 - 1.2, z0 + 1.2, z1 - 1.2, 0.85, 0),
];

/** Un tas — tessons, argile, cendre. Décor pur, et jamais deux à la même cote. */
const tas = (cx: number, cz: number, w: number, d: number, h: number, ink: number): BoxDef =>
  pose(cx - w, cx + w, cz - d, cz + d, h, ink);

/** LA FEUILLE — ce sur quoi la maquette est posée, et ce qui empêche d'en sortir. */
const feuille = (): BoxDef[] => [
  // Une seule pièce, sans couture, huit mètres d'épaisseur : à ×16 une dalle
  // fine se traverse. `outline: false` — un sol de 700 m cerné d'encre n'a rien
  // à dire. LE BORD SE RELÈVE ENSUITE, et ce n'est pas un décor : c'est la seule
  // chose qui empêche un curieux de marcher trois cents mètres de papier blanc
  // et de tomber hors du monde. Trente-quatre mètres, au-dessus du saut de
  // 20,74, noyé de brouillard. Les quatre murs n'ont AUCUN plan en commun —
  // quatre boîtes qui font le tour d'un rectangle se recouvrent dans les angles.
  b([-390, -8, 2410], [390, 0, 3190], 0, { outline: false }),
  b([-400, -7.5, 2402.4], [-386, 34.2, 3197.2], 1, { outline: false }),
  b([385.2, -7.2, 2401.2], [400, 35.1, 3198.6], 1, { outline: false }),
  b([-398.6, -6.9, 2400], [398.2, 33.6, 2414.4], 1, { outline: false }),
  b([-397.4, -6.6, 3185.6], [399.4, 34.7, 3200], 1, { outline: false }),

  // LA CÔTE : la terre rouge découpée et posée sur le papier. Douze centimètres
  // — on ne les sent pas sous le pied, mais le BORD est net, et c'est le bord
  // qui fait la maquette. Elle déborde à -71 pour porter la falaise.
  b([-71, -0.9, mz(-120)], [mx(-300), SOL, mz(100)], 1, { outline: false }),
];

/** LA CÔTE ROUGE, TRANSCRITE : la cour, les fours, les bassins, le bol. */
const cote = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ─── A — LA COUR DES TESSONS. C'est ici qu'on est déposé, comme là-bas. ────
  out.push(pose(-366, -304, -28.4, 27.6, 0.5, 0));
  out.push(pose(-366.8, -303.2, -30.6, -27.8, 1.15, 2));
  out.push(pose(-365.4, -302.6, 26.9, 29.7, 1.35, 2));
  out.push(pose(-367.6, -364.2, -31.4, -8.6, 1.6, 2));
  out.push(pose(-368.2, -364.8, 9.2, 30.4, 1.45, 2));
  // Les bornes du seuil, qui l'encadraient à ×4 et lui arrivent à la cheville.
  out.push(pose(-318.0, -313.6, -13.2, -8.4, 6.6, 2));
  out.push(sur(-319.0, -312.6, -14.0, -7.6, 6.6, 1.5, 3));
  out.push(pose(-317.4, -313.0, 8.8, 13.6, 7.0, 2));
  out.push(sur(-318.4, -312.0, 8.0, 14.4, 7.0, 1.5, 3));
  // Le mur des rebuts, et la pile de briques — celle qui faisait EXACTEMENT sa
  // taille, et dont il avait dû faire le tour pour trouver les marches.
  out.push(pose(-362.0, -322.0, -24.8, -20.6, 2.9, 2));
  out.push(sur(-363.0, -321.0, -25.6, -19.8, 2.9, 0.4, 1));
  out.push(pose(-348.6, -332.4, 11.8, 27.4, 6.9, 2));
  out.push(sur(-349.6, -331.4, 10.8, 28.4, 6.9, 0.5, 3));
  out.push(pose(-344.8, -336.2, 27.0, 32.2, 6.6, 1));
  out.push(pose(-343.4, -335.6, 31.6, 37.4, 3.2, 3));
  out.push(tas(-330.2, -15.4, 3.8, 3.2, 1.8, 3));
  out.push(tas(-353.1, -9.6, 3.1, 2.8, 1.1, 0));
  out.push(tas(-356.8, 17.8, 3.6, 3.2, 2.4, 3));
  out.push(tas(-326.4, 19.6, 3.8, 3.2, 1.4, 0));

  // ─── B — LES FOURS, ET LA VOIE QUI SERPENTE ENTRE EUX ─────────────────────
  //
  // La voie des chariots : le seul trait continu de la côte, cent mètres
  // d'ornières qui disaient « par ici » sans un mot. Cinquante-cinq mètres sur
  // un de large ici — un coup de pinceau sous une feuille de verre.
  out.push(pose(-457.0, -358.0, -5.4, -3.6, 0.9, 3));
  out.push(pose(-455.4, -359.6, 3.5, 5.1, 0.75, 3));
  // Les trois séchoirs qui la chevauchaient. Le troisième faisait 4,80 et
  // demandait une décision — sauter ou contourner ; il fait 0,67.
  out.push(pose(-406.0, -401.6, -13.4, 2.2, 3.0, 2));
  out.push(sur(-407.0, -400.6, -14.2, 3.0, 3.0, 0.45, 0));
  out.push(pose(-436.0, -431.6, -1.8, 13.6, 2.7, 2));
  out.push(sur(-437.0, -430.6, -2.6, 14.4, 2.7, 0.5, 0));
  out.push(pose(-446.8, -442.4, -4.0, 11.6, 4.3, 2));
  out.push(sur(-447.8, -441.4, -4.8, 12.4, 4.3, 0.5, 0));
  // Les trois ruches intactes, imprenables là-bas (première vire à huit mètres).
  out.push(...four(-392, -34, 13.5, 20.4), ...gueule(-392, -20.5, 1, 7.4));
  out.push(...four(-378, 36, 15.5, 25.6), ...gueule(-378, 20.5, -1, 7.8));
  out.push(...four(-438, -36, 14.5, 22.8), ...gueule(-438, -21.5, 1, 8.2));

  // LE FOUR ÉVENTRÉ, leçon retournée. Il fallait abandonner la voie, contourner
  // quarante mètres de mur lisse et trouver l'éboulis pour atteindre sa lèvre à
  // 16,80 ; elle est à 2,45, et l'on voit brèche, éboulis, cratère et perchoir
  // d'un coup d'œil. La récompense n'est pas de refaire l'énigme : de la VOIR.
  out.push(pose(-437, -403, 15, 49, 6.8, 2));
  out.push(sur(-433.6, -406.4, 18.2, 45.6, 6.8, 5.4, 1));
  out.push(sur(-432.4, -407.6, 19.4, 25.4, 12.2, 4.6, 2)); // sud, le perchoir
  out.push(sur(-431.8, -408.2, 38.4, 44.6, 12.2, 2.4, 1)); // nord
  out.push(sur(-413.2, -408.6, 24.8, 39.0, 12.2, 3.7, 2)); // est
  out.push(sur(-431.4, -426.4, 24.6, 39.4, 12.2, 1.2, 3)); // ouest, la brèche
  out.push(pose(-451.4, -441.6, 22.4, 34.6, 3.3, 3));
  out.push(pose(-445.2, -436.2, 24.6, 36.0, 6.5, 1));
  out.push(pose(-437.8, -429.6, 26.2, 33.4, 10.1, 3));
  out.push(...gueule(-420, 15, -1, 6.2));
  out.push(tas(-400.0, 6.0, 3.6, 3.1, 2.6, 3));
  out.push(tas(-452.0, -5.9, 3.6, 3.3, 1.6, 0));

  // ─── C — LES TROIS BASSINS. Celui du milieu était EN TRAVERS de la voie : on
  // marchait vingt mètres dans la boue claire. Flaque de onze mètres, un pas.
  out.push(...bassin(-478, -458, -16.6, 14.2));
  out.push(...bassin(-482, -460, -52, -24));
  out.push(...bassin(-472, -452, 22, 46));

  // ─── D — LE BOL DU FOND, LA FALAISE, ET LE DERNIER FOUR ───────────────────
  //
  // LA FALAISE, quatorze bandes de hauteurs toutes différentes (44 à 65,8
  // là-bas, 6,1 à 9,1 ici), dont le retrait creuse une alcôve en face de la
  // sortie : on ne sort pas contre une planche. DEUX ÉCARTS FORCÉS : le dos
  // passe de -519,7 à -70, parce qu'un rideau de trois mètres d'épaisseur réduit
  // tel quel devenait une lame de soixante centimètres ; et ce dos DÉRIVE de
  // 31 cm sur quatre valeurs, faute de quoi quatorze bandes calées sur le même x
  // partagent leur face arrière deux à deux — rien ne l'aurait dit avant l'écran.
  for (let i = 0; i < 14; i++) {
    const z0 = -72 + i * 10.6;
    const creux = 3.0 * Math.exp(-(((z0 + 5.3) / 34) ** 2));
    const haut = 44 + ((i * 7) % 5) * 4.6 + (i % 3) * 1.7;
    const face = -515.4 - creux - (i % 3) * 0.27;
    out.push(b([-70 + (i % 4) * 0.31, ANCRAGE, mz(z0)], [mx(face), mh(haut), mz(z0 + 11.2)], i % 2 ? 2 : 1));
  }
  // Les épaulements qui ferment le bol.
  out.push(pose(-517.0, -488.0, -96.0, -60.0, 12.6, 2));
  out.push(pose(-518.6, -496.0, -118.0, -92.0, 22.4, 1));
  out.push(pose(-517.4, -484.0, 70.0, 96.0, 15.4, 2));
  out.push(pose(-519.0, -492.0, 88.0, 99.6, 27.0, 1));

  // LE DERNIER FOUR. Trente mètres : lui qui donnait le cap pendant deux cents
  // mètres de marche, lui qu'on voyait à contre-jour dès la cour, lui dont la
  // couronne se méritait par huit paliers pris à l'envers. Il fait 4,17.
  // Mi-mollet. C'est le sujet de la salle, et il n'y a rien à en faire.
  out.push(pose(-510, -474, 16, 52, 11.4, 2));
  out.push(sur(-506.6, -477.4, 19.4, 48.8, 11.4, 10.4, 1));
  out.push(sur(-503.4, -481.2, 23.2, 45.4, 21.8, 8.2, 2));
  out.push(sur(-503.0, -497.6, 24.6, 44.0, 30.0, 1.5, 3));
  // LA RAMPE DES CHARIOTS, le détour qui coûtait aussi cher que le reste du
  // chemin : huit paliers de 3,20 commencés quarante mètres EN ARRIÈRE. Huit
  // gradins de 44 cm, embrassés d'un regard. Le plus cruel cadeau de la salle.
  for (let i = 0; i < 8; i++) {
    const a = -448 - i * 5.4;
    out.push(pose(a - 6.1, a, 57 - i * 0.14, 66 + i * 0.11, 3.2 + i * 3.2, 1));
  }
  out.push(pose(-498.0, -489.0, 45.0, 61.2, 28.8, 1));
  // La cheminée abattue, qui ne menait nulle part et n'a jamais rien voulu dire.
  out.push(pose(-498.0, -477.0, 6.0, 12.4, 4.6, 2));
  out.push(sur(-499.0, -476.0, 7.4, 11.0, 4.6, 0.6, 1));
  // Les bornes de sortie, qui répondaient à celles de l'entrée. La porte du
  // mouvement suivant se plante entre elles, là où l'on quittait la côte rouge.
  out.push(pose(-505.6, -501.2, -14.0, -9.2, 8.8, 2));
  out.push(sur(-506.6, -500.2, -14.8, -8.4, 8.8, 1.6, 3));
  out.push(pose(-505.0, -500.6, 9.4, 14.2, 9.2, 2));
  out.push(sur(-506.0, -499.6, 8.6, 15.0, 9.2, 1.6, 3));
  out.push(pose(-514.6, -503.4, -15.4, -13.2, 1.05, 2));
  out.push(pose(-513.8, -502.6, 13.4, 15.6, 0.9, 2));
  out.push(tas(-492.4, -19.2, 4.1, 3.7, 2.2, 3));
  out.push(tas(-482.7, 9.4, 3.3, 3.2, 1.3, 0));
  return out;
};

/**
 * LA CORNICHE DE L'OR — et pourquoi 8,16 et pas ailleurs. Une saillie de la
 * falaise, en face de la sortie, surplombant huit mètres de paroi nue : à taille
 * d'homme, un ressaut à cinquante-neuf mètres du sol, en encorbellement, sans
 * une prise — une falaise, rien d'autre. À ×16 elle arrive AU GENOU (8,16 contre
 * 8,21 de rotule) : on ne grimpe pas, on ne résout rien, on se penche. Dessous à
 * 7,30, donc DANS la bande qui la porte (dessus à 7,395) : encastrée et non
 * collée, et son dessus ne partage sa cote avec aucune bande.
 */
const CORNICHE_Y = 8.16;
const corniche = (): BoxDef[] => [
  b([-66, 7.3, 2795.6], [-55.4, CORNICHE_Y, 2801.3], 2),
  b([-56.9, 7.42, 2795.9], [-55.6, 8.44, 2801.0], 3),
];

/**
 * LA GRUE DE PAPIER — vingt-six mètres d'envergure, suspendue à quarante mètres
 * au-dessus de la voie, à mi-traversée. Elle ne bat pas des ailes (le moteur
 * n'anime pas le décor) et n'en a pas besoin : elle est POSÉE OÙ LE REGARD TOMBE
 * quand on relève la tête au milieu du chemin — l'œil est à vingt-six mètres,
 * elle est douze plus haut et légèrement au nord. Elle n'ouvre rien, ne se prend
 * pas, ne se réveille pas, personne ne la mentionnera jamais : c'est exactement
 * pour ça qu'elle vaut la peine. `ghost` — on saute 20,74.
 */
const grue = (): BoxDef[] => {
  const g = (mn: [number, number, number], mx2: [number, number, number], ink = 0): BoxDef => b(mn, mx2, ink, { ghost: true });
  return [
    g([-2, 40.4, 2810], [6, 43.2, 2814]),
    g([-0.6, 39.0, 2811], [4.2, 40.6, 2813.2], 2),
    g([-6.4, 42.6, 2811.4], [-1.4, 44.0, 2812.8]),
    g([-9.8, 43.6, 2811.6], [-6.0, 44.8, 2812.6]),
    g([-12.6, 43.9, 2811.8], [-9.4, 44.5, 2812.4], 3),
    g([5.4, 42.8, 2811.2], [10.2, 44.2, 2813.0]),
    g([9.6, 43.8, 2811.5], [13.4, 45.0, 2812.7]),
    g([0.2, 42.9, 2813.6], [4.6, 44.0, 2818.4]),
    g([1.0, 43.8, 2818.0], [4.0, 44.8, 2822.6]),
    g([1.6, 44.6, 2822.2], [3.4, 45.4, 2825.4]),
    g([0.2, 42.9, 2805.6], [4.6, 44.05, 2810.4]),
    g([1.0, 43.85, 2801.4], [4.0, 44.85, 2806.0]),
    g([1.6, 44.65, 2798.6], [3.4, 45.45, 2801.8]),
  ];
};

export const VALLEE: SalleModule = {
  nom: 'vallee',
  region: REGION,
  bounds: { min: [-400, -100, 2400], max: [400, 400, 3200] },

  boxes: [...feuille(), ...cote(), ...corniche(), ...grue()],

  // NI LOGEMENT, NI CAISSE, NI PORTE INTERNE : on ne manipule rien à ×16.

  veilleurs: [
    {
      // LE PINCEAU D'OR, le but de tout le mouvement II. `echelle: 2` — un
      // PALIER, ×16, et surtout pas 16 : il ne s'éveille qu'à la taille où l'on
      // vit depuis le début de la salle, donc rien à comprendre, il suffit
      // d'arriver. (Vérifié : à ×4 il refuse, « venu trop petit ».) Ce qu'on
      // rapporte d'un monde où l'on était énorme est forcément minuscule : deux
      // portes plus bas, il tiendra dans le creux de 0,36 dont personne ne
      // comprenait la taille depuis la première minute du jeu.
      // RAYON 44, ET C'EST UN MINIMUM : à ×16 on mesure 28,80 et l'on porte à
      // 46,08, donc viser au mètre près est un supplice — au doigt sur un
      // téléphone, une salle ratée. Mesuré : on le réveille debout au point de
      // sortie sans faire un pas, et du pied du dernier four vingt mètres plus
      // loin. Le geste est de se pencher, pas de se placer.
      id: 'pinceau-or',
      position: [-57.8, CORNICHE_Y + 0.04, 2798.4],
      radius: 44,
      echelle: 2,
    },
  ],

  // LES STATIONS. Le Pinceau refait la route marchée deux cents mètres durant —
  // pile de briques, lèvre du four éventré, couronne du dernier four — puis
  // descend sur la corniche près de l'or. ELLES SONT À SEIZE MÈTRES DU SOL ET
  // NON SUR LES SOMMETS : la maquette arrive au mollet, et un guide qui la
  // longerait disparaîtrait derrière le moindre four.
  stations: [
    [39.2, 16.0, 2810.9],
    [-5.0, 18.0, 2812.5],
    [-45.0, 20.0, 2818.9],
    [-57.8, 9.6, 2798.4],
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // LE RACCORD. `echelle` EST UN PALIER : 2 = ×16, et surtout pas 16.
  // ON ARRIVE SUR LA COUR DES TESSONS, à l'est, à 58 : debout sur le parvis
  // d'argile battue qui était la première image de la côte rouge, les bornes du
  // seuil à la cheville et le dernier four à 113 m droit devant. Huit enjambées
  // de 14,40 en font 115 ; la traversée mesurée dure 1,6 s. ON REPART À L'OUEST,
  // à -51,4, entre les deux bornes de sortie et dans l'alcôve de la falaise —
  // exactement le point par lequel on quittait la côte rouge, la corniche de
  // l'or six mètres derrière et au-dessus.
  //
  // LES DEUX PALIERS SONT ÉGAUX, ET C'EST VOULU : cul-de-sac glorieux. On y
  // réveille l'or et l'on redescend tout le mouvement à l'envers ; c'est à
  // l'assemblage de décider par quelle porte, puisqu'une salle ne sait rien de
  // ses voisines. LES DEUX POINTS SONT LIBRES ET PORTÉS, mesuré : lâché à
  // l'entrée on se pose sur le parvis à 0,1895 ; à la sortie, sur la côte à 0,12.
  // ═══════════════════════════════════════════════════════════════════════════
  entree: { position: [58, 0.24, 2800], echelle: 2 },
  sortie: { position: [-51.4, 0.18, 2800], echelle: 2 },
};
