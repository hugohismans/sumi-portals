import type {
  BoxDef, CarryableDef, LevelDef, PortalPairDef, RegionDef, SocketDef, VeilleurDef,
} from '../core/types.js';
import type { Repere } from '../debug/reperes.js';

/**
 * LE BANC D'ESSAI — douze stations, et un œil humain devant chacune.
 *
 * Quatre cent soixante vérifications tournent en simulation, et presque rien
 * n'a jamais été REGARDÉ : une mesure dit qu'un linteau ferme le passage, pas
 * si l'on comprend qu'on est arrêté ; qu'un front d'encre dure 4,6 s, pas si on
 * le voit courir. Ce n'est donc pas un niveau mais un atelier — une dalle nue,
 * douze épreuves alignées, le minimum de géométrie que chacune exige. ON NE
 * PEUT PAS LE CASSER : tous les logements sont `rend: true` (ailleurs un creux
 * verrouille pour de bon, mais ici il n'y a rien à gagner, et un banc qu'on
 * n'éprouve qu'une fois par chargement n'est pas un banc), un levier de rappel
 * remet tout en place, et malgré ces deux filets aucune pièce n'entre dans un
 * creux qu'elle ne vise pas — voir la table de la station 1. Et `echelle` EST UN
 * PALIER partout (−1 = ×1/4, 0 = ×1, 1 = ×4) SAUF `guideEchelle`, seul
 * multiplicateur du projet, qui a déjà produit un guide de taille zéro.
 */

type V3 = [number, number, number];

/**
 * TRENTE-QUATRE MÈTRES entre deux stations : assez pour qu'aucune n'empiète sur
 * sa voisine (la plus large en occupe seize), assez peu pour marcher sans
 * s'ennuyer. Décor ET repères en dépendent — un repère n'écrit jamais une
 * coordonnée, il l'emprunte à sa station, si bien qu'une station déplacée emmène
 * son repère et qu'on ne juge jamais depuis l'intérieur d'un mur.
 */
const X = (n: number): number => (n - 1) * 34;
/** Le banc se parcourt vers l'est. `yawToForward(π/2)` vaut (1, 0, 0). */
const EST = Math.PI / 2;
/** Station 1 : la planche des cinq creux, et l'ordonnée de chacun. */
const PLANCHE_Y = 0.6;
const CREUX_Z = [-10, -5, 0, 5, 10];
/** Station 4 : le muret, et le cube posé deux mètres derrière lui. */
const MURET_X = X(4) + 0.5;
/** Station 5 : la langue de dalle au-dessus du vide. */
const LANGUE_Z0 = 2;
/**
 * STATION 10 : LA LARGEUR DU VIDE, MESURÉE ET NON DÉDUITE. Portée maximale d'un
 * saut à ×1, relevée sur cette géométrie même : à l'arrêt 3,70 m · à l'arrêt +
 * Maj 4,76 · élan de 3 m 4,81 · élan de 20 m 4,86 · élan de 20 m mais sauté
 * 60 cm trop tôt 4,26 · élan de 20 m + Maj 6,36.
 *
 * 4,20 sépare donc l'élan du reste : cinquante centimètres de trop en sautant
 * du bord, soixante-six de tolérance sur l'instant du décollage quand on s'est
 * élancé. ET L'ON N'EXIGE SURTOUT PAS `Maj` : le sprint n'existe qu'au clavier.
 * Un vide de 5,60 aurait séparé bien plus proprement la course de la marche, et
 * aurait été la seule station qui n'existe pas sur téléphone — là où ceci se lit.
 */
const VIDE = 4.2;
/** Station 12 : la maquette, longue de vingt-trois mètres — voir `OR_REGION`. */
const MAQ_X = X(12);
const MAQ_Z0 = 26;
const MAQ_Z1 = 49;

/** Neutre : une couleur qui plairait détournerait l'œil. Brouillard large. */
const BANC_REGION: RegionDef = {
  name: 'banc', min: [-40, -30, -30], max: [420, 60, 58],
  paper: '#f2f0ea', colors: ['#e6e3da', '#cfcbc0', '#a9a49a', '#7b7f86'],
  ink: '#2a2925', brouillard: 340,
};
/**
 * STATION 6 : SA PROPRE RÉGION, et c'est toute l'épreuve. Le rectangle peint au
 * sol a EXACTEMENT l'empreinte de cette boîte : ce qu'on voit et ce que le
 * moteur teste sont la même chose, sans quoi le silence tomberait un pas trop
 * tôt et l'on conclurait à une panne.
 */
