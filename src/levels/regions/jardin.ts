import type { BoxDef } from '../../core/types.js';
import type { RegionModule } from './contrat.js';

/**
 * LE JARDIN — des choses ordinaires devenues immenses.
 *
 * On n'y est pas grand dans un endroit petit : on y est MINUSCULE dans un
 * endroit banal. C'est toute la différence, et elle se joue sur le choix des
 * objets. Rien ici n'est fabuleux. Un brin d'herbe, un galet, une flaque, une
 * feuille tombée, une coquille vide. Ce sont les choses qu'on écrase du pied
 * sans les voir. Vues d'à peine quarante-cinq centimètres, elles deviennent
 * une forêt, un rocher, un lac, un pont, une tour.
 *
 * LA MESURE DE TOUT : le joueur fait 0,45. Il ENJAMBE 0,225 et SAUTE 0,32.
 * Ces trois nombres décident de tout ce qui suit et ne sont jamais jugés à
 * vue. Une marche de 0,18 se monte ; un rebord de 0,5 est un mur ; la nervure
 * d'une feuille, avec ses 10 cm de relief, est un dos-d'âne qu'on franchit
 * sans y penser. C'est cette échelle qui transforme une flaque de 60 cm de
 * profondeur en un lac dont on ne ressort pas n'importe où.
 *
 * LA COULEUR : le village était ocre et sec. Ici on est SOUS l'herbe, à
 * l'ombre, dans l'humide. Vert profond, vert d'eau, et le roux des feuilles
 * mortes pour tracer le chemin — c'est la seule couleur chaude, et c'est
 * toujours elle qui indique par où l'on monte. Même trait d'encre, mêmes
 * aplats, même grain : un seul dessinateur, une autre saison.
 *
 * LE CHEMIN, d'ouest en est :
 *   le seuil et le galet blanc → la forêt d'herbe → le grand galet →
 *   la flaque et la feuille-pont → la mousse et la coquille → la sortie.
 *
 * ET UN DÉTOUR, QUI MONTE : la pomme de pin, plantée dans une clairière au
 * nord de la forêt d'herbe. Rien du chemin n'y oblige — on la voit, on y va ou
 * non. C'est le seul endroit du jardin où l'on GRIMPE, c'est-à-dire le seul où
 * l'on puisse rater. Voir tout en bas.
 */

type V3 = [number, number, number];

/**
 * Toute boîte d'ici porte `region: 'jardin'` : c'est elle, et elle seule, qui
 * décide de la palette appliquée. Aucune ne peut l'oublier puisqu'on ne
 * construit rien autrement que par ce constructeur.
 */
const box = (
  min: V3,
  max: V3,
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'jardin', ...opts });

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

// ─── Les nombres du joueur ───────────────────────────────────────────────────
// Il mesure 0,45. Tout ce qui suit s'y rapporte.
const ENJAMBEE = 0.225; // franchi sans sauter
const MARCHE = 0.18; // 80 % de l'enjambée : la marge d'erreur du joueur
const SAUT = 0.32; // au-delà, c'est un mur, quoi qu'on en pense à l'œil

// ─── Les quatre plans de sol ─────────────────────────────────────────────────
//
// Le sol est découpé en quatre dalles pour ménager le creux de la flaque —
// une dalle unique ne peut pas se creuser. Elles se RECOUVRENT largement,
// jamais bout à bout, et chacune est posée quelques centimètres plus bas que
// sa voisine : deux dalles au même niveau qui se chevauchent auraient leurs
// faces hautes exactement dans le même plan, et c'est là que le rendu grésille.
// Les écarts (6, 5 et 6 cm) sont trente fois plus petits que l'enjambée : on
// ne les sent pas, on ne les voit pas, et ils suffisent à séparer les plans.
const SOL_O = 0; // ouest, là où l'on entre
const SOL_N = -0.06; // rive nord de la flaque
const SOL_S = -0.11; // rive sud
const SOL_E = -0.17; // est, là où l'on sort

/** Fond de la flaque. 0,62 sous la rive : une berge dont on ne remonte pas. */
const FOND = -0.62;
/** Surface de l'eau. On patauge dessus, on ne nage pas. */
const EAU = -0.5;

