import type {
  BoxDef,
  CarryableDef,
  LevelDef,
  PortalPairDef,
  RegionDef,
  SocketDef,
  VeilleurDef,
} from '../core/types.js';
import type { Repere } from '../debug/reperes.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE BANC D'ESSAI — douze stations, et un œil humain devant chacune.
 *
 * Quatre cent soixante vérifications tournent en simulation et personne n'a
 * jamais REGARDÉ la plupart de ce qu'elles prouvent. Une mesure dit qu'un
 * linteau ferme le passage ; elle ne dit pas si l'on comprend qu'on est arrêté.
 * Elle dit qu'un front d'encre met 4,6 s ; elle ne dit pas si on le voit courir.
 *
 * Ce fichier n'est pas un niveau. C'est un ATELIER : une dalle nue, douze
 * épreuves alignées, et rien d'autre. Pas d'énigme, pas d'ambiance, pas de
 * beauté — chaque station porte le minimum de géométrie que son épreuve exige,
 * et tout ce qu'on ajouterait ne servirait qu'à masquer un défaut.
 *
 * ─── CE QUI GARANTIT QU'ON NE PEUT PAS LE CASSER ──────────────────────────
 *
 * 1. TOUS LES LOGEMENTS SONT `rend: true`. Ailleurs un creux verrouille pour de
 *    bon, et c'est la bonne règle : un progrès qu'on défait par mégarde n'est
 *    pas un progrès. Ici il n'y a RIEN à gagner, donc rien à protéger — et un
 *    banc qu'on ne peut éprouver qu'une fois par chargement n'est pas un banc.
 *    Une pièce logée se reprend, et la station se rejoue.
 * 2. UN LEVIER DE RAPPEL au départ : tout retourne à sa place d'un coup.
 * 3. AUCUNE PIÈCE N'ENTRE DANS UN CREUX QU'ELLE NE VISE PAS — voir la table de
 *    la station 1. Ce n'est plus une sécurité vitale grâce à (1), mais un creux
 *    qui happe la mauvaise pièce ferait mentir l'épreuve d'à côté.
 *
 * `echelle` EST UN PALIER partout — −1 = ×1/4, 0 = ×1, 1 = ×4, 2 = ×16 — SAUF
 * `guideEchelle`, qui est un multiplicateur. C'est la seule exception du projet
 * et elle a déjà produit un guide de taille zéro, donc invisible.
 * ═══════════════════════════════════════════════════════════════════════════
 */

type V3 = [number, number, number];

/**
 * LE PAS DU BANC. Trente-quatre mètres : assez pour qu'une station n'empiète
 * jamais sur sa voisine (la plus large en occupe seize), assez peu pour qu'on
 * fasse le trajet à pied sans s'ennuyer. TOUT le fichier en dépend — décor et
 * repères — donc déplacer une station se fait ici et nulle part ailleurs.
 */
const PAS = 34;
/** Abscisse de la station n, numérotée de 1 à 12 comme dans le protocole. */
const X = (n: number): number => (n - 1) * PAS;

// ─── LES CONSTANTES QUE LES REPÈRES RÉUTILISENT ─────────────────────────────
// Un repère ne retape jamais une coordonnée : il la DEMANDE à la station. Une
// station qu'on déplace emmène donc son repère, et l'on ne se retrouve jamais à
// vérifier une épreuve depuis l'intérieur d'un mur.
/** Station 1 : la planche des cinq creux, et l'ordonnée de chacun. */
const PLANCHE_Y = 0.6;
const CREUX_Z = [-10, -5, 0, 5, 10];
/** Station 4 : la dalle où l'on se tient, et l'objet derrière le muret. */
const MURET_X = X(4) + 0.5;
const OBJET_4 = X(4) + 2.0;
/** Station 5 : la langue de dalle au-dessus du vide. */
const LANGUE_Z0 = 2;
/** Station 10 : la largeur du vide. MESURÉE, voir plus bas. */
const VIDE = 4.8;
/** Station 12 : la maquette, et le pinceau qui la peindra. */
const MAQUETTE: V3 = [X(12), 0, 32];

/**
 * LA PALETTE. Neutre, claire, sans caractère — c'est un banc, il doit
 * ressembler à un banc. Toute couleur qui ferait envie détournerait l'œil de ce
 * qu'on est venu juger. Brouillard large : on doit voir la station suivante
 * arriver, sinon on ne sait plus où l'on en est.
 */
