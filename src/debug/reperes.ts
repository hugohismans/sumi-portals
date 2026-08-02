import { SALLES_MONTEE } from '../levels/montee.js';

/**
 * LES REPÈRES — un raccourci vers chaque moment qui mérite d'être regardé.
 *
 * Le jeu se joue d'une traite : on part du village en lavis et l'on finit à la
 * pointe de l'Aiguille. C'est très bien pour jouer, et intenable pour vérifier.
 * Contrôler la teinte du pinceau vert au moment où il s'éveille demandait de
 * refaire quatre minutes de trajet, deux portails et deux détours — donc on ne
 * le vérifiait pas, donc on ne trouvait les défauts qu'en jouant par hasard.
 *
 * `?debug=1` affiche cette liste et lie chaque ligne à une touche. On appuie
 * sur 3, on est devant le pinceau rouge endormi. C'est tout.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CERTAINS REPÈRES RECHARGENT LA PAGE
 *
 * Un repère ne décrit pas seulement un ENDROIT : il décrit un ÉTAT du monde.
 * « Le village en lavis » n'a de sens que si aucune couleur n'a été rapportée ;
 * « le belvédère » n'a de sens que si les deux le sont — sinon on regarde un
 * décor qui ne sera jamais celui du joueur.
 *
 * Or les couleurs déjà rendues décident de choses posées AU CHARGEMENT : les
 * pinceaux qui flottent au-dessus de leurs socles, la teinte des cadres de
 * portail, l'anneau des socles. Les changer en cours de partie donnerait un
 * état bâtard qu'aucune vraie partie ne produit — et c'est précisément le
 * genre de faux positif qui fait perdre une heure.
 *
 * Donc : si l'état des pigments demandé diffère de l'état courant, on l'écrit
 * et on RECHARGE. Le monde se rebâtit exactement comme il se serait bâti pour
 * un joueur arrivé là honnêtement. Sinon, simple téléportation, instantanée.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface Repere {
  /** Ce qu'on va voir. Court : c'est une ligne de liste. */
  titre: string;
  /** CE QU'IL FAUT VÉRIFIER ICI. C'est la seule raison d'être du repère. */
  verifier: string;
  position: [number, number, number];
  /** Palier d'échelle. 0 = 1,80 m, 1 = ×4, 2 = ×16, −1 = ×1/4. */
  echelle: number;
  /** Lacet, en radians. 0 regarde vers +Z. */
  lacet: number;
  /**
   * Les pigments qui doivent DÉJÀ être rapportés en arrivant ici. Décide du
   * rechargement — voir l'en-tête.
   */
  pigments: string[];
  /** Jalon du Pinceau, pour qu'il soit là où il serait vraiment. */
  jalon: number;
  /** Déclenche la fin dès l'arrivée, sans rien avoir à faire. */
  sacre?: boolean;
  /**
   * Pinceau déjà réveillé et pendu à nos basques.
   *
   * C'est ce qui permet de se poser DEVANT la porte du retour, la fée en
   * remorque, et de franchir pour voir le geste — au lieu de refaire le monde
   * entier chaque fois qu'on veut juger deux secondes d'animation.
   */
  eveille?: string;
}

const VILLAGE_Y = 0;
const TERRASSE_Y = 30;

/**
 * Le voyage, découpé aux endroits où il peut se casser.
 *
 * L'ordre suit celui de la partie : on peut donc descendre la liste touche par
 * touche et voir passer le jeu entier en une minute. Chaque entrée nomme UNE
 * chose à contrôler ; quand une ligne en nomme deux, c'est qu'il manque un
 * repère.
 */
