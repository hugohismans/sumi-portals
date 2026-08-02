import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LES TOITS — *ne rien demander, et rappeler.*
 *
 * Première salle du mouvement II. On y ressort à ×4, sept mètres vingt, sur les
 * toits du village où l'on a passé les trois premières heures du jeu. Il n'y a
 * rien à résoudre, rien à porter, rien à loger. Toute la salle tient dans une
 * seule sensation : **je connais cet endroit, et il ne me connaît plus.**
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE VILLAGE-CI EST L'AUTRE, ET C'EST LITTÉRAL
 *
 * Le générateur, la graine (20260801) et les vingt emplacements sont recopiés de
 * `src/levels/level01.ts` : les vingt maisons sortent aux mêmes places, avec les
 * mêmes largeurs et les mêmes faîtes, à la quatrième décimale. La cour creusée
 * est à l'est, sa margelle rouge en retrait de six centimètres, la place est vide
 * au milieu, le torii est planté au nord.
 *
 * On recopie plutôt qu'on n'importe — une salle ne dépend d'aucun autre fichier,
 * c'est son contrat — et la copie est ici la preuve : si quelqu'un retouche « la
 * cour », les deux villages divergeront, et mieux vaut que ça se voie dans un
 * diff que dans la tête du joueur.
 *
 * L'ORDRE DES QUATRE TIRAGES EST PORTANT : largeur, profondeur, hauteur, encre.
 * Les intervertir donne un autre village, tout aussi plausible et complètement
 * étranger. C'est la seule ligne de ce fichier qu'on ne peut pas relire à l'œil.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA MAISON BASSE, et pourquoi elle vaut la salle entière.
 *
 * Son toit culmine à **3,40**. À taille d'homme — 1,80, enjambée 0,90, saut 1,29
 * — elle était hors d'atteinte, et le joueur s'en souvient parce qu'il a tourné
 * autour. À ×4 c'est **une marche de 3,40 sous une enjambée de 3,60** : on monte
 * dessus sans y penser, sans sauter, sans même ralentir. Et c'est en y étant
 * qu'on comprend.
 *
 * Elle occupe l'emprise exacte de la tour de l'objectif de « la cour » — quatorze
 * mètres sur quatorze, au sud-ouest — et **la porte de sortie est plantée au
 * centre de son toit, à l'endroit précis où était le but du tout premier
 * niveau.** Le joueur a fini sa première partie debout là.
 *
 * Deux écarts assumés : la tour culminait à 3,30, le texte de conception dit 3,40
 * et c'est lui qui fait foi ; et elle prend la silhouette des vingt autres (débord
 * de 0,50 au lieu de 0,80), parce qu'une maison doit ressembler aux maisons. Son
 * toit reste ROUGE comme l'était celui de la tour : depuis le toit d'arrivée, à
 * soixante mètres de là, c'est la seule tache de couleur du village — et c'est la
 * sortie. Personne n'a eu à le décider, « la cour » l'avait déjà peinte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE VIDE, ET POURQUOI IL N'Y A PAS UNE SEULE BALUSTRADE
 *
 * On est sur des toits, entre quatre et seize mètres au-dessus de la rue, et un
 * village n'a pas de garde-corps. La salle n'est pourtant pas un piège, et ce
 * n'est pas une opinion : c'est CHRONOMÉTRÉ au banc, à ×4, jusqu'au toit rouge.
 *
 *   sous le toit d'arrivée, d'où l'on tombera neuf fois sur dix   2,5 s  (1,5 en sprint)
 *   sous la maison la plus éloignée du village                    4,6 s  (2,5)
 *   au coin extrême du plateau, où l'on n'a rien à faire          9,1 s  (5,0)
 *
 * Et la dernière marche est UNE MARCHE : 3,40 sous une enjambée de 3,60, jamais
 * un saut. Tomber n'est donc pas une punition mais un autre chemin vers la
 * porte — la salle voulait qu'on monte sur cette maison-là.
 *
 * POUR REMONTER SUR LES TOITS, l'escalier d'appentis : quatre marches de 2,90
 * depuis le toit rouge, dix-neuf pour cent sous l'enjambée. On regagne le faîte
 * du village sans sauter une seule fois.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const NOM = 'toits';

/** Le coin de monde réservé. Le village d'origine tient dans ±52,5 : large. */
const X0 = -200;
const Z0 = 1700;

/**
 * Une boîte, EN COORDONNÉES DU VILLAGE — celles de `level01.ts`, translatées
 * d'un bloc au moment de la construction. Tous les nombres de ce fichier sont
 * donc lisibles à côté de l'original, ce qui est la seule façon de vérifier
 * qu'on n'a rien réinventé.
 */
