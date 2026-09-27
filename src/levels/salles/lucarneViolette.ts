import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA LUCARNE VIOLETTE — *le village, et son envers pendu au-dessus de lui.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ON Y FAIT : RIEN, SAUF LEVER LES YEUX.
 *
 * Une chambre de vingt mètres sur vingt-huit, seize de haut. Sur une table, au
 * milieu, le village — LE MÊME que celui de la lucarne bleue, au seizième,
 * même générateur, même graine (31415), même ordre des six tirages —, tourné
 * d'un demi-tour pour que son torii regarde qui entre. Et au plafond, SON
 * ENVERS : la même maquette, retournée d'un demi-tour autour de l'axe est-ouest
 * de la chambre, pendue la tête en bas. Les deux Aiguilles se font face, pointe
 * contre pointe, à quatre-vingt-cinq centimètres l'une de l'autre, à huit mètres
 * du sol.
 *
 * C'est l'image que le chapitre a méritée : on a marché au plafond, aux murs,
 * dans une cuve couchée ; voici le village tel qu'on voit désormais toute
 * chose, avec son envers. On arrive au sud, on lève les yeux, on marche vers le
 * village : le but est au pied de la table, sous le village pendu. Et si le
 * violet a été réveillé dans la cuve, c'est là qu'il se pose, sous nos yeux,
 * sur les deux villages à la fois.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POURQUOI DEUX VILLAGES ET PAS UN SEUL, PENDU. Le lavis éclaire d'en haut —
 * « dessus clair, murs d'un seul ton, dessous sombre » (`ink.ts`) — et ne sait
 * rien du bas du joueur. Un village pendu nous montre ses toits, qui regardent
 * désormais le sol : ils tombent dans la valeur la plus sombre, tramée. Seul, il
 * se lisait comme une masse noire, et le violet s'y serait posé sans qu'on le
 * voie. Avec son double debout sur la table, l'envers devient ce qu'il est : une
 * ombre qu'on reconnaît parce qu'on a l'original sous les yeux.
 *
 * LA PALETTE, ET CE QUE LE VIOLET Y REPEINT. `pigment: 'violet'` sur toute la
 * région : la chambre et les deux maquettes naissent en lavis gris. Les trois
 * premiers aplats sont ceux d'un crépuscule — lilas pâle des murs, mauve des
 * torchis, violet profond des toits, du torii et de l'eau. Le quatrième aplat est
 * l'OR des lanternes, `pigmentAccent: 'or'`, déjà rapporté de la montée : dans
 * les maquettes encore grises, les fanaux sont déjà allumés — grossis, comme
 * ceux de la lucarne dorée, faute de quoi leur trait les rendrait noirs.
 *
 * LE BON OBSERVATEUR (voir le contrat) est le joueur tel qu'il sera une fois
 * entré — ici le même, puisque le raccord est plan : un homme d'1,80, l'œil à
 * 1,656. On peut monter sur la table et marcher dans le village debout ; le
 * village pendu, lui, commence à 8,36 m : on ne touche pas au ciel.
 *
 * RÈGLE 8 — le village, une troisième fois : en table dans la descente, en
 * maquette dans la montée, et ici avec son envers. Il n'a pas changé ; on a
 * changé de bas.
 */

const NOM = 'lucarneViolette';

const X0 = 290;
const X1 = 310;
const Z0 = 3886;
const Z1 = 3914;
const H = 16;

/** L'épaisseur des parois : voir `bascule.ts` — une pièce tenue traverse la pierre jusqu'à 2,34 m. */
const EPAISSEUR = 3;

/** Le facteur de la maquette : un seizième, celui de la lucarne bleue. */
const K = 1 / 16;
/** Voir `lucarneBleue.ts` : rien de plus fin que 0,64 m du vrai village ne se dessine. */
const FIN = 0.64;

/** L'origine du village debout : son (0, 0, 0), qui est le pied de l'Aiguille. */
const XV = 300;
const ZV = 3900;
/** Le « sol » du village sur la table, comme dans la lucarne bleue. */
const Y0 = 0.36;
/**
 * L'AXE DU DEMI-TOUR, et le seul nombre qu'il fallait trouver : la hauteur
 * H' telle que l'envers soit (x, H' − y, 2·ZV − z). Les deux Aiguilles montent
 * à Y0 + 114,2/16 = 7,4975 ; avec H' = 15,85, la pointe de l'envers descend à
 * 8,3525 — quatre-vingt-cinq centimètres de vide entre les deux, où le Pinceau
 * vient se poser.
 */
const H_ENVERS = 15.85;

