import * as THREE from 'three';
import { PLAYER_HEIGHT, TICK_DT, scaleOfLevel } from './core/constants.js';
import { Simulation } from './core/simulation.js';
import { InputManager } from './input/input.js';
import { LEVEL_01 } from './levels/level01.js';
import { LEVEL_02 } from './levels/level02.js';
import { LOBBY } from './levels/lobby.js';
import { MONDE } from './levels/monde.js';
import { Presence } from './net/presence.js';
import { BOIL_HZ, PAPER, inkUniforms, syncInkUniforms } from './render/ink.js';
import { PaperPass } from './render/paperPass.js';
import { PortalRenderer } from './render/portalRenderer.js';
import { Avatar } from './render/avatar.js';
import { Brush } from './render/brush.js';
import { CarryableViews } from './render/carryableViews.js';
import { SocketViews } from './render/socketViews.js';
import { RemotePlayers } from './render/remotePlayers.js';
import { buildGoalMarker, buildWorldView } from './render/worldMesh.js';

// --- Choix du niveau -----------------------------------------------------------
// Le passage d'un niveau à l'autre se fait par rechargement de la page plutôt
// que par reconstruction de la scène à chaud. C'est volontairement rustique :
// une seconde de chargement entre le hall et une énigme est indolore, et ça
// évite tout un mécanisme de démontage qui n'apporterait rien pour l'instant.
const MODE = new URLSearchParams(location.search).get('niveau');
const NIVEAUX: Record<string, typeof LEVEL_01> = {
  monde: MONDE,
  cour: LEVEL_01,
  caisse: LEVEL_02,
};
const EN_AVENTURE = MODE !== null && MODE in NIVEAUX;
const LEVEL = EN_AVENTURE ? NIVEAUX[MODE!] : LOBBY;
/** Enchaînement des énigmes. Le hall suit la fin de la dernière. */
const NIVEAU_SUIVANT: Record<string, string> = {
  monde: './',
  cour: '?niveau=caisse',
  caisse: '?niveau=monde',
};

// --- Simulation ---------------------------------------------------------------
const sim = new Simulation(LEVEL);

// --- Rendu --------------------------------------------------------------------
// Pas de tampon de profondeur logarithmique : il exige que CHAQUE shader écrive
// lui-même sa profondeur, ce que des matériaux maison ne font pas — le tri des
// surfaces s'effondre et les contours disparaissent. On règle le problème
// autrement, en faisant suivre le plan proche ET le plan lointain de l'échelle
// du joueur (voir applyScale) : leur rapport reste alors constant.
const renderer = new THREE.WebGLRenderer({ antialias: true });
// Les caisses à cheval sur un portail sont tranchées par des plans qui leur
// sont propres — d'où le découpage local, en plus du plan global des portails.
renderer.localClippingEnabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(PAPER, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = PAPER.clone();
// Le brouillard est réglé UNE fois et ne bouge plus jamais.
//
// Il suivait l'échelle du joueur, et c'était une erreur : en rapetissant,
// « l'air » devenait quatre fois plus épais, si bien que les mêmes bâtiments
// changeaient de couleur au moment précis de la traversée. Or l'air ne
// s'épaissit pas parce qu'on a rapetissé — une même distance, c'est la même
// quantité d'air. Le décor doit garder exactement la teinte qu'il avait.
scene.fog = new THREE.Fog(PAPER.clone(), 34, 300);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.02, 460);
camera.rotation.order = 'YXZ';

const worldView = buildWorldView(LEVEL);
scene.add(worldView.group);

const goalMarker = buildGoalMarker(LEVEL);
scene.add(goalMarker);

// Les autres joueurs. Vide hors du hall, mais toujours dans la scène : ils
// apparaîtront ainsi tout seuls dans les vues de portail, sans un mot de plus.
const remotePlayers = new RemotePlayers();
scene.add(remotePlayers.group);

const carryableViews = new CarryableViews();
carryableViews.build(sim.carryables.items);
scene.add(carryableViews.group);

