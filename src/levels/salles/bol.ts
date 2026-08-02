import type {
  BoxDef,
  CarryableDef,
  PortalPairDef,
  SocketDef,
  VeilleurDef,
} from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LE BOL, puis LE FOND — les deux dernières salles du premier mouvement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA THÈSE DU JEU, DITE DANS UNE PIÈCE DE SIX MÈTRES
 *
 *     Le monde ne change pas. C'est vous qui changez.
 *
 * On peut l'écrire. On peut la montrer par une falaise qui devient une marche.
 * Ou l'on peut faire ceci : mettre LES DEUX FACES D'UNE MÊME PORTE dans la même
 * pièce, sur deux murs opposés. On entre, on traverse, on se retourne — et il
 * n'y a rien de nouveau à voir. La pièce est la même, l'étagère est la même, le
 * bol est le même. Seulement l'étagère est devenue un viaduc, et le bol une
 * citerne de quatre mètres où l'on peut marcher.
 *
 * Aucun objet n'a bougé. C'est tout le jeu, en une porte.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ELLE N'ENSEIGNE RIEN, ET C'EST SA FONCTION. Le mouvement a appris trois
 * choses : compter les portes (« les trois creux »), vivre à quarante-cinq
 * centimètres (« la pluie »), et qu'une caisse portée change de taille avec son
 * porteur (le hall). Le bol ne demande que ça, toutes ensemble, et ne montre
 * aucune mécanique neuve. C'est une salle de bravoure : elle vérifie l'acquis.
 *
 * CE QU'ON DEMANDE, EN UNE PHRASE : comprendre que la solution était sous les
 * yeux depuis l'entrée, et qu'il fallait la regarder d'ailleurs.
 *
 * L'ERREUR, ET ELLE EST PRÉVUE (règle 10). On arrive à ×1, on voit le bol posé
 * sur l'étagère, on voit au fond du bol un logement gros comme une pièce de
 * monnaie, on a une pierre dans les bras — et l'on s'acharne. On vient coller
 * son nez au nez de l'étagère, on se penche, on vise l'intérieur du bol, on
 * lâche : la pierre tombe DANS le bol, à trente centimètres du logement, et
 * jamais dedans. On recommence. Trente secondes, aucune conséquence — la pierre
 * se reprend d'un geste, il y en a deux, et rien n'est verrouillé — et une
 * bonne colère utile. Puis on regarde la porte du fond de la pièce.
 *
 * POURQUOI C'EST IMPOSSIBLE À ×1, ET CE N'EST PAS UNE VÉRIFICATION MAIS UNE
 * FORME. Le moteur pose ce qu'on porte à `0,34 × échelle + 2 × arête` devant
 * soi, et jamais SOUS SES PROPRES PIEDS (`holdPoint` borne la hauteur à celle du
 * porteur). À ×1, avec une pierre de 0,12, cette distance vaut entre 0,436 et
 * 0,580 selon qu'on cale ou non contre un mur. Le logement, lui, accepte à
 * 0,09 m près. Il faudrait donc se tenir à 0,346–0,670 de son axe, ET à sa
 * hauteur. Or, à ×1, il n'existe autour du bol que quatre endroits où poser les
 * pieds, et pas un ne tombe dans cette couronne :
 *
 *   — LE SOL DE LA PIÈCE. On y est 0,95 m sous le logement : hors de portée en
 *     hauteur, dix fois la tolérance.
 *   — LE DESSUS DE L'ÉTAGÈRE. Bonne hauteur, mais la panse du bol tient à
 *     0,90 m de son axe quiconque a 0,34 m de rayon : la pierre tombe au mieux
 *     à 0,32 du logement.
 *   — LE BORD DU BOL. On y est 0,51 m AU-DESSUS du logement, et le moteur ne
 *     dépose jamais plus bas que les pieds.
 *   — LE FOND DU BOL, où l'on entre par l'ébrèchement en enjambant 0,18. Là on
 *     est trop PRÈS : l'intérieur ne fait que 0,50 m de rayon, on ne peut donc
 *     pas s'éloigner de plus de 0,15 de l'axe, et la pierre part se poser au
 *     moins 0,286 plus loin — trois fois la tolérance.
 *
 * La couronne des positions qui marcheraient est EXACTEMENT celle qu'occupe la
 * paroi du bol. Le bol interdit ce que le bol demande, et il n'y a rien à
 * expliquer : on le sent en trois essais. Le banc d'essai le confirme par la
 * force brute : huit cent mille dépôts tentés à ×1 depuis toutes les positions
 * d'appui du voisinage, quarante-huit lacets et vingt-neuf inclinaisons chacune
 * — aucun ne se loge, et le meilleur manque de 0,37 m pour une tolérance de
 * 0,09.
 *
 * À ×1/4, tout se renverse d'un coup. La pierre portée vaut 0,12 — elle a
 * traversé la porte dans les bras, comme la bille du hall — et la distance de
 * dépose tombe à 0,181–0,325. On est debout dans une citerne de quatre mètres, le
 * logement est un dallage à ses pieds, on baisse les yeux et on pose. C'est le
 * même geste, au même endroit, avec le même objet.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE FOND — ne rien demander, et donner la couleur
 *
 * La porte que le Pinceau dessine sur le mur nord ouvre sur une grève, à ×1/4,
 * sous une pluie qui vient de cesser. Le pinceau bleu y dort, et il n'accepte
 * que ×1/4 : la taille où l'on vit depuis le début du mouvement. Aucune
 * condition, aucune épreuve, une seule sortie — on a déjà tout fait.
 *
 * IL Y A UNE CHOSE À REGARDER, ET C'EST LA MÊME. Au bas de la grève, dans la
 * roche, une vasque creusée par la mer : MÊME RAYON, MÊME PROFIL que le bol
 * qu'on vient de quitter, aux mêmes cotes exactes (voir `R_INT`/`R_EXT`, qui
 * servent aux deux). Sauf qu'ici on y entre en marchant, qu'elle est pleine
 * d'eau de mer, et qu'au centre — là où l'on venait de poser une pierre — le
 * bleu dort. On a fabriqué le geste dix minutes plus tôt ; on le retrouve fait.
 *
 * Puis l'on remonte tout le mouvement à l'envers, et c'est la vraie récompense.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES QUATRE RÈGLES PROPRES À LA SUITE, ET COMMENT ELLES SONT TENUES
 *
 * RÈGLE 8 — revisiter un lieu connu à une taille nouvelle.
 *   LE BOL revisite L'ÉTABLI DU HALL : deux billes identiques, des creux de
 *   tailles différentes, et la seule question « combien de portes ». Ici
 *   l'établi est devenu une étagère, les billes deux pierres, et le creux est
 *   au fond d'un récipient dans lequel il faut entrer.
 *   LE FOND revisite LA COUR DE PLUIE : c'est là que va toute cette eau. Le
 *   caniveau y arrive en ruisseau, la flaque de quatre mètres y est devenue la
 *   mer, et la pluie a cessé. Même taille de joueur, même averse — l'autre
 *   bout du même orage.
 *
 * RÈGLE 9 — l'étalon. Les deux faces de « bol-tour » sont dans la même pièce.
 *   La petite mesure 0,70 × 0,475, la grande 2,80 × 1,90 — c'est-à-dire la
 *   porte d'origine du jeu et son quart exact, à six mètres l'une de l'autre,
 *   visibles ensemble. Le rapport 4 n'est pas à estimer : il est affiché.
 *
 * RÈGLE 10 — le spectaculaire récompense l'erreur. Voir plus haut.
 *
 * RÈGLE 11 — deux logements n'acceptent jamais la même taille. Il n'y en a
 *   qu'un dans tout le module.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES NOMBRES DU JOUEUR, AUX DEUX SEULES TAILLES QU'ON PREND ICI
 *
 *            taille  enjambée   saut   largeur  soulève  peut poser à
 *   ×1/4      0,45     0,225    0,323   0,17    0,2475   0,085 + 2a … +0,8·2a
 *   ×1        1,80     0,90     1,293   0,68    0,99     0,34  + 2a … +0,8·2a
 *
 * `a` est l'arête de ce qu'on porte, et la fourchette vient de ce que le moteur
 * essaie huit rapprochements successifs avant de renoncer (`DROP_CLOSENESS_FLOOR`
 * = 0,4). Ce sont ces deux fourchettes — 0,436…0,580 et 0,181…0,325 — qui
 * décident de toute la salle, et pas la taille du joueur.
 */

