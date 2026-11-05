import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// O GLB contém a geometria, os materiais, a textura e o clip completo.
// Não há dependência do Blender para reproduzir a animação nesta página.
const viewport = document.querySelector('#viewport');
const status = document.querySelector('#loading');
const playButton = document.querySelector('#play');
const slider = document.querySelector('#time');
const timeLabel = document.querySelector('#time-label');
const phase = document.querySelector('#phase');
let renderer, mixer, model, action, duration = 12, playhead = 0, playing = false;
let selected = null, selectionBox = null, height = 1.55;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e8ebe6');
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 100);
camera.position.set(-1.75, 1.85, 3.25);

try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.appendChild(renderer.domElement);
} catch (error) {
  status.textContent = 'Não foi possível iniciar o 3D. Use um navegador com WebGL 2 ou veja as prévias PNG e MP4.';
  throw error;
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(.05, .57, .10);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * .49;
controls.minZoom = .5;
controls.maxZoom = 4;
controls.update();
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, .04);
scene.environment = environment.texture;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff, 0x68746b, 2));
const light = new THREE.DirectionalLight(0xfff6e6, 3.4);
light.position.set(-2, 3.5, 3);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
Object.assign(light.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -2, near: .1, far: 12 });
light.shadow.bias = -.0005;
light.shadow.normalBias = .005;
scene.add(light);
const fill = new THREE.DirectionalLight(0xdce9ff, 1.8);
fill.position.set(2, 2, -2);
scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e8ebe6', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -.008;
ground.receiveShadow = true;
scene.add(ground);

function resize() {
  const w = Math.max(viewport.clientWidth, 1), h = Math.max(viewport.clientHeight, 1);
  renderer.setSize(w, h);
  camera.left = -height * w / h / 2;
  camera.right = height * w / h / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);

function fit(exploded = false) {
  // Ajusta o campo de visão também para telas estreitas.
  const aspect = Math.max(.5, viewport.clientWidth / viewport.clientHeight);
  height = Math.max(exploded ? 1.95 : 1.48, (exploded ? 2.25 : 1.25) / aspect);
  camera.zoom = 1;
  camera.position.set(exploded ? -2.3 : -1.75, exploded ? 2.2 : 1.85, exploded ? 4.4 : 3.25);
  controls.target.set(.04, exploded ? .70 : .57, exploded ? .2 : .10);
  controls.update();
  resize();
}

function seek(seconds) {
  if (!mixer) return;
  playhead = THREE.MathUtils.clamp(seconds, 0, duration);
  // Reativa o clip após um salto para o fim. O tempo é controlado pela página.
  action.enabled = true;
  action.paused = false;
  mixer.setTime(Math.min(playhead, duration - .00001));
  slider.value = playhead;
  timeLabel.value = `${playhead.toFixed(1).replace('.', ',')} / ${duration.toFixed(1).replace('.', ',')} s`;
  phase.textContent = playhead < 1 || playhead > 11 ? 'Montado' : playhead < 6 ? 'Desmontagem' : playhead < 7.5 ? 'Vista explodida' : 'Remontagem';
}
function setPlaying(value) {
  playing = value;
  playButton.textContent = playing ? 'Ⅱ Pausar' : '▶ Reproduzir';
  playButton.setAttribute('aria-pressed', String(playing));
}
playButton.addEventListener('click', () => {
  if (!mixer) return;
  if (!playing) fit(true);
  setPlaying(!playing);
});
slider.addEventListener('input', () => { setPlaying(false); seek(Number(slider.value)); });
document.querySelector('#assembled').addEventListener('click', () => { setPlaying(false); seek(0); fit(false); });
document.querySelector('#exploded').addEventListener('click', () => { setPlaying(false); seek(6.25); fit(true); });
document.querySelector('#restart').addEventListener('click', () => { setPlaying(false); seek(0); fit(false); });
document.querySelector('#reset').addEventListener('click', () => fit(playhead > 1 && playhead < 11));

function select(object) {
  selected = object;
  if (selectionBox) { scene.remove(selectionBox); selectionBox.geometry.dispose(); selectionBox.material.dispose(); }
  selectionBox = object ? new THREE.Box3Helper(new THREE.Box3().setFromObject(object), 0x278677) : null;
  if (selectionBox) scene.add(selectionBox);
  const title = document.querySelector('#selection b');
  const detail = document.querySelector('#selection span');
  title.textContent = object?.userData.label || 'Rack telecom';
  const dims = object?.userData.dimensoes_mm;
  detail.textContent = dims ? `${dims.join(' × ')} mm · L × P × A aproximados` : 'Arraste para girar · role para aproximar';
  document.querySelectorAll('[data-object]').forEach(button => {
    const active = button.dataset.object === object?.name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
document.querySelector('#equipment').addEventListener('click', event => {
  const button = event.target.closest('[data-object]');
  if (button && model) select(model.getObjectByName(button.dataset.object));
});
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
let pointerStart = null;
renderer.domElement.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!model || !pointerStart || Math.hypot(event.clientX-pointerStart[0], event.clientY-pointerStart[1]) > 5) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer, camera);
  let target = raycaster.intersectObject(model, true)[0]?.object;
  while (target && !target.userData.label) target = target.parent;
  select(target || null);
});

try {
  const gltf = await new GLTFLoader().loadAsync('./rack-telecom.glb');
  model = gltf.scene;
  model.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(model);
  const clip = gltf.animations.find(c => c.name === 'Explosao_Remontagem') || gltf.animations[0];
  if (!clip) throw new Error('O GLB não contém o clip esperado.');
  duration = clip.duration;
  mixer = new THREE.AnimationMixer(model);
  action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  slider.max = duration;
  playButton.disabled = slider.disabled = false;
  status.hidden = true;
  fit(false);
  seek(0);
  // Interface pequena para integrar controles próprios ou verificar o exemplo.
  window.rackViewer = { model, mixer, clip, seek, fit, select, setPlaying,
    getState: () => ({ playhead, playing, duration, selected: selected?.name || null, drawCalls: renderer.info.render.calls }) };
} catch (error) {
  console.error(error);
  status.textContent = 'Não foi possível carregar o modelo. Abra pelo servidor local indicado no guia e mantenha os arquivos na mesma pasta.';
}

let previous = performance.now();
renderer.setAnimationLoop(now => {
  const delta = Math.min((now-previous)/1000, .1);
  previous = now;
  if (playing && mixer) seek((playhead + delta) % duration);
  controls.update();
  if (selected && selectionBox) selectionBox.box.setFromObject(selected);
  renderer.render(scene, camera);
});
