/**
 * LA DESCENTE, JOUÉE DE BOUT EN BOUT — la preuve que le premier voyage se finit.
 *
 * Chaque salle de la descente a son banc et ses épreuves, et le harnais prouve
 * que chaque raccord se franchit depuis l'intérieur. Mais personne n'avait
 * jamais ENCHAÎNÉ : naître au lavoir, tendre la feuille, tomber dans le puits,
 * remonter, compter les portes des trois creux, dire le rouge aux claies,
 * loger la pierre au fond du bol, réveiller le bleu, et se retrouver debout sur
 * le palier de la lucarne. Une salle juste plus une salle juste ne font pas un
 * voyage juste : c'est LEUR SUITE que ce pilote vérifie, en une seule partie.
 *
 * Il ne pose jamais le joueur nulle part. Il naît où naît le joueur, à taille
 * d'homme, dans la cour du lavoir, et il marche. (La cour de pluie n'est plus
 * un détour de ce voyage : elle vit seule, `?niveau=pluie`.) Il fait aussi
 * les fautes que la salle prévoit, là où elles coûtent peu : sauter petit
 * dans le puits et manquer, essayer de peindre un mur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES SEULES LIBERTÉS QU'IL SE DONNE, et elles sont celles du rendu, pas du
 * joueur :
 *
 *   – `couleursConnues = ['rouge', 'vert']` : les pigments rapportés de
 *     l'introduction, que le rendu remplit depuis la mémoire des couleurs et
 *     que la simulation ne connaît pas d'elle-même.
 *   – `portesFermees.delete(...)` sur chaque porte DESSINÉE une fois sa
 *     condition remplie : c'est le rendu qui trace la porte et la descelle,
 *     et le pilote fait ce que le Pinceau ferait, après avoir constaté que le
 *     verrou la libère.
 *
 * Pas de téléportation, pas de logement rempli à la main, pas de taille
 * modifiée. Un joueur peut faire chaque geste écrit ici.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { TICK_DT } from './constants.js';
import { Simulation } from './simulation.js';
import { DESCENTE } from '../levels/descente.js';
import { agirVers, attendre, near, ordre, piece, pos, settle, walkTo, type Check } from './__pilote.js';

/**
 * OUVRIR UNE PORTE DESSINÉE, comme le Pinceau le ferait.
 *
 * Une porte qui porte une `condition` naît fermée et reste dans
 * `portesFermees` même une fois le verrou levé : c'est le rendu qui la trace
 * puis la descelle. Le pilote constate d'abord que la condition est remplie —
 * c'est ça, la vérification — puis fait le geste du rendu.
 */
const desceller = (sim: Simulation, check: Check, porte: string, condition: string, salle: string): void => {
  const libre = sim.conditionsRemplies.has(condition);
  check(
    `${salle} : le verrou « ${condition} » libère la porte « ${porte} »`,
    libre,
    [...sim.conditionsRemplies].join(', ') || 'aucune condition remplie',
  );
  // Si la condition n'est pas remplie, la porte reste close : le voyage
  // s'arrête là où il s'arrêterait pour un joueur.
  if (libre) sim.portesFermees.delete(porte);
};

/**
 * S'ÉLANCER DANS LE PUITS : courir vers l'est le long de l'axe, et sauter en
 * passant la lèvre.
 *
 * C'est le geste du conduit, et il n'a qu'un paramètre qui compte : le sprint.
 * On tient la touche de saut UNE fois, à la lèvre, jamais avant — sauter plus
 * tôt coûte de la portée. Puis on laisse tomber, dans les deux sens du mot :
 * on ne rend la main qu'une fois posé quelque part, sur la vire ou au fond.
 */
const LEVRE = 190;
const sElancer = (sim: Simulation, z: number, sprint: boolean, sauter = true): void => {
  let saute = false;
  let enLAir = false;
  for (let i = 0; i < 60 * 12; i++) {
    const p = sim.player.position;
    const yaw = Math.atan2(300 - p.x, z - p.z);
    const jump = sauter && !saute && sim.player.grounded && p.x >= LEVRE - 0.15;
    if (jump) saute = true;
    sim.step(ordre(sim, { forward: 1, sprint, jump, yaw }), TICK_DT);
    // On n'est « en l'air » qu'une fois la lèvre passée : un petit ressaut
    // avant elle ne compte pas, sinon l'on rendrait la main à mi-course.
    if (!sim.player.grounded && (saute || p.x >= LEVRE)) enLAir = true;
    if (enLAir && sim.player.grounded) break;
  }
  settle(sim, 30);
};