type V3 = [number, number, number];

/**
 * Toute boîte d'ici porte `region: 'bol'`, et aucune ne peut l'oublier puisque
 * rien ne se construit autrement. Les deux salles partagent la région parce que
 * le contrat n'en accorde qu'une par module — voir la note en fin de fichier.
 */
const box = (
  min: V3,
  max: V3,
  ink = 1,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'bol', ...opts });

// ═════════════════════════════════════════════════════════════════════════════
// LES DEUX COTES QUI GOUVERNENT TOUT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * L'ARÊTE DE LA PIERRE, à ×1. Divisée par quatre en traversant la porte dans
 * les bras, elle vaut 0,12 — et c'est ce que le logement attend.
 *
 * Pourquoi 0,48 et pas 0,50 : parce que la PETITE face de « bol-tour » ne
 * laisse passer, pour un objet libre, que `largeur × 0,9` = 0,4275. Une pierre
 * de 0,48 ne peut donc JAMAIS franchir cette porte-là autrement que portée. Ce
 * détail n'est pas cosmétique : il interdit à la pierre de grossir au-delà de
 * 0,48, donc de dépasser le seuil de levage à ×1 (0,99), donc de devenir
 * inramassable. C'est le seul verrou qui rende la salle impossible à casser
 * pour de bon, et il tient dans un écart de douze pour cent.
 */
const PIERRE = 0.48;
/** La même, après une porte. 48 % du seuil de levage à ×1/4 (0,2475). */
const PIERRE_PETITE = PIERRE / 4;

/**
 * RAYON D'ACCUEIL DU LOGEMENT — 0,09, c'est-à-dire le défaut (0,75 × l'arête).
 *
 * Il est écrit en clair parce que c'est LE nombre de la salle : il doit rester
 * franchement sous 0,436 − 0,15 (ce dont on ne peut pas s'approcher à ×1 en se
 * tenant DANS le bol) et sous 0,90 − 0,58 (ce dont on ne peut pas s'approcher à
 * ×1 en se tenant SUR l'étagère). Les deux bornes valent 0,286 et 0,32 : 0,09
 * laisse un facteur trois. Le monter à 0,20 ne casserait rien ; le monter à
 * 0,30 rendrait la salle faisable à taille d'homme, et il n'y aurait plus de
 * salle.
 */
const PORTEE_LOGEMENT = 0.09;

// ═════════════════════════════════════════════════════════════════════════════
// LA PIÈCE
// ═════════════════════════════════════════════════════════════════════════════
//
// Six mètres sur six, trois mètres vingt sous plafond. À ×1 c'est une pièce ;
// à ×1/4 c'est une halle de vingt-quatre mètres et sept de haut. Fermée sur les
// quatre côtés et par le dessus : il n'y a pas de troisième chemin, parce qu'il
// n'y a pas de troisième chemin.

const P_X0 = -343.0;
const P_X1 = -337.0;
const P_Z0 = 1237.0;
const P_Z1 = 1243.0;
const P_HAUT = 3.2;

/**
 * L'ÉTAGÈRE — et le viaduc.
 *
 * DESSUS À 0,92, ET PAS 0,90. L'enjambée d'un joueur ×1 vaut exactement 0,90
 * (`PLAYER_HEIGHT × STEP_FRACTION`) : une étagère à 0,90 se monterait EN
 * MARCHANT, sans même s'en apercevoir, et l'objet cesserait d'être une étagère
 * pour devenir une estrade. Deux centimètres au-dessus, il faut sauter.
 *
 * DESSOUS À 0,80, ET C'EST UNE CONSÉQUENCE. Un joueur ×1 mesure 1,80 : il ne
 * passe pas sous le tablier. Un joueur ×1/4 en fait 0,45 et marcherait dessous
 * debout, entre les piles, comme sous un viaduc — mais il n'en aura jamais
 * l'occasion, et c'est voulu (voir « la clôture »). Les arches sont là pour
 * qu'on les voie depuis le sol de la pièce, pas pour qu'on y aille.
 *
 * PROFONDEUR 2,15, ce qui est beaucoup pour une étagère et juste pour un
 * viaduc. Le bol est POUSSÉ AU FOND, contre le mur, comme on pousse un plat sur
 * une étagère : il reste devant lui une coursive de 0,43 entre la margelle et
 * sa panse — une fois sa taille pour le joueur ×1/4, et trop étroite de moitié
 * pour un joueur ×1, qui ne pourra donc jamais s'y tenir même s'il montait.
 */
const ETAGERE_Y = 0.92;
const ETAGERE_NEZ = -339.0;

/**
 * LE GARDE-CORPS DU VIADUC — plein, et pas à barreaux.
 *
 * La règle 6 demande de border le vide. Le vide, ici, c'est 0,92 m, soit deux
 * fois la taille du joueur ×1/4 : de quoi tomber et se retrouver dans une pièce
 * dont on ne remontera pas. La cote canonique s'applique donc : 0,38 au-dessus
 * du tablier, c'est-à-dire AU-DESSUS DE SON SAUT (0,323) et SOUS SES YEUX
 * (0,414) — il ne le franchit pas, il voit par-dessus.
 *
 * Il est PLEIN et non ajouré, à l'inverse des grilles des « trois creux », et
 * pour une raison mesurée : le joueur ×1 doit voir le fond du bol depuis le sol
 * de la pièce, et sa ligne de visée passe 17 cm au-dessus de cette margelle. Une
 * rangée de barreaux espacés de 11 cm en travers de ce regard-là aurait été une
 * palissade posée devant la seule chose qu'il faut voir.
 */
const MARGELLE_HAUT = 1.32;

