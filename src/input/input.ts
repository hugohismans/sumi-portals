import type { InputCommand } from '../core/types.js';

const LOOK_SENSITIVITY = 0.0022;

/**
 * Écart de souris au-delà duquel on considère l'événement aberrant, en pixels.
 *
 * Une souris rapide parcourt cent à cent cinquante pixels entre deux images.
 * Trois cent vingt est donc largement au-dessus de tout mouvement humain, et
 * très en dessous des milliers de pixels que le navigateur rapporte parfois au
 * moment de reprendre la capture du curseur.
 *
 * CE N'EST QU'UN PLAFOND, et c'était le bug. Les faux écarts de Chrome sous
 * Windows valent 35 % de la fenêtre (voir le garde-fou de `mousemove`) : 580
 * en largeur pour une zone de jeu de 1 659 pixels, mais 317 en hauteur pour
 * une zone de 905 — sous le seuil. Le seuil réel se proportionne donc à la
 * fenêtre : voir `LIMITE_RELATIVE`.
 */
const SAUT_ABERRANT = 320;

/**
 * La part de la fenêtre au-delà de laquelle un écart est un faux. Les faux
 * écarts de Chrome en valent au moins 0,35, dans la dimension de l'axe ; un
 * quart laisse de la marge. Une main n'y arrive qu'en balayant pendant qu'une
 * image gèle : on perd alors un bout de geste, la vue colle un instant — ce
 * qui vaut mieux qu'un bond.
 *
 * La fenêtre se mesure dans l'unité des écarts. Chrome les donne en pixels de
 * l'écran, que le zoom de la page ne change pas, et la fenêtre en pixels de
 * la page, qu'il change : à 67 % de zoom elle paraît une fois et demie plus
 * haute, et le seuil laissait repasser les faux. Le rapport des largeurs
 * extérieure et intérieure donne ce zoom ; ailleurs il vaut 1.
 */
const LIMITE_RELATIVE = 0.25;

/**
 * En souris brute, les écarts sont des comptes de la souris et non des pixels :
 * une souris de joueur à 3 200 points par pouce en fait des centaines par image
 * sans rien d'anormal. On ne jette que ce qu'aucune main ne produit.
 */
const SAUT_ABERRANT_BRUT = 2000;

/** Après la prise de capture, on jette les écarts pendant ce temps, en ms. */
const APRES_CAPTURE = 80;

/** Un pointeur précis existe-t-il (souris, pavé) ? Voir `echecDeCapture`. */
const pointeurPrecis = (): boolean => window.matchMedia?.('(any-pointer: fine)').matches ?? false;

/**
 * Le recentrage qui fabrique les faux écarts n'existe que sous Windows : c'est
 * là seulement qu'on demande la souris brute. Ailleurs la capture est native,
 * et la brute ne ferait que retirer l'accélération dont la main a l'habitude.
 */
