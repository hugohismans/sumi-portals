import type { BoxDef, CarryableDef, LevelDef } from '../core/types.js';
import type { PortalPairDef, RegionDef, SocketDef } from '../core/types.js';

/**
 * LA BOÎTE À FORMES — le jouet de trois ans, et l'examen de tout le jeu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ELLE N'ENSEIGNE RIEN, ELLE VÉRIFIE.
 *
 * Sa règle n'a pas besoin d'être expliquée : tout le monde a poussé un cube
 * dans un trou carré avant de savoir parler. C'est la seule salle du jeu qui
 * n'ait aucune minute à dépenser en pédagogie, et c'est pour ça qu'elle est
 * l'avant-dernière — elle repose sur ce qu'on a appris ailleurs : une porte
 * corrige la taille, un miroir la main, et deux portes de sens contraire
 * corrigent l'une sans toucher l'autre.
 *
 * Cinq pièces, cinq creux. Un creux ne demande que la forme, un que la taille,
 * un que la main, un que la couleur — et le cinquième demande les quatre.
 * Quatre inconnues simultanées font seize combinaisons : ou bien le joueur a
 * compris les quatre leçons séparément et il pose la pièce du premier coup, ou
 * bien il tire au sort. La salle ne fait que trancher entre ces deux joueurs.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE N'EST PAS UNE `SalleModule`, C'EST UN `LevelDef` ENTIER : ses portes, son
 * but et son décor lui appartiennent. Les onze règles du contrat des salles s'y
 * appliquent quand même, et les trois dernières la gouvernent — l'étalon (9),
 * le spectaculaire donné à qui se trompe (10), et les tailles distinctes (11),
 * qui n'est plus ici une prudence mais LA MÉCANIQUE.
 *
 * CE QU'ELLE REVISITE (règle 8). Le hall a cinq socles et une perle posée sur
 * l'un d'eux ; on la prend, on la fait grandir, on la remet. Ici les cinq
 * socles sont devenus les cinq creux d'une planche de jouet, la perle est
 * toujours là, et l'on n'a plus le droit de se tromper de trou.
 *
 * CE QUE LE CARNET DEMANDAIT ET QU'ON REFUSE : que la boîte à formes ouvre une
 * branche de l'aventure. Une arborescence exige que le joueur sache qu'il a le
 * choix, donc une carte, donc une interface — et ce jeu n'en veut pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE CŒUR DE LA SALLE, ET IL EST ARITHMÉTIQUE — LA TABLE D'UNICITÉ
 *
 * `Sockets.fits` compare QUATRE VALEURS, jamais une géométrie : la main, la
 * forme, la teinte, puis la taille à 12 % près. Un creux n'exige que ce qu'il
 * déclare — un creux sans `forme` accepte n'importe quelle forme. C'est ce qui
 * permet à un creux de ne demander QUE la couleur.
 *
 * ET UN CREUX ORDINAIRE VERROUILLE POUR DE BON : une pièce logée dans le
 * mauvais creux est perdue, et la salle est morte sans que rien ne le dise. Il
 * ne suffit donc pas que chaque creux ait une bonne réponse — il faut qu'il n'en
 * ait qu'UNE, à TOUTES les tailles que la pièce peut prendre et pas seulement à
 * celle où on la trouve.
 *
 * LA CLEF : LES CLASSES DE TAILLE. Une porte multiplie ou divise par quatre,
 * jamais autre chose ; deux tailles ne peuvent donc se rejoindre si leur rapport
 * n'est pas une puissance de 4, et 12 % de tolérance est trop peu pour
 * raccommoder ça. On range les cinq tailles en trois CLASSES (une classe = une
 * taille et toutes ses puissances de 4), bien séparées :
 *
 *   classe A — 0,48 · 1,92        (et 0,12 , 7,68 …)
 *   classe B — 0,75 · 3,00        (et 0,1875 , 12,0 …)
 *   classe C — 0,30 · 1,20        (et 0,075 , 4,80 …)
 *
 * Les rapports entre classes valent 1,56 et 1,60 : quatre fois plus que la
 * tolérance. Aucun nombre de traversées ne fait passer une pièce d'une classe
 * à l'autre. C'est vrai POUR TOUT k ENTIER, et pas seulement pour les tailles
 * que ce niveau-ci rend atteignables — c'est la seule forme de preuve qui
 * survive à quelqu'un qui ajouterait une porte demain.
 *
 * ┌──────────────────────────┬──────┬──────┬──────┬──────┬──────┐
 * │  pièce  \  creux         │ 0,30 │ 0,48 │ 0,75 │ 1,20 │ 1,92 │
 * │                          │teinte│ forme│ rien │ TOUT │ main │
 * ├──────────────────────────┼──────┼──────┼──────┼──────┼──────┤
 * │ la perle   0,30 · encre 3│  ✔   │  ·   │  ·   │  f   │  ·   │
 * │ le té      0,48 · encre 2│  ·   │  ✔   │  ·   │  ·   │  m   │
 * │ le bloc    3,00 · encre 1│  ·   │  ·   │  ✔   │  ·   │  ·   │
 * │ la vis-c   0,30 · encre 1│  t   │  ·   │  ·   │  ✔   │  ·   │
 * │ la vis-m   0,48 · encre 2│  ·   │  f   │  ·   │  ·   │  ✔   │
 * └──────────────────────────┴──────┴──────┴──────┴──────┴──────┘
 *   ✔ le seul oui de la ligne et de la colonne
 *   ·  refusé par la TAILLE — classe différente, aucune porte n'y peut rien
 *   f  refusé par la FORME     m par la MAIN     t par la TEINTE
 *
 * LES QUATRE CASES `f`, `m`, `t` SONT TOUTE LA SALLE. Ce sont les seuls refus
 * qui ne viennent pas d'un nombre : la pièce est là, exactement à la bonne
 * taille, sous les yeux du joueur, et elle n'entre pas. Sans elles, la taille
 * suffirait à tout trier et les trois autres comparaisons seraient un décor.
 *
 * ET LA COLONNE « rien » N'A AUCUNE LETTRE : ce creux-là accepte n'importe quoi
 * de 0,75, et rien ne le protège qu'un compte — aucune autre pièce ne peut
 * atteindre sa classe. C'est lui qui aurait tué la salle si l'on s'était
 * contenté de vérifier les tailles de départ.
 *
 * ET LE CINQUIÈME CREUX NE POUVAIT ÊTRE VOISIN QUE DE CELUI DE LA COULEUR : la
 * pièce qui satisfait les quatre exigences satisfait aussi chacune prise à
 * part, donc elle rentrerait dans le creux de la main et dans celui de la
 * teinte s'ils partageaient sa classe. Seule la taille peut l'en écarter — sauf
 * du creux de la couleur, dont elle diffère justement par la couleur.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const REGION: RegionDef = {
  name: 'formes',
  min: [-280, -40, 2220],
  max: [280, 60, 2780],
  paper: '#f5efe0',
  // Bois clair, bois ciré, encre sombre, et le vermillon de la perle. Une
  // chambre d'enfant n'a jamais que quatre couleurs, et la quatrième est celle
  // du seul objet qui compte.
  colors: ['#e8dcc4', '#b98f5a', '#4a443c', '#c8492e'],
  ink: '#221f1b',
  brouillard: 175,
};

type V3 = [number, number, number];
const b = (min: V3, max: V3, ink = 0, opts: { ghost?: boolean; outline?: boolean } = {}): BoxDef =>
  ({ min, max, ink, region: 'formes', ...opts });

// ─── Le plan du sol, du sud au nord ─────────────────────────────────────────
//   2440 les GRANDES faces (on en sort géant) · 2476 les PETITES · 2484 on
//   apparaît · 2488…2492 les cinq pièces éparpillées · 2501…2507 LA PLANCHE et
//   ses creux à 2502,4 · 2530 la porte que le Pinceau dessine · 2553…2567 LE
//   COFFRE À JOUETS, fermé, où l'on entre haut de quarante-cinq centimètres.
const Z_CREUX = 2502.4;
const PLANCHE_H = 0.6;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES DEUX FORMES, ET POURQUOI IL EN FALLAIT DEUX
 *
 * LA VRILLE — quatre cubes en escalier hélicoïdal, le tétracube « vis » : la
 * plus petite forme chirale faite de cubes collés. Aucune rotation ne superpose
 * la vis droite à la vis gauche, il faut un miroir. Fait de géométrie, pas
 * règle du jeu — d'où le droit de bâtir une énigme dessus sans l'énoncer.
 *
 * ELLE EST REDÉFINIE ICI, ET C'EST DÉLIBÉRÉ. `salles/refus.ts` en exporte une
 * identique. Cette salle est ailleurs, dans un autre mouvement, et un import
 * entre deux niveaux pour quatre boîtes coûterait plus cher en couplage qu'il
 * ne rapporte. Si les deux divergent un jour, ce n'est pas un bug : ce sont
 * deux jouets différents qui se ressemblent.
 *
 * LE TÉ — trois cubes en ligne et un quatrième au milieu, comme le té d'un
 * dessinateur. Il est ACHIRAL : le plan qui passe par son pied le renvoie sur
 * lui-même, donc sa main gauche et sa main droite sont le même objet. On ne lui
 * déclare donc AUCUNE `main`, et ce n'est pas un oubli : c'est ce qui fait que
 * le creux exigeant la main droite le refuse tout seul, sans une ligne
 * d'exception. Il suffisait de choisir une forme qui n'ait pas de main.
 *
 * LES CELLULES SE CHEVAUCHENT D'UN CENTIMÈTRE au lieu de se toucher. Deux faces
 * confondues se disputent la profondeur et scintillent — le défaut le plus vu
 * du projet ; autant ne pas le réintroduire dans ce qu'on tient sous le nez.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const E = 0.01;

/** Une cellule d'une grille n×n×n, en unités de −0,5 à +0,5, chevauchement compris. */
const cel = (n: number, ink: number) => (i: number, j: number, k: number) => ({
  min: [-0.5 + i / n - E, -0.5 + j / n - E, -0.5 + k / n - E] as V3,
  max: [-0.5 + (i + 1) / n + E, -0.5 + (j + 1) / n + E, -0.5 + (k + 1) / n + E] as V3,
  ink,
});

