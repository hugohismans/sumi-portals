import {
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PORTAL_SMALL_H,
  PORTAL_SMALL_W,
  SCALE_RATIO,
} from './constants.js';
import {
  REFLEXION_X,
  eulerVersMat,
  matLacet,
  matVersEuler,
  mulMat,
  rotateY,
  sub,
  transposer,
  vec3,
  wrapAngle,
  yawToForward,
  type Mat3,
  type Vec3,
} from './math.js';
import { REPERES, estDebout, hautDe, vecteurHaut, type Haut } from './pesanteur.js';
import type { PortalFaceDef, PortalPairDef } from './types.js';

export type FaceKind = 'big' | 'small';

export interface PortalFace {
  pairId: string;
  kind: FaceKind;
  /** Centre du bas de la face, dans le monde. */
  position: Vec3;
  yaw: number;
  /** Normale (côté « avant » de la face). */
  normal: Vec3;
  /** Largeur dans le monde, en mètres. Constante. */
  width: number;
  /** Hauteur dans le monde, en mètres. Constante. */
  height: number;
  /** L'autre face de la paire. */
  twin: PortalFace;
  /**
   * Les logements qui descellent cette paire. Tant qu'UN SEUL reste vide, on ne
   * passe pas. Absent : la porte est toujours ouverte.
   *
   * Toujours une liste ici, même quand la donnée n'en déclare qu'un : le reste
   * du moteur n'a plus qu'un cas à traiter, et c'est la seule façon de rendre
   * une généralisation gratuite au lieu de la semer partout.
   */
  condition?: string[];
  /** Elle doit être dessinée avant de s'ouvrir. Voir PortalPairDef.dessinee. */
  dessinee?: boolean;
  /** Cette paire échange la gauche et la droite. Voir `mainDe`. */
  miroir?: boolean;
  /** Les deux faces ont la même taille : rien ne change en passant. Voir `PortalPairDef.plane`. */
  plane?: boolean;
  /**
   * DEBOUT : le haut de la face est +y. Toutes les faces d'avant le sont, et
   * elles gardent leurs formules d'origine — lacet, sinus, cosinus — au bit
   * près. Les autres ont un repère exact sur les axes : voir `PortalFaceDef.haut`.
   */
  droite: boolean;
  /** Le haut de la face (du bord bas vers le linteau), dans le monde. */
  haut: Vec3;
  /** Sa droite vue de devant : haut × normale. Avec `haut` et `normal`, son repère. */
  lateral: Vec3;
}

const makeFace = (
  pairId: string,
  kind: FaceKind,
  def: PortalFaceDef,
  smallW: number,
  smallH: number,
  plane: boolean,
): Omit<PortalFace, 'twin'> => {
  const commun = {
    pairId,
    kind,
    position: vec3(def.position[0], def.position[1], def.position[2]),
    width: kind === 'big' && !plane ? smallW * SCALE_RATIO : smallW,
    height: kind === 'big' && !plane ? smallH * SCALE_RATIO : smallH,
    plane,
  };
  if (estDebout(def.haut) && def.normale === undefined) {
    return {
      ...commun,
      yaw: def.yaw,
      normal: yawToForward(def.yaw),
      droite: true,
      haut: vec3(0, 1, 0),
      lateral: vec3(Math.cos(def.yaw), 0, -Math.sin(def.yaw)),
    };
  }
  // UNE FACE QUI N'EST PAS DEBOUT a un repère EXACT, sur les axes : une
  // pesanteur qui la traverse doit ressortir sur un axe, au bit près.
  const nom = `${pairId}.${kind}`;
  let n: Vec3;
  if (def.normale !== undefined) n = vecteurHaut(def.normale);
  else {
    const h = hautDe(yawToForward(def.yaw), 1e-9);
    if (h === null) throw new Error(`porte ${nom} : une face qui n'est pas debout veut un lacet multiple d'un quart de tour, ou une normale`);
    n = vecteurHaut(h);
  }
  const v = vecteurHaut(def.haut ?? '+y');
  if (n.x * v.x + n.y * v.y + n.z * v.z !== 0) throw new Error(`porte ${nom} : son haut doit être perpendiculaire à sa normale`);
  const u = vec3(v.y * n.z - v.z * n.y, v.z * n.x - v.x * n.z, v.x * n.y - v.y * n.x);
  return { ...commun, yaw: n.y === 0 ? Math.atan2(n.x, n.z) : 0, normal: n, droite: false, haut: v, lateral: u };
};

