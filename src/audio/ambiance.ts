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
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE LA LOI DEVIENT QUAND LES PALIERS VONT DE −5 À +3
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La loi ci-dessus est gardée telle quelle. Elle n'est pas discutée ici : elle
 * est mesurée. Voici ce qu'elle produit réellement, palier par palier, pour un
 * contexte à 48 kHz (Nyquist = 24 000 Hz) :
 *
 *   palier  taille   facteur | vent      pas (corps)   arpège        pinceau
 *   ────────────────────────────────────────────────────────────────────────
 *     −5    1/1024   ×1024   | 348 160   134 349 Hz    802 k…1,6 M   1,6 MHz
 *     −4    1/256    ×256    |  87 040    33 587       201 k…401 k   401 kHz
 *     −3    1/64     ×64     |  21 760     8 397        50 k…100 k   100 kHz
 *     −2    1/16     ×16     |   5 440     2 099        12 544…25 088  25 088
 *     −1    1/4      ×4      |   1 360       525         3 136…6 272    6 272
 *      0    1        ×1      |     340       131           784…1 568    1 568
 *     +1    4        ×0,25   |      85        33           196…392        392
 *     +2    16       ×0,0625 |      21         8            49…98          98
 *     +3    64       ×0,0156 |       5         2            12…25          25
 *
 * TROIS CONSTATS, dans l'ordre de gravité — et le plus grave n'est pas celui
 * qu'on croyait :
 *
 * 1. **LE DANGER N'EST PAS LA FRÉQUENCE, C'EST LA DURÉE.** Les fréquences
 *    étaient déjà gardées : le filtre du vent était borné à 6 000 Hz, `cloche()`
 *    refusait tout au-delà de 16 kHz, et les nœuds Web Audio bornent eux-mêmes
 *    leurs paramètres à Nyquist. Il n'y a donc jamais eu de repliement de
 *    spectre. Les DURÉES, elles, n'étaient bornées par rien et se multiplient
 *    aussi par l'échelle : à ×64 le Pinceau tient 108,8 s et un pas dure 8,3 s.
 *    Or la cadence des foulées est INDÉPENDANTE de la taille — la vitesse est
 *    proportionnelle à l'échelle (MOVE_SPEED × scale) et le pas se déclenche à
 *    la distance parcourue —, soit une foulée toutes les 0,13 s à pleine
 *    vitesse quelle que soit la taille. Un pas de 8,3 s, c'est donc SOIXANTE-
 *    QUATRE oscillateurs superposés à 2 Hz, chacun à 0,11 d'amplitude. C'est le
 *    seul endroit du fichier qui puisse réellement saturer une sortie.
 *
 * 2. **LA LOI CASSE DÉJÀ DANS L'ÉTENDUE JOUÉE, pas seulement aux garde-fous.**
 *    Le problème n'est pas ×1/1024, qui est censé être invivable. Il est à ×4
 *    et ×16, qui se jouent : à ×4 le corps du pas descend à 33 Hz puis 14 Hz,
 *    déjà sous ce qu'un haut-parleur d'ordinateur restitue ; à ×16 il est à
 *    8 Hz et la caisse à 12 Hz, donc refusée par la garde — un joueur géant
 *    pose une caisse et n'entend rien du tout. L'élargissement des paliers n'a
 *    rien cassé : il a révélé une rupture qui existait déjà.
 *
 * 3. **L'ARITHMÉTIQUE NE BOUCLE PAS, ET C'EST DÉMONTRABLE.** La palette occupe
 *    déjà de 82 Hz (PAS_CORPS) à 2 600 Hz (PORTAIL_HAUT), soit cinq octaves,
 *    à l'intérieur des neuf octaves audibles (30 Hz – 16 kHz). Il reste donc
 *    environ QUATRE octaves de voyage disponibles, c'est-à-dire deux crans. Or
 *    l'étendue jouée va de ×1/4 à ×16, soit trois crans, soit SIX octaves de
 *    voyage demandées. Six ne rentre pas dans quatre. Aucun réglage de bornes
 *    ne peut résoudre ça : c'est une soustraction.
 *
 * CE QU'ON A FAIT, ET CE QU'ON N'A PAS FAIT.
 *
 * On garde la loi exacte — c'est une décision de conception, et elle donne le
 * bon geste. On borne ce qu'elle PRODUIT, au plus près de chaque voix, dans la
 * bande où cette voix dit encore quelque chose. Les bornes ne corrigent pas la
 * loi : elles l'arrêtent proprement là où elle sort du monde audible, chaque
 * voix à son propre moment — le portail perd ses aigus avant que le pas ne
 * perde ses graves. Le paysage sonore ne se déplace donc pas d'un bloc, il
 * s'épuise voix par voix, et c'est exactement la sensation qu'on cherche :
 * la limite n'est pas énoncée, elle s'éprouve.
 *
 * On n'a PAS compressé la loi. Le constat 3 dit qu'il faudra le faire un jour
 * si l'on veut entendre une différence entre ×4 et ×16 — aujourd'hui, borné,
 * le vent y est identique. C'est une décision de goût qui appartient à
 * l'auteur, pas une panne à réparer en passant.
 */