const SILENCE_REGION: RegionDef = {
  name: 'silence', min: [X(6) - 8, -3, -8], max: [X(6) + 8, 30, 8], muet: true,
  paper: '#eeeeec', colors: ['#e2e2df', '#c9c9c4', '#a3a39c', '#8b8b84'],
  ink: '#2a2925', brouillard: 340,
};
/**
 * STATION 12 : LA RÉGION QUI ATTEND UNE COULEUR, ET SA BOÎTE EST L'ÉPREUVE. Le
 * front est une SPHÈRE : sa course visible va de `debut`, point de la région le
 * plus proche du pinceau, à `portee`, coin le plus éloigné × 1,14, en quatre
 * cinquièmes des 4,6 s. Deux choses décident de ce qu'on voit. LA BOÎTE DOIT
 * COLLER À LA MAQUETTE — le vide au-delà du dernier volume est du temps dépensé
 * sur rien, et c'est la fin de course, donc la partie lente : première version,
 * boîte de 16 × 27 × 18 pour une maquette de 8 × 8, elle se coloriait en 0,53 s.
 * Et LA MAQUETTE DOIT ÊTRE LONGUE DANS L'AXE DU REGARD — la frange vaut ±16 % du
 * rayon plus des gouttes 17 % devant, soit dix mètres de flou à trente mètres, et
 * huit mètres de côté seraient avalés en une bouchée quelle que soit la durée
 * réglée. D'où une bande de vingt-trois mètres commençant à vingt-six : rien
 * pendant 0,48 s, puis l'encre la traverse de 0,48 à 2,14 s — une seconde
 * soixante-six, plafond atteignable pour une région lointaine.
 */
const OR_REGION: RegionDef = {
  name: 'or', min: [MAQ_X - 4.5, -0.5, MAQ_Z0], max: [MAQ_X + 4.5, 3.2, MAQ_Z1],
  pigment: 'or', paper: '#f4efe2', colors: ['#eee6cd', '#d9bc7a', '#a98b46', '#c8a13a'],
  ink: '#2a2925', brouillard: 340,
};
const b = (min: V3, max: V3, ink = 0, opts: Partial<BoxDef> = {}): BoxDef =>
  ({ min, max, ink, region: 'banc', ...opts });
/**
 * LA DALLE, en huit pavés JOINTIFS qui ménagent les trois trous des stations 5
 * et 10. `facesConfondues` compare deux `min` entre eux ou deux `max` entre eux,
 * jamais un `max` contre un `min` : deux pavés bord à bord ne se disputent donc
 * rien, quand deux pavés se recouvrant d'un centimètre donneraient une couture
 * grésillante de quatre cents mètres — et `outline: false`, sinon cette couture
 * serait tracée à l'encre. ÉPAISSEUR 2,5 M, RIEN PLUS BAS : le rattrapage se
 * déclenche vingt mètres sous le point le plus bas du monde, et ce nombre fixe
 * la chute de la station 5 (mesurée : 2,97 s).
 */
const sol = (x0: number, x1: number, z0: number, z1: number): BoxDef =>
  b([x0, -2.5, z0], [x1, 0, z1], 0, { outline: false });
const T10 = X(10);
const NORD = 54; // Le bord nord de la dalle : la maquette de la station 12 y court.
const DALLE: BoxDef[] = [
  sol(-24, X(5) - 7, -20, NORD),
  sol(X(5) - 7, X(5) + 7, -20, LANGUE_Z0),
  sol(X(5) - 7, X(5) + 7, 16, NORD),
  sol(X(5) + 7, T10, -20, NORD),
  // Les deux vides de la station 10, séparés par la bande de trois mètres qui
  // sert de chemin de retour : un saut raté coûte dix secondes, jamais la partie.
  sol(T10, T10 + VIDE, -20, -13),
  sol(T10, T10 + VIDE, -3, 3),
  sol(T10, T10 + VIDE, 13, NORD),
  sol(T10 + VIDE, 400, -20, NORD),
];
/** Une borne par station : sa hauteur donne son numéro, de 3,00 à 9,60 m. */
const borne = (n: number): BoxDef =>
  b([X(n) - 0.4, 0, -17.4], [X(n) + 0.4, 2.4 + 0.6 * n, -16.6], 2);
/**
 * UNE PORTE BASSE : deux jambages, un linteau, un mur qui continue seize mètres
 * de part et d'autre — sans quoi l'on contournerait sans rien apprendre.
 * LE LINTEAU EST À FLEUR DES JAMBAGES, ET CE N'EST PAS UN DÉTAIL. Débordant de
 * cinq centimètres — pour écarter des faces coplanaires — il place un joueur
 * plaqué contre le jambage À L'INTÉRIEUR de son emprise : le corps le pénètre en
 * l'air, la descente suivante n'a pas d'appui sous elle et se résout sur son
 * DESSUS, on est catapulté par-dessus le mur. Mesuré. À fleur il ne reste pas non
 * plus une face coplanaire, chaque contact étant un `min` contre un `max`.
 */
