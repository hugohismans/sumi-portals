import { PLAYER_HEIGHT, PLAYER_RADIUS, STEP_FRACTION } from './constants.js';
import type { Vec3 } from './math.js';
import type { Aabb, World } from './world.js';

/** Boîte de collision du joueur. `p` est la position des PIEDS. */
export const playerAabb = (p: Vec3, scale: number, out: Aabb): Aabb => {
  const half = PLAYER_RADIUS * scale;
  const height = PLAYER_HEIGHT * scale;
  out.minX = p.x - half;
  out.maxX = p.x + half;
  out.minY = p.y;
  out.maxY = p.y + height;
  out.minZ = p.z - half;
  out.maxZ = p.z + half;
  return out;
};

const scratchBox: Aabb = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
const scratchHits: Aabb[] = [];

/** Le joueur tient-il à cette position sans chevaucher un solide ? */
export const isClear = (world: World, p: Vec3, scale: number): boolean => {
  playerAabb(p, scale, scratchBox);
  return world.query(scratchBox, scratchHits).length === 0;
};

type Axis = 'x' | 'y' | 'z';

/**
 * Déplace le joueur sur un seul axe puis le ressort de tout solide pénétré.
 * Résoudre axe par axe est moins exact qu'un balayage continu, mais c'est
 * stable, déterministe, et parfaitement adapté à un monde fait de boîtes.
 */
const moveAxis = (
  world: World,
  p: Vec3,
  scale: number,
  axis: Axis,
  amount: number,
): boolean => {
  if (amount === 0) return false;
  p[axis] += amount;

  const half = PLAYER_RADIUS * scale;
  const height = PLAYER_HEIGHT * scale;
  // Débord de la boîte de part et d'autre de la position, sur cet axe.
  const posExtent = axis === 'y' ? height : half;
  const negExtent = axis === 'y' ? 0 : half;

  playerAabb(p, scale, scratchBox);
  const hits = world.query(scratchBox, scratchHits);
  if (hits.length === 0) return false;

  const minKey = axis === 'x' ? 'minX' : axis === 'y' ? 'minY' : 'minZ';
  const maxKey = axis === 'x' ? 'maxX' : axis === 'y' ? 'maxY' : 'maxZ';

  // ─── ON NE SE POSE QUE SUR CE QU'ON AVAIT SOUS LES PIEDS ─────────────────
  //
  // En descendant, on résolvait sur le DESSUS de toute boîte pénétrée. C'est
  // juste pour un sol : on tombe dessus, on s'y pose. C'est catastrophique pour
  // un linteau.
  //
  // Un joueur de 1,80 debout au ras d'une porte basse pénètre son linteau — sa
  // tête est dedans. L'accroche au sol résolvait alors sur le dessus du
  // linteau, et le joueur était CATAPULTÉ par-dessus la porte : mesuré, il
  // passait de 0 à 1,70 en une image, puis marchait tranquillement sur le
  // linteau et par-dessus le mur.
  //
  // C'est l'autre moitié du même défaut que la marche sondée trop haut, et
  // c'est la pire des deux : la première refusait un passage qui aurait dû
  // s'ouvrir, celle-ci ouvre un passage qui aurait dû être fermé — au-dessus
  // du décor, là où aucune salle n'est dessinée.
  //
  // On ne retient donc, pour une descente, que les boîtes dont le dessus était
  // DÉJÀ sous les pieds avant le mouvement. Les autres, on ne les touche pas :
  // on annule simplement la descente, et le corps reste où il était.
  // On prend la résolution la plus extrême : gère plusieurs boîtes en une passe.
  let resolved = p[axis];
  if (amount > 0) {
    for (const h of hits) resolved = Math.min(resolved, h[minKey] - posExtent);
  } else {
    for (const h of hits) resolved = Math.max(resolved, h[maxKey] + negExtent);
  }
  p[axis] = resolved;
  return true;
};

export interface MoveResult {
  grounded: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
}

/**
 * Applique un déplacement complet avec gestion des marches.
 *
 * La hauteur de marche franchissable est proportionnelle à la taille du
 * joueur : un géant enjambe un immeuble, un nain bute sur un pavé. C'est le
 * cœur du level design — chaque obstacle devient un verrou d'échelle.
 */
/**
 * Les hauteurs qu'on essaie pour franchir une marche, en fraction de la marche
 * maximale, de la plus petite à la plus grande.
 *
 * L'ordre est tout : on retient la PREMIÈRE qui passe, donc la plus basse, donc
 * celle qui laisse le plus de place au-dessus de la tête.
 */
const ESSAIS_DE_MARCHE = [0.08, 0.25, 0.5, 1] as const;