/**
 * LE BOL — un mètre douze de large, cinquante-quatre centimètres de haut : la
 * forme d'un bol à thé, la taille d'une jarre (voir la note finale).
 *
 * Un mètre d'intérieur, c'est QUATRE MÈTRES pour un joueur de quarante-cinq
 * centimètres. Cette cote-là est la seule qui vienne de l'image ; les quatre
 * hauteurs qui suivent viennent toutes d'un nombre du moteur, et chacune est un
 * verrou :
 *
 *   FOND À 0,95, soit 3 cm au-dessus du tablier. C'est là que le logement
 *     attend, et c'est le seul plan de toute la salle qui soit exactement à la
 *     hauteur des pieds de qui doit s'en servir.
 *   BORD À 1,46, soit 0,51 AU-DESSUS DU FOND et 0,54 au-dessus du tablier. Le
 *     saut d'un joueur ×1/4 le porte à 0,306 mesurés, sprint et élan compris
 *     (l'élan allonge la portée, pas la hauteur — MESURES.md) : il n'entre pas
 *     dans le bol par-dessus le bord, et il n'en sort pas non plus.
 *   ÉBRÈCHEMENT AU RAS DU FOND, c'est-à-dire 0,95 — et il a fallu deux
 *     démolitions du harnais pour arriver à ce nombre-là.
 *     Il était d'abord à 0,20 sous le bord : on montait du tablier sur
 *     l'ébrèchement, puis de l'ébrèchement sur le bord, deux enjambées de 0,19,
 *     et de là on sautait par-dessus la margelle du viaduc pour s'écraser dans
 *     la pièce. On l'a descendu à 0,18 au-dessus du tablier : le bord devenait
 *     inatteignable, mais l'ébrèchement lui-même restait un tremplin — 0,306 de
 *     saut depuis 1,10 fait 1,406, et la margelle n'est qu'à 1,32, à quarante
 *     centimètres de là.
 *     UNE BRÈCHE EST UN ESCALIER SI ON L'OUBLIE. La seule cote qui n'en fasse
 *     pas un est celle du fond : la paroi est cassée jusqu'à sa base, il n'y a
 *     donc AUCUN niveau intermédiaire dans tout le bol, et les deux seules
 *     hauteurs où l'on pose le pied sur cette étagère sont 0,92 et 0,95. Le
 *     saut le plus haut qu'on puisse y prendre culmine à 1,262 ; la margelle
 *     est à 1,32. Six centimètres, et ils sont mesurés.
 *     On entre et l'on sort donc en marchant, mais SEULEMENT par là : partout
 *     ailleurs le bord fait 0,51 au-dessus du fond, c'est-à-dire une fois et
 *     demie le saut. Sans la brèche, ce bol serait un piège parfait.
 *   LÈVRE À 1,42–1,46, débordant à 0,585. Elle donne au bol son évasement sans
 *     créer AUCUNE saillie entre le tablier et le bord : la moindre corniche à
 *     moins de 0,323 sous la lèvre aurait été un marchepied de plus.
 *
 * ET C'EST PAR LA BRÈCHE QU'ON VOIT LE FOND. Le bord monte à 1,46 et l'œil du
 * joueur ×1 est à 1,656 : de si près, il ne verrait rien par-dessus. Mais
 * l'ébrèchement regarde l'ouest-nord-ouest, c'est-à-dire la pièce. La ligne qui
 * part de l'œil, passe 17 cm au-dessus de la margelle du viaduc, franchit
 * l'entaille et tombe sur le logement est vérifiée par lancer de rayons contre
 * les 207 boîtes du module : elle est vraie sur une bande de 49 cm, entre 1,46
 * et 1,95 m de l'axe — c'est-à-dire quand on vient s'accouder à l'étagère, et
 * pas avant. On voit le fond du bol par le trou de son bord, et l'on voit qu'il
 * y a quelque chose de minuscule dedans.
 */
const R_INT = 0.5;
const R_EXT = 0.56;
const R_LEVRE = 0.585;
const BOL_X = -337.905;
const BOL_Z = 1240.0;
const BOL_FOND = 0.95;
const BOL_BORD = 1.46;
const BOL_EBRECHE = BOL_FOND;
/** Nombre de pierres de l'anneau. Seize : le bol est rond à un demi-millimètre. */
const BOL_N = 16;
/**
 * Les deux secteurs cassés. Le 7 et le 8 : quarante-cinq degrés à
 * l'ouest-nord-ouest, soit 0,42 m d'ouverture pour un joueur large de 0,17. Un
 * ébrèchement est asymétrique — un bol ne se casse pas au compas — et celui-ci
 * regarde LA PIÈCE : c'est par lui qu'on voit le fond du bol depuis le sol, et
 * c'est par lui qu'on entre une fois qu'on est petit. La même entaille sert la
 * question et la réponse.
 */
const BOL_CASSE = [7, 8];

// ═════════════════════════════════════════════════════════════════════════════
// L'ANNEAU — le bol, et plus tard la vasque de la grève
// ═════════════════════════════════════════════════════════════════════════════
//
// Un anneau de boîtes droites. Chaque pierre est la boîte englobante d'un
// secteur d'anneau : elle contient donc son secteur tout entier, et la réunion
// des seize couvre la couronne sans le moindre trou — c'est ce qui garantit
// qu'aucune paroi ne fuit, ce qu'un assemblage « quatre côtés et quatre coins »
// ne garantit pas (on obtient une croix, pas un octogone).
//
// L'encombrement d'une pierre déborde vers l'EXTÉRIEUR de la couronne, jamais
// vers l'intérieur : la boîte d'un secteur de 22,5° a ses quatre coins sur les
// deux cercles, et son coin intérieur se trouve à `rIn·cos(11,25°)` = 0,981·rIn
// de l'axe. L'intérieur du bassin reste donc rond à 1 % près.
//
// Chaque pierre a son propre dessus (2 mm d'écart) : une margelle n'a jamais
// deux pierres au même niveau, et deux plans confondus se disputent la
// profondeur. L'écart est toujours vers le HAUT, pour que le minimum du bord
// reste celui qu'on a calculé.
const anneau = (
  cx: number,
  cz: number,
  rIn: number,
  rOut: number,
  yBas: number,
  hautDe: (k: number) => number,
  n: number,
  ink: number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  for (let k = 0; k < n; k++) {
    const a0 = (2 * Math.PI * (k - 0.5)) / n;
    const a1 = (2 * Math.PI * (k + 0.5)) / n;
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (let s = 0; s <= 8; s++) {
      const a = a0 + ((a1 - a0) * s) / 8;
      for (const r of [rIn, rOut]) {
        const x = r * Math.cos(a);
        const z = r * Math.sin(a);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (z < z0) z0 = z;
        if (z > z1) z1 = z;
      }
    }
    out.push(box([cx + x0, yBas, cz + z0], [cx + x1, hautDe(k), cz + z1], ink));
  }
  return out;
};

/**
 * Dessus de la k-ième pierre du bol. Les deux secteurs cassés s'arrêtent bas.
 *
 * L'écart entre pierres vaut au plus 6 mm, et il est CYCLIQUE sur cinq : une
 * variation croissante aurait donné 3 cm d'écart d'un bout à l'autre, et le
 * bord ouest — celui par-dessus lequel le joueur ×1 regarde — se serait retrouvé
 * le plus haut de tous, juste assez pour lui boucher la vue.
 */
const hautDuBol = (k: number): number =>
  (BOL_CASSE.includes(k) ? BOL_EBRECHE : BOL_BORD) + (k % 5) * 0.0015;

/**
 * UN CADRE DE PORTE — deux jambages et un linteau autour d'une face de portail.
 *
 * Le portail n'est qu'un plan : le cadre est ce qui le rend visible de l'autre
 * bout de la pièce, et c'est à ce titre qu'il sert d'étalon (règle 9). Le
 * jambage monte DANS le linteau et le linteau déborde des jambages : aucun
 * dessus de l'un ne tombe dans le plan d'un dessous de l'autre.
 *
 * `axe` dit sur quel axe la porte est percée : 'x' pour une face de normale ±x
 * (les jambages s'écartent en z), 'z' pour l'inverse.
 *
 * SON ÉPAISSEUR N'EST PAS DÉCORATIVE, ET ELLE A ÉTÉ TROUVÉE EN CASSANT LA
 * SALLE. Une face de portail plaquée contre un mur ne se franchit JAMAIS : la
 * traversée se déclenche quand l'ŒIL coupe le plan, et l'œil est au centre du
 * corps — donc à 0,34 m du mur au plus près. Les deux grandes faces sont
 * plantées 0,60 m EN AVANT de leur mur, et le cadre est assez profond (0,32 fois
 * la largeur de la porte, soit 0,61) pour que la poche laissée derrière ne fasse
 * plus que 0,30 m : un joueur ×1 en fait 0,68, il ne peut donc pas s'y glisser
 * par le côté, et il n'existe aucun moyen d'être derrière une porte sans
 * l'avoir franchie.
 */
