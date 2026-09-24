/**
 * LA MONTÉE, JOUÉE DE BOUT EN BOUT — la preuve que le voyage se finit.
 *
 * Six cents vérifications regardaient la montée, et aucune ne l'avait jamais
 * JOUÉE : chacune posait le joueur au milieu d'une salle, faisait le geste de
 * la salle, et concluait. Personne ne franchissait les portes à la suite. C'est
 * ainsi qu'une montée infinissable — un atelier où personne ne pouvait peindre,
 * et dont le tableau scelle la porte de la vallée — est restée verte pendant
 * des semaines. Et c'est ainsi, aussi, que trois portes de raccord plantées à
 * l'envers n'ont gêné personne : chaque salle passait ses épreuves sur son
 * banc, et le PASSAGE d'une salle à l'autre n'était le métier de personne.
 *
 * Ce pilote-ci ne pose jamais le joueur nulle part. Il naît sur le toit le plus
 * haut du village, à ×4, et il marche : la maison basse, le creux qui refuse,
 * le blanchiment, l'escalier, l'atelier du haut, la vallée, la lucarne. Sept
 * salles, six raccords, une seule simulation, et le but au bout. Ce qu'il
 * prouve n'est pas que chaque salle est juste — c'est que LEUR SUITE l'est.
 *
 * CHAQUE RACCORD SE FRANCHIT COMME LA SALLE LE DÉCLARE (le `lacet` de son
 * contrat) : on se poste un pas et demi avant la porte, dans la salle, et l'on
 * marche droit — vers le nord pour quitter le creux qui refuse et le
 * blanchiment, vers le sud partout ailleurs. Plus personne ne se glisse entre
 * une porte et son mur pour la reprendre à l'envers.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES SEULES LIBERTÉS QU'IL SE DONNE, et elles sont celles du rendu, pas du
 * joueur :
 *
 *   – `couleursConnues = ['rouge', 'vert', 'bleu']` : les pigments rapportés
 *     des deux premiers voyages, que le rendu remplit depuis la mémoire des
 *     couleurs et que la simulation ne connaît pas d'elle-même.
 *   – `portesFermees.delete(...)` sur chaque porte DESSINÉE une fois sa
 *     condition remplie : c'est le rendu qui trace la porte et la descelle,
 *     et le pilote fait ce que le Pinceau ferait, après avoir constaté que le
 *     verrou la libère. Jamais avant, jamais autrement.
 *
 * Pas de téléportation, pas de logement rempli à la main, pas de taille
 * modifiée. Un joueur peut faire chaque geste écrit ici.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { TICK_DT, scaleOfLevel } from './constants.js';
import { Simulation } from './simulation.js';
import { MONTEE } from '../levels/montee.js';
import { BLANCHIMENT_TAILLE, BLANCHIMENT_GRANDE } from '../levels/salles/blanchiment.js';
import { REFUS_PETITE } from '../levels/salles/refus.js';
import {
  agirVers, attendre, bondirVers, lancer, near, ordre, piece, pos, poserVers, settle, walkTo,
  type Check,
 orienterPour } from './__pilote.js';
import type { BoxDef } from './types.js';
import type { Carryable } from './carryables.js';

/**
 * MARCHER JUSQU'À UN POINT, AU DÉCIMÈTRE.
 *
 * `walkTo` s'arrête à une demi-taille de sa cible et laisse l'élan finir le
 * pas : soixante centimètres de glissade à ×1, mesurés. C'est ce qu'il faut
 * pour traverser un lieu, et c'est trop grossier pour se poster — la vire de
 * l'escalier fait 2,60 de large, et un cube qu'on veut caler contre sa paroi
 * doit trouver sa place entre elle et soi. On avance donc à vitesse réduite
 * dès qu'on approche, et l'on ne s'arrête que dans la tolérance demandée.
 * C'est le geste d'un joueur qui lâche la touche un peu avant d'être arrivé.
 */