type P = [number, number, number];
type Opt = { ghost?: boolean; outline?: boolean };

const b = (min: P, max: P, ink = 0, opts: Opt = {}): BoxDef => ({ min, max, ink, region: NOM, ...opts });

/**
 * Une boîte EN MÈTRES DU VILLAGE, sur la table : (x, y, z) → (XV − x·K, Y0 +
 * y·K, ZV − z·K). Un demi-tour autour de la verticale, comme la lucarne dorée :
 * le torii regarde le sud, d'où l'on arrive. Une rotation, jamais un reflet.
 */
const v = (min: P, max: P, ink = 0, opts: Opt = {}): BoxDef =>
  b([XV - max[0] * K, Y0 + min[1] * K, ZV - max[2] * K], [XV - min[0] * K, Y0 + max[1] * K, ZV - min[2] * K], ink, opts);

/**
 * L'ENVERS : le demi-tour autour de l'axe est-ouest qui passe à mi-hauteur des
 * deux Aiguilles — (x, y, z) → (x, H' − y, 2·ZV − z). Le haut devient le bas,
 * le nord le sud, l'est reste l'est : c'est la rotation du lavoir de la
 * première salle, et comme lui elle ne reflète rien.
 */
const envers = (x: BoxDef): BoxDef => ({
  ...x,
  min: [x.min[0], H_ENVERS - x.max[1], 2 * ZV - x.max[2]],
  max: [x.max[0], H_ENVERS - x.min[1], 2 * ZV - x.min[2]],
});

/** Le générateur de `monde.ts`, au caractère près — le même que celui de la lucarne bleue. */
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * LES QUATRE APLATS, PAR LEUR RÔLE. La lucarne bleue réservait le quatrième à
 * l'eau ; ici il va aux lanternes, et l'eau rejoint les toits dans le violet
 * profond. Se tromper d'index, c'est allumer un mur.
 */
const MUR = 0;
const TORCHIS = 1;
const SOIR = 2;
const OR = 3;

const maison = (cx: number, cz: number, w: number, d: number, h: number, ink: number, deb = 0.7): BoxDef[] => [
  v([cx - w, -0.6, cz - d], [cx + w, h, cz + d], ink),
  v([cx - w - deb, h - 0.15, cz - d - deb], [cx + w + deb, h + 0.55, cz + d + deb], SOIR),
];

/**
 * La lanterne : son mât en torchis, son fanal en OR — le seul or de la chambre.
 * Le fanal est GROSSI, de 5 à 14 cm : plus fin que le trait qui le cerne, il
 * serait noir (c'est le plancher de la lucarne dorée, `TACHE`).
 */
const lanterne = (cx: number, cz: number): BoxDef[] => [
  v([cx - FIN / 2, -0.5, cz - FIN / 2], [cx + FIN / 2, 2.6, cz + FIN / 2], TORCHIS),
  v([cx - 1.1, 2.6, cz - 1.1], [cx + 1.1, 4.6, cz + 1.1], OR),
];

const etal = (ex: number, ez: number): BoxDef[] => [
  v([ex - 2.6, -0.5, ez - 2], [ex + 2.6, 1.1, ez + 2], TORCHIS),
  v([ex - 3.2, 2.3, ez - 2.6], [ex + 3.2, 2.8, ez + 2.6], SOIR),
  v([ex - 3.2, -0.5, ez - 2.6], [ex - 3.2 + FIN, 2.4, ez - 2.6 + FIN], TORCHIS),
  v([ex + 3.2 - FIN, -0.5, ez - 2.6], [ex + 3.2, 2.4, ez - 2.6 + FIN], TORCHIS),
];

const gouttiere = (cx: number, cz: number, w: number, d: number, h: number, deb: number): BoxDef[] => [
  v([cx - w - deb, h - 0.5, cz + d + deb - 0.5], [cx + w + deb, h + 0.15, cz + d + deb + 0.15], SOIR),
  v([cx + w + deb - 0.9, -0.5, cz + d + deb - 0.7], [cx + w + deb - 0.1, h - 0.4, cz + d + deb + 0.1], SOIR),
];

