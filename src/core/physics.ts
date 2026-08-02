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
  /**
   * Hauteur au-dessus de laquelle une DESCENTE refuse de reposer le corps —
   * voir la longue note de `moveAndCollide`. N'a de sens que pour un `amount`
   * négatif sur l'axe y, et seulement s'il existe par ailleurs de quoi
   * s'appuyer plus bas : sans ça, on refuserait le seul secours disponible.
   */
  plafond?: number,
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
    // ─── DEUX CANDIDATS, ET L'ON PRÉFÈRE LE PLUS BAS QUI SUFFISE ────────────
    //
    // `haut` est l'ancienne réponse : la plus extrême, celle qui garantit de ne
    // plus rien chevaucher. `bas` ne retient que les appuis situés SOUS le
    // plafond, c'est-à-dire ceux qui ne remontent pas le corps.
    //
    // On prend `bas` dès qu'il existe. Le corps peut alors rester en
    // chevauchement avec ce qui est au-dessus — mais il l'était DÉJÀ avant de
    // tomber, et une chute n'a jamais eu pour métier de réparer ça.
    //
    // Et l'on retombe sur `haut` quand `bas` n'existe pas : quelqu'un déposé
    // dans la roche par une porte n'a que cette sortie-là, et la lui retirer,
    // c'est le faire tomber jusqu'à moins deux cent mille. Mesuré, cette
    // nuit-là comme les précédentes.
    let haut = resolved;
    let bas = -Infinity;
    for (const h of hits) {
      const r = h[maxKey] + negExtent;
      haut = Math.max(haut, r);
      if (plafond !== undefined && r <= plafond + 1e-6) bas = Math.max(bas, r);
    }
    resolved = bas > -Infinity ? Math.max(resolved, bas) : haut;
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
  //
  // ─── UNE CHUTE NE PEUT PAS FAIRE MONTER, ET C'EST LA CATAPULTE DU LINTEAU ──
  //
  // Le défaut le plus grave du moteur, reproductible, documenté dans
  // `MESURES.md`, et resté ouvert cinq tentatives durant.
  //
  // Un joueur de 1,80 arrêté au ras d'une porte basse TOUCHE son linteau : la
  // résolution latérale le pose exactement au bord de ce qu'il heurte, et le
  // dernier bit de la virgule flottante décide de quel côté. Quand il tombe du
  // mauvais côté, la tête est DANS le linteau. La gravité de l'image suivante
  // résout alors sur le DESSUS de tout ce qu'elle pénètre — juste pour un sol,
  // catastrophique ici — et le corps passait de 0 à 1,70 en une image, puis
  // marchait sur le linteau et par-dessus le mur. **On franchissait n'importe
  // quel mur en le longeant**, du moment qu'il portait un linteau.
  //
  // Les cinq corrections essayées cherchaient toutes à écarter les mauvaises
  // boîtes — par leur hauteur, ou en donnant du jeu au corps. Trois retiraient
  // le rattrapage des chutes (mesuré : y = −208 221) ; deux ouvraient un
  // passage entre les montants d'une balustrade. Tout ce coin du moteur est en
  // équilibre sur le contact EXACT, et le moindre jeu ouvre un trou ailleurs.
  //
  // LA BONNE FORMULATION NE PARLE PAS DE BOÎTES DU TOUT :
  //
  //     une descente PRÉFÈRE l'appui le plus bas qui ne remonte pas le corps,
  //     et ne remonte le corps que si aucun appui ne le tient.
  //
  // La première moitié est vraie sans exception : tomber ne rend jamais plus
  // haut que d'où l'on part, donc une résolution qui REMONTE ne peut venir que
  // d'une boîte qu'on pénétrait déjà — un corps étranger, pas un sol. Sous le
  // linteau, le sol est là, à zéro, et il suffit ; on le prend, la tête reste
  // dans le linteau d'un milliardième de millimètre, et personne ne le saura
  // jamais.
  //
  // ET LA SECONDE MOITIÉ EST CE QUI A MANQUÉ À TOUTES LES TENTATIVES, LA
  // MIENNE COMPRISE. Écrite sans elle, la règle a d'abord semblé parfaite : le
  // linteau tombait, les deux vérifications passaient. Puis trois traversées de
  // portail se sont mises à échouer, dont une **à y = −208 221** — exactement
  // le nombre des nuits précédentes, ce qui aurait dû me mettre la puce à
  // l'oreille plus tôt.
  //
  // La cause : une porte dépose parfois le corps LÉGÈREMENT DANS le sol
  // d'arrivée. L'éjection vers le haut, qu'on venait d'interdire, était sa
  // seule issue. Un joueur qui n'a rien sous les pieds doit pouvoir remonter —
  // même par le dessus de ce qui le contient, même si c'est laid.
  //
  // D'où la règle sous sa forme complète : on cherche d'abord un appui qui ne
  // remonte pas ; à défaut seulement, on reprend l'ancienne réponse.
  //
  // Deux tentatives portaient déjà la première moitié de cette phrase, aux deux
  // mauvais endroits — le repli de la marche et l'accroche au sol. Les notes de
  // l'époque disaient pourtant noir sur blanc : « le saut ne vient pas de
  // l'accroche mais de la gravité elle-même ». C'est ici, et nulle part
  // ailleurs.
  const departY = p.y;
  const dy = velocity.y * dt;
  if (moveAxis(world, p, scale, 'y', dy, dy < 0 ? departY : undefined)) {
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