const cadre = (
  axe: 'x' | 'z',
  cx: number,
  cy: number,
  cz: number,
  h: number,
  w: number,
  ink: number,
): BoxDef[] => {
  const p = w * 0.32; // épaisseur du tableau, dans l'axe de percement
  const e = w * 0.26; // largeur d'un jambage
  const j = w * 0.56; // demi-ouverture : 12 % de plus que la demi-face
  const bas = cy - h * 0.02;
  const hautJ = cy + h + e * 0.55;
  const out: BoxDef[] = [];
  if (axe === 'x') {
    out.push(box([cx - p * 0.5, bas, cz - j - e], [cx + p * 0.5, hautJ, cz - j], ink));
    out.push(box([cx - p * 0.5, bas, cz + j], [cx + p * 0.5, hautJ, cz + j + e], ink));
    out.push(
      box(
        [cx - p * 0.6, cy + h, cz - j - e - w * 0.03],
        [cx + p * 0.6, cy + h + e, cz + j + e + w * 0.03],
        ink,
      ),
    );
  } else {
    out.push(box([cx - j - e, bas, cz - p * 0.5], [cx - j, hautJ, cz + p * 0.5], ink));
    out.push(box([cx + j, bas, cz - p * 0.5], [cx + j + e, hautJ, cz + p * 0.5], ink));
    out.push(
      box(
        [cx - j - e - w * 0.03, cy + h, cz - p * 0.6],
        [cx + j + e + w * 0.03, cy + h + e, cz + p * 0.6],
        ink,
      ),
    );
  }
  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LES DEUX FACES DE « BOL-TOUR », ET POURQUOI ELLES NE SE REGARDENT PAS
// ═════════════════════════════════════════════════════════════════════════════
//
// C'est le point délicat de la salle, et le hall l'avait déjà résolu — deux
// fois, de deux façons. Pour le grand portail, en DÉCALANT les faces ; pour la
// maisonnette, en leur donnant LE MÊME LACET, de sorte que « la seconde tourne
// le dos à la première ». La seconde solution est la seule qui se démontre, et
// c'est celle qu'on prend ici.
//
// LES DEUX NORMALES POINTENT VERS L'EST (lacet +π/2).
//
//   La GRANDE est plaquée contre le mur ouest, tournée vers la pièce : on entre
//   dedans en marchant vers l'ouest, ce qui est le geste évident quand une porte
//   est au fond d'une pièce.
//   La PETITE est posée sur l'étagère, à 1,00 m du mur est, tournée vers ce mur
//   — donc DE DOS à la pièce. On en ressort en marchant vers l'est, le nez à un
//   mètre d'un mur qui fait alors vingt-huit fois la taille qu'on a. Et l'on se
//   retourne. C'est exactement le mouvement qu'on voulait obtenir, et il n'a pas
//   fallu l'écrire : la géométrie l'oblige.
//
// LA DÉMONSTRATION, ET ELLE TIENT EN UNE LIGNE. Ce qu'on voit à travers une
// face, c'est le monde vu de DERRIÈRE sa jumelle, à travers la fenêtre de
// celle-ci : donc uniquement des points situés DEVANT la jumelle. Or :
//
//   devant la petite face, il n'y a que x > −338,00 — un mètre de tablier et le
//   mur est. La grande face est en x = −342,40, quatre mètres quarante DERRIÈRE.
//   Elle ne peut donc PAS apparaître dans la vue de la grande face. Zéro
//   récursion, et ce n'est pas une question de distance ni d'angle : c'est un
//   demi-espace, et le banc d'essai le vérifie sur les quatre coins du rectangle.
//
// L'autre sens n'est pas symétrique, et je préfère l'écrire : devant la grande
// face il y a toute la pièce, petite face comprise. En regardant DANS la petite
// porte on peut donc apercevoir la petite porte, à quatre mètres, large de
// 0,475. Deux choses la bornent : le rendu ne descend qu'à deux niveaux et
// remplit le troisième d'un aplat (`portalRenderer.renderViews`), et les deux
// rectangles sont décalés de 2,61 m en z — l'écart entre le bord nord de la
// grande (z = 1239,55) et le bord sud de la petite (z = 1242,16). Aucun rayon
// parti perpendiculairement de l'une n'atteint l'autre, et le cône qui les relie
// ne s'ouvre qu'en se collant à moins de 46 cm de la petite porte, c'est-à-dire
// une fois qu'on est déjà en train de la franchir.
//
// LE DÉCALAGE SERT AUSSI À L'AUTRE MOITIÉ DU PROBLÈME : on ne traverse pas
// l'une en voulant atteindre l'autre. Elles ne sont ni au même bout de la
// pièce, ni au même niveau, ni sur le même chemin.
const TOUR_H = 0.7;
const TOUR_W = 0.475;
/** Plan de la grande face : 0,60 m EN AVANT du mur ouest. Voir `cadre`. */
const TOUR_GRANDE_X = -342.4;
const TOUR_GRANDE_Z = 1238.6;
const TOUR_PETITE_X = -338.0;
const TOUR_PETITE_Z = 1242.4;

/** Face de sortie, dessinée par le Pinceau, 0,60 m en avant du mur nord. */
const FOND_PORTE_X = -341.0;
const FOND_PORTE_Z = 1242.4;

// ═════════════════════════════════════════════════════════════════════════════
// LE DÉCOR DE LA PIÈCE
// ═════════════════════════════════════════════════════════════════════════════
//
// Toutes les cotes des murs sont décalées les unes des autres — hauteurs,
// fondations, débords. Quatre murs qui se rejoignent aux angles, c'est huit
// faces qui se chevauchent ; à cotes égales, huit plans confondus dans les
// quatre coins de la pièce.

const laPiece = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ─── Sol, plafond, quatre murs ─────────────────────────────────────────────
  out.push(box([-343.7, -0.62, 1236.3], [-336.3, 0, 1243.7], 1, { outline: false }));
  out.push(box([-343.65, P_HAUT, 1236.35], [-336.35, 3.66, 1243.65], 2, { outline: false }));
  out.push(box([-343.4, -0.5, 1236.45], [P_X0, 3.34, 1243.55], 1));
  out.push(box([P_X1, -0.55, 1236.5], [-336.6, 3.3, 1243.5], 1));
  out.push(box([-343.3, -0.45, P_Z1], [-336.7, 3.38, 1243.4], 1));

  // ─── Le mur sud, percé pour l'entrée ───────────────────────────────────────
  //
  // L'ouverture fait 2,30 × 3,00 : c'est la cote de « la pluie », et elle
  // existe pour que l'assemblage puisse y planter la grande face standard
  // (2,80 × 1,90) sans toucher à ce fichier. Il reste 20 cm de jour de chaque
  // côté et 20 cm sous le linteau.
  out.push(box([-343.2, -0.45, 1236.6], [-341.75, 3.28, P_Z0], 1));
  out.push(box([-339.45, -0.47, 1236.62], [-336.8, 3.26, P_Z0], 1));
  out.push(box([-341.95, 3.0, 1236.58], [-339.25, 3.24, 1237.02], 2));
  // Le seuil : sans lui, pas de sol dans l'épaisseur du mur, et l'on tombe en
  // franchissant sa propre porte. Il dépasse de 3 cm — on le sent, on ne bute
  // pas dedans (l'enjambée en fait 0,90).
  out.push(box([-341.85, -0.4, 1236.55], [-339.35, 0.03, 1237.05], 0));

  // ─── L'ÉTAGÈRE : un tablier, quatre piles ──────────────────────────────────
  // Le tablier mord dans les trois murs qu'il touche ; les piles mordent dans
  // le tablier et dans le sol. Aucune face d'appui n'est à l'air libre.
  out.push(box([ETAGERE_NEZ, 0.8, 1236.85], [-336.85, ETAGERE_Y, 1243.15], 2));
  for (const cz of [1237.6, 1239.4, 1241.2, 1242.6]) {
    out.push(box([-338.78, -0.36, cz - 0.28], [-336.95, 0.81, cz + 0.28], 2));
  }
  // La margelle du viaduc, d'un mur à l'autre. Elle passe DEVANT le bol, dont
  // la lèvre la mord de cinq centimètres : la citerne est à demi prise dans le
  // parapet, et il n'y a donc aucun interstice par où tomber.
  // Elle DÉBORDE de 2 cm sur le nez du tablier, et ce n'est pas de l'ornement.
  // Posée à ras (x = −339,00), elle laissait un centimètre de dessus de tablier
  // à découvert devant elle : un joueur ×1 qui sautait vers l'étagère y
  // atterrissait — un centimètre de corniche suffit à porter une boîte de
  // collision de soixante-huit — puis, de ces 0,92, il enjambait la margelle et
  // se retrouvait sur le viaduc. Le harnais l'a fait 192 fois sur 216.
  out.push(box([-339.02, 0.86, 1236.88], [-338.92, MARGELLE_HAUT, 1243.12], 0));

  // ─── LE BOL ────────────────────────────────────────────────────────────────
  // Le fond, d'abord : un seul bloc, enterré dans le tablier, dont le dessus
  // est le seul plan de la salle qui compte. Il déborde sous la paroi (0,53
  // contre un rayon intérieur de 0,50) : ses flancs sont donc noyés dans
  // l'anneau, et le bassin n'a pas de couture à son pied.
  // (un disque, et non un carré : ses angles auraient dépassé de la panse et
  // fait, autour du bol, une plinthe de 3 cm sur laquelle on peut poser le pied
  // — donc une hauteur de plus dans une salle qui n'en veut que deux.)
  out.push(...anneau(BOL_X, BOL_Z, 0, R_EXT, 0.84, () => BOL_FOND, BOL_N, 0));
  // La paroi, seize pierres, dont deux cassées.
  out.push(...anneau(BOL_X, BOL_Z, R_INT, R_EXT, 0.86, hautDuBol, BOL_N, 0));
  // La lèvre. Elle ne déborde que vers l'EXTÉRIEUR (rayon intérieur 0,52,
  // c'est-à-dire noyé dans la paroi) : pas une corniche à l'intérieur du bol,
  // sans quoi on en sortirait en deux marches et l'ébrèchement ne servirait
  // plus à rien. Absente sur les deux secteurs cassés — c'est par là que le
  // bord est parti.
  out.push(
    ...anneau(BOL_X, BOL_Z, 0.54, R_LEVRE, 1.42, hautDuBol, BOL_N, 0).filter(
      (_, k) => !BOL_CASSE.includes(k),
    ),
  );

  // ─── Les cadres des trois portes ───────────────────────────────────────────
  // Grande face de « bol-tour », dressée devant le mur ouest.
  out.push(...cadre('x', TOUR_GRANDE_X, 0, TOUR_GRANDE_Z, 2.8, 1.9, 3));
  // Petite face de « bol-tour », debout sur l'étagère, de dos à la pièce.
  out.push(...cadre('x', TOUR_PETITE_X, ETAGERE_Y, TOUR_PETITE_Z, TOUR_H, TOUR_W, 3));
  // Grande face de « bol-fond », devant le mur nord. Le Pinceau la dessinera ;
  // le portique, lui, est là depuis le début, et il ne dit rien tant que rien
  // n'y est tracé.
  out.push(...cadre('z', FOND_PORTE_X, 0, FOND_PORTE_Z, 2.8, 1.9, 3));

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LE LOGEMENT ET LES DEUX PIERRES
// ═════════════════════════════════════════════════════════════════════════════

const logement: SocketDef = {
  id: 'bol-logement',
  // Le centre du fond du bassin, exactement au niveau où les pieds se posent :
  // c'est ce qui fait que le joueur ×1/4 n'a rien à viser en hauteur, puisque
  // le moteur ne dépose jamais plus bas que les pieds du porteur.
  position: [BOL_X, BOL_FOND, BOL_Z],
  size: PIERRE_PETITE,
  portee: PORTEE_LOGEMENT,
  ink: 3,
};

/**
 * DEUX PIERRES IDENTIQUES, ET LA SECONDE EST UNE ASSURANCE.
 *
 * Une aurait suffi à l'énigme. Mais `carryTraversal` ne consulte NI le sceau
 * d'une porte NI sa condition : une caisse lancée franchit un portail scellé
 * que le joueur, lui, ne peut pas franchir. Un joueur qui s'amuse à lancer une
 * pierre vers le mur nord peut donc l'expédier sur la grève avant même d'avoir
 * ouvert la porte, et la salle serait morte sans que rien ne l'ait annoncé.
 *
 * C'est exactement le risque que « les trois creux » a laissé ouvert en
 * écrivant que le remède le moins cher serait une perle de plus. Ici il coûte
 * une ligne, et il ne change ni l'énigme, ni la leçon, ni l'image : deux
 * pierres au sol et un seul creux, c'est déjà ce que disait l'établi du hall.
 *
 * Elles sont écartées de 2,20 m, plus que les 2,88 de portée de saisie ne
 * l'exigerait — mais le moteur prend toujours LA PLUS PROCHE devant soi, donc
 * on n'hésite jamais sur laquelle. Et elles sont posées à l'entrée, en pleine
 * vue du bol : la question est posée avant qu'on ait fait un pas.
 */
const pierres: CarryableDef[] = [
  { id: 'bol-pierre-a', position: [-341.9, 0.03, 1238.3], size: PIERRE, ink: 3 },
  { id: 'bol-pierre-b', position: [-341.9, 0.03, 1240.5], size: PIERRE, ink: 3 },
];

// ═════════════════════════════════════════════════════════════════════════════
// LA GRÈVE — « LE FOND »
// ═════════════════════════════════════════════════════════════════════════════
//
// Une anse fermée par la roche sur trois côtés et par la brume sur le
// quatrième. Cinquante mètres sur quarante, c'est-à-dire cent onze fois la
// taille du joueur : à ×1/4, une grève de deux cents mètres.
//
// RIEN N'Y DÉPASSE L'ENJAMBÉE. Le sable descend vers l'est en quinze bandes de
// 8,6 cm — les quatre cinquièmes du dénivelé d'une marche de « la pluie », et
// le tiers de ce qu'on franchit sans y penser. Il n'y a pas un saut à faire, pas
// une hauteur à trouver, pas un objet à porter. Une seule sortie : la porte par
// laquelle on est arrivé, et l'on ne peut pas la manquer, elle est en haut.
//
// LES TROIS BORNES, et elles ne se discutent pas : falaise à l'ouest (3,4 m
// au-dessus du sable), falaises au nord et au sud (3,0 m), et à l'est un BANC
// DE GALETS de 0,66 m — deux fois le saut du joueur. Derrière lui la mer, qu'on
// voit et où l'on n'ira pas. C'est la margelle du puits de « la pluie », reprise
// telle quelle : la seule frustration du lieu, et elle ne coûte rien.

const F_X0 = -300.0;
const F_Z0 = 1310.0;
const F_Z1 = 1360.0;
const F_BANDES = 15;
const F_PAS = 2.6;
const F_CHUTE = 0.086;
const F_HAUT = 1.26;

const sableDe = (i: number): number => F_HAUT - F_CHUTE * i;
const bandeDe = (x: number): number =>
  Math.max(0, Math.min(F_BANDES - 1, Math.floor((x - F_X0) / F_PAS)));
/** Le niveau du sable sous un point. Sert à POSER, jamais à deviner. */
const sable = (x: number): number => sableDe(bandeDe(x));

/**
 * LA VASQUE — le bol, refait par la mer, et c'est toute la salle.
 *
 * Mêmes rayons que le bol, au millimètre : `R_INT` et `R_EXT` servent aux deux,
 * et c'est délibérément la même constante et non deux nombres égaux. Le joueur
 * a la même taille ici que là-bas ; il retrouve donc, à l'autre bout du
 * mouvement, un objet qu'il a HABITÉ, à la taille exacte où il l'a habité.
 *
 * Tout le reste est renversé. On y entre en marchant : le bord monte de 0,13 au
 * -dessus du sable et l'eau est 0,158 sous le bord — deux fois rien contre une
 * enjambée de 0,225, dans les deux sens. Là où le bol enfermait, la vasque
 * n'enferme pas. Et au centre, à la place exacte du logement, le bleu dort.
 */
const V_X = -267.5;
const V_Z = 1335.0;
const V_SABLE = sableDe(12);
const V_BORD = V_SABLE + 0.13;
const V_EAU = V_SABLE - 0.028;
const V_FOND = V_SABLE - 0.05;

const laGreve = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ─── Le sable, quinze bandes ───────────────────────────────────────────────
  // Chaque bande a son propre dessus et son propre dessous : deux plans
  // confondus se disputent la profondeur, et quinze dalles au même niveau
  // feraient quinze coutures encrées en travers de la grève.
  for (let i = 0; i < F_BANDES; i++) {
    out.push(
      box(
        [F_X0 + i * F_PAS, -1.0 - 0.003 * i, F_Z0 - 0.4],
        [F_X0 + (i + 1) * F_PAS, sableDe(i), F_Z1 + 0.4],
        i % 3 === 0 ? 0 : 1,
        { outline: false },
      ),
    );
  }

  // ─── Les trois falaises ────────────────────────────────────────────────────
  out.push(box([-302.6, -1.4, 1307.8], [F_X0, 4.7, 1362.2], 2));
  out.push(box([-302.4, -1.3, F_Z1], [-233.2, 4.3, 1362.4], 2));
  out.push(box([-302.2, -1.25, 1307.6], [-233.4, 4.5, F_Z0], 2));

  // ─── Le banc de galets, la mer, le promontoire ─────────────────────────────
  // Le banc est d'un seul tenant : une file de blocs aurait laissé entre eux
  // des passes de quelques centimètres, et une passe de quelques centimètres
  // est une fuite pour un joueur large de 0,17. Les galets qu'on voit dessus
  // sont posés PAR-DESSUS, là où personne ne montera.
  out.push(box([-261.0, -1.2, 1308.5], [-259.4, sableDe(14) + 0.66, 1361.5], 2));
  for (let k = 0; k < 22; k++) {
    const cz = 1309.5 + k * 2.37;
    const r = 0.18 + ((k * 7919) % 13) * 0.011;
    out.push(
      box(
        [-260.8 + ((k * 3571) % 7) * 0.02, sableDe(14) + 0.6, cz - r],
        [-259.6, sableDe(14) + 0.66 + r * 0.9, cz + r],
        2,
      ),
    );
  }
  // La mer : un plan bas, hors d'atteinte derrière le banc. On la voit, on
  // l'entend, on n'y va pas — et si l'on y était, elle est un sol comme toutes
  // les eaux de ce moteur, donc on ne s'y noie pas davantage.
  out.push(box([-259.3, -1.5, 1308.5], [-240.2, -0.32, 1361.5], 0, { outline: false }));
  out.push(box([-240.2, -1.5, 1308.2], [-233.0, 5.4, 1361.8], 2));

  // ─── LA VASQUE ─────────────────────────────────────────────────────────────
  out.push(...anneau(V_X, V_Z, 0, R_EXT, V_SABLE - 0.42, () => V_FOND, BOL_N, 2));
  out.push(
    ...anneau(V_X, V_Z, R_INT, R_EXT, V_SABLE - 0.3, (k) => V_BORD + k * 0.002, BOL_N, 2),
  );
  // L'eau, à 2 cm des parois : deux plans qui se touchent grésillent.
  out.push(
    box([V_X - 0.47, V_FOND - 0.02, V_Z - 0.47], [V_X + 0.47, V_EAU, V_Z + 0.47], 0, {
      outline: false,
    }),
  );

  // ─── LE RUISSEAU — ce que « la pluie » a envoyé jusqu'ici ──────────────────
  // Il descend la grève d'ouest en est, dans l'axe du joueur, et il finit dans
  // la vasque. C'est le même balisage qu'au caniveau de la cour : un joueur
  // perdu regarde ses pieds, et l'eau qui coule lui dit où aller. Les petites
  // chutes au nez de chaque bande sont fantômes — de l'eau qui tombe n'arrête
  // personne.
  for (let i = 0; i < 12; i++) {
    const x0 = F_X0 + i * F_PAS;
    const y = sableDe(i);
    out.push(box([x0, y - 0.03, 1334.82 + i * 0.012], [x0 + F_PAS, y + 0.012, 1335.2 + i * 0.012], 0));
    out.push(
      box([x0 + F_PAS - 0.05, y - F_CHUTE, 1334.86 + i * 0.012], [x0 + F_PAS + 0.04, y + 0.01, 1335.16 + i * 0.012], 0, {
        ghost: true,
      }),
    );
  }

  // ─── LES PIEUX — la seule chose à regarder, et elle ne demande rien ────────
  // Une ancienne pêcherie : neuf poteaux qui marchent vers la mer et s'arrêtent
  // au banc. Le premier fait une fois et quart la taille du joueur, le dernier
  // trois fois : ils grandissent à mesure que le sable baisse, ce qui est ce
  // que fait un pieu planté dans une grève en pente. C'est le seul bois du
  // lieu, et il dit la seule chose qu'il ait à dire : quelqu'un est venu ici.
  for (let k = 0; k < 9; k++) {
    const x = -274.0 + k * 1.55;
    const y = sable(x);
    out.push(
      box(
        [x - 0.055, y - 0.5, 1338.4 + k * 0.06],
        [x + 0.055, y + 0.56 + k * 0.055, 1338.52 + k * 0.06],
        3,
      ),
    );
  }

  // ─── LES FLAQUES, et l'égouttement des falaises ────────────────────────────
  // La pluie a cessé il y a une minute. Dix-huit films d'eau de deux
  // centimètres, semés sur le sable, chacun 0,4 mm plus épais que le précédent
  // pour qu'aucun ne partage son dessus avec un autre.
  for (let k = 0; k < 18; k++) {
    const x = F_X0 + 2.0 + ((k * 6151) % 341) * 0.104;
    const z = F_Z0 + 3.0 + ((k * 4231) % 227) * 0.19;
    if (Math.abs(x - V_X) < 1.6 && Math.abs(z - V_Z) < 1.6) continue;
    const lx = 0.5 + ((k * 3617) % 19) * 0.14;
    const lz = 0.4 + ((k * 2731) % 23) * 0.11;
    out.push(
      box([x, sable(x) - 0.04, z], [x + lx, sable(x) + 0.006 + k * 0.0004, z + lz], 0, {
        outline: false,
      }),
    );
  }
  for (let k = 0; k < 7; k++) {
    const z = F_Z0 + 4.0 + k * 6.3;
    out.push(
      box([F_X0 - 0.06, sable(F_X0) + 0.02, z], [F_X0 - 0.01, 2.4 + k * 0.21, z + 0.05], 0, {
        ghost: true,
      }),
    );
  }

  // ─── Le portique de la porte du retour, devant la falaise ouest ────────────
  out.push(...cadre('x', F_X0 + 0.4, sableDe(0), V_Z, TOUR_H, TOUR_W, 3));

  return out;
};