const b = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { outline?: boolean } = {},
): BoxDef => ({
  min: [X0 + min[0], min[1], Z0 + min[2]],
  max: [X0 + max[0], max[1], Z0 + max[2]],
  ink,
  region: NOM,
  ...opts,
});

/** Un point du village, en coordonnées du monde. */
const p = (x: number, y: number, z: number): [number, number, number] => [X0 + x, y, Z0 + z];

/**
 * UN CORPS QUI S'ENFONCE, UN TOIT QUI DÉBORDE ET QUI MORD.
 *
 * Le corps descend à −0,50 sous la rue et le toit redescend de 0,12 sur les
 * façades : deux faces exactement coplanaires se disputeraient la profondeur et
 * clignoteraient. C'est le geste de « la cour », repris tel quel — et c'est la
 * raison pour laquelle ces vingt maisons-ci passent la vérification sans qu'on
 * ait eu à y toucher.
 */
const maison = (
  cx: number,
  cz: number,
  demiX: number,
  demiZ: number,
  faite: number,
  ink: number,
  inkToit = 2,
): BoxDef[] => [
  b([cx - demiX, -0.5, cz - demiZ], [cx + demiX, faite - 0.45, cz + demiZ], ink),
  b(
    [cx - demiX - 0.5, faite - 0.57, cz - demiZ - 0.5],
    [cx + demiX + 0.5, faite, cz + demiZ + 0.5],
    inkToit,
  ),
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
  [-24, 16], [-38, 4], [-34, 26], [-16, 30], [0, 32], [16, 28],
  [30, 20], [40, 4], [34, -14], [40, -30], [22, -26], [4, -40],
  [-10, -42], [-26, -34], [-40, -18], [-44, 30], [18, 44], [-6, 46],
  [46, 34], [-46, -40],
];

interface Toit {
  cx: number;
  cz: number;
  demiX: number;
  demiZ: number;
  faite: number;
  ink: number;
}

/**
 * Les vingt maisons-témoins. Faîtes mesurés : de **4,21 à 16,09**.
 *
 * C'est l'échelle qui fait tout le tableau. Le joueur mesure 7,20 : la moitié des
 * toits lui arrivent sous le genou, l'autre moitié le dépasse encore de deux
 * hauteurs. Le village n'est donc PAS une maquette — il n'est pas devenu petit,
 * il est devenu praticable, et c'est toute la nuance que la salle doit faire
 * passer sans un mot.
 */
const village = (): Toit[] => {
  const rng = makeRng(20260801);
  return SPOTS.map(([cx, cz]) => ({
    cx, cz,
    demiX: 2.5 + rng() * 3.5,
    demiZ: 2.5 + rng() * 3.5,
    faite: 3 + rng() * 13 + 0.45,
    ink: 1 + ((rng() * 2) | 0),
  }));
};

const MAISONS = village();
/** (30, 20), faîte **16,0858** : le plus haut toit du village. On y naît. */
const HAUTE = MAISONS[6];

/** Demi-largeur du plateau. Le village tient dans 52,5 ; le reste est la plaine. */
const LOIN = 100;
// La cour creusée de « la cour », aux mêmes cotes. Elle piégeait un joueur de
// 1,80 pour de bon ; à ×4, trois mètres de fond passent sous l'enjambée de 3,60
// et l'on entre et ressort sans s'en apercevoir. C'est le rappel le plus muet de
// la salle : le seul vrai piège du premier niveau est devenu une flaque.
const COUR = { x0: 10, x1: 22, z0: -6, z1: 6, fond: -3.0 };
const MARGELLE_H = 0.3;
const MARGELLE_L = 1.0;
/** Retrait de la margelle sur l'arête du trou : six centimètres, contre le grésillement. */
const RETRAIT = 0.06;