/**
 * Le silence est l'état par défaut, et le volume reste bas.
 *
 * Ce jeu est contemplatif : le son est là pour qu'on remarque son absence
 * quand il s'arrête, pas pour se faire écouter. Dans le doute on baisse.
 */
const VOLUME_DEFAUT = 0.3;

/**
 * Borne une valeur. Une seule fonction pour tout le fichier, parce que toutes
 * les bornes d'ici disent la même chose : « la loi continue, mais nous, on ne
 * sait plus la jouer ».
 *
 * Une valeur non finie retombe sur la borne basse plutôt que de propager un NaN
 * jusqu'à un AudioParam, où il lèverait une exception et tuerait le son.
 */
const borner = (v: number, bas: number, haut: number): number =>
  Number.isFinite(v) ? Math.max(bas, Math.min(haut, v)) : bas;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA BANDE DES NOTES — où un sinus dit encore quelque chose.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 55 Hz en bas : c'est un la 1, et surtout c'est à peu près la limite basse
 * d'un haut-parleur d'ordinateur portable ou de téléphone. En dessous, on
 * n'économise pas du son : on dépense de l'amplitude pour du vide, et on fait
 * vibrer des membranes qui ne savent que claquer.
 *
 * 9 000 Hz en haut : au-delà, un sinus n'est plus une note mais un acouphène,
 * et beaucoup d'adultes ne l'entendent plus du tout — ce qui est le pire des
 * cas pour un jeu, puisque l'effet devient inaudible pour certains joueurs
 * seulement. 9 000 laisse intact tout ce qui se joue réellement (à ×1/4 le
 * Pinceau est mesuré à 6 272 Hz) et ne mord qu'à partir de ×1/16.
 *
 * CHANGEMENT DE PRINCIPE : l'ancienne garde REFUSAIT de jouer hors de
 * 20–16 000 Hz. Le résultat mesuré était pire que le mal — à ×16 une caisse
 * tombe à 12 Hz et ne produisait donc AUCUN son, et l'arpège perdait trois de
 * ses cinq notes à ×1/16, ce qui s'entend comme un accord cassé, pas comme un
 * monde extrême. On borne désormais au lieu de refuser : une note plaquée
 * contre le bord de la bande marque encore l'événement, une note absente
 * ressemble à un bogue.
 */
const NOTE_BASSE = 55;
const NOTE_HAUTE = 9000;

/**
 * Les fréquences de référence, toutes données pour l'échelle 1.
 *
 * Elles sont regroupées ici parce que ce sont les seules valeurs qu'on ait
 * réellement envie de retoucher à l'oreille — le reste est de la plomberie.
 */