const porte = (x: number, linteau: number, seuil: number): BoxDef[] => {
  const H = 3.0;   // hauteur du mur
  const O = 0.5;   // demi-largeur du passage
  const boites = [
    b([x, 0, -8], [x + 0.4, H, -O], 2),
    b([x, 0, O], [x + 0.4, H, 8], 2),
    b([x, linteau, -O], [x + 0.4, H + 0.02, O], 2),
  ];
  if (seuil > 0) boites.push(b([x, 0, -O], [x + 0.4, seuil, O], 3));
  return boites;
};
/** Une marque au sol : un aplat fantôme, qui ne retient rien et ne dit qu'où. */
const marque = (x0: number, x1: number, z0: number, z1: number, ink = 3): BoxDef =>
  b([x0, 0.005, z0], [x1, 0.02, z1], ink, { ghost: true });
/**
 * SEPT VOLUMES ÉCHELONNÉS. Ce n'est pas de la composition : une masse pleine se
 * colorie sans qu'on sache où en est la vague, sept jalons s'allument l'un après
 * l'autre et l'on compte les secondes. Deux volumes de même hauteur sont à dix
 * mètres l'un de l'autre — aucune face n'en recouvre une autre.
 */
const maquette = (): BoxDef[] => [
  b([MAQ_X - 4, 0, MAQ_Z0], [MAQ_X + 4, 0.3, MAQ_Z1 - 1], 1, { region: 'or' }),
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
    const z = MAQ_Z0 + 2 + i * 3.2;
    const x = MAQ_X + (i % 2 === 0 ? -1 : 1) * (1.2 + (i % 3) * 0.5);
    return b([x - 0.8, 0.3, z], [x + 0.8, 1.5 + (i % 4) * 0.45, z + 1.6], 2 + (i % 2),
      { region: 'or' });
  }),
];
const DECOR: BoxDef[] = [
  ...DALLE,
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(borne),
  // STATION 1 — la planche des cinq creux. Soixante centimètres, un genou :
  // l'étalon qu'on a dans le corps et qu'on n'a pas à calculer.
  b([X(1) - 1.5, 0, -12.5], [X(1) + 1.5, PLANCHE_Y, 12.5], 1),
  // STATION 2 — le socle du creux de la vrille retournée. Un mètre : à ×4 il
  // arrive à la cheville, et l'on voit que c'est soi qui a changé.
  b([X(2) - 1.8, 0, -1.8], [X(2) + 1.8, 1.0, 1.8], 1),
  // STATION 3 — LE VERRE. `invisible` : il arrête le corps ET la main sans se
  // dessiner, donc exempté de la vérification des faces confondues. Dix mètres.
  b([X(3) - 0.1, 0, -5], [X(3) + 0.1, 3, 5], 0, { invisible: true }),
  // STATION 4 — le muret et les deux dalles d'essai. 1,20 m : la caméra est à
  // 1,656 m et voit par-dessus, le bras part de 1,08 m et n'a rien à faire là.
  b([MURET_X, 0, -0.8], [MURET_X + 0.2, 1.2, 0.8], 2),
  marque(X(4) - 0.5, X(4) + 0.5, -0.5, 0.5),
  marque(X(4) - 0.5, X(4) + 0.5, 1.1, 2.1, 2),
  // STATION 5 — LA LANGUE, et RIEN dessous jusqu'au bas du monde.
  b([X(5) - 1.5, -0.3, LANGUE_Z0], [X(5) + 1.5, 0, LANGUE_Z0 + 10], 1),
  // STATION 6 — la zone muette, et quatre bornes pour la voir de loin.
  marque(X(6) - 8, X(6) + 8, -8, 8, 1),
  b([X(6) - 8, 0, -8], [X(6) - 7.6, 1.6, -7.6], 2, { region: 'silence' }),
  b([X(6) + 7.6, 0, -8], [X(6) + 8, 1.7, -7.6], 2, { region: 'silence' }),
  b([X(6) - 8, 0, 7.6], [X(6) - 7.6, 1.8, 8], 2, { region: 'silence' }),
  b([X(6) + 7.6, 0, 7.6], [X(6) + 8, 1.9, 8], 2, { region: 'silence' }),
  // STATIONS 7 et 8 — les deux portes. Elles doivent se ressembler.
  ...porte(X(7), 1.5, 0),
  ...porte(X(8), 1.95, 0.06),
  // STATION 10 — les couloirs d'élan. Vingt mètres : la vitesse de marche
  // s'atteint en 0,6 s, bien avant le bord.
  marque(T10 - 20, T10, -13, -3, 1),
  marque(T10 - 20, T10, 3, 13, 1),
  // STATION 11 — le mur que le Pinceau ne doit pas traverser. Quatorze mètres
  // de haut, plus que l'arc de son vol, sinon il passerait par-dessus.
  b([X(11) - 0.3, 0, -16], [X(11) + 0.3, 14, 16], 2),
  ...maquette(),
];
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATION 1 — LA TABLE DES PIÈCES ET DES CREUX
 *
 * `Sockets.raisonDuRefus` n'annonce QU'UNE chose à la fois, dans cet ordre : la
 * taille (dédoublée en trop-grand / trop-petit), la forme, la teinte, la main.
 * Cinq raisons, donc cinq phrases, et il faut que chaque creux en produise une
 * AUTRE. D'où la contrainte qui gouverne tout : pour entendre « forme » il faut
 * présenter une pièce de la BONNE TAILLE, sinon la taille parle en premier — donc
 * une pièce par creux non dimensionnel, chacune sous 0,99 m, la charge d'un
 * joueur à taille d'homme.
 *
 *   pièce  \  creux           0,18   0,52   0,30   0,80   2,40
 *                            TAILLE FORME  TEINTE  MAIN   TOUT
 *   galet   0,52 · encre 1     TG     f      ·      ·      TP
 *   perle   0,30 · encre 1     ·      ·      t      ·      ·
 *   vrille  0,80 · encre 2 L   ·      ·      ·      m      ·
 *
 *   TG trop-grand · TP trop-petit · f forme · t teinte · m main · « · » hors
 *   de portée du creux : la taille n'est même pas du même ordre
 *
 * AUCUNE CASE N'EST UN OUI, et c'est ce qui rend la station rejouable à l'infini :
 * le galet n'a pas de forme, la perle est encre 1 quand on demande 3, la vrille
 * est gauche quand on veut droite. LES CINQ TAILLES SONT ÉTRANGÈRES LES UNES AUX
 * AUTRES : une porte multiplie par quatre et la tolérance vaut 12 %, or le rapport
 * le plus serré, 0,80 / 0,52 = 1,54, en fait presque quatre — aucun nombre de
 * traversées ne fait changer une pièce de classe, seule preuve qui survive à qui
 * ajouterait une porte demain. Enfin `portee` VAUT 1,2 M QUAND LES CREUX SONT À
 * CINQ MÈTRES : on repose le galet à un mètre devant soi, donc sa portée l'attrape
 * et sa voisine est trop loin pour dire un mot — vérifié en neuf points autour.
 */