const plateau = (): BoxDef[] => [
  // Le sol, en quatre dalles pour ménager le trou. `outline: false` : sans ça,
  // chaque couture serait tracée à l'encre en plein terrain.
  b([-LOIN, -8, -LOIN], [COUR.x0, 0, LOIN], 0, { outline: false }),
  b([COUR.x1, -8, -LOIN], [LOIN, 0, LOIN], 0, { outline: false }),
  b([COUR.x0, -8, -LOIN], [COUR.x1, 0, COUR.z0], 0, { outline: false }),
  b([COUR.x0, -8, COUR.z1], [COUR.x1, 0, LOIN], 0, { outline: false }),
  // Le fond de la cour garde son contour : c'est lui qui la dessine en creux.
  b([COUR.x0, -8, COUR.z0], [COUR.x1, COUR.fond, COUR.z1], 2),
  // LA MARGELLE, quatre barres rouges. Elle annonçait le trou de loin et retenait
  // le joueur minuscule ; à ×4 elle arrive à la cheville. Elle est en retrait de
  // 6 cm de l'arête, faute de quoi ses faces tombent dans le plan des dalles.
  b([COUR.x0 - RETRAIT - MARGELLE_L, -0.3, COUR.z0 - RETRAIT - MARGELLE_L],
    [COUR.x0 - RETRAIT, MARGELLE_H, COUR.z1 + RETRAIT + MARGELLE_L], 3),
  b([COUR.x1 + RETRAIT, -0.3, COUR.z0 - RETRAIT - MARGELLE_L],
    [COUR.x1 + RETRAIT + MARGELLE_L, MARGELLE_H, COUR.z1 + RETRAIT + MARGELLE_L], 3),
  b([COUR.x0 - RETRAIT, -0.3, COUR.z0 - RETRAIT - MARGELLE_L],
    [COUR.x1 + RETRAIT, MARGELLE_H, COUR.z0 - RETRAIT], 3),
  b([COUR.x0 - RETRAIT, -0.3, COUR.z1 + RETRAIT],
    [COUR.x1 + RETRAIT, MARGELLE_H, COUR.z1 + RETRAIT + MARGELLE_L], 3),
];

/**
 * LE GRAND TORII, au nord de la place, à l'aplomb exact de la face vermillon de
 * « la cour » — [0, 0, 20], regardant le sud.
 *
 * Ici ce n'est plus une porte, c'est un monument : la paire est restée là-bas.
 * Et il est **le seul étalon dont la salle ait besoin qui soit plus grand que le
 * joueur** — treize mètres quarante contre sept vingt. On passe dessous en
 * géant, et le village a encore quelque chose qui nous dépasse. Sans lui, tout
 * ce qu'on voit serait plus bas que soi et la salle basculerait dans la maquette.
 */
const torii = (): BoxDef[] => [
  b([-4.4, -0.5, 19.6], [-3.6, 12.9, 20.4], 3),
  b([3.6, -0.5, 19.6], [4.4, 12.9, 20.4], 3),
  // Le linteau MORD sur les montants : posé pile dessus, leurs faces se
  // confondraient sur presque un mètre carré, à l'endroit qu'on regarde le plus.
  b([-6.6, 12.6, 19.4], [6.6, 13.4, 20.6], 3),
  b([-5.2, 9.4, 19.7], [5.2, 10.0, 20.3], 3),
];

/**
 * L'ESCALIER D'APPENTIS — quatre remises adossées, dans la ruelle qui monte de
 * la maison basse vers l'ouest du village.
 *
 * À 1,80, c'étaient quatre toits à 6,30, 9,20, 12,10 et 15,00 : quatre choses
 * inatteignables, et personne n'a jamais pensé à les compter. À ×4, **c'est un
 * escalier** — quatre marches de 2,90 sous une enjambée de 3,60, dix-neuf pour
 * cent de marge. Cette salle n'invente rien : elle relit.
 *
 * Les blocs sont JOINTIFS en z et non superposés : deux faces opposées au même
 * plan ne se disputent rien, là où un chevauchement d'un demi-mètre grésillerait.
 * Le dernier déborde sur le toit de la maison (−24, 16) — faîte 14,74, dont on
 * redescend de 26 cm — pour qu'il n'y ait aucun trou à la jonction. Le seul vide
 * restant, 70 cm entre le toit rouge et le premier appentis, est plus étroit que
 * le corps du joueur (2,72) : sa boîte porte sur les deux bords. Mesuré, et non
 * espéré — au banc, un joueur monte les cinq niveaux sans toucher la touche de
 * saut une seule fois.
 */
const APPENTIS: [number, number, number][] = [
  [-1.0, 2.2, 6.3],
  [2.2, 5.4, 9.2],
  [5.4, 8.6, 12.1],
  [8.6, 11.4, 15.0],
];

const ruelle = (): BoxDef[] =>
  APPENTIS.flatMap(([z0, z1, faite]) =>
    maison(-22, (z0 + z1) / 2, 4, (z1 - z0) / 2, faite, 1),
  );

/**
 * UNE PORTE D'HOMME, plaquée sur une façade. 1,10 de large, 2,05 de haut.
 *
 * C'est la règle 9 : le joueur ne doit jamais estimer à l'œil ce qu'il ne peut
 * pas comparer. Un village vu d'en haut n'a aucune échelle — des blocs gris de
 * toutes les tailles — et sans un objet dont la mesure soit connue par cœur, la
 * salle ne dit rien. Une porte d'homme arrive au genou : plus rien à expliquer.
 * Il y en a deux, une à chaque bout du voyage — au pied de la maison où l'on
 * naît, au pied de celle par où l'on s'en va.
 */