/** Coupure moyenne du vent. Au-delà, un souffle devient un sifflement. */
const VENT_COUPURE = 340;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA BANDE DU VENT — et pourquoi ce ne sont pas les mêmes bornes.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le vent n'est pas une note, c'est un passe-bas sur du bruit : ses bornes
 * disent où le FILTRE cesse de filtrer, ce qui n'a rien à voir avec l'audible.
 *
 * 110 Hz en bas. L'ancienne borne était à 40 Hz, et c'était une fausse
 * sécurité : un passe-bas à 40 Hz sur du bruit à 0,055 d'amplitude, c'est du
 * silence sur tout ce qui n'est pas un caisson de basses. Or la loi exacte pin
 * le vent sur cette borne dès ×16 — autrement dit, dans l'état antérieur, LE
 * GÉANT N'AVAIT PAS DE VENT. À 110 Hz il en a un, très sombre, mais présent.
 *
 * 2 400 Hz en haut. L'ancienne borne était à 6 000 Hz, ce qui ne veut rien
 * dire : un passe-bas à 6 000 Hz sur du bruit blanc laisse passer du bruit
 * blanc. Le petit joueur n'entendait donc pas un vent aigu, il entendait un
 * souffle de magnétophone, et la respiration du filtre — ±45 % — était écrasée
 * contre la borne, donc inaudible elle aussi. À 2 400 Hz le filtre travaille
 * encore et le cycle de vingt-deux secondes s'entend jusqu'à ×1/16.
 *
 * Conséquence à assumer, et elle est le vrai coût de la loi exacte : le vent ne
 * se distingue plus que sur ×1/4 → ×1 → ×4 (1 360 / 340 / 110 Hz). À ×16 et
 * au-delà il est identique à ×4. C'est le constat 3 de l'en-tête, en une ligne.
 */
const VENT_BAS = 110;
const VENT_HAUT = 2400;

/**
 * COMPENSATION DE NIVEAU — ce qui empêche le géant d'entendre de la boue,
 * et le minuscule d'entendre un aspirateur.
 *
 * Un passe-bas sur du bruit blanc laisse passer une puissance proportionnelle à
 * sa coupure, donc une AMPLITUDE en racine carrée. Transposer le vent vers le
 * grave ne le rend pas seulement plus sombre, il le rend plus faible ; le
 * transposer vers l'aigu ne le rend pas seulement plus clair, il le rend plus
 * fort. À gain fixe, le souffle du petit joueur était 2,7 fois plus puissant
 * que celui du géant, alors que rien dans le propos ne demande ça.
 *
 * On rend donc au niveau ce que le filtre lui a pris : × racine(340 / coupure).
 * Le vent garde la même présence à toutes les tailles et ne change que de
 * couleur — ce qui est très exactement ce qu'on voulait dire. Noter qu'on ne
 * REMONTE aucun grave : on remet du niveau là où le filtre en a retiré. C'est
 * toute la différence entre un géant qui entend sombre et un géant qui entend
 * boueux.
 *
 * La compensation suit la coupure APRÈS bornage, sinon elle continuerait à
 * pousser le gain alors que le filtre, lui, ne bouge plus.
 */
const VENT_COMPENSATION_MIN = 0.35;
const VENT_COMPENSATION_MAX = 1.9;

/**
 * Niveau du souffle à l'échelle 1. Très bas, et c'est voulu : ce vent ne doit
 * se remarquer qu'à l'instant où on le coupe.
 */
const VENT_NIVEAU = 0.055;

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
 * Constante de temps de la glissade du vent quand la taille change.
 *
 * 0,09 s de constante, c'est 95 % du chemin en 0,27 s : le « quart de seconde »
 * que le code annonçait sans le tenir (voir setEchelle). C'est aussi l'ordre de
 * grandeur employé partout ailleurs dans le jeu pour rattraper une cible —
 * 0,11 s pour les silhouettes distantes, 0,12 s pour les caisses qui se posent.
 * Un son qui glisse au rythme des images ne s'entend pas comme un traitement.
 */
const GLISSADE_ECHELLE = 0.09;

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

/**
 * Durées de référence, en secondes, à l'échelle 1. Elles restent multipliées
 * par l'échelle : un grand corps met plus longtemps à faire ses gestes, et
 * c'est juste.
 *
 * MAIS ELLES SONT BORNÉES, et c'est la correction la plus urgente du fichier.
 * Multipliées sans limite, elles donnent à ×64 un Pinceau de 108,8 s et un pas
 * de 8,3 s. Or la CADENCE des foulées ne dépend pas de la taille : la vitesse
 * du joueur est proportionnelle à son échelle (MOVE_SPEED × scale dans
 * simulation.ts) et le pas est déclenché à la distance parcourue, si bien qu'on
 * entend une foulée toutes les 0,13 s à pleine vitesse, à ×1 comme à ×64. Un
 * pas de 8,3 s, ce sont donc soixante-quatre pas superposés, soixante-quatre
 * oscillateurs à 2 Hz et 0,11 d'amplitude : la seule façon connue de faire
 * saturer ce fichier.
 *
 * Les plafonds sont posés là où le geste reste lisible :
 *
 * • Le pas à 0,26 s : deux fois l'intervalle minimal entre deux foulées, donc
 *   au pire deux pas qui se chevauchent — un poids qui traîne un peu, ce qui
 *   est ce qu'on veut d'un géant, et jamais une bouillie.
 * • Le portail à 1,1 s : c'est un événement unique, il peut respirer ; au-delà
 *   le froissement de page devient un train qui passe.
 * • Le Pinceau à 3,4 s, le double de sa référence : « il part, on le regarde
 *   partir », pas « on l'attend ».
 * • La caisse à 1,7 s : une caisse qu'on entend décroître plus longtemps n'est
 *   plus posée, elle est lâchée dans un puits.
 *
 * Les planchers valent au moins 0,03 s, et ce n'est pas cosmétique : sous
 * 0,004 s la durée passait SOUS le temps d'attaque de l'enveloppe, et les
 * rampes de gain se retrouvaient dans le désordre chronologique. À ×1/1024 un
 * pas durait 0,13 ms et ne sonnait plus comme un pas mais comme un défaut.
 */