/**
 * UN ÉCART, LU DANS LE REPÈRE DE LA FACE : (droite, haut, profondeur).
 *
 * Pour une face debout, exactement l'ancien `rotateY(d, -yaw)` ; pour les
 * autres, trois produits scalaires avec des axes du monde — exacts.
 */
export const versFace = (face: PortalFace, d: Vec3): Vec3 => {
  if (face.droite) return rotateY(d, -face.yaw);
  const u = face.lateral;
  const v = face.haut;
  const n = face.normal;
  return vec3(
    d.x * u.x + d.y * u.y + d.z * u.z,
    d.x * v.x + d.y * v.y + d.z * v.z,
    d.x * n.x + d.y * n.y + d.z * n.z,
  );
};

/** L'inverse de `versFace` : un vecteur du repère de la face, remis dans le monde. */
export const depuisFace = (face: PortalFace, l: Vec3): Vec3 => {
  if (face.droite) return rotateY(l, face.yaw);
  const u = face.lateral;
  const v = face.haut;
  const n = face.normal;
  return vec3(u.x * l.x + v.x * l.y + n.x * l.z, u.y * l.x + v.y * l.y + n.y * l.z, u.z * l.x + v.z * l.y + n.z * l.z);
};

/** Le repère de la face en matrice, colonnes (droite, haut, normale). */
export const repereFace = (face: PortalFace): Mat3 =>
  face.droite
    ? matLacet(face.yaw)
    : [
        face.lateral.x, face.haut.x, face.normal.x,
        face.lateral.y, face.haut.y, face.normal.y,
        face.lateral.z, face.haut.z, face.normal.z,
      ];

/**
 * Une paire scellée est fermée DES DEUX CÔTÉS.
 *
 * C'est ce qui la rend utilisable en coopération sans piéger personne : si
 * seule l'entrée était scellée, on pourrait passer, voir le logement se vider
 * derrière soi, et rester enfermé de l'autre côté.
 */
export const estScelle = (face: PortalFace, logementsPourvus: ReadonlySet<string>): boolean =>
  face.condition !== undefined && !face.condition.every((c) => logementsPourvus.has(c));

/**
 * Les verrous d'une paire, toujours sous forme de liste.
 *
 * `condition` s'écrit indifféremment `'creux-a'` ou `['creux-a', 'creux-b']` —
 * un seul verrou est le cas de loin le plus fréquent et ne doit pas coûter des
 * crochets. La normalisation se fait ICI, une fois, et le reste du moteur
 * n'a plus qu'un cas.
 *
 * La boîte à formes l'a rendue nécessaire : sa porte de sortie doit attendre
 * SES CINQ creux. Son autrice l'a signalé — avec un verrou unique, un joueur
 * qui remplit le bon en premier sort en laissant quatre trous béants, et le
 * niveau se termine sans avoir été joué.
 */
export const conditionsDe = (pair: PortalPairDef): string[] | undefined => {
  if (pair.condition === undefined) return undefined;
  return typeof pair.condition === 'string' ? [pair.condition] : pair.condition;
};

export const buildFaces = (pairs: PortalPairDef[]): PortalFace[] => {
  const faces: PortalFace[] = [];
  for (const pair of pairs) {
    // Taille propre à la paire, sinon celle d'origine. C'est ce qui autorise
    // une spirale : une porte par étage, taillée pour qui l'atteint.
    const w = pair.smallWidth ?? PORTAL_SMALL_W;
    const h = pair.smallHeight ?? PORTAL_SMALL_H;
    const plane = pair.plane === true;
    const big = makeFace(pair.id, 'big', pair.big, w, h, plane) as PortalFace;
    const small = makeFace(pair.id, 'small', pair.small, w, h, plane) as PortalFace;
    big.twin = small;
    small.twin = big;
    const verrous = conditionsDe(pair);
    big.condition = verrous;
    small.condition = verrous;
    big.dessinee = pair.dessinee;
    small.dessinee = pair.dessinee;
    big.miroir = pair.miroir;
    small.miroir = pair.miroir;
    faces.push(big, small);
  }
  return faces;
};

/**
 * Facteur d'échelle appliqué en traversant `face`.
 *
 *   grande face → on ressort par la petite → on rétrécit → 1/4
 *   petite face → on ressort par la grande → on grandit  → 4
 *
 * C'est exactement le rapport des largeurs des deux faces, ce qui garantit que
 * ce qu'on VOIT à travers le portail et ce qui nous ARRIVE en le traversant
 * sont gouvernés par la même constante. Une seule source de vérité.
 */