/**
 * ESCALIER À CRANS — la seule façon de monter, ici.
 *
 * Une brindille tombée, une racine, un tas de feuilles : la forme change, la
 * mécanique non. Chaque cran mord de 10 cm sur le suivant pour qu'il n'y ait
 * jamais de fente à travers laquelle on voit le vide, et les bords en z
 * dérivent d'un centimètre par cran — sans cette dérive, les flancs de deux
 * crans qui se mordent seraient exactement dans le même plan sur la largeur de
 * la morsure, et c'est exactement le défaut qu'on cherche à éviter.
 *
 * `montee` peut être négative : on descend alors, avec les mêmes garanties.
 * `fond` sert aux volées plantées dans la terre (racines) ; sans lui, le corps
 * du cran suit la pente, ce qui est le bon dessin pour une brindille appuyée.
 */
const escalierX = (
  xDepart: number,
  sens: 1 | -1,
  zc: number,
  larg: number,
  n: number,
  pas: number,
  montee: number,
  yPremier: number,
  epaisseur: number,
  ink = 3,
  fond?: number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  for (let i = 0; i < n; i++) {
    const a = xDepart + sens * i * pas;
    const b = a + sens * (pas + 0.1);
    const y = yPremier + i * montee;
    const bas = fond === undefined ? y - epaisseur - i * 0.02 : fond - i * 0.025;
    out.push(
      box(
        [Math.min(a, b), bas, zc - larg / 2 - i * 0.012],
        [Math.max(a, b), y, zc + larg / 2 + i * 0.009],
        ink,
      ),
    );
  }
  return out;
};

/**
 * UN BRIN D'HERBE — c'est-à-dire un arbre.
 *
 * Six segments qui s'affinent et ploient : un brin n'est pas un poteau, il
 * penche, et c'est ce qui fait qu'on lève les yeux. La courbure est en t²
 * pour que le pied reste droit et que seule la pointe s'incline, comme le fait
 * une tige chargée de son propre poids.
 *
 * Chaque segment MORD de 14 cm sur le précédent : sa face basse se retrouve
 * ainsi À L'INTÉRIEUR du segment d'en dessous, jamais dans le plan de sa face
 * haute. La largeur diminuant à chaque étage, aucun flanc n'est jamais
 * coplanaire avec un autre non plus.
 *
 * `sol` est le niveau où le brin est planté — la terre, ou le fond de la
 * flaque pour les roseaux.
 */
const brin = (bx: number, bz: number, h: number, dx: number, dz: number, ink: number, sol = 0): BoxDef[] => {
  const out: BoxDef[] = [];
  const N = 6;
  // Un brin haut est un brin large au pied : sans ça, les grands ressemblent à
  // des fils de fer et l'échelle ne se lit plus.
  const larg = 0.15 + h * 0.011;
  for (let i = 0; i < N; i++) {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    const tm = (t0 + t1) / 2;
    const w = Math.max(larg * (1 - tm * 0.88), 0.05);
    const cx = bx + dx * tm * tm;
    const cz = bz + dz * tm * tm;
    const y0 = i === 0 ? sol - 0.45 : sol + h * t0 - 0.14;
    out.push(box([cx - w, y0, cz - w], [cx + w, sol + h * t1, cz + w], ink));
  }
  // Une goutte de rosée sur les plus hauts. Elle déborde du brin de tous les
  // côtés : posée à ras, ses flancs auraient épousé ceux de la tige.
  if (h > 24) {
    const t = 0.55;
    const w = larg * (1 - t * 0.88) + 0.22;
    const cx = bx + dx * t * t;
    const cz = bz + dz * t * t;
    out.push(box([cx - w, sol + h * t, cz - w], [cx + w, sol + h * t + w * 1.7, cz + w], 0));
  }
  return out;
};

/**
 * UN GALET — c'est-à-dire un rocher.
 *
 * Trois assises qui rétrécissent en se décalant : un galet n'est pas un cube,
 * et les redans qu'on obtient font des vires étroites. Les hauteurs entre
 * assises (autour de 0,5 et plus) dépassent toujours le saut de 0,32 : on
 * regarde le sommet, on n'y monte pas sans avoir trouvé sa route. Chaque
 * assise plonge de 12 cm dans celle du dessous.
 */