const creux = (id: string, i: number, size: number, exige: Partial<SocketDef>): SocketDef =>
  ({ id, position: [X(1), PLANCHE_Y, CREUX_Z[i]], size, portee: 1.2, ink: 2, rend: true, ...exige });
const SOCKETS: SocketDef[] = [
  creux('banc-taille', 0, 0.18, {}),
  creux('banc-forme', 1, 0.52, { forme: 'vrille' }),
  creux('banc-teinte', 2, 0.3, { teinte: 3 }),
  creux('banc-main', 3, 0.8, { main: 'D' }),
  creux('banc-tout', 4, 2.4, { forme: 'vrille', main: 'D', teinte: 3, portee: 2.4 }),
  /**
   * STATION 2 — le seul creux du banc qui dise oui, et seulement à la vrille
   * RETOURNÉE : 1,60 = 0,40 × 4, le miroir corrigeant main et taille du même
   * geste. `portee` vaut 7 parce que celui qui le garnit mesure 7,20 m et
   * repose ce qu'il porte à 4,56 m devant lui — viser un trou de 1,60 à quatre
   * mètres et demi au doigt est une épreuve d'adresse, et ce nombre a déjà rendu
   * une salle infaisable sans que rien ne le laisse voir.
   */
  { id: 'banc-miroir', position: [X(2), 1.0, 0], size: 1.6, forme: 'vrille', main: 'D',
    portee: 7, ink: 2, rend: true },
];
/**
 * LA VRILLE — le tétracube « vis », plus petite forme chirale faite de cubes
 * collés : aucune rotation ne superpose la droite à la gauche. Les cellules se
 * CHEVAUCHENT d'un centimètre, sinon deux faces confondues scintilleraient.
 */
const E = 0.01;
const vrille = (ink: number) =>
  [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]].map(([i, j, k]) => ({
    min: [-0.5 + 0.5 * i - E, -0.5 + 0.5 * j - E, -0.5 + 0.5 * k - E] as V3,
    max: [0.5 * i + E, 0.5 * j + E, 0.5 * k + E] as V3,
    ink,
  }));

