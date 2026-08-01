/**
 * L'AMBIANCE SONORE — entièrement synthétisée, aucun fichier.
 *
 * Le jeu est un site statique et doit le rester : pas un octet d'audio à
 * télécharger. Tout ce qu'on entend ici est fabriqué à la volée par l'API Web
 * Audio, à partir de trois ingrédients seulement — du bruit, des sinus, et des
 * enveloppes. C'est peu, mais c'est exactement la palette d'un lavis : peu de
 * matière, beaucoup de nuances.
 *
 * CE QUI FAIT TOUT LE SEL DE CE FICHIER : **le son se transpose avec la taille
 * du joueur.** Une seule règle, appliquée partout, sans exception : chaque
 * fréquence est multipliée par (1 / échelle). Un joueur quatre fois plus grand
 * entend donc le monde deux octaves plus bas, et un joueur quatre fois plus
 * petit deux octaves plus haut. Ce n'est pas un effet décoratif : c'est ainsi
 * qu'on entend qu'on a changé de taille, avant même de l'avoir vu. Un grand
 * corps a de grandes cavités, de longues jambes, un pas lent ; un petit corps
 * est menu et pressé. L'oreille connaît cette loi depuis toujours, il suffit de
 * ne pas la contredire.
 *
 * ET SURTOUT : le son ne doit JAMAIS empêcher de jouer. Tout est enfermé dans
 * des gardes ; si l'AudioContext manque, est refusé, ou tombe en panne, chaque
 * méthode devient un no-op silencieux et la partie continue sans rien savoir.
 */

/**
 * Le silence est l'état par défaut, et le volume reste bas.
 *
 * Ce jeu est contemplatif : le son est là pour qu'on remarque son absence
 * quand il s'arrête, pas pour se faire écouter. Dans le doute on baisse.
 */
const VOLUME_DEFAUT = 0.3;

/**
 * Les fréquences de référence, toutes données pour l'échelle 1.
 *
 * Elles sont regroupées ici parce que ce sont les seules valeurs qu'on ait
 * réellement envie de retoucher à l'oreille — le reste est de la plomberie.
 */

/** Coupure moyenne du vent. Au-delà, un souffle devient un sifflement. */
const VENT_COUPURE = 340;

/** Amplitude de la respiration du filtre, en proportion de la coupure. */
const VENT_RESPIRATION = 0.45;

/**
 * Période de la respiration, en secondes.
 *
 * Vingt-deux secondes : bien plus lent qu'un souffle humain. On ne doit pas
 * pouvoir compter le cycle ; il faut seulement que l'air ne soit jamais tout
 * à fait immobile.
 */
const VENT_PERIODE = 22;

/**
 * Le corps du pas : un thud mat, très bas.
 *
 * 82 Hz, c'est le grave d'un plancher de bois qu'on charge — assez bas pour
 * être un poids et non une note. Un pas mélodique s'entendrait dix fois par
 * seconde et rendrait fou.
 */
const PAS_CORPS = 82;

/** La partie « frottement » du pas : du bruit, poussé au-delà du grave. */
const PAS_GRAIN = 900;

/**
 * Le froissement du portail : un balayage de bruit, du bas vers le haut.
 *
 * De 400 à 2600 Hz : la signature d'un papier qu'on déchire ou qu'on tourne.
 * Franchir un portail, dans ce jeu, c'est passer d'une page à l'autre.
 */
const PORTAIL_BAS = 400;
const PORTAIL_HAUT = 2600;

/**
 * La note du Pinceau : sol 6, 1568 Hz.
 *
 * Une seule note, très haute et très pure, sans queue harmonique sale : c'est
 * une goutte d'encre qui touche l'eau. Il s'envole, donc ça monte et ça
 * s'évapore. À l'échelle 4 elle tombe à 392 Hz et devient une cloche — ce qui
 * reste juste, parce qu'un pinceau géant serait une cloche.
 */
const PINCEAU_NOTE = 1568;

/**
 * La caisse qui se pose : sol 3, 196 Hz.
 *
 * Trois octaves sous le Pinceau, exactement — la même note, mais lourde. Cette
 * parenté fait que les deux sons appartiennent au même instrument, et deux
 * sons parents fatiguent infiniment moins que deux sons étrangers.
 */
const CAISSE_NOTE = 196;

/** Durées de référence, en secondes, à l'échelle 1. */
const PAS_DUREE = 0.13;
const PORTAIL_DUREE = 0.42;
const PINCEAU_DUREE = 1.7;
const CAISSE_DUREE = 0.85;

export class Ambiance {
  private ctx: AudioContext | null = null;
  private maitre: GainNode | null = null;

  /** Le souffle continu — créé une seule fois, jamais arrêté. */
  private ventFiltre: BiquadFilterNode | null = null;
  private ventSource: AudioBufferSourceNode | null = null;

