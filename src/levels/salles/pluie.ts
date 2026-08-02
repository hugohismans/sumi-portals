import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA PLUIE — une cour lavée par l'averse, traversée à quarante-cinq centimètres.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE NE DEMANDE PAS
 *
 * Rien. Pas une caisse, pas un logement, pas une hauteur à trouver. Une seule
 * sortie, en face de l'entrée, visible depuis le seuil. C'est délibéré : trois
 * salles-énigmes d'affilée usent le joueur, et il cesse de regarder. Celle-ci
 * est là pour qu'il regarde.
 *
 * Mais une respiration mal faite est du remplissage, et une respiration qui
 * égare est une énigme ratée. Deux règles, donc, tenues au centimètre :
 *
 *   — RIEN ICI NE SE FRANCHIT AUTREMENT QU'EN MARCHANT. Aucun écart de niveau
 *     de cette salle ne dépasse 0,186, contre une enjambée de 0,225. Pas un
 *     seul saut n'est nécessaire nulle part, et il n'existe aucun creux dont on
 *     ne remonte pas — le plus profond fait 0,18, soit MARCHE.
 *   — LA SORTIE EST DANS L'AXE DE L'ENTRÉE, à vingt-sept mètres, et le couloir
 *     qui les relie (z ∈ [999 ; 1001]) est vide de tout ce qui dépasse l'œil.
 *     Voir « LA LIGNE DE VUE » plus bas : c'est une propriété vérifiée, pas
 *     une impression.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE DONNE
 *
 * L'ÉCHELLE DES CHOSES ORDINAIRES. Une cour de dix mètres sur vingt-six, comme
 * il y en a derrière n'importe quelle maison. Vue de 0,45 m, c'est une place de
 * village : soixante fois sa taille en longueur. Le dallage devient un
 * pavement, la rigole du caniveau devient un canal qu'on longe, la flaque
 * devient un lac, la feuille tombée dedans devient un radeau, le seau sous
 * l'auvent devient une citerne, le pied du banc devient un pilier et le dessous
 * du banc une galerie sèche où l'on marche debout.
 *
 * Rien de fabuleux, et c'est tout le sujet : ce qui rend une cour de pluie
 * mémorable à quarante-cinq centimètres, ce n'est pas la pluie.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE INSTALLE EN DOUCE — et aucune énigme n'en dépend
 *
 *   À CETTE TAILLE, TOUT CE QUI TOMBE TOMBE VITE.
 *
 * Le nombre exact, parce qu'il ne se devine pas. MESURES.md : le temps de
 * chute vaut t = √(d / 13·échelle), et il DOUBLE à chaque cran vers le petit.
 * Le joueur, à ×1/4, tombe donc DEUX FOIS PLUS LENTEMENT qu'à ×1 — mais la
 * pluie, l'eau de la rigole et le jet de la goulotte sont des choses du MONDE :
 * elles tombent à la vitesse du monde. À ×1/4, tout ce qui n'est pas vous
 * tombe deux fois plus vite que vous.
 *
 * C'est ça qu'on lui montre, et on le lui montre une vingtaine de fois sans
 * jamais le nommer :
 *
 *   1. la nappe qui tombe du bord de l'auvent, 1,47 m — trois fois sa taille ;
 *   2. le jet de la goulotte du puits, 0,45 m — exactement sa taille, à deux
 *      pas du chemin, et c'est celui-là qu'il verra le mieux ;
 *   3. la chute d'eau au bord de la première terrasse, 0,19 m, en travers du
 *      chemin, qu'il enjambe sans y penser ;
 *   4. les deux cascades de la grande rigole, 0,186 chacune ;
 *   5. la ligne d'égouttement entre les deux planches du banc, sous laquelle
 *      il peut se tenir debout et regarder tomber ;
 *   6. et la pluie elle-même, partout, qui s'écrase.
 *
 * Trois salles plus loin, dans un puits de quarante mètres, il ne se dira pas
 * qu'on le lui a appris.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RÈGLE 8 DU CONTRAT — quel lieu connu cette salle revisite
 *
 * LA COUR du tout premier niveau (`levels/level01.ts`, « La cour ») : un
 * rectangle creusé, une margelle, et l'apprentissage qu'un trou est un piège
 * ou une marche selon la taille qu'on a. On la retrouve ici retournée comme un
 * gant : ce n'est plus le joueur qui tombe dans la cour, c'est la cour qui est
 * pleine d'eau qui tombe ; la margelle n'est plus un rebord qu'on enjambe à ×4,
 * c'est un puits où l'on ne peut plus regarder — son bord est à 0,55 et le saut
 * n'en fait que 0,323. Le même objet, la même géométrie, et l'inverse exact de
 * la leçon.
 *
 * RÈGLE 9 — l'étalon. Les deux ouvertures sont taillées à 2,30 de large sur
 * 3,00 de haut, c'est-à-dire AUTOUR de la petite face standard d'un portail
 * (1,90 × 2,80, cf. `core/constants.ts`). L'assemblage peut y poser une paire
 * sans toucher à ce fichier, et le joueur retrouve la porte qu'il a vue partout
 * ailleurs — sauf qu'ici elle fait six fois sa taille. C'est ça, le mètre-ruban :
 * il n'a pas besoin qu'on lui dise qu'il est petit, il a besoin de reconnaître
 * quelque chose.
 *
 * RÈGLE 11 — aucun logement dans cette salle. Elle ne demande rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PLAN, d'ouest en est (l'eau et le joueur vont dans le même sens)
 *
 *   z=1007 ┌───────────────────────────────────────────────────────┐ mur nord
 *          │ [auvent] [baquet]  ═══ la grande rigole ═══ [avaloir] │
 *   z=1005 │      ↓ la nappe    ↓cascade   ↓cascade         ↓      │
 *   z=1002 │                                                       │
 *   z=1000 →seuil ······················· le chemin ········· seuil→
 *          │        ~jet~   [le lac]      [le fossé]               │
 *   z=997  │  [le puits]                          [le banc][balai] │
 *   z=993  └───────────────────────────────────────────────────────┘ mur sud
 *          x=-212                                             x=-186
 *
 * TROIS TERRASSES, pas une pente. Une cour se draine, et la vraie pente d'une
 * cour vaut 1,5 % — sur vingt-six mètres, trente-six centimètres. Plutôt que
 * d'incliner (ce qu'une boîte alignée sur les axes ne sait pas faire), on prend
 * ce dénivelé en deux marches de 0,18 en travers de toute la cour, aux abscisses
 * x = −204 et x = −196. 0,18 est MARCHE : les quatre cinquièmes de l'enjambée,
 * la marge d'erreur du joueur. On les monte et on les descend sans les voir, et
 * c'est là que l'eau tombe.
 *
 * LA LIGNE DE VUE, et c'est la seule chose de cette salle qui ne se négocie pas.
 * L'œil du joueur est à 0,92 × 0,45 = 0,414 au-dessus de ses pieds. Dans la
 * bande z ∈ [999,00 ; 1001,20] qui relie les deux seuils, RIEN ne dépasse 0,03 :
 *   — le puits s'arrête à z = 998,30 (sa margelle, à 0,53, est le seul objet de
 *     la cour plus haut que l'œil, et il est au sud) ;
 *   — la goulotte s'arrête à z = 998,80 et son jet, qui est fantôme, à 998,89 ;
 *   — le banc est à z ≤ 995,7, le baquet à z ≥ 1003,9, les poteaux de l'auvent
 *     à z ≥ 1001,7 ET à 1,3 de haut, donc au-dessus du champ ;
 *   — sur le chemin même il ne reste que du plat : le lac, le fossé, les filets
 *     d'eau et les deux marches de terrasse. Or une marche qui DESCEND ne cache
 *     rien de ce qui est derrière.
 * Depuis le seuil ouest, la sortie est un rectangle clair au bout de vingt-sept
 * mètres de dalles mouillées. Il n'y a rien à chercher, et si le joueur ne
 * regarde pas devant lui, la rigole coule vers la sortie.
 *
 * LA COULEUR. Le jardin était vert d'ombre et humide ; la côte rouge, brûlante.
 * Ici tout est lavé : pierre grise trempée, ardoise, eau. Le seul ton chaud est
 * le BOIS — l'auvent, le baquet, le banc, le balai — et il veut dire une seule
 * chose : « ceci a été posé là par une main, et c'est sec dessous ». Même trait
 * d'encre, mêmes aplats, même grain : un seul dessinateur, une autre averse.
 */