const ou = (c: { position: { x: number; y: number; z: number } }): string =>
  `(${c.position.x.toFixed(2)}, ${c.position.y.toFixed(2)}, ${c.position.z.toFixed(2)})`;

export const piloterDescente = (check: Check): void => {
  console.log('\n— La descente : le voyage entier, dans l’ordre, en une seule partie —');

  const sim = new Simulation(DESCENTE);
  // Les couleurs rapportées de l'introduction. Voir l'en-tête.
  sim.couleursConnues = ['rouge', 'vert'];

  // ═══════════════════════════════════════════════════════════════════════
  // ON NAÎT DANS LE LAVOIR, homme, dans la cour.
  // ═══════════════════════════════════════════════════════════════════════
  {
    attendre(sim, 30);
    check(
      'lavoir : on naît homme, debout dans la cour, à l’endroit prévu',
      sim.player.scaleLevel === 0 && sim.player.grounded && near(sim.player.position.x, -200, 0.5) && near(sim.player.position.z, 692, 0.5),
      pos(sim),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LE LAVOIR — trois leçons. La fente est un trait à taille d'homme ; à
  // quarante-cinq centimètres c'est un ravin, avec une perle et une feuille au
  // fond et une rampe en gradins qu'on remonte sans sauter. Ce qu'on porte
  // grandit avec soi ; la perle va dans la niche du mur, la feuille sur le
  // chevalet, et c'est la feuille qui fait venir le Pinceau.
  // ═══════════════════════════════════════════════════════════════════════
  {
    // LA FAUTE PRÉVUE : à 1,80, on passe sur le trait sans rien pouvoir y faire.
    walkTo(sim, [-198, 0, 699], 60 * 6);
    walkTo(sim, [-198, 0, 704], 60 * 6);
    check('lavoir : à taille d’homme, la fente est un trait — on marche dessus', sim.player.grounded && sim.player.position.y > -0.1 && sim.player.position.z > 703, pos(sim));

    // LA PORTE DE LA FENTE : grande face au bord ouest de la cour, regardant
    // l'est ; on la franchit vers l'ouest et l'on ressort petit au bord est.
    walkTo(sim, [-204, 0, 700], 60 * 6);
    let t = walkTo(sim, [-214, 0, 700], 60 * 6, { stopOnEvent: true });
    check('lavoir : par la grande face, on rapetisse', t.traversed?.pairId === 'lavoir-fente' && t.traversed.newLevel === -1, pos(sim));
    // La rampe : dix gradins de 0,12 sous une enjambée de 0,225. On descend
    // vers l'ouest, jusqu'à la perle.
    walkTo(sim, [-191.5, 0, 696], 60 * 6);
    walkTo(sim, [-190, 0, 700.4], 60 * 6);
    walkTo(sim, [-189.8, 0, 701.5], 60 * 4);
    walkTo(sim, [-198.2, -1.1, 701.5], 60 * 12);
    check('lavoir : la fente est un lieu — on est au fond, un mètre vingt sous la cour', sim.player.grounded && sim.player.position.y < -1.0, pos(sim));
    const perle = piece(sim, 'perle-lavoir');
    agirVers(sim, [perle.position.x, perle.position.y, perle.position.z]);
    check('lavoir : on prend la perle, 0,10', perle.held && near(perle.size, 0.1, 1e-6), `${pos(sim)} perle ${ou(perle)}`);
    // On remonte la rampe SANS SAUTER : c'est la promesse de la salle.
    walkTo(sim, [-189.8, 0, 701.5], 60 * 12);
    check('lavoir : on remonte la rampe en marchant, sans jamais sauter', sim.player.grounded && sim.player.position.y > -0.1, pos(sim));
    walkTo(sim, [-190, 0, 700.4], 60 * 4);
    walkTo(sim, [-191.5, 0, 696], 60 * 6);
    // La petite face est étroite (1,90) : on se met dans son axe avant de la
    // franchir vers l'est, sans quoi l'œil passe à côté du rectangle.
    walkTo(sim, [-191.6, 0, 693.8], 60 * 6);
    t = walkTo(sim, [-187, 0, 693.8], 60 * 6, { stopOnEvent: true });
    check(
      'lavoir : par la petite face, on regrandit et la perle avec soi — 0,40',
      t.traversed?.pairId === 'lavoir-fente' && t.traversed.newLevel === 0 && perle.held && near(perle.size, 0.4, 1e-6),
      `${t.traversed ? 'traversé' : 'pas traversé'} ${pos(sim)} perle ${perle.size}`,
    );
    // LA NICHE du mur du fond, à hauteur de poitrine. Elle verrouille.
    walkTo(sim, [-196.6, 0, 708.6], 60 * 10);
    agirVers(sim, [-196.6, 1.12, 711.2]);
    attendre(sim, 60);
    check('lavoir : la niche accepte la perle grandie', sim.sockets.pourvus.has('niche-lavoir'), `${[...sim.sockets.pourvus].join(', ') || 'aucun'} perle ${ou(perle)}`);

    // LA FEUILLE, au fond de la fente aussi, derrière des racines qui ont
    // soulevé le pavé : 0,28 de haut pour un saut de 0,323. On redescend.
    walkTo(sim, [-204, 0, 700], 60 * 8);
    t = walkTo(sim, [-214, 0, 700], 60 * 6, { stopOnEvent: true });
    check('lavoir : on redescend dans la fente', t.traversed?.newLevel === -1, pos(sim));
    walkTo(sim, [-191.5, 0, 696], 60 * 6);
    walkTo(sim, [-190, 0, 700.4], 60 * 6);
    walkTo(sim, [-189.8, 0, 701.5], 60 * 4);
    walkTo(sim, [-203, -1.1, 701.5], 60 * 12);
    walkTo(sim, [-208, -1.1, 701.5], 60 * 6, { jump: true });
    settle(sim, 30);
    const feuille = piece(sim, 'feuille-lavoir');
    check('lavoir : on passe les racines d’un saut, jusqu’à la feuille', sim.player.grounded && sim.player.position.x < -207.4, pos(sim));
    agirVers(sim, [feuille.position.x, feuille.position.y, feuille.position.z]);
    check('lavoir : on prend la feuille, 0,20', feuille.held && near(feuille.size, 0.2, 1e-6), `${pos(sim)} feuille ${ou(feuille)}`);
    walkTo(sim, [-203, -1.1, 701.5], 60 * 6, { jump: true });
    settle(sim, 30);
    walkTo(sim, [-189.8, 0, 701.5], 60 * 12);
    walkTo(sim, [-190, 0, 700.4], 60 * 4);
    walkTo(sim, [-191.5, 0, 696], 60 * 6);
    // La petite face est étroite (1,90) : on se met dans son axe avant de la
    // franchir vers l'est, sans quoi l'œil passe à côté du rectangle.
    walkTo(sim, [-191.6, 0, 693.8], 60 * 6);
    t = walkTo(sim, [-187, 0, 693.8], 60 * 6, { stopOnEvent: true });
    check(
      'lavoir : la feuille ressort avec soi, 0,80',
      t.traversed?.newLevel === 0 && feuille.held && near(feuille.size, 0.8, 1e-6),
      `${t.traversed ? 'traversé' : 'pas traversé'} ${pos(sim)} feuille ${feuille.size}`,
    );

    // LE CHEVALET, posé au sol au sud-ouest de la cour, son dosseret au nord :
    // on l'aborde par le sud, on vise le plateau, on lâche. Il ne demande pas
    // de viser au centimètre — le logement accueille à deux mètres et demi.
    // On ressort de la fente au nord du chevalet : on le contourne par
    // l'ouest pour l'aborder de face, par le sud.
    walkTo(sim, [-207.5, 0, 698.5], 60 * 8);
    walkTo(sim, [-207.5, 0, 693.6], 60 * 8);
    walkTo(sim, [-205.25, 0, 693.6], 60 * 6);
    agirVers(sim, [-205.25, 1.28, 695.85]);
    attendre(sim, 60);
    check('lavoir : la feuille est tendue sur le chevalet', sim.sockets.pourvus.has('chevalet-lavoir') && !feuille.held, `${[...sim.sockets.pourvus].join(', ')} feuille ${ou(feuille)}`);
    check('lavoir : et c’est ça qui fait venir le Pinceau', sim.conditionsRemplies.has('chevalet-lavoir'), [...sim.conditionsRemplies].join(', '));
    // UN CHEVALET REND : reprendre la feuille rescelle la porte, la reposer
    // la libère. Une décision doit pouvoir se reprendre.
    agirVers(sim, [feuille.position.x, feuille.position.y, feuille.position.z]);
    attendre(sim, 30);
    check(
      'lavoir : on reprend la feuille — le chevalet la rend, et la porte se rescelle',
      feuille.held && !sim.sockets.pourvus.has('chevalet-lavoir') && !sim.conditionsRemplies.has('chevalet-lavoir'),
      `${feuille.held ? 'en main' : 'pas en main'}, ${[...sim.conditionsRemplies].join(', ') || 'aucune condition'}`,
    );
    agirVers(sim, [-205.25, 1.28, 695.85]);
    attendre(sim, 60);
    check('lavoir : on la repose, et le Pinceau revient', sim.sockets.pourvus.has('chevalet-lavoir'), [...sim.sockets.pourvus].join(', '));
    desceller(sim, check, 'raccord-lavoir-conduit', 'chevalet-lavoir', 'lavoir');

    // LA SORTIE : la porte dessinée, au bord ouest, regarde le nord ; on la
    // franchit vers le sud.
    walkTo(sim, [-209.6, 0, 697], 60 * 6);
    t = walkTo(sim, [-209.6, 0, 690], 60 * 6, { stopOnEvent: true });
    check(
      'lavoir → conduit : par la porte dessinée, on arrive petit à la lèvre du puits',
      t.traversed?.pairId === 'raccord-lavoir-conduit' && t.traversed.newLevel === -1,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LE CONDUIT — une chute est un lieu qu'on traverse, et le puits fait
  // tourner les trois tailles : la faille du fond rend un cran plus grand, la
  // gueule du fond un cran plus petit. On essaie petit : on manque l'arête.
  // On remonte homme, on se laisse tomber sans élan : on manque encore. On
  // remonte géant, on atteint la vire, et l'on ne rentre pas. On redescend,
  // on remonte homme, on court, on saute : on passe.
  // ═══════════════════════════════════════════════════════════════════════
  {
    attendre(sim, 30);
    check('conduit : on arrive petit, debout, à la lèvre', sim.player.scaleLevel === -1 && sim.player.grounded, pos(sim));

    // LA FAUTE PRÉVUE, la première : petit, même en courant, on manque de
    // portée — l'arête est à 15,5 et le meilleur coup du petit à 14.
    walkTo(sim, [183, 0, 999.6], 60 * 6);
    sElancer(sim, 999.6, true);
    check(
      'conduit : petit, même en courant, on manque l’arête et l’on touche le fond',
      sim.player.grounded && sim.player.position.y < -41 && sim.player.position.x < 205.5,
      pos(sim),
    );
    // LA REMONTÉE, par la faille du fond : sa petite face regarde le nord, on
    // la franchit vers le sud, et l'on ressort en haut un cran plus grand.
    walkTo(sim, [202, -41.9, 999.5], 60 * 8);
    let t = walkTo(sim, [202, -41.9, 995], 60 * 6, { stopOnEvent: true });
    check(
      'conduit : la faille du fond ramène en haut, et rend homme',
      t.traversed?.pairId === 'conduit-faille' && t.traversed.newLevel === 0,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
    settle(sim, 30);
    check('conduit : la remontée s’est faite debout, en haut du puits', sim.player.grounded && sim.player.position.y > -0.5, pos(sim));

    // LA FAUTE PRÉVUE, la seconde : homme, sans élan — on marche dans le vide
    // sans sauter, et l'on passe SOUS la vire.
    walkTo(sim, [186, 0, 1003], 60 * 4);
    walkTo(sim, [182, 0, 1000], 60 * 4);
    sElancer(sim, 1000, false, false);
    check('conduit : homme, sans élan, on tombe encore', sim.player.grounded && sim.player.position.y < -41, pos(sim));
    walkTo(sim, [202, -41.9, 999.5], 60 * 8);
    t = walkTo(sim, [202, -41.9, 995], 60 * 6, { stopOnEvent: true });
    check('conduit : la faille rend un cran de plus — on ressort géant', t.traversed?.pairId === 'conduit-faille' && t.traversed.newLevel === 1, pos(sim));
    settle(sim, 30);

    // LA FAUTE PRÉVUE, la troisième : géant, on a la portée et davantage, on
    // se pose sur la vire — et l'ouverture fait 3,60 pour un joueur de 7,20.
    walkTo(sim, [186, 0, 1003], 60 * 4);
    walkTo(sim, [182, 0, 1000], 60 * 4);
    sElancer(sim, 1000, true);
    check('conduit : géant, on se pose sur la vire', sim.player.grounded && near(sim.player.position.y, -32, 0.5) && sim.player.position.x > 205.5, pos(sim));
    walkTo(sim, [216, -32, 1000], 60 * 6);
    check('conduit : et l’on ne rentre pas — la porte est trop petite pour soi', sim.player.position.x < 211 && near(sim.player.position.y, -32, 0.5), pos(sim));
    // On quitte la vire par où l'on est venu : en marchant dans le vide.
    walkTo(sim, [198, -32, 1000], 60 * 6);
    settle(sim, 60 * 3);
    check('conduit : géant, on redescend de la vire au fond', sim.player.grounded && sim.player.position.y < -41, pos(sim));
    // LA GUEULE, au fond aussi : sa grande face regarde le sud, on la franchit
    // vers le nord, et l'on ressort en haut un cran plus petit — homme.
    walkTo(sim, [200, -41.9, 999], 60 * 6);
    t = walkTo(sim, [200, -41.9, 1007], 60 * 6, { stopOnEvent: true });
    check(
      'conduit : la gueule du fond ramène en haut, et rend homme',
      t.traversed?.pairId === 'conduit-gueule' && t.traversed.newLevel === 0,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
    settle(sim, 30);

    // LE GESTE JUSTE : homme, en courant, on se pose sur la vire.
    walkTo(sim, [176, 0, 1000], 60 * 6);
    walkTo(sim, [182, 0, 1000], 60 * 6);
    sElancer(sim, 1000, true);
    check(
      'conduit : homme, en courant et en sautant, on se pose sur la vire',
      sim.player.grounded && near(sim.player.position.y, -31.6, 0.5) && sim.player.position.x > 205.5,
      pos(sim),
    );
    // Le tunnel, puis la porte au bout : sa petite face regarde l'ouest, on la
    // franchit vers l'est et l'on ressort géant dans la grande cour.
    walkTo(sim, [216.5, -31.6, 1000], 60 * 8);
    t = walkTo(sim, [222, -31.6, 1000], 60 * 6, { stopOnEvent: true });
    check(
      'conduit → creux : au bout du tunnel, on arrive géant au sud de la grande cour',
      t.traversed?.pairId === 'raccord-conduit-creux' && t.traversed.newLevel === 1,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LES TROIS CREUX — compter les portes. Trois perles identiques au fond du
  // petit creux ; une reste, une monte d'une porte, une de deux. On descend
  // d'abord jusqu'en bas par les deux grandes faces.
  // ═══════════════════════════════════════════════════════════════════════
  {
    attendre(sim, 30);
    walkTo(sim, [222, 0, 690], 60 * 8);
    walkTo(sim, [226, 0, 682], 60 * 6);
    let t = walkTo(sim, [238, 0, 682], 60 * 6, { stopOnEvent: true });
    check('creux : par la grande face du haut, on descend homme dans la cour moyenne', t.traversed?.pairId === 'creux-haut' && t.traversed.newLevel === 0, pos(sim));
    walkTo(sim, [194, -24, 700], 60 * 8);
    t = walkTo(sim, [187, -24, 700], 60 * 6, { stopOnEvent: true });
    check('creux : par la grande face du bas, on descend petit dans le petit creux', t.traversed?.pairId === 'creux-bas' && t.traversed.newLevel === -1, pos(sim));

    // ZÉRO PORTE : la perle c va dans le petit creux telle quelle.
    const a = piece(sim, 'creux-perle-a');
    const b = piece(sim, 'creux-perle-b');
    const c = piece(sim, 'creux-perle-c');
    walkTo(sim, [198.5, -30, 700.2], 60 * 4);
    agirVers(sim, [c.position.x, c.position.y, c.position.z]);
    check('creux : on prend une perle, 0,20', c.held && near(c.size, 0.2, 1e-6), `${pos(sim)} ${ou(c)}`);
    walkTo(sim, [200, -30, 701.2], 60 * 4);
    agirVers(sim, [200, -29.99, 701.9]);
    attendre(sim, 60);
    check('creux : zéro porte — le petit creux l’accepte', sim.sockets.pourvus.has('creux-petit'), `${[...sim.sockets.pourvus].join(', ')} ${ou(c)}`);

    // UNE PORTE : la perle b monte par la petite face, et va dans le creux moyen.
    walkTo(sim, [199.6, -30, 699.4], 60 * 4);
    agirVers(sim, [b.position.x, b.position.y, b.position.z]);
    check('creux : on prend la deuxième', b.held, `${pos(sim)} ${ou(b)}`);
    walkTo(sim, [199.2, -30, 700], 60 * 4);
    t = walkTo(sim, [196, -30, 700], 60 * 4, { stopOnEvent: true });
    check(
      'creux : une porte — elle ressort 0,80 dans la cour moyenne',
      t.traversed?.pairId === 'creux-bas' && t.traversed.newLevel === 0 && b.held && near(b.size, 0.8, 1e-6),
      `${t.traversed ? 'traversé' : 'pas traversé'} ${pos(sim)} taille ${b.size}`,
    );
    walkTo(sim, [194, -24, 704.5], 60 * 6);
    walkTo(sim, [200, -24, 705.4], 60 * 6);
    agirVers(sim, [200, -23.96, 707.6]);
    attendre(sim, 90);
    check('creux : le creux moyen l’accepte', sim.sockets.pourvus.has('creux-moyen'), `${[...sim.sockets.pourvus].join(', ')} ${ou(b)}`);

    // DEUX PORTES : la perle a monte deux fois, et va dans le grand creux.
    walkTo(sim, [194, -24, 700], 60 * 6);
    t = walkTo(sim, [187, -24, 700], 60 * 6, { stopOnEvent: true });
    check('creux : on redescend chercher la troisième', t.traversed?.newLevel === -1, pos(sim));
    walkTo(sim, [199.6, -30, 698.6], 60 * 4);
    agirVers(sim, [a.position.x, a.position.y, a.position.z]);
    check('creux : on la prend', a.held, `${pos(sim)} ${ou(a)}`);
    walkTo(sim, [199.2, -30, 700], 60 * 4);
    t = walkTo(sim, [196, -30, 700], 60 * 4, { stopOnEvent: true });
    check('creux : première porte, 0,80', t.traversed?.newLevel === 0 && a.held && near(a.size, 0.8, 1e-6), `${pos(sim)} taille ${a.size}`);
    walkTo(sim, [194, -24, 705.5], 60 * 6);
    walkTo(sim, [206, -24, 705.5], 60 * 6);
    walkTo(sim, [206.5, -24, 700], 60 * 6);
    t = walkTo(sim, [214, -24, 700], 60 * 6, { stopOnEvent: true });
    check(
      'creux : deux portes — elle ressort 3,20 dans la grande cour, et l’on est géant',
      t.traversed?.pairId === 'creux-haut' && t.traversed.newLevel === 1 && a.held && near(a.size, 3.2, 1e-6),
      `${t.traversed ? 'traversé' : 'pas traversé'} ${pos(sim)} taille ${a.size}`,
    );
    walkTo(sim, [226, 0, 700], 60 * 6);
    walkTo(sim, [222, 0, 716], 60 * 6);
    walkTo(sim, [206, 0, 720], 60 * 6);
    agirVers(sim, [200, 0.16, 730.4]);
    attendre(sim, 150);
    check('creux : le grand creux l’accepte — les trois sont comptées', sim.sockets.pourvus.has('creux-grand'), `${[...sim.sockets.pourvus].join(', ')} ${ou(a)}`);

    // LA SORTIE, au nord de la grande cour : sa grande face regarde le sud, on
    // la franchit vers le nord. On contourne la perle logée, qui fait 3,20.
    walkTo(sim, [207, 0, 738], 60 * 8);
    walkTo(sim, [200, 0, 739], 60 * 6);
    t = walkTo(sim, [200, 0, 748], 60 * 6, { stopOnEvent: true });
    check(
      'creux → atelier : par la grande face du nord, on arrive homme dans l’atelier, face à l’est',
      t.traversed?.pairId === 'raccord-creux-atelier' && t.traversed.newLevel === 0,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // L'ATELIER DE LAVIS — on ne peint que ce qu'on pourrait tenir. Les gestes
  // du pilote de la salle, tels quels : on dit le rouge à une claie, la pièce
  // ressemble au tableau, la porte se dessine. Le mur, lui, refuse.
  // ═══════════════════════════════════════════════════════════════════════
  {
    attendre(sim, 30);
    // LA FAUTE PRÉVUE : le mur ouest, à un pas de l'entrée. Trop grand.
    const r = agirVers(sim, [-2.8, 1.0, sim.player.position.z]);
    check('atelier : le mur refuse — il est trop grand pour soi', r.peintureRefusee !== undefined && r.peinte === undefined, `${r.peinte ? 'peint !' : r.peintureRefusee ? 'refusé' : 'rien'} ${pos(sim)}`);

    walkTo(sim, [0.22, 0, 1301.5], 60 * 8);
    const e = agirVers(sim, [1.82, 1.005, 1301.5]);
    check(
      'atelier : on dit le rouge à une claie — la première couleur qu’on connaisse',
      e.peinte?.pigment === 'rouge' && sim.familles.teintes.get('atelier-claies') === 'rouge',
      `${e.peinte ? e.peinte.pigment : e.peintureRefusee ? 'refusé' : 'rien'} ${pos(sim)}`,
    );
    check('atelier : et la pièce ressemble au tableau', sim.familles.satisfaits.has('atelier-tableau'), '');
    const e2 = agirVers(sim, [1.82, 1.005, 1301.5]);
    check('atelier : appuyer encore dit la couleur suivante', e2.peinte?.pigment === 'vert', `${e2.peinte?.pigment ?? 'rien'}`);
    check('atelier : et un tableau réussi ne se dé-satisfait pas', sim.familles.satisfaits.has('atelier-tableau'), '');
    desceller(sim, check, 'atelier-porte', 'atelier-tableau', 'atelier');

    // LA PORTE DESSINÉE, dans le mur est : sa grande face regarde l'ouest, on
    // la franchit vers l'est et l'on ressort petit par le trou de souris, dans
    // la cour, toujours vers l'est — droit sur le raccord du bol.
    walkTo(sim, [0, 0, 1305.43], 60 * 8);
    let t = walkTo(sim, [5, 0, 1305.43], 60 * 6, { stopOnEvent: true });
    check('atelier : par la porte dessinée, on ressort petit par le trou de souris', t.traversed?.pairId === 'atelier-porte' && t.traversed.newLevel === -1, pos(sim));
    t = walkTo(sim, [7, 0, 1300.35], 60 * 6, { stopOnEvent: true });
    check(
      'atelier → bol : trois pas dans la cour, et l’on arrive homme au seuil du bol',
      t.traversed?.pairId === 'raccord-atelier-bol' && t.traversed.newLevel === 0,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LE BOL — les deux faces d'une même porte dans une seule pièce. On prend
  // une pierre, on fait le tour par la grande face, on ressort petit sur
  // l'étagère avec une pierre de 0,12, on entre dans le bol par la brèche et
  // l'on pose. Puis on refait le tour à l'envers, et la porte du fond,
  // dessinée, mène à la grève.
  // ═══════════════════════════════════════════════════════════════════════
  {
    attendre(sim, 30);
    check('bol : on arrive homme, au seuil sud de la pièce', sim.player.scaleLevel === 0 && sim.player.grounded, pos(sim));
    const pierre = piece(sim, 'bol-pierre-a');
    walkTo(sim, [-340.9, 0, 1238.3], 60 * 4);
    agirVers(sim, [pierre.position.x, pierre.position.y, pierre.position.z]);
    check('bol : on prend une pierre, 0,48', pierre.held && near(pierre.size, 0.48, 1e-6), `${pos(sim)} ${ou(pierre)}`);
    walkTo(sim, [-340.8, 0, 1238.6], 60 * 4);
    let t = walkTo(sim, [-344, 0, 1238.6], 60 * 4, { stopOnEvent: true });
    check(
      'bol : par la grande face, on ressort petit sur l’étagère, la pierre à 0,12',
      t.traversed?.pairId === 'bol-tour' && t.traversed.newLevel === -1 && pierre.held && near(pierre.size, 0.12, 1e-6),
      `${t.traversed ? 'traversé' : 'pas traversé'} ${pos(sim)} taille ${pierre.size}`,
    );
    // Un pas de côté d'abord : la petite face est dans le dos, on ne la
    // retraverse pas. Puis la coursive, la brèche, le fond du bol.
    walkTo(sim, [-337.5, 0.92, 1241.6], 60 * 4);
    walkTo(sim, [-338.7, 0.92, 1241.2], 60 * 6);
    walkTo(sim, [-338.7, 0.92, 1240.05], 60 * 6);
    walkTo(sim, [-338.2, 0.95, 1240.05], 60 * 6);
    // Dedans, c'est : les pieds sur le FOND (0,95, et pas les 0,92 du tablier
    // — trois centimètres, donc pas de tolérance à 0,1 ici) et à moins d'un
    // rayon intérieur (0,50) de l'axe du bol.
    check(
      'bol : on est entré dans le bol par la brèche, en marchant',
      sim.player.grounded &&
        sim.player.position.y > 0.94 &&
        Math.hypot(sim.player.position.x + 337.905, sim.player.position.z - 1240) < 0.5,
      pos(sim),
    );
    const d = agirVers(sim, [-337.905, 0.95, 1240]);
    attendre(sim, 60);
    check(
      'bol : petit, on baisse les yeux et l’on pose — le logement l’accepte',
      d.carry?.taken === false && sim.sockets.pourvus.has('bol-logement'),
      `${[...sim.sockets.pourvus].join(', ') || 'aucun'} ${ou(pierre)}`,
    );
    desceller(sim, check, 'bol-fond', 'bol-logement', 'bol');

    // LE TOUR À L'ENVERS : par la petite face, vers l'ouest, on redevient
    // homme au pied du mur ouest.
    walkTo(sim, [-338.7, 0.92, 1240.05], 60 * 6);
    walkTo(sim, [-338.7, 0.92, 1241.4], 60 * 6);
    walkTo(sim, [-337.4, 0.92, 1242.4], 60 * 6);
    t = walkTo(sim, [-339.5, 0.92, 1242.4], 60 * 4, { stopOnEvent: true });
    check('bol : par la petite face, on redevient homme dans la pièce', t.traversed?.pairId === 'bol-tour' && t.traversed.newLevel === 0, pos(sim));
    // LA PORTE DU FOND : sa grande face regarde le sud, on la franchit vers
    // le nord et l'on ressort petit en haut de la grève, face à l'est.
    walkTo(sim, [-341, 0, 1240], 60 * 4);
    t = walkTo(sim, [-341, 0, 1245], 60 * 4, { stopOnEvent: true });
    check('bol : la porte dessinée mène à la grève, petit', t.traversed?.pairId === 'bol-fond' && t.traversed.newLevel === -1, pos(sim));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LE FOND — la grève, la vasque, et le bleu qui dort. On descend la pente en
  // marchant ; la vasque est le bol, aux mêmes cotes, pleine d'eau ; E le
  // réveille, à ×1/4 seulement. Puis la porte de la lucarne, ouverte, plantée
  // là même où dort le pinceau : on la franchit vers le sud.
  // ═══════════════════════════════════════════════════════════════════════
  {
    attendre(sim, 30);
    walkTo(sim, [-290, 1, 1335.3], 60 * 12);
    walkTo(sim, [-280, 1, 1335.3], 60 * 12);
    walkTo(sim, [-270, 0.5, 1335.3], 60 * 12);
    check('fond : on descend la grève en marchant, jusqu’au bas de la pente', sim.player.grounded && sim.player.position.x > -271, pos(sim));
    walkTo(sim, [-267.5, 0.2, 1335.3], 60 * 6);
    const v = agirVers(sim, [-267.5, 0.21, 1335]);
    check('fond : dans la vasque, E réveille le pinceau bleu', v.eveil?.id === 'pinceau-bleu' && sim.eveilles.has('pinceau-bleu'), `${v.eveil ? 'éveil' : v.eveilRefuse ? `refusé (trop ${v.eveilRefuse.trop})` : 'rien'} ${pos(sim)}`);
    const t = walkTo(sim, [-267.5, 0.2, 1331], 60 * 6, { stopOnEvent: true });
    check(
      'fond → lucarne : par la petite face, on arrive homme sur le palier, devant la maquette',
      t.traversed?.pairId === 'raccord-bol-lucarneBleue' && t.traversed.newLevel === 0,
      `${t.traversed ? t.traversed.pairId : 'pas traversé'} ${pos(sim)}`,
    );
    const fin = attendre(sim, 60);
    check(
      'lucarne : et le voyage est fini — debout dans le village qu’on vient de colorier',
      (t.reachedGoal === true || fin.reachedGoal === true) && sim.goalReached && sim.player.grounded,
      `${sim.goalReached ? 'but atteint' : 'but manqué'} ${pos(sim)}`,
    );
  }
};