const socketViews = new SocketViews();
socketViews.build(sim.sockets.items);
scene.add(socketViews.group);

// Le Pinceau. Il ne se montre que si le joueur tourne en rond — un joueur qui
// trouve seul ne le verra jamais, et c'est voulu.
const brush = new Brush(LEVEL.guide);
scene.add(brush.group);

// Le bonhomme du joueur local. Il vit dans la scène comme n'importe quel objet,
// donc il apparaît tout seul dans les vues de portail : on se voit soi-même, de
// dos et minuscule, à travers le grand torii.
const avatar = new Avatar(0x4c6b3c);
scene.add(avatar.group);

const portals = new PortalRenderer(
  sim.faces,
  LEVEL.portals,
  window.innerWidth,
  window.innerHeight,
);
scene.add(portals.group);

const paper = new PaperPass(window.innerWidth, window.innerHeight);

// --- Entrées ------------------------------------------------------------------
const input = new InputManager(renderer.domElement, LEVEL.spawnYaw);

// --- Interface ----------------------------------------------------------------
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const overlay = el('overlay');
const winPanel = el('win');
const scaleValue = el('scale-value');
const scaleSub = el('scale-sub');
const hintBox = el('hint');
const peersBox = el('peers');
const suiteEl = el<HTMLAnchorElement>('suite');
const fpsBox = el('fps');

const SCALE_LABELS: Record<number, [string, string]> = {
  [-2]: ['×1/16', 'seize fois plus petit'],
  [-1]: ['×1/4', 'quatre fois plus petit'],
  [0]: ['×1', 'taille normale'],
  [1]: ['×4', 'quatre fois plus grand'],
};

let hintText = '';
let flashUntil = 0;

const setHint = (text: string): void => {
  if (text === hintText) return;
  hintText = text;
  hintBox.textContent = text;
  hintBox.classList.toggle('show', text.length > 0);
};

const flash = (text: string, seconds = 2.4): void => {
  setHint(text);
  flashUntil = performance.now() + seconds * 1000;
};

// Le panneau réapparaît dès que la souris est relâchée (Échap, changement
// d'onglet, retour sur la page). Sans ça il disparaissait au premier clic et
// plus rien ne permettait de reprendre la main : le jeu semblait figé.
overlay.addEventListener('click', () => input.requestLock());

// --- Tactile ---------------------------------------------------------------
// Sur téléphone, il n'y a pas de capture de souris : le pouce gauche déplace,
// le côté droit fait pivoter le regard, et trois boutons font le reste.
//
// Le basculement peut survenir À TOUT MOMENT — au premier doigt posé, ou après
// un refus de capture — et pas seulement au démarrage. On s'abonne donc plutôt
// que de tester une fois pour toutes.
input.onTouchMode = () => {
  document.body.classList.add('touch');
  input.bindTouchButton(el('btn-take'), 'KeyE');
  input.bindTouchButton(el('btn-throw'), 'Mouse0');
  input.bindTouchButton(el('btn-jump'), 'Space');
};

// Filet de sécurité : un doigt posé sur le panneau d'accueil bascule aussi. Sur
// iPhone, le « clic » n'arrive parfois jamais, et l'on restait devant un écran
// muet — tandis qu'un contact tactile, lui, est toujours signalé.
overlay.addEventListener('touchstart', () => input.enableTouchMode(), { passive: true });

input.onLockChange = (locked) => {
  overlay.classList.toggle('hidden', locked);
  if (locked) overlay.classList.add('resumed');
};

/**
 * Touche C : copie le point de vue exact dans le presse-papiers.
 *
 * Sert à signaler un défaut visuel. Une capture d'écran montre CE QU'ON voit ;
 * cette ligne-là permet de se replacer au centimètre et au degré près pour
 * regarder la même chose. Les deux ensemble, et un bug « je ne sais pas
 * comment l'expliquer » devient reproductible.
 */