export const REPERES_MONDE: Repere[] = [
  {
    titre: 'Le village en lavis',
    verifier:
      "Tout est gris — le décor, les cadres de portail, les socles, le ciel. " +
      "La moindre couleur ici est un défaut : on n'en a encore rapporté aucune.",
    position: [0, VILLAGE_Y + 0.3, -26],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 0,
  },
  {
    titre: 'La maquette et les cinq socles',
    verifier:
      "La maquette de l'Aiguille est à hauteur d'œil, son encrier VIDE. Les cinq " +
      'creux ont des tailles franchement différentes, et le cinquième est retourné.',
    position: [-6, VILLAGE_Y + 0.3, -14],
    echelle: 0,
    lacet: Math.PI * 0.5,
    pigments: [],
    jalon: 1,
  },
  {
    titre: "Devant la porte de l'ouest",
    verifier:
      'La petite porte se franchit à 1,80 et fait ressortir quatre fois plus grand. ' +
      "La porte verte est à cinquante mètres : on ne doit pas pouvoir les confondre.",
    position: [-44, VILLAGE_Y + 0.3, -30],
    echelle: 0,
    lacet: -Math.PI * 0.5,
    pigments: [],
    jalon: 4,
  },
  {
    titre: 'Le pinceau rouge endormi',
    verifier:
      "On sort du portail FACE au chantier, jamais dos à lui. Le pinceau rouge dort, " +
      'visible de loin, et E le réveille — à ×4 et à ×4 seulement.',
    position: [-482, 0.3, 0],
    echelle: 1,
    lacet: -Math.PI * 0.5,
    pigments: [],
    jalon: 5,
  },
  {
    titre: 'AVANT LA PORTE — le rouge te suit',
    verifier:
      "Franchis, et regarde : les ÉCLATS du village doivent s'allumer là où tu " +
      "poses les pieds — auvents, margelle, gardes de torii — et l'encre doit " +
      'frapper chaque façade avant de sécher.',
    position: [-330, 0.3, 0],
    echelle: 1,
    lacet: Math.PI * 0.5,
    pigments: [],
    jalon: 5,
    eveille: 'pinceau-rouge',
  },
  {
    titre: 'Le rouge repeint le village',
    verifier:
      "LE MOMENT DU JEU. La couleur doit se répandre DEPUIS le pinceau, avec un front " +
      "d'encre visible — pas monter partout en même temps comme une jauge.",
    position: [-3.5, VILLAGE_Y + 0.3, -22],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 6,
  },
  {
    titre: 'La terrasse, en géant',
    verifier:
      'Le village est en bas, minuscule, et le toit qu\'on ne pouvait pas atteindre ' +
      "n'est plus qu'une marche. Aucune montagne ne doit être visible d'ici.",
    position: [-27, TERRASSE_Y + 0.5, 92],
    echelle: 1,
    lacet: Math.PI,
    pigments: ['rouge'],
    jalon: 7,
  },
  {
    titre: 'Devant la porte verte',
    verifier:
      "On entre dans le jardin par la GRANDE face, en étant déjà à ×4 — donc on en " +
      'ressort à 1,80. Le rouge du village est posé, le vert manque encore.',
    position: [-30, VILLAGE_Y + 0.5, -21],
    echelle: 1,
    lacet: -Math.PI * 0.5,
    pigments: ['rouge'],
    jalon: 11,
  },
  {
    titre: 'Le pied du tas de feuilles',
    verifier:
      "L'épreuve : vingt bonds, cinq volées de trois feuilles séparées par une vire. " +
      'Une chute doit reposer au départ de la volée ratée, jamais au sol.',
    position: [507.3, 0.4, -12],
    echelle: 0,
    lacet: Math.PI,
    pigments: ['rouge'],
    jalon: 12,
  },
  {
    titre: 'Le pinceau vert, au sommet',
    verifier:
      "Il dort à vingt mètres, au bout de l'épreuve. Trop grand ou trop petit, il " +
      "frémit et refuse ; à 1,80 il s'éveille et tourne autour de nous.",
    position: [510, 20.4, -36],
    echelle: 0,
    lacet: Math.PI,
    pigments: ['rouge'],
    jalon: 13,
  },
  {
    titre: 'AVANT LA PORTE — le vert te suit',
    verifier:
      'Franchis, et regarde : le CORPS du village doit reprendre sa matière — ' +
      'murs, toits, sol — pendant que ses éclats sont déjà rouges.',
    position: [322, 0.4, 0],
    echelle: 0,
    lacet: -Math.PI * 0.5,
    pigments: ['rouge'],
    jalon: 13,
    eveille: 'pinceau-vert',
  },
  {
    titre: 'La seconde porte, dessinée',
    verifier:
      'Le Pinceau la trace tache par tache, en coups irréguliers. Elle ne se franchit ' +
      "qu'une fois le dessin fini.",
    position: [0, TERRASSE_Y + 0.5, 62],
    echelle: 1,
    lacet: Math.PI,
    pigments: ['rouge', 'vert'],
    jalon: 15,
  },
  {
    titre: "L'éperon et la pointe",
    verifier:
      "À ×16 le belvédère est une dalle. La pointe de l'Aiguille est atteignable, " +
      "et l'encrier qui l'attend est visible d'en bas.",
    position: [-180, 197.4, 326],
    echelle: 2,
    lacet: Math.PI * 0.75,
    pigments: ['rouge', 'vert'],
    jalon: 17,
  },
  {
    titre: 'LE SACRE, tout de suite',
    verifier:
      "La caméra recule sur quatre cents mètres en quatorze secondes, le brouillard " +
      "s'ouvre, LES MONTAGNES APPARAISSENT, et le titre vient après ce qu'il nomme.",
    position: [-180, 197.4, 326],
    echelle: 2,
    lacet: Math.PI * 0.75,
    pigments: ['rouge', 'vert'],
    jalon: 17,
    sacre: true,
  },
];