const puits = (cx: number, cz: number): BoxDef[] => [
  v([cx - 2, -0.5, cz - 2], [cx + 2, 1.5, cz - 1.2], TORCHIS),
  v([cx - 2, -0.5, cz + 1.2], [cx + 2, 1.5, cz + 2], TORCHIS),
  v([cx - 2, -0.5, cz - 1.2], [cx - 1.2, 1.5, cz + 1.2], TORCHIS),
  v([cx + 1.2, -0.5, cz - 1.2], [cx + 2, 1.5, cz + 1.2], TORCHIS),
  v([cx - 1.2, -0.5, cz - 1.2], [cx + 1.2, 1.32, cz + 1.2], SOIR),
  v([cx - 2.9, -0.5, cz - 0.4], [cx - 2.9 + FIN, 4.4, cz + 0.4], TORCHIS),
  v([cx + 2.9 - FIN, -0.5, cz - 0.4], [cx + 2.9, 4.4, cz + 0.4], TORCHIS),
  v([cx - 3.6, 4.2, cz - 1.6], [cx + 3.6, 5.1, cz + 1.6], SOIR),
];

const bassin = (): BoxDef[] => [
  v([27, -0.5, -59], [28, 0.6, -35], TORCHIS),
  v([50, -0.5, -59], [51, 0.6, -35], TORCHIS),
  v([27, -0.5, -59], [51, 0.66, -58], TORCHIS),
  v([27, -0.5, -36], [51, 0.66, -35], TORCHIS),
  v([28, -0.5, -58], [50, 0.3, -36], SOIR),
];

const courCreusee = (x0: number, x1: number, z0: number, z1: number): BoxDef[] => {
  const g = 0.06;
  const w = 1;
  return [
    v([x0, -4.2, z0], [x1, -3, z1], TORCHIS),
    v([x0 - g - w, -0.5, z0 - g - w], [x0 - g, 0.34, z1 + g + w], SOIR),
    v([x1 + g, -0.5, z0 - g - w], [x1 + g + w, 0.34, z1 + g + w], SOIR),
    v([x0 - g, -0.5, z0 - g - w], [x1 + g, 0.34, z0 - g], SOIR),
    v([x0 - g, -0.5, z1 + g], [x1 + g, 0.34, z1 + g + w], SOIR),
    v([x0 + 0.1, -3, z0 + 0.1], [x1 - 0.1, -0.55, z1 - 0.1], SOIR),
  ];
};

const torii = (cz: number): BoxDef[] => [
  v([-4.9, -0.8, cz - 0.6], [-3.8, 10.6, cz + 0.6], SOIR),
  v([3.8, -0.8, cz - 0.6], [4.9, 10.6, cz + 0.6], SOIR),
  v([-6.2, 8.6, cz - 0.45], [6.2, 9.5, cz + 0.45], SOIR),
  v([-7.6, 10.6, cz - 0.8], [7.6, 11.2, cz + 0.8], SOIR),
];

/**
 * LE VILLAGE, en mètres du vrai village — la fonction de la lucarne bleue, au
 * tirage près. On recopie plutôt qu'on n'importe : le jour où l'un des deux
 * villages bougera, la divergence se verra dans un diff.
 */
const village = (): BoxDef[] => {
  const r = rng(31415);
  const out: BoxDef[] = [];
  out.push(v([-19, -0.5, -27], [19, 0.25, 9], MUR));
  out.push(v([-19, -0.5, -27], [-17.6, 0.7, 9], SOIR));
  out.push(v([17.6, -0.5, -27], [19, 0.7, 9], SOIR));
  // L'AIGUILLE, qui pend comme un lustre ; son socle vide est ce qu'on voit de plus près.
  out.push(v([-3, -0.5, -3], [3, 110, 3], TORCHIS));
  out.push(v([-12, 108.6, -12], [12, 113.6, 12], SOIR));
  out.push(v([-9.6, 113.6, -9.6], [9.6, 114.2, 9.6], TORCHIS));
  out.push(...torii(20));
  out.push(v([-6, -0.5, -74], [6, 0.2, -27], MUR));
  for (let z = -32; z >= -68; z -= 11) out.push(...lanterne(-7.4, z), ...lanterne(7.4, z));

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
      if (cote === 1 && z >= -55) out.push(...gouttiere(cx, cz, w, d, h, deb));
    }
  }

  out.push(v([-31, -0.6, -25], [-17, 3, -15], TORCHIS));
  out.push(v([-31.8, 2.85, -25.8], [-16.2, 3.4, -14.2], SOIR));
  out.push(...puits(12, -18));
  for (let i = 0; i < 5; i++) out.push(...etal(-44 + (i % 3) * 8, -10 - ((i / 3) | 0) * 9));
  out.push(...bassin());
  out.push(...courCreusee(24, 36, -8, 4));

  out.push(v([13.9, -0.5, -18.7], [27.2, 0.14, -17.9], SOIR));
  out.push(v([26.4, -0.5, -46.4], [27.2, 0.14, -18.7], SOIR));
  out.push(v([26.4, -0.5, -46.4], [28.6, 0.14, -45.6], SOIR));
  for (const [cx, cz] of [[-38, -46], [-30, -62], [-48, -70], [34, -18], [44, -26], [24, -74]]) {
    const w = 3.4 + r() * 2;
    const d = 3.4 + r() * 2;
    out.push(...maison(cx, cz, w, d, 4 + r() * 4, (r() * 2) | 0, 0.58 + r() * 0.24));
  }
  return out;
};