const BANC_REGION: RegionDef = {
  name: 'banc',
  min: [-40, -30, -30],
  max: [420, 60, 56],
  paper: '#f2f0ea',
  colors: ['#e6e3da', '#cfcbc0', '#a9a49a', '#7b7f86'],
  ink: '#2a2925',
  brouillard: 340,
};

/**
 * STATION 6 : SA PROPRE RÉGION, et c'est toute l'épreuve. `muet: true` fait
 * taire l'affichage « ×1 · taille normale » du coin supérieur gauche. La zone
 * peinte au sol a EXACTEMENT l'empreinte de cette boîte : ce qu'on voit et ce
 * que le moteur teste sont la même chose, sans quoi le silence tomberait un pas
 * trop tôt ou trop tard et l'on croirait à une panne.
 */
const SILENCE_REGION: RegionDef = {
  name: 'silence',
  min: [X(6) - 8, -3, -8],
  max: [X(6) + 8, 30, 8],
  muet: true,
  paper: '#eeeeec',
  colors: ['#e2e2df', '#c9c9c4', '#a3a39c', '#8b8b84'],
  ink: '#2a2925',
  brouillard: 340,
};

/**
 * STATION 12 : la région qui ATTEND une couleur. Tant que l'or n'est pas rendu
 * elle est en lavis gris ; le pinceau réveillé la repeint depuis l'endroit du
 * geste. Elle est petite et lointaine EXPRÈS : c'est le cas qui avait cassé —
 * le front partait du pinceau, mettait quatre secondes à traverser le vide qui
 * l'en séparait, puis basculait la maquette en un dixième de seconde.
 */
const OR_REGION: RegionDef = {
  name: 'or',
  min: [MAQUETTE[0] - 8, -3, MAQUETTE[2] - 9],
  max: [MAQUETTE[0] + 8, 24, MAQUETTE[2] + 9],
  pigment: 'or',
  paper: '#f4efe2',
  colors: ['#eee6cd', '#d9bc7a', '#a98b46', '#c8a13a'],
  ink: '#2a2925',
  brouillard: 340,
};

const b = (min: V3, max: V3, ink = 0, opts: Partial<BoxDef> = {}): BoxDef => ({
  min,
  max,
  ink,
  region: 'banc',
  ...opts,
});

/**
 * LA DALLE. Découpée en huit pavés JOINTIFS pour ménager les trois trous des
 * stations 5 et 10. Jointifs et jamais chevauchants : `facesConfondues` ne
 * compare que deux `min` entre eux ou deux `max` entre eux — un `max` posé
 * contre un `min` ne se dispute rien. Deux pavés qui se recouvraient d'un
 * centimètre, eux, donneraient une couture grésillante de quatre cents mètres.
 *
 * `outline: false` : sinon chaque couture serait tracée à l'encre en plein
 * milieu du terrain, comme un trait de crayon oublié.
 *
 * Épaisseur 2,5 m, et rien du banc ne descend plus bas : le rattrapage se
 * déclenche à vingt mètres SOUS le point le plus bas du monde, et c'est ce
 * nombre-là qui fixe la durée de la chute de la station 5.
 */
const BAS = -2.5;
const sol = (x0: number, x1: number, z0: number, z1: number): BoxDef =>
  b([x0, BAS, z0], [x1, 0, z1], 0, { outline: false });

const T10 = X(10);
const DALLE: BoxDef[] = [
  sol(-24, X(5) - 7, -20, 44),
  sol(X(5) - 7, X(5) + 7, -20, LANGUE_Z0),
  sol(X(5) - 7, X(5) + 7, 16, 44),
  sol(X(5) + 7, T10, -20, 44),
  sol(T10, T10 + VIDE, -20, -13),
  sol(T10, T10 + VIDE, -3, 3),
  sol(T10, T10 + VIDE, 13, 44),
  sol(T10 + VIDE, 400, -20, 44),
];

/**
 * UNE BORNE PAR STATION, et sa hauteur donne son numéro. On se situe sans lire
 * et sans compter : la borne de la douzième fait trois fois celle de la
 * première. C'est le seul ornement du banc, et il est fonctionnel.
 */
const borne = (n: number): BoxDef =>
  b([X(n) - 0.4, 0, -17.4], [X(n) + 0.4, 2.4 + 0.6 * n, -16.6], 2);

/**
 * UNE PORTE BASSE, telle qu'on l'a mesurée : deux jambages, un linteau, et un
 * mur qui continue de part et d'autre — sans quoi l'on contournerait sans rien
 * apprendre. Le linteau DÉBORDE de cinq centimètres en x et de dix en z : ses
 * faces se noient donc dans les jambages au lieu de leur être coplanaires, et
 * son dessus reste cinq centimètres au-dessus du leur.
 *
 * `seuil` à 0 pour la station 7, à 0,06 pour la station 8. C'est la seule
 * différence visible entre les deux, et c'est leur contraste qui est l'épreuve.
 */
