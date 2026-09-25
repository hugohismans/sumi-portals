import type { BoxDef } from './types.js';

/**
 * DEUX FACES CONFONDUES, LE DÉFAUT LE PLUS FRÉQUENT DU PROJET.
 *
 * Dans un monde fait de boîtes, deux surfaces exactement dans le même plan se
 * disputent la profondeur : la carte graphique n'a aucune raison de préférer
 * l'une à l'autre, et le résultat scintille dès qu'on bouge. Ça s'est produit
 * quatre fois — sur des bordures, sur des garde-corps, puis sur tout le haut
 * d'un escalier, où ça donnait une écharpe grésillante en travers de la
 * terrasse.
 *
 * La règle est écrite depuis longtemps dans le contrat des régions. La voici
 * enfin VÉRIFIÉE, parce qu'une règle qu'on rappelle dans un commentaire est une
 * règle qu'on oubliera une cinquième fois.
 *
 * LE FILTRE QUI REND LA VÉRIFICATION UTILISABLE : on ne signale que les faces
 * EXPOSÉES. Une face confondue mais noyée dans un autre solide ne se verra
 * jamais, et il y en a des dizaines — les dessous de dalles, les fondations qui
 * s'interpénètrent. Sans ce tri, l'outil criait 121 fois pour le monde et
 * n'aurait servi à rien. Avec, il désigne les vrais coupables.
 */

const EPS = 0.02;

const dedans = (b: BoxDef, p: readonly number[]): boolean =>
  p[0] > b.min[0] + 1e-4 &&
  p[0] < b.max[0] - 1e-4 &&
  p[1] > b.min[1] + 1e-4 &&
  p[1] < b.max[1] - 1e-4 &&
  p[2] > b.min[2] + 1e-4 &&
  p[2] < b.max[2] - 1e-4;

/**
 * Les faces coplanaires, exposées, et se chevauchant sur plus de `seuil` m².
 *
 * Le seuil existe parce qu'un recouvrement de quelques centimètres carrés ne se
 * remarque pas, et qu'exiger la perfection absolue rendrait le décor pénible à
 * écrire pour rien.
 */