input.onCapture = () => {
  const p = sim.player.position;
  const line =
    `__game.tp(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}, ` +
    `${sim.player.scaleLevel}, ${sim.player.yaw.toFixed(3)}, ${sim.player.pitch.toFixed(3)})`;
  console.log(line);
  void navigator.clipboard?.writeText(line).then(
    () => flash('Point de vue copié — colle-le dans la conversation.'),
    () => flash('Point de vue affiché dans la console (F12).'),
  );
};

// Tous les rappels sont branchés : on peut réveiller les commandes.
input.start();

input.onReset = () => {
  sim.reset();
  input.setYaw(LEVEL.spawnYaw);
  winPanel.classList.remove('show');
  applyScale(true);
};

// --- Réseau --------------------------------------------------------------------
// Le hall est peuplé, l'Aventure se joue seul pour l'instant.
const presence = new Presence();
let presenceActive = false;
let transitionEnCours = false;

if (!EN_AVENTURE) {
  presence
    .join()
    .then(() => {
      presenceActive = true;
    })
    .catch((e: Error) => {
      // Le hall reste parfaitement jouable seul : le réseau est un supplément,
      // jamais une condition. Une panne de Firebase ne doit pas fermer le jeu.
      console.warn('Réseau indisponible :', e);
      flash('Hall hors ligne — tu es seul, mais le jeu marche.', 5);
    });

  // Départ propre quand on ferme l'onglet. Le serveur efface aussi la fiche de
  // son côté, mais autant ne pas dépendre uniquement de lui.
  window.addEventListener('pagehide', () => void presence.leave());
}

/** Franchir l'arche du hall lance la première énigme. */
function partirEnAventure(): void {
  if (transitionEnCours) return;
  transitionEnCours = true;
  flash('Départ pour l’Aventure…', 4);
  void presence.leave().finally(() => {
    location.search = '?niveau=monde';
  });
}

// --- Échelle ------------------------------------------------------------------
let renderedLevel = Number.NaN;

/**
 * Le peu qui dépend de la taille du joueur.
 *
 * Presque rien, en fait, et c'est voulu : le décor doit garder rigoureusement
 * la même apparence de part et d'autre d'une traversée. Seul le joueur change.
 * Ni le brouillard, ni les portails, ni les couleurs ne bougent.
 */
function applyScale(force = false): void {
  const level = sim.player.scaleLevel;
  if (!force && level === renderedLevel) return;
  renderedLevel = level;

  const scale = scaleOfLevel(level);

  // Le plan proche suit l'échelle — un joueur minuscule doit pouvoir coller son
  // œil aux choses — mais avec un plancher, sinon l'écart proche/lointain
  // devient tel que la profondeur perd toute précision et que les surfaces se
  // mettent à clignoter.
  camera.near = Math.max(0.02, 0.02 * scale);
  // Le plan lointain, lui, est FIXE et va au-delà du brouillard : s'il suivait
  // l'échelle, un joueur rapetissé verrait le décor lointain se faire trancher
  // net au lieu de se fondre dans le papier.
  camera.far = 460;
  camera.updateProjectionMatrix();

  const [value, sub] = SCALE_LABELS[level] ?? [`×${scale}`, ''];
  scaleValue.textContent = value;
  scaleSub.textContent = sub;
}

applyScale(true);

// --- Redimensionnement ---------------------------------------------------------
function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  portals.resize(w, h);
  paper.resize(w, h);
  inkUniforms.uResolution.value.set(w, h);
}
window.addEventListener('resize', resize);
// Sur téléphone, la barre d'adresse se replie en cours de partie et la rotation
// change tout : deux événements que `resize` seul ne couvre pas partout.
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
window.visualViewport?.addEventListener('resize', resize);
resize();

// --- Boucle -------------------------------------------------------------------
let last = performance.now();
let accumulator = 0;
let boilTimer = 0;
let fpsFrames = 0;
let fpsSince = performance.now();
const BOIL_PERIOD = 1 / BOIL_HZ;

