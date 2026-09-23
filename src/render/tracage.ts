/**
 * LE PINCEAU DESSINE LE MONDE SUIVANT DANS LA PORTE.
 *
 * Une porte peut exister sans que le monde d'en face y soit tracé : elle n'est
 * alors qu'une feuille tendue dans un cadre, et l'on ne traverse pas une
 * feuille. Le pinceau vous y attend, et quand vous l'avez rejoint, il se met au
 * travail. Les taches tombent, le paysage apparaît, et la porte s'ouvre.
 *
 * Ce n'est pas un habillage posé sur un chargement de niveau : dans ce jeu,
 * c'est vrai. Le monde d'après n'est pas encore là, quelqu'un doit le tracer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI PAR PALIERS, ET SURTOUT PAS EN CONTINU
 *
 * La première version avançait le tracé régulièrement, image par image. Ça
 * marchait, et ça ne racontait rien : un dégradé se lit comme une transparence
 * qu'on augmente, c'est-à-dire comme un effet d'écran.
 *
 * Ici le tracé progresse par COUPS. Une poignée de taches d'un seul coup, un
 * silence, une autre poignée. Chaque coup porte son bruit. Le même coût, et
 * l'on ne lit plus un fondu mais une main qui travaille — ce qui est
 * exactement ce qu'on veut faire croire, puisque c'est le cas.
 *
 * Les coups sont IRRÉGULIERS, aussi. Une cadence métronomique redeviendrait
 * une machine ; une main hésite, appuie deux fois de suite, reprend.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Les coups, en fractions de tracé. Irréguliers, et c'est tout le propos. */
const COUPS = [0.14, 0.26, 0.34, 0.48, 0.55, 0.7, 0.83, 0.92, 1];

/** Attente avant chaque coup, en secondes. La main ralentit vers la fin. */
const ATTENTES = [0.5, 0.34, 0.22, 0.4, 0.2, 0.46, 0.36, 0.52, 0.7];

export class Tracage {
  /** Identifiant de la paire en cours de tracé, ou null. */
  private paire: string | null = null;
  private coup = 0;
  private attente = 0;

  /**
   * Commence à dessiner. `onCoup` sonne à chaque tache posée, `onFini` quand la
   * porte est ouverte.
   */
  commencer(pairId: string): void {
    if (this.paire) return;
    this.paire = pairId;
    this.coup = 0;
    this.attente = 0.8; // un temps d'arrêt : il se met en place avant d'écrire
  }

  /**
   * Efface tout et rend la main. On reprend la feuille au chevalet : le dessin
   * qu'elle portait n'a plus de support, donc il n'a plus lieu d'être.
   *
   * Rien à amortir : c'est une décision du joueur, pas un événement du monde, et
   * ce qui répond à un geste doit répondre tout de suite.
   */
  annuler(): void {
    this.paire = null;
    this.coup = 0;
    this.attente = 0;
  }

  get enCours(): boolean {
    return this.paire !== null;
  }

  get pairEnCours(): string | null {
    return this.paire;
  }

  /**
   * Avance d'une image. Renvoie le coup à appliquer — LA PORTE et le tracé —
   * quand il a changé, et `null` le reste du temps : inutile de toucher aux
   * uniformes à chaque image pour la même valeur.
   *
   * LA PORTE FAIT PARTIE DE LA RÉPONSE, et c'est une correction. Au dernier
   * coup, la main est rendue (`paire` redevient null) AVANT que l'appelant ne
   * pose le tracé ; il lisait alors `pairEnCours`, trouvait null, et se
   * rabattait sur la porte du village. Dans le village ça tombait juste. Dans
   * les trois voyages, chaque porte dessinée restait à 92 % pour toujours :
   * sa grille de taches ne s'effaçait jamais, et le joueur voyait, à travers
   * une porte qu'il venait de regarder se dessiner, un semis de grains de
   * papier — « comme du sable ». Signalé en jouant, sur téléphone.
   */
  update(
    dt: number,
    onCoup: () => void,
    onFini: (pairId: string) => void,
  ): { paire: string; trace: number } | null {
    if (!this.paire) return null;

    this.attente -= dt;
    if (this.attente > 0) return null;

    const paire = this.paire;
    const trace = COUPS[this.coup];
    this.attente = ATTENTES[this.coup];
    this.coup++;
    onCoup();

    if (this.coup >= COUPS.length) {
      this.paire = null;
      onFini(paire);
    }
    return { paire, trace };
  }
}
