import type { BoxDef, PortalPairDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LE CONDUIT — la salle où l'on apprend qu'UNE CHUTE EST UN LIEU QU'ON TRAVERSE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE ENSEIGNE, EN UNE PHRASE
 *
 *     Deux raisons indépendantes convergent sur une seule taille.
 *
 * Un puits de quarante-deux mètres. Une ouverture dans la paroi d'en face,
 * trente-deux mètres plus bas et vingt mètres de côté. Pour y entrer il faut
 * du TEMPS et de la PORTÉE, et le jeu ne vous donne jamais les deux :
 *
 *   — le PETIT tombe deux fois plus lentement, donc il a tout le temps du
 *     monde, mais sa portée est quatre fois moindre : mesuré ici, son meilleur
 *     coup manque l'arête de 1,52 m — trois fois et demie sa propre taille, si
 *     bien qu'il ne peut pas croire qu'il y était presque ;
 *   — le GRAND a la portée et davantage, mais il mesure 7,20 pour une
 *     ouverture de 3,60 : il se pose sur la vire, et il regarde une porte
 *     trop petite pour lui ;
 *   — celui du milieu passe.
 *
 * Le joueur ne calcule rien. Il essaie petit et il manque. Il essaie grand et
 * il ne rentre pas. La troisième fois il a compris — à condition que rater
 * coûte des secondes et jamais la partie. C'est pourquoi la moitié de ce
 * fichier parle de la REMONTÉE et pas du saut.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RÈGLE 8 — QUEL LIEU CONNU ELLE REVISITE. Le PUITS de la cour de pluie
 * (`salles/pluie.ts`). Là-bas on était à quarante-cinq centimètres, la margelle
 * montait à 0,55 pour un saut de 0,323, et le puits était le seul endroit de la
 * cour où l'on ne pouvait PAS regarder : un trou noir large comme une pièce,
 * dont on longeait le bord sans jamais en voir le fond. Le voici. C'est le même
 * objet, à la même taille, vu de l'intérieur — et la margelle de 0,55 est
 * revenue, mot pour mot, tout autour de la bouche.
 *
 * RÈGLE 9 — L'ÉTALON, ET IL EST PLANTÉ LÀ OÙ L'ON JUGE. Au bord même du vide,
 * dans l'axe du saut, se tient UNE PORTE VIDE : un cadre de pierre de 1,90 sur
 * 2,80, exactement la petite face d'un portail, c'est-à-dire le mètre-ruban que
 * le joueur a vu dans toutes les salles depuis le hall. On la franchit pour
 * sauter. Et à travers elle, à vingt mètres de là, on voit l'ouverture : 2,40
 * sur 3,60, à peine plus grande. Le rapprochement est fait par la géométrie, pas
 * par un texte — et le géant, lui, ne peut pas passer par la porte vide : il la
 * CONTOURNE, ce qui lui dit tout ce qu'il avait besoin de savoir avant même
 * d'avoir sauté.
 *
 * RÈGLE 10 — LE SPECTACULAIRE EST LA RÉCOMPENSE DE L'ERREUR. Le fond du puits
 * est le plus beau plan de la salle, et l'on n'y va qu'en se trompant. Quarante
 * mètres de paroi encrée, cinq assises qui s'éloignent, un rond de ciel gros
 * comme une pièce de monnaie, la vire en surplomb dix mètres au-dessus de la
 * tête avec la porte qu'on vient de rater, et deux arches posées dans la
 * barbotine : une minuscule et une colossale. Celui qui réussit du premier coup
 * ne verra jamais ça.
 *
 * RÈGLE 11 — aucun logement dans cette salle. Elle ne demande rien à porter.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA COUPE, vue du sud (x vers la droite, y vers le haut)
 *
 *   y=+0.55  ▄▄▄ margelle                    ▄▄▄
 *   y= 0     ████████▛ porte vide ▟          ▟███████████  ← lèvre x=190
 *                     │                      │
 *                     │   ← 20,5 m →         │  paroi d'en face x=210,5
 *                     │                      │
 *   y=-32             │            ▟▓▓▓▓▓▓▓▓▓│▒▒▒▒▒▒→ le tunnel, et la sortie
 *                     │       la vire ↑      └── l'ouverture 2,40 × 3,60
 *                     │   arête x=205,5      (marche de 0,40 juste derrière)
 *                     │                      │
 *   y=-42             └──────────────────────┘  la barbotine
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES NOMBRES SONT MESURÉS, PAS CALCULÉS. Voir `MESURES.md`, et la section
 * « LE CONDUIT » en particulier : la géométrie ci-dessous en vient tout entière,
 * elle a été obtenue par balayage en simulation, et elle a déjà tué une
 * première version de cette salle. On ne la retouche pas « à l'œil ».
 *
 *   profondeur 42 · lèvre→paroi opposée 20,5 · section 12
 *   vire : saillie 5, dessus à −32, épaisseur 1,2 ⇒ ARÊTE EXTÉRIEURE x = 15,5
 *   ouverture 2,40 × 3,60, seuil −32 · marche de 0,40 au seuil du tunnel
 *
 * LA VIRE N'EST PAS UN ORNEMENT, et c'est la mesure qui l'a imposée. Avec un
 * simple trou dans la paroi, la salle NE MARCHE PAS : taper le mur remet la
 * vitesse horizontale à zéro à chaque pas de simulation, donc à 39 m/s on
 * franchit les 3,60 m d'ouverture en neuf centièmes de seconde en ne regagnant
 * que six centimètres — on ne peut pas entrer. Mesuré sur un trou nu : 4 succès
 * sur 6 à ×1, et À ×4 ON NE VOIT JAMAIS L'OUVERTURE (on percute vingt mètres
 * plus haut et l'on glisse jusqu'au fond, si bien que la leçon « le grand ne
 * rentre pas » ne se joue même pas). Avec la vire, quiconque atteint 15,5 m s'y
 * pose quelle que soit sa vitesse : la PORTÉE redevient le seul critère, et le
 * géant obtient une terrasse d'où contempler une porte trop petite pour lui.
 *
 * LA FENÊTRE MESURÉE EST [14,4 ; 17,2] m sur l'arête, et l'on prend 15,5 —
 * son milieu géométrique à 3 % près, donc la plus grande marge des deux côtés.
 * NE JAMAIS DESCENDRE SOUS 14,6 : à 14,2, un ×1/4 qui sprinte se pose sur la
 * vire et l'énigme est morte. Si la fenêtre paraît trop juste un jour, le levier
 * est `SPRINT_MULTIPLIER`, pas la géométrie.
 */

type V3 = [number, number, number];

/** Toute boîte d'ici porte `region: 'conduit'`. Aucune ne peut l'oublier. */
const box = (
  min: V3,
  max: V3,
  ink = 1,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'conduit', ...opts });