export const traversalScale = (face: PortalFace): number =>
  face.plane ? 1 : face.kind === 'big' ? 1 / SCALE_RATIO : SCALE_RATIO;

/**
 * Variation de palier d'échelle : -1 par la grande face, +1 par la petite.
 * Zéro par une face plane — c'est même sa définition.
 */
export const traversalLevelDelta = (face: PortalFace): number =>
  face.plane ? 0 : face.kind === 'big' ? -1 : +1;

/**
 * Taille de la face dans le monde. Elle ne dépend PAS du joueur : un portail
 * est un monument posé au sol, il garde le même rapport au décor qui l'entoure.
 * C'est le joueur qui rapetisse ou grandit par rapport à lui.
 */
export const faceWorldSize = (face: PortalFace): { width: number; height: number } => ({
  width: face.width,
  height: face.height,
});

/**
 * Le joueur tient-il dans cette face ?
 *
 * C'est cette règle, et elle seule, qui borne la montée en taille : à ×4 on ne
 * rentre plus dans la petite porte, donc on ne peut plus grandir. Aucun palier
 * arbitraire à expliquer — ça se voit.
 */
export const canPass = (face: PortalFace, playerScale: number, haut?: Haut): boolean => {
  if (face.droite && estDebout(haut)) {
    return PLAYER_HEIGHT * playerScale <= face.height * 0.96 &&
      PLAYER_RADIUS * 2 * playerScale <= face.width * 0.9;
  }
  // EN REPÈRE : l'emprise du corps sur chacun des deux axes de la face — sa
  // taille sur celui qui longe son haut, sa largeur sur l'autre. Qui tombe
  // dans une trappe y présente sa largeur deux fois.
  const h = vecteurHaut(haut ?? '+y');
  const emprise = (a: Vec3): number =>
    Math.abs(a.x * h.x + a.y * h.y + a.z * h.z) > 0.5 ? PLAYER_HEIGHT * playerScale : PLAYER_RADIUS * 2 * playerScale;
  return emprise(face.haut) <= face.height * 0.96 && emprise(face.lateral) <= face.width * 0.9;
};

/** Distance signée d'un point au plan de la face (positive = devant). */
export const signedDistance = (face: PortalFace, p: Vec3): number => {
  const d = sub(p, face.position);
  return d.x * face.normal.x + d.y * face.normal.y + d.z * face.normal.z;
};

/**
 * Le point d'intersection tombe-t-il dans le rectangle de la face ?
 * `t` est le paramètre d'interpolation entre `from` et `to` au moment du
 * franchissement du plan.
 */