/**
 * LE PINCEAU BLEU.
 *
 * `echelle: -1`, c'est-à-dire ×1/4 : la taille où l'on vit depuis « la pluie »,
 * trois salles plus haut. Il n'y a rien à devenir pour lui — et c'est la seule
 * fois du jeu où le veilleur ne demande rien, parce que le mouvement entier a
 * déjà été la condition.
 *
 * Le moteur refusera néanmoins toute autre taille, et c'est le refus qui donne
 * son sens à l'acceptation : on ne s'éveille que pour un joueur de la taille du
 * monde où l'on dort.
 *
 * RAYON 0,75, soit 1,67 fois la taille du joueur — exactement le rapport du
 * pinceau vert du monde central (3,0 pour 1,80). L'intérieur de la vasque n'a
 * que 0,50 de rayon : on ne peut pas y entrer sans être à portée, donc il n'y a
 * aucune adresse à avoir, ce qui est le contraire de ce qu'on demanderait dans
 * une salle qui demanderait quelque chose.
 */
const pinceau: VeilleurDef = {
  id: 'pinceau-bleu',
  position: [V_X, V_EAU + 0.01, V_Z],
  radius: 0.75,
  echelle: -1,
};

// ═════════════════════════════════════════════════════════════════════════════
// LES DEUX PAIRES DE PORTES
// ═════════════════════════════════════════════════════════════════════════════
//
// Elles sont INTERNES au module : leurs quatre faces sont chez moi, donc c'est
// ici qu'elles se déclarent et pas à l'assemblage. Seule l'entrée depuis « la
// pluie » reste au raccord, puisqu'elle appartient aux deux côtés.
const portes: PortalPairDef[] = [
  {
    // LE TOUR DE LA PIÈCE. Les deux faces à six mètres l'une de l'autre, même
    // lacet, l'une plaquée au mur, l'autre debout sur l'étagère et de dos.
    //
    // 0,70 × 0,475 : la porte d'origine du jeu divisée par quatre, donc la
    // grande vaut 2,80 × 1,90 — la porte d'origine, telle quelle. Un joueur de
    // 1,80 passe la grande (il lui faut 2,80 × 0,96 de haut et 0,68 de large) ;
    // il ne passe PAS la petite (1,80 contre 0,672 utiles), qui lui fait donc
    // simplement mur. C'est cette seule cote qui interdit de redescendre par où
    // l'on est monté, et elle se lit d'un coup d'œil.
    id: 'bol-tour',
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    smallHeight: TOUR_H,
    smallWidth: TOUR_W,
    big: { position: [TOUR_GRANDE_X, 0, TOUR_GRANDE_Z], yaw: Math.PI / 2 },
    small: { position: [TOUR_PETITE_X, ETAGERE_Y, TOUR_PETITE_Z], yaw: Math.PI / 2 },
  },
  {
    // LA PORTE DU FOND, que le Pinceau dessine quand la pierre est logée.
    //
    // Scellée par `bol-logement` : on voit le tableau de la porte dans le mur
    // nord depuis l'entrée, on voit qu'il n'y a rien dedans, et l'on voit à six
    // mètres de là ce qui l'ouvrira. Rien n'est écrit.
    //
    // Sa grande face est ici, sa petite là-bas : on la franchit à ×1 et l'on
    // arrive à ×1/4 sur la grève. Il faut donc être REVENU à taille d'homme
    // pour partir, c'est-à-dire avoir refait le tour de la pièce dans l'autre
    // sens — la salle se referme sur son propre geste.
    id: 'bol-fond',
    condition: 'bol-logement',
    dessinee: true,
    colorBig: 0x2f6d7c,
    colorSmall: 0x2f6d7c,
    smallHeight: TOUR_H,
    smallWidth: TOUR_W,
    big: { position: [FOND_PORTE_X, 0, FOND_PORTE_Z], yaw: Math.PI },
    small: { position: [F_X0 + 0.4, sableDe(0), V_Z], yaw: Math.PI / 2 },
  },
];