// ═════════════════════════════════════════════════════════════════════════════
// LES NOMBRES DU JOUEUR, AUX TROIS TAILLES — rien n'est jugé à vue
// ═════════════════════════════════════════════════════════════════════════════
//
//            taille  enjambée  saut   largeur   œil    plafond en l'air
//   ×1/4      0,45     0,225   0,323   0,17    0,414       2,375 m/s
//   ×1        1,80     0,90    1,293   0,68    1,656       9,50  m/s
//   ×4        7,20     3,60    5,184   2,72    6,624      38,00  m/s
//
// Ces quatre-là décident de tout ce qui suit, et deux d'entre eux servent de
// VERROUS répétés dans la salle :
//   — 0,55 est au-dessus du saut du petit (0,323) ET au-dessus de son œil
//     (0,414), et sous l'enjambée du moyen (0,90). C'est la margelle du puits,
//     et c'est le socle de toutes les grandes arches. Voir « LE SOCLE DE 0,55 ».
//   — 0,40 est au-dessus du saut du petit et sous l'enjambée du moyen aussi :
//     c'est la marche du seuil du tunnel, verrou redondant et gratuit.
const SAUT_PETIT = 0.323;
const OEIL_PETIT = 0.414;
const ENJAMBEE_MOYEN = 0.9;

/**
 * LE SOCLE DE 0,55 — la loi de sûreté de cette salle, en un seul nombre.
 *
 * On ne descend d'un cran d'échelle qu'en franchissant une GRANDE face de
 * portail, et une grande face n'a aucune raison de refuser quelqu'un de trop
 * petit : elle laisse passer tout le monde. Un joueur à ×1/4 qui en franchirait
 * une se retrouverait à ×1/16 — onze centimètres de haut, avec une enjambée de
 * 5,6 cm — c'est-à-dire dans un monde où le moindre rebord est une falaise.
 *
 * D'où la loi : TOUTE GRANDE FACE DE CETTE SALLE EST POSÉE SUR UN SOCLE DE
 * 0,55 m. Elle tient par deux mécanismes indépendants, et il suffit d'un :
 *
 *   1. 0,55 > 0,323 : le petit ne monte pas sur le socle, même en sautant.
 *   2. 0,55 > 0,414 : même s'il y montait, son ŒIL resterait sous le seuil de
 *      la face, et `withinFaceRect` exige `local.y ≥ −0,05` — le franchissement
 *      se juge sur l'œil, pas sur les pieds. Il traverserait le plan sans
 *      déclencher quoi que ce soit.
 *
 * Et 0,55 < 0,90 : le joueur à taille d'homme monte dessus sans le voir.
 *
 * Ce n'est pas une invention pour l'occasion : c'est la hauteur de la margelle
 * du puits de la cour de pluie, reprise telle quelle. La salle a un seul geste
 * d'architecture, et il fait deux métiers.
 */
const SOCLE = 0.55;

// ═════════════════════════════════════════════════════════════════════════════
// LA GÉOMÉTRIE DU PUITS — chaque cote vient de MESURES.md
// ═════════════════════════════════════════════════════════════════════════════

/** La lèvre : la paroi d'où l'on saute. C'est l'origine de toutes les portées. */
const LEVRE = 190;
/** La paroi d'en face, à 20,5 m. */
const FOND = 210.5;
/** L'arête extérieure de la vire : lèvre + 15,5. LA SEULE COTE QUI DÉCIDE DE TOUT. */
const ARETE = LEVRE + 15.5;
/** L'axe du saut, et l'axe de l'ouverture. */
const AXE = 1000;
/** Section transversale : 12 m. Sans effet balistique, mais > 8 pour que le ×4 tienne. */
const SUD = AXE - 6;
const NORD = AXE + 6;

/** Le haut, le seuil de l'ouverture, le fond. Profondeur totale 42 m. */
const Y_LEVRE = 0;
const Y_VIRE = -32;
const Y_FOND = -42;

/** L'ouverture : 2,40 large × 3,60 haut, seuil à −32. */
const OUV_Z0 = AXE - 1.2;
const OUV_Z1 = AXE + 1.2;
const OUV_HAUT = Y_VIRE + 3.6;
/** La marche du seuil : 0,40. Le sol du tunnel est donc à −31,60. */
const MARCHE = 0.4;
const Y_TUNNEL = Y_VIRE + MARCHE;
/** Le tunnel court jusqu'à x = 219 ; la sortie est plantée un mètre avant. */
const TUNNEL_BOUT = 219;

/** La roche : la salle est creusée dedans, et elle descend 4 m sous le fond. */
const Y_ROC = Y_FOND - 4;
const X_OUEST = 166;
const X_EST = 244;
/**
 * LA RIVE D'EN FACE EST UNE FALAISE, ET C'EST UNE MESURE QUI L'A EXIGÉ.
 *
 * On y arrivait à plat, à y = 0, et le banc d'essai a trouvé tout de suite ce
 * qu'un joueur aurait trouvé en dix minutes : à ×4, en courant et en sautant,
 * ON FRANCHIT LE PUITS. Vingt mètres et demi ne sont rien pour qui couvre
 * soixante-dix mètres d'un bond. Le géant atterrissait sur la rive opposée sans
 * jamais avoir vu la vire, et la leçon « le grand ne rentre pas » ne se jouait
 * pas — exactement le défaut que MESURES.md décrit pour le trou nu.
 *
 * La roche d'en face monte donc douze mètres au-dessus de la lèvre. Le géant qui
 * saute le puits percute une paroi (12 > son saut de 5,18, et de loin), glisse,
 * et se pose sur la vire comme tout le monde. La salle y gagne son image :
 * depuis la terrasse, on ne voit pas un bord, on voit un mur percé d'un trou.
 */
const Y_FALAISE = 12;
const Z_SUD_ROC = 980;
const Z_NORD_ROC = 1020;