type V3 = [number, number, number];

/** Toute boîte d'ici porte `region: 'pluie'`. Aucune ne peut l'oublier. */
const box = (
  min: V3,
  max: V3,
  ink = 1,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'pluie', ...opts });

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

// ─── Les nombres du joueur ───────────────────────────────────────────────────
// Il mesure 0,45 et il ne changera pas de taille ici. Tout ce qui suit s'y
// rapporte, et rien n'est jugé à vue.
const TAILLE = 0.45;
/** Franchi sans sauter. `PLAYER_HEIGHT × STEP_FRACTION × échelle` = 1,8 × 0,5 × 0,25. */
const ENJAMBEE = 0.225;
/** Quatre cinquièmes de l'enjambée : la marge d'erreur. Aucun écart de cette salle ne la dépasse. */
const MARCHE = 0.18;
/** Au-delà, c'est un mur — quoi qu'on en pense à l'œil. Ne sert ici qu'à INTERDIRE. */
const SAUT = 0.323;
/** Largeur du corps. Décide de l'écartement des barreaux : rien de plus serré ne se traverse. */
const LARGEUR = 0.17;
/** Hauteur de l'œil au-dessus des pieds. Décide de ce qui cache la sortie. */
const OEIL = TAILLE * 0.92;

// ═════════════════════════════════════════════════════════════════════════════
// LE DALLAGE — treize colonnes, cinq rangées, et trois terrasses
// ═════════════════════════════════════════════════════════════════════════════
//
// Des dalles de deux mètres. À notre taille c'est un grand pavement de cour ;
// à 0,45, chaque dalle fait quatre fois et demie la taille du joueur, et les
// joints qu'on encre dessinent une grille qui donne l'échelle du premier coup
// d'œil. C'est pour ça que le sol de cette salle est fait de soixante-sept
// boîtes et non d'une seule : ici le joint EST le décor.

/** Angle sud-ouest du dallage. */
const X0 = -212;
const Z0 = 994;
const DALLE = 2.0;
/** Treize colonnes : vingt-six mètres, soit cinquante-huit fois la taille du joueur. */
const NX = 13;
/** Cinq rangées de dallage plein ; la sixième (j = 5) est la rigole. */
const NZ = 5;

/** À quelle terrasse appartient la colonne `i`. Les marches tombent en x = −204 et x = −196. */
const terrasse = (i: number): number => (i < 4 ? 0 : i < 8 ? 1 : 2);

/**
 * Le dessus de la dalle (i, j).
 *
 * Trois termes, et chacun sert :
 *   −0,18 × terrasse : le dénivelé de drainage, pris en deux marches (voir plus
 *     haut). MARCHE exactement.
 *   −0,006 × i : la pente d'écoulement à l'intérieur d'une terrasse. Six
 *     millimètres d'une dalle à l'autre, c'est-à-dire 1,3 % de la taille du
 *     joueur : il ne le sent pas, mais l'eau, elle, sait de quel côté aller.
 *   −0,004 × j : la même chose vers le nord, c'est-à-dire VERS LA RIGOLE. Une
 *     cour ne se draine pas au hasard : elle penche vers son caniveau.
 *
 * Bénéfice technique gratuit : aucune dalle ne partage son dessus avec une
 * autre. Deux plans confondus se disputent la profondeur et grésillent, et
 * c'est le défaut le plus fréquent du projet.
 */
const solDalle = (i: number, j: number): number => -0.18 * terrasse(i) - 0.006 * i - 0.004 * j;

const colonne = (x: number): number =>
  Math.max(0, Math.min(NX - 1, Math.floor((x - X0) / DALLE)));
const rangee = (z: number): number => Math.max(0, Math.min(NZ, Math.floor((z - Z0) / DALLE)));

/** Le niveau du pavé sous un point. Sert à POSER, jamais à deviner. */
const sol = (x: number, z: number): number => solDalle(colonne(x), rangee(z));

// ─── Les trois dalles remarquables ───────────────────────────────────────────

/**
 * LE LAC — c'est-à-dire une flaque.
 *
 * Quatre dalles affaissées de 0,14, colonnes 5 et 6, rangées 2 et 3 : quatre
 * mètres sur quatre, soit neuf fois la taille du joueur en tous sens. La nappe
 * s'arrête à 0,35 des bords — cette grève de pierre mouillée évite que l'eau
 * et la paroi ne se touchent (deux faces dans le même plan), et elle donne au
 * lac un rivage.
 *
 * ON N'Y EST PAS PIÉGÉ, et ce n'est pas un hasard : l'eau est un SOL dans ce
 * moteur, on marche dessus. Sa surface est à 0,032 sous la plus basse des
 * berges. On y descend d'un pas et on en remonte d'un pas. Le creux de 0,14
 * n'existe que sous la nappe, là où personne ne pose le pied.
 *
 * Le lac est posé en colonnes 5-6 et non 4-5 pour une raison mesurée : en
 * colonne 4, sa berge ouest aurait été le NEZ DE LA MARCHE DE TERRASSE, et il
 * aurait fallu remonter 0,186 + 0,043 = 0,229 pour repartir vers l'ouest —
 * quatre millimètres de plus que l'enjambée. Quatre millimètres, et la salle
 * devenait un piège à sens unique.
 */
const LAC_I = [5, 6];
const LAC_J = [2, 3];
const LAC_CREUX = 0.14;
/** Dessus de la nappe. 0,032 sous la plus basse berge (colonne 7, −0,230). */
const LAC_EAU = -0.262;

