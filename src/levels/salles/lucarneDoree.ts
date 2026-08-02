import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA LUCARNE DORÉE — *le village en maquette, derrière la dernière porte.*
 *
 * Douze salles pour aller chercher l'or, et la couleur ne se posait nulle part : on
 * réveillait le pinceau au bout de la vallée et le niveau s'arrêtait. Voici ce sur quoi
 * elle se pose. **On ne traverse pas cette salle : on la REGARDE**, depuis la vallée
 * encore grise, par une porte dont la grande face fait quarante-quatre mètres.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUI REGARDE, ET DE QUELLE HAUTEUR — tout en découle.
 *
 * `computeVirtual` met la caméra de la vue à l'échelle du franchissement (`makeScale(s)`,
 * `s = traversalScale(face)` = 1/4 par la grande face) : **on voit une porte cadrée comme
 * on la verra après l'avoir franchie.** L'observateur n'est donc pas le géant de 28,80
 * mais le corps de **7,20** qu'il sera en entrant, œil à 6,624 — soit `EYE_FRACTION` 0,92
 * et non 0,60, relu dans `constants.ts` plutôt que supposé.
 *
 * LE FACTEUR EST BALAYÉ, PAS CHOISI. Œil à 6,624, bord proche à quinze mètres du seuil,
 * et **c'est l'Aiguille qui tranche** : cent dix mètres, seule chose du village
 * comparable à l'observateur, sa pointe dit d'un coup si l'on domine ou si l'on subit.
 *
 *   ×1/4   village 26 m · toit haut 4,0 (3° sous l'horizon) · **Aiguille +23 m, +26°**
 *   ×1/8   village 13 m · toit haut 2,0 (9° dessous)        · Aiguille +7,7 m, +16°
 *   ×1/16  village 7,3 m · toit haut 1,3 (15° dessous)      · **pointe +0,98 m, +2,3°**
 *
 * ON PREND LE SEIZIÈME : tout le village tient entre 12 et 24° SOUS l'horizon, et la seule
 * chose qui monte encore jusqu'au regard est l'Aiguille qu'on n'a jamais pu gravir, dont
 * le fanal arrive à hauteur d'œil à quatre-vingt-dix-huit centimètres près — le geste de
 * la maquette du monde central, posée « à hauteur d'œil » au pied de la vraie. Une maison
 * de huit mètres fait cinquante centimètres : **ce qu'on rapporte d'un monde où l'on était
 * énorme est forcément minuscule.**
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LE SEUIL DE FINESSE, MESURÉ AUSSI, ET IL COÛTE CHER. Le contour d'encre est gonflé de
 * `uThickness × profondeur` (`ink.ts`, 0,0052) : à vingt mètres, tout est cerné d'un trait
 * de dix centimètres. Une tuile réduite fait 3,6 cm, un montant de torii 5, la margelle 6
 * — ils disparaîtraient dans leur propre contour, et surtout une barre plus étroite que
 * son encre n'a plus de COULEUR : elle devient noire. D'où deux planchers, `FIN` = 0,12
 * pour toute ÉPAISSEUR et `TACHE` = 0,22 pour ce qui doit rester rouge ou or. Les EMPRISES
 * restent au seizième exact : c'est le plan qui fait la reconnaissance.
 *
 * CE VILLAGE-CI EST CELUI DES « TOITS », DEUX CRANS PLUS BAS : même générateur, même graine
 * (20260801), mêmes vingt emplacements, mêmes largeurs et mêmes faîtes à la quatrième
 * décimale, même cour creusée, même torii, même maison basse à l'emprise de la tour du
 * premier niveau. On recopie plutôt qu'on n'importe : si quelqu'un retouche « la cour », les
 * trois villages divergeront, et ça se verra dans un diff. LE DEMI-TOUR est imposé (l'entrée
 * d'un raccord descendant est plantée `yaw: Math.PI`, normale −Z) et il tombe bien : le
 * regard entre par le sud, place devant, torii au fond, cour à gauche, maison basse à
 * droite. Une ROTATION, pas un miroir : la main du plan est intacte.
 *
 * LES TROIS OBJETS PAR LESQUELS ON RECONNAÎT LE VILLAGE : **le torii**, à l'aplomb de
 * [0, 20] comme partout ; **la cour creusée et son liseré rouge**, seul vrai piège du premier
 * niveau, ici un carré de soixante-quinze centimètres ; **la maison basse au toit rouge**,
 * emprise de la tour de l'objectif, où le joueur a fini sa toute première partie. Les trois
 * sont VERMILLON, donc déjà peints (`pigmentAccent: 'rouge'`) : la maquette naît en lavis
 * gris avec trois taches de couleur dedans, et ces trois taches sont ce qui la nomme. **La
 * reconnaissance se fait AVANT l'or ; l'or n'ajoute que la lumière** — douze lanternes, six
 * portes entrouvertes, quatre bouches de four, sept toitures mouillées, le fanal de
 * l'Aiguille, du bord le plus proche au point le plus haut. ET L'ON NE RÉSOUT RIEN : un
 * plan, et un cul-de-sac dont on ressort par le seuil d'entrée, quinze mètres de papier nu
 * devant la porte, parois à quatorze.
 */

const NOM = 'lucarneDoree';

/** LE FACTEUR : un seizième. Balayé, pas choisi — voir l'en-tête. */
const Q = 1 / 16;
/** Épaisseur plancher : rien de plus mince ne se lit comme un volume. */
const FIN = 0.12;
/** Largeur plancher de ce qui doit rester COLORÉ : deux fois le trait d'encre. */
const TACHE = 0.22;
/** Débord de toiture : 3 cm réduits, remontés à 5, sinon plus aucun toit ne déborde. */
const DEBORD = 0.05;

const ZPORTE = 2580;
const CX = 600;
/** Centre du village : posé pour que le bord proche de la plaque tombe pile à 15 m. */
const CZ = ZPORTE - 15 - 58 * Q;
/** La rue du village, sur une plaque de trente centimètres noyée dans le plancher. */
const SOL = 0.3;
const BAS = -0.5;

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
 *  l'original. Les bornes s'échangent en x et z, le demi-tour renversant ces deux axes. */
const v = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, ink = 0)
  : BoxDef => b([mx(x1), mh(y0), mz(z1)], [mx(x0), mh(y1), mz(z0)], ink);

/** UNE MAISON. L'empreinte est au seizième exact ; la toiture est ramenée à `FIN` (elle
 *  ferait 3,6 cm) et mord de sept centimètres dans le corps, comme partout dans ce jeu. */
const maison = (cx: number, cz: number, dx: number, dz: number, faite: number, inkToit = TOIT)
  : BoxDef[] => {
  const x0 = mx(cx + dx), x1 = mx(cx - dx), z0 = mz(cz + dz), z1 = mz(cz - dz), t = mh(faite);
  return [
    b([x0, mh(-0.5), z0], [x1, t - 0.05, z1], MUR),
    b([x0 - DEBORD, t - FIN, z0 - DEBORD], [x1 + DEBORD, t, z1 + DEBORD], inkToit),
  ];
};

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

/** LES VINGT MAISONS-TÉMOINS. L'ORDRE DES QUATRE TIRAGES EST PORTANT — largeur, profondeur,
 *  hauteur, encre : les intervertir donne un autre village, aussi plausible et complètement
 *  étranger. On tire la quatrième SANS S'EN SERVIR (une maquette est taillée dans une seule
 *  matière) ; la supprimer, elle, décalerait les dix-neuf maisons suivantes. */
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

/** UNE LANTERNE, l'objet le plus grossi de la maquette : au seizième son fanal ferait cinq
 *  centimètres, moitié moins que le trait qui le cerne, et il serait noir. Fanal 14, mât 5
 *  sur 13 — une lumière n'a pas de taille, elle a une portée. */
const lanterne = (vx: number, vz: number): BoxDef[] => {
  const x = mx(vx), z = mz(vz);
  return [
    b([x - 0.025, SOL - 0.02, z - 0.025], [x + 0.025, SOL + 0.16, z + 0.025], TOIT),
    b([x - 0.07, SOL + 0.13, z - 0.07], [x + 0.07, SOL + 0.27, z + 0.07], OR),
  ];
};

/** UNE PORTE ENTROUVERTE : chambranle vermillon, rai DÉCENTRÉ (une porte poussée, pas
 *  ouverte), et la flaque qu'il jette sur la rue — seule tache d'or au ras du sol, donc la
 *  mieux vue d'un regard plongeant, et la plus large des trois pour cette raison. À 12 sur
 *  16 le chambranle cesse d'être l'étalon des « toits » ; celui d'ici est la petite face du
 *  portail, 11,20 plantés au seuil, et la pointe de l'Aiguille à hauteur d'œil. `h` DESCEND
 *  POUR LA MAISON BASSE : à 16, sa porte monterait dans sa propre toiture. */
const porte = (vcx: number, vzFace: number, h = 0.16): BoxDef[] => {
  const x = mx(vcx), z = mz(vzFace);
  return [
    b([x - 0.06, SOL - 0.02, z - 0.004], [x + 0.06, SOL + h, z + 0.012], ROUGE),
    b([x - 0.045, SOL + 0.004, z + 0.002], [x + 0.025, SOL + h - 0.035, z + 0.017], OR),
    b([x - 0.09, SOL + 0.003, z + 0.019], [x + 0.08, SOL + 0.014, z + 0.24], OR),
  ];
};

/** UNE BOUCHE DE FOUR, sur la paroi qui regarde la ruelle (vers −x). Les quatre remises
 *  adossées des « toits » sont ici les FOURS DU VILLAGE : mêmes boîtes, mêmes cotes, on leur
 *  a percé une gueule. Elles montent d'ouest en est, leurs braises aussi — seule diagonale
 *  de lumière du plan. */
const braise = (xParoi: number, zc: number): BoxDef[] => [
  b([xParoi - 0.03, SOL + 0.02, zc - 0.08], [xParoi + 0.015, SOL + 0.13, zc + 0.08], OR),
  b([xParoi - 0.25, SOL + 0.003, zc - 0.075], [xParoi - 0.028, SOL + 0.013, zc + 0.075], OR),
];

/** LE REFLET D'UNE TOITURE MOUILLÉE. Il mord de 15 mm dans la tuile et dépasse de 20 :
 *  d'affleurement, sa face et celle du toit se disputeraient la profondeur. Débords
 *  dissymétriques (0,55 / 0,48 et 0,62 / 0,54) pour qu'aucune bande n'en touche une autre. */
const reflet = (m: Toit, t = mh(m.faite)): BoxDef =>
  b([mx(m.cx + m.dx * 0.55), t - 0.015, mz(m.cz + m.dz * 0.62)],
    [mx(m.cx - m.dx * 0.48), t + 0.02, mz(m.cz - m.dz * 0.54)], OR);

// ─── LA CHAMBRE, LA PLAQUE, LE VILLAGE ───────────────────────────────────────

/** LA CHAMBRE, trente-cinq mètres sur quarante-quatre : une pièce, pas une plaine. Plancher
 *  de quatorze mètres d'épaisseur — à ×4 le joueur pèse lourd et une dalle mince se traverse
 *  — et parois de quatorze, sans plafond : la lumière tombe d'en haut, c'est ce que le nom
 *  promet. Elles passent le saut de 5,18, donc on ne sort que par la porte, et aucune ne
 *  partage un plan avec une autre — quatre boîtes autour d'un rectangle se recouvrent aux
 *  angles, et c'est là qu'on grésille. */
const chambre = (): BoxDef[] => [
  b([578, -14, 2538], [622, 0, 2594], TOIT, false),
  b([578.4, -13.6, 2538.7], [582.6, 13.9, 2593.3], TOIT),
  b([617.5, -13.2, 2538.4], [621.6, 14.3, 2593.6], TOIT),
  b([578.9, -12.8, 2538.5], [621.1, 14.1, 2543.2], TOIT),
  b([578.6, -13.4, 2586.9], [621.4, 13.7, 2591.1], TOIT),
];

/** La cour creusée, aux cotes de « la cour ». */
const COUR = { x0: 10, x1: 22, z0: -6, z1: 6, fond: -3.0 };
/** Un morceau de plaque, en coordonnées du village, du dessous à la rue. */
const dalle = (x0: number, x1: number, z0: number, z1: number): BoxDef =>
  b([mx(x1), BAS, mz(z1)], [mx(x0), SOL, mz(z0)], MUR, false);

/** LA PLAQUE — pâle, découpée en quatre pour ménager le trou de la cour. C'est son BORD qui
 *  fait la maquette : trente centimètres de socle sur le papier de la chambre, et l'on sait
 *  qu'on regarde un objet et non un pays. CLAIRE quand les toits sont sombres, parce que d'en
 *  haut un village n'est que ses toits sur son sol. LE LISERÉ DE LA COUR EST TROIS FOIS TROP
 *  LARGE, prix de sa couleur : à 6 cm, plus étroit que son propre contour, il ne se lirait
 *  plus rouge mais noir. Les quatre barres sont jointives et jamais superposées. */
const plaque = (): BoxDef[] => {
  const x0 = mx(COUR.x1), x1 = mx(COUR.x0), z0 = mz(COUR.z1), z1 = mz(COUR.z0);
  const m = (a: number, c: number, d: number, e: number): BoxDef =>
    b([a, SOL - 0.02, d], [c, SOL + 0.055, e], ROUGE);
  return [
    dalle(-58, COUR.x0, -58, 100),
    dalle(COUR.x1, 58, -58, 100),
    dalle(COUR.x0, COUR.x1, COUR.z1, 100),
    dalle(COUR.x0, COUR.x1, -58, COUR.z0),
    // Le fond garde son contour : c'est lui qui dessine la cour en creux, et le seul vrai
    // piège du premier niveau tient désormais dans une empreinte de la taille d'une main.
    v(COUR.x0, COUR.x1, -8, COUR.fond, COUR.z0, COUR.z1, TOIT),
    m(x0 - 0.01 - TACHE, x0 - 0.01, z0 - 0.01 - TACHE, z1 + 0.01 + TACHE),
    m(x1 + 0.01, x1 + 0.01 + TACHE, z0 - 0.01 - TACHE, z1 + 0.01 + TACHE),
    m(x0 - 0.01, x1 + 0.01, z1 + 0.01, z1 + 0.01 + TACHE),
    m(x0 - 0.01, x1 + 0.01, z0 - 0.01 - TACHE, z0 - 0.01),
  ];
};

/** LA PLACE. « La cour » la laisse vide ; le monde central la dalle, et c'est « la trouée
 *  qu'on reconnaîtra d'en haut ». On reprend le dallage sans ses liserés — la place porte
 *  déjà six lanternes. Elle s'arrête à cinq unités de l'axe côté cour, le liseré élargi
 *  réclamant la place. */
const place = (): BoxDef[] =>
  [b([mx(5), SOL - 0.15, mz(16)], [mx(-9), SOL + 0.04, mz(-12)], MUR)];

/** LE GRAND TORII, à l'aplomb de [0, 20], regardant le sud. Quatre-vingt-dix centimètres au
 *  lieu de quatre-vingt-quatre : ses montants valaient 5 cm et sont remontés à 13, faute de
 *  quoi il ne resterait de lui qu'une croix d'encre. Le linteau MORD. */
const torii = (z = mz(20)): BoxDef[] => {
  const pied = (s: number): BoxDef =>
    b([mx(s * 4) - 0.065, mh(-0.5), z - 0.065], [mx(s * 4) + 0.065, SOL + 0.81, z + 0.065], ROUGE);
  return [
    pied(-1), pied(1),
    b([CX - 0.44, SOL + 0.79, z - 0.08], [CX + 0.44, SOL + 0.9, z + 0.08], ROUGE),
    b([CX - 0.34, SOL + 0.57, z - 0.05], [CX + 0.34, SOL + 0.66, z + 0.05], ROUGE),
  ];
};

/** Les quatre appentis des « toits », devenus les fours. Cotes inchangées. */
const APPENTIS: [number, number, number][] = [
  [-1.0, 2.2, 6.3], [2.2, 5.4, 9.2], [5.4, 8.6, 12.1], [8.6, 11.4, 15.0],
];

const ruelle = (): BoxDef[] => [
  ...APPENTIS.flatMap(([z0, z1, faite]) => maison(-22, (z0 + z1) / 2, 4, (z1 - z0) / 2, faite)),
  // La gueule se perce en mx(-18), la face qui regarde le village, donc celle qu'on voit.
  ...APPENTIS.flatMap(([z0, z1]) => braise(mx(-18), mz((z0 + z1) / 2))),
];

/** L'AIGUILLE — la seule greffe de cette maquette, et elle est déclarée. Elle vient du monde
 *  central, pas de « la cour » : cent dix mètres plantés à l'origine, colosse depuis le
 *  village, mât depuis la terrasse, piquet depuis le belvédère — seul objet regardé depuis
 *  les trois étages du jeu, et c'est ELLE qui a fixé le facteur, son fanal culminant à 7,60
 *  pour un œil à 6,624. Son chapiteau porte l'encrier vu VIDE à la première minute ; ici il
 *  est plein, et c'est le dernier point peint. */
const aiguille = (z = mz(84)): BoxDef[] => {
  const c = (r: number, y0: number, y1: number, i: number) => b([CX - r, y0, z - r], [CX + r, y1, z + r], i);
  return [
    c(0.1875, SOL - 0.15, SOL + 6.875, TOIT),
    c(0.75, SOL + 6.7875, SOL + 7.1, ROUGE),
    c(0.6, SOL + 7.04, SOL + 7.16, TOIT),
    c(0.09, SOL + 7.12, SOL + 7.3, OR),
  ];
};

/** LES DOUZE LANTERNES : deux au pied du torii, six le long de la place, quatre autour de la
 *  cour — dans le vide que les vingt emplacements laissent. La lumière d'un village suit ses
 *  passages, et ses passages sont ce qui reste entre les maisons. */
const LANTERNES: [number, number][] = [
  [-7, 20], [7, 20], [-3.8, 14], [3.8, 14], [-3.8, 4], [3.8, 4],
  [-3.8, -6], [3.8, -6], [16, 10.5], [16, -10.5], [26, 9.5], [26, -9.5],
];

/** Cinq maisons entrouvertes, plus la maison basse — aux quatre coins du plan, jamais côte
 *  à côte : l'or doit courir, pas s'attrouper. */
const PORTES = [1, 5, 9, 13, 17];
/** Sept toitures mouillées, un emplacement sur trois : elles font tout le tour. */
const MOUILLES = [0, 3, 6, 9, 12, 15, 18];

export const LUCARNE_DOREE: SalleModule = {
  nom: NOM,

  /** LA PALETTE, ET POURQUOI L'OR NE REPEINT QUE LA LUMIÈRE. `pigment: 'or'` sur le corps :
   *  sans cette ligne la salle naîtrait colorée et ne se peindrait jamais. `pigmentAccent:
   *  'rouge'` : le quatrième aplat est déjà rentré — torii, liseré, toit de la maison basse,
   *  chambranles. Le vrai réglage est dans les trois premières encres, le grisage tirant
   *  chaque teinte vers sa LUMINANCE : le plâtre (#ded9cd, 217) et l'ardoise (#8d949a, 147)
   *  sont à deux doigts de leur propre gris quand l'ambre (#f0a324, 172) en est à cent
   *  lieues — le front passé, la masse tiédit et **seuls les points de lumière s'allument**.
   *  BROUILLARD 110 : la brume ne mord qu'au-delà de 34 m, la maquette tient entre 15 et
   *  25. */
  region: {
    name: NOM,
    min: [500, -60, 2400],
    max: [700, 120, 2600],
    paper: '#dcd4c6',
    colors: ['#ded9cd', '#8d949a', '#f0a324', '#c8492e'],
    ink: '#1d1a17',
    pigment: 'or',
    pigmentAccent: 'rouge',
    brouillard: 110,
  },

  bounds: { min: [500, -60, 2400], max: [700, 120, 2600] },

  boxes: [
    ...chambre(),
    ...plaque(),
    ...place(),
    ...MAISONS.flatMap((m) => maison(m.cx, m.cz, m.dx, m.dz, m.faite)),
    // LA MAISON BASSE : emprise de la tour de l'objectif, faîte à 3,40, TOIT ROUGE. Vingt et
    // un centimètres ici — la fin de sa toute première partie tient sous sa semelle.
    ...maison(-18, -10, 7, 7, 3.4, ROUGE),
    ...torii(),
    ...ruelle(),
    ...aiguille(),
    ...LANTERNES.flatMap(([x, z]) => lanterne(x, z)),
    ...PORTES.flatMap((i) => porte(MAISONS[i].cx, MAISONS[i].cz - MAISONS[i].dz)),
    ...porte(-18, -17, 0.09),
    ...MOUILLES.map((i) => reflet(MAISONS[i])),
  ],

  // NI LOGEMENT, NI CAISSE, NI PORTE INTERNE, NI VEILLEUR : une salle qui ne demande rien
  // ne doit pas faire semblant.

  /** LE PINCEAU entre par la porte, survole la place, plonge sur la cour, croise le torii et
   *  se pose sur le fanal : dans l'ordre, les cinq choses à regarder. */
  stations: [
    [CX, 4.2, ZPORTE - 6], [CX + 0.4, 3.6, mz(-6)], [mx(16), 3.0, mz(0)],
    [CX, 3.4, mz(20)], [CX, 8.2, mz(84)],
  ],

  // LE PINCEAU PASSE PAR LA PORTE. Six cent cinquante mètres séparent la
  // corniche où dort l'or de cette chambre : en droite ligne, le guide les
  // franchit à travers la pierre et l'on ne lit plus « suis-moi » mais « il
  // s'est téléporté ». Seul le premier jalon l'emprunte — les quatre autres
  // sont déjà de ce côté-ci.
  //
  // Le nom porte le préfixe `montee-` et non `raccord-` : les deux mouvements
  // ne nomment pas leurs portes pareil, et j'avais écrit celui de la descente.
  // La vérification l'a dit du premier coup, ce qui est précisément son métier.
  stationsPorte: ['montee-vallee-lucarneDoree', null, null, null, null],

  /** LE RACCORD. `echelle` EST UN PALIER : 1 = ×4, surtout pas 4 ni 0,25. La vallée sort à 2
   *  (×16), on entre à 1 : un cran, une porte, grande face 44,80 de haut, petite 11,20 sur
   *  7,60 — un corps de ×4 mesure 2,72 sur 7,20, il repasse par où il est venu. ON NAÎT AU
   *  MILIEU DU SEUIL, sur le papier nu : quinze mètres pile jusqu'au bord de la plaque, 6,90
   *  jusqu'à la paroi de derrière, sol à 0,000 sous les deux points et aucune boîte qui coupe
   *  un corps posé là. LA SORTIE EST À NEUF MÈTRES DE CÔTÉ, seul nombre arbitraire du
   *  fichier : inutile dans un cul-de-sac, mais une seconde face plantée là ne doit pas
   *  tomber sur la première — neuf contre 7,60 de large. */
  entree: { position: [CX, 0.05, ZPORTE], echelle: 1 },
  sortie: { position: [CX + 9, 0.05, ZPORTE], echelle: 1 },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUI EST MESURÉ, ET CE DONT JE NE SUIS PAS SÛR
 *
 * L'IMAGE, balayée sur toutes les boîtes de la maquette, huit coins chacune, depuis l'œil
 * d'un corps de 7,20 posté au seuil (6,624 m) : **tout tient dans un cône de 19,7° de
 * demi-angle**, soit une image de 40°, dont l'axe plonge de 17,4°. Toit le plus haut à
 * −14,9°, bord proche à −22,9°, bord lointain à −14,3° ; seule la pointe de l'Aiguille
 * franchit l'horizon, de +2,3°. Il n'y a pas un pas à faire.
 *
 * RÉSERVE 1 — LE FRONT D'ENCRE ARRIVE ICI EN UN ÉCLAIR, ET CE FICHIER N'Y PEUT RIEN. Le front
 * est une sphère centrée sur le pinceau, et l'or dort à six cents mètres. En rejouant
 * `Pigments.update` : première boîte peinte vers t = 4,2 s, dernière vers 4,3, sur un geste de
 * 4,60 — **la salle bascule en un dixième de seconde**, le front ayant passé les quatre
 * premières à balayer les trois cents mètres « visibles » autour de la vallée. Semer les
 * lumières n'en fait donc pas une course : ça reste un éclair, mais un éclair qui traverse la
 * maquette de bord en bord. Le levier est dans `pigments.ts`, jamais ici.
 *
 * RÉSERVE 2 — LES PLANCHERS DE FINESSE MENTENT SUR LES VOLUMES : le torii fait 90 cm au lieu
 * de 84, le liseré de la cour est trois fois trop large, un fanal de lanterne presque trois
 * fois trop gros. C'est le seul moyen qu'ils gardent leur COULEUR à vingt mètres ; si la
 * maquette paraît un jour trop grasse, tout tient dans `FIN` et `TACHE`. ET DEUX DOUTES PLUS
 * PETITS : `guideEchelle` vaudra 4, donc un Pinceau de quatre mètres au-dessus d'un village
 * qui en fait sept, ce qui ne se décide pas depuis une salle ; et l'AIGUILLE est une greffe
 * venue du monde central, qui s'ôte en une ligne si elle gêne — mais c'est elle qui a fixé
 * le facteur.
 * ═══════════════════════════════════════════════════════════════════════════
 */