/**
 * LA CLÔTURE — pourquoi on ne se piège nulle part, et pourquoi c'est une forme
 * et non une vérification.
 *
 * LA PIÈCE. Elle est close par ses six faces. On n'en sort que par une porte.
 *   — À ×1, on tient debout partout au sol et l'on entre dans « bol-tour » quand
 *     on veut. On ne monte PAS sur l'étagère : deux cent seize assauts au
 *     harnais, en courant et en sautant, avec et sans sprint, aucun n'aboutit —
 *     la margelle est à 1,32 et le saut culmine à 1,293. Deux centimètres sept,
 *     et je préfère le dire : aucune démonstration de ce fichier n'en dépend, et
 *     qui portera une pierre au pied de l'étagère pour grimper dessus (0,51 +
 *     1,293) y montera. Le §2 couvre ce cas comme les autres.
 *   — À ×1/4, on n'est JAMAIS ailleurs que sur l'étagère : on y arrive par la
 *     porte, la margelle monte à 0,40 au-dessus du tablier et la panse du bol à
 *     0,54, contre un saut mesuré à 0,306, et les trois autres côtés sont des
 *     murs. On ne peut donc pas tomber dans la pièce, ce qui interdit du même
 *     coup d'entrer dans la grande face à ×1/4 et de finir à ×1/16. Mille six
 *     cent quatre-vingt-seize courses au harnais, dans seize directions, avec et
 *     sans sprint, sauts compris : aucune chute.
 *   — DANS LE BOL, une seule issue et elle marche dans les deux sens :
 *     l'ébrèchement, cassé jusqu'au fond, donc trois centimètres de marche dans
 *     un sens comme dans l'autre. Le reste du bord est à 0,51 au-dessus du fond,
 *     soit une fois et demie le saut. Trente-six azimuts essayés depuis le
 *     centre du bassin : cinq en sortent, tous par la brèche ; et trente-six
 *     départs sur trente-six y rentrent. On entre en marchant, on sort en
 *     marchant, et il n'y a pas de troisième cas.
 *
 * LA PIERRE. Ses tailles vivent sur les puissances de quatre à partir de 0,48,
 * et elle ne peut pas monter plus haut : franchir la petite face en objet libre
 * demande une arête ≤ 0,4275, donc 0,48 rebondit. Elle reste par conséquent
 * TOUJOURS sous le seuil de levage à ×1 (0,99), donc toujours ramassable. Et
 * elle peut toujours redescendre (lancée dans la grande face) ou remonter
 * (lancée dans la petite depuis le tablier) : la suite de ses tailles est
 * connexe, et 0,12 y figure quoi qu'on ait fait. Aucune manipulation ne la rend
 * inutile — au pire elle coûte un aller-retour, ce qui est la leçon des « trois
 * creux » et non une punition.
 *
 * LA GRÈVE. Trois falaises de trois mètres et un banc de galets de 0,66 pour un
 * saut de 0,323. Le sable ne descend que par bandes de 8,6 cm. Il n'y a pas un
 * seul endroit d'où l'on ne reparte pas en marchant, et la porte du retour est
 * en haut de la pente, dans l'axe du ruisseau.
 *
 * CE QUI RESTE POSSIBLE, ET JE PRÉFÈRE L'ÉCRIRE. Une caisse lancée ne consulte
 * pas le sceau des portes : on peut, délibérément, expédier une pierre sur la
 * grève avant d'avoir ouvert la porte. C'est pour ça qu'il y en a deux.
 */