const PAS_DUREE = 0.13;
const PAS_DUREE_MIN = 0.03;
const PAS_DUREE_MAX = 0.26;
const PORTAIL_DUREE = 0.42;
const PORTAIL_DUREE_MIN = 0.1;
const PORTAIL_DUREE_MAX = 1.1;
const PINCEAU_DUREE = 1.7;
const PINCEAU_DUREE_MIN = 0.35;
const PINCEAU_DUREE_MAX = 3.4;
const CAISSE_DUREE = 0.85;
const CAISSE_DUREE_MIN = 0.2;
const CAISSE_DUREE_MAX = 1.7;

export class Ambiance {
  private ctx: AudioContext | null = null;
  private maitre: GainNode | null = null;

  /** Le souffle continu — créé une seule fois, jamais arrêté. */
  private ventFiltre: BiquadFilterNode | null = null;
  private ventSource: AudioBufferSourceNode | null = null;
  /** Son gain, gardé pour compenser ce que le filtre retire — voir VENT_COMPENSATION_*. */
  private ventGain: GainNode | null = null;

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
   * REPRENDRE APRÈS UN RETOUR DANS L'APPLICATION.
   *
   * Signalé sur iPhone : on quitte le jeu, on y revient, et le son ne repart
   * pas — parfois. C'est le comportement documenté des navigateurs mobiles :
   * mettre la page en arrière-plan SUSPEND l'AudioContext, et rien ne le réveille
   * de lui-même. Le contexte est toujours là, le graphe aussi, la musique
   * continue même d'avancer dans ses horloges — mais plus un son ne sort.
   *
   * Le « parfois » vient de là : selon la durée de l'absence et l'humeur du
   * système, la suspension arrive ou non. C'est le pire genre de défaut, celui
   * qu'on ne reproduit pas à volonté.
   *
   * On la branche donc sur tout ce qui ressemble à un retour — le retour de
   * visibilité, la reprise du focus, un toucher — et l'appel est inoffensif si
   * le contexte tourne déjà.
   */
  reprendre(): void {
    if (this.mort || !this.ctx) return;
    if (this.ctx.state === 'running') return;
    void this.ctx.resume().catch(() => undefined);
  }