// ═════════════════════════════════════════════════════════════════════════════
// COMMENT CE FICHIER ÉVITE LES FACES CONFONDUES
// ═════════════════════════════════════════════════════════════════════════════
//
// Deux surfaces exactement dans le même plan se disputent la profondeur et
// grésillent : c'est le défaut le plus fréquent du projet, et `facesConfondues`
// le vérifie désormais à 0,25 m². Trois techniques, et elles se voient partout
// dans ce qui suit :
//
//   1. JOINTIF, JAMAIS RECOUVRANT. Les quatre masses de roche autour du puits ne
//      se chevauchent pas : elles se touchent par une arête. Deux dessus au même
//      niveau qui ne partagent qu'une ligne n'ont rien à se disputer.
//   2. ENTERRER LA COUTURE. Toute pièce rapportée mord dans celle qui la porte —
//      la vire entre de 2 m dans la paroi, la marche du tunnel de 1 m dans le
//      bouchon du fond, chaque cadre s'enfonce de 30 cm dans le sol. La face
//      commune se retrouve alors DANS la roche, où personne ne la verra.
//   3. AUCUN NIVEAU RÉPÉTÉ SANS RAISON. Quand deux pièces doivent se toucher à
//      plat, l'une passe sous l'autre de quelques centimètres.
//
// Rien de tout cela n'est décoratif : c'est ce qui permet à la vérification de
// rendre zéro, et la vérification est la seule chose qui empêche la cinquième
// occurrence du même défaut.

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ─── LES QUATRE MASSES DE ROCHE ────────────────────────────────────────────
  //
  // Elles ne se recouvrent pas : ouest et sud se touchent le long de x = 190,
  // sud et est le long de x = 210,5. Leurs dessus sont tous à y = 0 et leurs
  // dessous tous à −46, mais comme deux d'entre elles ne partagent jamais qu'une
  // ligne, aucune paire de faces n'a de surface commune. C'est l'anneau de
  // `creux.ts`, à quatre pièces disjointes, et pour la même raison.
  const OUEST = box([X_OUEST, Y_ROC, Z_SUD_ROC], [LEVRE, Y_LEVRE, Z_NORD_ROC], 1);
  const SUD_M = box([LEVRE, Y_ROC, Z_SUD_ROC], [FOND, Y_LEVRE, SUD], 1);
  const NORD_M = box([LEVRE, Y_ROC, NORD], [FOND, Y_LEVRE, Z_NORD_ROC], 1);
  out.push(OUEST, SUD_M, NORD_M);

  // ─── LA PAROI D'EN FACE, PERCÉE ────────────────────────────────────────────
  //
  // On ne creuse pas une boîte : on en pose plusieurs qui laissent le trou.
  // Cinq pièces, et chacune porte une des lèvres de l'ouverture.
  //
  //   est-sud / est-nord : de part et d'autre de la colonne percée
  //   est-bas            : SOUS le seuil — son dessus À −32 EST LE SEUIL
  //   est-haut           : au-dessus du linteau, à −28,40 (3,60 de haut)
  //   la marche          : 0,40 au-dessus du seuil, un mètre en retrait
  //   le bouchon         : le fond du tunnel, largement débordant et enterré
  out.push(box([FOND, Y_ROC, Z_SUD_ROC], [X_EST, Y_FALAISE, OUV_Z0], 1));
  out.push(box([FOND, Y_ROC, OUV_Z1], [X_EST, Y_FALAISE, Z_NORD_ROC], 1));
  out.push(box([FOND, Y_ROC, OUV_Z0], [X_EST, Y_VIRE, OUV_Z1], 1));
  out.push(box([FOND, OUV_HAUT, OUV_Z0], [X_EST, Y_FALAISE, OUV_Z1], 1));

  // LA MARCHE DE 0,40, verrou redondant et gratuit (MESURES.md) : à ×1/4
  // l'enjambée vaut 0,225 et le saut monte à 0,323, donc infranchissable ; à ×1
  // l'enjambée vaut 0,90 et l'on passe sans même la voir. Elle démarre 40 cm
  // derrière le plan de l'ouverture — c'est ce décalage qui donne à la bouche
  // ses 3,60 de haut alors que le tunnel n'en fait que 3,20.
  //
  // Elle descend jusqu'à −34 (donc DANS le bloc du dessous) et court jusqu'à
  // x = 220 (donc DANS le bouchon) : ses deux coutures sont enterrées, seuls
  // son dessus et son nez restent à l'air.
  out.push(box([FOND + MARCHE, -34, OUV_Z0], [220, Y_TUNNEL, OUV_Z1], 2));

  // Le bouchon du bout du tunnel. Il déborde de tous les côtés dans la roche
  // voisine : une seule de ses six faces est visible, celle qui ferme le
  // couloir. C'est la façon la moins chère de n'exposer aucun plan partagé.
  out.push(box([TUNNEL_BOUT, -34, AXE - 2.5], [X_EST - 5, -27, AXE + 2.5], 2));

  // ─── LE FOND DU PUITS ──────────────────────────────────────────────────────
  //
  // Le sol de la salle basse. Il mord de 60 cm dans les quatre parois, donc
  // aucun de ses flancs n'est visible et aucun ne partage de plan : seul son
  // dessus, à −42, est exposé.
  out.push(
    box([LEVRE - 0.6, Y_ROC + 0.7, SUD - 0.6], [FOND + 0.6, Y_FOND, NORD + 0.6], 2),
  );

  // LA BARBOTINE. On ne meurt pas dans ce jeu : on perd du temps. Le moteur
  // n'inflige aucun dégât de chute — cette flaque d'argile délayée ne corrige
  // donc rien, elle DIT. C'est le seul aplat clair et le seul ton chaud des
  // quarante mètres, elle occupe tout le fond sauf les abords des deux arches,
  // et elle affleure de 10 cm : cinq fois moins que l'enjambée du plus petit
  // joueur, donc on n'en sent jamais le bord.
  out.push(box([192.5, Y_FOND - 0.45, 995.8], [208.5, Y_FOND + 0.1, 1004.2], 0));

  // ─── LA VIRE ───────────────────────────────────────────────────────────────
  //
  // Saillie 5 m, dessus à −32, épaisseur 1,2 : elle rattrape tout le monde à
  // partir de x = 205,5, quelle que soit la vitesse d'arrivée. Elle entre de
  // 2 m dans la paroi d'en face — sa couture est donc dans la roche, et son
  // dessus prolonge exactement le seuil de l'ouverture, sans joint visible.
  //
  // Sa largeur en z (7,2 m) est taillée pour le géant : il fait 2,72 de large,
  // il a donc de quoi se poser, se retourner, et constater — et l'ouverture,
  // large de 2,40, est centrée dedans, donc il l'a sous les yeux.
  out.push(box([ARETE, Y_VIRE - 1.2, AXE - 3.6], [FOND + 2, Y_VIRE, AXE + 3.6], 3));

  // LE CADRE DE L'OUVERTURE, ET IL EST FANTÔME. Trois pierres en saillie de
  // 25 cm autour de la bouche : sans elles, l'ouverture est un rectangle noir
  // sur une paroi sombre, et le joueur ne voit pas de la lèvre ce qu'il doit
  // viser. Mais elles NE COLLISIONNENT PAS, et c'est le banc d'essai qui l'a
  // exigé : en dur, le géant qui glisse le long de la paroi s'arrêtait dessus,
  // perché sur vingt-cinq centimètres à quatre mètres au-dessus de la vire, au
  // lieu de descendre s'y poser. Une saillie décorative qui rattrape un joueur
  // n'est plus décorative. `ghost` la rend à son métier — et, au passage, elle
  // sort de la vérification des faces confondues, où elle n'avait rien à faire.
  for (const [z0, z1] of [
    [OUV_Z0 - 0.5, OUV_Z0],
    [OUV_Z1, OUV_Z1 + 0.5],
  ] as [number, number][]) {
    out.push(box([FOND - 0.25, Y_VIRE, z0], [FOND + 1, OUV_HAUT + 0.45, z1], 3, { ghost: true }));
  }
  out.push(
    box([FOND - 0.25, OUV_HAUT, OUV_Z0 - 0.5], [FOND + 1, OUV_HAUT + 0.45, OUV_Z1 + 0.5], 3, {
      ghost: true,
    }),
  );

  // ─── LES CINQ ASSISES ──────────────────────────────────────────────────────
  //
  // Le puits est bâti, pas foré : cinq lits de pierre le cerclent, tous les
  // 6 mètres, en saillie de 40 cm sur les deux parois latérales. Ils font tout
  // le travail de lecture de la profondeur — depuis le fond on les voit
  // s'éloigner et se resserrer, et c'est cela qui dit « quarante mètres » sans
  // qu'aucun chiffre n'apparaisse.
  //
  // L'ESPACEMENT DE 6 M N'EST PAS UN CHOIX DE DESSIN. Le saut du géant vaut
  // 5,184 et son enjambée 3,60 : à 4 m d'écart, ces assises seraient un
  // escalier, et le géant remonterait le puits par la paroi — ce qui n'est pas
  // un piège mais escamoterait la salle. À 6 m, personne ne les gravit, à
  // aucune taille. Elles ne sont qu'un décor qui mesure.
  //
  // ELLES S'ARRÊTENT À −30, ET C'EST LE BANC D'ESSAI QUI L'A EXIGÉ. Descendues
  // jusqu'au fond, la sixième (−36) tombait EN PLEINE POITRINE d'un géant debout
  // dans la salle basse : il mesure 7,20, elle saillait de 40 cm à 5,60 du sol,
  // et elle lui barrait la route de son arche. Un joueur bloqué par une moulure
  // décorative, sans rien voir qui l'explique, est le pire défaut possible.
  // Les douze derniers mètres sont donc lisses — et c'est mieux ainsi : la salle
  // basse est un autre lieu que le conduit, elle a le droit d'avoir ses propres
  // murs.
  //
  // Elles courent d'une paroi à l'autre et mordent de 60 cm dans chacune : leurs
  // bouts sont dans la roche. Nord et sud partagent leurs niveaux, mais jamais
  // la même empreinte au sol — deux faces coplanaires qui ne se recouvrent pas
  // n'ont rien à se disputer.
  for (let k = 1; k <= 5; k++) {
    const y = Y_LEVRE - 6 * k;
    out.push(box([LEVRE - 0.6, y, SUD - 0.6], [FOND + 0.6, y + 0.4, SUD + 0.4], 2));
    out.push(box([LEVRE - 0.6, y, NORD - 0.4], [FOND + 0.6, y + 0.4, NORD + 0.6], 2));
  }

  // ─── LE ROND DE CIEL ───────────────────────────────────────────────────────
  //
  // Vu du fond, la bouche du puits est ce qu'on regarde. Un rectangle de 20,5
  // sur 12 se lit comme une trappe ; on veut un DISQUE — le ciel au bout d'un
  // tuyau. Le moteur ne connaît que des boîtes alignées sur les axes, donc on
  // abat les quatre angles en trois gradins, ce qui donne un octogone : à
  // quarante-deux mètres, un octogone est un rond.
  //
  // ILS SONT FANTÔMES, et pour une raison mesurée : en dur, les trois gradins
  // d'un angle sont espacés de 1,2 et 3,4 m — c'est-à-dire SOUS l'enjambée du
  // géant (3,60). Le banc d'essai a fait remonter un ×4 de la première assise
  // jusqu'à la lèvre en marchant dans un angle. Un chanfrein qui sert d'escalier
  // n'est plus un chanfrein. Fantômes, ils ne font que ce qu'on leur demande :
  // arrondir la bouche vue d'en bas.
  const collier = (yHaut: number, yBas: number, c: number): void => {
    for (const sx of [1, -1] as const) {
      for (const sz of [1, -1] as const) {
        const x = sx > 0 ? LEVRE : FOND;
        const z = sz > 0 ? SUD : NORD;
        out.push(
          box(
            [Math.min(x, x + sx * c * 1.6), yBas, Math.min(z, z + sz * c)],
            [Math.max(x, x + sx * c * 1.6), yHaut, Math.max(z, z + sz * c)],
            1,
            { ghost: true },
          ),
        );
      }
    }
  };
  collier(Y_LEVRE, -1.4, 2.6);
  collier(-1.0, -2.6, 1.7);
  collier(-2.2, -3.8, 0.85);

  // ─── LA MARGELLE ───────────────────────────────────────────────────────────
  //
  // 0,55, exactement celle du puits de la cour de pluie (règle 8). Elle borde
  // TROIS CÔTÉS et laisse le quatrième ouvert, et c'est tout le dessin de cette
  // salle : le puits n'a qu'une entrée, et c'est celle qu'on regarde.
  //
  // Ce n'est pas la balustrade de la règle 6, et je préfère l'écrire : une
  // balustrade calibrée (0,9 fois la taille du joueur, soit 6,48 m pour un
  // géant) fermerait le puits, c'est-à-dire fermerait la salle. Ici le vide EST
  // la porte. La margelle ne prétend pas retenir : elle dit où la pierre
  // s'arrête, elle empêche le petit d'y tomber PAR MÉGARDE (0,55 > son saut de
  // 0,323, il ne l'enjambe donc jamais sans le vouloir), et le côté ouvert est
  // dans l'axe de l'ouverture d'en face. Et l'on ne se fait pas mal en tombant.
  //
  // Elle DÉBORDE de 15 cm au-dessus du vide, comme toute margelle de puits — et
  // c'est aussi ce qui l'empêche de partager un plan avec la paroi qui la porte :
  // son bord intérieur est à 993,85 et 1006,15, la paroi à 994 et 1006. Le
  // troisième côté, à l'est, n'existe pas : la roche d'en face y monte en
  // falaise, elle borde mieux que n'importe quelle pierre.
  out.push(box([LEVRE, -0.25, SUD - 1.3], [FOND, SOCLE, SUD + 0.15], 3));
  out.push(box([LEVRE, -0.25, NORD - 0.15], [FOND, SOCLE, NORD + 1.3], 3));

  // ─── LA PORTE VIDE — l'étalon (règle 9) ────────────────────────────────────
  //
  // Un cadre de pierre sans porte, planté dans l'axe du saut, à 1,60 m du vide.
  // Son ouverture fait 1,90 × 2,80 : la petite face d'un portail, au centimètre,
  // c'est-à-dire l'objet que le joueur a mesuré du regard dans toutes les salles
  // depuis le hall. C'est le mètre-ruban, et il est posé là où l'on juge.
  //
  // CE QU'IL DIT, SANS UN MOT :
  //   — à ×1/4 on passe dessous comme sous un arc de triomphe ;
  //   — à ×1 on le franchit de justesse, épaules libres ;
  //   — à ×4 ON NE PASSE PAS. On le CONTOURNE — il reste 4,25 m de lèvre libre
  //     de chaque côté, largement de quoi pour 2,72 de large. Le géant apprend
  //     donc qu'il ne rentre pas dans une porte ordinaire AVANT de sauter, et
  //     l'ouverture d'en face, qu'il voit à travers ce cadre, n'est plus grande
  //     que d'un tiers.
  //
  // Les jambages montent DANS le linteau (leur dessus est à 3,05 pour un linteau
  // qui commence à 2,80) : leur face supérieure est donc enterrée. Le linteau
  // déborde d'eux en x comme en z, pour la même raison, dans l'autre sens.
  const PV_X = LEVRE - 1.6;
  out.push(box([PV_X - 0.5, -0.3, AXE - 1.5], [PV_X + 0.5, 3.05, AXE - 0.95], 3));
  out.push(box([PV_X - 0.5, -0.3, AXE + 0.95], [PV_X + 0.5, 3.05, AXE + 1.5], 3));
  out.push(box([PV_X - 0.65, 2.8, AXE - 1.68], [PV_X + 0.65, 3.35, AXE + 1.68], 3));

  out.push(...cadres());

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LA BOUCLE DE REPRISE — la vraie mission de cette salle
// ═════════════════════════════════════════════════════════════════════════════
//
// Les échecs de ×1/4 et de ×1 atterrissent au fond, à −42 ; un ×4 reste planté
// sur la vire, d'où il n'a qu'à repasser par-dessus l'arête pour tomber au fond
// à son tour. Sans remontée, la salle est un piège et non une énigme.
//
// ET IL Y A UN TEMPS. Le joueur doit rater DEUX FOIS avant de comprendre. Si le
// troisième essai coûte quinze secondes de marche, il n'aura pas lieu : il
// s'obstinera sur le deuxième, ou il partira. Toute la conception ci-dessous
// tient dans cette contrainte-là, et pas dans l'élégance.
//
// POURQUOI PAS UN ESCALIER. C'est la première idée, et elle est morte au
// premier calcul. Un petit joueur va quatre fois moins vite EN MÈTRES : à ×1/4,
// 7,6 × 0,25 = 1,9 m/s. Quarante-deux mètres de montée, même par une rampe à
// 45°, lui coûtent soixante mètres de chemin, donc trente secondes. Aucune
// pente ne sert à la fois le petit et le moyen : la remontée à pied est
// impossible par arithmétique, pas par manque de place.
//
// D'OÙ TROIS PORTES, et le fond du puits en compte deux, côte à côte, dont
// l'une est absurdement grande et l'autre absurdement petite. C'est la salle qui
// se redit elle-même au fond : ici comme là-haut, la question est « de quelle
// taille es-tu ? », et la réponse est une porte.
//
//   « la faille »  — petite face de 2,00 × 0,85 posée au ras de la barbotine.
//                    Le petit et le moyen y passent ; le géant, non (il lui
//                    faudrait 7,50 × 3,02). ON EN RESSORT UN CRAN PLUS GRAND, en
//                    haut, sur la terrasse : ×1/4 → ×1, ×1 → ×4.
//   « la gueule »  — grande face de 11,20 × 7,60, sur son socle de 0,55.
//                    Elle n'accueille personne d'autre que le géant en pratique,
//                    et ON EN RESSORT UN CRAN PLUS PETIT, en haut : ×4 → ×1.
//                    C'est la seule issue du géant tombé au fond, et c'est pour
//                    elle qu'elle existe.
//   « la jauge »   — les DEUX faces sur la terrasse, à quinze mètres l'une de
//                    l'autre et de part et d'autre du chemin. On y bascule
//                    ×1 ↔ ×4 sans quitter le bord. C'est le vestiaire de la
//                    salle, et c'est aussi son étalon : sa petite face fait
//                    2,80 × 1,90, comme la porte vide, comme toutes les portes.
//
// CHRONOMÉTRAGE (mesuré, voir la note en fin de fichier) : du fond au bord, la
// pire des routes — celle du petit, qui marche à 1,9 m/s — tient sous six
// secondes, dont l'essentiel est la traversée du fond. Les deux autres sont
// sous trois.
//
// ET LA PROPRIÉTÉ QUI FERME TOUT : ON NE DESCEND JAMAIS SOUS ×1/4.
// Descendre d'un cran exige de franchir une GRANDE face, il n'y en a que deux
// dans cette salle (« la gueule » au fond, « la jauge » en haut), et toutes deux
// sont posées sur un socle de 0,55 — infranchissable et invisible pour qui
// mesure 45 cm. Voir SOCLE. Un joueur à ×1/4 ne peut donc, par aucun chemin,
// atteindre ×1/16 : la démonstration ne dépend d'aucun test, elle est dans la
// hauteur de deux marches.