  /** Échelle du joueur. Tout le reste du fichier en dépend. */
  private echelle = 1;

  private volume = VOLUME_DEFAUT;
  private coupe = false;

  /** Phase de la respiration du vent, avancée par update(). */
  private phase = 0;

  /**
   * Vrai dès qu'on a renoncé à l'audio.
   *
   * Une fois posé, plus rien n'est tenté : inutile de relancer un contexte qui
   * a déjà échoué à chaque foulée du joueur.
   */
  private mort = false;

  /**
   * À appeler sur le PREMIER clic ou le premier toucher, jamais avant.
   *
   * Les navigateurs refusent de démarrer un AudioContext sans geste de
   * l'utilisateur ; un contexte créé trop tôt naît suspendu et reste muet même
   * après reprise. Appeler cette méthode plusieurs fois est sans effet, ce qui
   * permet de la brancher naïvement sur tous les événements d'entrée.
   */
  demarrer(): void {
    if (this.mort || this.ctx) return;
    try {
      const fenetre = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Constructeur = fenetre.AudioContext ?? fenetre.webkitAudioContext;
      if (!Constructeur) {
        this.mort = true;
        return;
      }

      const ctx = new Constructeur();
      const maitre = ctx.createGain();
      maitre.gain.value = this.coupe ? 0 : this.volume;
      maitre.connect(ctx.destination);

      this.ctx = ctx;
      this.maitre = maitre;

      // Le contexte peut malgré tout naître suspendu (onglet en arrière-plan,
      // geste jugé insuffisant) : on demande la reprise, et on ignore un refus.
      void ctx.resume().catch(() => undefined);

      this.construireVent();
    } catch {
      this.mort = true;
      this.ctx = null;
      this.maitre = null;
    }
  }

  /**
   * L'échelle du joueur : 1 = normal, 4 = quatre fois plus grand.
   *
   * Le vent se transpose ici même, en glissant plutôt qu'en sautant : la
   * traversée d'un portail est déjà brutale à l'image, le son doit la rattraper
   * en un quart de seconde au lieu de claquer.
   */
  setEchelle(scale: number): void {
    // Un garde-fou franc : une échelle nulle ou négative produirait des
    // fréquences infinies, et un souffle infini est un cri.
    this.echelle = Number.isFinite(scale) && scale > 0.001 ? scale : 1;
    this.appliquerVent(0.25);
  }

