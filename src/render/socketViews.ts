import * as THREE from 'three';
import type { Socket } from '../core/sockets.js';
import { INK, PALETTE, createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * Affichage des réceptacles.
 *
 * Un logement vide se lit comme un CREUX : quatre arêtes d'encre posées au sol,
 * qui dessinent l'empreinte de ce qu'on attend. Sa taille est l'énoncé de
 * l'énigme — on doit voir d'un coup d'œil si la caisse qu'on porte est trop
 * grosse ou trop petite.
 *
 * Rempli, il se scelle : un sceau vermillon monte et tourne. Ce retour immédiat
 * n'est pas décoratif. Sans lui, le joueur qui échoue ne sait pas si c'est la
 * taille, la position ou l'objet qui ne va pas, et il tâtonne au lieu de
 * raisonner.
 */
/** Les blocs d'une forme, en unités de −0,5 à +0,5 — ceux d'une pièce. */
type Blocs = { min: [number, number, number]; max: [number, number, number] }[];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE CREUX A LA FORME QU'IL ATTEND, ET LA MAIN QU'IL EXIGE.
 *
 * Il était dessiné comme un cadre cubique, quelle que soit la forme demandée :
 * la vrille qu'on tenait et le creux qui l'attendait n'avaient rien à
 * comparer, et le refus « pour la main » tombait sans que rien, dans le monde,
 * ne le montre. Signalé en jouant : « ce n'est pas clair que le bloc ne rentre
 * pas dedans ; le socle est cubique, il devrait avoir la forme chirale
 * correcte de l'objet ». Le code de la salle affirmait déjà « elle est
 * dessinée en creux, on voit ce qu'il attend » — c'était faux.
 *
 * On dessine donc les ARÊTES de la forme attendue : pas un objet plein, qu'on
 * prendrait pour une seconde pièce, mais son dessin au trait, posé là où elle
 * logera. Reflété sur x quand le creux veut la main droite — la même
 * convention que `carryableGeometry` —, et dans l'orientation que la pièce
 * prend en se logeant (rotation nulle, voir `Sockets.settle`) : au moment où
 * elle entre, elle recouvre exactement son dessin.
 *
 * Seules les arêtes du VOLUME sont tracées, pas celles de chaque cube : une
 * arête où deux cubes se touchent à plat n'est pas une arête de la forme, et
 * la tracer ferait une grille illisible. On pose les blocs sur une grille,
 * et une arête de la grille est une arête de la forme quand les quatre
 * cellules qui l'entourent ne sont ni toutes pleines, ni toutes vides, ni
 * pleines d'un seul côté d'un plan.
 * ═══════════════════════════════════════════════════════════════════════════
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UN CREUX QUI N'EXIGE QUE LA MAIN porte une main à plat au fond, et non plus
 * quatre montants.
 *
 * Signalé en jouant la boîte à formes : « il me reste une pièce chirale et
 * pas de gros cube », puis, une fois posée, « la forme est un cube alors que
 * ça attend une forme spéciale ». Le creux de la main accepte N'IMPORTE QUELLE
 * forme de la bonne main ; il n'avait pas de dessin, donc on lui donnait le
 * cadre cubique — et ses quatre montants de la hauteur du creux se lisaient
 * « un cube ». On y pose donc l'étalon de la chiralité, celui des murs du
 * refus et du blanchiment (`levels/mains.ts`) : une main d'encre, à plat, les
 * doigts vers le fond de la planche, et le POUCE du côté qui fait la main.
 *
 * Dos de la main vers le haut, doigts vers +z : la droite a le pouce à gauche
 * de qui regarde — c'est-à-dire vers +x, la droite du joueur tourné vers +z
 * étant −x dans ce jeu.
 *
 * PUIS : « j'ai ça dans la boîte à formes, c'est pas normal ». Dans un jouet à
 * formes, chaque trou a une forme — les deux creux qui n'exigeaient que la
 * main (la boîte à formes, le banc) dessinent désormais la vis de la main
 * droite. Aucun creux du jeu n'emploie plus ce dessin ; il reste la réponse
 * juste pour un creux qui n'exigerait que la main.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const DOIGTS_A_PLAT: [number, number][] = [
  [-0.3, 0.62],
  [-0.1, 0.72],
  [0.1, 0.68],
  [0.28, 0.52],
];
const mainAPlat = (
  taille: number,
  droite: boolean,
): { min: [number, number, number]; max: [number, number, number]; ink: number }[] => {
  // La main d'encre fait 1,65 de long et 1,44 de large : on la ramène aux
  // neuf dixièmes du creux, et on la centre.
  const k = (taille * 0.9) / 1.65;
  const dz = -0.665;
  const m = droite ? 1 : -1;
  const y0 = 0.004 * taille;
  const y1 = y0 + Math.max(0.012, taille * 0.02);
  const boite = (x0: number, z0: number, x1: number, z1: number) => ({
    min: [Math.min(x0, x1) * k, y0, (z0 + dz) * k] as [number, number, number],
    max: [Math.max(x0, x1) * k, y1, (z1 + dz) * k] as [number, number, number],
    ink: 0,
  });
  const out = [
    // La paume, et le poignet qui donne le sens de lecture.
    boite(-0.42, 0.1, 0.42, 0.78),
    boite(-0.2, -0.16, 0.2, 0.11),
  ];
  for (const [d, l] of DOIGTS_A_PLAT) out.push(boite(m * d - 0.075, 0.77, m * d + 0.075, 0.77 + l));
  // LE POUCE : court, épais, écarté. C'est lui qu'on lit.
  out.push(boite(m * 0.44, 0.3, m * 0.72, 0.62));
  return out;
};