/** Petite face standard du jeu, et étalon de toute la salle. */
const ETALON_H = 2.8;
const ETALON_W = 1.9;

/** La faille : la plus petite porte qui laisse encore passer un joueur à ×1. */
const FAILLE_H = 2.0;
const FAILLE_W = 0.85;

// LE PLAN DE LA TERRASSE, et il n'a qu'une règle : LE CHEMIN RESTE LIBRE.
// L'axe z = 1000, de l'entrée à la lèvre, ne rencontre aucune face de portail
// et aucun socle — sinon on changerait de taille en marchant vers le bord, sans
// l'avoir voulu. Tout est donc rangé de part et d'autre :
//
//         nord          [1014] l'arche de la faille — on en SORT
//                       [1006] la petite face de la jauge — on y ENTRE
//   ─── z=1000 ───  entrée ──────────────────────── la lèvre, la porte vide
//                       [992,5] la grande face de la jauge — on y ENTRE
//         sud           [990]   la porte de la gueule — on en SORT
//
// Et chaque porte vous REND AU CHEMIN : on entre dans la petite face de la
// jauge en marchant vers le nord, on ressort au sud face au nord. Aucun détour,
// aucun demi-tour à faire.
const JAUGE_PETITE: V3 = [180, Y_LEVRE, 1006];
const JAUGE_GRANDE: V3 = [180, SOCLE, 992.5];
// LA FAILLE EST PLANTÉE À DEUX MÈTRES DE L'AXE DE CHUTE, et c'est chronométré,
// pas décoratif : le petit marche à 1,90 m/s, donc chaque mètre du fond lui
// coûte plus d'une demi-seconde. Elle est posée SUR la barbotine (y = −41,90),
// pour que le seuil de la face soit exactement le sol qu'on foule — sans quoi
// l'on ressort en haut quarante centimètres au-dessus du socle, et l'on tombe.
const FAILLE_BAS: V3 = [202, Y_FOND + 0.1, 998];
const FAILLE_HAUT: V3 = [186, SOCLE, 1008];
// LA GUEULE SE TIENT À TROIS MÈTRES DE LA PAROI, ET C'EST UNE MESURE.
//
// Une face de portail ne se franchit que lorsque l'ŒIL en traverse le plan, et
// l'œil est au centre du corps. Un géant a 1,36 m de rayon : plaqué contre un
// mur, son œil reste à 1,36 m de ce mur. Adossée à la paroi nord, cette arche
// était donc INFRANCHISSABLE PAR CELUI-LÀ MÊME POUR QUI ELLE EXISTE — le banc
// d'essai l'a montré en trois secondes, et rien dans le dessin ne le laissait
// voir. Toute face que doit franchir un ×4 a désormais au moins deux mètres
// d'air derrière elle.
const GUEULE_BAS: V3 = [200, Y_FOND + SOCLE, 1003];
const GUEULE_HAUT: V3 = [172, Y_LEVRE, 990];

