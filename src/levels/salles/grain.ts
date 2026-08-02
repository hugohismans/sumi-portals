import type { BoxDef, CarryableDef, RegionDef, SocketDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LE GRAIN — la salle où le monde cesse de dire quelle taille on fait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE ENSEIGNE : toute mesure est une comparaison. On n'a jamais mesuré
 * autre chose que des rapports — et un rapport suffit. Elle le dit en retirant
 * tout le reste : ni créature, ni menace, seulement la perte de la certitude
 * que trois heures ont bâtie. Il reste ses bras, et ses bras suffisent.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DEUX FOIS LA MÊME SALLE. Deux lobes bâtis du MÊME TIRAGE, l'un quatre fois
 * l'autre : même paroi, même surplomb, même cheminée au plafond, bloc pour
 * bloc. Un goulet coudé va de l'un à l'autre — jamais les deux dans un seul
 * regard — et l'on ressort dans une salle qu'on reconnaît sans pouvoir dire si
 * elle a grandi ou si l'on a rétréci. Aucun portail interne, entrée et sortie
 * au palier 0 : ON NE CHANGE JAMAIS DE TAILLE, et rien ne permet de le savoir.
 *
 * LE CHIASME, QUI EST L'ÉNIGME. Chaque lobe porte, à la MÊME PLACE de sa
 * grille, un creux et une graine, tailles croisées — VASTE (grain ×4) : creux
 * 2,88, graine 0,72 ; MENU (grain ×1) : creux 0,72, graine 2,88. Serrure et
 * clef côte à côte, jamais assorties, d'un facteur quatre en sens contraires.
 * La seule graine qu'on soulève est celle du vaste, le seul creux qu'elle
 * remplisse est dans le menu : on la porte, et c'est tout.
 *
 * ET C'EST L'INSTRUMENT DE MESURE, car on ne soulève que 0,55 fois sa hauteur :
 * 0,72 se soulève → h ≥ 1,31 ; 2,88 refuse → h < 5,24 ; et comme les tailles
 * vivent sur un réseau de puissances de quatre — 0,45 · 1,80 · 7,20 · 28,80 —
 * cet intervalle n'en contient qu'UNE. Deux gestes, dont un qui échoue, et l'on
 * connaît sa taille sans avoir vu un seul étalon. La règle 9 n'est pas
 * enfreinte mais déplacée : l'étalon est la graine, et il faut la porter pour
 * s'en servir. L'erreur est universelle (règle 10) — on présente d'abord la
 * graine au creux d'à côté, il refuse en disant « trop petite », et l'on relève
 * la tête sur un creux quatre fois soi.
 *
 * LES ÉTALONS, ÉTEINTS UN PAR UN. (1) L'affichage : `muet: true`. (2) Le
 * brouillard : repoussé hors de la salle au lieu d'être rapproché, voir plus
 * bas. (3) La porte d'entrée : ON ARRIVE EN TOMBANT de 31,20 m et l'on ne
 * remonte plus — mesuré, une minute de sauts et de sprint contre les parois ne
 * fait jamais dépasser 1,22 m. Ça coûte que LA SALLE EST À SENS UNIQUE : pas un
 * piège, l'avant reste ouvert, mais c'est la première porte du voyage qui se
 * ferme derrière soi, et un pli de décor n'y suffisait pas puisque `raccorder`
 * plante toujours une face À `entree.position`. (4) Et la porte de SORTIE,
 * 2,80 elle aussi : elle n'existe pas tant que le creux est vide, À CONDITION
 * que l'assemblage lui donne `condition: 'creux-grain'`.
 *
 * PAS UNE ARÊTE À COMPARER — une salle ronde étant impossible en boîtes
 * alignées, on retire plutôt les arêtes du champ de mesure. La paroi qui arrête
 * n'est pas celle qu'on voit : les lobes sont une coque de VERRE et tout leur
 * grain est derrière, donc on ne peut ni le toucher ni se coincer entre deux
 * blocs, et « ne jamais piéger » devient une propriété au lieu d'une vigilance.
 * Le grain n'a pas de taille moyenne : loi LOG-UNIFORME, seule invariante par
 * changement d'échelle, quand une loi uniforme a une moyenne, donc une
 * longueur, donc un étalon. Rien ne se répète, puisque compter des répétitions
 * c'est mesurer. Le sol est nu et plat, ses bords enterrés sous le grain. Et la
 * palette est sourde : le contraste rendrait les blocs dénombrables.
 */

const NOM = 'grain';

/**
 * LE BROUILLARD, ET CE QU'UNE SALLE NE PEUT PAS RÉGLER.
 *
 * `RegionDef.brouillard` ne déplace que le plan LOINTAIN. Le plan PROCHE est
 * écrit en dur — `new THREE.Fog(PAPER, 34, …)` dans `main.ts` — et vaut 34 m
 * partout, à toutes les tailles, sans qu'aucune région y puisse rien : le vrai
 * étalon involontaire n'est pas la portée du brouillard, c'est l'endroit où il
 * COMMENCE. D'où un réglage à l'envers de celui qu'on attend. Le brouillard est
 * linéaire de 34 m à sa portée ; à cent fois la plus longue ligne de vue, le
 * blanchiment le plus lointain vaut UN CENTIÈME du papier — plus de mur blanc,
 * plus de bord, rien à atteindre donc rien à compter. Il porte 10 704 enjambées
 * à ×1 et 2 676 à ×4 : des nombres vides de sens, la plus longue vue de la
 * salle faisant 130 m. Et NON, il ne faut pas qu'il suive le joueur — ce
 * chantier a déjà été fait puis DÉFAIT, et la raison est dans `main.ts` juste
 * au-dessus de cette ligne : l'air qui suit la taille fait changer de couleur
 * les mêmes bâtiments à l'instant de la traversée, une même distance ne
 * contenant pas plus d'air selon qui la regarde. Ce qui manquerait, le jour où
 * une salle changerait de palier chez elle, c'est le plan PROCHE.
 */
const VUE_LA_PLUS_LONGUE = 130;
const BROUILLARD = Math.round(34 + (VUE_LA_PLUS_LONGUE - 34) * 100);

const REGION: RegionDef = {
  name: NOM,
  // La région couvre TOUTE la parcelle, et il le faut : c'est sa boîte qui dit
  // à `surveillerLeSilence` où l'affichage se tait, et l'on entre par le haut.
  min: [-200, -80, 3400],
  max: [0, 80, 3600],
  muet: true,
  paper: '#efece4',
  colors: ['#e8e4da', '#d5cfc1', '#b6afa0', '#7c7568'],
  ink: '#2a2823',
  brouillard: BROUILLARD,
};

// ─── L'OUTILLAGE ───────────────────────────────────────────────────────────

type V3 = [number, number, number];
type Rect = [number, number, number, number];

/** Générateur déterministe. Même graine, même grain, à jamais. */
const semence = (n: number): (() => number) => {
  let a = n >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Tirage LOG-uniforme : la seule loi qui n'ait pas de longueur préférée. */
const logu = (u: number, a: number, b: number): number => a * Math.pow(b / a, u);

/** Palette sourde : l'accent est rare, il ferait ressortir des formes. */
const teinte = (u: number): number => (u < 0.44 ? 0 : u < 0.79 ? 1 : u < 0.96 ? 2 : 3);

/** (u, v, profondeur) → (x, y, z), selon l'axe normal à la paroi. */
const monter = (axe: 0 | 1 | 2, u: number, v: number, w: number): V3 => {
  const p: V3 = [0, 0, 0];
  p[axe] = w;
  p[(axe + 1) % 3] = u;
  p[(axe + 2) % 3] = v;
  return p;
};

const b = (min: V3, max: V3, ink = 1, opts: Partial<BoxDef> = {}): BoxDef =>
  ({ min, max, ink, region: NOM, ...opts });

/** Verre : ça arrête le corps, ça arrête la main, ça ne se dessine pas. */
const verre = (min: V3, max: V3): BoxDef => ({ min, max, region: NOM, invisible: true });

/** Un rectangle percé, en un à quatre morceaux qui ne se recouvrent jamais. */
const trouer = (u0: number, u1: number, v0: number, v1: number, t: Rect | null): Rect[] => {
  if (!t) return [[u0, u1, v0, v1]];
  const r: Rect[] = [];
  if (t[0] > u0) r.push([u0, t[0], v0, v1]);
  if (t[1] < u1) r.push([t[1], u1, v0, v1]);
  if (t[2] > v0) r.push([Math.max(u0, t[0]), Math.min(u1, t[1]), v0, t[2]]);
  if (t[3] < v1) r.push([Math.max(u0, t[0]), Math.min(u1, t[1]), t[3], v1]);
  return r;
};

/**
 * LE GRAIN D'UNE PAROI. `plan` est la face intérieure, `sens` dit de quel côté
 * est la matière : rien n'est jamais posé du côté habitable. Le retrait est
 * tiré EN CUBE — la plupart des blocs affleurent, quelques-uns s'enfoncent —
 * pour du relief sans avoir l'air de flotter loin d'une paroi qu'on ne peut pas
 * toucher. Les tirages précèdent le rejet du masque : c'est ce qui garde le
 * même grain aux deux lobes malgré leurs percements.
 */
const grain = (
  alea: () => number, m: number, axe: 0 | 1 | 2, plan: number, sens: 1 | -1,
  u0: number, u1: number, v0: number, v1: number, trou: Rect | null = null,
): BoxDef[] => {
  const out: BoxDef[] = [];
  // Un bloc par (2,4 · module)² de paroi : le même compte dans les deux lobes.
  const n = Math.round(((u1 - u0) * (v1 - v0)) / (5.8 * m * m));
  for (let i = 0; i < n; i++) {
    const cu = u0 + alea() * (u1 - u0);
    const cv = v0 + alea() * (v1 - v0);
    const lu = logu(alea(), 0.55 * m, 2.4 * m) / 2;
    const lv = logu(alea(), 0.55 * m, 2.4 * m) / 2;
    const r = alea();
    const p = 0.55 * m * r * r * r;
    const e = logu(alea(), 0.7 * m, 2.0 * m);
    const t = teinte(alea());
    if (trou && cu - lu < trou[1] && cu + lu > trou[0] && cv - lv < trou[3] && cv + lv > trou[2]) continue;
    out.push(
      b(
        monter(axe, cu - lu, cv - lv, sens < 0 ? plan - p - e : plan + p),
        monter(axe, cu + lu, cv + lv, sens < 0 ? plan - p : plan + p + e),
        t,
      ),
    );
  }
  return out;
};

/**
 * Le fond de teint : il bouche les interstices du grain, rien de plus. Chaque
 * dalle reçoit une ÉPAISSEUR PROPRE — six dalles de même cote se recouvriraient
 * aux coins, et c'est le défaut le plus fréquent du projet.
 */
const fond = (
  axe: 0 | 1 | 2, plan: number, sens: 1 | -1, d0: number, d1: number, rects: Rect[],
): BoxDef[] =>
  rects.map((r) =>
    b(
      monter(axe, r[0], r[2], sens < 0 ? plan - d1 : plan + d0),
      monter(axe, r[1], r[3], sens < 0 ? plan - d0 : plan + d1),
      2,
      { outline: false },
    ),
  );

// ─── LE LOBE, EN UNITÉS DE LOBE ────────────────────────────────────────────
//
// Tout ce qui suit est écrit dans une grille de 22 × 22 × 7,5, puis POSÉ deux
// fois : au module 1, puis au module 4. Les deux lobes sont donc le même lieu —
// pas « qui se ressemblent », LE MÊME. Vérifié : 223 des 235 boîtes du petit se
// retrouvent à l'identique dans le grand, les douze autres étant les percements.

const COTE = 22;
const HAUT = 7.5;
/** La cheminée : le puits par lequel on tombe, et son jumeau aveugle. */
const CH: Rect = [15.75, 17.5, 15.75, 17.5];
/** Masque du plafond : le puits plus l'épaisseur de ses parois. */
const CH_LARGE: Rect = [15, 18.25, 15, 18.25];

interface Lobe {
  ox: number;
  oz: number;
  m: number;
  /** Ouverture de la paroi est, en (y, z) de lobe. Le goulet, côté vaste. */
  est: Rect | null;
  /** Ouverture de la paroi nord, en (x, y) de lobe. Le goulet, côté menu. */
  nord: Rect | null;
}

const poser = (l: Lobe, bs: BoxDef[]): BoxDef[] =>
  bs.map((x) => ({
    ...x,
    min: [l.ox + x.min[0] * l.m, x.min[1] * l.m, l.oz + x.min[2] * l.m] as V3,
    max: [l.ox + x.max[0] * l.m, x.max[1] * l.m, l.oz + x.max[2] * l.m] as V3,
  }));

/** La coque de verre : le vrai volume habitable, et il ne se dessine pas. */
const coque = (est: Rect | null, nord: Rect | null): BoxDef[] => {
  const out: BoxDef[] = [
    verre([-0.7, 0, -0.7], [0, HAUT, COTE + 0.7]),
    verre([0, 0, -0.7], [COTE, HAUT, 0]),
  ];
  for (const r of trouer(0, HAUT, -0.7, COTE + 0.7, est)) {
    out.push(verre([COTE, r[0], r[2]], [COTE + 0.7, r[1], r[3]]));
  }
  for (const r of trouer(0, COTE, 0, HAUT, nord)) {
    out.push(verre([r[0], r[2], COTE], [r[1], r[3], COTE + 0.7]));
  }
  // Le plafond, percé du puits — DANS LES DEUX LOBES. Celui du grand se
  // traverse en tombant, celui du petit ne mène nulle part : la cheminée par où
  // l'on est arrivé est au plafond de la chambre d'après, quatre fois plus
  // petite. C'est là toute la salle, et ça ne coûte rien.
  for (const r of trouer(-0.7, COTE + 0.7, -0.7, COTE + 0.7, CH)) {
    out.push(verre([r[2], HAUT, r[0]], [r[3], HAUT + 0.7, r[1]]));
  }
  return out;
};

/** Le puits, ses quatre parois et son bouchon. Dessiné, lui : on tombe dedans. */
const puits = (): BoxDef[] => [
  b([CH[0] - 0.75, HAUT, CH[2] - 0.75], [CH[0], HAUT + 2.5, CH[3] + 0.75], 1),
  b([CH[1], HAUT, CH[2] - 0.75], [CH[1] + 0.75, HAUT + 2.5, CH[3] + 0.75], 1),
  b([CH[0], HAUT, CH[2] - 0.75], [CH[1], HAUT + 2.5, CH[2]], 2),
  b([CH[0], HAUT, CH[3]], [CH[1], HAUT + 2.5, CH[3] + 0.75], 2),
  b([CH[0], HAUT + 2, CH[2]], [CH[1], HAUT + 2.5, CH[3]], 0),
];

/**
 * LES MASSIFS : six blocs isolés (x, z, largeur, profondeur, hauteur), aux
 * mêmes places dans les deux lobes. Ce ne sont pas des ornements — ce sont eux
 * qui cassent les lignes de vue du grand lobe, dont la diagonale ferait sinon
 * 124 m d'un trait. Deux d'entre eux laissent toujours 1,15 unité de passage au
 * moins — 4,60 m dans le vaste — donc personne ne s'y coince.
 */
const MASSIFS: [number, number, number, number, number][] = [
  [4.3, 5.1, 3.4, 2.7, 2.5], [16.9, 5.6, 2.6, 3.9, 3.2], [19.6, 11.4, 2.2, 3.1, 1.8],
  [5.2, 14.8, 4.1, 3.4, 2.9], [12.7, 18.9, 2.3, 2.6, 3.6], [8.1, 9.3, 1.9, 2.4, 1.6],
];

const massifs = (): BoxDef[] =>
  MASSIFS.map(([x, z, lx, lz, h], i) =>
    b([x - lx / 2, 0, z - lz / 2], [x + lx / 2, h, z + lz / 2], i % 2 === 0 ? 1 : 2),
  );

/** Grain, fond de teint, coque, puits et massifs : un lobe entier. */
const lobe = (l: Lobe): BoxDef[] => {
  const a = semence(0x6e41);
  const g: BoxDef[] = [
    ...grain(a, 1, 0, 0, -1, 0, HAUT, -0.7, COTE + 0.7),
    ...grain(a, 1, 0, COTE, 1, 0, HAUT, -0.7, COTE + 0.7, l.est),
    ...grain(a, 1, 2, 0, -1, 0, COTE, 0, HAUT),
    ...grain(a, 1, 2, COTE, 1, 0, COTE, 0, HAUT, l.nord),
    ...grain(a, 1, 1, HAUT, 1, -0.7, COTE + 0.7, -0.7, COTE + 0.7, CH_LARGE),
  ];
  const t: BoxDef[] = [
    ...fond(0, 0, -1, 2.0, 2.9, [[-0.4, HAUT + 0.4, -1.1, COTE + 1.1]]),
    // 2,7 et non 2,9 comme à l'ouest : le fond de teint EST du grand lobe
    // s'avance de dix mètres, et à 2,9 il dépassait de quatre-vingts
    // centimètres DANS le petit lobe, qui est planté juste derrière lui.
    ...fond(0, COTE, 1, 2.1, 2.7, trouer(-0.4, HAUT + 0.4, -1.1, COTE + 1.1, l.est)),
    ...fond(2, 0, -1, 2.2, 3.1, [[-0.5, COTE + 0.5, -0.3, HAUT + 0.3]]),
    ...fond(2, COTE, 1, 2.3, 3.2, trouer(-0.5, COTE + 0.5, -0.3, HAUT + 0.3, l.nord)),
    ...fond(1, HAUT, 1, 2.4, 3.3, trouer(-1.2, COTE + 1.2, -1.2, COTE + 1.2, CH_LARGE)),
  ];
  return poser(l, [...g, ...t, ...coque(l.est, l.nord), ...puits(), ...massifs()]);
};

// ─── LES DEUX LOBES, DANS LE MONDE ─────────────────────────────────────────
//
// VASTE : x −164…−76, z 3436…3524, plafond à 30. On y tombe.
// MENU  : x  −65…−43, z 3444…3466, plafond à 7,5. On en sort.
//
// Le goulet ouvre la paroi EST du vaste (z 3497…3503, haut de 5,20) et la paroi
// NORD du menu (x −60…−54, même hauteur) : vu du grand lobe, une fente au pied
// d'un mur de trente mètres ; vu du petit, une porte. Même fente.
//
// LES ONZE MÈTRES ENTRE LES LOBES NE SONT PAS UN CHOIX DE COMPOSITION : le
// grain de la paroi est du vaste saille jusqu'à 10,20 m (retrait 2,20 +
// épaisseur 8,00, multipliés par le module), et plus près c'étaient des rochers
// de six mètres au milieu de la petite chambre — visible en jouant seulement.
// Les ouvertures descendent sous le sol (−0,6) et montent plus haut que le
// passage (1,35) : calée pile sur une cote employée ailleurs, une ouverture
// laisse un liseré de fond de teint coplanaire, soit douze mètres carrés de
// faces qui grésillent.
const VASTE: Lobe = { ox: -164, oz: 3436, m: 4, est: [-0.6, 1.35, 15.2, 16.8], nord: null };
const MENU: Lobe = { ox: -65, oz: 3444, m: 1, est: null, nord: [4.9, 11.1, -0.6, 5.35] };

/**
 * LE GOULET, coudé une fois, ET DÉLIBÉRÉMENT NU. L'angle droit est la condition
 * de tout : deux grains d'échelles différentes dans une seule image, et la
 * salle est morte.
 *
 * PAS UN GRAIN DEDANS, et c'est un renoncement instructif. J'ai voulu le
 * ligner, blocs ×4 côté vaste et ×1 côté menu, le raccord caché dans le coude.
 * Ça ne tient pas : UN GRAIN ×4 NE RENTRE PAS DANS UN COULOIR DE SIX MÈTRES.
 * Les blocs vont de deux mètres à neuf et demi ; le long d'une paroi de douze
 * ils débordent dans l'autre branche et l'on se coince contre un rocher
 * flottant au milieu du passage — et aucun rognage ne rattrape ça sans faire
 * coïncider vingt faces sur la ligne de coupe.
 *
 * Papier lisse, donc : six dalles sans une arête encrée, et c'est mieux — ON
 * TRAVERSE VINGT-HUIT MÈTRES DE RIEN, dernière image un grain ×4, première au
 * sortir un grain ×1, et entre les deux rien à comparer. Le couloir est
 * l'amnésie de la salle. Ses dix premiers mètres restent du rocher ×4,
 * gratuitement : le grain du vaste saille jusque-là et son masque exclut
 * exactement la section du passage, si bien qu'il borde l'ouverture sans
 * pouvoir y entrer. Les parois s'arrêtent à 5,20 et les plafonds y commencent :
 * deux faces qui se touchent franchement sont enterrées, jamais exposées.
 */
const goulet = (): BoxDef[] => {
  const p = { outline: false };
  return [
    // Branche est-ouest : x −76…−54, z 3497…3503, haute de 5,20.
    b([-76, 0, 3493], [-60, 5.2, 3497], 2, p),
    b([-76, 0, 3503], [-54, 5.2, 3507], 2, p),
    b([-76, 5.2, 3497], [-54, 6.4, 3503], 2, p),
    // Branche nord-sud : x −60…−54, z 3466…3497. Le coude est vers (−57, 3500).
    b([-64, 0, 3466], [-60, 5.2, 3493], 2, p),
    b([-54, 0, 3466], [-50, 5.2, 3507], 2, p),
    b([-60, 5.2, 3466], [-54, 6.4, 3497], 2, p),
  ];
};

/**
 * LES TROIS SOLS. Nus, plats, dessus à y = 0, `outline: false` — une couture
 * encrée en plein sol serait la seule ligne droite de la salle, et l'on
 * compterait ses pas dessus. Leurs emprises se touchent et ne se chevauchent
 * JAMAIS : seule façon d'avoir trois dalles à la même cote sans faces
 * confondues. Et pas un caillou : un caillou a une hauteur, on l'enjambe ou
 * non, donc c'est un étalon de plus doublé d'un risque de coincement.
 */
const sols = (): BoxDef[] => [
  b([-176, -3, 3424], [-76, 0, 3536], 0, { outline: false }),
  b([-76, -3, 3466], [-50, 0, 3507], 0, { outline: false }),
  b([-76, -3, 3438], [-40, 0, 3466], 0, { outline: false }),
];

// ─── CE QU'ON PORTE, ET CE QUI ATTEND ──────────────────────────────────────
//
// Les quatre objets sont aux DEUX MÊMES PLACES de la grille de lobe : le creux
// en (11 ; 11), la graine en (17,5 ; 17,5). Seules les tailles sont croisées.

const GRAINE = 0.72;
const BLOC = GRAINE * 4;

/**
 * LES DEUX GRAINES. Même forme, même encre : SEULE LA TAILLE DIFFÈRE — un refus
 * venu de la forme ou de la main brouillerait la seule leçon de la salle, et
 * `Sockets.raisonDuRefus` juge la taille EN PREMIER, donc c'est bien « trop
 * petite » qu'on s'entend dire. 0,72 contre une limite de 0,99 à ×1 : 27 % de
 * marge, quand une salle voisine est morte pour deux millimètres et demi sur ce
 * seuil. 2,88 contre la même limite : presque le triple. Aucun des deux
 * verdicts n'est douteux, et c'est ce qui rend l'encadrement lisible.
 */
const CARRYABLES: CarryableDef[] = [
  { id: 'graine-grain', position: [-94, 0.02, 3506], size: GRAINE, forme: 'graine', ink: 3 },
  { id: 'graine-lourde', position: [-47.5, 0.02, 3461.5], size: BLOC, forme: 'graine', ink: 3 },
];

/**
 * LES DEUX CREUX. `portee` est large parce qu'on repose ce qu'on porte à DEUX
 * FOIS SA TAILLE devant soi — 3,60 m à ×1. Un creux de 0,72 gardant sa portée
 * par défaut (0,54 m) serait impossible à garnir : on viserait juste, on
 * raterait toujours, et rien ne le dirait. Ce nombre a déjà tué une salle.
 * `creux-sourd` ne sera jamais pourvu, et c'est voulu : une serrure et sa clef
 * côte à côte, et l'on est trop petit pour lever la clef — « cette salle n'a
 * pas été bâtie pour toi », sans un mot.
 */
const SOCKETS: SocketDef[] = [
  { id: 'creux-grain', forme: 'graine', position: [-54, 0.02, 3455], size: GRAINE, portee: 5.5, ink: 3 },
  { id: 'creux-sourd', forme: 'graine', position: [-120, 0.02, 3480], size: BLOC, portee: 8, ink: 3 },
];

export const GRAIN: SalleModule = {
  nom: NOM,
  region: REGION,
  bounds: { min: [-200, -80, 3400], max: [0, 80, 3600] },
  boxes: [...sols(), ...lobe(VASTE), ...lobe(MENU), ...goulet()],
  carryables: CARRYABLES,
  sockets: SOCKETS,

  /**
   * LE PINCEAU, ET LE SEUL ÉTALON QUE JE N'AIE PAS PU ÉTEINDRE. `montee.ts`
   * donne à chaque jalon la taille d'ENTRÉE de sa salle : ici un mètre, dans
   * les deux lobes. Or la loi du guide veut que sa taille soit celle de l'ÉTAGE
   * où il se perche — le lobe vaste EST un étage ×4, il devrait y mesurer
   * quatre mètres — et tel quel, un Pinceau d'un mètre au pied d'un rocher de
   * douze annonce la taille du rocher, donc la mienne. Il faudrait
   * `guideEchelle` par jalon : une ligne dans l'assemblage, hors de ma portée.
   * Les stations, elles, restent en vue les unes des autres, coude compris —
   * sans le jalon du virage, le guide traverserait douze mètres de roche.
   */
  stations: [
    [-97.5, 27, 3502.5], [-95, 2.5, 3505], [-118, 4, 3481],
    [-80, 3, 3500], [-68, 2.4, 3500], [-57, 2.4, 3500],
    [-57, 2.4, 3472], [-54, 2.2, 3455], [-54, 1.6, 3446],
  ],

  /**
   * ON ENTRE PAR LE HAUT, DANS LE VIDE, ET L'ON TOMBE 31,20 m EN 1,55 s.
   *
   * `echelle` EST UN PALIER : −1 = ×1/4, 0 = ×1, 1 = ×4, 2 = ×16. Même palier
   * des deux côtés — on ne change jamais de taille ici, et l'on n'a aucun moyen
   * de s'en assurer. La face est au milieu du puits, trois mètres et demi de
   * vide de chaque côté : de quelque côté du plan qu'on ressorte, il n'y a rien
   * sous les pieds, et `teleport` met déjà `grounded = false`. La sortie est
   * adossée au mur sud du petit lobe, où l'on marche vers les z décroissants —
   * le sens que `raccorder` lui donne.
   */
  entree: { position: [-97.5, 31.2, 3502.5], echelle: 0 },
  sortie: { position: [-54, 0.02, 3445], echelle: 0 },
};