const porteDHomme = (x: number, zFace: number): BoxDef =>
  b([x - 0.55, -0.1, zFace - 0.09], [x + 0.55, 2.05, zFace + 0.02], 3);

export const TOITS: SalleModule = {
  nom: NOM,

  /**
   * LA PALETTE, ET CE QU'ELLE DIT DE L'HEURE DU VOYAGE.
   *
   * Le rouge, le vert et le bleu sont rentrés ; **l'or, non** — c'est ce que le
   * mouvement II part chercher, et il ne reviendra qu'à « la miette », six salles
   * plus loin. La région déclare donc `pigment: 'or'` : sa masse naît en lavis
   * gris, tuiles, murs et plateau compris, et ne se repeindra qu'au retour.
   *
   * Mais `pigmentAccent: 'rouge'` : le quatrième aplat — le torii, la margelle de
   * la cour, le toit de la maison basse, les deux portes d'homme — est DÉJÀ en
   * couleur, puisqu'on a rapporté le rouge il y a longtemps. Un village gris avec
   * trois taches vermillon dedans, et les trois sont exactement ce que le joueur
   * a déjà rendu au monde. On lit d'un coup d'œil où l'on en est, sans jauge.
   */
  region: {
    name: NOM,
    min: [-300, -40, 1600],
    max: [-100, 120, 1800],
    // Un papier haut et froid : on est au-dessus des toits, dans le ciel.
    paper: '#e8ebec',
    // Plâtre, tuile sèche, tuile mouillée — et le vermillon EXACT du torii de
    // « la cour » (0xc8492e). Reprendre la teinte au chiffre près coûte zéro et
    // vaut plus que n'importe quelle description : c'est le même objet.
    colors: ['#e0e4e6', '#bcc4c6', '#7d888c', '#c8492e'],
    ink: '#191d1f',
    pigment: 'or',
    pigmentAccent: 'rouge',
    // 190, et c'est un compromis assumé. Du toit d'arrivée, le bout opposé du
    // village est à 115 m : à 190 il est pâle mais lisible, ce qui est la seule
    // chose que cette salle ait à montrer. Rapprocher le brouillard effacerait
    // la moitié du village ; l'éloigner durcirait la lisière du plateau, à cent
    // mètres du centre, qu'on préfère laisser se dissoudre dans le papier.
    brouillard: 190,
  },

  bounds: { min: [-300, -40, 1600], max: [-100, 120, 1800] },

  boxes: [
    ...plateau(),
    ...MAISONS.flatMap((m) => maison(m.cx, m.cz, m.demiX, m.demiZ, m.faite, m.ink)),
    // LA MAISON BASSE. Emprise de la tour de l'objectif, faîte à 3,40, toit
    // rouge : voir l'en-tête. C'est la seule marche du village, et c'est la porte.
    ...maison(-18, -10, 7, 7, 3.4, 2, 3),
    ...torii(),
    ...ruelle(),
    porteDHomme(-18, -3),
    porteDHomme(HAUTE.cx, HAUTE.cz - HAUTE.demiZ),
  ],

  /**
   * Le Pinceau vole, lui. Il file du toit d'arrivée, plonge dans la vieille cour
   * — celle dont on ne remontait pas —, remonte croiser le torii au-dessus de la
   * place vide, effleure l'escalier d'appentis et se pose sur le toit rouge.
   * Cinq stations, cinq souvenirs, et pas un mot.
   */
  stations: [
    p(HAUTE.cx, HAUTE.faite + 4.5, HAUTE.cz),
    p(16, 5, 0),
    p(0, 15, 16),
    p(-22, 18, 5),
    p(-18, 6, -10),
  ],

  /**
   * LE RACCORD. Palier 1 aux deux bouts : ×4, un joueur de 7,20 m. `echelle` est
   * un PALIER — −1 = ×1/4, 0 = ×1, 1 = ×4 — et non un multiplicateur.
   *
   * On naît au centre du toit le plus haut du village, six centimètres au-dessus
   * de ses tuiles : rien au-dessus, rien autour sur six mètres, la faîtière fait
   * 12,15 × 11,43 pour un corps de 2,72. On repart du centre du toit de la maison
   * basse, c'est-à-dire de l'endroit exact où « la cour » posait son but.
   */
  entree: { position: p(HAUTE.cx, HAUTE.faite + 0.06, HAUTE.cz), echelle: 1 },
  sortie: { position: p(-18, 3.46, -10), echelle: 1 },
};