/**
 * UN CADRE — deux jambages et un linteau autour d'une face de portail.
 *
 * Le portail n'est qu'un plan ; le cadre est ce qui le rend visible de loin, et
 * donc utilisable comme étalon. Toutes les faces de cette salle sont
 * perpendiculaires à z, ce qui permet un seul constructeur au lieu de deux.
 *
 * L'ouverture est 12 % plus large que la face : le moteur n'y laisse passer
 * qu'un joueur large de 0,9 fois la face, on ne se cogne donc jamais au jambage
 * en entrant. Le jambage MONTE DANS le linteau et s'enfonce de 30 cm sous ses
 * pieds : ses deux bouts sont enterrés, donc jamais coplanaires avec quoi que
 * ce soit. Le linteau déborde des jambages dans les deux autres directions,
 * pour la même raison.
 */
const cadre = (c: V3, h: number, w: number, ink: number): BoxDef[] => {
  const [cx, cy, cz] = c;
  const p = w * 0.3;
  const e = w * 0.28;
  const j = w * 0.56;
  const bas = cy - Math.max(0.3, h * 0.02);
  const hautJ = cy + h + e * 0.55;
  return [
    box([cx - j - e, bas, cz - p * 0.5], [cx - j, hautJ, cz + p * 0.5], ink),
    box([cx + j, bas, cz - p * 0.5], [cx + j + e, hautJ, cz + p * 0.5], ink),
    box(
      [cx - j - e - w * 0.03, cy + h, cz - p * 0.6],
      [cx + j + e + w * 0.03, cy + h + e, cz + p * 0.6],
      ink,
    ),
  ];
};