const galet = (cx: number, cz: number, rx: number, rz: number, h: number, ink: number, r: () => number): BoxDef[] => {
  const out: BoxDef[] = [];
  const parts = [1, 0.82, 0.6];
  const cimes = [0.46, 0.8, 1];
  let precedent = -0.55 - r() * 0.3;
  for (let i = 0; i < 3; i++) {
    const k = parts[i];
    // Le décalage est plafonné à 5 % du rayon, jamais davantage : comme une
    // assise rétrécit d'au moins 18 %, tout bord se déplace forcément d'un
    // bon huitième de rayon. Avec un décalage plus généreux, deux assises
    // pouvaient tomber par hasard sur la même verticale — le tirage a
    // effectivement produit un écart de trois dixièmes de millimètre.
    const ox = (r() - 0.5) * rx * 0.1;
    const oz = (r() - 0.5) * rz * 0.1;
    const top = h * cimes[i];
    out.push(box([cx - rx * k + ox, precedent, cz - rz * k + oz], [cx + rx * k + ox, top, cz + rz * k + oz], ink));
    precedent = top - 0.12;
  }
  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LE DÉCOR
// ═════════════════════════════════════════════════════════════════════════════

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const r = rng(90210);

  // ─── La terre ──────────────────────────────────────────────────────────────
  // Quatre dalles qui se recouvrent, à quatre altitudes voisines (voir plus
  // haut). Les fonds sont eux aussi tous différents : même enterrées, deux
  // faces basses au même niveau restent deux faces coplanaires.
  // Les bords lointains sont eux aussi décalés (100 / 99,6 / 99,2) : trois
  // dalles s'arrêtant sur la même ligne auraient partagé une tranche entière.
  // Les quelques décimètres de retrait sont à deux cents mètres du chemin, sur
  // la lisière de la parcelle — personne n'ira jamais y poser le pied.
  out.push(box([300, -6, -120], [401.6, SOL_O, 100], 2, { outline: false }));
  out.push(box([400.6, -5.7, -119.6], [452.2, SOL_N, -20.8], 2, { outline: false }));
  out.push(box([400.6, -5.5, 20.6], [452.2, SOL_S, 99.6], 2, { outline: false }));
  out.push(box([451.0, -5.9, -119.2], [520, SOL_E, 99.2], 2, { outline: false }));

  // ─── LA FLAQUE, c'est-à-dire le lac ────────────────────────────────────────
  //
  // Cinquante mètres de large et soixante-deux centimètres de creux. À notre
  // taille c'est une flaque qu'on enjambe ; à 0,45 c'est une étendue dont la
  // berge, haute de 0,62, dépasse le saut de 0,32 — on n'en ressort PAS en
  // grimpant. D'où les deux plages en pente douce plus bas : c'est la règle du
  // « on ne piège jamais » qui les impose, pas le décor.
  //
  // Le fond déborde sous les quatre dalles de rive : ses propres flancs sont
  // ainsi enterrés, et les seules parois visibles de la cuvette sont les
  // tranches des dalles.
  out.push(box([400.9, -5.3, -21.0], [451.9, FOND, 20.9], 2, { outline: false }));
  // L'eau. Elle s'arrête à 60 cm des berges : cette bande de vase sèche évite
  // que la nappe et la paroi ne se touchent, et donne au lac son rivage.
  out.push(box([402.2, -0.86, -19.6], [450.4, EAU, 19.3], 0, { outline: false }));

  // Les deux plages. Crans de 12 cm — la moitié de l'enjambée — depuis la rive
  // jusqu'à l'eau. Une au nord-ouest, une au sud-est : quel que soit l'endroit
  // où l'on tombe, on ressort en marchant.
  out.push(...escalierX(401.0, 1, -12.8, 6.8, 4, 1.9, -0.12, -0.1, 0.9, 2, -1.0));
  // La plage est part 20 cm en retrait du bord de la nappe : posée dessus, sa
  // tranche et celle de l'eau auraient été dans le même plan.
  out.push(...escalierX(452.6, -1, 12.5, 7.0, 3, 1.9, -0.12, -0.28, 0.9, 2, -1.05));

  // ─── LE SEUIL, et le galet blanc ───────────────────────────────────────────
  //
  // On entre en [310, 0, 0], sur une clairière de terre battue. La première
  // chose qu'on voit est le pinceau, posé sur un galet pâle à 0,92 du sol —
  // presque trois fois le saut. Il est à six pas, et il est inatteignable.
  // C'est la leçon inaugurale de la région : ici, la hauteur ne se force pas.
  // Terre tassée. Son dessus est à 0,135 et non à 0,12 : le quatrième cran de
  // la brindille voisine a précisément son dessous à 0,12, et les deux faces se
  // seraient superposées.
  out.push(box([302.5, -0.55, -15.2], [333.0, 0.135, 14.6], 1));
  out.push(box([316.4, -0.5, -7.9], [319.9, 0.56, -4.3], 0));
  out.push(box([317.2, 0.48, -7.2], [319.2, 0.92, -4.9], 0));
  // La réponse est derrière : une brindille tombée contre le flanc est du
  // galet, à cinq crans de 0,18. Il faut la contourner pour la voir — dix
  // mètres de détour à notre échelle, vingt-deux fois sa taille à la sienne.
  out.push(...escalierX(325.5, -1, -6.05, 1.7, 5, 1.15, MARCHE, 0.14, 0.5));

  // ─── LA FORÊT D'HERBE ──────────────────────────────────────────────────────
  // Le couloir se resserre entre les tiges. Quelques feuilles mortes en
  // travers du chemin : leur épaisseur ne dépasse jamais 0,2, soit moins que
  // l'enjambée — on passe dessus sans ralentir, et c'est voulu : elles doivent
  // meubler le sol, pas le barrer.
  for (let i = 0; i < 26; i++) {
    const fx = 305 + r() * 200;
    const fz = -22 + r() * 44;
    const l = 1.6 + r() * 4.2;
    const w = 1.2 + r() * 3.0;
    if (fx > 398 && fx < 454) continue; // pas de feuille sur l'eau
    out.push(box([fx, -0.3 - r() * 0.2, fz], [fx + l, 0.06 + r() * 0.14, fz + w], 3));
  }

  // ─── LE GRAND GALET ────────────────────────────────────────────────────────
  //
  // Trois mètres trente : sept fois la taille du joueur. Il barre le couloir,
  // et ses vires font 1,0 puis 0,7 de haut — trois fois le saut. On le
  // contourne par le sud sans y penser ; on n'y monte qu'en trouvant la
  // brindille. La mousse qui le coiffe est le perchoir du pinceau.
  out.push(box([362.0, -0.9, -13.0], [388.4, 1.05, 9.6], 0));
  out.push(box([363.9, 0.92, -11.2], [386.2, 2.06, 8.0], 0));
  out.push(box([366.2, 1.94, -9.1], [383.6, 2.74, 6.1], 0));
  out.push(box([369.0, 2.62, -6.8], [380.9, 3.18, 3.9], 0));
  out.push(box([370.4, 3.06, -5.4], [379.2, 3.30, 2.6], 2)); // la mousse du sommet

  // La brindille appuyée contre le flanc ouest. Seize crans de 0,2, et son
  // corps suit la pente : elle décolle du sol comme une vraie branche posée en
  // biais, puis vient mordre dans la dernière assise du galet. Son dernier
  // cran culmine à 3,2 et l'assise est à 3,18 : deux centimètres d'écart, donc
  // aucune face commune, et une descente insensible.
  // Le 352,03 n'est pas une coquetterie : à 352 tout rond, un cran finissait
  // exactement sur la face ouest du galet. Trois centimètres suffisent à le
  // faire mordre dedans.
  out.push(...escalierX(352.03, 1, -1.3, 1.5, 16, 1.1, 0.2, 0.2, 0.62));

  // ─── LA FEUILLE-PONT ───────────────────────────────────────────────────────
  //
  // Une feuille tombée en travers de la flaque. Son limbe est à 0,60 : deux
  // fois le saut, donc on n'y grimpe pas depuis la berge. On y accède par le
  // PÉTIOLE, resté posé sur la terre, dont les quatre crans de 0,16 montent
  // pile à hauteur du limbe. C'est le seul objet de la région qu'on emprunte
  // sans avoir à le chercher : il est droit sur le chemin.
  out.push(...escalierX(393.8, 1, 0.6, 2.6, 4, 1.7, 0.16, 0.16, 0.5, 3, -0.4));

  // Le limbe, en trois plaques qui s'élargissent puis s'effilent. Leurs dessus
  // descendent de 1,5 cm de plaque en plaque (0,60 / 0,585 / 0,57) : c'est
  // rigoureusement invisible en jeu, et cela garantit que deux plaques
  // voisines ne partagent jamais un plan. Leurs dessous et leurs bords sont
  // décalés pour la même raison.
  out.push(box([400.0, 0.44, -3.4], [409.0, 0.6, 4.6], 3));
  out.push(box([408.8, 0.42, -6.2], [424.0, 0.585, 7.4], 3));
  out.push(box([423.8, 0.4, -4.0], [437.4, 0.57, 5.0], 3));
  // La nervure centrale : 10 cm de relief sur le tablier. Sous l'enjambée de
  // 0,225, donc franchissable — mais assez marquée pour qu'on la sente sous
  // les pieds et qu'on comprenne qu'on marche sur une feuille.
  // Elle dépasse la pointe du limbe, comme sur une vraie feuille, mais s'arrête
  // 40 cm avant la mousse de l'île pour ne pas venir buter dessus.
  out.push(box([400.4, 0.5, 0.1], [438.2, 0.7, 0.9], 2));
  // Les nervures latérales, plus basses encore (5 cm) et toutes d'une hauteur
  // légèrement différente, pour la même raison de plans.
  for (let i = 0; i < 6; i++) {
    const nx = 403.5 + i * 5.4;
    out.push(box([nx, 0.48, -5.5], [nx + 0.5, 0.652 + i * 0.004, 6.5], 2));
  }

  // ─── L'ÎLE ─────────────────────────────────────────────────────────────────
  //
  // Un galet émergé, où la pointe de la feuille vient mordre. Sa couronne est
  // à 1,06 au-dessus de l'eau : celui qui traverse à gué le VOIT et n'y monte
  // pas. Voilà le pinceau visible et hors d'atteinte pour qui a choisi de
  // patauger — et c'est cet écart qui fait l'énigme.
  // Le socle s'arrête à 0,27 alors que le premier cran de la descente est à
  // 0,30 : à égalité, les deux dessus se seraient disputé la profondeur. Trois
  // centimètres de lèvre, et la vire reste franchissable sans y penser.
  out.push(box([433.6, -1.1, -7.6], [447.2, 0.27, 5.9], 0));
  out.push(box([435.0, 0.22, -6.3], [445.4, 0.44, 4.6], 0));
  out.push(box([438.6, 0.36, -5.2], [445.0, 0.6, 3.4], 2)); // la mousse : le perchoir
  // Le chemin de l'île à la rive est : quatre crans descendants de 0,14, qui
  // viennent finir SUR la dalle est. Sans eux, quiconque a pris la feuille
  // resterait sur son caillou — un piège, et le pire défaut possible.
  out.push(...escalierX(444.9, 1, -0.5, 6.1, 4, 1.6, -0.14, 0.3, 0.9, 2, -1.0));

  // Roseaux et cailloux dans l'eau, plantés au fond de la cuvette. Ils
  // habitent le lac sans jamais gêner ni le gué ni la feuille : on les tient
  // à l'écart du couloir central.
  for (let i = 0; i < 14; i++) {
    const rx = 404 + r() * 44;
    const rz = -18 + r() * 36;
    if (rx < 440 && Math.abs(rz) < 9.5) continue;
    if (rx > 432 && rx < 448 && rz > -9 && rz < 7) continue;
    out.push(...brin(rx, rz, 3 + r() * 11, (r() - 0.5) * 2.4, (r() - 0.5) * 2.4, r() < 0.4 ? 2 : 1, -0.55));
  }
  for (let i = 0; i < 6; i++) {
    const px = 405 + r() * 40;
    const pz = -17 + r() * 34;
    if (px < 449 && Math.abs(pz) < 10) continue;
    out.push(...galet(px, pz, 1.4 + r() * 1.6, 1.2 + r() * 1.4, 0.5 + r() * 0.6, 0, r));
  }

  // ─── LA MOUSSE ET LA COQUILLE ──────────────────────────────────────────────
  //
  // Un tertre de mousse haut de 1,86 barre l'est : cinq fois le saut, on ne
  // l'escalade pas. On y monte par des racines affleurantes — dix crans de 0,2
  // qui sortent de terre. Le dernier arrive à 1,78, le tertre est à 1,86 : huit
  // centimètres, donc pas de face commune et pas d'obstacle.
  out.push(...escalierX(455.0, 1, -2.6, 7.5, 10, 1.95, 0.2, -0.02, 0.9, 3, -1.0));
  out.push(box([474.0, -0.71, -30.0], [500.0, 1.86, 26.0], 2));

  // La coquille d'escargot, vide. Cinq spires décalées sur un cercle, chacune
  // plus petite et plus haute de 0,42 que la précédente. Ce 0,42 est choisi
  // AU-DESSUS du saut de 0,32 : on peut poser le pied sur la première spire
  // depuis la mousse (12 cm seulement), et de là on voit le sommet sans
  // pouvoir l'atteindre. Toutes les spires plongent dans la mousse, ce qui
  // évite qu'aucune n'ait de face basse à l'air libre.
  const COQ: [number, number] = [485.0, -3.0];
  for (let i = 0; i < 5; i++) {
    const a = 0.9 * i;
    const rad = 3.4 * (1 - i / 5.6);
    const s = 3.9 - i * 0.62;
    const cx = COQ[0] + Math.cos(a) * rad;
    const cz = COQ[1] + Math.sin(a) * rad;
    // Bandes alternées : une coquille est rayée, et cela rend les spires
    // lisibles de loin.
    out.push(box([cx - s, 1.4 - i * 0.07, cz - s], [cx + s, 1.98 + i * 0.42, cz + s], i % 2 ? 3 : 0));
  }
  // Une brindille appuyée contre la coquille, côté est : neuf crans de 0,2 qui
  // enjambent les spires basses et viennent mordre dans la dernière. Elle est
  // à l'opposé de l'arrivée des racines — il faut faire le tour du coquillage
  // pour la trouver.
  out.push(...escalierX(496.9, -1, -3.9, 1.4, 9, 1.35, 0.2, 2.02, 0.6));

  // Touffes de mousse sur le tertre, pour qu'il ne soit pas une table rase.
  // Aucune ne dépasse 0,2 : décor, jamais obstacle.
  for (let i = 0; i < 18; i++) {
    const tx = 475 + r() * 23;
    const tz = -28 + r() * 52;
    if (tx > 476 && tx < 494 && tz > -12 && tz < 6) continue; // on épargne la coquille
    const w = 0.9 + r() * 2.2;
    out.push(box([tx, 1.6, tz], [tx + w, 1.92 + r() * 0.14, tz + w * 0.8], r() < 0.5 ? 1 : 3));
  }

  // ─── LA SORTIE ─────────────────────────────────────────────────────────────
  // Onze crans de feuilles mortes empilées redescendent du tertre au sol est.
  // Le premier culmine 4 cm au-dessus du tertre pour ne pas y être enterré ; le
  // dernier finit 7 cm au-dessus de la dalle. On ressort en [510, 0, 0] sur un
  // sol plat et dégagé.
  out.push(...escalierX(499.2, 1, -2.0, 10.0, 11, 0.85, -0.2, 1.9, 0.9, 3, -0.55));

  // ─── L'HERBE, partout ──────────────────────────────────────────────────────
  //
  // C'est elle qui fait la région. Semée sur une grille lâche, dense au bord
  // du chemin et clairsemée au loin — c'est l'inverse d'une forêt réelle, mais
  // c'est ce qui donne une lisière au couloir sans le murer. On épargne le
  // couloir (|z| < 11) et l'emprise des grandes pièces : rien ne doit pousser
  // là où l'on marche.
  const interdit = (x: number, z: number): boolean => {
    if (Math.abs(z) < 11) return true; // le chemin
    if (x > 398 && x < 454 && Math.abs(z) < 23) return true; // la flaque
    if (x > 359 && x < 391 && z > -16 && z < 12) return true; // le grand galet
    if (x > 470 && x < 504 && z > -34 && z < 30) return true; // le tertre de mousse
    return false;
  };
  for (let gx = 306; gx < 516; gx += 9) {
    for (let gz = -114; gz < 96; gz += 11) {
      const bx = gx + (r() - 0.5) * 7;
      const bz = gz + (r() - 0.5) * 8.5;
      // La marge tient compte de ce qu'un brin PENCHE : 3,5 d'inclinaison plus
      // 0,7 de demi-largeur au pied. Sans elle, un géant planté au bord
      // déborderait de la parcelle par la pointe.
      if (bx < 306 || bx > 512 || bz < -114 || bz > 94) continue;
      if (interdit(bx, bz)) continue;
      // Densité forte le long du chemin, faible au fond : la lisière se lit,
      // et le lointain ne coûte pas mille boîtes.
      const proche = Math.max(0, 1 - (Math.abs(bz) - 11) / 34);
      if (r() > 0.07 + proche * 0.3) continue;
      // Hauteur en carré : beaucoup de brins moyens, quelques géants. Le plus
      // haut fait 46, soit cent fois la taille du joueur — un séquoia.
      const t = r();
      const h = 6 + t * t * 40;
      const teinte = h > 26 ? 2 : r() < 0.35 ? 2 : 1;
      out.push(...brin(bx, bz, h, (r() - 0.5) * 7, (r() - 0.5) * 7, teinte));
    }
  }

  // Quelques galets épars hors du chemin : des rochers, pour qui mesure 0,45.
  for (let i = 0; i < 16; i++) {
    // Même précaution : un galet fait jusqu'à 7 de rayon, on le tient donc à
    // bonne distance des lisières de la parcelle.
    const gx = 315 + r() * 190;
    const gz = -108 + r() * 196;
    if (interdit(gx, gz)) continue;
    out.push(...galet(gx, gz, 2 + r() * 5, 1.8 + r() * 4.5, 0.8 + r() * 3.4, r() < 0.3 ? 2 : 0, r));
  }

  return out;
};

