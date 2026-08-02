import * as THREE from 'three';
import type { CanevasDef } from '../core/types.js';
import { INK, PAPER, createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * LA TOILE, ET CE QU'ON Y LAISSE.
 *
 * Une texture qu'on peint à la main, pixel par pixel, et qui ne coûte rien tant
 * que personne n'écrit — on ne la renvoie à la carte graphique que les images
 * où elle a changé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE TRAIT EST RELIÉ AU PRÉCÉDENT, ET C'EST TOUT LE TRAVAIL
 *
 * La simulation tourne à soixante pas par seconde ; en balayant le mur, deux
 * impacts successifs peuvent être distants de la moitié de la toile. Poser un
 * disque à chaque impact donnerait un chapelet de pois, pas un trait.
 *
 * On relie donc chaque marque à la précédente par un segment épais, et l'on
 * arrondit les bouts. C'est ce qui fait la différence entre « ça marque » et
 * « ça écrit », et personne ne le remarque tant que c'est fait.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ET LE PAPIER EST CELUI DU JEU. Le fond de la toile n'est pas blanc mais du
 * même crème que le ciel, avec son grain : une feuille blanche posée dans un
 * lavis se lirait comme un trou dans l'image.
 */

/** Définition de la toile, en pixels. Assez pour un trait fin de très près. */
const PIXELS = 1024;

/**
 * LA TOILE SE SOUVIENT D'UNE VISITE À L'AUTRE.
 *
 * Sans ça, « vos deux dessins restent là côte à côte » est faux : c'est un
 * carnet privé qu'un rechargement efface. Or le hall est le seul lieu du jeu où
 * l'on se croise, et une trace qui survit est **la meilleure raison d'y
 * revenir** — on repasse voir ce qu'on avait écrit, et ce que quelqu'un a écrit
 * à côté.
 *
 * On garde l'image elle-même, encodée, et non la liste des traits : c'est plus
 * simple, c'est borné, et l'on retrouve exactement ce qu'on avait laissé, y
 * compris ce qu'un autre a dessiné par-dessus.
 */
const CLE = 'sumi.canevas.';

/** Au-delà, on n'écrit plus : un dessin ne vaut pas de remplir un navigateur. */
const POIDS_MAX = 700_000;

interface Toile {
  def: CanevasDef;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  /** Dernier point touché, pour relier. `null` dès qu'on relâche. */
  dernier: { x: number; y: number } | null;
  sale: boolean;
}

export class CanevasView {
  readonly group = new THREE.Group();
  private readonly toiles = new Map<string, Toile>();
  private readonly materiaux: THREE.ShaderMaterial[] = [];
  /** Combien d'images depuis le dernier trait, par toile. Voir `update`. */
  private repos = new Map<string, number>();

  constructor(defs: CanevasDef[] = []) {
    for (const def of defs) this.batir(def);
  }

  private batir(def: CanevasDef): void {
    const canvas = document.createElement('canvas');
    canvas.width = PIXELS;
    canvas.height = Math.max(
      64,
      Math.round((PIXELS * def.hauteur) / def.largeur),
    );
    const ctx = canvas.getContext('2d')!;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const toile: Toile = { def, ctx, texture, dernier: null, sale: true };
    this.toiles.set(def.id, toile);
    this.effacer(def.id);
    this.relire(def.id);

    const [x, y, z] = def.position;
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(def.largeur, def.hauteur),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    surface.position.set(x, y, z);
    surface.rotation.y = def.yaw;
    surface.frustumCulled = false;

    // Le châssis, dans les mêmes matériaux que le décor : une toile tendue sur
    // un cadre de bois, pas un panneau d'interface collé sur le monde.
    const e = Math.max(0.03, def.largeur * 0.035);
    const cel = createCelMaterial(new THREE.Color('#8a6b40'));
    const contour = createOutlineMaterial(INK);
    this.materiaux.push(cel, contour);
    const dl = def.largeur * 0.5 + e;
    const dh = def.hauteur * 0.5 + e;
    const geo = buildWorldGeometry([
      { min: [-dl, -dh, -e], max: [dl, -dh + e, 0], ink: 2 },
      { min: [-dl, dh - e, -e], max: [dl, dh, 0], ink: 2 },
      { min: [-dl, -dh + e, -e], max: [-dl + e, dh - e, 0], ink: 2 },
      { min: [dl - e, -dh + e, -e], max: [dl, dh - e, 0], ink: 2 },
    ]);
    const cadre = new THREE.Group();
    const bord = new THREE.Mesh(geo, cel);
    const trait = new THREE.Mesh(geo, contour);
    bord.frustumCulled = false;
    trait.frustumCulled = false;
    cadre.add(trait, bord);
    cadre.position.set(x, y, z);
    cadre.rotation.y = def.yaw;

    this.group.add(cadre, surface);
  }

  /** Pose une marque, reliée à la précédente. Voir l'en-tête. */
  tracer(id: string, u: number, v: number, rayon: number, encre: string): void {
    const t = this.toiles.get(id);
    if (!t) return;
    const w = t.ctx.canvas.width;
    const h = t.ctx.canvas.height;
    const x = u * w;
    const y = v * h;
    // Le rayon est donné en fraction de la LARGEUR : c'est la même unité en x
    // et en y, sinon un trait serait ovale sur une toile qui n'est pas carrée.
    const r = Math.max(1.2, rayon * w);

    t.ctx.strokeStyle = encre;
    t.ctx.fillStyle = encre;
    t.ctx.lineCap = 'round';
    t.ctx.lineJoin = 'round';
    t.ctx.lineWidth = r * 2;

    if (t.dernier) {
      t.ctx.beginPath();
      t.ctx.moveTo(t.dernier.x, t.dernier.y);
      t.ctx.lineTo(x, y);
      t.ctx.stroke();
    } else {
      t.ctx.beginPath();
      t.ctx.arc(x, y, r, 0, Math.PI * 2);
      t.ctx.fill();
    }

    t.dernier = { x, y };
    t.sale = true;
    this.repos.set(id, 0);
  }

  effacer(id: string): void {
    const t = this.toiles.get(id);
    if (!t) return;
    const { ctx } = t;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Le papier du jeu, pas du blanc. Une feuille blanche posée dans un lavis
    // se lirait comme un trou dans l'image.
    ctx.fillStyle = `#${PAPER.getHexString()}`;
    ctx.fillRect(0, 0, w, h);

    // Un grain léger, du même esprit que la trame du décor. Sans lui, la toile
    // est la seule surface parfaitement lisse du jeu, et ça se voit.
    ctx.fillStyle = `#${INK.getHexString()}`;
    ctx.globalAlpha = 0.045;
    for (let i = 0; i < w * h * 0.0012; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    t.dernier = null;
    t.sale = true;
    try {
      localStorage.removeItem(CLE + id);
    } catch {
      /* rien à faire */
    }
  }

  /**
   * Fin d'image. `dessine` dit si l'on a tracé pendant ce pas.
   *
   * Quand on relâche, on oublie le dernier point : sinon le prochain trait
   * serait relié au précédent par une barre en travers de la toile, ce qui est
   * exactement le contraire de ce qu'on veut.
   */
  update(dessine: boolean): void {
    for (const [id, t] of this.toiles) {
      if (!dessine) {
        const n = (this.repos.get(id) ?? 0) + 1;
        this.repos.set(id, n);
        // Deux images de battement : le trait survit à un pas de simulation
        // sauté, mais pas à un vrai relâchement.
        if (n === 3 && t.dernier) {
          // On vient de relâcher : c'est le moment d'écrire, et le seul.
          t.dernier = null;
          this.ecrire(id);
        } else if (n > 2) {
          t.dernier = null;
        }
      }
      if (t.sale) {
        t.texture.needsUpdate = true;
        t.sale = false;
      }
    }
  }

  /** Relit ce qu'on avait laissé. Silencieux si rien, ou si le stockage refuse. */
  private relire(id: string): void {
    const t = this.toiles.get(id);
    if (!t) return;
    try {
      const brut = localStorage.getItem(CLE + id);
      if (!brut) return;
      const img = new Image();
      img.onload = () => {
        t.ctx.drawImage(img, 0, 0, t.ctx.canvas.width, t.ctx.canvas.height);
        t.sale = true;
      };
      img.src = brut;
    } catch {
      // Navigation privée, quota plein, stockage refusé : on dessine sur une
      // toile neuve plutôt que de ne pas dessiner du tout.
    }
  }

  /**
   * Écrit la toile. Appelé quand on relâche, pas à chaque trait : encoder une
   * image d'un mégapixel soixante fois par seconde coûterait bien plus cher que
   * tout le reste du jeu réuni.
   */
  private ecrire(id: string): void {
    const t = this.toiles.get(id);
    if (!t) return;
    try {
      const url = t.ctx.canvas.toDataURL('image/webp', 0.7);
      if (url.length > POIDS_MAX) return;
      localStorage.setItem(CLE + id, url);
    } catch {
      /* sans mémoire, mais la toile de la partie en cours reste intacte */
    }
  }

  syncInk(): void {
    for (const m of this.materiaux) syncInkUniforms(m);
  }

  dispose(): void {
    for (const t of this.toiles.values()) t.texture.dispose();
  }
}