const CARRYABLES: CarryableDef[] = [
  // Station 1 : les trois pièces de la table, à trois mètres du bord des creux,
  // donc hors de toute portée tant qu'on ne les porte pas.
  { id: 'banc-galet', position: [X(1) - 4.5, 0.05, -7.5], size: 0.52, ink: 1 },
  { id: 'banc-perle', position: [X(1) - 4.5, 0.05, 0], size: 0.3, ink: 1 },
  { id: 'banc-vrille-gauche', position: [X(1) - 4.5, 0.05, 7.5], size: 0.8, ink: 2,
    forme: 'vrille', main: 'L', pieces: vrille(2) },
  // Station 2 : la vrille du miroir. 0,40 à l'aller, 1,60 au retour.
  { id: 'banc-vrille-miroir', position: [X(2) - 12, 0.05, -4], size: 0.4, ink: 3,
    forme: 'vrille', main: 'L', pieces: vrille(3) },
  // Stations 3, 4, 5 : des cubes sans forme et sans main, donc qu'aucun creux
  // exigeant ne peut accepter, à aucune taille.
  { id: 'banc-derriere-verre', position: [X(3) + 1.4, 0.05, 0], size: 0.38, ink: 3 },
  { id: 'banc-derriere-muret', position: [X(4) + 2.0, 0.05, 0], size: 0.38, ink: 3 },
  { id: 'banc-en-poche', position: [X(5) - 1.2, 0.05, -3], size: 0.38, ink: 3 },
  // Station 9 : ce qu'on jette pour entendre le bruit qu'il fait, aux deux
  // tailles. Il vaut 2,64 de l'autre côté, et reste largement portable.
  { id: 'banc-sonnette', position: [X(9) - 10, 0.05, -6], size: 0.66, ink: 3 },
];
/**
 * LES TROIS PORTES, sans `condition` : on les franchit dans les deux sens et
 * tout geste se défait. Leurs six faces sont en six points distincts — deux
 * faces au même endroit se disputent le plan. ON ENTRE CONTRE LA NORMALE ET
 * L'ON RESSORT AVEC ELLE : le banc allant vers l'est, les entrées regardent
 * l'ouest (`−π/2`) et les sorties l'est (`+π/2`), donc jamais dos au chemin.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES DEUX SEULES COULEURS DE PORTE DU JEU, ET ELLES NE SE CHOISISSENT PAS.
 *
 * Vermillon pour la GRANDE face : la franchir rapetisse.
 * Indigo pour la PETITE : la franchir grandit.
 *
 * C'est une loi du monde, pas un habillage. Un joueur lit une porte avant de la
 * franchir en regardant sa couleur, et rien d'autre ne le lui dit.
 *
 * Le banc les avait remplacées par des gris, pour rester monochrome comme il
 * doit l'être. L'intention était bonne et la conséquence mauvaise : le banc
 * d'essai enseignait le contraire du jeu, ce qui est la dernière chose qu'un
 * banc doit faire. Signalé par un joueur qui a trouvé le cadre « mal mis » sans
 * pouvoir dire pourquoi — il lisait juste, et ce qu'il lisait était faux.
 *
 * Le reste du banc reste nu et gris. Les portes, elles, parlent la langue du
 * monde.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const VERMILLON = 0xc8492e;
const INDIGO = 0x2f4b7c;

const PORTALS: PortalPairDef[] = [
  // STATION 2 — LE MIROIR. On entre à l'est de la station, on ressort à
  // l'ouest, dans le même décor et quatre fois plus grand : rien d'autre n'a
  // bougé, donc c'est soi. Et la vrille a changé de main en chemin.
  { id: 'banc-miroir-porte', miroir: true, colorBig: VERMILLON, colorSmall: INDIGO,
    small: { position: [X(2) + 6, 0.05, -6], yaw: -EST },
    big: { position: [X(2) - 6, 0.05, 6], yaw: EST } },
  // STATION 9 — la paire ordinaire de l'épreuve du son. Douze mètres entre les
  // deux faces : on fait la navette autant qu'il faut pour comparer.
  { id: 'banc-son', colorBig: VERMILLON, colorSmall: INDIGO,
    small: { position: [X(9) + 6, 0.05, -6], yaw: -EST },
    big: { position: [X(9) - 6, 0.05, 6], yaw: EST } },
  // STATION 11 — la porte du mur, celle par où le Pinceau doit passer. Plantée
  // à 3,7 m de la maçonnerie : un corps de 0,34 m de rayon doit atteindre le
  // PLAN de la face, et il ne l'atteindrait pas si le mur commençait avant.
  { id: 'banc-guide-porte', colorBig: VERMILLON, colorSmall: INDIGO,
    small: { position: [X(11) - 4, 0.05, -5], yaw: -EST },
    big: { position: [X(11) + 4, 0.05, 5], yaw: EST } },
];
/**
 * STATION 12 — LE VEILLEUR. Son identifiant DOIT commencer par `pinceau-` : le
 * nom du pigment se lit dedans, ce qui le relie à la région `or` sans table de
 * correspondance — deux tables disant la même chose ont déjà coûté une nuit à
 * ce projet. `echelle: 0` est un PALIER : trop grand, il frémit et refuse.
 */
const VEILLEURS: VeilleurDef[] = [
  { id: 'pinceau-or', position: [X(12), 0.05, 0], radius: 3, echelle: 0 },
];
/**
 * LES JALONS — treize, et non douze : la station 11 en demande DEUX, un de
 * chaque côté du mur. Le Pinceau part du premier, entre dans la porte sous nos
 * yeux, disparaît, ressort de la face jumelle et rejoint le second ; sans ce
 * doublet il n'y aurait rien à voir. `guideEchelle` VAUT 1 PARTOUT, ET C'EST UN
 * MULTIPLICATEUR : y écrire 0, le palier de la taille normale, donnerait un
 * Pinceau de taille nulle, donc invisible. Le banc n'a qu'un étage.
 */