/**
 * LA TABLE ET SON TERRAIN — ceux de la lucarne bleue, au demi-tour près : le
 * socle déborde de deux mètres de village (12,5 cm), et le terrain est en
 * quatre dalles qui ménagent le trou de la cour.
 */
const socle = (): BoxDef[] => [
  b([XV - 3.75, -0.2, ZV - 30 * K], [XV + 3.75, Y0 - 0.225, ZV + 86 * K], TORCHIS),
  ...([[-58, -84, 24, 28], [36, -84, 58, 28], [24, -84, 36, -8], [24, 4, 36, 28]] as const)
    .map(([x0, z0, x1, z1]) => v([x0, -4.2, z0], [x1, 0, z1], MUR, { outline: false })),
];

/**
 * La maquette debout, table comprise. L'envers en est la copie retournée, boîte
 * pour boîte : sa table monte jusqu'à 16,05 et s'enfonce dans le plafond, comme
 * celle du sol s'enfonce dans le sol.
 */
const maquette = (): BoxDef[] => [...socle(), ...village()];

const coque = (): BoxDef[] => {
  const t = EPAISSEUR;
  return [
    b([X0 - t - 0.1, -t, Z0 - t - 0.1], [X1 + t + 0.1, 0, Z1 + t + 0.1], TORCHIS, { outline: false }),
    b([X0 - t - 0.2, H, Z0 - t - 0.2], [X1 + t + 0.2, H + t, Z1 + t + 0.2], TORCHIS, { outline: false }),
    b([X0 - t, -0.5, Z0 - t], [X0, H + 0.5, Z1 + t], MUR),
    b([X1, -0.5, Z0 - t], [X1 + t, H + 0.5, Z1 + t], MUR),
    b([X0, -0.5, Z0 - t], [X1, H + 0.5, Z0], MUR),
    b([X0, -0.5, Z1], [X1, H + 0.5, Z1 + t], MUR),
  ];
};

export const LUCARNE_VIOLETTE: SalleModule = {
  nom: NOM,

  region: {
    name: NOM,
    min: [200, -80, 3800],
    max: [400, 120, 4000],
    paper: '#ece5e6',
    colors: ['#e7dee9', '#b39cc0', '#5b3b6c', '#c99a3c'],
    ink: '#1b161e',
    pigment: 'violet',
    pigmentAccent: 'or',
    brouillard: 120,
  },

  bounds: { min: [200, -80, 3800], max: [400, 120, 4000] },

  boxes: [...coque(), ...maquette(), ...maquette().map(envers)],

  // NI LOGEMENT, NI CAISSE, NI PORTE INTERNE, NI PINCEAU ENDORMI : une salle
  // qui ne demande rien ne fait pas semblant.

  /**
   * Le Pinceau entre par la porte, passe devant le torii, monte le long de
   * l'Aiguille et se pose ENTRE LES DEUX POINTES — le vide de quatre-vingt-cinq
   * centimètres où le village rencontre son envers — puis redescend au but.
   */
  stations: [
    [XV, 2.4, Z0 + 3],
    [XV, 2.2, ZV - 20 * K - 1.2],
    // À mi-chemin des deux pointes : H'/2, par symétrie.
    [XV, H_ENVERS / 2, ZV],
    [XV, 2.4, ZV - 30 * K - 1.4],
  ],
  // LE PREMIER JALON PASSE PAR LE RACCORD : la cuve est à deux cents mètres,
  // et en ligne droite le guide traverserait trois murs.
  stationsPorte: ['envers-cuve-lucarneViolette', null, null, null],

  /**
   * On arrive au sud, face au nord : la table à dix mètres, le torii devant,
   * l'envers au-dessus. LA SORTIE EST AU PIED DE LA TABLE, sous le village
   * pendu, et c'est le but. Aucun raccord n'en repart — le chapitre finit ici.
   */
  entree: { position: [XV, 0.05, Z0 + 1.5], echelle: 0, lacet: 0 },
  sortie: { position: [XV, 0.05, ZV - 30 * K - 1.4], echelle: 0 },
};

/** L'axe du demi-tour et l'origine du village, pour les vérifications. */
export const LUCARNE_VIOLETTE_ENVERS = { hauteur: H_ENVERS, z: ZV };