function frame(now: number): void {
  requestAnimationFrame(frame);

  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  // --- Simulation à pas fixe --------------------------------------------------
  accumulator += dt;
  let guard = 0;
  while (accumulator >= TICK_DT && guard++ < 8) {
    const raw = input.sample();
    // Souris relâchée : on garde l'orientation mais on coupe les déplacements.
    const command = input.locked ? raw : { ...raw, forward: 0, strafe: 0, jump: false };
    const events = sim.step(command, TICK_DT);
    accumulator -= TICK_DT;

    if (events.traversed) {
      // Le portail a fait pivoter le regard : on recale la souris dessus,
      // sinon le prochain mouvement annulerait la rotation.
      input.setYaw(sim.player.yaw);
      applyScale();
    }
    if (events.refused) {
      flash(
        events.refused.reason === 'tooBig'
          ? 'Trop grand pour cette porte. Il faudrait rapetisser.'
          : 'Le portail refuse : échelle extrême atteinte.',
      );
    }
    if (events.carry) {
      flash(events.carry.taken ? 'Caisse en main. E pour la reposer.' : 'Caisse reposée.', 1.6);
    }
    if (events.socketFilled) {
      flash(
        sim.sockets.allFilled
          ? 'Tous les logements sont pourvus.'
          : `Emboîté. ${sim.sockets.filled} sur ${sim.sockets.total}.`,
        2.4,
      );
    }
    if (events.tooHeavy) {
      flash('Bien trop grosse à cette taille. Il faudrait grandir.', 2.6);
    }
    if (events.reachedGoal) {
      if (EN_AVENTURE) {
        suiteEl.setAttribute('href', NIVEAU_SUIVANT[MODE!] ?? './');
        suiteEl.textContent = MODE === 'caisse' ? 'retour au hall' : 'niveau suivant';
        winPanel.classList.add('show');
        // On rend la souris, sinon le lien du panneau est inatteignable.
        document.exitPointerLock();
      } else {
        partirEnAventure();
      }
    }
  }

  // --- Caméra -----------------------------------------------------------------
  const eye = sim.eyePosition();
  camera.position.set(eye.x, eye.y, eye.z);
  camera.rotation.set(sim.player.pitch, sim.player.yaw + Math.PI, 0);

  // --- Grain « dessiné », figé à 10 Hz ----------------------------------------
  boilTimer += dt;
  if (boilTimer >= BOIL_PERIOD) {
    boilTimer %= BOIL_PERIOD;
    inkUniforms.uSeed.value = Math.random() * 512;
  }
  inkUniforms.uTime.value += dt;
  syncInkUniforms(worldView.cel);
  syncInkUniforms(worldView.outline);
  const scale = scaleOfLevel(sim.player.scaleLevel);
  avatar.update(sim.player, scale, dt);
  avatar.syncInk();
  carryableViews.update(sim.carryables.items, sim.faces);
  carryableViews.syncInk();
  socketViews.update(sim.sockets.items, dt, inkUniforms.uTime.value);
  socketViews.syncInk();
  brush.update(sim.player, scale, dt, camera);

  // --- Les autres joueurs -----------------------------------------------------
  if (presenceActive) {
    // La vitesse est transmise en tailles de corps par seconde : le destinataire
    // peut alors animer la démarche sans rien savoir de l'échelle de l'émetteur.
    const speedInBodies =
      Math.hypot(sim.player.velocity.x, sim.player.velocity.z) / (scale * PLAYER_HEIGHT);
    presence.publish(sim.player, dt, speedInBodies);
    remotePlayers.sync(presence.getPeers());
    peersBox.textContent =
      remotePlayers.count === 0
        ? 'seul dans le hall'
        : remotePlayers.count === 1
          ? '1 autre joueur'
          : `${remotePlayers.count} autres joueurs`;
  }
  remotePlayers.update(dt);
  remotePlayers.syncInk();
  // Les surfaces de portail ne reçoivent PAS le grain : il est appliqué une
  // seule fois sur l'image finale, sinon le portail vibre comme un calque à part.

  // --- Objectif ---------------------------------------------------------------
  const ring = goalMarker.userData.ring as THREE.Mesh;
  ring.rotation.z += dt * 0.7;
  const pulse = 1 + Math.sin(inkUniforms.uTime.value * 2.2) * 0.07;
  goalMarker.scale.setScalar(pulse);

  // --- Cadence ----------------------------------------------------------------
  // Affichée en clair : c'est la seule mesure qui dise si le rendu tient sur un
  // appareil donné, et elle vaut mieux qu'une impression.
  fpsFrames++;
  if (now - fpsSince >= 700) {
    fpsBox.textContent = `${Math.round((fpsFrames * 1000) / (now - fpsSince))} images/s`;
    fpsFrames = 0;
    fpsSince = now;
  }

  // --- Indices ----------------------------------------------------------------
  updateHints(now);

  // --- Rendu ------------------------------------------------------------------
  camera.updateMatrixWorld(true);
  // À faire AVANT le rendu des vues : la surface doit déjà être écartée quand
  // les caméras virtuelles travaillent.
  portals.updateSurfaceOffsets(camera);

  // Bonhomme entier dans les vues de portail — sinon on s'y verrait décapité.
  avatar.setHeadVisible(true);
  portals.renderViews(renderer, scene, camera);

  // Mais pas de tête dans la vue principale : elle est pile dans la caméra.
  // Le buste et les jambes, eux, restent visibles quand on baisse les yeux.
  avatar.setHeadVisible(false);
  renderer.setRenderTarget(paper.target);
  renderer.clear();
  renderer.render(scene, camera);
  paper.render(renderer);
}