/** La vis : on part, on tourne à droite, on monte. */
const vrille = (ink: number) => {
  const c = cel(2, ink);
  return [c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(1, 1, 1)];
};

/** Le té : trois en ligne, un au milieu par-dessus. Achiral, et c'est utile. */
const te = (ink: number) => {
  const c = cel(3, ink);
  return [c(0, 1, 1), c(1, 1, 1), c(2, 1, 1), c(1, 2, 1)];
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES CINQ PIÈCES, ET LE VOYAGE DE CHACUNE
 *
 * Trois ne demandent qu'un regard, deux demandent une porte :
 *
 *   la perle  0,30 → 0,30   on la ramasse et on la pose. Sa seule vertu est sa
 *                           couleur, et son creux ne demande QUE ça.
 *   le té     0,48 → 0,48   idem, sa seule vertu est sa forme.
 *   le bloc   3,00 → 0,75   INTOUCHABLE à taille d'homme : on ne soulève que
 *                           0,99 et il en fait trois. Devenir géant pour le
 *                           prendre, REDESCENDRE en le portant pour qu'il
 *                           rétrécisse. Une porte, dans le bon sens.
 *   la vis-m  0,48 → 1,92   le MIROIR, et rien d'autre : elle change de main et
 *                           de taille du même geste, et les deux sont voulues.
 *   la vis-c  0,30 → 1,20   le miroir aussi, et c'est le morceau de bravoure :
 *                           forme, main, teinte et taille, toutes les quatre.
 *
 * DEUX PAR DEUX, ELLES SE RESSEMBLENT. La perle et la vis-c font toutes deux
 * 0,30, le té et la vis-m toutes deux 0,48, et chaque creux n'en prend qu'une.
 * C'est la seule chose que cette salle mette en scène : deux objets de taille
 * rigoureusement identique, dont un seul entre.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const CARRYABLES: CarryableDef[] = [
  // La perle du hall, en plus petit — un cube, mais vermillon, et rien d'autre.
  { id: 'perle', position: [-13, 0.05, 2492], size: 0.3, ink: 3 },
  // Le té du dessinateur. Pas de `main` : il est achiral, voir plus haut.
  { id: 'te', position: [-6, 0.05, 2490], size: 0.48, ink: 2, forme: 'te', pieces: te(2) },
  // Le bloc de bois, trois mètres, posé comme un mur : on le prendra pour du
  // décor, une minute.
  { id: 'bloc', position: [20, 0.05, 2488], size: 3.0, ink: 1 },
  // Les deux vis, toutes deux GAUCHES, toutes deux à corriger au miroir.
  { id: 'vis-c', position: [1, 0.05, 2492], size: 0.3, ink: 1, forme: 'vrille', main: 'L', pieces: vrille(1) },
  { id: 'vis-m', position: [8, 0.05, 2490], size: 0.48, ink: 2, forme: 'vrille', main: 'L', pieces: vrille(2) },
];

/**
 * LES CINQ CREUX, RANGÉS PAR TAILLE CROISSANTE le long de la planche. L'ordre
 * n'est pas une coquetterie : les cinq tailles forment une échelle de
 * rapport 1,6 environ (0,30 · 0,48 · 0,75 · 1,20 · 1,92), et les deux paires
 * qui partagent une classe — 0,30/1,20 et 0,48/1,92 — sont exactement celles
 * qui sont à TROIS TROUS l'une de l'autre. La règle du monde est donc dessinée
 * par terre : ce qui vaut quatre fois plus est toujours trois trous plus loin.
 *
 * `teinte` N'EST PAS `ink`. `teinte` est ce que le creux EXIGE de la pièce ;
 * `ink` est la couleur dont il est DESSINÉ. Les cinq sont tracés à l'encre
 * sombre, y compris celui qui réclame le vermillon — un trait autour d'un vide
 * se lit mieux qu'une tache, et un creux peint en rouge répondrait à la
 * question avant qu'on l'ait posée.
 *
 * `portee` EST LARGE, ET C'EST MESURÉ. Une caisse se repose à
 * `0,34 × échelle + 2 × sa propre arête` devant soi : 0,94 m pour la perle à
 * taille d'homme, 5,20 m pour la vis-m dans les mains d'un géant. Les portées
 * valent deux à trois fois ça — viser un trou de vingt centimètres à cinq
 * mètres au doigt sur un téléphone n'est pas un jeu de réflexion. Elles se
 * chevauchent donc largement, et c'est sans danger : la table d'unicité
 * garantit qu'une pièce lâchée entre deux creux ne peut être happée que par le
 * sien. C'est même la sensation du jouet — on approche, ça tombe dedans.
 */
const creux = (id: string, x: number, size: number, portee: number, exige: Partial<SocketDef>): SocketDef =>
  ({ id, position: [x, PLANCHE_H, Z_CREUX], size, portee, ink: 2, ...exige });

const SOCKETS: SocketDef[] = [
  creux('creux-teinte', -14, 0.3, 3, { teinte: 3 }),
  creux('creux-forme', -7, 0.48, 3, { forme: 'te' }),
  creux('creux-taille', 0, 0.75, 4, {}),
  creux('creux-tout', 7, 1.2, 7, { forme: 'vrille', main: 'D', teinte: 1 }),
  creux('creux-main', 14, 1.92, 9, { main: 'D' }),
];

/**
 * LE DÉCOR. Une planche, deux étalons, un coffre, et une immensité de plancher.
 *
 * AUCUN MUR INTÉRIEUR, ET C'EST UNE PRÉCAUTION, PAS UNE PARESSE.
 * `Carryables.targeted` ne teste aucune occultation : une distance et un cône.
 * Un joueur à ×4 a 11,52 m de portée de bras et attrape donc à travers
 * n'importe quelle cloison — une salle a été perdue comme ça. Ici il n'y a rien
 * à cacher et rien pour cacher, et le défaut n'a pas de prise.
 *
 * LE PLANCHER EST DÉMESURÉ — 520 m de côté — parce que rien ne doit pouvoir se
 * perdre. Le lancer le plus long mesuré, celui d'un géant à 45°, fait 152,7 m ;
 * la distance la plus courte entre l'aire de jeu et le bord du plancher en fait
 * 190. Le brouillard à 175 cache ce bord, et l'on ne voit qu'une chambre sans
 * fin.
 */
const decor = (): BoxDef[] => [
  // Le plancher. `outline: false` : ses arêtes feraient un cadre en plein vide.
  b([-260, -2.5, 2240], [260, 0, 2760], 0, { outline: false }),

  // LA PLANCHE. Soixante centimètres, c'est-à-dire un genou — l'étalon de la
  // règle 9, celui qu'on a dans le corps : à taille d'homme on s'y appuie, et
  // quand on revient géant elle arrive à la cheville. Rien à calculer.
  b([-19, 0, 2501], [19, PLANCHE_H, 2507], 1),

  // LE TÉ DE MENUISIER debout, exactement 1,80 m — la taille d'un homme, le
  // second étalon, et le seul qui serve à juger une HAUTEUR. Il est près de la
  // planche, c'est-à-dire là où l'on doit juger.
  b([-22.06, 0, 2495.94], [-21.94, 1.8, 2496.06], 2),

  // Trois cubes d'un mètre empilés de travers, décalés d'un centimètre ou deux
  // pour qu'aucune de leurs faces n'en recouvre une autre.
  b([-25.4, 0, 2499.1], [-24.4, 1.0, 2500.1], 1),
  b([-24.3, 0, 2499.2], [-23.3, 1.02, 2500.2], 0),
  b([-25.3, 1.03, 2499.6], [-24.3, 2.03, 2500.6], 1),

  ...coffre(),
];

/**
 * LE COFFRE À JOUETS — la sortie, et une chambre pour quelqu'un de 45 cm.
 *
 * IL A UN COUVERCLE, ET C'EST UN VERROU DE SÛRETÉ, PAS UN ORNEMENT. Sans lui,
 * un joueur à ×4 peut lancer une pièce par-dessus les neuf mètres de paroi — un
 * lancer de géant part à cinquante mètres par seconde. Elle serait alors dans un
 * enclos où l'on n'entre qu'à ×1/4 et où l'on ne soulève que 24,75 cm : perdue
 * pour toujours. Fermé, rien n'y entre que par la porte, et par la porte on
 * n'entre qu'en portant ce qu'on pourra reprendre. (Un toit reste interdit
 * au-dessus d'un PASSAGE — la catapulte du linteau, dans `MESURES.md`. Ici il
 * n'y a pas de passage : on arrive au milieu de la pièce, par un portail, avec
 * huit mètres quatre-vingts sur la tête.)
 *
 * Les quatre parois ont des hauteurs différentes à un centimètre près et
 * s'emboîtent aux angles : sinon leurs dessus se disputeraient la profondeur.
 */
const coffre = (): BoxDef[] => [
  b([-7, 0, 2553], [7, 9.0, 2554], 2),
  b([-7, 0, 2566], [7, 9.01, 2567], 2),
  b([-7.01, 0, 2553.99], [-6.01, 9.02, 2566.01], 2),
  b([6.01, 0, 2553.99], [7.01, 9.03, 2566.01], 2),
  // Le couvercle. Il DÉBORDE de dix centimètres sur tout le pourtour, et ce
  // n'est pas décoratif : posé à fleur, ses bords tombaient dans le plan des
  // parois nord et sud, et la vérification a compté trois mètres carrés de
  // scintillement de chaque côté. Même remède qu'au chapeau du socle du hall.
  b([-7.1, 8.8, 2552.9], [7.1, 9.8, 2567.1], 2),
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES PORTES. IL EN FAUT DEUX, ET C'EST UN THÉORÈME, PAS UN GOÛT.
 *
 * La main bascule à chaque passage au miroir : il en faut un nombre IMPAIR. La
 * taille se multiplie par 4 à chaque cran : il faut une somme de crans donnée.
 * Avec des miroirs seuls on ne choisit pas les deux indépendamment. Il faut une
 * SECONDE paire, ordinaire, qui change la taille sans toucher à la main.
 *
 * Ici les deux vis doivent GRANDIR ET changer de main : un seul passage au
 * miroir suffit, et l'énigme paraît facile. C'est voulu — cette salle vérifie,
 * elle ne pique pas. La porte ordinaire sert au bloc, qui doit RÉTRÉCIR sans
 * que rien d'autre bouge.
 *
 * ELLES SONT DE COULEURS DIFFÉRENTES, et il a fallu en discuter. Deux portes
 * identiques auraient fait de la salle un tirage au sort, ce que le paragraphe
 * de conception refuse : le joueur n'apprend pas laquelle est le miroir parce
 * qu'on le lui dit, il l'apprend en passant — et la couleur lui permet de s'en
 * souvenir. C'est la différence entre une énigme et une loterie.
 *
 * LES QUATRE FACES SONT EN QUATRE POINTS DISTINCTS, et les deux paires sont
 * CROISÉES : on entre à gauche et l'on ressort à droite. Deux faces plantées au
 * même endroit se disputent le plan, et l'on traverse celle qu'on ne voulait
 * pas.
 *
 * ET C'EST LÀ QU'EST L'IMAGE (règle 10). On ressort géant à soixante mètres au
 * sud de la planche, face au nord, et l'on voit d'un coup les cinq trous en
 * enfilade, le té de menuisier haut comme un ongle et le bloc de trois mètres
 * devenu un dé. Qui n'a rien à réparer ne verra jamais ce plan-là.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const PORTALS: PortalPairDef[] = [
  {
    id: 'porte-lisse',
    colorBig: 0xb98f5a,
    colorSmall: 0x8a6a3b,
    // Normale +z : on marche vers le sud, en tournant le dos au jouet.
    small: { position: [-34, 0.05, 2476], yaw: 0 },
    big: { position: [34, 0.05, 2440], yaw: 0 },
  },
  {
    id: 'miroir',
    miroir: true,
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    small: { position: [34, 0.05, 2476], yaw: 0 },
    big: { position: [-34, 0.05, 2440], yaw: 0 },
  },
  /**
   * LA PORTE DU COFFRE. Le Pinceau la dessine quand le cinquième creux est
   * pourvu, et l'on s'en va en devenant petit — le jouet rentre dans sa boîte,
   * et nous avec.
   *
   * `smallHeight` vaut 0,70 et non 2,80 : sa PETITE face sert un joueur à ×1/4,
   * qui passe dès 0,18 × 0,46 ; sa grande en fait quatre fois plus, pour un
   * joueur à taille d'homme. Se tromper là donne une porte qu'on ne franchit pas.
   *
   * CE QUE JE N'AI PAS PU FAIRE : `condition` ne nomme QU'UN logement, et il en
   * faudrait cinq. J'ai pris le cinquième — celui qui exige les quatre — parce
   * qu'un joueur qui l'a rempli a compris tout ce que la salle demande. Mais
   * s'il le remplissait EN PREMIER, il sortirait en laissant quatre trous vides.
   *
   * ═══════════════════════════════════════════════════════════════════════
   * CORRIGÉ : `condition` ACCEPTE MAINTENANT UNE LISTE.
   *
   * Le moteur ne savait nommer qu'un verrou par porte, et son autrice l'a
   * signalé en livrant plutôt que de faire semblant. C'était la bonne prise :
   * la boîte à formes est le premier endroit du jeu où une porte doit attendre
   * PLUSIEURS choses, et rien d'autre ne l'aurait rendu évident.
   *
   * La normalisation se fait une seule fois, dans `conditionsDe` : un verrou
   * unique s'écrit toujours sans crochets, et le reste du moteur n'a plus qu'un
   * cas à traiter.
   *
   * Le coffre attend donc SES CINQ CREUX. On ne rentre dans la boîte que
   * lorsque tout y est rentré — ce qui est, à la lettre, la règle du jouet.
   * ═══════════════════════════════════════════════════════════════════════
   */
  {
    id: 'porte-coffre',
    condition: [
      'creux-teinte',
      'creux-forme',
      'creux-taille',
      'creux-tout',
      'creux-main',
    ],
    dessinee: true,
    colorBig: 0x4a443c,
    colorSmall: 0xc8492e,
    smallHeight: 0.7,
    smallWidth: 0.475,
    // Normale −z : on marche vers le nord, depuis la planche, pour y entrer.
    big: { position: [0, 0.05, 2530], yaw: Math.PI },
    // Normale +z : on en ressort en s'enfonçant dans le coffre.
    small: { position: [0, 0.05, 2556], yaw: 0 },
  },
];

/**
 * CE QU'ON A MIS CONTRE LE PIÈGE, ET COMMENT ON LE PROUVE.
 *
 * 1. AUCUNE PIÈCE NE PEUT ENTRER DANS LE MAUVAIS CREUX. C'est la table
 *    d'unicité, vérifiée creux par creux et taille par taille. C'est la seule
 *    protection qui compte, puisqu'un creux ordinaire verrouille pour de bon.
 * 2. AUCUNE PIÈCE NE PEUT DEVENIR TROP LOURDE POUR TOUJOURS. Une pièce ne
 *    grandit qu'en étant portée, donc il faut pouvoir la soulever AVANT : la
 *    plus grosse chose portable à ×1 fait 0,99, elle en fait 3,96 de l'autre
 *    côté, et 3,96 est EXACTEMENT ce qu'un joueur à ×4 soulève. La borne se
 *    referme sur elle-même, à toutes les échelles.
 * 3. AUCUN TROU, AUCUN BORD, AUCUN TOIT SUR UN PASSAGE.
 * 4. LES DEUX PORTES DE TRAVAIL N'ONT PAS DE `condition` : on les franchit dans
 *    les deux sens autant qu'on veut, et tout geste se défait.
 * 5. LE COFFRE EST FERMÉ, et l'on en ressort par sa petite face.
 *
 * Ce qui reste possible, et qui est une punition juste : lancer une pièce à
 * cent cinquante mètres et devoir aller la chercher. Se tromper coûte du temps,
 * jamais la partie.
 */
export const FORMES: LevelDef = {
  name: 'La boîte à formes',
  // On apparaît à taille d'homme, dix-sept mètres devant la planche, face à
  // elle, avec les cinq pièces éparpillées entre les deux. Rien à expliquer.
  spawn: [0, 0.05, 2484],
  spawnYaw: 0,
  spawnScale: 0,
  regions: [REGION],
  boxes: decor(),
  carryables: CARRYABLES,
  sockets: SOCKETS,
  portals: PORTALS,

  /**
   * LES JALONS DU PINCEAU. Il vole, lui : il coupe droit là où l'on contourne.
   * `guideEchelle` vaut 1 partout SAUF dans le coffre — le Pinceau est un
   * habitant du monde, sa taille est celle de l'étage où il se tient et jamais
   * celle de qui le regarde, et ce niveau n'a qu'un étage : le joueur change,
   * le monde non. Le coffre est l'exception : chambre de poupée, pinceau de
   * poupée.
   */
  guide: [
    [0, 3, 2490],
    [-13, 2.4, 2502],
    [3, 3, 2503],
    [-24, 6, 2478],
    [10, 5, 2496],
    [0, 3.5, 2528],
    [0, 0.9, 2561],
  ],
  guideEchelle: [1, 1, 1, 1, 1, 1, 0.25],
  // Le dernier jalon est DERRIÈRE une porte. Sans ce champ, le Pinceau
  // traverserait trente mètres de plancher et de paroi en droite ligne, et l'on
  // ne lirait pas « suis-moi » mais « il a disparu ».
  guidePorte: [null, null, null, null, null, null, 'porte-coffre'],

  // Le but est au fond du coffre : assez loin des parois pour qu'un géant resté
  // dehors ne l'effleure jamais, assez large pour qu'on ne le rate pas à 45 cm.
  goal: { position: [0, 0.1, 2562], radius: 1.5 },
};