  /** Volume global, 0..1. Réglable à tout instant, même avant demarrer(). */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
    this.appliquerMaitre();
  }

  /** Coupure franche. `couper()` sans argument coupe ; `couper(false)` rétablit. */
  couper(actif = true): void {
    this.coupe = actif;
    this.appliquerMaitre();
  }

  /** Vrai si le son tourne réellement. Utile pour un témoin d'interface. */
  get actif(): boolean {
    return this.ctx !== null && !this.coupe;
  }

  /**
   * UN PAS. À déclencher à chaque foulée, pas à chaque image.
   *
   * Deux couches très courtes : un corps sinusoïdal qui plonge (le poids qui
   * arrive au sol) et une pincée de bruit sourd (la semelle). Aucune des deux
   * ne tient plus d'un dixième de seconde à taille normale — un pas qu'on
   * entend décroître n'est plus un pas, c'est un tambour.
   */
  pas(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const t = ctx.currentTime;
      const k = this.facteur();
      const duree = PAS_DUREE * this.echelle;

      // Le corps : une chute de fréquence sur la durée du pas. C'est cette
      // chute, et non la note de départ, qui fait entendre un impact.
      const corps = ctx.createOscillator();
      corps.type = 'sine';
      corps.frequency.setValueAtTime(PAS_CORPS * k * 1.6, t);
      corps.frequency.exponentialRampToValueAtTime(PAS_CORPS * k * 0.7, t + duree);

      const gCorps = ctx.createGain();
      gCorps.gain.setValueAtTime(0.0001, t);
      gCorps.gain.exponentialRampToValueAtTime(0.11, t + 0.004);
      gCorps.gain.exponentialRampToValueAtTime(0.0001, t + duree);
      corps.connect(gCorps).connect(maitre);
      corps.start(t);
      corps.stop(t + duree + 0.02);

      // Le grain : du bruit passé au passe-bas pour rester mat. Sans lui le pas
      // sonne synthétique ; avec trop de lui, il devient une gifle.
      const grain = this.sourceBruit(0.2);
      if (grain) {
        const filtre = ctx.createBiquadFilter();
        filtre.type = 'lowpass';
        filtre.frequency.value = PAS_GRAIN * k;
        const gGrain = ctx.createGain();
        gGrain.gain.setValueAtTime(0.05, t);
        gGrain.gain.exponentialRampToValueAtTime(0.0001, t + duree * 0.55);
        grain.connect(filtre).connect(gGrain).connect(maitre);
        grain.start(t);
        grain.stop(t + duree);
      }
    } catch {
      /* Un son raté ne doit rien interrompre. */
    }
  }

  /**
   * LE FRANCHISSEMENT D'UN PORTAIL — un froissement de papier.
   *
   * Un balayage de bande passante du grave vers l'aigu : le geste de tourner
   * une page. On le laisse plus long que les autres effets (0,42 s) parce que
   * c'est le seul moment du jeu où l'on change de monde, et qu'un événement
   * aussi rare a droit à sa respiration.
   */
  portail(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const t = ctx.currentTime;
      const k = this.facteur();
      const duree = PORTAIL_DUREE * this.echelle;

      const source = this.sourceBruit(0.6);
      if (!source) return;

      const filtre = ctx.createBiquadFilter();
      filtre.type = 'bandpass';
      // Q modeste : une bande trop étroite chanterait, et un papier ne chante
      // pas. On veut du souffle coloré, pas une note.
      filtre.Q.value = 1.4;
      filtre.frequency.setValueAtTime(PORTAIL_BAS * k, t);
      filtre.frequency.exponentialRampToValueAtTime(PORTAIL_HAUT * k, t + duree);

      const g = ctx.createGain();
      // Attaque non nulle : un froissement commence toujours par s'installer.
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + duree * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duree);

      source.connect(filtre).connect(g).connect(maitre);
      source.start(t);
      source.stop(t + duree + 0.05);
    } catch {
      /* idem */
    }
  }

  /**
   * LE PINCEAU S'ENVOLE — une seule note, cristalline.
   *
   * Une note et rien d'autre : c'est un personnage discret, pas une fanfare.
   * Un sinus pur pour le corps, plus une octave très en retrait (un huitième du
   * niveau) qui donne l'éclat sans donner le timbre — c'est ce demi-rien qui
   * fait entendre du verre plutôt qu'un synthétiseur.
   *
   * Longue décroissance : il part, on le regarde partir.
   */
  pinceau(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const t = ctx.currentTime;
      const f = PINCEAU_NOTE * this.facteur();
      const duree = PINCEAU_DUREE * this.echelle;
      this.cloche(f, duree, 0.075, t);
      this.cloche(f * 2, duree * 0.6, 0.009, t);
    } catch {
      /* idem */
    }
  }

  /**
   * LA RETROUVAILLE — les deux joueurs de la même taille, chacun sur sa dalle.
   *
   * C'est le seul son du jeu qui ne soit pas un événement mais une CONCLUSION,
   * et il est construit pour ça : cinq cloches qui montent lentement en accord
   * parfait, chacune tenant plus longtemps que la précédente, si bien qu'elles
   * finissent toutes ensemble. On entend cinq départs et une seule fin.
   *
   * Et il ne se transpose PAS avec l'échelle, alors que tout le reste du jeu le
   * fait. À ce moment précis les deux joueurs sont à la même taille : ils
   * doivent entendre exactement la même chose, chacun de son côté. C'est le
   * seul endroit où la règle de transposition dessert le propos.
   */
  retrouvaille(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const t = ctx.currentTime;
      // Fondamentale, quinte, octave, tierce à l'octave, double octave : les
      // premiers rangs de la série harmonique, dans l'ordre. C'est l'accord le
      // plus stable qui existe, et c'est exactement ce qu'on veut dire.
      const rapports = [1, 1.5, 2, 2.5, 3];
      rapports.forEach((r, i) => {
        this.cloche(PINCEAU_NOTE * r * 0.5, 2.6 + i * 0.55, 0.055 - i * 0.006, t + i * 0.16);
      });
    } catch {
      /* idem */
    }
  }

  /**
   * UNE CAISSE SE POSE — la même note, trois octaves plus bas.
   *
   * On y ajoute une quinte juste (×1,5) très effacée : deux fréquences en
   * rapport simple fusionnent en une seule sensation de masse. C'est ce qui
   * fait entendre un objet posé, et non une note jouée.
   */
  caisse(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const t = ctx.currentTime;
      const f = CAISSE_NOTE * this.facteur();
      const duree = CAISSE_DUREE * this.echelle;
      this.cloche(f, duree, 0.085, t);
      this.cloche(f * 1.5, duree * 0.35, 0.02, t);
    } catch {
      /* idem */
    }
  }

  /**
   * À appeler chaque image.
   *
   * Sa seule tâche : faire respirer le filtre du vent. On avance une phase
   * plutôt que d'utiliser un oscillateur basse fréquence, parce qu'une phase se
   * fige quand le jeu se fige — l'air ne doit pas continuer à souffler pendant
   * un menu de pause.
   */
  update(dt: number): void {
    if (!this.ctx || !this.ventFiltre) return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.phase = (this.phase + dt / VENT_PERIODE) % 1;
    // Lissage court : la valeur cible change à chaque image, autant la laisser
    // glisser plutôt que d'empiler des rampes.
    this.appliquerVent(0.12);
  }

  /**
   * LA RÈGLE UNIQUE : toute fréquence passe par ici.
   *
   * Grand joueur, monde grave ; petit joueur, monde aigu. Il n'y a volontairement
   * aucune autre correction — pas de courbe, pas de plancher, pas de plafond.
   * La proportion exacte est ce qui rend l'effet crédible.
   */
  private facteur(): number {
    return 1 / this.echelle;
  }

  /**
   * Le souffle : du bruit blanc filtré, en boucle, pour toujours.
   *
   * Deux secondes de bruit bouclées suffisent — l'oreille ne repère pas la
   * couture d'un bruit sans transitoire, et la lecture est décalée en
   * fréquence par l'échelle, ce qui brouille encore la période.
   */
  private construireVent(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const source = this.sourceBruit(2);
      if (!source) return;
      source.loop = true;

      const filtre = ctx.createBiquadFilter();
      filtre.type = 'lowpass';
      filtre.frequency.value = VENT_COUPURE;
      // Q à peine au-dessus du neutre : la moindre résonance transformerait le
      // souffle en sifflement de tuyau, et on l'entendrait pendant des heures.
      filtre.Q.value = 0.4;

      const g = ctx.createGain();
      // Très bas, et c'est voulu : ce souffle ne doit se remarquer qu'à
      // l'instant où on le coupe.
      g.gain.value = 0.055;

      source.connect(filtre).connect(g).connect(maitre);
      source.start();

      this.ventSource = source;
      this.ventFiltre = filtre;
      this.appliquerVent(0.01);
    } catch {
      this.ventFiltre = null;
      this.ventSource = null;
    }
  }

  /** Transpose le vent et lui donne sa respiration. */
  private appliquerVent(constante: number): void {
    const ctx = this.ctx;
    const filtre = this.ventFiltre;
    if (!ctx || !filtre) return;
    try {
      const respire = 1 + Math.sin(this.phase * Math.PI * 2) * VENT_RESPIRATION;
      const cible = VENT_COUPURE * this.facteur() * respire;
      // Bornes larges, uniquement pour rester dans le domaine audible : à
      // échelle extrême, une coupure hors bande rendrait le vent muet ou
      // strident.
      filtre.frequency.setTargetAtTime(
        Math.max(40, Math.min(6000, cible)),
        ctx.currentTime,
        constante,
      );
      // La vitesse de lecture du bruit suit la même loi : un grand joueur
      // entend l'air passer plus lentement sur lui.
      if (this.ventSource) {
        this.ventSource.playbackRate.setTargetAtTime(
          Math.max(0.1, Math.min(4, this.facteur())),
          ctx.currentTime,
          constante,
        );
      }
    } catch {
      /* idem */
    }
  }

  /** Applique volume et coupure au gain maître, en fondu court. */
  private appliquerMaitre(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      // Jamais un saut de gain : une coupure instantanée fait un clic.
      maitre.gain.setTargetAtTime(this.coupe ? 0 : this.volume, ctx.currentTime, 0.05);
    } catch {
      /* idem */
    }
  }

  /**
   * Une note qui s'éteint toute seule.
   *
   * Attaque de quelques millisecondes puis décroissance exponentielle : c'est
   * le profil de tout ce qui est frappé ou pincé. Une décroissance linéaire
   * s'entendrait comme un fondu d'ingénieur du son.
   */
  private cloche(frequence: number, duree: number, niveau: number, t: number): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    // Hors du domaine audible, on ne joue rien : aux échelles extrêmes, cela
    // évite des ultra-graves qui ne feraient que saturer les haut-parleurs.
    if (!(frequence > 20 && frequence < 16000)) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequence;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(niveau, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);

    osc.connect(g).connect(maitre);
    osc.start(t);
    osc.stop(t + duree + 0.02);
  }

  /**
   * Un tampon de bruit blanc, fabriqué à la demande.
   *
   * Le bruit est la matière première de trois des cinq sons d'ici : le vent, le
   * pas et le froissement. Le fabriquer coûte quelques milliers de tirages
   * aléatoires, ce qui est négligeable devant une image de rendu.
   */
  private sourceBruit(secondes: number): AudioBufferSourceNode | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    try {
      const n = Math.max(1, Math.floor(ctx.sampleRate * secondes));
      const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      return source;
    } catch {
      return null;
    }
  }
}