const JALONS: V3[] = [
  [X(1), 3, 4], [X(2), 3, 0], [X(3), 3, 0], [X(4), 3, 0], [X(5), 3, -2], [X(6), 3, 0],
  [X(7), 3, -3], [X(8), 3, -3], [X(9), 3, 0], [T10 - 3, 3, 0],
  [X(11) - 8, 3, -5], [X(11) + 8, 3, 5], [X(12), 3, 6],
];

export const BANC: LevelDef = {
  name: 'Le banc d’essai',
  // Quatorze mètres avant la station 1, face à l'est : les douze bornes
  // s'alignent, et l'on sait où l'on est.
  spawn: [-14, 0.05, 0],
  spawnYaw: EST,
  spawnScale: 0,
  // L'ordre compte : la première région contenant le joueur donne l'ambiance.
  regions: [SILENCE_REGION, OR_REGION, BANC_REGION],
  boxes: DECOR,
  carryables: CARRYABLES,
  sockets: SOCKETS,
  portals: PORTALS,
  veilleurs: VEILLEURS,
  // Le levier qui autorise tout le reste, loin de tout creux : une bulle mordant
  // sur une station rappellerait tout au lieu de reposer ce qu'on tient.
  rappel: { position: [-9, 0.2, -6], radius: 1.6 },
  guide: JALONS,
  guideEchelle: JALONS.map(() => 1),
  guidePorte: JALONS.map((_, i) => (i === 11 ? 'banc-guide-porte' : null)),
  // Hors du terrain, et de neuf cents mètres : un banc ne se gagne pas.
  goal: { position: [0, -900, 0], radius: 1 },
};
/**
 * LE PROTOCOLE — douze lignes qui disent LE GESTE puis LE RÉSULTAT, lisibles au
 * téléphone par quelqu'un qui ne code pas. Chacune nomme aussi le MAUVAIS
 * signe : une consigne qui n'annonce que le bon résultat laisse valider un
 * défaut par indulgence. Toutes regardent l'est, sauf la cinquième.
 */
// `jalon` : un par station, sauf la douzième qui prend le treizième — le
// douzième est de l'autre côté du mur de la station 11.
const rep = (n: number, titre: string, verifier: string, position: V3, lacet = EST): Repere =>
  // LE NUMÉRO N'EST PAS DANS LE TITRE : le panneau affiche déjà la touche du
  // clavier juste devant, et l'on lisait « 11 · Le refus qui parle ». Le rang
  // sert encore à ranger les stations et à leur coller leur raison, mais il ne
  // se dit qu'une fois.
  ({ titre, verifier, position, echelle: 0, lacet, pigments: [],
    jalon: n === 12 ? 12 : n - 1 });

/**
 * POURQUOI CHAQUE STATION EXISTE.
 *
 * Une station qui dit seulement « fais ceci, tu dois voir cela » est une
 * consigne à exécuter. Quelqu'un qui sait CE QU'ON CHERCHE remarque des choses
 * qu'on ne lui a pas demandées — et sur ce banc, ce sont les seules qui vaillent
 * le déplacement : tout le reste est déjà prouvé quatre cent soixante-dix fois.
 *
 * Chacune de ces raisons est un défaut réel, avec le symptôme qu'il donnait.
 * Aucune n'est inventée.
 */