const avancerA = (
  sim: Simulation,
  cible: [number, number, number],
  tolerance: number,
  ticks = 60 * 20,
): void => {
  for (let i = 0; i < ticks; i++) {
    const p = sim.player.position;
    const dx = cible[0] - p.x;
    const dz = cible[2] - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < tolerance) break;
    // La vitesse de croisière est proportionnelle à la taille ; on la réduit
    // à l'approche pour que le dernier pas soit plus court que la tolérance.
    const lent = dist < scaleOfLevel(sim.player.scaleLevel) * 2 ? 0.12 : 1;
    sim.step(ordre(sim, { forward: lent, yaw: Math.atan2(dx, dz) }), TICK_DT);
  }
  // On laisse la glissade s'éteindre : au sol, l'élan meurt en un tiers de seconde.
  attendre(sim, 20);
};

/**
 * OUVRIR UNE PORTE DESSINÉE, comme le Pinceau le ferait.
 *
 * Une porte qui porte une `condition` naît fermée et reste dans
 * `portesFermees` même une fois le verrou levé : c'est le rendu qui la trace
 * puis la descelle. Le pilote constate d'abord que la condition est remplie —
 * c'est ça, la vérification — puis fait le geste du rendu. Si la condition
 * n'est pas remplie, le check échoue ET la porte reste close : le voyage
 * s'arrête là où il s'arrêterait pour un joueur.
 */
const desceller = (sim: Simulation, check: Check, porte: string, condition: string, salle: string): void => {
  const libre = sim.conditionsRemplies.has(condition);
  check(
    `${salle} : le verrou « ${condition} » libère la porte de sortie`,
    libre,
    [...sim.conditionsRemplies].join(', ') || 'aucune condition remplie',
  );
  if (libre) sim.portesFermees.delete(porte);
};