/**
 * LE JARDIN.
 *
 * Quatre stations, et aucune qui se prenne d'un pas : le galet blanc à 0,92
 * (on fait le tour, la brindille est derrière), le grand galet à 3,30 (on
 * trouve la branche appuyée), l'île à 0,60 au milieu de l'eau (on passe par la
 * feuille), la coquille à 3,66 (on contourne le coquillage). Le pinceau vole ;
 * nous, non — et à cette taille, chaque écart de vingt centimètres est une
 * question.
 */
export const JARDIN: RegionModule = {
  region: {
    name: 'jardin',
    min: [300, -6, -120],
    max: [520, 60, 100],
    // Le village était sec et ocre. On est ici SOUS l'herbe : à l'ombre, dans
    // l'humide. Le seul ton chaud est le roux des feuilles mortes — et c'est
    // toujours par lui qu'on monte, ce qui en fait autant une couleur qu'une
    // consigne.
    paper: '#e9eee0',
    colors: [
      '#cfe0c0', // 0 — la lumière verte : l'eau, la pierre pâle, la rosée
      '#8fb173', // 1 — le vert d'herbe
      '#3f6b4e', // 2 — le vert d'ombre : la terre humide, la mousse
      '#b0632f', // 3 — le roux des feuilles mortes et des brindilles
    ],
    ink: '#16241d',
  },

  bounds: { min: [300, -6, -120], max: [520, 60, 100] },

  boxes: decor(),

  stations: [
    // 1. Le galet blanc du seuil. Vu dès l'entrée, à 0,92 — presque trois sauts.
    //    La brindille qui y mène est de l'autre côté : il faut contourner.
    [318.2, 0.92, -6.0],
    // 2. La mousse du grand galet, à 3,30. Sept fois la taille du joueur. On le
    //    contourne par le sud sans le gravir, jusqu'à voir la branche couchée.
    [374.8, 3.3, -1.4],
    // 3. L'île, au milieu de la flaque. À 0,60, soit 1,06 au-dessus de l'eau :
    //    celui qui traverse à gué le voit et ne l'atteint pas. La feuille est
    //    la réponse.
    [441.8, 0.6, -0.9],
    // 4. Le sommet de la coquille, à 3,66. Depuis la première spire on en est à
    //    quatre-vingts centimètres — et le saut n'en fait que trente-deux.
    [484.1, 3.66, -3.4],
  ],

  entree: [310, 0, 0],
  sortie: [510, 0, 0],
};

// Les trois nombres du joueur servent à calibrer, pas à décorer : on les
// rappelle ici pour que personne ne retouche une hauteur « à l'œil ».
export const CALIBRAGE_JARDIN = { taille: 0.45, enjambee: ENJAMBEE, saut: SAUT, marche: MARCHE };