/**
 * Trappe de débogage : permet de se poser n'importe où, à n'importe quelle
 * échelle, depuis la console. Indispensable pour inspecter un portail sans
 * avoir à rejouer tout le niveau.
 *
 *   __game.tp(14, -11.8, 0, 0)   // fond du puits, taille normale
 */
(window as unknown as Record<string, unknown>).__game = {
  sim,
  camera,
  portals,
  avatar,
  brush,
  /** Fait venir le Pinceau tout de suite, sans attendre d'être perdu. */
  pinceau() {
    brush.summon();
    return 'le pinceau arrive';
  },
  presence,
  remotePlayers,
  get presenceActive() {
    return presenceActive;
  },
  /** Éprouve la liaison Firebase de bout en bout. Voir src/net/connection.ts. */
  async testReseau() {
    const { testConnection } = await import('./net/connection.js');
    const r = await testConnection();
    console.table(r);
    return r;
  },
  /**
   * Pose un second bonhomme, figé, à un endroit donné. Sert à juger l'allure du
   * personnage de face — et à préfigurer ce que donnera le multijoueur.
   */
  dummy(x: number, y: number, z: number, color = 0x8a4b6b, yaw = 0) {
    const other = new Avatar(color);
    other.update(
      {
        position: { x, y, z },
        velocity: { x: 0, y: 0, z: 0 },
        yaw,
        pitch: 0,
        scaleLevel: 0,
        grounded: true,
      },
      1,
      0,
    );
    scene.add(other.group);
    return other;
  },
  tp(
    x: number,
    y: number,
    z: number,
    level = sim.player.scaleLevel,
    yaw?: number,
    pitch?: number,
  ) {
    sim.player.position = { x, y, z };
    sim.player.velocity = { x: 0, y: 0, z: 0 };
    sim.player.scaleLevel = level;
    if (yaw !== undefined) {
      sim.player.yaw = yaw;
      input.setYaw(yaw);
    }
    if (pitch !== undefined) {
      sim.player.pitch = pitch;
      input.setPitch(pitch);
    }
    applyScale(true);
  },
};

function updateHints(now: number): void {
  if (now < flashUntil) return;
  if (sim.goalReached) {
    setHint('');
    return;
  }
  const p = sim.player.position;
  let found = '';
  for (const h of LEVEL.hints ?? []) {
    const dx = p.x - h.position[0];
    const dy = p.y - h.position[1];
    const dz = p.z - h.position[2];
    if (dx * dx + dy * dy + dz * dz < h.radius * h.radius) {
      found = h.text;
      break;
    }
  }
  setHint(found);
}

requestAnimationFrame(frame);