  /**
   * L'échelle du joueur : 1 = normal, 4 = quatre fois plus grand.
   *
   * Le vent se transpose en glissant plutôt qu'en sautant : la traversée d'un
   * portail est déjà brutale à l'image, le son doit la rattraper au lieu de
   * claquer. Mais la glissade est programmée par update(), pas ici.
   *
   * Pourquoi : cette méthode est appelée à CHAQUE IMAGE, et update() aussi.
   * Toutes deux visaient le même AudioParam avec un setTargetAtTime au même
   * instant, ce qui, dans le modèle d'automation du Web Audio, fait que le
   * second remplace simplement le premier. La constante de 0,25 s annoncée ici
   * n'a donc jamais été celle qu'on entendait : c'était toujours celle
   * d'update(). On ne garde qu'un seul point d'application, et la constante
   * s'appelle désormais GLISSADE_ECHELLE, avec la valeur que ce commentaire
   * promettait depuis le début.
   */
  setEchelle(scale: number): void {
    // Un garde-fou franc : une échelle nulle ou négative produirait des
    // fréquences infinies, et un souffle infini est un cri.
    this.echelle = Number.isFinite(scale) && scale > 0.001 ? scale : 1;
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
      const duree = borner(PAS_DUREE * this.echelle, PAS_DUREE_MIN, PAS_DUREE_MAX);

      // Le corps : une chute de fréquence sur la durée du pas. C'est cette
      // chute, et non la note de départ, qui fait entendre un impact.
      //
      // C'est la voix qui manque de place le plus vite, parce qu'elle part déjà
      // très bas : à 82 Hz, deux octaves de descente suffisent à la sortir de
      // l'audible. On borne donc le BAS de la chute — c'est lui qui décide —
      // et le départ suit le même rapport 1,6 / 0,7. Sans ça, un joueur à ×4
      // n'entend plus ses pas du tout : 33 Hz puis 14 Hz, mesuré.
      //
      // 45 Hz, donc plus bas que NOTE_BASSE, et c'est volontaire : un impact
      // très bref n'est pas une note tenue, l'oreille en reconstruit la hauteur
      // à partir du transitoire et descend plus bas sans se plaindre.
      //
      // 1 300 Hz en haut, et là c'est l'inverse qui menace : à ×1/64 la loi
      // exacte lance le pas à 8 400 Hz. Un pas doit rester un poids qui tombe ;
      // au-delà de 3 000 Hz au départ (1 300 × 1,6/0,7) ce n'est plus un poids,
      // c'est un sifflet, et on l'entend sept fois par seconde.
      const bas = borner(PAS_CORPS * k * 0.7, 45, 1300);
      const corps = ctx.createOscillator();
      corps.type = 'sine';
      corps.frequency.setValueAtTime(bas * (1.6 / 0.7), t);
      corps.frequency.exponentialRampToValueAtTime(bas, t + duree);

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
        // Le grain a beaucoup plus de marge que le corps (900 Hz contre 82), et
        // c'est heureux : quand le corps du géant vient buter contre son
        // plancher, ce frottement reste le seul bord net qui fasse entendre un
        // contact. On lui laisse donc toute sa course, jusqu'à 200 Hz — en
        // dessous, un passe-bas sur du bruit ne laisse plus rien passer.
        filtre.frequency.value = borner(PAS_GRAIN * k, 200, NOTE_HAUTE);
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
      const duree = borner(PORTAIL_DUREE * this.echelle, PORTAIL_DUREE_MIN, PORTAIL_DUREE_MAX);

      const source = this.sourceBruit(0.6);
      if (!source) return;

      const filtre = ctx.createBiquadFilter();
      filtre.type = 'bandpass';
      // Q modeste : une bande trop étroite chanterait, et un papier ne chante
      // pas. On veut du souffle coloré, pas une note.
      filtre.Q.value = 1.4;
      // Les deux extrémités du balayage sont bornées séparément, si bien que la
      // course se RACCOURCIT au lieu de sortir de la bande : à ×1/64 le portail
      // ne monte plus jusqu'à 166 kHz, il froisse entre 12 kHz et 12 kHz, donc
      // il ne balaye plus — c'est un aigu qui s'est épuisé, et ça se comprend.
      // Ce bornage a aussi une raison numérique : un biquad dont la fréquence
      // approche Nyquist devient mal conditionné et peut produire ses propres
      // artefacts, indépendamment de ce qu'on lui demande.
      filtre.frequency.setValueAtTime(borner(PORTAIL_BAS * k, 60, NOTE_HAUTE), t);
      filtre.frequency.exponentialRampToValueAtTime(
        borner(PORTAIL_HAUT * k, 60, NOTE_HAUTE),
        t + duree,
      );

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
      const duree = borner(PINCEAU_DUREE * this.echelle, PINCEAU_DUREE_MIN, PINCEAU_DUREE_MAX);
      this.cloche(f, duree, 0.075, t);
      this.cloche(f * 2, duree * 0.6, 0.009, t);
    } catch {
      /* idem */
    }
  }

  /**
   * UNE TACHE D'ENCRE TOMBE SUR LA PORTE.
   *
   * Court, mat, un peu sourd — le contraire d'une cloche. Une goutte d'encre
   * sur du papier ne résonne pas : elle s'arrête net et s'étale. D'où une
   * enveloppe très brève sur une fréquence basse, et rien qui traîne.
   *
   * La hauteur monte légèrement à chaque coup (`rang`), si bien que la
   * succession dessine une petite phrase montante sans qu'on l'ait écrite. On
   * entend la porte se remplir.
   */
  tache(rang: number): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const t = ctx.currentTime;
      const f = 150 * Math.pow(1.09, rang) * this.facteur();
      this.cloche(f, 0.16, 0.08, t);
      // Un souffle très bref par-dessus : c'est lui qui fait « papier » plutôt
      // que « note ». Sans lui, on entend un instrument ; avec, on entend un
      // contact.
      this.cloche(f * 5.7, 0.05, 0.012, t);
    } catch {
      /* idem */
    }
  }

  /**
   * ON AVANCE — un arpège, une station du Pinceau de plus.
   *
   * Il manquait au jeu la chose la plus simple : un son qui dise « c'est
   * gagné, continue ». Les pas, le vent et les portails disent où l'on est ;
   * rien ne disait où l'on en est.
   *
   * **Il MONTE d'une station à l'autre**, et c'est tout son intérêt. Le même
   * accord répété n'aurait rien raconté ; celui-ci gravit la gamme en même
   * temps que vous gravissez le monde, si bien qu'on entend sa propre
   * progression sans avoir jamais regardé un compteur. Au dernier jalon, il
   * sonne une octave plus haut qu'au premier.
   *
   * La gamme est pentatonique — cinq degrés, aucun demi-ton. C'est ce qui la
   * rend impossible à faire sonner faux, et c'est aussi la couleur de l'estampe
   * qu'on cherche partout ailleurs dans ce jeu.
   */
  progression(etape: number, total: number): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const t = ctx.currentTime;
      // Gamme yo : seconde, quarte, quinte, sixte. Pas de tierce, pas de
      // sensible — rien qui appelle une résolution, donc rien qui sonne
      // « inachevé » quand on s'arrête au milieu du voyage.
      const degres = [1, 9 / 8, 4 / 3, 3 / 2, 27 / 16];
      const avance = total > 1 ? etape / (total - 1) : 0;
      // Une octave gagnée du premier au dernier jalon, répartie régulièrement.
      //
      // C'est la SEULE voix dont on borne la base plutôt que chaque note, et
      // c'est tout l'enjeu : cet arpège est un accord, il ne dit quelque chose
      // que si ses cinq degrés gardent leurs rapports. Borner note par note les
      // aurait écrasés les uns sur les autres contre le bord de la bande, et
      // l'ancienne garde faisait pire encore — mesuré à ×1/16, elle en refusait
      // trois sur cinq, si bien que le seul son chargé de dire « tu avances »
      // arrivait mutilé. En bornant la base, on déplace l'accord entier : il
      // change de registre mais reste le même accord, et il continue de MONTER
      // d'un jalon à l'autre, ce qui est sa seule vraie fonction.
      //
      // Le plafond est à 3 200 Hz plutôt qu'à NOTE_HAUTE : la note la plus
      // aiguë vaut le double de la base, donc 6 400 Hz, et un accord au-delà
      // n'est plus un accord mais un sifflement. 3 200 laisse intact ×1/4
      // (base mesurée à 3 136 Hz) et ne mord qu'à partir de ×1/16.
      const base = borner(
        PINCEAU_NOTE * 0.5 * Math.pow(2, avance) * this.facteur(),
        NOTE_BASSE,
        3200,
      );
      for (let i = 0; i < 4; i++) {
        this.cloche(base * degres[i], 1.1 - i * 0.12, 0.05 - i * 0.007, t + i * 0.085);
      }
      // Une dernière note une octave au-dessus de la première, à peine audible :
      // c'est elle qui donne l'impression que l'arpège « s'envole » plutôt que
      // de s'arrêter.
      this.cloche(base * 2, 1.6, 0.014, t + 0.36);
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
      const duree = borner(CAISSE_DUREE * this.echelle, CAISSE_DUREE_MIN, CAISSE_DUREE_MAX);
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
    // Le SEUL point où le vent est appliqué — voir setEchelle(). La cible
    // change à chaque image, qu'il s'agisse de la respiration ou d'un
    // changement de taille : une constante de temps unique les absorbe toutes
    // les deux, la respiration parce qu'elle est lente, la taille parce que
    // c'est précisément la glissade qu'on veut entendre.
    this.appliquerVent(GLISSADE_ECHELLE);
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
   * QUATRE secondes, et non deux. La version précédente disait que la lecture
   * décalée par l'échelle « brouille encore la période » : c'est le contraire.
   * Relire plus vite DIVISE la période — à ×1/4, une taille couramment jouée,
   * le tampon de deux secondes bouclait toutes les 0,5 s, et une couture qui
   * revient deux fois par seconde finit par s'entendre comme un motif. Quatre
   * secondes coûtent quelques centaines de milliers de tirages aléatoires, une
   * fois, au démarrage : rien du tout devant une image de rendu.
   */
  private construireVent(): void {
    const ctx = this.ctx;
    const maitre = this.maitre;
    if (!ctx || !maitre) return;
    try {
      const source = this.sourceBruit(4);
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
      // l'instant où on le coupe. C'est la valeur à ×1 ; appliquerVent() la
      // corrige ensuite selon la coupure réelle.
      g.gain.value = VENT_NIVEAU;

      source.connect(filtre).connect(g).connect(maitre);
      source.start();

      this.ventSource = source;
      this.ventFiltre = filtre;
      this.ventGain = g;
      this.appliquerVent(0.01);
    } catch {
      this.ventFiltre = null;
      this.ventSource = null;
      this.ventGain = null;
    }
  }

  /** Transpose le vent et lui donne sa respiration. */
  private appliquerVent(constante: number): void {
    const ctx = this.ctx;
    const filtre = this.ventFiltre;
    if (!ctx || !filtre) return;
    try {
      const respire = 1 + Math.sin(this.phase * Math.PI * 2) * VENT_RESPIRATION;
      const coupure = borner(VENT_COUPURE * this.facteur() * respire, VENT_BAS, VENT_HAUT);
      filtre.frequency.setTargetAtTime(coupure, ctx.currentTime, constante);

      // Le niveau rattrape ce que le filtre a pris. On calcule la compensation
      // sur la coupure MÉDIANE bornée — sans la respiration — pour qu'elle ne
      // suive que la taille du joueur : le cycle de vingt-deux secondes doit
      // s'entendre comme un changement de couleur, jamais comme un soufflet.
      if (this.ventGain) {
        const mediane = borner(VENT_COUPURE * this.facteur(), VENT_BAS, VENT_HAUT);
        const compense = borner(
          Math.sqrt(VENT_COUPURE / mediane),
          VENT_COMPENSATION_MIN,
          VENT_COMPENSATION_MAX,
        );
        this.ventGain.gain.setTargetAtTime(VENT_NIVEAU * compense, ctx.currentTime, constante);
      }

      // La vitesse de lecture du bruit suit la même loi : un grand joueur
      // entend l'air passer plus lentement sur lui.
      //
      // Mais elle est bornée bien plus serré qu'avant, et pour une raison qui
      // n'a rien à voir avec l'audible : relire le tampon plus vite RACCOURCIT
      // la boucle. L'ancienne borne autorisait ×4, donc une boucle de 0,5 s sur
      // un tampon de 2 s — et elle s'appliquait dès ×1/4, une taille qui se
      // joue. Un bruit blanc qui se répète deux fois par seconde n'est plus un
      // bruit : l'oreille finit par entendre le motif, et une fois qu'elle l'a
      // entendu elle ne peut plus l'oublier. Le commentaire de construireVent()
      // affirmait l'inverse — que la transposition « brouille la période ». La
      // mesure dit qu'elle la divise. À ×2 sur un tampon de quatre secondes, la
      // boucle fait encore deux secondes, ce qui reste sous le seuil.
      if (this.ventSource) {
        this.ventSource.playbackRate.setTargetAtTime(
          borner(this.facteur(), 0.25, 2),
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

    // On BORNE au lieu de REFUSER. L'ancienne garde renvoyait sans rien jouer
    // hors de 20–16 000 Hz, ce qui paraissait prudent et se mesure comme un
    // défaut : à ×16 une caisse tombe à 12 Hz et le joueur géant posait donc
    // ses caisses en silence complet, alors même que ×16 est une taille qui se
    // joue. Une note plaquée contre le bord de la bande reste un événement
    // qu'on entend arriver ; une note absente ressemble à un jeu cassé.
    const f = borner(frequence, NOTE_BASSE, NOTE_HAUTE);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;

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
