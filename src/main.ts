import * as THREE from 'three';
import { TICK_DT, scaleOfLevel } from './core/constants.js';
import { Simulation } from './core/simulation.js';
import { InputManager } from './input/input.js';
import { LEVEL_01 } from './levels/level01.js';
import { BOIL_HZ, PAPER, inkUniforms, syncInkUniforms } from './render/ink.js';
import { PaperPass } from './render/paperPass.js';
import { PortalRenderer } from './render/portalRenderer.js';
import { buildGoalMarker, buildWorldView } from './render/worldMesh.js';

// --- Simulation ---------------------------------------------------------------
const sim = new Simulation(LEVEL_01);

// --- Rendu --------------------------------------------------------------------
// Pas de tampon de profondeur logarithmique : il exige que CHAQUE shader écrive
// lui-même sa profondeur, ce que des matériaux maison ne font pas — le tri des
// surfaces s'effondre et les contours disparaissent. On règle le problème
// autrement, en faisant suivre le plan proche ET le plan lointain de l'échelle
// du joueur (voir applyScale) : leur rapport reste alors constant.
const renderer = new THREE.WebGLRenderer({ antialias: true });
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

const worldView = buildWorldView(LEVEL_01);
scene.add(worldView.group);

const goalMarker = buildGoalMarker(LEVEL_01);
scene.add(goalMarker);

const portals = new PortalRenderer(
  sim.faces,
  LEVEL_01.portals,
  window.innerWidth,
  window.innerHeight,
);
scene.add(portals.group);

const paper = new PaperPass(window.innerWidth, window.innerHeight);

// --- Entrées ------------------------------------------------------------------
const input = new InputManager(renderer.domElement, LEVEL_01.spawnYaw);

// --- Interface ----------------------------------------------------------------
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const overlay = el('overlay');
const winPanel = el('win');
const scaleValue = el('scale-value');
const scaleSub = el('scale-sub');
const hintBox = el('hint');

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

input.onReset = () => {
  sim.reset();
  input.setYaw(LEVEL_01.spawnYaw);
  winPanel.classList.remove('show');
  applyScale(true);
};

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
resize();

// --- Boucle -------------------------------------------------------------------
let last = performance.now();
let accumulator = 0;
let boilTimer = 0;
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
    if (events.reachedGoal) {
      winPanel.classList.add('show');
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
  // Les surfaces de portail ne reçoivent PAS le grain : il est appliqué une
  // seule fois sur l'image finale, sinon le portail vibre comme un calque à part.

  // --- Objectif ---------------------------------------------------------------
  const ring = goalMarker.userData.ring as THREE.Mesh;
  ring.rotation.z += dt * 0.7;
  const pulse = 1 + Math.sin(inkUniforms.uTime.value * 2.2) * 0.07;
  goalMarker.scale.setScalar(pulse);

  // --- Indices ----------------------------------------------------------------
  updateHints(now);

  // --- Rendu ------------------------------------------------------------------
  camera.updateMatrixWorld(true);
  // À faire AVANT le rendu des vues : la surface doit déjà être écartée quand
  // les caméras virtuelles travaillent.
  portals.updateSurfaceOffsets(camera);
  portals.renderViews(renderer, scene, camera);

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
  for (const h of LEVEL_01.hints ?? []) {
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