/**
 * LE FOSSÉ — une dalle descellée qui a glissé.
 *
 * Colonne 9, rangées 2 et 3 : la dalle a fui de 0,35 vers l'est et s'est
 * enfoncée de 0,03, ouvrant une crevasse de 0,25 sur son flanc ouest. Le lit
 * de sable est 0,136 plus bas.
 *
 * Le brief disait « une dalle disjointe de 30 cm est un fossé à sauter ». C'est
 * vrai, et c'est exactement pour ça que celui-ci n'en fait que 25 et ne se
 * saute pas : une respiration n'exige rien. On descend le pied dedans, on
 * remonte de 0,10 sur la dalle qui a glissé. Ce qu'il en reste, c'est l'image —
 * une faille de la longueur du joueur en travers du chemin, avec de l'eau noire
 * au fond. La leçon du saut se donne ailleurs.
 */
const FOSSE_I = 9;
const FOSSE_J = [2, 3];
const FOSSE_GLISSE = 0.35;
const FOSSE_TASSE = 0.03;
const FOSSE_LIT = 0.136;

const dallage = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const r = rng(19041104);

  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const creuse = LAC_I.includes(i) && LAC_J.includes(j);
      const glisse = i === FOSSE_I && FOSSE_J.includes(j);

      // Chaque dalle DÉBORDE de 5 cm sur ses voisines, et son débord dépend de
      // ses indices. Deux conséquences : aucune arête n'est jamais dans le même
      // plan qu'une autre, et les dalles se mordent au lieu de se toucher bout à
      // bout — c'est la règle 2 du contrat des régions, appliquée soixante-cinq
      // fois d'affilée.
      const x0 = X0 + i * DALLE - 0.05 - 0.003 * j + (glisse ? FOSSE_GLISSE : 0);
      const x1 = X0 + (i + 1) * DALLE + 0.05 + 0.004 * j + (glisse ? FOSSE_GLISSE : 0);
      const z0 = Z0 + j * DALLE - 0.05 - 0.003 * i;
      const z1 = Z0 + (j + 1) * DALLE + 0.05 + 0.004 * i;
      const haut = solDalle(i, j) - (creuse ? LAC_CREUX : 0) - (glisse ? FOSSE_TASSE : 0);
      // Fond propre à chaque dalle : même enterrée, une face basse partagée
      // reste une face partagée.
      const bas = -1.2 - 0.002 * i - 0.0013 * j;

      // Trois gris pour un pavement : sans cette variété, soixante-cinq dalles
      // identiques se lisent comme un carrelage de salle de bains. La graine est
      // fixe, donc le dessin est le même à chaque partie.
      const teinte = creuse ? 2 : r() < 0.22 ? 0 : r() < 0.24 ? 2 : 1;
      out.push(box([x0, bas, z0], [x1, haut, z1], teinte));
    }
  }

  // ─── Les deux dalles du nord-ouest, sous l'auvent ──────────────────────────
  // La rigole ne commence qu'en colonne 2, sous le bord de l'auvent : ici le
  // sol est plein, et c'est le seul coin sec de la cour. Il monte jusqu'à
  // 1006,45 pour être enterré dans le mur nord — sans ça, un liseré de vide de
  // vingt centimètres au pied du mur.
  for (let i = 0; i < 2; i++) {
    out.push(
      box(
        [X0 + i * DALLE - 0.06 - 0.002 * i, -1.213 - 0.0011 * i, 1003.94 - 0.002 * i],
        [X0 + (i + 1) * DALLE + 0.06 + 0.003 * i, solDalle(i, 5), 1006.45 + 0.003 * i],
        1,
      ),
    );
  }

  // ─── La nappe du lac ───────────────────────────────────────────────────────
  out.push(
    box(
      [X0 + LAC_I[0] * DALLE + 0.35, solDalle(6, 3) - LAC_CREUX - 0.02, Z0 + LAC_J[0] * DALLE + 0.35],
      [X0 + (LAC_I[1] + 1) * DALLE - 0.35, LAC_EAU, Z0 + (LAC_J[1] + 1) * DALLE - 0.35],
      0,
    ),
  );

  // LE RADEAU. Une feuille tombée dans le lac, longue de 0,65 : une fois et
  // demie la taille du joueur. Elle est POSÉE, pas flottante — elle ne dérive
  // pas, et c'est mieux ainsi : un radeau qui n'emmène nulle part est une
  // déception, un radeau qu'on regarde est une image. Elle s'enfonce de 0,022
  // dans la nappe pour n'avoir aucune face à son niveau.
  out.push(box([-201.62, LAC_EAU - 0.022, 1000.31], [-200.97, LAC_EAU + 0.018, 1000.75], 2));

  // ─── Le lit du fossé ───────────────────────────────────────────────────────
  // Du sable tassé, 0,136 sous la dalle amont. On y descend, on en remonte de
  // 0,10 côté est et de 0,136 côté ouest : les deux sous l'enjambée.
  const zf0 = Z0 + FOSSE_J[0] * DALLE - 0.3;
  const zf1 = Z0 + (FOSSE_J[1] + 1) * DALLE + 0.3;
  out.push(
    box(
      [X0 + FOSSE_I * DALLE - 0.45, -1.352, zf0],
      [X0 + FOSSE_I * DALLE + 0.62, solDalle(FOSSE_I, 2) - FOSSE_LIT, zf1],
      2,
    ),
  );
  // L'eau noire au fond de la faille. Elle laisse 4 cm de sable de chaque côté.
  out.push(
    box(
      [X0 + FOSSE_I * DALLE - 0.41, -1.31, zf0 + 0.04],
      [X0 + FOSSE_I * DALLE + 0.58, solDalle(FOSSE_I, 2) - FOSSE_LIT + 0.045, zf1 - 0.04],
      0,
    ),
  );

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LA GRANDE RIGOLE — c'est-à-dire le canal, et le fil conducteur de la salle
// ═════════════════════════════════════════════════════════════════════════════
//
// Elle court sur toute la longueur de la cour, au pied du mur nord, et elle va
// d'ouest en est : DANS LE SENS DU JOUEUR. C'est le plus sûr des balisages,
// parce qu'il ne demande pas qu'on lève les yeux. Un joueur perdu regarde ses
// pieds ; l'eau qui coule à sa gauche lui dit où est la sortie.
//
// LES COTES, et pourquoi chacune vaut ce qu'elle vaut :
//
//   FOND = pavé − 0,18. C'est MARCHE, la seule profondeur qui garantisse qu'on
//     ressorte par le sud en marchant. Un canal de 0,25 aurait exigé un saut de
//     0,25 pour un maximum de 0,323 : jouable, donc jouable une fois sur deux,
//     donc un piège pour qui a de mauvais doigts. Il n'y en aura pas ici.
//   LARGEUR UTILE = 1,00, soit 2,2 fois la taille du joueur et six fois sa
//     largeur. Assez large pour qu'on la lise comme une rivière, assez étroite
//     pour qu'on voie l'autre berge.
//   EAU = fond + 0,07. On patauge dedans à mi-tibia. La berge, depuis l'eau,
//     fait encore 0,11 : de la hauteur de la ceinture.
//   PLINTHE NORD = pavé + 0,10. C'est le trottoir au pied du mur, et il est
//     là pour l'image : un rebord de 12 cm est une marche haute quand on fait
//     45 cm. Depuis le fond de la rigole il faudrait franchir 0,28 pour y
//     monter — plus que l'enjambée : ON NE SORT DE LA RIGOLE QUE PAR LE SUD,
//     c'est-à-dire du côté du chemin. C'est voulu.
//
// LES DEUX CASCADES tombent aux marches de terrasse (x = −204 et x = −196),
// c'est-à-dire au même endroit que les marches du dallage. Le fond du canal
// suit exactement le pavé : la rigole n'est jamais plus profonde à l'est qu'à
// l'ouest, et c'est ce qui empêche qu'elle devienne une tranchée dont on ne
// remonte pas.