const POURQUOI_BANC: Record<number, string> = {
  1:
    'Un creux rendait un simple oui ou non. On présentait une pièce, elle était refusée, et ' +
    'on n’apprenait rien : la taille ? la forme ? la couleur ? le sens ? Quatre inconnues ' +
    'font seize combinaisons, donc on essayait au hasard. Trois lecteurs extérieurs ont buté ' +
    'là-dessus sans se concerter.',
  2:
    'Les portes miroirs existaient depuis des semaines sans se VOIR : on dessinait tout avec ' +
    'des cubes, et un cube n’a pas de main gauche. C’est la première fois qu’on peut regarder ' +
    'une pièce se retourner.',
  3:
    'Une boîte pouvait se voir sans rien retenir ; l’inverse n’existait pas. Ça débloque un ' +
    'pont dont les dalles sont espacées de quatorze mètres — un chemin pour un géant, quatre ' +
    'gratte-ciel séparés par le vide dès qu’on rapetisse dessus.',
  4:
    'On ramassait à travers les murs. La prise ne mesurait qu’une distance et un angle, et ' +
    'comme le bras suit la taille — 46 m à ×16 — on cueillait ce qui était dans la pièce ' +
    'voisine. Deux salles s’en protègent encore avec de la roche qui n’existe que pour ça.',
  5:
    'Rien ne rattrapait une chute hors du décor : on tombait indéfiniment, mesuré à moins deux ' +
    'cent mille. « On ne piège jamais le joueur » était tenu salle par salle, à la main, par ' +
    'des rampes écrites une par une — et le cas le plus simple n’était pas couvert.',
  6:
    'Le coin supérieur gauche annonce ta taille en toutes lettres. La salle-thèse du troisième ' +
    'voyage repose sur le fait que tu ne la connaisses plus — elle était donc impossible, et ' +
    'rien ne l’aurait signalé avant qu’on la livre.',
  7:
    'On franchissait n’importe quel mur en le longeant, du moment qu’il portait un linteau. Le ' +
    'corps passait de 0 à 1,70 en une image puis marchait par-dessus. Six tentatives ont été ' +
    'nécessaires, et la phrase qui a fini par résoudre était déjà dans mes notes de la ' +
    'troisième, appliquée au mauvais endroit.',
  8:
    'L’autre moitié du même défaut : un seuil de six centimètres FERMAIT un passage, parce ' +
    'qu’on sondait la marche à quatre-vingt-dix et que la tête entrait dans le linteau. Ça a ' +
    'fermé les trois ouvertures d’une toise, avec des arrêts mesurés à neuf centimètres de ' +
    'l’ouverture.',
  9:
    'Tu m’as dit que le son suivait déjà la taille et tu avais raison — je me trompais. Mais ' +
    'la mesure a trouvé autre chose : les DURÉES suivaient aussi, et un géant posait ses ' +
    'caisses dans un silence complet, la note tombant sous le seuil de l’audible.',
  10:
    'Le sprint multipliait la portée par 1,8 en l’air, quand un cran de taille ne la multiplie ' +
    'que par deux : un joueur à ×1/4 qui sprintait récupérait 90 % de la portée d’un joueur ' +
    'normal qui marche. Toute énigme fondée sur la taille tenait dans dix points d’écart.',
  11:
    'Le guide vole et ne connaît pas les murs. Sans qu’on lui dise par où passer, il traverse ' +
    'la pierre en droite ligne — et l’on ne lit plus « suis-moi » mais « il s’est téléporté ». ' +
    'C’est arrivé dans le village, avec cinq cents mètres de vide.',
  12:
    'Le front d’encre est une sphère centrée sur le pinceau. Quand la chose à peindre est ' +
    'loin, il passait tout son temps à balayer le vide entre les deux puis rattrapait d’un ' +
    'coup : mesuré, une salle basculait en 0,14 seconde. On ne regardait pas la couleur se ' +
    'poser, on la découvrait posée.',
};