export const moveAndCollide = (
  world: World,
  p: Vec3,
  velocity: Vec3,
  scale: number,
  dt: number,
  wasGrounded: boolean,
): MoveResult => {
  const result: MoveResult = { grounded: false, hitCeiling: false, hitWall: false };

  // --- Vertical ---
  const dy = velocity.y * dt;
  if (moveAxis(world, p, scale, 'y', dy)) {
    if (dy < 0) result.grounded = true;
    else result.hitCeiling = true;
    velocity.y = 0;
  }

  // --- Horizontal, avec tentative de marche ---
  const stepHeight = PLAYER_HEIGHT * STEP_FRACTION * scale;
  const dx = velocity.x * dt;
  const dz = velocity.z * dt;

  const beforeX = p.x;
  const beforeY = p.y;
  const beforeZ = p.z;

  const blockedX = moveAxis(world, p, scale, 'x', dx);
  const blockedZ = moveAxis(world, p, scale, 'z', dz);

  if ((blockedX || blockedZ) && (wasGrounded || result.grounded)) {
    // ─── ON SONDE À LA HAUTEUR DE L'OBSTACLE, PAS AU MAXIMUM ───────────────
    //
    // On ne relevait le joueur QUE d'une marche entière — 0,90 m à ×1, 3,60 m à
    // ×4 — et l'on exigeait que son corps soit libre à cette hauteur-là.
    //
    // Sous un linteau, la tête entrait dans le linteau : la marche était
    // refusée, alors que l'obstacle réel faisait six centimètres. Le joueur
    // butait sur un seuil qu'il aurait dû enjamber sans même le voir, et rien
    // au monde ne pouvait le lui expliquer. Ça a fermé les trois ouvertures
    // d'une toise dans le hall, avec des arrêts mesurés à 9 cm, 34 cm et
    // 1,36 m de l'ouverture selon la taille — et personne ne l'aurait trouvé
    // sans aller mesurer.
    //
    // On essaie donc plusieurs hauteurs, de la plus petite à la plus grande, et
    // l'on retient LA PREMIÈRE qui passe. Un seuil bas se franchit maintenant
    // sous un linteau bas, ce qui est la seule chose qu'on demandait.
    //
    // Quatre paliers et pas une recherche dichotomique : le gain de précision
    // serait invisible — les marches d'un décor de boîtes sont des nombres
    // ronds — et l'on paierait deux fois plus de tests de collision à chaque
    // pas de chaque joueur.
    for (const part of ESSAIS_DE_MARCHE) {
      const levee = stepHeight * part;
      const probe = { x: beforeX, y: beforeY + levee, z: beforeZ };
      if (!isClear(world, probe, scale)) continue;

      const stepBlockedX = moveAxis(world, probe, scale, 'x', dx);
      const stepBlockedZ = moveAxis(world, probe, scale, 'z', dz);
      const improved =
        (blockedX && !stepBlockedX) || (blockedZ && !stepBlockedZ);
      if (!improved) continue;

      // On repose le joueur sur la marche. Et REPOSER NE PEUT PAS FAIRE MONTER :
      // la descente se résout sur le dessus de ce qu'on pénètre, ce qui est
      // juste pour un sol et catastrophique pour un linteau. Le corps, avancé
      // sous une porte basse, avait la tête dans le linteau et se retrouvait
      // POSÉ DESSUS — mesuré : de 0 à 1,70 en une image, puis on marchait sur
      // le linteau et par-dessus le mur, là où aucune salle n'est dessinée.
      //
      // Si ce repli remonte, ce n'était pas une marche : on essaie la suivante.
      moveAxis(world, probe, scale, 'y', -levee);
      if (probe.y > beforeY + levee + 1e-6) continue;
      p.x = probe.x;
      p.y = probe.y;
      p.z = probe.z;
      result.grounded = true;
      result.hitWall = false;
      return result;
    }
  }

  if (blockedX) velocity.x = 0;
  if (blockedZ) velocity.z = 0;
  result.hitWall = blockedX || blockedZ;

  // --- Accroche au sol -------------------------------------------------------
  // Sans ça, descendre une marche fait décoller le joueur d'une frame et la
  // caméra sautille. On sonde vers le bas d'une demi-marche.
  if (!result.grounded && wasGrounded && velocity.y <= 0) {
    const snap = { x: p.x, y: p.y, z: p.z };
    // ─── S'ACCROCHER AU SOL NE PEUT PAS FAIRE MONTER ───────────────────────
    //
    // La résolution d'une descente pose le corps sur le DESSUS de ce qu'il
    // pénètre. Juste pour un sol ; catastrophique pour un linteau — un joueur
    // de 1,80 debout au ras d'une porte basse a la tête DANS le linteau, et
    // l'accroche le résolvait sur son dessus. Mesuré : il passait de 0 à 1,70
    // en une image, puis marchait sur le linteau et par-dessus le mur, là où
    // aucune salle n'est dessinée.
    //
    // On refuse donc simplement une accroche qui remonte. C'est la formulation
    // la plus étroite du correctif, et c'est ce qui compte ici : la première
    // version filtrait à l'intérieur de la résolution elle-même et retirait du
    // même coup le rattrapage des chutes — on tombait alors à l'infini dès
    // qu'un pas de temps traversait une dalle. Un correctif juste au mauvais
    // endroit est un correctif faux.
    if (moveAxis(world, snap, scale, 'y', -stepHeight * 0.5) && snap.y <= p.y + 1e-6) {
      p.y = snap.y;
      result.grounded = true;
      velocity.y = 0;
    }
  }

  return result;
};