export const withinFaceRect = (face: PortalFace, from: Vec3, to: Vec3, t: number, hauteurs = 1): boolean => {
  const hit = vec3(
    from.x + (to.x - from.x) * t,
    from.y + (to.y - from.y) * t,
    from.z + (to.z - from.z) * t,
  );
  const local = versFace(face, sub(hit, face.position));
  // Un chouïa de marge : mieux vaut téléporter que laisser passer au travers.
  // `hauteurs` élargit le rectangle vers le haut — pour savoir si l'on passe
  // AU-DESSUS d'une porte, et le dire, sans jamais la franchir.
  return (
    Math.abs(local.x) <= face.width * 0.5 + 0.02 &&
    local.y >= -0.05 &&
    local.y <= face.height * hauteurs
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA FACE PAR LAQUELLE UNE PIÈCE PASSE, À L'IMAGE — celle où le rendu la
 * tranche et dresse son double. `null` : elle se dessine entière, où elle est.
 *
 * PORTÉE, elle franchit le plan AVANT son porteur et peut s'y trouver entière
 * de l'autre côté : on la double largement — mais seulement si le porteur est
 * DEVANT la face ; derrière, elle est derrière avec lui.
 *
 * LIBRE, elle passe la porte à l'image même où son centre franchit le plan
 * dans le cadre (`Simulation.carryTraversal`). Une pièce libre dont le centre
 * est derrière une face, ou hors de son cadre, n'est donc JAMAIS en train de
 * passer : elle est passée à côté du montant, a buté contre le dos, ou y a été
 * posée.
 *
 * Le rendu en décidait seul, avec la règle des pièces portées appliquée à
 * toutes, et un rayon au lieu du cadre. Signalé en jouant, dans la montée :
 * « un objet passé par un portail est devenu imprenable, il n'a même plus son
 * petit cercle ». La vrille, lancée à côté du montant de la grande face,
 * reposait derrière elle, à trente-cinq mètres : le rendu l'effaçait et
 * dessinait son double devant la petite face bleue, où rien ne se ramassait —
 * le cerne, lui, entourait un vide là-bas. La règle vit donc ici, sans
 * Three.js, où le harnais la vérifie.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const faceDuDouble = (
  faces: readonly PortalFace[],
  c: { position: Vec3; size: number; held: boolean },
  oeil: Vec3 | null = null,
): PortalFace | null => {
  const centre = vec3(c.position.x, c.position.y + c.size * 0.5, c.position.z);
  // Un peu large : mieux vaut doubler trop tôt.
  const half = c.size * 0.72;
  for (const face of faces) {
    const d = signedDistance(face, centre);
    // Devant : rien à dédoubler.
    if (d > half) continue;
    if (c.held) {
      // Portée : entièrement passée devant son porteur, elle reste vue à
      // travers le portail — jusqu'à trois tailles derrière le plan.
      if (d < -(half + c.size * 3)) continue;
      if (oeil && signedDistance(face, oeil) < 0) continue;
      const local = versFace(face, sub(centre, face.position));
      if (Math.abs(local.x) > face.width * 0.5 + c.size || local.y < -c.size || local.y > face.height + c.size) continue;
    } else if (d < 0 || !withinFaceRect(face, centre, centre, 0)) {
      continue;
    }
    return face;
  }
  return null;
};

/**
 * Transporte un POINT à travers `face` vers sa jumelle.
 *
 * On exprime le point dans le repère de la face, on le retourne de 180° autour
 * de Y, on multiplie son écart par le rapport d'échelle, puis on le replace
 * dans le repère de la face jumelle.
 */
export const transformPoint = (face: PortalFace, p: Vec3): Vec3 => {
  const s = traversalScale(face);
  const local = versFace(face, sub(p, face.position));
  const flipped = vec3(mainDe(face) * local.x * s, local.y * s, -local.z * s);
  const world = depuisFace(face.twin, flipped);
  return vec3(
    face.twin.position.x + world.x,
    face.twin.position.y + world.y,
    face.twin.position.z + world.z,
  );
};

/**
 * Transporte un VECTEUR (vitesse, direction) à travers `face`.
 * Même rotation que pour un point, mais sans translation. L'échelle s'applique
 * parce que la vitesse est proportionnelle à la taille du joueur.
 */
export const transformVector = (face: PortalFace, v: Vec3, applyScale: boolean): Vec3 => {
  const s = applyScale ? traversalScale(face) : 1;
  const local = versFace(face, v);
  const flipped = vec3(mainDe(face) * local.x * s, local.y * s, -local.z * s);
  return depuisFace(face.twin, flipped);
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA PESANTEUR PASSE LA PORTE COMME UNE VITESSE.
 *
 * On la transporte comme n'importe quelle direction, et l'on relit l'axe. Par
 * une porte debout vers une porte debout, la rotation est autour de la
 * verticale : le haut reste '+y', et c'est tout l'existant. Par une porte
 * debout vers une porte couchée contre un mur, le haut devient horizontal —
 * le mur est le sol.
 *
 * `null` si le résultat ne tombe pas sur un axe : un joueur couché sur un mur
 * qui franchit une porte debout plantée de biais. La porte refuse alors
 * (`'pesanteur'`) — toutes les portes du jeu sont plantées au quart de tour,
 * et ce refus n'arrive dans aucun niveau.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const hautApres = (face: PortalFace, h: Haut | undefined): Haut | null =>
  hautDe(transformVector(face, vecteurHaut(h ?? '+y'), false));

/** La rotation — ou la réflexion — subie en traversant : F_jumelle · D · F_faceᵀ. */
export const rotationDeTraversee = (face: PortalFace): Mat3 => {
  const D: Mat3 = [mainDe(face), 0, 0, 0, 1, 0, 0, 0, -1];
  return mulMat(repereFace(face.twin), mulMat(D, transposer(repereFace(face))));
};

/** Le repère d'un haut, en matrice : ses colonnes sont les axes locaux, dans le monde. */
export const matriceDuHaut = (h: Haut | undefined): Mat3 => {
  const r = REPERES[h ?? '+y'];
  const m: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const ligne = { x: 0, y: 3, z: 6 } as const;
  for (let i = 0; i < 3; i++) m[ligne[r.axes[i]] + i] = r.signes[i];
  return m;
};

/**
 * LA CHIRALITÉ, en un seul signe.
 *
 * Une porte ordinaire retourne le repère de 180° autour de la verticale : la
 * composante latérale change de signe en même temps que la profondeur. Une
 * porte MIROIR ne retourne que la profondeur, et laisse la latérale telle
 * quelle — ce qui échange la gauche et la droite.
 *
 * Mathématiquement, la différence est celle d'un déterminant : +1 pour la
 * rotation, −1 pour la réflexion. Une transformation de déterminant négatif ne
 * peut PAS être obtenue en tournant l'objet, quelque nombre de fois qu'on
 * l'essaie. C'est exactement ce qu'on veut faire éprouver au joueur avec la
 * molécule : sa main gauche ne deviendra jamais une main droite, il faut la
 * faire passer par le miroir.
 *
 * Conséquence à ne pas oublier côté rendu : un déterminant négatif inverse
 * aussi le sens de parcours des triangles.
 */
export const mainDe = (face: PortalFace): 1 | -1 => (face.miroir ? 1 : -1);

/**
 * Rotation de lacet subie en traversant `face`.
 *
 * Ne vaut que pour une porte ordinaire. Une réflexion n'est pas une rotation :
 * il n'existe aucun angle qui la décrive, et c'est pourquoi la simulation
 * déduit le nouveau cap du vecteur transformé plutôt que de l'additionner.
 */
export const yawDelta = (face: PortalFace): number =>
  wrapAngle(face.twin.yaw + Math.PI - face.yaw);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE DEVIENT L'ORIENTATION D'UN OBJET QUI PASSE UNE PORTE.
 *
 * Par une porte ordinaire, l'objet tourne comme son porteur : on ajoute
 * `yawDelta` à son lacet.
 *
 * Par un miroir, ce n'est ni l'un ni l'autre. Un objet chiral est dessiné à
 * partir de sa forme de référence, reflétée sur SON axe x quand sa main est
 * droite (voir `carryableGeometry`). Le miroir, lui, réfléchit le monde sur
 * le plan de la porte, puis le pose dans le repère de la jumelle. Écrit en
 * matrices, avec D la réflexion sur x et Ry une rotation autour de la
 * verticale :
 *
 *     Ry(jumelle) · diag(1, 1, −1) · Ry(−face) · Ry(θ) · forme
 *   = Ry(π + jumelle + face − θ) · D · forme
 *
 * La main bascule (c'est le D), ET le lacet devient π + jumelle + face − θ :
 * il change de SENS, il ne s'additionne pas. Une première version ajoutait
 * un complément à θ ; elle ne tombait juste que pour θ = 0 ou π — c'est-à-
 * dire dans tous les essais, et faux dès qu'on tourne la pièce. Le roulis
 * autour de z change de signe pour la même raison ; le tangage autour de x,
 * que la réflexion sur x laisse en paix, reste tel quel.
 *
 * Signalé en jouant : « quand je traverse un portail miroir avec un objet,
 * celui-ci change d'orientation ; il devrait être identique, c'est le monde
 * lui-même qui est en miroir. » C'est exactement ce que dit l'égalité : vu
 * par la caméra réfléchie, l'objet transporté est l'objet d'avant.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const transporterRotation = (face: PortalFace, r: Vec3): Vec3 => {
  // EN MATRICES, parce que la pièce peut maintenant être tournée dans tous
  // les sens (voir `Simulation.tournerLaPiece`) : ajouter un lacet à des
  // angles d'Euler n'est juste que tant que la pièce n'est pas basculée. La
  // porte ordinaire tourne tout autour de la verticale : Ry(δ)·R. Le miroir
  // retourne la main et le lacet : Ry(π + jumelle + face)·D·R·D.
  const R = eulerVersMat(r);
  // Une face qui n'est pas debout : la rotation complète de la porte, et la
  // réflexion de la main par le miroir, s'il y en a un (voir plus haut).
  if (!face.droite || !face.twin.droite) {
    const M = rotationDeTraversee(face);
    return matVersEuler(face.miroir ? mulMat(mulMat(M, R), REFLEXION_X) : mulMat(M, R));
  }
  if (!face.miroir) return matVersEuler(mulMat(matLacet(yawDelta(face)), R));
  const phi = Math.PI + face.twin.yaw + face.yaw;
  return matVersEuler(mulMat(matLacet(phi), mulMat(REFLEXION_X, mulMat(R, REFLEXION_X))));
};