const aretesDeLaForme = (
  blocs: Blocs,
  taille: number,
  miroir: boolean,
  epaisseur: number,
): { min: [number, number, number]; max: [number, number, number]; ink: number }[] => {
  // Les blocs se chevauchent d'un centimètre pour ne pas grésiller : on les
  // ramène sur une grille au vingt-quatrième, qui porte les grilles de 2, 3,
  // 4, 6 et 8.
  const g = (v: number) => Math.round(v * 24) / 24;
  const boites = blocs.map((b) => ({
    min: [g(b.min[0]), g(b.min[1]), g(b.min[2])],
    max: [g(b.max[0]), g(b.max[1]), g(b.max[2])],
  }));
  const axes = [0, 1, 2].map((a) =>
    [...new Set(boites.flatMap((b) => [b.min[a], b.max[a]]))].sort((u, v) => u - v),
  );
  const [X, Y, Z] = axes;
  const plein = (i: number, j: number, k: number): boolean => {
    if (i < 0 || j < 0 || k < 0 || i >= X.length - 1 || j >= Y.length - 1 || k >= Z.length - 1) return false;
    const c = [(X[i] + X[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2, (Z[k] + Z[k + 1]) / 2];
    return boites.some((b) => [0, 1, 2].every((a) => c[a] > b.min[a] && c[a] < b.max[a]));
  };
  const out: { min: [number, number, number]; max: [number, number, number]; ink: number }[] = [];
  const h = epaisseur / 2 / taille;
  for (let a = 0; a < 3; a++) {
    const [b, c] = a === 0 ? [1, 2] : a === 1 ? [0, 2] : [0, 1];
    for (let s = 0; s < axes[a].length - 1; s++) {
      for (let p = 0; p < axes[b].length; p++) {
        for (let q = 0; q < axes[c].length; q++) {
          // Les quatre cellules autour de la ligne (p, q), au segment s.
          const cell = (dp: number, dq: number): boolean => {
            const idx = [0, 0, 0];
            idx[a] = s;
            idx[b] = p + dp;
            idx[c] = q + dq;
            return plein(idx[0], idx[1], idx[2]);
          };
          const o00 = cell(-1, -1);
          const o10 = cell(0, -1);
          const o01 = cell(-1, 0);
          const o11 = cell(0, 0);
          const n = +o00 + +o10 + +o01 + +o11;
          const arete = n === 1 || n === 3 || (n === 2 && o00 === o11);
          if (!arete) continue;
          const min: [number, number, number] = [0, 0, 0];
          const max: [number, number, number] = [0, 0, 0];
          min[a] = axes[a][s] - h;
          max[a] = axes[a][s + 1] + h;
          min[b] = axes[b][p] - h;
          max[b] = axes[b][p] + h;
          min[c] = axes[c][q] - h;
          max[c] = axes[c][q] + h;
          // À la taille du creux, posée sur son fond, reflétée si la main l'exige.
          const vers = (v: [number, number, number]): [number, number, number] => [
            v[0] * taille * (miroir ? -1 : 1),
            v[1] * taille + taille / 2,
            v[2] * taille,
          ];
          const m0 = vers(min);
          const m1 = vers(max);
          out.push({
            min: [Math.min(m0[0], m1[0]), m0[1], m0[2]],
            max: [Math.max(m0[0], m1[0]), m1[1], m1[2]],
            ink: 0,
          });
        }
      }
    }
  }
  return out;
};

interface View {
  group: THREE.Group;
  /** Le dessin de la forme attendue, qu'on efface quand la pièce le recouvre. */
  forme: THREE.Group | null;
  seal: THREE.Group;
  filled: boolean;
  /** Avancement de l'animation de scellement, de 0 à 1. */
  bloom: number;
  /**
   * Avancement du REFUS, de 1 à 0.
   *
   * Le sceau récompense ce qui entre ; il n'y avait rien pour ce qui n'entre
   * pas. Une pièce refusée restait posée à côté d'un trou parfaitement
   * impassible, et le joueur ne savait même pas qu'il avait été entendu.
   */
  refus: number;
}

export class SocketViews {
  readonly group = new THREE.Group();
  /**
   * Les creux que la pièce tenue ÉPOUSE en ce moment — forme, taille, main et
   * sens. Leur dessin respire. Posé par la boucle à chaque image.
   */
  epouses: ReadonlySet<string> = new Set();
  private readonly views = new Map<string, View>();
  private readonly materials: THREE.ShaderMaterial[] = [];
  /** Les matériaux de chaque logement, pour pouvoir le teindre seul. */
  private readonly vues = new Map<string, THREE.ShaderMaterial[]>();
  private readonly socketsParId = new Map<string, Socket>();

  /**
   * LES SOCLES SONT GRIS COMME LE MONDE, tant qu'il n'a pas retrouvé ses
   * couleurs. Ils ont leurs propres matériaux, hors du système de régions — ils
   * restaient donc vermillon au milieu d'un village en lavis, quatre taches
   * rouges qu'on voyait à cent mètres et qui ne voulaient rien dire.
   *
   * La règle du jeu est simple : **tout est gris, sauf ce qui porte une
   * couleur.** Un socle vide n'en porte aucune. Il la prendra en se remplissant.
   */
  setCouleur(v: number | ((s: Socket) => number)): void {
    if (typeof v !== 'function') {
      for (const m of this.materials) {
        if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = v;
      }
      return;
    }
    // RÉGION PAR RÉGION. Un seul nombre pour tout le monde décolorait les creux
    // d'un niveau entier dès qu'UNE région y attendait une couleur — voir la
    // note jumelle dans `portalRenderer.setCouleurCadres`.
    for (const [id, view] of this.vues) {
      const k = v(this.socketsParId.get(id)!);
      for (const m of view) if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = k;
    }
  }

  /**
   * `formes` : pour chaque nom de forme, les blocs qui la composent — pris sur
   * les pièces du niveau. Un creux dont la forme y figure est dessiné à sa
   * forme ; sinon, c'est le cadre cubique d'origine.
   */
  build(sockets: Socket[], formes: ReadonlyMap<string, Blocs> = new Map()): void {
    for (const s of sockets) {
      const cel = createCelMaterial(PALETTE[s.ink] ?? PALETTE[3]);
      const outline = createOutlineMaterial();
      outline.uniforms.uThickness.value = 0.004;
      this.materials.push(cel, outline);
      this.vues.set(s.id, [cel, outline]);
      this.socketsParId.set(s.id, s);

      const group = new THREE.Group();
      group.position.set(s.position.x, s.position.y, s.position.z);

      const blocs = s.forme !== undefined ? formes.get(s.forme) : undefined;
      let dessin: THREE.Group | null = null;
      if (blocs && blocs.length > 0) {
        // LA FORME ATTENDUE, au trait. Voir `aretesDeLaForme`.
        dessin = new THREE.Group();
        const geo = buildWorldGeometry(
          aretesDeLaForme(blocs, s.size, s.main === 'D', Math.max(0.018, s.size * 0.045)),
        );
        dessin.add(new THREE.Mesh(geo, outline), new THREE.Mesh(geo, cel));
        group.add(dessin);
      }

      // UN CREUX QUI N'EXIGE QUE LA MAIN : une main à plat au fond, à la place
      // des montants. Elle respire comme un dessin de forme quand la pièce en
      // main lui convient. Voir `mainAPlat`.
      let mainSeule = false;
      if (!dessin && s.main !== undefined) {
        mainSeule = true;
        const encre = createCelMaterial(new THREE.Color('#c8492e'));
        const trait = createOutlineMaterial();
        trait.uniforms.uThickness.value = 0.003;
        this.materials.push(encre, trait);
        dessin = new THREE.Group();
        const geo = buildWorldGeometry(mainAPlat(s.size, s.main === 'D'));
        dessin.add(new THREE.Mesh(geo, trait), new THREE.Mesh(geo, encre));
        group.add(dessin);
      }

      // L'empreinte au sol : quatre barreaux qui cernent le vide. On montre le
      // manque, pas un objet — c'est ce qui donne envie d'y mettre quelque chose.
      const t = Math.max(0.04, s.size * 0.09);
      const h = s.size * 0.5;
      // Un creux qui a sa forme n'a pas besoin du cadre cubique : il le
      // contredirait. On saute droit au sceau.
      if (!dessin || mainSeule) {
      const bars: [number, number, number, number, number, number][] = [
        [-h - t, 0, -h - t, h + t, t, -h],
        [-h - t, 0, h, h + t, t, h + t],
        [-h - t, 0, -h, -h, t, h],
        [h, 0, -h, h + t, t, h],
      ];
      for (const [x0, y0, z0, x1, y1, z1] of bars) {
        const geo = buildWorldGeometry([{ min: [x0, y0, z0], max: [x1, y1, z1], ink: 0 }]);
        group.add(new THREE.Mesh(geo, outline), new THREE.Mesh(geo, cel));
      }

      // Quatre montants d'angle : ils donnent la HAUTEUR attendue, sans quoi on
      // ne saurait pas si la caisse doit être un pavé ou un cube. Pas pour un
      // creux de la main : n'importe quelle forme y entre, et des montants
      // feraient lire un cube.
      if (!mainSeule) for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
        const geo = buildWorldGeometry([
          {
            min: [sx * h - (sx < 0 ? 0 : t), 0, sz * h - (sz < 0 ? 0 : t)],
            max: [sx * h + (sx < 0 ? t : 0), s.size, sz * h + (sz < 0 ? t : 0)],
            ink: 0,
          },
        ]);
        group.add(new THREE.Mesh(geo, outline), new THREE.Mesh(geo, cel));
      }
      }
      // Élagués comme le reste : trois creux, seize maillages chacun, redessinés
      // dans chaque vue de portail même quand ils étaient derrière elle.

      const seal = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.size * 0.5, s.size * 0.08, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0xc8492e }),
      );
      ring.rotation.x = Math.PI / 2;
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(s.size * 0.2, 0),
        new THREE.MeshBasicMaterial({ color: INK }),
      );
      seal.add(ring, core);
      seal.position.y = s.size * 0.62;
      seal.visible = false;
      group.add(seal);

      this.group.add(group);
      this.views.set(s.id, { group, forme: dessin, seal, filled: false, bloom: 0, refus: 0 });
    }
  }

  /**
   * LE CREUX SE RÉTRACTE — un refus, et c'est tout ce qu'il fait.
   *
   * Il n'annonce PAS lequel des quatre attributs cloche : ça, c'est la phrase
   * qui le dit. Il annonce qu'il a vu la pièce et qu'il l'a écartée, ce qui
   * n'était dit nulle part — une pièce reposée à côté d'un trou impassible ne
   * permettait même pas de savoir si le jeu avait remarqué le geste.
   *
   * Le mouvement est un tressaillement bref : le trait d'encre se contracte,
   * puis revient. Pas de clignotement, pas de rouge — un cadre qui se rétracte
   * une demi-seconde se lit comme un refus dans n'importe quelle langue, et
   * l'on ne dépense pas la couleur, qui est le sujet du jeu.
   */
  refuser(id: string): void {
    const v = this.views.get(id);
    if (v) v.refus = 1;
  }

  update(sockets: Socket[], dt: number, time: number): void {
    for (const s of sockets) {
      const v = this.views.get(s.id);
      if (!v) continue;

      // Le tressaillement du refus. Il décroît en un peu moins d'une seconde,
      // et son amplitude reste faible : on veut que l'œil l'attrape, pas que le
      // décor tremble.
      if (v.refus > 0) {
        v.refus = Math.max(0, v.refus - dt * 1.6);
        const t = Math.sin(v.refus * Math.PI * 3) * v.refus;
        v.group.scale.setScalar(1 - 0.11 * Math.abs(t));
      } else if (v.group.scale.x !== 1) {
        v.group.scale.setScalar(1);
      }

      const filled = s.filledBy !== null;
      if (filled && !v.filled) v.filled = true;
      // La pièce logée recouvre son dessin : on l'efface, sinon ses arêtes
      // perceraient la pièce comme un fil de fer.
      if (v.forme) {
        v.forme.visible = !filled;
        // ET IL RESPIRE quand la pièce en main l'épouse : il enfle et
        // désenfle doucement, comme une invitation. Avec la mauvaise main,
        // aucune des vingt-quatre orientations ne le fait bouger — c'est
        // tout ce que la leçon demande de voir.
        const k = this.epouses.has(s.id) ? 1 + 0.09 * (0.5 + 0.5 * Math.sin(time * 7)) : 1;
        v.forme.scale.setScalar(k);
        v.forme.position.y = (k - 1) * s.size * 0.5;
      }

      if (v.filled && v.bloom < 1) v.bloom = Math.min(1, v.bloom + dt * 2.2);
      v.seal.visible = v.bloom > 0;
      if (v.bloom > 0) {
        // Le sceau se dessine en montant, puis tourne doucement. Le mouvement
        // attire l'œil au bon moment sans réclamer d'attention ensuite.
        const e = 1 - Math.pow(1 - v.bloom, 3);
        v.seal.scale.setScalar(e);
        v.seal.rotation.y = time * 0.6;
        v.seal.position.y = s.size * (0.32 + 0.3 * e);
      }
    }
  }

  syncInk(): void {
    for (const m of this.materials) syncInkUniforms(m);
  }
}