/** Vrai si l'état des pigments demandé n'est pas celui qu'on a sous les yeux. */
export const changeDeMonde = (voulu: string[], courant: string[]): boolean => {
  if (voulu.length !== courant.length) return true;
  const a = [...voulu].sort();
  const b = [...courant].sort();
  return a.some((p, i) => p !== b[i]);
};

/**
 * LA DESCENTE — un repère par salle, dans l'ordre du voyage.
 *
 * Six salles bâties par cinq mains différentes, en une nuit, chacune sans voir
 * les autres. Aucune n'a jamais été REGARDÉE : tout ce qu'on sait d'elles est
 * mesuré, simulé, prouvé — et rien de tout cela ne dit si c'est beau, ni si
 * l'on comprend ce qu'on doit faire.
 *
 * C'est à ça que servent ces touches. Elles ne rechargent pas la page : la
 * descente n'a pas de couleur à rapporter, donc son état tient tout entier dans
 * la position et l'échelle.
 */
export const REPERES_DESCENTE: Repere[] = [
  {
    titre: 'Le lavoir, à hauteur d’homme',
    verifier:
      'Un bassin, des dalles, un mur avec un creux vide, un chevalet. Entre deux ' +
      "pavés, un TRAIT au sol qu'on ne peut pas regarder : c'est là qu'on ira.",
    position: [-200, 0.05, 692],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 0,
  },
  {
    titre: 'Le trait devient un ravin',
    verifier:
      "À quarante-cinq centimètres, la fente est un lieu : un sol, des parois, une " +
      'ombre. Au fond, une perle et une feuille. Une rampe en gradins pour ressortir.',
    position: [-200, -1.1, 701.5],
    echelle: -1,
    lacet: Math.PI * 0.5,
    pigments: [],
    jalon: 1,
  },
  {
    titre: 'Le chevalet, et la porte qui se dessine',
    verifier:
      'On pose la feuille, le Pinceau vient et trace la porte tache par tache. ' +
      'Reprendre la feuille doit RESCELLER la porte et effacer son dessin.',
    position: [-205, 0.05, 694],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 3,
  },
  {
    titre: 'Le conduit — quarante mètres de vide',
    verifier:
      "Sauter, rater, recommencer. À ×1/4 on manque de portée ; à ×4 on ne rentre " +
      "pas ; à ×1 il faut prendre son élan. Rater doit coûter dix secondes, pas une partie.",
    position: [186, 0.4, 1000],
    echelle: 0,
    lacet: Math.PI * 0.5,
    pigments: [],
    jalon: 4,
  },
  {
    titre: 'Le fond du puits, vu d’en dessous',
    verifier:
      "Le plus beau plan du mouvement, et il est réservé à qui s'est trompé : " +
      'quarante mètres de paroi et un rond de ciel. Puis une remontée sous dix secondes.',
    position: [200, -41.5, 1000],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 5,
  },
  {
    titre: 'Les trois creux',
    verifier:
      'Trois perles identiques, trois creux de tailles différentes. Une reste, une ' +
      "monte d'une porte, une de deux. Rien à deviner : à compter.",
    position: [200, 0.4, 682],
    echelle: 1,
    lacet: 0,
    pigments: [],
    jalon: 8,
  },
  {
    titre: 'L’atelier de lavis — le tableau',
    verifier:
      "Le cadre montre la pièce avec les claies EN ROUGE. On s'approche d'une claie, " +
      'on appuie : elles se peignent une par une. Le mur, lui, refuse — il est trop grand.',
    position: [-1.9, 0.12, 1298.65],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 12,
  },
  {
    titre: 'Le bol — la même pièce, vue d’ailleurs',
    verifier:
      "Les deux faces d'une même porte, dans une seule pièce. On traverse, on se " +
      "retourne : c'est le même endroit et l'on est quatre fois plus petit. L'étagère " +
      'est un viaduc, le bol une citerne.',
    position: [-340.6, 0.03, 1237],
    echelle: 0,
    lacet: 0,
    pigments: [],
    jalon: 17,
  },
  {
    titre: 'Le fond — le pinceau bleu',
    verifier:
      "Une grève sous une pluie qui a cessé. Le bleu dort dans une vasque, et " +
      "n'accepte que ×1/4. E le réveille ; à toute autre taille il frémit et refuse.",
    position: [-267.5, 0.2, 1335],
    echelle: -1,
    lacet: 0,
    pigments: [],
    jalon: 19,
  },
  {
    titre: 'La cour de pluie — le détour',
    verifier:
      "Rien à résoudre, une seule sortie. De grosses gouttes s'écrasent et laissent " +
      "un anneau d'encre qui sèche. À cette taille, tout ce qui tombe tombe vite.",
    position: [-212.5, 0.03, 1000],
    echelle: -1,
    lacet: Math.PI * 0.5,
    pigments: [],
    jalon: 24,
  },
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA MONTÉE — et ses positions ne sont pas écrites ici.
 *
 * Les repères de la descente portent des coordonnées à la main, et ça se paie :
 * quand un auteur déplace un mur, son repère continue de viser l'ancien
 * endroit, et l'on se retrouve à vérifier une salle depuis l'intérieur d'un
 * rocher sans comprendre pourquoi. C'est arrivé au pinceau vert, qui avait
 * changé de place dans une table et pas dans l'autre.
 *
 * Ici, chaque repère demande sa position à la SALLE elle-même. Une salle qui
 * bouge emmène son repère avec elle, et la question ne se pose plus jamais.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const auSeuil = (
  salle: (typeof SALLES_MONTEE)[number],
  titre: string,
  verifier: string,
  jalon: number,
  lacet = 0,
): Repere => ({
  titre,
  verifier,
  position: [
    salle.entree.position[0],
    salle.entree.position[1] + 0.05,
    salle.entree.position[2],
  ],
  echelle: salle.entree.echelle,
  lacet,
  pigments: ['rouge', 'vert', 'bleu'],
  jalon,
});

export const REPERES_MONTEE: Repere[] = [
  auSeuil(
    SALLES_MONTEE[0],
    'Les toits — on connaît cet endroit',
    'Le village vu d’en haut, à ×4. La maison dont le toit culminait à 3,40 et ' +
      'qu’on ne pouvait pas atteindre est une MARCHE : on monte dessus sans y penser. ' +
      'Défaut à guetter : ne pas reconnaître le village. Si ça arrive, la salle est ratée.',
    0,
  ),
  auSeuil(
    SALLES_MONTEE[1],
    'Le creux qui refuse — la vrille',
    'Une vrille au sol, un creux à sa forme dans la cour. Présente-la : elle refuse, ' +
      'et l’on croit que c’est la taille. Porte-la par la porte du fond, ressors quatre ' +
      'fois plus grand, elle entre. Elle a changé de MAIN aussi, et rien ne le dit.',
    5,
  ),
  auSeuil(
    SALLES_MONTEE[2],
    'Le blanchiment — le théorème',
    'Le creux veut la taille d’origine ET l’autre main. La navette au miroir ne peut ' +
      'PAS marcher : un nombre impair de passages ne fait jamais une taille nulle. ' +
      'Il faut trouver la seconde porte, ordinaire, derrière le mur de refend — et ' +
      'on ne la voit qu’en étant grand. Défaut à guetter : ne jamais la trouver.',
    10,
  ),
  auSeuil(
    SALLES_MONTEE[3],
    'L’escalier pour plus tard',
    'On est ×4 en haut d’une falaise de 3,60. Quatre cubes de 0,80 traînent là : ' +
      'dispose-les EN ESCALIER pour quelqu’un d’1,80, marches à moins d’un mètre ' +
      'l’une de l’autre. Puis rapetisse et descends. L’erreur est automatique : ' +
      'on les espace à son œil de géant, et l’on découvre quatre îlots.',
    15,
  ),
  auSeuil(
    SALLES_MONTEE[4],
    'L’atelier du haut — la couleur, paliers 2 et 3',
    'Deux familles, deux couleurs, deux tailles : il faut descendre peindre les pots ' +
      'et remonter peindre les tuiles. Puis le point de vue : un tabouret quelque part, ' +
      'et depuis lui seulement la composition du tableau se referme.',
    20,
  ),
  auSeuil(
    SALLES_MONTEE[5],
    'La vallée en maquette — et l’or au bout',
    'La côte rouge entière SOUS LES SEMELLES, traversée en huit enjambées. Le dernier ' +
      'four, qui donnait le cap pendant deux cents mètres, arrive à mi-mollet. À ' +
      'mi-chemin, une grue de papier passe une fois et ne revient pas. Au bout, l’or.',
    25,
  ),
];