export const BOL: SalleModule = {
  nom: 'bol',

  region: {
    name: 'bol',
    min: [-400, -40, 1200],
    max: [-200, 40, 1400],
    // Le papier d'un ciel qui vient de se vider : gris bleuté, très pâle.
    paper: '#e6ebee',
    colors: [
      '#dfe7ea', // 0 — l'eau, le grès du bol, le sable mouillé, tout ce qui luit
      '#a3b3bb', // 1 — la pierre lavée : les murs de la pièce, le sable sec
      '#3e5560', // 2 — l'ardoise : l'étagère, les piles, la roche, la mer
      '#a8724c', // 3 — LE BOIS, et il ne dit qu'une chose : une main est passée
    ],
    ink: '#16212a',
    // Les deux salles sont à cent treize mètres l'une de l'autre. Le brouillard
    // est posé à quatre-vingt-dix : on ne voit donc jamais la pièce depuis la
    // grève, ni la grève depuis la pièce, et la brume ferme l'anse à l'est
    // exactement là où il faut qu'elle se ferme.
    brouillard: 90,
  },

  // La parcelle réservée, telle qu'attribuée. L'emprise RÉELLE, mesurée :
  //   x ∈ [−343,70 ; −233,00]   y ∈ [−1,50 ; 5,40]   z ∈ [1236,30 ; 1362,40]
  // soit 56 m de marge à l'ouest, 33 à l'est, 38 sous les pieds, 34 au-dessus
  // des falaises, 36 au sud et 37 au nord.
  bounds: { min: [-400, -40, 1200], max: [-200, 40, 1400] },

  boxes: [...laPiece(), ...laGreve()],

  carryables: pierres,

  sockets: [logement],

  veilleurs: [pinceau],

  portals: portes,

  stations: [
    // 1. Au milieu de la pièce, à hauteur d'étagère. C'est ce qu'on voit en
    //    entrant, et il n'y a rien de spécial à voir : c'est le sujet.
    [-341.0, 1.7, 1238.4],
    // 2. Juste au-dessus du bol. Le Pinceau vole, le joueur non : il y est en
    //    deux secondes, on y sera en deux portes.
    [BOL_X, BOL_BORD + 0.3, BOL_Z],
    // 3. Devant la petite porte, sur le tablier — le seul endroit de la pièce
    //    où l'on ne peut pas aller avant d'avoir compris.
    [TOUR_PETITE_X + 0.4, ETAGERE_Y + 0.4, TOUR_PETITE_Z],
    // 4. Au mur nord, sur le tableau de la porte qu'il dessinera.
    [FOND_PORTE_X, 1.5, P_Z1 - 0.6],
    // 5. En haut de la grève, au débouché.
    [F_X0 + 1.5, sableDe(0) + 1.4, V_Z],
    // 6. À mi-pente, au-dessus du ruisseau : le balisage se voit d'en haut.
    [-281.0, sable(-281.0) + 1.1, V_Z + 0.2],
    // 7. Au-dessus de la vasque, sur le bleu.
    [V_X, V_BORD + 0.6, V_Z],
  ],

  // ─── LE RACCORD ────────────────────────────────────────────────────────────
  //
  // ON ARRIVE À TAILLE D'HOMME, palier 0, par le mur sud — et c'est le seul
  // changement de régime du mouvement : on vivait à ×1/4 depuis « la pluie »,
  // l'assemblage devra donc poser ici la GRANDE face de sa paire de raccord.
  // La position est le milieu du seuil, au niveau de la pierre.
  //
  // ON REPART DE LA VASQUE, palier −1. Ce n'est pas une porte : c'est le but,
  // et c'est le seul endroit du module qui n'ouvre sur rien. Le mouvement ne
  // finit pas quand on franchit quelque chose, il finit quand le bleu s'éveille
  // — après quoi il n'y a plus qu'à remonter, et c'est la vraie récompense.
  entree: { position: [-340.6, 0.03, P_Z0], echelle: 0 },
  sortie: { position: [V_X, V_EAU, V_Z], echelle: -1 },
};