export const REPERES_BANC: Repere[] = [
  rep(1, 'Le refus qui parle',
    'Cinq creux en enfilade. Porte le GALET devant le premier et pose-le ; recommence devant le ' +
    'deuxième, puis devant le dernier. Puis la PERLE devant le troisième, la VRILLE devant le ' +
    'quatrième. → Une demi-seconde après chaque dépose, UNE phrase, et cinq phrases différentes en ' +
    'tout : elle déborde · ce n’est pas ce dessin · la forme est juste, la couleur non · elle est ' +
    'juste en tout et n’entre pas · elle danse dans le creux. Mauvais signe : deux phrases d’un coup, ' +
    'la phrase du creux voisin, aucune phrase, ou une pièce qui reste plantée dedans.',
    [X(1) - 8, 0.05, 0]),
  rep(2, 'La main se voit',
    'Ramasse la petite vrille, marche vers l’est, franchis la porte bleue. → Tu ressors quatre fois ' +
    'plus grand À L’AUTRE BOUT de la station, et la vrille est son propre reflet : le bras qui ' +
    'montait à droite monte à gauche. Reviens au socle et pose-la : elle entre. Mauvais signe : elle ' +
    'a la bonne taille et refuse quand même, ou elle a exactement la même allure qu’avant — la ' +
    'chiralité est écrite et vérifiée depuis des semaines, mais elle n’a jamais été REGARDÉE.',
    [X(2) - 14, 0.05, -4]),
  rep(3, 'Le verre',
    'Avance droit vers l’est. → Tu es arrêté par RIEN : pas de mur, pas de trait, rien à l’écran. Le ' +
    'cube est à deux pas derrière, tu le vois, et E ne le prend pas. Contourne (la paroi fait dix ' +
    'mètres), reviens vers lui par l’est : E le prend. Mauvais signe : l’attraper à travers, ou ne ' +
    'plus pouvoir le prendre une fois contourné.',
    [X(3) - 4, 0.05, 0]),
  rep(4, 'On ne ramasse plus à travers les murs',
    'Tu es sur la première dalle peinte. Le cube est à deux mètres, derrière un muret qui t’arrive à ' +
    'la poitrine — tu le VOIS par-dessus. Appuie sur E. → Rien. Va sur la seconde dalle peinte, un ' +
    'pas et demi sur ta gauche, regarde le cube : E le prend. Mauvais signe : le prendre depuis la ' +
    'première. Le bras porte 2,88 m et le cube est à 2,19 — c’est le muret, jamais la distance.',
    [X(4), 0.05, 0]),
  rep(5, 'Le rattrapage',
    'Prends le cube, avance sur la langue de dalle et saute dans le vide. → Tu tombes trois secondes, ' +
    'puis le monde te repose LÀ OÙ TU TE TENAIS, le cube toujours dans les mains, et une phrase le ' +
    'dit sans gronder. Mauvais signe : tomber sans fin, renaître au départ du banc, lâcher le cube, ' +
    'ou revenir à une autre taille.',
    [X(5), 0.05, LANGUE_Z0 - 8], 0),
  rep(6, 'L’échelle se tait',
    'Regarde le coin en haut à gauche : « ×1 · taille normale ». Marche vers l’est et entre dans le ' +
    'rectangle peint au sol. → L’affichage devient UN TIRET, net, sans fondu. Ressors : il revient. ' +
    'Mauvais signe : un fondu (on croirait à une panne), un silence qui tombe avant ou après le trait ' +
    'peint, ou un affichage qui reste muet une fois sorti.',
    [X(6) - 14, 0.05, 0]),
  rep(7, 'Le linteau ne catapulte plus',
    'Le linteau est à 1,50 m et tu en fais 1,80. Marche dedans, colle-toi, insiste, saute sur place, ' +
    'longe le mur en le poussant, entre dans l’ouverture par le côté en sautant. → Tu es ARRÊTÉ, ' +
    'chaque fois, et tu restes au sol. Mauvais signe, et c’est LE défaut qui a résisté à six ' +
    'tentatives : te retrouver debout SUR le linteau, ou de l’autre côté du mur.',
    [X(7) - 6, 0.05, 0]),
  rep(8, 'Le seuil bas se franchit',
    'La même porte à deux détails près : un seuil de six centimètres, un linteau à 1,95 m. Marche ' +
    'dedans. → Tu passes SANS T’EN APERCEVOIR — sans ralentir, sans sauter, sans être soulevé. ' +
    'Mauvais signe : buter sur le seuil, ou être relevé d’un coup sec. Fais l’aller-retour avec la ' +
    'station 7 : c’est leur contraste qui est l’épreuve, pas chacune prise à part.',
    [X(8) - 6, 0.05, 0]),
  rep(9, 'Le son suit la taille',
    'Écoute trois choses : tes pas, le vent, et le cube quand tu le jettes (clic gauche). Franchis la ' +
    'porte vers l’est — tu deviens géant — et refais les trois. → TOUT est plus grave, et le vent a ' +
    'GLISSÉ jusque-là au lieu de sauter. Reviens par l’autre face : tout redevient aigu. Mauvais ' +
    'signe : une seule des trois voix qui change, ou un vent qui vire au sifflement.',
    [X(9) - 12, 0.05, -6]),
  rep(10, 'Le sprint ne vole pas',
    'Deux vides identiques de 4,20 m, côte à côte, et la bande du milieu passe entre les deux — on ' +
    'n’est jamais coincé. Premier vide : tout ton élan sur le couloir peint, saute au bord. → Tu ' +
    'passes, avec de la marge. Second vide : plante-toi au bord À L’ARRÊT, puis saute en avançant, ' +
    'sans toucher à Maj. → Tu tombes cinquante centimètres trop court, et le monde te repose au ' +
    'bord. Mauvais signe : passer les deux, ou rater celui d’élan — l’élan ne dirait plus rien.',
    [T10 - 18, 0.05, -8]),
  rep(11, 'Le guide passe par la porte',
    'Le Pinceau flotte devant toi, de ce côté-ci du mur. Avance vers lui. → Il s’envole À PLAT vers ' +
    'la porte, ENTRE dedans, disparaît, et ressort de la face jumelle de l’autre côté avant de ' +
    'rejoindre son perchoir. Mauvais signe : le voir traverser le mur, le survoler, ou s’éteindre ' +
    'ici pour se rallumer là-bas sans qu’on ait vu par où — on lirait « il s’est téléporté » au lieu ' +
    'de « suis-moi ». Regarde aussi sa TAILLE : elle ne doit ni changer ni être nulle.',
    [X(11) - 20, 0.05, -5]),
  rep(12, 'La couleur se pose, et lentement',
    'Un pinceau dort à trois pas, à l’est. Approche et appuie sur E — à taille normale, pas autrement ' +
    '(reviens géant pour l’entendre refuser). Puis TOURNE-TOI vers le nord : la maquette part à ' +
    'vingt-six mètres et file sur vingt-trois. → Un demi-temps où rien ne bouge, puis l’encre remonte ' +
    'la bande volume par volume, les proches d’abord, en ralentissant. Compte : UNE BONNE SECONDE ET ' +
    'DEMIE doit séparer le premier volume coloré du dernier. Mauvais signe, et c’est le défaut qui a ' +
    'failli tout annuler : un silence, puis les sept d’un seul coup.',
    [X(12) - 6, 0.05, 0]),
];

// Et l'on colle chaque raison à sa station, PAR RANG et non par titre : un
// titre se renomme, un rang non. La table des raisons de la montée est indexée
// par titre et il a fallu lui ajouter un compte des clefs orphelines, parce
// qu'une raison qui vise une station disparue s'évapore en silence.
REPERES_BANC.forEach((r, i) => {
  const p = POURQUOI_BANC[i + 1];
  if (p) r.pourquoi = p;
});