const centre = (b: BoxDef): [number, number, number] => [
  (b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2,
];

/** Le membre d'une famille le plus proche d'un point, au sol, filtré. */
const plusProche = (
  famille: string,
  de: [number, number, number],
  filtre: (b: BoxDef) => boolean = () => true,
): [number, number, number] => {
  let best: [number, number, number] | null = null;
  let d = Infinity;
  for (const b of MONTEE.boxes) {
    if (b.famille !== famille || !filtre(b)) continue;
    const c = centre(b);
    const dist = Math.hypot(c[0] - de[0], c[2] - de[2]);
    if (dist < d) {
      d = dist;
      best = c;
    }
  }
  if (!best) throw new Error(`aucune boîte de la famille ${famille}`);
  return best;
};

const ou = (c: Carryable): string =>
  `(${c.position.x.toFixed(1)}, ${c.position.y.toFixed(2)}, ${c.position.z.toFixed(1)})`;

export const piloterMontee = (check: Check): void => {
  console.log('\n— La montée : le voyage entier, dans l’ordre, en une seule partie —');

  const sim = new Simulation(MONTEE);
  // Les couleurs rapportées des deux premiers voyages. Voir l'en-tête.
  sim.couleursConnues = ['rouge', 'vert', 'bleu'];

  // ═══════════════════════════════════════════════════════════════════════
  // LES TOITS — on naît géant sur le toit le plus haut, et l'on ne résout rien.
  //
  // La porte de sortie est plantée au centre du toit de la maison basse, sa
  // grande face regardant le nord. On descend du toit d'arrivée en marchant
  // dans le vide — la salle le dit : tomber n'est pas une punition, c'est
  // l'autre chemin — on traverse le village par la rue, sous le torii, et l'on
  // monte sur la maison basse par son flanc est : 3,40 sous une enjambée de
  // 3,60, une marche.
  // ═══════════════════════════════════════════════════════════════════════
  {
    attendre(sim, 30);
    check('toits : on naît géant, debout sur le toit le plus haut', sim.player.scaleLevel === 1 && sim.player.grounded, pos(sim));
    walkTo(sim, [-172, 0, 1710], 60 * 6);
    walkTo(sim, [-205, 0, 1710], 60 * 6);
    walkTo(sim, [-205, 0, 1694], 60 * 6);
    check('toits : redescendu dans la rue', sim.player.grounded && sim.player.position.y < 0.5, pos(sim));
    walkTo(sim, [-218, 3.4, 1694], 60 * 8);
    check(
      'toits : la maison basse est une marche — on est sur son toit sans avoir sauté',
      sim.player.grounded && near(sim.player.position.y, 3.4, 0.1),
      pos(sim),
    );
    const t = walkTo(sim, [-218, 3.4, 1684], 60 * 6, { stopOnEvent: true });
    check(
      'toits → refus : par la grande face, vers le sud, on arrive homme dans la cour du tailleur',
      t.traversed?.pairId === 'montee-toits-refus' && t.traversed.newLevel === 0,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LE CREUX QUI REFUSE — les gestes du pilote de la salle, tels quels.
  // On arrive au nord-ouest de la cour, face au sud ; la vrille est à vingt-
  // cinq mètres, au milieu. Le miroir est PLAN : la main, et rien d'autre.
  // ═══════════════════════════════════════════════════════════════════════
  {
    walkTo(sim, [-14, 0, 1696], 60 * 10);
    walkTo(sim, [-14, 0, 1698.4], 60 * 3);
    agirVers(sim, [-14, 0, 1700]);
    const v = piece(sim, 'vrille-refus');
    check('refus : on prend la vrille, gauche, 0,40', v.held && v.main === 'L' && near(v.size, REFUS_PETITE, 1e-6), pos(sim));

    // LA FAUTE : on la présente telle quelle. Bonne taille, bon dessin — la main.
    walkTo(sim, [0, 0, 1681], 60 * 20);
    agirVers(sim, [0, 0.9, 1676]);
    const e1 = attendre(sim, 60 * 2);
    check(
      'refus : le creux la refuse, et dit que c’est la MAIN',
      !sim.sockets.pourvus.has('creux-refus') && e1.logementRefuse?.raison === 'main',
      `${e1.logementRefuse?.raison ?? 'aucun refus'}`,
    );

    // LE GESTE JUSTE : on la porte par le miroir plan. Même taille, autre
    // bout de la cour, le monde retourné, la vrille de l'autre main.
    agirVers(sim, [v.position.x, v.position.y, v.position.z]);
    check('refus : on la reprend', v.held, pos(sim));
    walkTo(sim, [26, 0, 1700], 60 * 20);
    const t1 = walkTo(sim, [30, 0, 1700], 60 * 6, { stopOnEvent: true });
    check(
      'refus : portée par le miroir plan, même taille, autre main — et l’on est gauchère',
      t1.traversed?.pairId === 'miroir-refus' && t1.traversed.newLevel === 0 && v.held && near(v.size, REFUS_PETITE, 1e-6) && v.main === 'D' && sim.player.gauchere,
      `${t1.traversed ? 'traversé' : 'pas traversé'}, taille ${v.size}, main ${v.main ?? '?'}, ${pos(sim)}`,
    );
    walkTo(sim, [0, 0, 1681], 60 * 30);
    check('refus : à la molette, la vrille droite épouse le dessin', orienterPour(sim, 'creux-refus') >= 0, '');
    agirVers(sim, [0, 0.9, 1676]);
    attendre(sim, 60 * 2);
    check('refus : le creux l’accepte', sim.sockets.pourvus.has('creux-refus'), [...sim.sockets.pourvus].join(',') || 'aucun');
    desceller(sim, check, 'montee-refus-blanchiment', 'creux-refus', 'refus');

    // LA SORTIE : une porte PLANE au nord de la cour, qui regarde le sud, vers
    // le joueur qui vient. Un pas et demi devant, puis droit vers le nord.
    walkTo(sim, [14, 0, 1715], 60 * 12);
    const t4 = walkTo(sim, [14, 0, 1732], 60 * 6, { stopOnEvent: true });
    check(
      'refus → blanchiment : par la porte plane, vers le nord, on arrive homme dans la cour lavée',
      t4.traversed?.pairId === 'montee-refus-blanchiment' && t4.traversed.newLevel === 0,
      `${t4.traversed ? t4.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LE BLANCHIMENT — les gestes du pilote de la salle, tels quels.
  //
  // On arrive au sud-ouest, face au NORD, la cour devant soi et la vrille à
  // quatorze mètres : on continue tout droit. On vient d'apprendre qu'un
  // miroir retourne : on y porte la vrille — et elle ressort quatre fois trop
  // grosse. La porte ordinaire, derrière le refend, la ramène à sa taille.
  // ═══════════════════════════════════════════════════════════════════════
  {
    walkTo(sim, [180, 0, 1688.4], 60 * 8);
    agirVers(sim, [180, 0, 1690]);
    const w = piece(sim, 'vrille-blanchiment');
    check('blanchiment : on prend la vrille, gauche, 0,50', w.held && w.main === 'L' && near(w.size, BLANCHIMENT_TAILLE, 1e-6), pos(sim));
    walkTo(sim, [174, 0, 1720], 60 * 20);
    const t1 = walkTo(sim, [169, 0, 1720], 60 * 6, { stopOnEvent: true });
    check(
      'blanchiment : portée par le miroir, elle ressort droite ET 2,00 — géant',
      t1.traversed?.pairId === 'miroir-blanchiment' && t1.traversed.newLevel === 1 && w.held && w.main === 'D' && near(w.size, BLANCHIMENT_GRANDE, 1e-6),
      `${t1.traversed ? 'traversé' : 'pas traversé'}, taille ${w.size}, main ${w.main ?? '?'}, ${pos(sim)}`,
    );
    // Trop grosse pour le creux. La porte ordinaire, en face, derrière le
    // refend : par la brèche du nord, géant, jusqu'à sa grande face — de face.
    walkTo(sim, [190, 0, 1682], 60 * 20);
    walkTo(sim, [190, 0, 1724], 60 * 20);
    walkTo(sim, [206, 0, 1724], 60 * 20);
    walkTo(sim, [221, 0, 1682], 60 * 30);
    const t5 = walkTo(sim, [229.5, 0, 1682], 60 * 40, { stopOnEvent: true });
    check(
      'blanchiment : rapportée par la grande face ordinaire, 0,50 et toujours droite',
      t5.traversed?.pairId === 'ordinaire-blanchiment' && t5.traversed.newLevel === 0 && w.held && near(w.size, BLANCHIMENT_TAILLE, 1e-6) && w.main === 'D',
      `${t5.traversed ? 'traversé' : 'pas traversé'}, taille ${w.size}, main ${w.main ?? '?'}, ${pos(sim)}`,
    );
    walkTo(sim, [216, 0, 1711.5], 60 * 20);
    check('blanchiment : à la molette, la vrille droite épouse le dessin', orienterPour(sim, 'creux-blanchiment') >= 0, '');
    agirVers(sim, [216, 0.6, 1716]);
    attendre(sim, 60 * 2);
    check('blanchiment : le creux l’accepte', sim.sockets.pourvus.has('creux-blanchiment'), [...sim.sockets.pourvus].join(',') || 'aucun');
    desceller(sim, check, 'montee-blanchiment-escalier', 'creux-blanchiment', 'blanchiment');

    // LA SORTIE : petite face au mur nord, regardant le sud. Un pas et demi
    // devant, puis droit vers le nord.
    walkTo(sim, [206, 0, 1722.5], 60 * 10);
    const t6 = walkTo(sim, [206, 0, 1732], 60 * 6, { stopOnEvent: true });
    check(
      'blanchiment → escalier : par la petite face, vers le nord, on arrive géant au nord du plateau',
      t6.traversed?.pairId === 'montee-blanchiment-escalier' && t6.traversed.newLevel === 1,
      `${t6.traversed ? t6.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }
  // ═══════════════════════════════════════════════════════════════════════
  // L'ESCALIER POUR PLUS TARD — on ne le descend pas, on le REMONTE.
  //
  // On arrive géant au nord du plateau, face au sud ; la fosse est à cent
  // trente mètres. Quatre cubes traînent devant la trouée : à sept mètres
  // vingt ce sont des galets, on les jette en bas d'un revers de main, chacun
  // un peu moins à pic que le précédent — c'est ça, « les espacer à son œil ».
  // Puis on rapetisse par la porte interne, on découvre quatre îlots, on
  // rapproche deux cubes à la main, on va chercher le jeton sous la butte, on
  // remonte, on le loge. La sortie est en haut, à ×1.
  // ═══════════════════════════════════════════════════════════════════════
  {
    const CUBES = [1, 2, 3, 4].map((i) => piece(sim, `cube-escalier-${i}`));
    const FOND = -3.6;
    const PAROI = 1976;
    const VIRE_A = -2.1;
    const X = -215; // le méridien de la trouée : seul passage du parapet pour un homme

    // On évite la grande face interne, plantée en (−180, 2062) sur le chemin
    // direct : un géant qui la traverse par mégarde arrive au fond sans avoir
    // rien jeté.
    walkTo(sim, [-200, 0, 2062], 60 * 10);
    walkTo(sim, [X, 0, 2004], 60 * 12);
    check('escalier : géant devant la trouée, les cubes à ses pieds', sim.player.scaleLevel === 1 && near(sim.player.position.y, 0, 0.1), pos(sim));

    // LE GÉANT JETTE. À chaque fois le cube le plus proche, depuis la lèvre,
    // en regardant en bas — et un peu moins bas à chaque jet.
    //
    // MESURÉ, ET C'EST UN DÉFAUT DE LA SALLE, PAS DU PILOTE : un géant qui
    // POSE son cube au bord le laisse sur le plateau (la dépose se fait à
    // 2,96 m, proportionnelle à la pièce — les « quatorze mètres » de l'en-tête
    // de la salle sont d'un moteur qui n'existe plus) ; et un géant qui LANCE
    // en regardant le fond de la fosse l'envoie par-dessus, dans la galerie
    // (50 m/s à ×4 contre 24 m de fosse). Seuls les jets entre −1,05 et −1,45
    // rad — de 60° à 83° sous l'horizon, le regard presque à ses pieds —
    // retombent dans la fosse. On les prend, et on le dit.
    const inclinaisons = [-1.35, -1.25, -1.15, -1.08];
    for (const pitch of inclinaisons) {
      const libres = CUBES.filter((c) => !c.lancee).sort(
        (a, b) =>
          Math.hypot(a.position.x - sim.player.position.x, a.position.z - sim.player.position.z) -
          Math.hypot(b.position.x - sim.player.position.x, b.position.z - sim.player.position.z),
      );
      const c = libres[0];
      walkTo(sim, [c.position.x, 0, c.position.z + 5], 60 * 8);
      agirVers(sim, [c.position.x, c.position.y, c.position.z]);
      walkTo(sim, [X, 0, 1983.5], 60 * 8);
      lancer(sim, Math.PI, pitch);
      attendre(sim, 60 * 3);
    }
    // Quatre îlots : tous au fond DE LA FOSSE — entre la bouche de la galerie
    // (1952) et la paroi, pas dans la galerie —, tous à plus d'un demi-mètre de
    // la paroi : le demi-mètre est la mesure de la salle, au-delà on retombe
    // dans la fente.
    check(
      'escalier : les quatre cubes sont au fond, jetés à l’œil d’un géant — quatre îlots, aucun contre la paroi',
      CUBES.every((c) => c.grounded && near(c.position.y, FOND, 0.05) && c.position.z + 0.4 < PAROI - 0.5 && c.position.z - 0.4 > 1952),
      CUBES.map((c) => ou(c)).join(' '),
    );

    // ON RAPETISSE par la grande face de la porte interne : elle regarde le
    // nord, on vient du nord, et l'on ressort plaqué contre la paroi ouest de
    // la fosse, poussé vers l'est.
    // On vient du sud, de la trouée : on la CONTOURNE par l'ouest pour se
    // présenter devant elle — son dos fait mur, comme celui de toute porte.
    walkTo(sim, [-192, 0, 2075], 60 * 14);
    walkTo(sim, [-180, 0, 2075], 60 * 6);
    const d = walkTo(sim, [-180, 0, 2050], 60 * 6, { stopOnEvent: true });
    settle(sim, 40);
    check(
      'escalier : par la grande face interne, on ressort homme au fond de la fosse',
      d.traversed?.pairId === 'escalier-rapetisser' && d.traversed.newLevel === 0 && near(sim.player.position.y, FOND, 0.05),
      `${d.traversed ? d.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );

    // ET LÀ ON EST COINCÉ : 1,50 de vire contre 1,29 de saut. On essaie, on reste en bas.
    walkTo(sim, [X, FOND, 1972], 60 * 10);
    bondirVers(sim, [X, VIRE_A, 1977.3]);
    check('escalier : sans cube, la vire ne se prend pas — 1,50 contre un saut de 1,29', sim.player.position.y < FOND + 0.1, pos(sim));

    // ON RAPPROCHE À LA MAIN : les deux cubes les plus proches de la paroi.
    // Chacun se ramasse en s'approchant du nord — on est à sa portée à deux
    // pas, pas à trois — et se cale au pied de son mur en regardant le sol :
    // le regard commande la hauteur de la dépose, et la dépose se rapproche
    // du mur jusqu'à trouver sa place.
    const [A, B] = [...CUBES].sort((a, b) => b.position.z - a.position.z);
    const ramasser = (c: Carryable): boolean => {
      walkTo(sim, [c.position.x, FOND, c.position.z + 1.6], 60 * 12);
      settle(sim, 20);
      agirVers(sim, [c.position.x, c.position.y, c.position.z]);
      return c.held;
    };
    check('escalier : homme, on ramasse le premier cube — 0,80, ça se soulève', ramasser(A), `${pos(sim)} cube à ${ou(A)}`);
    avancerA(sim, [X, FOND, 1973.8], 0.15);
    poserVers(sim, [X, FOND, PAROI]);
    attendre(sim, 60);
    check(
      'escalier : calé contre la paroi, à moins d’un demi-mètre',
      !A.held && A.grounded && near(A.position.y, FOND, 0.02) && PAROI - (A.position.z + 0.4) < 0.5,
      ou(A),
    );
    check('escalier : on ramasse le second cube', ramasser(B), `${pos(sim)} cube à ${ou(B)}`);
    // On monte sur le premier cube puis sur la vire, le second dans les bras,
    // et l'on s'arrête au bord sud de la vire : entre soi et le mur suivant
    // il reste de quoi poser.
    walkTo(sim, [X, FOND, 1972], 60 * 12);
    avancerA(sim, [X, VIRE_A, 1976.85], 0.12);
    check('escalier : sur la première vire, en marchant, le cube dans les bras', near(sim.player.position.y, VIRE_A, 0.05) && B.held, pos(sim));
    poserVers(sim, [X, VIRE_A, 1978.6]);
    attendre(sim, 60);
    check(
      'escalier : le second cube est calé sur la vire, contre le mur suivant',
      !B.held && B.grounded && near(B.position.y, VIRE_A, 0.02) && 1978.6 - (B.position.z + 0.4) < 0.5,
      ou(B),
    );

    // LE JETON, au fond de la galerie sous la butte : on redescend d'un saut
    // (tomber est gratuit), on va le chercher, on remonte par ses marches.
    walkTo(sim, [X, FOND, 1966], 60 * 10);
    walkTo(sim, [-200, FOND, 1945], 60 * 12);
    avancerA(sim, [-200, FOND, 1923.7], 0.15);
    agirVers(sim, [-200, FOND + 0.1, 1922]);
    const jeton = piece(sim, 'jeton-escalier');
    check('escalier : le jeton se prend au fond de la galerie', jeton.held && near(jeton.size, 0.2, 1e-6), `${pos(sim)} ${ou(jeton)}`);
    walkTo(sim, [-200, FOND, 1945], 60 * 12);
    walkTo(sim, [X, FOND, 1970], 60 * 12);
    walkTo(sim, [X, 0, 1986], 60 * 10);
    settle(sim, 30);
    check(
      'escalier : l’escalier se remonte EN MARCHANT, sans un saut, le jeton dans les bras',
      sim.player.grounded && near(sim.player.position.y, 0, 0.05) && sim.player.position.z > 1984 && jeton.held,
      pos(sim),
    );

    // LE CREUX DU PLATEAU, sur son socle de 0,55 : on se poste à deux pas et
    // l'on pose en regardant le socle.
    avancerA(sim, [X, 0, 1994.2], 0.12);
    poserVers(sim, [X, 0.6, 1996]);
    attendre(sim, 60 * 2);
    check('escalier : le creux prend le jeton', sim.sockets.pourvus.has('creux-escalier'), `${[...sim.sockets.pourvus].join(',') || 'aucun'} jeton à ${ou(jeton)}`);
    desceller(sim, check, 'montee-escalier-atelierHaut', 'creux-escalier', 'escalier');

    // LA SORTIE est dix mètres au nord du creux, et l'on y va tout droit :
    // elle regarde le sud, d'où l'on vient (la salle le déclare, `lacet: 0`).
    walkTo(sim, [X, 0, 2001], 60 * 6);
    const s = walkTo(sim, [X, 0, 2014], 60 * 8, { stopOnEvent: true });
    check(
      'escalier → atelier du haut : par la petite face, vers le nord, on arrive géant sur le toit',
      s.traversed?.pairId === 'montee-escalier-atelierHaut' && s.traversed.newLevel === 1,
      `${s.traversed ? s.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // L'ATELIER DU HAUT — les gestes du pilote de la salle, tels quels.
  //
  // On arrive au nord-est du toit, face au sud. La grande face de la porte
  // interne est droit devant, à cinquante mètres.
  // ═══════════════════════════════════════════════════════════════════════
  {
    walkTo(sim, [96, 14, 2026], 60 * 10);
    const d1 = walkTo(sim, [96, 14, 2014], 60 * 10, { stopOnEvent: true });
    check('atelier du haut : on descend dans la cour, homme', d1.traversed?.newLevel === 0, pos(sim));
    // La pile de tuiles de la cour se refuse à un homme : c'est là que la loi enseigne.
    // La porte est au milieu de la cour : on la contourne au lieu de la
    // repasser — un pas de côté, c'est ce que fait un joueur qui la voit.
    walkTo(sim, [44, 0, 1923], 60 * 6);
    walkTo(sim, [44, 0, 1934], 60 * 8);
    const pile = plusProche('haut-tuiles', [40, 0, 1922], (b) => b.max[1] < 5);
    walkTo(sim, [pile[0], 0, pile[2] - 2.2], 60 * 12);
    const r = agirVers(sim, pile);
    check('atelier du haut : la pile de tuiles est trop grande pour un homme', r.peintureRefusee !== undefined, `${r.peinte ? 'peinte !' : r.peintureRefusee ? 'refusée' : 'rien'} ${pos(sim)}`);
    // Les pots, eux, se peignent en bas : rouge du premier coup.
    const pot = plusProche('haut-pots', [pile[0], 0, pile[2]]);
    walkTo(sim, [pot[0], 0, pot[2] - 1.6], 60 * 12);
    const e = agirVers(sim, pot);
    check('atelier du haut : on dit le rouge aux pots', e.peinte?.pigment === 'rouge', `${e.peinte?.pigment ?? (e.peintureRefusee ? 'refusé' : 'rien')} ${pos(sim)}`);
    // Remonter par la petite face, et peindre les tuiles du toit : rouge, vert, puis bleu.
    walkTo(sim, [44, 0, 1934], 60 * 12);
    walkTo(sim, [44, 0, 1922], 60 * 8);
    walkTo(sim, [40, 0, 1921], 60 * 8);
    const d2 = walkTo(sim, [40, 0, 1931], 60 * 10, { stopOnEvent: true });
    check('atelier du haut : on remonte sur le toit, géant', d2.traversed?.newLevel === 1, pos(sim));
    const tuile = plusProche('haut-tuiles', [96, 14, 2030], (b) => b.min[1] > 10);
    walkTo(sim, [tuile[0], 14, tuile[2] - 5], 60 * 15);
    const t1 = agirVers(sim, tuile);
    const t2 = agirVers(sim, tuile);
    const t3 = agirVers(sim, tuile);
    check(
      'atelier du haut : aux tuiles on dit rouge, puis vert, puis bleu',
      t1.peinte?.pigment === 'rouge' && t2.peinte?.pigment === 'vert' && t3.peinte?.pigment === 'bleu',
      `${t1.peinte?.pigment ?? '?'}, ${t2.peinte?.pigment ?? '?'}, ${t3.peinte?.pigment ?? '?'} ${pos(sim)}`,
    );
    check(
      'atelier du haut : le tableau de la cour est satisfait',
      sim.familles.satisfaits.has('haut-tableau-cour'),
      [...sim.familles.satisfaits].join(', ') || 'aucun',
    );
    desceller(sim, check, 'montee-atelierHaut-vallee', 'haut-tableau-cour', 'atelier du haut');

    // LA SORTIE, soixante-seize mètres à l'ouest, regarde l'est d'où l'on
    // vient : on y va tout droit, le long du toit, et on la franchit vers
    // l'ouest.
    walkTo(sim, [34, 14, 2074], 60 * 20);
    const s = walkTo(sim, [2, 14, 2074], 60 * 10, { stopOnEvent: true });
    settle(sim, 60);
    check(
      'atelier du haut → vallée : par la petite face, vers l’ouest, on arrive ×16 sur la cour des tessons',
      s.traversed?.pairId === 'montee-atelierHaut-vallee' && s.traversed.newLevel === 2 && sim.player.grounded,
      `${s.traversed ? s.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LA VALLÉE EN MAQUETTE — la seule salle qui ne demande rien. On traverse
  // la côte rouge en huit enjambées, vers l'ouest ; au bout, sur la corniche,
  // dort l'or, et il se réveille depuis le point de sortie sans faire un pas.
  // ═══════════════════════════════════════════════════════════════════════
  {
    const depart = { ...sim.player.position };
    walkTo(sim, [-40, 0, 2800], 60 * 10);
    const parcouru = Math.hypot(sim.player.position.x - depart.x, sim.player.position.z - depart.z);
    check('vallée : la côte rouge entière se traverse en quelques enjambées', sim.player.scaleLevel === 2 && parcouru > 90 && sim.player.grounded, `${parcouru.toFixed(0)} m, ${pos(sim)}`);
    const or = agirVers(sim, [-57.8, 8.2, 2798.4]);
    check('vallée : l’or s’éveille, à ×16, depuis la corniche', or.eveil?.id === 'pinceau-or' && sim.eveilles.has('pinceau-or'), `${or.eveil?.id ?? (or.eveilRefuse ? `refusé : trop ${or.eveilRefuse.trop}` : 'rien')} ${pos(sim)}`);

    // LA SORTIE, entre les deux bornes, regarde le nord : on se poste dans
    // l'alcôve, un pas et demi au nord, et l'on marche vers le sud.
    // La porte regarde l'est, vers qui descend la vallée : on la franchit en
    // continuant vers l'ouest, sans un détour.
    walkTo(sim, [-44, 0, 2800], 60 * 6);
    const s = walkTo(sim, [-62, 0, 2800], 60 * 8, { stopOnEvent: true });
    check(
      'vallée → lucarne dorée : par la grande face, vers l’ouest, on arrive ×4 au seuil de la chambre',
      s.traversed?.pairId === 'montee-vallee-lucarneDoree' && s.traversed.newLevel === 1,
      `${s.traversed ? s.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );

    // ═════════════════════════════════════════════════════════════════════
    // LA LUCARNE DORÉE — on ne la traverse pas, on la regarde. Le but est
    // dans la maquette, à neuf mètres du seuil : arriver, c'est finir.
    // ═════════════════════════════════════════════════════════════════════
    settle(sim, 60);
    check(
      'lucarne dorée : debout au seuil, le village en maquette devant soi — et c’est le BUT',
      (s.reachedGoal === true || sim.goalReached) && sim.player.grounded && sim.player.scaleLevel === 1,
      `${sim.goalReached ? 'but atteint' : 'but manqué'} ${pos(sim)}`,
    );
    check('lucarne dorée : l’or a été réveillé AVANT d’arriver — la couleur a quelque chose sur quoi se poser', sim.eveilles.has('pinceau-or'), '');
  }
};