/**
 * Les cotes du calibrage, rassemblées pour qu'on ne retouche jamais un nombre
 * d'ici « à l'œil ». Chacune a sa raison écrite plus haut ; aucune n'est ronde
 * par hasard.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE DONT JE NE SUIS PAS SÛR, et qui appartient à qui reprendra ce fichier
 *
 * 1. UN BOL DE 1,12 M N'EST PAS UN BOL À THÉ. La consigne demandait un bol à
 *    thé ; la cote « quatre mètres à ×1/4 » impose 1,00 m d'intérieur. Les deux
 *    ne peuvent pas être vraies ensemble : un vrai chawan fait 13 cm, et il
 *    faudrait descendre à ×1/16 pour y marcher, ce que le mouvement ne fait
 *    pas. J'ai gardé la cote et perdu le mot : à ×1 l'objet se lit comme une
 *    bassine de grès posée sur une console. Si l'on tient au bol à thé, il faut
 *    un quatrième palier, et ce n'est plus la même salle.
 *
 * 2. LE SENS PETITE → GRANDE N'EST PAS DÉMONTRÉ. On ne voit jamais la grande
 *    face à travers la grande face (c'est un demi-espace, c'est prouvé). On
 *    peut apercevoir la petite à travers la petite, à cinq mètres, en s'en
 *    approchant à moins d'un mètre. Le rendu plafonne à deux niveaux, donc le
 *    tunnel n'existe pas — mais ce n'est pas la géométrie qui le garantit, et
 *    je n'ai pas trouvé de disposition qui ferme les deux sens sans casser
 *    l'image du retournement.
 *
 * 3. UNE SEULE RÉGION POUR DEUX LIEUX. Le contrat n'en accorde qu'une par
 *    module, et le module en contient deux. La palette a donc été taillée pour
 *    servir une pièce de pierre ET une grève, ce qui la rend moins tranchée que
 *    celle des « creux » ou de « la pluie ». Si la suite autorise un jour deux
 *    régions par module, la grève en demande une à elle.
 *
 * 4. LE PIGMENT. La région ne déclare pas de `pigment`, donc elle est peinte
 *    d'emblée — comme « les creux » et « la pluie », et conformément à la loi
 *    des veilleurs : un monde où l'on VA chercher une couleur l'a forcément.
 *    Conséquence : la pièce du bol est en couleur alors qu'elle appartient au
 *    monde gris. Lui donner `pigment: 'bleu'` ferait virer la grève au lavis,
 *    et le bleu dormirait dans un monde qui n'en a pas — je n'ai pas su
 *    trancher autrement qu'en suivant les deux salles déjà livrées.
 *
 * 5. LES DEUX CENTIMÈTRES SEPT DE L'ÉTAGÈRE. Le saut d'un joueur ×1 culmine à
 *    1,293 et la margelle du viaduc est à 1,32. Il ne monte donc pas sur
 *    l'étagère — de deux centimètres sept. Aucune démonstration de ce fichier
 *    n'en dépend (le logement reste inatteignable depuis le tablier, depuis le
 *    bord et depuis l'intérieur du bol), et l'on y monte de toute façon en se
 *    hissant sur une pierre. Mais c'est une cote que personne ne devrait
 *    toucher sans remesurer.
 *
 * 6. LE HARNAIS N'A JOUÉ QU'UN CHEMIN. La partie complète est vérifiée de bout
 *    en bout — ramasser, traverser, faire le tour du viaduc, entrer par la
 *    brèche, loger, revenir, franchir la porte dessinée, descendre la grève,
 *    éveiller le bleu — mais par UN itinéraire. Les balayages en force brute
 *    couvrent l'espace des dépôts et des chutes, pas celui des trajets. Un
 *    joueur qui lance ses pierres au hasard dans une pièce fermée finit
 *    toujours par les retrouver (elles restent sous le seuil de levage, voir
 *    « la clôture »), mais je ne l'ai pas prouvé exhaustivement.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const CALIBRAGE_BOL = {
  /** L'arête de la pierre, avant et après la porte. */
  pierre: [PIERRE, PIERRE_PETITE],
  /** Ce qu'on soulève aux deux tailles. La pierre en fait 48 % dans les deux cas. */
  seuilsDeLevage: [0.99, 0.2475],
  /** Où l'on dépose, pierre en main, à ×1 puis à ×1/4. Décide de toute la salle. */
  deposeA: [
    [0.34 + 2 * PIERRE_PETITE * 0.4, 0.34 + 2 * PIERRE_PETITE],
    [0.085 + 2 * PIERRE_PETITE * 0.4, 0.085 + 2 * PIERRE_PETITE],
  ],
  /** Rayon d'accueil du logement, et les deux bornes qu'il doit respecter. */
  portee: PORTEE_LOGEMENT,
  /** Les hauteurs du bol, comptées depuis le fond du bassin puis du tablier. */
  bol: {
    bord: BOL_BORD - BOL_FOND,
    ebrechement: BOL_EBRECHE - BOL_FOND,
    depuisLeTablier: BOL_BORD - ETAGERE_Y,
    rayons: [R_INT, R_EXT, R_LEVRE],
  },
  /** Le garde-corps du viaduc, compté depuis le tablier. */
  margelle: MARGELLE_HAUT - ETAGERE_Y,
  /**
   * Saut et enjambée à ×1/4. Le saut est celui de la formule (0,72 × la
   * taille) ; le second est celui qu'on MESURE au harnais, sprint et élan
   * compris, et c'est lui qui décide. L'écart de 1,7 cm entre les deux n'est
   * pas une erreur : c'est le pas de simulation.
   */
  sautPetit: 0.323,
  sautPetitMesure: 0.306,
  enjambeePetite: 0.225,
  /** Saut mesuré à ×1, contre lequel se juge la margelle. */
  sautGrandMesure: 1.293,
};
