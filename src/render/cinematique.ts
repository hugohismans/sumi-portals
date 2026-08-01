import * as THREE from 'three';

/**
 * LE SACRE — ce qui arrive quand l'encrier se pose sur la pointe.
 *
 * Le jeu n'avait aucune fin. On accomplissait la seule chose qu'il demandait et
 * il ne se passait rien : un logement se remplissait, un petit texte
 * s'affichait, on restait planté là. Tout le voyage ne valait pas plus qu'une
 * caisse rangée.
 *
 * D'où ce plan. La caméra quitte le corps du joueur et prend du recul, très
 * lentement, en tournant autour de l'Aiguille. Et ce qu'elle montre n'est pas
 * l'objet qu'on vient de poser : c'est TOUT CE QU'ON A TRAVERSÉ POUR L'APPORTER.
 * Le belvédère d'où l'on vient, la terrasse en dessous, et tout au fond le
 * village où l'on mesurait 1,80 et où cette pointe paraissait inatteignable.
 *
 * TROIS PARTIS PRIS, et ils décident de la qualité du moment :
 *
 * **On s'éloigne, on ne se rapproche pas.** Un plan qui se resserre sur un
 * trophée dit « voilà l'objet ». Un plan qui recule dit « voilà d'où tu viens ».
 * C'est la seconde phrase qu'on veut.
 *
 * **Le regard descend en cours de route.** On commence sur la pointe, on finit
 * sur le village. C'est le voyage rejoué à l'envers, en quatorze secondes.
 *
 * **Rien ne s'accélère jamais.** Chaque courbe est amortie aux deux bouts ; il
 * n'y a pas un seul mouvement à vitesse constante. Un travelling qui démarre
 * sec ou s'arrête net fait mécanique, et c'est exactement ce qu'on ne veut pas
 * au seul instant du jeu qui a le droit d'être solennel.
 */

const DUREE = 14;

/** Amorti aux deux bouts. Sans lui, tout paraît piloté par une machine. */
const doux = (t: number): number => t * t * (3 - 2 * t);

export class Cinematique {
  private temps = -1;
  private readonly centre = new THREE.Vector3();
  private readonly depart = new THREE.Vector3();
  private readonly cible = new THREE.Vector3();
  private angleDepart = 0;

  /** `oeil` : d'où l'on regardait à l'instant du sacre. La caméra part de là. */
  jouer(centre: [number, number, number], oeil: THREE.Vector3): void {
    if (this.temps >= 0) return;
    this.temps = 0;
    this.centre.set(centre[0], centre[1], centre[2]);
    this.depart.copy(oeil);
    // On repart de l'angle où se tenait le joueur : la caméra ne saute pas, elle
    // se détache. Le premier dixième de seconde doit être imperceptible.
    this.angleDepart = Math.atan2(oeil.x - this.centre.x, oeil.z - this.centre.z);
  }

  get actif(): boolean {
    return this.temps >= 0;
  }

  /** Fraction écoulée, pour que l'interface sache quand écrire son mot. */
  get avancement(): number {
    return this.temps < 0 ? 0 : Math.min(1, this.temps / DUREE);
  }

  /**
   * Place la caméra. Renvoie `false` quand c'est fini et que la main peut être
   * rendue au joueur.
   */
  update(dt: number, camera: THREE.PerspectiveCamera): boolean {
    if (this.temps < 0) return false;
    this.temps += dt;
    const t = Math.min(1, this.temps / DUREE);

    // Le recul : de tout près à très loin, mais amorti, donc jamais un zoom.
    const rayon = 14 + doux(t) * 300;
    // Un peu plus d'un demi-tour. Un tour complet ramènerait au point de départ,
    // ce qui donnerait l'impression que rien n'a été montré.
    const angle = this.angleDepart + doux(t) * Math.PI * 1.15;
    // On monte d'abord, puis on redescend : la caméra passe au-dessus de la
    // pointe avant de plonger vers le village.
    const hauteur = Math.sin(doux(t) * Math.PI) * 46 - doux(t) * 62;

    camera.position.set(
      this.centre.x + Math.sin(angle) * rayon,
      this.centre.y + hauteur + 6,
      this.centre.z + Math.cos(angle) * rayon,
    );

    // Le regard glisse de la pointe vers le pied de l'Aiguille — donc vers le
    // village, qu'on finit par embrasser en entier.
    this.cible.set(
      this.centre.x,
      this.centre.y - doux(Math.max(0, (t - 0.25) / 0.75)) * 118,
      this.centre.z,
    );
    camera.lookAt(this.cible);
    // La caméra a été orientée à la main : sans ça, le rendu des portails
    // travaillerait sur une matrice périmée d'une image.
    camera.updateMatrixWorld(true);

    if (this.temps >= DUREE + 2.5) {
      this.temps = -1;
      return false;
    }
    return true;
  }
}