const porte = (x: number, linteau: number, seuil: number): BoxDef[] => {
  const H = 3.0;
  const boites: BoxDef[] = [
    b([x, 0, -8], [x + 0.4, H, -0.5], 2),
    b([x, 0, 0.5], [x + 0.4, H, 8], 2),
    b([x - 0.05, linteau, -0.6], [x + 0.45, H + 0.02, 0.6], 2),
  ];
  if (seuil > 0) boites.push(b([x - 0.05, 0, -0.6], [x + 0.45, seuil, 0.6], 3));
  return boites;
};

/** Une marque au sol : un aplat fantôme, qui ne retient rien et ne dit qu'où. */
const marque = (x0: number, x1: number, z0: number, z1: number, ink = 3): BoxDef =>
  b([x0, 0.005, z0], [x1, 0.02, z1], ink, { ghost: true });

const DECOR: BoxDef[] = [
  ...DALLE,
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(borne),

  // STATION 1 — la planche des cinq creux. Soixante centimètres, la hauteur
  // d'un genou : l'étalon qu'on a dans le corps et qu'on n'a pas à calculer.
  b([X(1) - 1.5, 0, -12.5], [X(1) + 1.5, PLANCHE_Y, 12.5], 1),

  // STATION 2 — le socle du creux qui attend la vrille retournée. Un mètre de
  // haut : à ×4 il arrive à la cheville, et l'on voit qu'on a changé, pas lui.
  b([X(2) - 1.8, 0, -1.8], [X(2) + 1.8, 1.0, 1.8], 1),

  // STATION 3 — LE VERRE. `invisible` : il arrête le corps ET la main, il ne
  // se dessine pas. C'est le seul solide du banc exempté de la vérification des
  // faces confondues, puisqu'il n'a aucune face à dessiner. Dix mètres de long :
  // on le contourne, on n'est jamais piégé.
  b([X(3) - 0.1, 0, -5], [X(3) + 0.1, 3, 5], 0, { invisible: true }),

  // STATION 4 — le muret à hauteur de poitrine, et la dalle d'où l'on essaie.
  // 1,20 m : la caméra est à 1,656 m et voit par-dessus ; le bras, lui, part de
  // 1,08 m et n'a rien à faire là. C'est cet écart-là qu'on vient regarder.
  b([MURET_X, 0, -0.8], [MURET_X + 0.2, 1.2, 0.8], 2),
  marque(X(4) - 0.5, X(4) + 0.5, -0.5, 0.5),
  marque(X(4) - 0.5, X(4) + 0.5, 1.1, 2.1, 2),

  // STATION 5 — LA LANGUE. Trente centimètres d'épaisseur, et RIEN dessous
  // jusqu'au bas du monde : c'est ce qui fait qu'on tombe pour de bon.
  b([X(5) - 1.5, -0.3, LANGUE_Z0], [X(5) + 1.5, 0, LANGUE_Z0 + 10], 1),

  // STATION 6 — la zone muette, et quatre bornes basses pour la voir de loin.
  marque(X(6) - 8, X(6) + 8, -8, 8, 1),
  b([X(6) - 8.2, 0, -8.2], [X(6) - 7.8, 1.6, -7.8], 2, { region: 'silence' }),
  b([X(6) + 7.8, 0, -8.2], [X(6) + 8.2, 1.7, -7.8], 2, { region: 'silence' }),
  b([X(6) - 8.2, 0, 7.8], [X(6) - 7.8, 1.8, 8.2], 2, { region: 'silence' }),
  b([X(6) + 7.8, 0, 7.8], [X(6) + 8.2, 1.9, 8.2], 2, { region: 'silence' }),

  // STATIONS 7 et 8 — les deux portes. Elles doivent se ressembler.
  ...porte(X(7), 1.5, 0),
  ...porte(X(8), 1.95, 0.06),

  // STATION 10 — les deux couloirs d'élan, peints au sol pour qu'on sache d'où
  // partir. Vingt mètres : de quoi atteindre la vitesse de marche bien avant le
  // bord, ce qui prend 0,6 s et non pas trois pas.
  marque(T10 - 20, T10, -13, -3, 1),
  marque(T10 - 20, T10, 3, 13, 1),

  // STATION 11 — le mur que le Pinceau ne doit pas traverser. Quatorze mètres :
  // plus haut que l'arc de son vol, sinon il passerait par-dessus et l'épreuve
  // ne prouverait rien. Trente-deux de long, et l'on peut le contourner.
  b([X(11) - 0.3, 0, -16], [X(11) + 0.3, 14, 16], 2),

  // STATION 12 — la maquette. Un socle et quatre volumes de hauteurs distinctes,
  // décalés pour qu'aucune face n'en recouvre une autre.
  b([MAQUETTE[0] - 4, 0, MAQUETTE[2] - 4], [MAQUETTE[0] + 4, 0.3, MAQUETTE[2] + 4], 1, {
    region: 'or',
  }),
  b([MAQUETTE[0] - 3, 0.3, MAQUETTE[2] - 3], [MAQUETTE[0] - 1.6, 2.1, MAQUETTE[2] - 1.6], 2, {
    region: 'or',
  }),
  b([MAQUETTE[0] - 0.9, 0.3, MAQUETTE[2] - 1.8], [MAQUETTE[0] + 0.7, 2.9, MAQUETTE[2] - 0.2], 3, {
    region: 'or',
  }),
  b([MAQUETTE[0] + 1, 0.3, MAQUETTE[2] + 0.5], [MAQUETTE[0] + 2.2, 1.7, MAQUETTE[2] + 1.7], 2, {
    region: 'or',
  }),
  b([MAQUETTE[0] - 2.4, 0.3, MAQUETTE[2] + 1], [MAQUETTE[0] - 1, 2.3, MAQUETTE[2] + 2.4], 3, {
    region: 'or',
  }),
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATION 1 — LA TABLE DES PIÈCES ET DES CREUX
 *
 * `Sockets.raisonDuRefus` n'annonce QU'UNE chose à la fois, dans cet ordre :
 * la taille (dédoublée en trop-grand / trop-petit), la forme, la teinte, la
 * main. Cinq raisons possibles, donc cinq phrases — et il faut que chaque creux
 * en produise une AUTRE, sinon on n'entend pas ce qu'on est venu entendre.
 *
 * D'où la contrainte qui gouverne tout le reste : pour entendre « forme », il
 * faut présenter une pièce de la BONNE TAILLE — sans quoi la taille parle en
 * premier et couvre le reste. Il faut donc une pièce par creux non-dimensionnel,
 * et les trois doivent rester sous 0,99 m, la charge d'un joueur à taille
 * d'homme.
 *
 * ┌─────────────────────────┬──────┬──────┬──────┬──────┬──────┐
 * │  pièce  \  creux        │ 0,18 │ 0,52 │ 0,30 │ 0,80 │ 2,40 │
 * │                         │TAILLE│FORME │TEINTE│ MAIN │ TOUT │
 * ├─────────────────────────┼──────┼──────┼──────┼──────┼──────┤
 * │ galet   0,52 · encre 1  │ TG   │  f   │  ·   │  ·   │ TP   │
 * │ perle   0,30 · encre 1  │  ·   │  ·   │  t   │  ·   │  ·   │
 * │ vrille  0,80 · encre 2 L│  ·   │  ·   │  ·   │  m   │  ·   │
 * └─────────────────────────┴──────┴──────┴──────┴──────┴──────┘
 *   TG « trop-grand »   TP « trop-petit »   f forme   t teinte   m main
 *   ·  hors de portée du creux : la taille n'est même pas du même ordre
 *
 * AUCUNE CASE N'EST UN OUI. C'est voulu et c'est ce qui rend la station
 * rejouable à l'infini : le galet n'a pas de forme, donc le creux de la forme
 * le refuse ; la perle est encre 1 quand on lui demande 3 ; la vrille est
 * gauche quand on veut droite. Rien ne se loge, rien ne se perd.
 *
 * ET LES CINQ TAILLES SONT ÉTRANGÈRES LES UNES AUX AUTRES. Une porte multiplie
 * par quatre, jamais autre chose, et la tolérance vaut 12 % : le rapport le plus
 * serré du banc est 0,80/0,52 = 1,54, soit près de quatre fois la tolérance
 * cumulée. Aucun nombre de traversées ne fait passer une pièce d'une classe à
 * l'autre — c'est la seule forme de preuve qui survive à qui ajouterait une
 * porte demain.
 *
 * `portee` VAUT 1,2 m ET LES CREUX SONT À CINQ MÈTRES L'UN DE L'AUTRE. Un
 * joueur à taille d'homme repose ce qu'il porte à 0,34 + 2 × l'arête devant
 * lui, soit un mètre pour le galet : la portée l'attrape, et sa voisine est
 * quatre fois trop loin pour dire un mot. C'est ce qui garantit qu'on entend
 * le creux devant lequel on se tient, et pas un autre.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const creux = (id: string, i: number, size: number, exige: Partial<SocketDef>): SocketDef => ({
  id,
  position: [X(1), PLANCHE_Y, CREUX_Z[i]],
  size,
  portee: 1.2,
  ink: 2,
  rend: true,
  ...exige,
});

const SOCKETS: SocketDef[] = [
  creux('banc-taille', 0, 0.18, {}),
  creux('banc-forme', 1, 0.52, { forme: 'vrille' }),
  creux('banc-teinte', 2, 0.3, { teinte: 3 }),
  creux('banc-main', 3, 0.8, { main: 'D' }),
  creux('banc-tout', 4, 2.4, { forme: 'vrille', main: 'D', teinte: 3, portee: 2.4 }),
  /**
   * STATION 2 — le creux qui accepte la vrille RETOURNÉE, et elle seule.
   * 1,60 = 0,40 × 4 : le miroir corrige la main et la taille du même geste, et
   * c'est le seul endroit du banc où un logement dit oui.
   *
   * `portee` vaut 7 et non 1,2 : celui qui vient garnir ce creux mesure 7,20 m
   * et repose ce qu'il porte à 1,36 + 3,20 = 4,56 m devant lui. Viser un trou
   * d'un mètre soixante à quatre mètres et demi, au doigt sur un téléphone,
   * n'est pas une épreuve de moteur — c'est une épreuve d'adresse, et ce nombre
   * a déjà rendu une salle entière infaisable sans que rien ne le laisse voir.
   */
  {
    id: 'banc-miroir',
    position: [X(2), 1.0, 0],
    size: 1.6,
    forme: 'vrille',
    main: 'D',
    portee: 7,
    ink: 2,
    rend: true,
  },
];

/** Les quatre cellules du tétracube « vis » : on part, on tourne, on monte. */
const E = 0.01;
const cel = (ink: number) => (i: number, j: number, k: number) => ({
  min: [-0.5 + 0.5 * i - E, -0.5 + 0.5 * j - E, -0.5 + 0.5 * k - E] as V3,
  max: [0.5 * i + E, 0.5 * j + E, 0.5 * k + E] as V3,
  ink,
});
const vrille = (ink: number) => {
  const c = cel(ink);
  return [c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(1, 1, 1)];
};

const CARRYABLES: CarryableDef[] = [
  // Station 1 : les trois pièces de la table ci-dessus, posées devant la
  // planche, à trois mètres du bord des creux — donc hors de toute portée.
  { id: 'banc-galet', position: [X(1) - 4.5, 0.05, -7.5], size: 0.52, ink: 1 },
  { id: 'banc-perle', position: [X(1) - 4.5, 0.05, 0], size: 0.3, ink: 1 },
  {
    id: 'banc-vrille-gauche',
    position: [X(1) - 4.5, 0.05, 7.5],
    size: 0.8,
    ink: 2,
    forme: 'vrille',
    main: 'L',
    pieces: vrille(2),
  },
  // Station 2 : la vrille du miroir. 0,40 à l'aller, 1,60 au retour.
  {
    id: 'banc-vrille-miroir',
    position: [X(2) - 12, 0.05, -4],
    size: 0.4,
    ink: 3,
    forme: 'vrille',
    main: 'L',
    pieces: vrille(3),
  },
  // Stations 3, 4, 5 : trois cubes ordinaires. 0,38 n'est la taille d'aucun
  // creux du banc, à aucune puissance de quatre.
  { id: 'banc-derriere-verre', position: [X(3) + 1.4, 0.05, 0], size: 0.38, ink: 3 },
  { id: 'banc-derriere-muret', position: [OBJET_4, 0.05, 0], size: 0.38, ink: 3 },
  { id: 'banc-en-poche', position: [X(5) - 1.2, 0.05, -3], size: 0.38, ink: 3 },
  // Station 9 : ce qu'on jette pour entendre le bruit qu'il fait, à deux
  // tailles. Il devient 2,64 de l'autre côté, et reste largement portable.
  { id: 'banc-sonnette', position: [X(9) - 10, 0.05, -6], size: 0.66, ink: 3 },
];

/**
 * LES TROIS PORTES. Aucune n'a de `condition` : on les franchit dans les deux
 * sens autant qu'on veut, et tout geste se défait. Leurs six faces sont en six
 * points distincts — deux faces plantées au même endroit se disputent le plan,
 * et l'on traverse celle qu'on ne voulait pas.
 *
 * ON ENTRE CONTRE LA NORMALE ET L'ON RESSORT AVEC ELLE. Le banc se parcourt
 * vers l'est : les faces d'entrée ont donc `yaw: -π/2` (normale −x) et les
 * faces de sortie `yaw: +π/2` (normale +x), et l'on ne se retrouve jamais dos
 * au chemin en ressortant.
 */
const PORTALS: PortalPairDef[] = [
  {
    // STATION 2 — LE MIROIR. On entre à l'est de la station, on ressort à
    // l'ouest, dans le même décor et quatre fois plus grand : rien d'autre n'a
    // bougé, donc c'est forcément soi. Et la vrille a changé de main en chemin.
    id: 'banc-miroir-porte',
    miroir: true,
    colorBig: 0x7b7f86,
    colorSmall: 0x2f4b7c,
    small: { position: [X(2) + 6, 0.05, -6], yaw: -Math.PI / 2 },
    big: { position: [X(2) - 6, 0.05, 6], yaw: Math.PI / 2 },
  },
  {
    // STATION 9 — la paire ordinaire de l'épreuve du son. Aller et retour sur
    // place : douze mètres séparent les deux faces, on fait la navette autant
    // qu'il faut pour comparer un grave et un aigu.
    id: 'banc-son',
    colorBig: 0xa9a49a,
    colorSmall: 0x7b7f86,
    small: { position: [X(9) + 6, 0.05, -6], yaw: -Math.PI / 2 },
    big: { position: [X(9) - 6, 0.05, 6], yaw: Math.PI / 2 },
  },
  {
    // STATION 11 — la porte du mur, celle par où le Pinceau doit passer. Elle
    // est plantée à 3,7 m du mur et non dedans : un corps d'un rayon de 0,34 m
    // doit pouvoir atteindre le PLAN de la face, et il ne l'atteindrait pas si
    // la maçonnerie commençait avant.
    id: 'banc-guide-porte',
    colorBig: 0xa9a49a,
    colorSmall: 0x7b7f86,
    small: { position: [X(11) - 4, 0.05, -5], yaw: -Math.PI / 2 },
    big: { position: [X(11) + 4, 0.05, 5], yaw: Math.PI / 2 },
  },
];

/**
 * STATION 12 — LE VEILLEUR. Son identifiant DOIT commencer par `pinceau-` : le
 * nom du pigment se lit dedans, et c'est ce qui relie ce réveil à la région
 * `or` sans table de correspondance — deux tables décrivant la même chose ont
 * déjà coûté une nuit à ce projet.
 *
 * `echelle: 0` est un PALIER. Trop grand ou trop petit, il frémit et refuse, ce
 * qui fait deux épreuves pour le prix d'une : viens à ×4 depuis la station 11
 * et tu verras le refus avant de voir la couleur.
 */
const VEILLEURS: VeilleurDef[] = [
  { id: 'pinceau-or', position: [X(12), 0.05, 0], radius: 3, echelle: 0 },
];

/**
 * LES JALONS DU PINCEAU — treize, et non douze.
 *
 * Douze suffiraient à poser un guide près de chaque station. Mais la station 11
 * a besoin de DEUX jalons, un de chaque côté du mur : le Pinceau part du
 * premier, entre dans la porte sous nos yeux, disparaît, et ressort de l'autre
 * face pour rejoindre le second. Sans ce doublet, il n'y aurait rien à voir —
 * un guide qui reste du même côté ne prouve rien.
 *
 * `guideEchelle` VAUT 1 PARTOUT, et c'est un MULTIPLICATEUR, jamais un palier.
 * Écrire 0 ici — le palier de la taille normale — donnerait un Pinceau de
 * taille zéro, donc invisible, et l'on chercherait le défaut ailleurs pendant
 * une heure. Le banc n'a qu'un seul étage : le joueur change de taille, le
 * monde non, donc le Pinceau non plus.
 */
const JALONS: V3[] = [
  [X(1), 3, 4],
  [X(2), 3, 0],
  [X(3), 3, 0],
  [X(4), 3, 0],
  [X(5), 3, -2],
  [X(6), 3, 0],
  [X(7), 3, -3],
  [X(8), 3, -3],
  [X(9), 3, 0],
  [T10 - 3, 3, 0],
  [X(11) - 8, 3, -5],
  [X(11) + 8, 3, 5],
  [X(12), 3, 6],
];

export const BANC: LevelDef = {
  name: 'Le banc d’essai',
  // Quatorze mètres avant la première station, sur la dalle, face à l'est :
  // on voit les douze bornes s'aligner et l'on sait où l'on est.
  spawn: [-14, 0.05, 0],
  spawnYaw: Math.PI / 2,
  spawnScale: 0,
  // L'ordre compte : la première région qui contient le joueur donne
  // l'ambiance. Les deux poches d'abord, la dalle entière ensuite.
  regions: [SILENCE_REGION, OR_REGION, BANC_REGION],
  boxes: DECOR,
  carryables: CARRYABLES,
  sockets: SOCKETS,
  portals: PORTALS,
  veilleurs: VEILLEURS,
  // Le levier qui autorise tout le reste. Loin de tout creux et de tout objet :
  // une bulle qui mordrait sur une station rappellerait le banc entier au lieu
  // de reposer ce qu'on tient.
  rappel: { position: [-9, 0.2, -6], radius: 1.6 },
  guide: JALONS,
  guideEchelle: JALONS.map(() => 1),
  guidePorte: JALONS.map((_, i) => (i === 11 ? 'banc-guide-porte' : null)),
  // Hors du terrain, et de neuf cents mètres : un banc ne se gagne pas.
  goal: { position: [0, -900, 0], radius: 1 },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PROTOCOLE — douze lignes, et chacune dit LE GESTE puis LE RÉSULTAT.
 *
 * Elles se lisent sur un téléphone, par quelqu'un qui ne code pas. Chacune
 * nomme aussi ce qui serait un MAUVAIS signe : une consigne qui ne dit que le
 * bon résultat laisse valider un défaut par indulgence.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const REPERES_BANC: Repere[] = [
  {
    titre: '1 · Le refus qui parle',
    verifier:
      'Cinq creux en enfilade. Porte le GALET devant le premier, pose-le ; recommence ' +
      'devant le deuxième, puis le dernier. Fais la même chose avec la PERLE devant le ' +
      'troisième et la VRILLE devant le quatrième. → Une demi-seconde après chaque ' +
      'dépose, UNE phrase, et cinq phrases différentes en tout : trop grand · pas ce ' +
      'dessin · la couleur non · elle est juste et n’entre pas · elle danse dans le ' +
      'creux. Mauvais signe : deux phrases d’un coup, une phrase pour le creux d’à ' +
      'côté, ou une pièce qui reste plantée dedans.',
    position: [X(1) - 8, 0.05, 0],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 0,
  },
  {
    titre: '2 · La main se voit',
    verifier:
      'Ramasse la petite vrille, marche vers l’est, franchis la porte bleue. → Tu ' +
      'ressors quatre fois plus grand À L’AUTRE BOUT de la station, et la vrille dans ' +
      'tes mains est son propre reflet : le bras qui montait à droite monte à gauche. ' +
      'Reviens au socle et pose-la : elle entre. Mauvais signe : elle a la bonne taille ' +
      'et refuse quand même, ou elle a la même allure qu’avant.',
    position: [X(2) - 14, 0.05, -4],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 1,
  },
  {
    titre: '3 · Le verre',
    verifier:
      'Avance droit vers l’est. → Tu es arrêté par RIEN : pas de mur, pas de trait, ' +
      'rien à l’écran. Le cube est à deux pas derrière, tu le vois, et E ne le prend ' +
      'pas. Contourne par le côté (la paroi fait dix mètres), reviens vers lui : E le ' +
      'prend. Mauvais signe : le prendre à travers, ou ne plus pouvoir le prendre du ' +
      'tout une fois contourné.',
    position: [X(3) - 4, 0.05, 0],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 2,
  },
  {
    titre: '4 · On ne ramasse plus à travers les murs',
    verifier:
      'Tu es sur la dalle marquée. Le cube est à deux mètres, derrière un muret qui ' +
      't’arrive à la poitrine — tu le VOIS par-dessus. Appuie sur E. → Rien. Va sur la ' +
      'seconde dalle marquée, à un pas sur ta gauche, regarde le cube : E le prend. ' +
      'Mauvais signe : le prendre depuis la première dalle. Le bras porte 2,88 m et le ' +
      'cube est à 2 : c’est bien le muret qui refuse, pas la distance.',
    position: [X(4), 0.05, 0],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 3,
  },
  {
    titre: '5 · Le rattrapage',
    verifier:
      'Prends le cube, avance sur la langue de dalle et saute dans le vide. → Tu tombes ' +
      'une seconde ou deux, puis le monde te repose LÀ OÙ TU TE TENAIS, avec le cube ' +
      'toujours dans les mains, et une phrase le dit. Mauvais signe : tomber sans fin, ' +
      'renaître au départ du banc, perdre le cube, ou être reposé à une autre taille.',
    position: [X(5), 0.05, LANGUE_Z0 - 8],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 4,
  },
  {
    titre: '6 · L’échelle se tait',
    verifier:
      'Regarde le coin en haut à gauche : « ×1 · taille normale ». Marche vers l’est et ' +
      'entre dans le rectangle peint au sol. → L’affichage devient UN TIRET, net, sans ' +
      'fondu. Ressors : il revient. Mauvais signe : un fondu (on croirait à une panne), ' +
      'un silence qui commence avant ou après le trait peint, ou un affichage qui reste ' +
      'muet une fois sorti.',
    position: [X(6) - 14, 0.05, 0],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 5,
  },
  {
    titre: '7 · Le linteau ne catapulte plus',
    verifier:
      'Le linteau est à 1,50 m et tu en fais 1,80. Marche dedans, colle-toi, appuie, ' +
      'saute, longe le mur de gauche à droite en le poussant. → Tu es ARRÊTÉ, toujours, ' +
      'et tu restes au sol. Mauvais signe, et c’est LE défaut qui a résisté à six ' +
      'tentatives : te retrouver debout SUR le linteau, ou de l’autre côté du mur.',
    position: [X(7) - 6, 0.05, 0],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 6,
  },
  {
    titre: '8 · Le seuil bas se franchit',
    verifier:
      'La même porte, à un détail près : un seuil de six centimètres et un linteau à ' +
      '1,95 m. Marche dedans. → Tu passes SANS T’EN APERCEVOIR, sans ralentir, sans ' +
      'sauter. Mauvais signe : buter sur le seuil, ou être relevé d’un coup sec. ' +
      'Compare avec la station 7 : c’est leur contraste qui est l’épreuve.',
    position: [X(8) - 6, 0.05, 0],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 7,
  },
  {
    titre: '9 · Le son suit la taille',
    verifier:
      'Écoute d’abord : tes pas, le vent, et le cube qu’on jette (clic gauche). ' +
      'Franchis la porte vers l’est, tu deviens géant : refais les trois. → TOUT est ' +
      'plus GRAVE, et le vent a glissé au lieu de sauter. Reviens par l’autre face : ' +
      'tout redevient aigu. Mauvais signe : une seule des trois voix qui change, ou un ' +
      'vent qui devient un sifflement au lieu d’un souffle.',
    position: [X(9) - 12, 0.05, -6],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 8,
  },
  {
    titre: '10 · Le sprint ne vole pas',
    verifier:
      'Deux vides identiques de 4,80 m, côte à côte. Sur le premier : prends tout ton ' +
      'élan sur le couloir peint et saute au bord. → Tu passes. Sur le second : place-' +
      'toi au bord À L’ARRÊT et saute en avançant. → Tu tombes, et le monde te repose ' +
      'au bord. Mauvais signe : passer les deux (le vide est trop étroit) ou rater les ' +
      'deux (trop large) — dans les deux cas l’élan ne raconte plus rien.',
    position: [T10 - 18, 0.05, -8],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 9,
  },
  {
    titre: '11 · Le guide passe par la porte',
    verifier:
      'Le Pinceau flotte devant toi, de ce côté-ci du mur. Avance vers lui. → Il ' +
      's’envole À PLAT vers la porte, ENTRE dedans, disparaît, et ressort de la face ' +
      'jumelle de l’autre côté avant de rejoindre son perchoir. Mauvais signe : le voir ' +
      'traverser le mur, passer par-dessus, ou s’éteindre ici pour se rallumer là-bas ' +
      'sans qu’on ait vu par où — on lirait « il s’est téléporté » au lieu de ' +
      '« suis-moi ».',
    position: [X(11) - 20, 0.05, -5],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 10,
  },
  {
    titre: '12 · La couleur se pose, et lentement',
    verifier:
      'Un pinceau dort à trois pas, à l’est. Approche et appuie sur E — à taille ' +
      'normale, pas autrement. Puis TOURNE-TOI vers le nord : la maquette est à trente ' +
      'mètres. → Elle est grise, puis l’encre y court d’un bord à l’autre pendant ' +
      'PLUSIEURS SECONDES. Mauvais signe, et c’est le défaut qui a failli tout ' +
      'annuler : un long silence puis une bascule d’un dixième de seconde. Compte : si ' +
      'tu n’as pas le temps de suivre le front des yeux, c’est raté.',
    position: [X(12) - 6, 0.05, 0],
    echelle: 0,
    lacet: Math.PI / 2,
    pigments: [],
    jalon: 12,
  },
];