const SOUS_WINDOWS = typeof navigator !== 'undefined' && /Windows/.test(navigator.userAgent);
/** Chromium, où l'on sait que l'option change la source des écarts. */
const CHROMIUM =
  typeof navigator !== 'undefined' &&
  ('userAgentData' in navigator || /\b(Chrome|Chromium|Edg)\//.test(navigator.userAgent));

/** Une touche tapée dans un champ de texte n'est pas une commande. */
export const estUneSaisie = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement &&
  (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES RÉGLAGES DE LA SOURIS, par l'adresse, et gardés d'une page à l'autre.
 *
 *   ?sens=1.5          la sensibilité, multipliée (de 0,2 à 5)
 *   ?souris=ordinaire  la capture ordinaire, sans souris brute
 *   ?souris=brute      la souris brute à nouveau (sous Windows)
 *
 * La souris brute ignore le curseur de Windows : sa vitesse, et l'« amélioration
 * de la précision » qui accélère les gestes vifs. Le même geste ne tourne donc
 * plus tout à fait de la même quantité qu'avant. On ne sait pas corriger ça
 * d'office — la page ne voit aucun de ces réglages — : on donne la main.
 * Gardés hors des sauvegardes de partie, que « Recommencer l'aventure » efface.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const CLE_REGLAGES = 'sumi.souris';
const lireReglages = (): { sens: number; ordinaire: boolean } => {
  const r = { sens: 1, ordinaire: false };
  try {
    const brut = localStorage.getItem(CLE_REGLAGES);
    const lu = brut ? (JSON.parse(brut) as Partial<typeof r>) : {};
    if (typeof lu.sens === 'number' && lu.sens > 0) r.sens = lu.sens;
    if (typeof lu.ordinaire === 'boolean') r.ordinaire = lu.ordinaire;
  } catch {
    /* Stockage fermé : les réglages par défaut. */
  }
  if (typeof location === 'undefined') return r;
  const params = new URLSearchParams(location.search);
  let change = false;
  const sens = Number(params.get('sens'));
  if (params.has('sens') && Number.isFinite(sens) && sens > 0) {
    r.sens = Math.min(5, Math.max(0.2, sens));
    change = true;
  }
  const souris = params.get('souris');
  if (souris === 'ordinaire' || souris === 'brute') {
    r.ordinaire = souris === 'ordinaire';
    change = true;
  }
  if (change) {
    try {
      localStorage.setItem(CLE_REGLAGES, JSON.stringify(r));
    } catch {
      /* Pas gardé : il vaudra pour cette page. */
    }
  }
  return r;
};

/** Au doigt, on balaie moins vite qu'à la souris pour le même geste. */
const TOUCH_LOOK_SENSITIVITY = 0.0042;

/** Rayon du manche virtuel, en pixels : au-delà, on va à fond. */
const STICK_RADIUS = 62;

/**
 * Faut-il basculer d'emblée en mode tactile ?
 *
 * On ne cherche PAS à deviner l'appareil. Renifler les navigateurs, c'est la
 * garantie que ça marchera sur un téléphone et pas sur l'autre — un iPad avec
 * clavier, un portable à écran tactile, un navigateur qui ment sur son
 * identité. On ne teste donc qu'un fait vérifiable et pertinent : la capture
 * de pointeur existe-t-elle ? Sinon, il n'y a pas d'autre choix que le doigt.
 *
 * Et de toute façon ce test n'est qu'une amorce : le premier contact tactile
 * réel bascule le jeu, quel que soit ce que l'appareil prétend être.
 */
const pointerLockUnavailable = (): boolean =>
  typeof Element === 'undefined' || !('requestPointerLock' in Element.prototype);

/**
 * Clavier + souris → commandes.
 *
 * On lit `event.code` (position physique de la touche) et non `event.key`,
 * ce qui fait marcher AZERTY et QWERTY sans configuration.
 */
export class InputManager {
  private readonly keys = new Set<string>();
  private mouseDown = false;
  /** Vrai dès qu'on joue au doigt. Peut basculer en cours de route. */
  touchOnly = pointerLockUnavailable();
  /** Prévenu au basculement, pour que l'interface se réorganise. */
  onTouchMode: (() => void) | null = null;
  private touchWired = false;
  private moveTouch: number | null = null;
  private lookTouch: number | null = null;
  private moveX = 0;
  private moveY = 0;
  /** Vrai juste après la prise de capture : le premier écart est suspect. */
  private premierMouvement = false;
  /** Jusqu'à quand (horloge des événements) les écarts sont suspects. */
  private suspectJusqua = 0;
  /**
   * LA SOURIS EST-ELLE BRUTE : les comptes du capteur, lus par le navigateur
   * sans recentrer de curseur ni appliquer l'accélération du système. Voir
   * `verrouiller`. Lisible de l'extérieur pour le débug.
   */
  brute = false;
  /** Ce qu'a demandé la capture en vol : la réponse ne dit pas laquelle a réussi. */
  private bruteDemandee = false;
  /** Le navigateur a refusé l'option une fois : on ne la lui redemande plus. */
  private bruteRefusee = false;
  /** Le refus vient d'arriver : il ne vaut que si la capture ordinaire, elle, réussit. */
  private repliProvisoire = false;
  /** Écarts nuls d'affilée en brute : voir `renoncerALaBrute`. */
  private immobiles = 0;
  /**
   * Le jeu a rendu la souris exprès (carnet, fin, sacre) : rien ne doit la
   * reprendre tout seul — ni une nouvelle tentative programmée, ni un clic.
   */
  private rendue = false;
  /** Les réglages de l'adresse : voir `lireReglages`. */
  private readonly reglages = lireReglages();
  /**
   * Une demande est en vol : un second clic n'en lance pas une autre (Chrome
   * la refuserait, et ce refus compterait). Datée, pour qu'une promesse qui ne
   * répondrait jamais ne ferme pas le jeu pour de bon.
   */
  private demandeEnVol = false;
  private demandeDepuis = 0;
  /** Le navigateur répond par une promesse : c'est elle qui dit l'échec. */
  private repondParPromesse = false;
  /** Les écarts aberrants jetés, pour le débug : combien, et le dernier. */
  readonly ecartsJetes = { nombre: 0, dernier: '' };
  /** Trois refus de capture d'affilée sur un ordinateur : on le dit. Voir `echecDeCapture`. */
  onLockRefused: ((raison: string) => void) | null = null;
  private yaw: number;
  private pitch = 0;
  locked = false;
  onReset: (() => void) | null = null;
  onLockChange: ((locked: boolean) => void) | null = null;
  onCapture: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialYaw: number,
  ) {
    this.yaw = initialYaw;
    this.bruteRefusee = this.reglages.ordinaire;

    window.addEventListener('keydown', (e) => {
      // Les notes du carnet : taper « r » y relançait le niveau, les chiffres
      // changeaient de pinceau, et l'espace ne s'écrivait pas.
      if (estUneSaisie(e.target)) return;
      this.keys.add(e.code);
      if (e.code === 'KeyR') this.onReset?.();
      if (e.code === 'KeyC') this.onCapture?.();
      if (e.code === 'Space') e.preventDefault();
      // TOURNER LA PIÈCE TENUE — voir `Simulation.tournerLaPiece`. La touche T
      // fait ce que fait la molette ; les flèches, tant qu'on tient quelque
      // chose, donnent des quarts de tour au lieu de déplacer. Une impulsion
      // par appui : la répétition automatique du clavier ferait tourner la
      // pièce en toupie.
      if (e.repeat) return;
      if (e.code === 'KeyT') this.crans += e.shiftKey ? -1 : 1;
      // LES CHIFFRES DE LA RANGÉE DU HAUT CHOISISSENT LE PINCEAU, par leur
      // place sur le clavier (`code`, pas `key`) : un AZERTY y donne « & é " »
      // sans majuscule, mais c'est bien la touche 1, 2, 3. Pas le pavé
      // numérique : il est aux sauts des repères de débug (`?debug=1`).
      const chiffre = /^Digit([1-9])$/.exec(e.code);
      if (chiffre) this.choix = Number(chiffre[1]);
      if (this.tenue) {
        if (e.code === 'ArrowLeft') this.lacets -= 1;
        if (e.code === 'ArrowRight') this.lacets += 1;
        if (e.code === 'ArrowUp') this.bascules += 1;
        if (e.code === 'ArrowDown') this.bascules -= 1;
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
    });
    // LA MOLETTE, UN CRAN PAR CRAN. Une souris envoie un événement par cran,
    // de cent pixels environ (ou trois lignes) : c'est un quart de tour, ni
    // plus ni moins — la première version en comptait deux. Un pavé tactile,
    // lui, envoie des pas minuscules et nombreux : on les accumule, et l'on
    // ne tourne qu'une fois le glissement équivalent à un cran, pour qu'un
    // effleurement ne fasse pas tourner la pièce six fois.
    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.locked) return;
        e.preventDefault();
        const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
        if (Math.abs(d) >= 50) {
          this.crans += Math.sign(d);
          this.molette = 0;
          return;
        }
        this.molette += d;
        if (Math.abs(this.molette) >= 100) {
          this.crans += Math.sign(this.molette);
          this.molette = 0;
        }
      },
      { passive: false },
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.keys.clear();
      else {
        // On jette ce qui suit la prise de capture : le navigateur y rapporte
        // parfois l'écart depuis la dernière position absolue du curseur,
        // c'est-à-dire un bond de plusieurs milliers de pixels. Pas seulement
        // le premier événement — le bond peut arriver au deuxième, derrière un
        // petit écart légitime qui aurait « consommé » la garde. Voir le
        // garde-fou de `mousemove`.
        this.premierMouvement = true;
        this.suspectJusqua = performance.now() + APRES_CAPTURE;
        this.brute = this.bruteDemandee;
        this.lockFailures = 0;
        if (this.retryHandle !== null) {
          window.clearTimeout(this.retryHandle);
          this.retryHandle = null;
        }
      }
      this.onLockChange?.(this.locked);
    });

    // Chrome refuse la capture pendant une seconde environ après une sortie par
    // Échap. On retente une fois plutôt que d'abandonner : sinon le joueur
    // clique, rien ne se passe, et il croit le jeu bloqué.
    //
    // UN REFUS NE SE COMPTE QU'UNE FOIS. Le navigateur qui répond par une
    // promesse la rejette ET lève cet événement : on comptait donc chaque refus
    // deux fois, et le deuxième refus d'une séance basculait un ordinateur en
    // commandes tactiles. Quand il y a une promesse, c'est elle qui compte.
    document.addEventListener('pointerlockerror', () => {
      if (!this.repondParPromesse) this.echecDeCapture('');
    });

    // UN CLIC DE SOURIS REPREND LA CAPTURE, MÊME EN COMMANDES TACTILES. Sur un
    // portable à écran tactile, un seul doigt posé bascule le jeu au doigt, et
    // la souris ne tournait plus la vue de la séance : la capture n'était plus
    // jamais redemandée. Un clic sur le jeu, souris en main, la redemande —
    // sauf si le jeu l'a rendue exprès.
    document.addEventListener('pointerdown', (e) => {
      if (!this.touchOnly || e.pointerType !== 'mouse' || this.rendue) return;
      if (document.pointerLockElement === this.canvas || pointerLockUnavailable()) return;
      const cible = e.target as HTMLElement | null;
      if (cible !== this.canvas && cible?.id !== 'touch-surface') return;
      this.verrouiller();
    });

    // Clic gauche pour lancer — mais seulement souris capturée, sinon le clic
    // qui sert à revenir dans le jeu enverrait la caisse au loin.
    document.addEventListener('mousedown', (e) => {
      if (this.locked && e.button === 0) this.mouseDown = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener('blur', () => {
      this.mouseDown = false;
    });

    document.addEventListener('mousemove', (e) => {
      // La souris ne tourne la tête que CAPTURÉE. En commandes tactiles on est
      // « entré » sans capture, et un curseur libre qui sort de la fenêtre et y
      // revient rapporte des écarts de plusieurs centaines de pixels.
      if (!this.locked || document.pointerLockElement !== this.canvas) return;

      // ─── LE GARDE-FOU DES ÉCARTS ABERRANTS ────────────────────────────────
      //
      // Bug signalé en jouant : « de temps en temps, sans raison, comme si
      // j'étais téléporté en rotation ». C'était bien ça, et ce n'était pas le
      // jeu — c'est le navigateur.
      //
      // `movementX` est censé donner l'écart depuis le mouvement précédent.
      // Mais au moment où la capture du curseur est prise ou reprise, il
      // rapporte parfois l'écart depuis la dernière position ABSOLUE du
      // curseur : plusieurs milliers de pixels d'un coup. La vue pivote d'un
      // bloc, une fois de temps en temps, de façon impossible à reproduire —
      // exactement le symptôme décrit.
      //
      // Deux gardes, et aucun ne coûte quoi que ce soit à un mouvement normal :
      // on jette ce qui suit la prise de capture, et on jette tout écart
      // au-delà d'un seuil qu'aucune main n'atteint entre deux images.
      //
      // ─── ET LE SEUIL SUIT LA FENÊTRE ──────────────────────────────────────
      //
      // Signalé une seconde fois : « parfois ça saute d'un coup, comme si je
      // faisais un grand mouvement, la vue monte ou descend carrément à mes
      // pieds ». Toujours à la verticale, jamais à l'horizontale.
      //
      // Sous Windows, Chrome n'a pas de vraie capture : il laisse filer un
      // curseur invisible et le ramène au centre dès qu'il entre dans la bande
      // des 15 % au bord de la fenêtre. Un mouvement de souris produit AVANT
      // ce recentrage et traité APRÈS rapporte l'écart entre le bord et le
      // centre : au moins 35 % de la fenêtre sur cet axe, dans le sens de la
      // main (Chromium, `kMouseLockBorderPercentage` ; crbug 40547981 ; les
      // rapports de joueurs le disent plus fréquent avec une souris à 1 000
      // Hz). Pour une zone de jeu de 1 659 × 905 pixels — un écran de 1 080
      // moins la barre d'adresse —, ça fait 580 en largeur, que le seuil fixe
      // de 320 jetait, et 317 en hauteur : ils passaient, et la vue bondissait
      // de quarante degrés.
      //
      // Un seuil fixe ne peut pas suivre un faux écart qui se proportionne à
      // la fenêtre. On borne donc chaque axe au quart de sa dimension. Et
      // surtout on n'en a plus besoin là où ça comptait : la capture BRUTE
      // (voir `verrouiller`) lit les comptes du capteur, sans curseur à
      // recentrer, donc sans faux écart.
      if (this.premierMouvement || e.timeStamp < this.suspectJusqua) {
        this.premierMouvement = false;
        return;
      }
      if (this.brute) {
        // Une souris qui bouge ne donne pas trente écarts nuls d'affilée.
        if (e.movementX === 0 && e.movementY === 0) {
          if (++this.immobiles >= 30) this.renoncerALaBrute();
          return;
        }
        this.immobiles = 0;
      }
      const zoom =
        window.outerWidth > 0 && window.innerWidth > 0 ? Math.min(1, window.outerWidth / window.innerWidth) : 1;
      const limiteX = this.brute
        ? SAUT_ABERRANT_BRUT
        : Math.min(SAUT_ABERRANT, window.innerWidth * zoom * LIMITE_RELATIVE);
      const limiteY = this.brute
        ? SAUT_ABERRANT_BRUT
        : Math.min(SAUT_ABERRANT, window.innerHeight * zoom * LIMITE_RELATIVE);
      if (Math.abs(e.movementX) > limiteX || Math.abs(e.movementY) > limiteY) {
        this.noterEcart(e);
        return;
      }

      const sens = LOOK_SENSITIVITY * this.reglages.sens;
      this.yaw -= e.movementX * sens * this.sensLateral;
      this.pitch -= e.movementY * sens;
      const limit = Math.PI / 2 - 0.02;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    });

    // Le vrai déclencheur : un doigt qui se pose. Aucun reniflage d'appareil
    // ne vaut cette preuve directe, et elle marche partout, sans exception.
    window.addEventListener(
      'touchstart',
      () => this.enableTouchMode(),
      { passive: true, once: true },
    );

  }

  /**
   * À appeler UNE fois, après avoir branché les rappels.
   *
   * Le mode tactile ne s'active surtout pas depuis le constructeur : sur iPhone
   * il s'y déclenchait aussitôt, alors que l'interface n'était pas encore
   * abonnée. Les boutons apparaissaient bien, mais l'ordre de masquer le
   * panneau d'accueil partait dans le vide — et l'on restait bloqué devant un
   * écran qui ne répondait pas.
   */
  start(): void {
    if (this.touchOnly) this.enableTouchMode();
  }

  /**
   * Bascule en commandes tactiles. Peut être appelée autant de fois qu'on veut :
   * le câblage ne se fait qu'une fois, mais l'entrée dans le jeu est retentée à
   * chaque appel — c'est ce qui rattrape un rappel branché entre-temps.
   */
  enableTouchMode(): void {
    this.touchOnly = true;
    if (!this.touchWired) {
      this.touchWired = true;
      this.setupTouch();
      this.onTouchMode?.();
    }
    // Le panneau d'accueil attend une capture de souris qui ne viendra jamais :
    // on entre directement, sinon le joueur reste bloqué devant.
    if (!this.locked) {
      this.locked = true;
      this.onLockChange?.(true);
    }
  }

  /**
   * Commandes tactiles.
   *
   * Partage de l'écran : le pouce gauche mène le déplacement — le manche naît
   * là où le doigt se pose, plutôt qu'à un endroit fixe, ce qui évite d'avoir
   * à viser une zone sans la regarder. Le côté droit fait pivoter le regard.
   * Les boutons, eux, sont en HTML : ils gèrent seuls leur propre survol et
   * leur zone de contact.
   */
  private setupTouch(): void {
    const start = new Map<number, { x: number; y: number }>();

    const onStart = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        const gauche = t.clientX < window.innerWidth * 0.45;
        if (gauche && this.moveTouch === null) {
          this.moveTouch = t.identifier;
          start.set(t.identifier, { x: t.clientX, y: t.clientY });
        } else if (!gauche && this.lookTouch === null) {
          this.lookTouch = t.identifier;
          start.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      }
    };

    const onMove = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        const origin = start.get(t.identifier);
        if (!origin) continue;

        if (t.identifier === this.moveTouch) {
          const dx = t.clientX - origin.x;
          const dy = t.clientY - origin.y;
          const len = Math.hypot(dx, dy) || 1;
          const amp = Math.min(1, len / STICK_RADIUS);
          this.moveX = (dx / len) * amp;
          this.moveY = (-dy / len) * amp;
        } else if (t.identifier === this.lookTouch) {
          this.yaw -= (t.clientX - origin.x) * TOUCH_LOOK_SENSITIVITY * this.sensLateral;
          this.pitch -= (t.clientY - origin.y) * TOUCH_LOOK_SENSITIVITY;
          const limit = Math.PI / 2 - 0.02;
          this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
          // Le regard suit le doigt en continu : l'origine se déplace avec lui.
          origin.x = t.clientX;
          origin.y = t.clientY;
        }
      }
      e.preventDefault();
    };

    const onEnd = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        start.delete(t.identifier);
        if (t.identifier === this.moveTouch) {
          this.moveTouch = null;
          this.moveX = 0;
          this.moveY = 0;
        }
        if (t.identifier === this.lookTouch) this.lookTouch = null;
      }
    };

    const surface = document.getElementById('touch-surface') ?? document.body;
    surface.addEventListener('touchstart', onStart as EventListener, { passive: true });
    surface.addEventListener('touchmove', onMove as EventListener, { passive: false });
    surface.addEventListener('touchend', onEnd as EventListener, { passive: true });
    surface.addEventListener('touchcancel', onEnd as EventListener, { passive: true });
  }

  /** Boutons tactiles : maintenus tant que le doigt reste dessus. */
  bindTouchButton(el: HTMLElement, code: string): void {
    const down = (e: Event): void => {
      e.preventDefault();
      this.keys.add(code);
      if (code === 'Mouse0') this.mouseDown = true;
      // « Tourner » est une impulsion, comme la touche T : un toucher, un cran.
      if (code === 'KeyT') this.crans += 1;
    };
    const up = (): void => {
      this.keys.delete(code);
      if (code === 'Mouse0') this.mouseDown = false;
    };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: true });
    el.addEventListener('touchcancel', up, { passive: true });
  }

  private retryHandle: number | null = null;
  private lockFailures = 0;

  requestLock(): void {
    this.rendue = false;
    if (this.locked) return;
    // Sur téléphone, il n'y a pas de capture de pointeur : on entre simplement
    // dans le jeu. Sans ce cas, l'appel échouait en silence et le panneau
    // d'accueil restait à l'écran pour toujours — le jeu paraissait mort.
    // (Une souris branchée reprend la capture d'un clic : voir `pointerdown`.)
    if (this.touchOnly) {
      this.locked = true;
      this.onLockChange?.(true);
      return;
    }
    this.verrouiller();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LA CAPTURE, BRUTE QUAND LE NAVIGATEUR SAIT LA DONNER.
   *
   * `unadjustedMovement` demande au navigateur les comptes du capteur de la
   * souris au lieu d'un curseur invisible qu'il recentre : sous Windows, Chrome
   * cesse alors tout recentrage, et les faux écarts qui faisaient bondir la vue
   * n'ont plus de source (voir le garde-fou de `mousemove`). L'accélération du
   * système disparaît du même coup : la vue tourne de la même quantité pour le
   * même geste, vite ou lentement.
   *
   * On ne la demande que sous Windows, seul lieu du recentrage (voir
   * `SOUS_WINDOWS`), et jamais si le joueur l'a refusée (`?souris=ordinaire`).
   * Là où l'option n'existe pas, le navigateur rejette avec
   * `NotSupportedError`, ou l'ignore : on redemande aussitôt une capture
   * ordinaire — le clic vaut encore — et l'on ne redemande plus l'option de la
   * séance, si du moins la capture ordinaire réussit (Firefox donne la même
   * erreur pour un échec quelconque). Ce refus-là ne compte pas comme un échec.
   *
   * On ne tient la capture pour brute que chez Chromium, où l'on sait que
   * l'option change la source des écarts : un navigateur qui l'accepterait
   * sans l'appliquer garderait sinon ses faux écarts, sans le garde-fou qui
   * les arrête. Firefox 152 l'applique aussi, mais on l'y traite en ordinaire :
   * le seuil de la fenêtre, appliqué à des comptes, ne coûte presque rien.
   *
   * `sansOption` : la dernière tentative d'une série de refus se fait sans
   * l'option, au cas où ce serait elle qu'un navigateur refuse sans le dire.
   * ═══════════════════════════════════════════════════════════════════════
   */
  private verrouiller(sansOption = false): void {
    if (document.pointerLockElement === this.canvas) return;
    if (this.demandeEnVol && performance.now() - this.demandeDepuis < 3000) return;
    const brute = !sansOption && !this.bruteRefusee && SOUS_WINDOWS;
    let reponse: Promise<void> | undefined;
    try {
      // Selon les navigateurs, l'appel renvoie une promesse ou rien du tout.
      reponse = (brute
        ? this.canvas.requestPointerLock({ unadjustedMovement: true })
        : this.canvas.requestPointerLock()) as unknown as Promise<void> | undefined;
    } catch {
      // Un navigateur ancien lève au lieu de rejeter.
      if (brute) {
        this.bruteRefusee = true;
        this.verrouiller();
      } else this.echecDeCapture('');
      return;
    }
    this.bruteDemandee = brute && CHROMIUM;
    // Pas de promesse : l'option est ignorée, et l'échec viendra par l'événement.
    if (!reponse || typeof reponse.then !== 'function') {
      this.bruteDemandee = false;
      return;
    }
    this.repondParPromesse = true;
    this.demandeEnVol = true;
    this.demandeDepuis = performance.now();
    reponse.then(
      () => {
        this.demandeEnVol = false;
        this.repliProvisoire = false;
      },
      (err: unknown) => {
        this.demandeEnVol = false;
        if (document.pointerLockElement === this.canvas) return;
        const nom = (err as { name?: string } | null)?.name ?? '';
        if (brute && nom === 'NotSupportedError') {
          this.bruteRefusee = true;
          this.repliProvisoire = true;
          this.verrouiller();
          return;
        }
        // La capture ordinaire échoue aussi : le refus ne disait rien de l'option.
        if (this.repliProvisoire) {
          this.repliProvisoire = false;
          this.bruteRefusee = this.reglages.ordinaire;
        }
        this.echecDeCapture(nom);
      },
    );
  }

  /**
   * TRENTE ÉCARTS NULS D'AFFILÉE EN BRUTE : la souris n'en est pas une. Un
   * bureau à distance, une machine virtuelle, une tablette à stylet donnent
   * des positions et non des déplacements, et Chrome n'en tire aucun écart en
   * brute — la vue ne tournait plus du tout. On repasse en capture ordinaire,
   * sans geste : Chrome accepte qu'on change les options d'une capture tenue.
   * S'il refuse, on rend la souris, et le clic suivant la reprend ordinaire.
   */
  private renoncerALaBrute(): void {
    this.immobiles = 0;
    this.bruteRefusee = true;
    this.brute = false;
    try {
      const r = this.canvas.requestPointerLock() as Promise<void> | undefined;
      if (r && typeof r.then === 'function') r.then(undefined, () => document.exitPointerLock());
    } catch {
      document.exitPointerLock();
    }
  }

  /**
   * LE JEU REND LA SOURIS EXPRÈS : le carnet, la fin, le sacre. Une tentative
   * programmée après un refus la reprenait sinon une seconde plus tard, au
   * milieu du carnet ; et un clic sur le décor, en commandes tactiles.
   */
  rendre(): void {
    this.rendue = true;
    if (this.retryHandle !== null) {
      window.clearTimeout(this.retryHandle);
      this.retryHandle = null;
    }
    document.exitPointerLock();
  }

  /**
   * Un refus de capture. On retente après le délai de garde imposé par le
   * navigateur ; au troisième refus d'affilée, on cesse de retenter.
   */
  private echecDeCapture(raison: string): void {
    // Un refus persistant signifie que cet appareil n'en veut pas : plutôt que
    // de laisser le joueur devant un panneau qui ne répond pas, on lui donne
    // les commandes tactiles. Mieux vaut un jeu jouable qu'un jeu conforme.
    //
    // SAUF SUR UN ORDINATEUR QU'ON JOUE À LA SOURIS. Les commandes tactiles y
    // laissaient une souris libre tourner la vue sans capture, avec les bonds
    // d'un curseur qui sort de la fenêtre et y revient ; et trois refus d'un
    // simple délai de garde suffisaient, du temps où chacun comptait double.
    // On cesse de retenter, et l'on dit pourquoi (`onLockRefused`) : le
    // panneau reste, et le clic suivant redemande.
    if (this.lockFailures++ >= 2) {
      if (!pointeurPrecis() || this.touchOnly) this.enableTouchMode();
      else this.onLockRefused?.(raison);
      return;
    }
    if (this.retryHandle !== null) return;
    const derniere = this.lockFailures >= 2;
    this.retryHandle = window.setTimeout(() => {
      this.retryHandle = null;
      if (!this.rendue && document.pointerLockElement !== this.canvas) this.verrouiller(derniere);
    }, 1400);
  }

  /** Garde trace d'un écart jeté : le seul moyen d'en parler sans le reproduire. */
  private noterEcart(e: MouseEvent): void {
    this.ecartsJetes.nombre++;
    this.ecartsJetes.dernier =
      `${e.movementX}, ${e.movementY} ` +
      `(fenêtre ${window.innerWidth}×${window.innerHeight}, ${this.brute ? 'brute' : 'ordinaire'})`;
  }

  /** Recale l'orientation après une traversée (le portail fait pivoter le regard). */
  setYaw(yaw: number): void {
    this.yaw = yaw;
  }

  setPitch(pitch: number): void {
    this.pitch = pitch;
  }

  private axis(negative: string[], positive: string[]): number {
    let v = 0;
    for (const c of positive) if (this.keys.has(c)) v += 1;
    for (const c of negative) if (this.keys.has(c)) v -= 1;
    return Math.max(-1, Math.min(1, v));
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DE QUEL CÔTÉ EST LA DROITE, ET CE N'EST PAS TOUJOURS LE MÊME.
   *
   * Vaut −1 quand le joueur a franchi un nombre impair de portes miroirs : le
   * monde lui apparaît alors inversé gauche-droite.
   *
   * Sans ça, tout se retourne SAUF les commandes : on pousse la souris à
   * droite et l'image part à gauche, on appuie sur D et l'on va vers la
   * gauche. Le joueur n'y lit pas une réflexion, il y lit une manette cassée —
   * et c'est le genre de détail qui fait abandonner une mécanique avant de
   * l'avoir comprise.
   *
   * L'inclinaison, elle, ne bouge jamais : un miroir vertical échange la
   * gauche et la droite, il ne met pas le ciel en bas.
   * ═══════════════════════════════════════════════════════════════════════
   */
  private sensLateral = 1;
  setGauchere(v: boolean): void {
    this.sensLateral = v ? -1 : 1;
  }

  /** Impulsions de rotation en attente, vidées à chaque échantillon. */
  private crans = 0;
  private lacets = 0;
  private bascules = 0;
  private molette = 0;
  /** Le pinceau désigné par un chiffre, ou par un doigt sur l'inventaire. 0 : aucun. */
  private choix = 0;
  choisirPinceau(n: number): void {
    this.choix = n;
  }
  /**
   * Tient-on une pièce ? Les flèches la tournent alors au lieu de déplacer
   * le joueur ; ZQSD ou WASD, eux, marchent toujours.
   */
  private tenue = false;
  setTenue(v: boolean): void {
    this.tenue = v;
  }

  sample(): InputCommand {
    const crans = this.crans;
    const lacets = this.lacets;
    const bascules = this.bascules;
    const choix = this.choix;
    this.choix = 0;
    this.crans = 0;
    this.lacets = 0;
    this.bascules = 0;
    // Pendant qu'on tient une pièce, les flèches sont à elle.
    const avant = this.tenue ? ['KeyW'] : ['KeyW', 'ArrowUp'];
    const arriere = this.tenue ? ['KeyS'] : ['KeyS', 'ArrowDown'];
    const gauche = this.tenue ? ['KeyA'] : ['KeyA', 'ArrowLeft'];
    const droite = this.tenue ? ['KeyD'] : ['KeyD', 'ArrowRight'];
    return {
      forward: this.moveY || this.axis(arriere, avant),
      strafe: (this.moveX || this.axis(gauche, droite)) * this.sensLateral,
      tourner: crans,
      // La droite de l'écran, même dans un monde en miroir : voir `sensLateral`.
      quartLacet: lacets * this.sensLateral,
      quartBascule: bascules,
      ...(choix > 0 ? { choisir: choix } : {}),
      jump: this.keys.has('Space'),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      // Maintenue telle quelle : c'est la simulation qui détecte le front, pour
      // que le comportement soit identique en local et sur un futur serveur.
      interact: this.keys.has('KeyE'),
      throwIt: this.mouseDown || this.keys.has('Mouse0'),
      yaw: this.yaw,
      pitch: this.pitch,
    };
  }
}