/** Première colonne du canal : sous le bord de l'auvent. */
const RIG_I0 = 2;
const RIG_FOND = 0.18;
const RIG_EAU = 0.07;
const RIG_PLINTHE = 0.10;

const rigole = (): BoxDef[] => {
  const out: BoxDef[] = [];

  for (let i = RIG_I0; i < NX; i++) {
    const x0 = X0 + i * DALLE;
    const x1 = X0 + (i + 1) * DALLE;
    const pave = solDalle(i, 5);

    // La berge sud : une bande de dalle qui complète la rangée 4 jusqu'au
    // canal. Elle chevauche la rangée 4 de 15 cm ; son dessus est celui de la
    // rangée 5, donc jamais dans le plan de la rangée 4.
    out.push(
      box(
        [x0 - 0.05 - 0.002 * i, -1.243 - 0.0017 * i, 1003.93 - 0.002 * i],
        [x1 + 0.05 + 0.003 * i, pave, 1004.75 + 0.004 * i],
        1,
      ),
    );

    // Le fond du canal. Il court SOUS la berge et SOUS la plinthe (0,15 et 0,10
    // de morsure) : ses propres flancs sont donc enterrés, et les seules parois
    // visibles du canal sont les tranches de la berge et de la plinthe.
    // La colonne 2 est 0,06 plus creuse : c'est l'affouillement sous la nappe
    // de l'auvent, là où l'eau tombe de 1,47 m depuis vingt ans.
    const creuse = i === RIG_I0 ? 0.06 : 0;
    out.push(
      box(
        [x0 - 0.06 - 0.0021 * i, -1.317 - 0.0021 * i, 1004.61 - 0.003 * i],
        [x1 + 0.06 + 0.0024 * i, pave - RIG_FOND - creuse, 1005.86 + 0.002 * i],
        2,
      ),
    );

    // L'eau. Elle s'arrête à 5 cm des parois visibles, pour la même raison que
    // la nappe du lac : deux plans qui se touchent grésillent.
    out.push(
      box(
        [x0 - 0.02 - 0.0013 * i, pave - RIG_FOND - creuse - 0.04, 1004.8],
        [x1 + 0.02 + 0.0016 * i, pave - RIG_FOND - creuse + RIG_EAU, 1005.7],
        0,
      ),
    );

    // La plinthe du mur nord. Son dessus reçoit ce qui ruisselle du mur.
    out.push(
      box(
        [x0 - 0.055 - 0.0019 * i, -1.281 - 0.0019 * i, 1005.72 - 0.002 * i],
        [x1 + 0.055 + 0.0026 * i, pave + RIG_PLINTHE, 1006.47 + 0.003 * i],
        1,
      ),
    );
  }

  // ─── Les deux cascades ─────────────────────────────────────────────────────
  // Une lame d'eau au nez de chaque marche de terrasse. Fantômes : de l'eau qui
  // tombe n'arrête personne, et surtout on ne veut pas d'une marche invisible
  // au milieu du canal.
  for (const i of [4, 8]) {
    const x = X0 + i * DALLE;
    const amont = solDalle(i - 1, 5) - RIG_FOND + RIG_EAU;
    const aval = solDalle(i, 5) - RIG_FOND;
    out.push(box([x - 0.09, aval, 1004.83], [x + 0.05, amont, 1005.66], 0, { ghost: true }));
  }

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// L'AVALOIR — là où l'eau sort, et le joueur avec elle
// ═════════════════════════════════════════════════════════════════════════════
//
// Le canal finit sur une grille, à trois mètres de la porte de sortie. C'est le
// dernier mot du balisage : l'eau et vous quittez la cour par le même bout.
//
// LES BARREAUX sont espacés de 0,09 pour une largeur de joueur de 0,17. Il n'y
// passe pas, donc il ne tombe pas dedans, donc il n'y a rien à protéger — et
// c'est la seule façon honnête de mettre un trou noir sous les pieds de
// quelqu'un sans lui tendre un piège. Six barreaux, cinq intervalles.
const avaloir = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const pave = solDalle(12, 5);
  const fond = pave - RIG_FOND;
  const xg0 = -187.0;

  // Le puisard : une gueule sombre sous la grille. Aucun fond dessiné — c'est
  // ce qu'on doit voir, et ce qu'on ne peut pas atteindre.
  out.push(box([xg0 - 0.08, -1.34, 1004.72], [-186.24, fond - 0.02, 1005.78], 2));
  out.push(box([xg0 + 0.02, -1.31, 1004.86], [-186.34, -0.92, 1005.64], 0)); // l'eau, tout au fond

  // Les six barreaux, en travers du canal. Leur dessus affleure 2 cm sous la
  // berge : on marche dessus sans le sentir, et rien n'est coplanaire.
  for (let k = 0; k < 6; k++) {
    const x = xg0 + k * 0.16;
    out.push(box([x, fond + 0.03, 1004.7 - 0.002 * k], [x + 0.07, pave - 0.02 - 0.003 * k, 1005.82 + 0.002 * k], 2));
  }

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LE PUITS — c'est-à-dire la margelle de « La cour », revue de tout en bas
// ═════════════════════════════════════════════════════════════════════════════
//
// Huit pierres de taille en octogone, et de l'eau noire à onze centimètres du
// bord. C'est l'objet qui donne l'échelle à toute la salle : une margelle de
// cour, de celles qu'on enjambe distraitement à notre taille, dont le bord est
// ici À 0,55 — c'est-à-dire au-dessus du saut de 0,323, et une fois et quart la
// taille du joueur. Il en fait le tour, il entend l'averse tambouriner dedans,
// il ne verra jamais ce qu'il y a à la surface. C'est la seule frustration de
// la salle et elle ne coûte rien.
//
// ON N'Y TOMBE PAS, deux fois plutôt qu'une :
//   — le bord fait 0,55, le saut 0,323, et rien de grimpable n'est à moins de
//     trois mètres. On n'y monte pas ;
//   — et si l'on y était, l'eau est un sol dans ce moteur : on se tiendrait
//     dessus à 0,11 sous le bord, donc on ressortirait en marchant.
// La deuxième garantie ne sert jamais. C'est exactement pourquoi elle est là.
//
// LA GOULOTTE, en revanche, est ce qu'on retient. Une pierre creusée qui sort
// du puits vers le nord et déverse un fil d'eau qui tombe de 0,455 sur le
// dallage : LA TAILLE DU JOUEUR, à deux pas du chemin, en continu. C'est le
// meilleur poste d'observation de la salle pour la seule leçon qu'elle donne.

const PUITS_X = -206.6;
/**
 * 997,05 et non 997,60, et ce demi-mètre a été mesuré, pas choisi.
 *
 * À 997,60, le bec de la goulotte montait à z = 999,35 et culminait à 0,45 —
 * au-dessus de l'œil du joueur (0,414). Depuis le MILIEU du seuil ouest, la
 * sortie restait parfaitement dégagée ; mais un joueur collé au jambage SUD de
 * la porte d'entrée voyait la pierre de l'auge mordre le coin bas de la porte
 * d'en face. Quatre rayons sur cent, dans un angle que personne ne prendrait.
 *
 * On l'a quand même reculé. Une salle qui ne demande rien n'a le droit à aucune
 * exception : « la sortie se voit depuis l'entrée » doit être vrai depuis TOUTE
 * l'entrée, sinon ce n'est pas une propriété, c'est une chance.
 */
const PUITS_Z = 997.05;
/** Hauteur du bord au-dessus du pavé. 1,7 fois le saut : la question ne se pose pas. */
const PUITS_BORD = 0.55;
/** Niveau de l'eau. 0,11 sous le bord — un puits plein à ras, en pleine averse. */
const PUITS_EAU = 0.44;

const puits = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const pave = sol(PUITS_X, PUITS_Z);

  /**
   * Une pierre de la margelle. `cote` est le demi-côté extérieur, `ouv` le
   * demi-côté intérieur. Chaque pierre reçoit sa propre hauteur (à quelques
   * millimètres près) et son propre débord : une margelle de puits n'a jamais
   * deux pierres identiques, et surtout deux dessus au même niveau sont deux
   * plans qui se disputent la profondeur.
   */
  const pierre = (k: number, dx: number, dz: number, lx: number, lz: number): void => {
    const h = pave + PUITS_BORD + (k % 3) * 0.012 - k * 0.003;
    out.push(
      box(
        [PUITS_X + dx - lx, pave - 0.55 - 0.01 * k, PUITS_Z + dz - lz],
        [PUITS_X + dx + lx, h, PUITS_Z + dz + lz],
        2,
      ),
    );
  };

  // Quatre côtés, quatre coins. Les coins mordent dans les côtés de 10 cm :
  // aucune face interne n'est à l'air libre, et l'octogone se lit.
  pierre(0, 0, 1.02, 0.56, 0.23); // nord
  pierre(1, 0, -1.02, 0.54, 0.23); // sud
  pierre(2, 1.02, 0, 0.23, 0.55); // est
  pierre(3, -1.02, 0, 0.23, 0.53); // ouest
  pierre(4, 0.76, 0.76, 0.35, 0.35); // nord-est
  pierre(5, -0.76, 0.76, 0.34, 0.36); // nord-ouest
  pierre(6, 0.76, -0.76, 0.36, 0.34); // sud-est
  pierre(7, -0.76, -0.76, 0.35, 0.33); // sud-ouest

  // L'eau du puits. Elle déborde de 15 cm sous les pierres : ses propres flancs
  // sont enterrés, et l'on ne voit qu'un disque noir dans un trou.
  out.push(
    box([PUITS_X - 0.94, -1.4, PUITS_Z - 0.94], [PUITS_X + 0.94, pave + PUITS_EAU, PUITS_Z + 0.94], 0),
  );

  // ─── LA GOULOTTE ───────────────────────────────────────────────────────────
  // Une auge de pierre qui sort au nord, son fond 0,15 sous le bord de la
  // margelle : c'est par là que le trop-plein s'en va. Ses joues montent à
  // 0,47, donc au-dessus du saut : on ne s'en sert pas pour monter, on la
  // regarde couler.
  const fond = pave + 0.40;
  out.push(box([PUITS_X - 0.26, pave + 0.24, PUITS_Z + 0.72], [PUITS_X + 0.26, fond, PUITS_Z + 1.73], 2));
  out.push(box([PUITS_X - 0.35, pave + 0.26, PUITS_Z + 0.7], [PUITS_X - 0.24, pave + 0.47, PUITS_Z + 1.75], 2));
  out.push(box([PUITS_X + 0.24, pave + 0.28, PUITS_Z + 0.7], [PUITS_X + 0.35, pave + 0.465, PUITS_Z + 1.75], 2));
  // L'eau dans l'auge, 3,5 cm d'épaisseur, qui va jusqu'au bec.
  out.push(box([PUITS_X - 0.235, fond - 0.02, PUITS_Z + 0.66], [PUITS_X + 0.235, fond + 0.035, PUITS_Z + 1.76], 0));

  // LE JET. Fantôme : une colonne d'eau n'arrête pas un joueur, et surtout on
  // ne veut pas d'un poteau invisible à côté du chemin. Il tombe de 0,455 —
  // exactement la taille du joueur — et c'est le plus long spectacle gratuit
  // de la salle.
  out.push(
    box([PUITS_X - 0.13, sol(PUITS_X, PUITS_Z + 1.8) - 0.02, PUITS_Z + 1.69],
        [PUITS_X + 0.13, fond + 0.03, PUITS_Z + 1.84], 0, { ghost: true }),
  );

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LE FILET D'EAU — ce que le puits envoie au lac, et la troisième chute
// ═════════════════════════════════════════════════════════════════════════════
//
// De l'eau étalée sur le dallage, deux centimètres d'épaisseur, qui suit les
// joints vers l'est. On marche dedans sans y penser (deux centimètres, c'est
// 4 % de la taille du joueur) et c'est justement l'intérêt : c'est un décor
// qu'on TRAVERSE, et il indique le même est que tout le reste.
//
// Entre les deux, au nez de la première marche de terrasse, une chute de 0,19
// EN TRAVERS DU CHEMIN. C'est la plus regardée des six chutes de la salle,
// parce que c'est la seule qu'on enjambe.
const filetDEau = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // Amont : de la flaque d'éclaboussure du jet jusqu'au bord de la terrasse.
  out.push(box([-206.95, -0.05, 998.5], [-204.05, -0.0135, 999.05], 0));
  // La chute au nez de la marche.
  out.push(box([-204.12, -0.208, 998.56], [-203.9, -0.0155, 999.0], 0, { ghost: true }));
  // Aval : jusqu'au rivage du lac.
  out.push(box([-204.02, -0.238, 998.58], [-202.08, -0.2045, 999.11], 0));
  // Le dernier ressaut, dans le lac.
  out.push(box([-202.09, -0.356, 998.62], [-201.9, -0.2065, 999.06], 0, { ghost: true }));

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// L'AUVENT ET LE BAQUET — le seul coin sec, et la première image de la salle
// ═════════════════════════════════════════════════════════════════════════════
//
// On entre, on regarde à gauche : un appentis de planches contre le mur, deux
// poteaux, et sous l'auvent un baquet plein à ras bord. Du bord du toit tombe
// une nappe d'eau de 1,47 m — TROIS FOIS ET DEMIE la taille du joueur — qui
// s'écrase dans la tête de la rigole, laquelle part vers l'est, vers la porte.
// La salle entière est lisible depuis le seuil, et personne n'a rien expliqué.
//
// LES COTES :
//   Dessous du toit à 1,30 au-dessus du pavé, soit 2,9 fois la taille du
//     joueur. On y marche debout, largement, et l'on y est au sec : c'est le
//     seul endroit de la cour où rien ne tombe.
//   Le bord du toit est en x = −207,90 et la rigole commence en x = −208,00 :
//     la nappe tombe donc DANS le canal, à dix centimètres près. Ce n'est pas
//     de l'orfèvrerie, c'est ce qui fait que l'image se lit.
//   Poteaux de 0,22 de côté — la moitié de la taille du joueur — écartés de
//     3,2 m. On passe entre eux sans les voir.
const AUVENT_X1 = -207.9;
const auvent = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // Le toit, une seule volée de planches. Il est enterré dans le mur ouest et
  // dans le mur nord : aucune de ses faces d'appui n'est à l'air libre.
  out.push(box([-212.2, 1.3, 1001.32], [AUVENT_X1, 1.465, 1006.42], 3));
  // La panne de rive, au bord : c'est elle qui fait la ligne d'égouttement.
  out.push(box([-208.16, 1.155, 1001.4], [-207.96, 1.295, 1006.4], 3));
  // Quatre chevrons dessous. Ils donnent l'épaisseur et le sens du toit.
  for (let k = 0; k < 4; k++) {
    const z = 1001.62 + k * 1.42;
    out.push(box([-212.1, 1.18 + k * 0.002, z], [-208.02 - 0.01 * k, 1.312, z + 0.12], 3));
  }
  // Les deux poteaux. Plantés 0,75 sous le pavé : pas de face basse à l'air libre.
  for (const z of [1001.74, 1005.16]) {
    out.push(box([-208.72, -0.75, z], [-208.5, 1.342, z + 0.22], 3));
  }

  // ─── LE BAQUET ─────────────────────────────────────────────────────────────
  // Un cuvier de bois, 0,95 de côté et 0,66 de haut : une fois et demie la
  // taille du joueur, et deux fois sa taille en largeur. Plein à déborder — il
  // pleut depuis longtemps. Une douve du nord a cédé et l'eau passe par-dessus.
  //
  // ON N'Y ENTRE PAS : 0,66 contre un saut de 0,323. Et si l'on y était, l'eau
  // est à 0,50 pour un bord à 0,60 : on en ressortirait de dix centimètres.
  const bx = -210.5;
  const bz = 1004.4;
  const bs = sol(bx, bz);
  const D = 0.475; // demi-côté extérieur
  const E = 0.09; // épaisseur des douves
  // Quatre parois. Celle du nord (la brèche) est 0,13 plus basse que l'eau
  // n'est haute : c'est par là que ça déborde, et ça se voit de l'entrée.
  const parois: [number, number, number, number, number][] = [
    [bx - D + E, bz + D - E, D - E, E, 0.47], // nord — la brèche
    [bx - D + E, bz - D, D - E, E, 0.6], // sud
    [bx + D - E, bz - D + E, E, D - E, 0.615], // est
    [bx - D, bz - D + E, E, D - E, 0.63], // ouest
  ];
  parois.forEach(([px, pz, lx, lz, h], k) => {
    out.push(box([px, bs - 0.28 - 0.006 * k, pz], [px + lx * 2, bs + h, pz + lz * 2], 3));
  });
  // Quatre montants d'angle, plus hauts que les douves : les oreilles du cuvier.
  const coins: [number, number][] = [
    [bx - D, bz - D],
    [bx + D - 0.15, bz - D],
    [bx - D, bz + D - 0.15],
    [bx + D - 0.15, bz + D - 0.15],
  ];
  coins.forEach(([px, pz], k) => {
    out.push(box([px, bs - 0.31 - 0.004 * k, pz], [px + 0.15, bs + 0.68 + 0.007 * k, pz + 0.15], 3));
  });
  // L'eau, à 0,50. Elle passe de 3 cm par-dessus la brèche du nord.
  out.push(box([bx - D + E + 0.01, bs - 0.2, bz - D + E + 0.01], [bx + D - E - 0.01, bs + 0.5, bz + D - E - 0.01], 0));
  // Le débordement : une lame qui coule sur la douve nord et jusqu'au pavé.
  out.push(box([bx - 0.19, bs + 0.02, bz + D - E], [bx + 0.19, bs + 0.505, bz + D + 0.03], 0, { ghost: true }));
  // Et le filet qui s'en va rejoindre la rigole, deux centimètres sur la dalle.
  out.push(box([bx - 0.2, bs - 0.028, bz + D], [bx + 0.2, bs - 0.006, 1005.4], 0));
  out.push(box([bx - 0.18, bs - 0.031, 1005.28], [-208.1, bs - 0.009, 1005.72], 0));

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LE BANC ET LE BALAI — la galerie sèche, et l'invitation
// ═════════════════════════════════════════════════════════════════════════════
//
// LE BANC est le meilleur objet de la salle, et c'est pour une seule raison :
// SON DESSOUS. Un banc de pierre a son assise à 0,64 du sol ; le joueur en fait
// 0,45. Il passe dessous, debout, avec onze centimètres au-dessus de la tête —
// et il y est au sec, entre deux pieds qui font chacun une fois et demie sa
// taille. Une galerie de quatre mètres sous un banc de jardin. C'est ça, la
// salle.
//
// L'ASSISE EST EN DEUX PLANCHES, séparées de 0,06. Le joint n'est pas un détail
// de menuiserie : c'est par là que la pluie tombe, en une ligne régulière, et
// c'est le SEUL endroit de la salle où le joueur peut se tenir DEBOUT SOUS une
// chute et la regarder de tout près. Six centimètres pour une largeur de joueur
// de 0,17 : il ne passe pas au travers, il ne fait que recevoir.
//
// LE BALAI appuyé contre le banc est la seule chose de la salle qui monte, et
// elle ne demande rien : six crans de 0,115, soit la moitié de l'enjambée. On
// n'y saute pas, on y MARCHE. En haut, on est sur l'assise, à 0,64 — au-dessus
// de tout ce qui traîne dans la cour — et l'on voit la rigole d'un bout à
// l'autre, les deux portes, et le puits. C'est la récompense de qui a eu envie
// de grimper sur un banc, et il n'y a pas d'autre récompense parce qu'il n'y a
// pas d'énigme.
//
// De là on ne s'échappe pas : 0,64 + 0,323 = 0,96 contre des murs à 3,2.

const BANC_X0 = -197.6;
const BANC_X1 = -191.4;
/** Dessous de l'assise. 0,56 au-dessus du pavé pour un joueur de 0,45 : il passe. */
const BANC_VIDE = 0.56;
const BANC_ASSISE = 0.65;

const banc = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const p = sol(-194.5, 995);

  // Les deux pieds. Des blocs taillés, plantés 0,34 sous le pavé.
  out.push(box([BANC_X0 + 0.3, p - 0.34, 994.05], [BANC_X0 + 1.2, p + BANC_VIDE + 0.02, 995.62], 2));
  out.push(box([BANC_X1 - 1.2, p - 0.36, 994.08], [BANC_X1 - 0.3, p + BANC_VIDE + 0.015, 995.58], 2));

  // Les deux planches. Elles mordent dans le mur sud (z = 993,95) : le banc est
  // adossé, comme tout banc de cour. Leurs dessus diffèrent de 4 mm.
  out.push(box([BANC_X0, p + BANC_VIDE, 993.92], [BANC_X1, p + BANC_ASSISE, 994.75], 3));
  out.push(box([BANC_X0 - 0.06, p + BANC_VIDE - 0.008, 994.81], [BANC_X1 + 0.05, p + BANC_ASSISE - 0.004, 995.66], 3));
  // La flaque sur l'assise : une planche gauchie retient l'eau, et c'est elle
  // qui alimente la ligne d'égouttement du joint.
  out.push(box([-196.2, p + BANC_ASSISE - 0.02, 994.06], [-193.1, p + BANC_ASSISE + 0.012, 994.72], 0));
  // La ligne qui tombe par le joint. Fantôme : c'est de l'eau.
  out.push(box([-196.0, p + 0.02, 994.765], [-193.3, p + BANC_VIDE - 0.01, 994.805], 0, { ghost: true }));

  // ─── LE BALAI ──────────────────────────────────────────────────────────────
  // Le manche, en six crans. Chaque cran monte de 0,115 et recule de 0,17 : la
  // pente d'un balai appuyé, et la moitié d'une enjambée. Il est large de 0,17,
  // c'est-à-dire exactement la largeur du joueur — on y tient, on n'y flâne pas.
  // Le sixième cran culmine 2,5 cm au-dessus de l'assise : on ne monte pas
  // dessus, on en descend.
  const MX = -194.68;
  for (let k = 0; k < 6; k++) {
    const z = 996.78 - k * 0.17;
    out.push(
      box(
        [MX - 0.004 * k, p + 0.1 + k * 0.115 - 0.075, z - 0.22],
        [MX + 0.17 + 0.005 * k, p + 0.1 + k * 0.115, z],
        3,
      ),
    );
  }
  // Les soies. Une touffe de tiges au pied du manche : à 0,45, un roncier. Rien
  // ne dépasse 0,20, donc rien n'est un obstacle et rien n'est une prise.
  const r = rng(7717);
  for (let k = 0; k < 11; k++) {
    const sx = MX - 0.16 + r() * 0.5;
    const sz = 996.86 + r() * 0.44;
    const h = 0.09 + r() * 0.11;
    out.push(box([sx, p - 0.06 - 0.002 * k, sz], [sx + 0.036, p + h, sz + 0.034], 3));
  }

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LES MURS, LES SEUILS, LES TOITS
// ═════════════════════════════════════════════════════════════════════════════
//
// Une cour est fermée : c'est ce qui en fait une cour, et c'est aussi ce qui
// rend la salle infaillible. Quatre murs de 3,2 — sept fois la taille du joueur,
// dix fois son saut — et exactement DEUX ouvertures, l'une en face de l'autre.
// Il n'y a pas de troisième chemin à chercher parce qu'il n'y a pas de
// troisième chemin.
//
// LES OUVERTURES font 2,30 de large sur 3,00 de haut. Ce n'est pas une cote
// décorative : la petite face standard d'un portail mesure 1,90 × 2,80
// (`core/constants.ts`), et l'assemblage doit pouvoir en poser une ici sans
// toucher à ce fichier. Il reste 20 cm de jour de chaque côté et 20 cm sous le
// linteau.
//
// LES SEUILS. Sans eux, il n'y a pas de sol dans l'épaisseur du mur et l'on
// tombe en franchissant sa propre porte. Ils dépassent le pavé de 3 cm : on le
// sent sous le pied, on ne bute pas dedans.
//
// TOUTES LES COTES SONT DÉCALÉES d'un mur à l'autre — hauteurs, fondations,
// débords. Quatre murs qui se rejoignent aux angles, c'est huit faces qui se
// chevauchent ; à cotes égales, huit plans confondus dans les quatre coins de
// la salle.

/** Milieu des deux ouvertures. La salle est symétrique sur cet axe. */
const AXE_Z = 1000;
const PORTE_DEMI = 1.15;
const PORTE_HAUT = 3.0;
const PORTE_O = -212.5;
const PORTE_E = -185.5;

const murs = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // Nord et sud, d'un bout à l'autre. Ils enterrent le pied des plinthes et le
  // bord du dallage.
  out.push(box([-213.62, -1.52, 1006.3], [-185.38, 3.22, 1007.86], 1));
  out.push(box([-213.71, -1.57, 992.44], [-185.29, 3.16, 993.98], 1));

  // Ouest et est, chacun en deux jambages et un linteau. Les jambages
  // s'enfoncent dans les murs nord et sud (z 992,3 → 1007,6) : les angles se
  // mordent au lieu de se toucher.
  const jambages: [number, number, number, number, number][] = [
    [-213.35, -211.72, -1.61, 3.28, 0], // ouest
    [-186.35, -184.6, -1.66, 3.1, 1], // est
  ];
  for (const [x0, x1, bas, haut, k] of jambages) {
    const zp = k === 0 ? AXE_Z : AXE_Z;
    out.push(box([x0, bas, 992.3 - 0.04 * k], [x1, haut, zp - PORTE_DEMI], 2));
    out.push(box([x0 + 0.02 * k, bas - 0.03, zp + PORTE_DEMI], [x1 - 0.01 * k, haut - 0.02, 1007.62 + 0.05 * k], 2));
    // Le linteau. Son dessus est 6 cm sous la crête du mur : un tableau de
    // porte se lit toujours en creux, et deux dessus au même niveau grésillent.
    out.push(
      box(
        [x0 + 0.05, PORTE_HAUT, zp - PORTE_DEMI - 0.12],
        [x1 - 0.04, haut - 0.06, zp + PORTE_DEMI + 0.12],
        2,
      ),
    );
  }

  // ─── Les seuils ────────────────────────────────────────────────────────────
  out.push(box([-213.46, -1.15, AXE_Z - 1.42], [-211.54, solDalle(0, 3) + 0.035, AXE_Z + 1.42], 0));
  out.push(box([-186.47, -1.19, AXE_Z - 1.38], [-184.53, solDalle(NX - 1, 3) + 0.03, AXE_Z + 1.38], 0));

  // ─── Les toits, derrière les murs ──────────────────────────────────────────
  // On ne les visite pas ; ils font la silhouette au-dessus de la crête, et ils
  // disent d'où vient toute cette eau. Quatre volées en gradins de chaque côté,
  // toutes de hauteurs différentes.
  for (let k = 0; k < 4; k++) {
    out.push(
      box(
        [-214.2 + 0.3 * k, 3.35 + k * 0.02, 1007.6 + k * 1.15],
        [-184.9 - 0.25 * k, 3.62 + k * 0.55, 1008.9 + k * 1.15],
        2,
      ),
    );
    out.push(
      box(
        [-214.5 + 0.26 * k, 3.28 + k * 0.017, 991.0 - k * 1.1],
        [-185.2 - 0.22 * k, 3.51 + k * 0.5, 992.35 - k * 1.1],
        2,
      ),
    );
  }

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LA COUR MOUILLÉE — les flaques de rien du tout
// ═════════════════════════════════════════════════════════════════════════════
//
// Vingt-deux films d'eau de deux centimètres, semés sur le dallage. C'est le
// dernier étage de l'échelle : le lac fait quatre mètres, la rigole un mètre,
// et ces choses-là font trente centimètres — soit les deux tiers du joueur.
// À notre taille, c'est ce qu'on ne remarquerait pas.
//
// ON N'EN MET AUCUN SOUS L'AUVENT NI SOUS LE BANC. Ce sont les deux abris de la
// salle, et le fait qu'il n'y ait pas une goutte dessous doit se VOIR — c'est
// la seule façon de dire « ici, c'est sec » sans écrire un mot.
const mouillures = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const r = rng(45045);

  for (let k = 0; k < 22; k++) {
    const x = X0 + 0.6 + r() * (NX * DALLE - 1.8);
    const z = Z0 + 0.6 + r() * (NZ * DALLE - 1.6);
    // Sous l'auvent : sec.
    if (x < AUVENT_X1 + 0.4 && z > 1001.0) continue;
    // Sous le banc : sec.
    if (x > BANC_X0 - 0.4 && x < BANC_X1 + 0.4 && z < 996.0) continue;
    // Ni sur le puits, ni dans le lac, ni dans le fossé : ces endroits ont déjà
    // leur eau, et deux nappes qui se recouvrent sont deux plans qui grésillent.
    if (Math.abs(x - PUITS_X) < 2.0 && Math.abs(z - PUITS_Z) < 2.0) continue;
    if (x > -203.2 && x < -197.6 && z > 997.2 && z < 1002.8) continue;
    if (x > -195.2 && x < -191.0) continue;

    const lx = 0.22 + r() * 0.5;
    const lz = 0.18 + r() * 0.42;
    // Chacune 0,4 mm plus épaisse que la précédente : vingt-deux nappes de même
    // épaisseur posées sur des dalles de même niveau finiraient par en croiser
    // une autre dans le même plan.
    out.push(box([x, sol(x, z) - 0.03, z], [x + lx, sol(x, z) + 0.008 + k * 0.0004, z + lz], 0));
  }

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════

const decor = (): BoxDef[] => [
  ...dallage(),
  ...rigole(),
  ...avaloir(),
  ...puits(),
  ...filetDEau(),
  ...auvent(),
  ...banc(),
  ...murs(),
  ...mouillures(),
];

/**
 * LA PLUIE.
 *
 * Quatre stations, et pas une n'est une énigme : le Pinceau vole, le joueur
 * marche, et ici cet écart ne sert qu'à faire regarder. Il se pose sur les
 * quatre choses qu'on aurait pu ne pas voir — le bord du toit d'où tombe la
 * nappe, la margelle où l'on ne montera pas, le dossier du banc où l'on peut
 * monter, et l'avaloir qui dit où l'on sort. Il traverse la cour d'ouest en
 * est, comme l'eau, comme le joueur.
 */
export const PLUIE: SalleModule = {
  nom: 'pluie',

  region: {
    name: 'pluie',
    min: [-300, -40, 900],
    max: [-100, 40, 1100],
    // Le papier d'une averse : un gris bleuté à peine teinté, celui d'un ciel
    // bas vu depuis une cour fermée.
    paper: '#e4eaec',
    colors: [
      '#cfdde2', // 0 — l'eau, la pierre lavée, tout ce qui luit
      '#93a8b0', // 1 — le gris trempé du dallage et des murs
      '#3b525d', // 2 — l'ardoise : les toits, le fond de la rigole, le puits
      '#a8734a', // 3 — LE BOIS, et il ne dit qu'une chose : c'est sec dessous
    ],
    ink: '#141f24',
    // La cour fait vingt-sept mètres du seuil à la sortie. Le brouillard est
    // posé quatre fois plus loin : il voile les toits d'en face et ne touche
    // pas à la ligne de vue. La sortie doit rester nette depuis l'entrée, et
    // c'est la seule contrainte que ce nombre ait à respecter.
    brouillard: 110,
  },

  // La parcelle réservée, telle qu'attribuée. Tout ce qui précède tient dans
  // x ∈ [−214,5 ; −184,5], y ∈ [−1,4 ; 5,3], z ∈ [986,6 ; 1012,5] — soit
  // largement à l'intérieur, sur les trois axes.
  bounds: { min: [-300, -40, 900], max: [-100, 40, 1100] },

  boxes: decor(),

  stations: [
    // 1. Le bord du toit de l'auvent, à 1,47 : trois fois la taille du joueur,
    //    et l'endroit d'où part la plus longue chute de la salle.
    [-208.05, 1.5, 1003.9],
    // 2. La margelle du puits, à 0,53. Le Pinceau s'y pose et regarde l'eau ;
    //    le joueur, lui, ne la verra pas. C'est le seul endroit de la salle où
    //    l'écart entre celui qui vole et celui qui marche se voie.
    [PUITS_X, sol(PUITS_X, PUITS_Z) + PUITS_BORD + 0.05, PUITS_Z],
    // 3. L'assise du banc, à 0,64 — et celle-là se gagne, par le balai, en
    //    marchant. C'est le point de vue de la salle.
    [-194.4, sol(-194.4, 995) + BANC_ASSISE + 0.04, 995.2],
    // 4. L'avaloir, à trois mètres de la porte de sortie. Dernier mot du
    //    balisage : l'eau et vous sortez par le même bout.
    [-186.6, solDalle(12, 5) + 0.35, 1005.2],
  ],

  // ─── LE RACCORD ────────────────────────────────────────────────────────────
  // On entre par l'ouest et l'on sort par l'est, sur le même axe z = 1000, à
  // ×1/4 dans les deux sens : cette salle ne change personne de taille.
  // Les deux positions sont le MILIEU DU SEUIL, au niveau du dessus de la
  // pierre — c'est-à-dire l'endroit exact où poser une face de portail.
  entree: { position: [PORTE_O, solDalle(0, 3) + 0.035, AXE_Z], echelle: 0.25 },
  sortie: { position: [PORTE_E, solDalle(NX - 1, 3) + 0.03, AXE_Z], echelle: 0.25 },
};

/**
 * Les nombres du joueur, exportés pour qu'on ne retouche jamais une hauteur
 * d'ici « à l'œil ». Toute cote de cette salle se juge contre eux, et contre
 * eux seuls.
 */
export const CALIBRAGE_PLUIE = {
  taille: TAILLE,
  enjambee: ENJAMBEE,
  marche: MARCHE,
  saut: SAUT,
  largeur: LARGEUR,
  oeil: OEIL,
};