/**
 * UN SOCLE — la dalle de 0,55 sous une grande face. Voir SOCLE : c'est le
 * verrou qui interdit à un joueur de 45 cm de descendre un cran de plus.
 *
 * Il déborde largement DEVANT la face (du côté par où l'on ressort), parce que
 * c'est là qu'on est déposé : sortir d'une porte pour tomber aussitôt d'une
 * marche serait une brutalité gratuite. Et il s'enfonce de 30 cm dans le sol
 * qui le porte, donc son dessous n'est jamais coplanaire avec lui.
 */
const socle = (c: V3, w: number, devant: number, ink: number): BoxDef => {
  // Assez large pour porter les jambages : demi-face + épaisseur du jambage
  // (0,28 w) + 40 cm de marge. Un cadre dont les pieds débordent du socle
  // flotterait, et ça se verrait de loin.
  const demi = w * 0.5 + w * 0.32 + 0.4;
  return box(
    [c[0] - demi, c[1] - 0.85, Math.min(c[2], c[2] + devant) - 0.7],
    [c[0] + demi, c[1], Math.max(c[2], c[2] + devant) + 0.7],
    ink,
  );
};

const cadres = (): BoxDef[] => [
  // La jauge, en haut : la petite face au nord du chemin, la grande au sud.
  // Chacune vous rend AU CHEMIN — on entre par le nord, on ressort au sud face
  // au nord, et réciproquement. Deux portes, aucun détour.
  ...cadre(JAUGE_PETITE, ETALON_H, ETALON_W, 3),
  socle(JAUGE_GRANDE, ETALON_W * 4, 2.6, 2),
  ...cadre(JAUGE_GRANDE, ETALON_H * 4, ETALON_W * 4, 3),
  // La faille : la fente du fond, et l'arche où elle dépose, en haut.
  ...cadre(FAILLE_BAS, FAILLE_H, FAILLE_W, 3),
  socle(FAILLE_HAUT, FAILLE_W * 4, -2.6, 2),
  ...cadre(FAILLE_HAUT, FAILLE_H * 4, FAILLE_W * 4, 3),
  // La gueule : l'arche du géant au fond, et la porte ordinaire où elle dépose.
  // Le socle de la gueule s'arrête à 1,10 m de l'axe de chute : c'est ce qui
  // garantit qu'un petit joueur qui tombe se pose dans la barbotine et jamais
  // dessus — d'où il pourrait franchir la grande face et descendre à ×1/16.
  socle(GUEULE_BAS, ETALON_W * 4, -1.2, 2),
  ...cadre(GUEULE_BAS, ETALON_H * 4, ETALON_W * 4, 3),
  ...cadre(GUEULE_HAUT, ETALON_H, ETALON_W, 3),
];

/**
 * LES TROIS PAIRES.
 *
 * L'ORIENTATION EST LA MOITIÉ DU TRAVAIL, et elle se raisonne à l'envers : on
 * ne franchit une face que par SON AVANT (le côté de sa normale), et l'on
 * ressort DEVANT sa jumelle, en s'éloignant d'elle. Une face mal tournée dépose
 * le joueur dos à la salle, et son premier pas le renvoie d'où il vient. Ici,
 * les six normales sont toutes ±z, et chaque sortie regarde le chemin.
 */
const portes: PortalPairDef[] = [
  {
    id: 'conduit-jauge',
    colorBig: 0xb8532f,
    colorSmall: 0x2f4b7c,
    smallHeight: ETALON_H,
    smallWidth: ETALON_W,
    big: { position: JAUGE_GRANDE, yaw: 0 },
    small: { position: JAUGE_PETITE, yaw: Math.PI },
  },
  {
    id: 'conduit-faille',
    colorBig: 0xb8532f,
    colorSmall: 0x2f4b7c,
    // 2,00 × 0,85 : la plus petite porte où un joueur de 1,80 sur 0,68 tienne
    // encore (il lui faut 1,875 × 0,756). Un géant de 7,20 sur 2,72 n'en
    // approche pas — il lui faudrait 7,50 × 3,02, soit quatre fois cette porte.
    // C'est cette seule cote qui fait de « la gueule » la sienne.
    smallHeight: FAILLE_H,
    smallWidth: FAILLE_W,
    big: { position: FAILLE_HAUT, yaw: Math.PI },
    small: { position: FAILLE_BAS, yaw: 0 },
  },
  {
    id: 'conduit-gueule',
    colorBig: 0xb8532f,
    colorSmall: 0x2f4b7c,
    smallHeight: ETALON_H,
    smallWidth: ETALON_W,
    big: { position: GUEULE_BAS, yaw: Math.PI },
    small: { position: GUEULE_HAUT, yaw: 0 },
  },
];