export const facesConfondues = (boxes: BoxDef[], seuil = 4): string[] => {
  // Ni les fantômes ni le verre : les premiers n'arrêtent rien, les seconds ne
  // se dessinent pas. Une face confondue ne gêne que si DEUX surfaces
  // visibles se disputent la profondeur — c'est un défaut de rendu, pas de
  // collision.
  const solides = boxes.filter((b) => !b.ghost && !b.invisible);
  const trouvailles: [number, string][] = [];

  for (let axe = 0; axe < 3; axe++) {
    const u = (axe + 1) % 3;
    const v = (axe + 2) % 3;
    for (const cote of ['min', 'max'] as const) {
      // On regroupe par plan : deux faces ne peuvent se disputer la profondeur
      // que si elles sont exactement à la même coordonnée.
      const paquets = new Map<string, BoxDef[]>();
      for (const b of solides) {
        const clef = b[cote][axe].toFixed(4);
        const lot = paquets.get(clef);
        if (lot) lot.push(b);
        else paquets.set(clef, [b]);
      }

      for (const [plan, lot] of paquets) {
        for (let i = 0; i < lot.length; i++) {
          for (let j = i + 1; j < lot.length; j++) {
            const a = lot[i];
            const b = lot[j];
            const du = Math.min(a.max[u], b.max[u]) - Math.max(a.min[u], b.min[u]);
            const dv = Math.min(a.max[v], b.max[v]) - Math.max(a.min[v], b.min[v]);
            if (du <= EPS || dv <= EPS || du * dv < seuil) continue;

            // Le point juste À L'EXTÉRIEUR du plan commun. S'il est dans un
            // troisième solide, la face est enterrée et ne se verra jamais.
            const p = [0, 0, 0];
            p[u] = (Math.max(a.min[u], b.min[u]) + Math.min(a.max[u], b.max[u])) / 2;
            p[v] = (Math.max(a.min[v], b.min[v]) + Math.min(a.max[v], b.max[v])) / 2;
            p[axe] = Number(plan) + (cote === 'max' ? EPS : -EPS);
            if (solides.some((c) => c !== a && c !== b && dedans(c, p))) continue;

            trouvailles.push([
              du * dv,
              `${'xyz'[axe]}${cote}=${plan} — ${(du * dv).toFixed(0)} m² exposés en ` +
                `(${p.map((n) => n.toFixed(0)).join(', ')})`,
            ]);
          }
        }
      }
    }
  }

  trouvailles.sort((x, y) => y[0] - x[0]);
  return trouvailles.map(([, texte]) => texte);
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUI GAGNE, QUAND DEUX FACES SE DISPUTENT LA PROFONDEUR.
 *
 * Signalé en jouant : « la bordure devrait être toute gris foncé, mais elle
 * clignote quand on bouge ». Le dallage de la place et sa bordure avaient leur
 * face extérieure au même plan, et la bande entre le sol et le dessus du
 * dallage grésillait. La vérification plus haut ne l'attrapait pas : elle ne
 * regardait que le MILIEU du recouvrement, qui était enterré. Et elle ne voit
 * pas les faces PRESQUE confondues — deux, cinq, neuf millimètres, les écarts
 * qu'on met exprès — qui clignotent pourtant dès qu'on s'éloigne : avec un
 * plan proche à six centimètres et une profondeur sur vingt-quatre bits, deux
 * surfaces à moins d'un centimètre l'une de l'autre se confondent à cent
 * mètres. Un balayage en trouve des centaines, dans tous les niveaux.
 *
 * Plutôt que de retoucher des centaines de boîtes, on décide une fois pour
 * toutes, au rendu, laquelle des deux se voit : pour toute paire de faces de
 * même orientation, à moins de `tolerance` l'une de l'autre et qui se
 * recouvrent, la GAGNANTE est celle qui avance le plus ; à égalité exacte,
 * celle de la plus petite boîte — c'est le détail qu'on a posé sur la masse
 * (une bordure sur un dallage, un cadre sur un mur), donc c'est lui qu'on
 * veut voir. Le shader du décor avance ensuite chaque face de son rang, d'un
 * pas constant dans l'espace de la profondeur : la décision tient à toute
 * distance, là où un écart en mètres ne tient que jusqu'à une distance.
 *
 * LA TOLÉRANCE EST D'UN CENTIMÈTRE ET DEMI À PEINE, et c'est mesuré : à cinq,
 * les marches d'une cour faites de dalles à deux centimètres l'une de l'autre
 * formaient des chaînes de trente rangs, donc un décalage de plusieurs mètres
 * à cent mètres. Au-delà d'un centimètre, l'écart suffit seul jusqu'à cent
 * mètres à taille d'homme.
 *
 * Rend un rang par face, six par boîte, dans l'ordre de `buildWorldGeometry`
 * (+x, −x, +y, −y, +z, −z) : 0 pour une face qui ne gagne rien, et toujours
 * strictement plus que chaque face qu'elle bat — même en chaîne.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const rangsDesFaces = (boxes: readonly BoxDef[], tolerance = 0.012): Uint8Array => {
  const rangs = new Uint8Array(boxes.length * 6);
  const volume = (b: BoxDef): number =>
    (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]);
  // Chaque arête : [face gagnante, face battue].
  const aretes: [number, number][] = [];
  const visibles: number[] = [];
  boxes.forEach((b, i) => {
    if (!b.invisible) visibles.push(i);
  });

  for (let axe = 0; axe < 3; axe++) {
    const u = (axe + 1) % 3;
    const v = (axe + 2) % 3;
    for (const cote of ['max', 'min'] as const) {
      // Index de la face dans l'ordre de `buildWorldGeometry`.
      const f = axe * 2 + (cote === 'max' ? 0 : 1);
      const avance = cote === 'max' ? 1 : -1;
      const tri = [...visibles].sort((a, c) => boxes[a][cote][axe] - boxes[c][cote][axe]);
      for (let i = 0; i < tri.length; i++) {
        const a = boxes[tri[i]];
        for (let j = i + 1; j < tri.length; j++) {
          const c = boxes[tri[j]];
          if (c[cote][axe] - a[cote][axe] > tolerance) break;
          const du = Math.min(a.max[u], c.max[u]) - Math.max(a.min[u], c.min[u]);
          const dv = Math.min(a.max[v], c.max[v]) - Math.max(a.min[v], c.min[v]);
          if (du <= 1e-4 || dv <= 1e-4) continue;
          const ecart = (c[cote][axe] - a[cote][axe]) * avance;
          let gagne: number;
          if (Math.abs(ecart) > 1e-6) gagne = ecart > 0 ? tri[j] : tri[i];
          else {
            const va = volume(a);
            const vc = volume(c);
            gagne = va !== vc ? (va < vc ? tri[i] : tri[j]) : Math.max(tri[i], tri[j]);
          }
          const perd = gagne === tri[i] ? tri[j] : tri[i];
          aretes.push([gagne * 6 + f, perd * 6 + f]);
        }
      }
    }
  }

  // Le plus long chemin dans un graphe sans cycle (l'ordre « avance, puis
  // volume, puis rang » est total) : quelques passes suffisent.
  for (let passe = 0; passe < 32; passe++) {
    let bouge = false;
    for (const [g, p] of aretes) {
      if (rangs[g] <= rangs[p]) {
        rangs[g] = Math.min(255, rangs[p] + 1);
        bouge = true;
      }
    }
    if (!bouge) break;
  }
  return rangs;
};
