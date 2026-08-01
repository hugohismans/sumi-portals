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
  const solides = boxes.filter((b) => !b.ghost);
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