export const CONDUIT: SalleModule = {
  nom: 'conduit',
  region: {
    name: 'conduit',
    min: [100, -60, 900],
    max: [300, 40, 1100],
    // LA TERRE, APRÈS LA PIERRE ET L'EAU. La carrière des trois creux était
    // bleue, la cour de pluie grise et trempée ; ce conduit est chaud et sec,
    // taillé dans l'argile crue. Même trait, mêmes aplats, même grain qu'ailleurs
    // — seule la palette change (règle 3 des régions), et elle FONCE À MESURE
    // QU'ON DESCEND, ce qui est la seule façon de faire lire quarante mètres de
    // paroi en aplats. Le fond n'est pas noir : il est sombre et il a une flaque
    // claire dedans, pour qu'on ait quelque chose à regarder en tombant.
    paper: '#e9e2d4',
    colors: [
      '#ded3bd', // 0 — la barbotine, et elle seule. Le seul aplat clair du fond.
      '#a8967a', // 1 — l'argile du haut : terrasse, parois, chanfrein
      '#4a453d', // 2 — l'ombre du bas : le sol, les assises, les socles
      '#b8532f', // 3 — la terre cuite. L'accent : les cadres, la margelle, la vire
    ],
    ink: '#191713',
    // Le puits fait 42 m de creux et 88 m de large. 200 laisse la salle
    // entièrement lisible — depuis la lèvre on doit voir le fond — et efface
    // tout ce qui pourrait flotter au-delà de la parcelle.
    brouillard: 200,
  },
  bounds: { min: [100, -60, 900], max: [300, 40, 1100] },
  boxes: decor(),

  portals: portes,

  stations: [
    // 1. L'approche. Le Pinceau vole bas au-dessus de la terrasse et va droit
    //    au bord : la salle se lit d'un coup d'œil, il n'y a rien à chercher.
    [178, 1.6, AXE],
    // 2. La porte vide, au ras du vide. C'est le point de vue de la salle.
    [LEVRE - 1.6, 1.5, AXE],
    // 3. AU MILIEU DU PUITS, DANS LE VIDE. Le Pinceau vole, le joueur non — et
    //    c'est le seul endroit du voyage où cet écart soit le sujet même du
    //    lieu. Il descend là où l'on tombe.
    [200, -16, AXE],
    // 4. Le fond, la récompense de l'erreur (règle 10).
    [200, Y_FOND + 1.2, AXE],
    // 5. La vire, et l'ouverture qu'on a manquée deux fois.
    [ARETE + 2.5, Y_VIRE + 1.4, AXE],
    // 6. Le tunnel, sur le seuil de la salle suivante.
    [TUNNEL_BOUT - 1.5, Y_TUNNEL + 1.4, AXE],
  ],

  // ─── LE RACCORD ────────────────────────────────────────────────────────────
  // ON ARRIVE À ×1/4, et c'est la seule chose que ce fichier demande à
  // l'assemblage. La salle d'avant est la cour de pluie, qu'on traverse à
  // quarante-cinq centimètres : on entre donc ici dans la taille où l'on était,
  // face à un puits qui fait quatre-vingt-treize fois la sienne. Le premier
  // essai — le petit — se joue sans qu'on ait rien décidé, ce qui est
  // exactement l'ordre qu'on veut : on manque, PUIS on se demande pourquoi.
  //
  // ON REPART À ×1, parce qu'on ne franchit l'ouverture qu'à cette taille-là.
  // La sortie est au bout du tunnel : c'est le seul endroit de la salle où la
  // taille du joueur soit connue d'avance, et l'assemblage peut compter dessus.
  entree: { position: [178, Y_LEVRE, AXE], echelle: -1 },
  sortie: { position: [TUNNEL_BOUT - 1, Y_TUNNEL, AXE], echelle: 0 },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUI A ÉTÉ MESURÉ DANS CETTE GÉOMÉTRIE-CI, ET NON DANS UNE AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rejeu des SIX FAÇONS DE SAUTER × TROIS TAILLES, arête à 15,5 m. « portée »
 * est l'abscisse atteinte au moment où l'on passe le niveau −32, comptée depuis
 * la lèvre. Le saut est pressé UNE FOIS au bord, comme le ferait un joueur :
 * maintenir la touche pendant la course fait rebondir et fait quitter la lèvre
 * au hasard d'un rebond — cela mesure l'aléa du pilote, pas la portée du joueur.
 *
 *                        ×1/4              ×1                  ×4
 *   à l'arrêt            7,31  au fond    14,36  au fond      la paroi, vire
 *   à l'arrêt + saut     7,55  au fond    16,52  TUNNEL       la paroi, vire
 *   en courant           < 8   au fond    14,36  au fond      la paroi, vire
 *   en courant + saut    < 8   au fond    16,90  TUNNEL       la paroi, vire
 *   sprint              13,10  au fond    20,24  TUNNEL       la paroi, vire
 *   sprint + saut       13,98  au fond    20,24  TUNNEL       la paroi, vire
 *
 *   ×1/4 : ÉCHOUE PAR LES SIX CHEMINS. Son meilleur coup atteint 13,98 —
 *          il manque l'arête de 1,52 m, soit 3,4 fois sa propre taille. Ce
 *          n'est pas un pixel, ça se voit en tombant.
 *   ×1   : PASSE PAR QUATRE CHEMINS SUR SIX. Ne passent pas : se laisser
 *          tomber à l'arrêt, et courir sans sauter. C'EST L'ENSEIGNEMENT, PAS
 *          UN DÉFAUT — c'est même le seul moment du jeu qui dise « l'élan
 *          compte ».
 *   ×4   : SE POSE SUR LA VIRE PAR LES SIX CHEMINS, et n'entre jamais. Poussé
 *          à fond contre l'ouverture, il s'arrête à x = 209,14, soit 1,36 m
 *          avant la paroi : son propre rayon. Il lui faudrait 2,74 de large,
 *          l'ouverture en fait 2,40.
 *
 * OÙ CES NOMBRES DIFFÈRENT DE `MESURES.md`, ET POURQUOI. MESURES.md donne au
 * ×1/4 un meilleur coup à 14,34 et je mesure 13,98 ; il donne au ×1 « 1,83 m de
 * rab en courant et sautant » (soit 17,33) et je mesure 16,90. Les deux écarts
 * vont dans le même sens et ont la même cause : l'INSTANT DU SAUT. Sauter un
 * ou deux pas trop tôt coûte quelques dixièmes de mètre, et il n'existe pas de
 * « bon » instant unique — c'est un continuum. Mes chiffres sont donc un peu
 * plus PRUDENTS que ceux du banc d'origine, dans les deux sens à la fois, ce
 * qui ÉLARGIT la fenêtre plutôt que de la rétrécir : le petit manque de
 * davantage, et le moyen a un peu moins de rab. Les conclusions qualitatives
 * — qui passe, qui échoue, par quels chemins — sont identiques ligne pour
 * ligne à celles de `MESURES.md` à 15,5 m. Je n'ai touché à aucune cote.
 *
 * LA REMONTÉE, CHRONOMÉTRÉE du fond jusqu'au bord du puits :
 *
 *   ×1/4 : 4,5 s depuis l'aplomb de la chute, 6,6 s dans le pire cas mesuré
 *          (celui qui se pose le plus loin de la faille, à x = 206). Il ressort
 *          à ×1, à sept mètres de la lèvre.
 *   ×1   : 1,5 s. Il ressort à ×4.
 *   ×4   : 5,6 s par la gueule. Il ressort à ×1.
 *
 * Aucun de ces trajets ne demande un saut ni un geste d'adresse : on marche, on
 * franchit une porte, on est au bord. Le troisième essai coûte donc entre deux
 * et sept secondes, et il aura lieu.
 *
 * LE VOYAGE COMPLET, joué d'un bout à l'autre avec un seul joueur : arrivée à
 * ×1/4 (10 s de terrasse) → essai petit → chute → 6,6 s de remontée → jauge
 * (2,8 s) → essai géant → vire → il pousse contre l'ouverture et n'entre pas →
 * il se laisse tomber → gueule (5,4 s) → essai à taille d'homme, en courant et
 * en sautant → tunnel → sortie à 0,66 m du point de raccord.
 *
 * ON NE SE PIÈGE NULLE PART, et voici les neuf états possibles :
 *
 *   sur la TERRASSE   ×1/4 → la jauge (petite face) le fait ×1
 *                     ×1   → la jauge, dans les deux sens
 *                     ×4   → la jauge (grande face) le fait ×1
 *   sur la VIRE       les trois tailles quittent la vire en marchant vers
 *                     l'ouest ; vérifié, elles se posent toutes au fond.
 *   au FOND           ×1/4 → la faille (ressort à ×1)
 *                     ×1   → la faille (ressort à ×4)
 *                     ×4   → la gueule (ressort à ×1)
 *
 * Et l'on ne descend jamais sous ×1/4 : les trois grandes faces de la salle
 * sont sur un socle de 0,55, vérifié une par une avec un joueur de 45 cm qui
 * court, sprinte et saute contre chacune. Les trois le retiennent.
 *
 * `facesConfondues(boxes, 0,25)` rend 0 sur les 63 boîtes.
 * `verifierParcelleSalle` rend vide. `npx tsc --noEmit` et `npm run check`
 * passent en entier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE DONT JE NE SUIS PAS SÛR — et je préfère l'écrire que le taire
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. LE SPRINT REND LA SALLE TROP FACILE À ×1. Quatre chemins sur six passent,
 *    dont les deux sprints avec vingt mètres de portée — c'est-à-dire qu'un ×1
 *    lancé traverse le puits de part en part et entre par l'ouverture sans même
 *    voir la vire. La leçon tient (le petit échoue, le grand ne rentre pas),
 *    mais la marche « il faut de l'élan » disparaît pour qui sprinte toujours.
 *    Je n'y touche pas : la consigne dit que le levier serait
 *    `SPRINT_MULTIPLIER`, pas la géométrie, et ce fichier n'a pas le droit d'y
 *    toucher. À surveiller le jour où l'on jouera la suite d'un bout à l'autre.
 *
 * 2. LA VITESSE À L'ARRIVÉE N'EST PAS ÉPROUVÉE POUR DE VRAI. Le ×1 qui entre en
 *    sprintant arrive dans le tunnel à près de dix mètres par seconde ; la
 *    simulation dit qu'il s'y arrête, mais rien ne dit ce que ça FAIT à la
 *    caméra. C'est le genre de chose qu'on ne juge qu'en jouant.
 *
 * 3. L'APPROCHE DE DIX SECONDES à ×1/4 est un pari. Dix-huit mètres de
 *    terrasse à 1,90 m/s, c'est long pour arriver quelque part, et court pour
 *    comprendre où l'on est. Je l'ai voulu ainsi (on arrive de la cour de
 *    pluie, où l'on marchait déjà vingt-sept mètres), mais si la salle paraît
 *    lente au début, c'est ce nombre-là qu'il faut réduire, pas le puits.
 *
 * 4. LE GÉANT ENJAMBE LES PORTES ORDINAIRES AU LIEU D'ÊTRE REFUSÉ. À ×4,
 *    l'enjambée vaut 3,60 : la porte vide (3,35 avec son linteau) et la petite
 *    face de la jauge (3,33) se montent d'un pas, et le joueur se retrouve
 *    DEBOUT DESSUS au lieu de buter contre. Ce n'est pas un piège — on en
 *    redescend d'un pas — et je trouve même l'image juste : un géant enjambe
 *    une porte d'homme. Mais ce n'est pas ce que j'avais dessiné, et quelqu'un
 *    qui voudrait un refus franc devrait monter ces linteaux au-dessus de 3,60.
 *
 * 5. LE RENDU N'EST PAS VÉRIFIÉ, ET IL PORTE DEUX PARIS. Le « rond de ciel »
 *    est un octogone fait de douze boîtes fantômes ; à quarante-deux mètres il
 *    devrait se lire comme un disque, mais je n'ai pas d'yeux pour le dire. Et
 *    la lisibilité de l'ouverture depuis la lèvre repose entièrement sur son
 *    cadre en saillie de 25 cm, lui aussi fantôme : s'il ne se détache pas
 *    assez, le joueur ne verra pas ce qu'il doit viser, et toute la salle
 *    tombe. Ces deux-là se règlent à l'œil, en jouant, et pas ici.
 *
 * 6. LA BARBOTINE NE FAIT RIEN. Le moteur n'a pas de dégâts de chute : cette
 *    flaque ne peut donc pas amortir quoi que ce soit, elle ne fait que le
 *    DIRE. Si un jour la chute coûte quelque chose, il faudra la rendre
 *    fonctionnelle, et ce fichier ne saura pas tout seul qu'il a menti.
 */
export const CALIBRAGE_CONDUIT = {
  sautPetit: SAUT_PETIT,
  oeilPetit: OEIL_PETIT,
  enjambeeMoyen: ENJAMBEE_MOYEN,
  socle: SOCLE,
  /** L'arête extérieure de la vire, comptée depuis la lèvre. LA cote de la salle. */
  arete: ARETE - LEVRE,
  /** La fenêtre mesurée où cette cote peut vivre. Voir MESURES.md. */
  fenetre: [14.4, 17.2],
  /** Meilleure portée mesurée à ×1/4, et à ×1 sans sprint. */
  porteesMesurees: { petit: 13.98, moyen: 16.9 },
};
