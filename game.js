import * as THREE from "three";

const canvas = document.getElementById("game");
const startScreen = document.getElementById("start");
const playButton = document.getElementById("play");
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const timerEl = document.getElementById("timer");
const enemiesEl = document.getElementById("enemies");
const elimsEl = document.getElementById("elims");
const healthBar = document.getElementById("healthBar");
const shieldBar = document.getElementById("shieldBar");
const staminaBar = document.getElementById("staminaBar");
const ammoEl = document.getElementById("ammo");
const materialsEl = document.getElementById("materials");
const fpsCounter = document.getElementById("fpsCounter");
const showFps = document.getElementById("showFps");
const qualitySelect = document.getElementById("qualitySelect");
const sensitivityRange = document.getElementById("sensitivityRange");
const botVisionRange = document.getElementById("botVisionRange");
const botCountSelect = document.getElementById("botCountSelect");
const hitmarker = document.getElementById("hitmarker");
const damageLayer = document.getElementById("damageLayer");
const minimap = document.getElementById("minimap");
const toast = document.getElementById("toast");
const crosshair = document.querySelector(".crosshair");
const adsReticle = document.getElementById("adsReticle");
const weaponSlots = [...document.querySelectorAll(".weapon-slot")];
const buildSlots = [...document.querySelectorAll(".buildbar .slot")];

const mapSize = 240;
const halfMap = mapSize / 2;
const keys = new Set();
const mouse = { yaw: 0, pitch: -0.18 };
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const miniCtx = minimap.getContext("2d");
const SETTINGS_KEY = "skyline-build-royale-settings-v2";

let renderer;
let scene;
let camera;
let player;
let weaponModel;
let solidObjects = [];
let climbables = [];
let bots = [];
let bullets = [];
let builds = [];
let loot = [];
let running = false;
let paused = false;
let startedAt = 0;
let lastFrameTime = performance.now();
let lastShotAt = 0;
let lastDamageAt = 0;
let lastEmptyToastAt = 0;
let isReloading = false;
let isFireHeld = false;
let activeWeapon = "rifle";
let activePiece = "wall";
let health = 100;
let shield = 40;
let stamina = 100;
let elims = 0;
let materials = 240;
let stormCenter = new THREE.Vector3(12, 0, -8);
let stormRadius = 84;
let stormRing;
let stormWall;
let weaponBobTime = 0;
let weaponMoveBlend = 0;
let weaponRecoil = 0;
let isAiming = false;
let aimBlend = 0;

const weaponHipPosition = new THREE.Vector3(0.38, -0.72, -1.12);
const weaponHipRotation = new THREE.Euler(0.03, Math.PI / 2 - 0.1, -0.06);
const weaponAimPosition = new THREE.Vector3(0.28, -0.62, -1.42);
const weaponAimRotation = new THREE.Euler(0.02, Math.PI / 2 - 0.04, -0.025);

applySavedSettings();

const weapons = {
  rifle: { label: "AR", damage: 24, ammo: 30, mag: 30, delay: 120, range: 95, spread: 0.018 },
  shotgun: { label: "SG", damage: 14, ammo: 8, mag: 8, delay: 650, range: 36, spread: 0.095, pellets: 7 },
  smg: { label: "SMG", damage: 14, ammo: 36, mag: 36, delay: 72, range: 55, spread: 0.034 },
};

const materialsLib = {};

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      showFps: showFps.checked,
      quality: qualitySelect.value,
      sensitivity: sensitivityRange.value,
      botVision: botVisionRange.value,
      botCount: botCountSelect.value,
    })
  );
}

function applySavedSettings() {
  const settings = loadSettings();
  showFps.checked = settings.showFps ?? showFps.checked;
  qualitySelect.value = settings.quality || qualitySelect.value;
  sensitivityRange.value = settings.sensitivity || sensitivityRange.value;
  botVisionRange.value = settings.botVision || botVisionRange.value;
  botCountSelect.value = settings.botCount || botCountSelect.value;
}

function makeMaterial(name, color, options = {}) {
  materialsLib[name] = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
  return materialsLib[name];
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3ff);
  scene.fog = new THREE.Fog(0x8fd3ff, 90, 360);

  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 600);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: qualitySelect.value !== "performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(qualitySelect.value === "performance" ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = qualitySelect.value !== "performance";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  solidObjects = [];
  climbables = [];

  createMaterials();
  createLights();
  createMap();
  createStormZone();
  createPlayer();
  spawnLoot();
  spawnBots(Number(botCountSelect.value || 12));
  updateHud();
  showToast("Drop in. Loot, build, survive.");
}

function createMaterials() {
  makeMaterial("grass", 0x49a752, { roughness: 0.9 });
  makeMaterial("road", 0x293241, { roughness: 0.7 });
  makeMaterial("water", 0x1487b9, { roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.82 });
  makeMaterial("wood", 0x9c6b3b, { roughness: 0.85 });
  makeMaterial("brick", 0xb5523f, { roughness: 0.82 });
  makeMaterial("metal", 0x8795a8, { roughness: 0.42, metalness: 0.35 });
  makeMaterial("skin", 0x5eead4, { roughness: 0.52 });
  makeMaterial("skin2", 0xfacc15, { roughness: 0.48, metalness: 0.05 });
  makeMaterial("bot", 0xfb7185, { roughness: 0.58 });
  makeMaterial("bot2", 0x60a5fa, { roughness: 0.58 });
  makeMaterial("loot", 0xfacc15, { roughness: 0.38, metalness: 0.12 });
}

function createLights() {
  scene.add(new THREE.HemisphereLight(0xdaf7ff, 0x3b612f, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0cf, 2.2);
  sun.position.set(70, 110, 55);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  scene.add(sun);
}

function createMap() {
  const groundGeometry = new THREE.PlaneGeometry(mapSize, mapSize, 44, 44);
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const edgeFalloff = THREE.MathUtils.clamp(1 - Math.max(Math.abs(x), Math.abs(y)) / halfMap, 0, 1);
    const height = (Math.sin(x * 0.055) + Math.cos(y * 0.047) + Math.sin((x + y) * 0.025)) * 0.72 * edgeFalloff;
    positions.setZ(i, height);
  }
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, materialsLib.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), materialsLib.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.22;
  scene.add(water);

  const shore = new THREE.Mesh(
    new THREE.TorusGeometry(halfMap - 4, 2.8, 8, 160),
    new THREE.MeshStandardMaterial({ color: 0xd7c184, roughness: 0.9 })
  );
  shore.rotation.x = Math.PI / 2;
  shore.position.y = 0.16;
  scene.add(shore);

  addBox(0, 0.04, -18, 210, 0.08, 7, materialsLib.road);
  addBox(28, 0.05, 22, 7, 0.08, 170, materialsLib.road);

  const towns = [
    [-48, -44, 0x64748b],
    [58, -56, 0x0891b2],
    [-62, 55, 0x16a34a],
    [62, 52, 0xb45309],
  ];

  towns.forEach(([cx, cz, color]) => {
    for (let i = 0; i < 7; i += 1) {
      const w = 7 + Math.random() * 7;
      const h = 7 + Math.random() * 15;
      const d = 7 + Math.random() * 7;
      const x = cx + (Math.random() - 0.5) * 36;
      const z = cz + (Math.random() - 0.5) * 36;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
      addBox(x, h / 2, z, w, h, d, mat, true);
    }
  });

  for (let i = 0; i < 75; i += 1) {
    const point = randomPoint(halfMap - 18);
    if (Math.hypot(point.x, point.z) < 18) continue;
    createTree(point.x, point.z);
  }

  for (let i = 0; i < 18; i += 1) {
    const point = randomPoint(halfMap - 30);
    const rockRadius = 2 + Math.random() * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 0), materialsLib.metal);
    rock.position.set(point.x, rockRadius * 0.58, point.z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    climbables.push({ x: point.x, z: point.z, radius: rockRadius * 1.15, height: rockRadius * 1.05, mesh: rock });
  }

  createAtmosphereDetails();
}

function createAtmosphereDetails() {
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, transparent: true, opacity: 0.82 });
  for (let i = 0; i < 14; i += 1) {
    const cloud = new THREE.Group();
    for (let p = 0; p < 4; p += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 3, 14, 9), cloudMaterial);
      puff.position.set(p * 4.2, Math.random() * 1.5, (Math.random() - 0.5) * 3);
      puff.scale.y = 0.36;
      cloud.add(puff);
    }
    const point = randomPoint(halfMap + 60);
    cloud.position.set(point.x, 42 + Math.random() * 16, point.z);
    cloud.rotation.y = Math.random() * Math.PI;
    scene.add(cloud);
  }

  const flowerColors = [0xfacc15, 0xfb7185, 0x5eead4, 0xe879f9];
  for (let i = 0; i < 120; i += 1) {
    const point = randomPoint(halfMap - 18);
    const flower = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.45, 5),
      new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], roughness: 0.8 })
    );
    flower.position.set(point.x, 0.28, point.z);
    flower.rotation.y = Math.random() * Math.PI;
    scene.add(flower);
  }
}

function createStormZone() {
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.95 });
  stormRing = new THREE.Mesh(new THREE.TorusGeometry(stormRadius, 0.38, 8, 192), ringMaterial);
  stormRing.rotation.x = Math.PI / 2;
  stormRing.position.set(stormCenter.x, 0.85, stormCenter.z);
  scene.add(stormRing);

  stormWall = new THREE.Mesh(
    new THREE.CylinderGeometry(stormRadius, stormRadius, 34, 128, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  stormWall.position.set(stormCenter.x, 17, stormCenter.z);
  scene.add(stormWall);
}

function addBox(x, y, z, w, h, d, mat, collidable = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.collidable = collidable;
  scene.add(mesh);
  if (collidable) {
    solidObjects.push({ x, z, radius: Math.max(w, d) * 0.56, height: h, mesh });
  }
  return mesh;
}

function createTree(x, z) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 4.5, 8), materialsLib.wood);
  trunk.position.y = 2.25;
  trunk.castShadow = true;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(3, 6.4, 9),
    new THREE.MeshStandardMaterial({ color: 0x19783b, roughness: 0.9 })
  );
  leaves.position.y = 6;
  leaves.castShadow = true;
  tree.add(trunk, leaves);
  tree.position.set(x, 0, z);
  scene.add(tree);
  solidObjects.push({ x, z, radius: 1.35, height: 6.5, mesh: tree });
}

function createPlayer() {
  player = new THREE.Group();
  player.position.set(0, 0, 30);
  const localBody = createCharacter(0x5eead4, 0xfacc15);
  localBody.visible = false;
  player.add(localBody);
  scene.add(player);

  weaponModel = createWeaponModel(activeWeapon);
  applyWeaponRestPose();
  camera.add(weaponModel);
  scene.add(camera);
}

function createCharacter(colorA, colorB) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorA, roughness: 0.54 });
  const accentMat = new THREE.MeshStandardMaterial({ color: colorB, roughness: 0.45 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0bd90, roughness: 0.72 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 1.35, 8, 18), bodyMat);
  body.position.y = 1.65;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 24, 16), skinMat);
  head.position.y = 2.88;
  head.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.13, 0.12), accentMat);
  visor.position.set(0, 2.91, 0.38);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.24, 0.14), accentMat);
  chest.position.set(0, 2.02, 0.52);
  group.add(body, head, visor, chest);
  return group;
}

function createWeaponModel(kind = "rifle") {
  const group = new THREE.Group();
  const tan = new THREE.MeshStandardMaterial({ color: 0xd5c18e, roughness: 0.42, metalness: 0.08 });
  const tanDark = new THREE.MeshStandardMaterial({ color: 0xbda56f, roughness: 0.55, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.46, metalness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x343b45, roughness: 0.58, metalness: 0.28 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa1a9b4, roughness: 0.38, metalness: 0.52 });

  if (kind === "shotgun") {
    group.add(gunBox(-0.2, 0, 0, 1.55, 0.36, 0.46, dark));
    group.add(gunCylinder(0.96, 0.02, 0, 2.4, 0.08, black));
    group.add(gunCylinder(0.86, -0.18, 0, 2.15, 0.075, metal));
    group.add(gunBox(-1.04, -0.02, 0, 0.9, 0.32, 0.42, tanDark, 0, 0, -0.14));
    group.add(gunBox(-0.2, -0.48, 0, 0.32, 0.82, 0.32, tanDark, 0, 0, -0.24));
    group.scale.setScalar(0.95);
    return group;
  }

  if (kind === "smg") {
    group.add(gunBox(0, 0, 0, 1.25, 0.34, 0.42, dark));
    group.add(gunCylinder(0.82, 0.02, 0, 1.25, 0.065, black));
    group.add(gunBox(-0.78, -0.02, 0, 0.55, 0.24, 0.36, tanDark));
    group.add(gunBox(-0.05, -0.52, 0, 0.28, 0.78, 0.27, dark, 0, 0, 0.06));
    group.add(gunBox(0.18, 0.3, 0, 0.72, 0.11, 0.18, metal));
    group.scale.setScalar(0.92);
    return group;
  }

  const body = gunBox(0, 0, 0, 1.75, 0.42, 0.48, tan);
  const upper = gunBox(0.12, 0.28, 0, 1.88, 0.08, 0.2, dark);
  const lowerRail = gunBox(0.72, -0.26, 0, 1.1, 0.1, 0.24, dark);
  const stock = gunBox(-1.28, 0.02, 0, 0.9, 0.34, 0.48, tanDark, 0, 0, -0.08);
  const stockPad = gunBox(-1.82, -0.02, 0, 0.11, 0.36, 0.42, black);
  const grip = gunBox(-0.35, -0.58, 0, 0.34, 0.86, 0.32, tanDark, 0, 0, -0.23);
  const mag = gunBox(0.3, -0.62, 0, 0.4, 0.92, 0.32, tanDark, 0, 0, 0.08);
  const barrel = gunCylinder(1.7, 0.03, 0, 1.85, 0.055, black);
  const muzzle = gunCylinder(2.68, 0.03, 0, 0.42, 0.105, dark);
  const frontSight = gunBox(1.26, 0.58, 0, 0.12, 0.42, 0.2, dark);
  const rearSight = gunBox(-0.48, 0.56, 0, 0.16, 0.34, 0.22, dark);
  group.add(body, upper, lowerRail, stock, stockPad, grip, mag, barrel, muzzle, frontSight, rearSight);

  for (let i = 0; i < 14; i += 1) {
    group.add(gunBox(-0.65 + i * 0.13, 0.37, 0, 0.04, 0.045, 0.22, metal));
  }

  for (let i = 0; i < 6; i += 1) {
    group.add(gunBox(0.42 + i * 0.16, -0.04, 0.255, 0.1, 0.07, 0.03, metal));
  }

  group.scale.setScalar(0.94);
  return group;
}

function gunBox(x, y, z, w, h, d, material, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  return mesh;
}

function gunCylinder(x, y, z, length, radius, material) {
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(x, y, z);
  barrel.castShadow = true;
  return barrel;
}

function refreshWeaponModel() {
  if (!camera || !weaponModel) return;
  camera.remove(weaponModel);
  weaponModel.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
  });
  weaponModel = createWeaponModel(activeWeapon);
  applyWeaponRestPose();
  camera.add(weaponModel);
}

function applyWeaponRestPose() {
  if (!weaponModel) return;
  weaponModel.position.copy(weaponHipPosition);
  weaponModel.rotation.copy(weaponHipRotation);
}

function updateWeaponSway(delta, isMoving, sprinting) {
  if (!weaponModel) return;
  const targetBlend = isMoving ? 1 : 0;
  weaponMoveBlend += (targetBlend - weaponMoveBlend) * Math.min(1, delta * 8);
  aimBlend += ((isAiming ? 1 : 0) - aimBlend) * Math.min(1, delta * 13);
  weaponBobTime += delta * (isMoving ? (sprinting ? 11.5 : 8.5) : 3);
  weaponRecoil = Math.max(0, weaponRecoil - delta * 7.5);

  const hipWeight = 1 - aimBlend;
  const walkBobX = Math.sin(weaponBobTime) * 0.035 * weaponMoveBlend * hipWeight;
  const walkBobY = Math.abs(Math.cos(weaponBobTime)) * 0.055 * weaponMoveBlend * hipWeight;
  const walkRoll = Math.sin(weaponBobTime) * 0.018 * weaponMoveBlend * hipWeight;
  const breath = Math.sin(performance.now() * 0.0018) * 0.008 * (0.35 + hipWeight * 0.65);
  const basePosition = weaponHipPosition.clone().lerp(weaponAimPosition, aimBlend);
  const baseRotation = new THREE.Euler(
    THREE.MathUtils.lerp(weaponHipRotation.x, weaponAimRotation.x, aimBlend),
    THREE.MathUtils.lerp(weaponHipRotation.y, weaponAimRotation.y, aimBlend),
    THREE.MathUtils.lerp(weaponHipRotation.z, weaponAimRotation.z, aimBlend)
  );

  weaponModel.position.set(
    basePosition.x + walkBobX,
    basePosition.y + walkBobY + breath,
    basePosition.z + weaponRecoil * (isAiming ? 0.1 : 0.18)
  );
  weaponModel.rotation.set(
    baseRotation.x - weaponRecoil * (isAiming ? 0.045 : 0.075) + walkBobY * 0.18,
    baseRotation.y + walkBobX * 0.22,
    baseRotation.z + walkRoll
  );
  weaponModel.scale.setScalar(THREE.MathUtils.lerp(0.94, 0.68, aimBlend));
  camera.fov += ((isAiming ? 54 : 68) - camera.fov) * Math.min(1, delta * 12);
  camera.updateProjectionMatrix();
  adsReticle.classList.toggle("visible", aimBlend > 0.55);
  crosshair.classList.toggle("aiming", aimBlend > 0.55);
}

function spawnLoot() {
  loot = [];
  for (let i = 0; i < 34; i += 1) {
    const p = i === 0 ? new THREE.Vector3(0, 0, 22) : randomPoint(halfMap - 24);
    const chest = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.35), materialsLib.loot);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.32, 1.5), materialsLib.metal);
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65 })
    );
    lid.position.y = 0.72;
    glow.rotation.x = Math.PI / 2;
    glow.position.y = -0.58;
    chest.add(box, lid, glow);
    chest.position.set(p.x, 0.8, p.z);
    chest.userData.kind = Math.random() > 0.5 ? "shield" : "ammo";
    chest.castShadow = true;
    scene.add(chest);
    loot.push(chest);
  }
}

function spawnBots(count) {
  bots = [];
  for (let i = 0; i < count; i += 1) {
    let p = randomPoint(halfMap - 18);
    while (p.distanceTo(player.position) < 40) p = randomPoint(halfMap - 18);
    const bot = new THREE.Group();
    bot.position.copy(p);
    bot.add(createCharacter(i % 2 ? 0xfb7185 : 0x60a5fa, 0xfacc15));
    bot.userData = {
      hp: 100,
      shield: 30,
      cooldown: Math.random(),
      target: randomPoint(halfMap - 24),
      aggroUntil: 0,
      alive: true,
    };
    scene.add(bot);
    bots.push(bot);
  }
}

function startGame() {
  if (running) return;
  if (!scene) init();
  running = true;
  paused = false;
  startedAt = performance.now();
  startScreen.classList.add("hidden");
  canvas.requestPointerLock?.();
  animate();
}

function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);
  if (!paused) {
    updatePlayer(delta);
    updateBots(delta);
    updateLoot(delta);
    updateBullets(delta);
    updateStorm(delta);
    updateHud();
    drawMinimap();
  }
  renderer.render(scene, camera);
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(Math.sin(mouse.yaw), 0, Math.cos(mouse.yaw));
  const right = new THREE.Vector3(Math.cos(mouse.yaw), 0, -Math.sin(mouse.yaw));
  const move = new THREE.Vector3();
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyA")) move.add(right);
  if (keys.has("KeyD")) move.sub(right);

  const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const isMoving = move.lengthSq() > 0;
  if (isMoving) {
    move.normalize();
    const speed = sprint && stamina > 4 ? 21 : 13.5;
    player.position.addScaledVector(move, speed * delta);
    stamina = Math.max(0, stamina - (sprint ? 22 : 8) * delta);
  } else {
    stamina = Math.min(100, stamina + 28 * delta);
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -halfMap + 5, halfMap - 5);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -halfMap + 5, halfMap - 5);
  resolveSolidCollisions(player.position, 1.05);
  const surfaceY = getSurfaceHeight(player.position.x, player.position.z);
  player.position.y += (surfaceY - player.position.y) * Math.min(1, delta * 12);
  player.rotation.y = mouse.yaw;

  const eye = player.position.clone().add(new THREE.Vector3(0, 2.62, 0));
  const lookDir = new THREE.Vector3(Math.sin(mouse.yaw), mouse.pitch, Math.cos(mouse.yaw)).normalize();
  camera.position.lerp(eye, 0.58);
  camera.lookAt(eye.clone().add(lookDir.multiplyScalar(12)));
  updateWeaponSway(delta, isMoving, sprint && stamina > 4);
}

function updateBots(delta) {
  const vision = Number(botVisionRange.value);
  const fireRange = Math.min(28, vision + 4);
  const now = performance.now();
  for (const bot of bots) {
    if (!bot.userData.alive) continue;
    const distToPlayer = flatDistance(bot.position, player.position);
    const isAggro = now < bot.userData.aggroUntil;
    const enemyBot = !isAggro && distToPlayer > vision * 0.75 ? findNearbyBot(bot, 34) : null;
    let target = bot.userData.target;

    if (distToPlayer < vision || isAggro) {
      target = player.position;
      bot.lookAt(player.position.x, bot.position.y, player.position.z);
      bot.userData.cooldown -= delta;
      if (distToPlayer < fireRange && bot.userData.cooldown <= 0 && now - lastDamageAt > 500) {
        bot.userData.cooldown = 0.9 + Math.random() * 1.2;
        const start = bot.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        const end = player.position.clone().add(new THREE.Vector3(0, 2.1, 0));
        addTracer(start, end, 0xfb7185);
        const hitChance = Math.max(0.16, 0.62 - distToPlayer * 0.018);
        if (Math.random() < hitChance) damagePlayer(6 + Math.random() * 7);
      }
    } else if (enemyBot) {
      target = enemyBot.position;
      bot.lookAt(enemyBot.position.x, bot.position.y, enemyBot.position.z);
      bot.userData.cooldown -= delta;
      const botDistance = flatDistance(bot.position, enemyBot.position);
      if (botDistance < 28 && bot.userData.cooldown <= 0) {
        bot.userData.cooldown = 0.9 + Math.random() * 1.35;
        addTracer(
          bot.position.clone().add(new THREE.Vector3(0, 2.2, 0)),
          enemyBot.position.clone().add(new THREE.Vector3(0, 2.1, 0)),
          0xffb86b
        );
        if (Math.random() < Math.max(0.18, 0.58 - botDistance * 0.014)) {
          damageBot(enemyBot, 6 + Math.random() * 8, "bot");
        }
      }
    } else if (bot.position.distanceTo(target) < 5 || Math.random() < 0.004) {
      bot.userData.target = randomPoint(halfMap - 20);
      target = bot.userData.target;
    }

    const dir = target.clone().sub(bot.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.1) {
      dir.normalize();
      bot.position.addScaledVector(dir, (5.4 + Math.random() * 1.6) * delta);
      bot.rotation.y = Math.atan2(dir.x, dir.z);
    }
    resolveSolidCollisions(bot.position, 0.9);
    bot.position.y = getSurfaceHeight(bot.position.x, bot.position.z);
  }
}

function updateLoot(delta) {
  for (let i = loot.length - 1; i >= 0; i -= 1) {
    const chest = loot[i];
    chest.rotation.y += delta * 1.4;
    chest.position.y = 0.8 + Math.sin(performance.now() * 0.004 + i) * 0.08;
    if (chest.position.distanceTo(player.position) < 4) {
      if (chest.userData.kind === "shield") shield = Math.min(100, shield + 25);
      weapons[activeWeapon].ammo = weapons[activeWeapon].mag;
      materials += 50;
      scene.remove(chest);
      loot.splice(i, 1);
      showToast("Chest opened: +50 mats, ammo, shield");
    }
  }
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const item = bullets[i];
    item.life -= delta;
    item.line.material.opacity = Math.max(0, item.life / 0.08);
    if (item.life <= 0) {
      scene.remove(item.line);
      item.line.geometry.dispose();
      item.line.material.dispose();
      bullets.splice(i, 1);
    }
  }
}

function updateStorm(delta) {
  if (!stormRing || !stormWall) return;
  stormRing.rotation.z += delta * 0.22;
  const pulse = 1 + Math.sin(performance.now() * 0.0025) * 0.01;
  stormRing.scale.set(pulse, pulse, pulse);
  stormWall.material.opacity = 0.1 + Math.sin(performance.now() * 0.003) * 0.025;

  if (flatDistance(player.position, stormCenter) > stormRadius && performance.now() - lastDamageAt > 650) {
    damagePlayer(4);
    showToast("You are outside the zone");
  }
}

function shoot() {
  if (!running || paused) return;
  if (isReloading) return;
  const weapon = weapons[activeWeapon];
  const now = performance.now();
  if (now - lastShotAt < weapon.delay) return;
  if (weapon.ammo <= 0) {
    showToast("Press R to reload");
    return;
  }

  lastShotAt = now;
  weaponRecoil = Math.min(1, weaponRecoil + (activeWeapon === "shotgun" ? 0.72 : 0.34));
  weapon.ammo -= 1;
  crosshair.classList.add("firing");
  setTimeout(() => crosshair.classList.remove("firing"), 90);

  const pellets = weapon.pellets || 1;
  for (let i = 0; i < pellets; i += 1) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const spread = weapon.spread * (isAiming ? 0.35 : 1);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    raycaster.set(camera.position, dir);
    raycaster.far = weapon.range;
    const targets = bots.filter((bot) => bot.userData.alive).flatMap((bot) => bot.children);
    const hits = raycaster.intersectObjects(targets, true);
    const end = hits.length ? hits[0].point : camera.position.clone().add(dir.multiplyScalar(weapon.range));
    addTracer(camera.position.clone(), end, 0xfacc15);

    if (hits.length) {
      const bot = findParentBot(hits[0].object);
      if (bot) damageBot(bot, weapon.damage);
    }
  }
}

function reloadWeapon() {
  if (!running || paused || isReloading) return;
  const weapon = weapons[activeWeapon];
  if (weapon.ammo >= weapon.mag) {
    showToast("Magazine already full");
    return;
  }

  isReloading = true;
  showToast("Reloading...");
  setTimeout(() => {
    if (!running) return;
    weapon.ammo = weapon.mag;
    isReloading = false;
    showToast("Reloaded");
    updateHud();
  }, activeWeapon === "shotgun" ? 900 : 650);
}

function damageBot(bot, amount, source = "player") {
  if (!bot.userData.alive) return;
  if (source === "player") {
    bot.userData.aggroUntil = performance.now() + 6500;
    bot.userData.target = player.position.clone();
  }
  let left = amount;
  if (bot.userData.shield > 0) {
    const block = Math.min(bot.userData.shield, left);
    bot.userData.shield -= block;
    left -= block;
  }
  bot.userData.hp -= left;
  if (source === "player") {
    showHitmarker();
    addDamageNumber(Math.round(amount));
  }
  if (bot.userData.hp <= 0) {
    bot.userData.alive = false;
    bot.visible = false;
    if (source === "player") {
      elims += 1;
      materials += 35;
      showToast("Elimination +35 mats");
    }
  }
}

function buildPiece() {
  if (!running || materials < 10) return;
  materials -= 10;
  const forward = new THREE.Vector3(Math.sin(mouse.yaw), 0, Math.cos(mouse.yaw));
  const pos = player.position.clone().add(forward.multiplyScalar(7));
  let mesh;
  if (activePiece === "wall") {
    mesh = addBox(pos.x, 3.25, pos.z, 7.4, 6.5, 0.5, materialsLib.wood);
    mesh.rotation.y = mouse.yaw;
    solidObjects.push({ x: pos.x, z: pos.z, radius: 3.9, height: 6.5, mesh });
  } else if (activePiece === "ramp") {
    mesh = addBox(pos.x, 1.8, pos.z, 8.2, 0.45, 9.4, materialsLib.wood);
    mesh.rotation.set(-0.5, mouse.yaw, 0);
    climbables.push({ x: pos.x, z: pos.z, radius: 5.1, height: 3.8, mesh });
  } else {
    mesh = addBox(pos.x, 0.55, pos.z, 8.2, 0.4, 8.2, materialsLib.wood);
    climbables.push({ x: pos.x, z: pos.z, radius: 4.7, height: 0.55, mesh });
  }
  builds.push(mesh);
}

function damagePlayer(amount) {
  lastDamageAt = performance.now();
  let left = amount;
  if (shield > 0) {
    const block = Math.min(shield, left);
    shield -= block;
    left -= block;
  }
  health -= left;
  addDamageNumber(Math.round(amount), true);
  if (health <= 0) {
    health = 100;
    shield = 30;
    player.position.set(0, 0, 30);
    showToast("You were knocked. Respawned for testing.");
  }
}

function addTracer(start, end, color) {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 })
  );
  scene.add(line);
  bullets.push({ line, life: 0.08 });
}

function findParentBot(object) {
  let current = object;
  while (current) {
    if (bots.includes(current)) return current;
    current = current.parent;
  }
  return null;
}

function findNearbyBot(source, range) {
  let nearest = null;
  let nearestDistance = range;
  for (const bot of bots) {
    if (bot === source || !bot.userData.alive) continue;
    const distance = flatDistance(source.position, bot.position);
    if (distance < nearestDistance) {
      nearest = bot;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function getTerrainHeight(x, z) {
  const localY = -z;
  const edgeFalloff = THREE.MathUtils.clamp(1 - Math.max(Math.abs(x), Math.abs(localY)) / halfMap, 0, 1);
  return (Math.sin(x * 0.055) + Math.cos(localY * 0.047) + Math.sin((x + localY) * 0.025)) * 0.72 * edgeFalloff;
}

function getSurfaceHeight(x, z) {
  let height = getTerrainHeight(x, z);
  for (const climbable of climbables) {
    if (!climbable.mesh.visible) continue;
    const distance = Math.hypot(x - climbable.x, z - climbable.z);
    if (distance < climbable.radius) {
      const slope = 1 - distance / climbable.radius;
      height = Math.max(height, climbable.height * Math.sin(slope * Math.PI * 0.5));
    }
  }
  return height;
}

function resolveSolidCollisions(position, radius) {
  for (const object of solidObjects) {
    if (!object.mesh.visible) continue;
    const dx = position.x - object.x;
    const dz = position.z - object.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = object.radius + radius;
    if (distance > 0.001 && distance < minDistance && position.y < object.height + 0.8) {
      const push = (minDistance - distance) / distance;
      position.x += dx * push;
      position.z += dz * push;
    }
  }
}

function updateHud() {
  const elapsed = Math.floor((performance.now() - startedAt) / 1000);
  timerEl.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  enemiesEl.textContent = bots.filter((bot) => bot.userData.alive).length;
  elimsEl.textContent = elims;
  healthBar.style.width = `${health}%`;
  shieldBar.style.width = `${shield}%`;
  staminaBar.style.width = `${stamina}%`;
  ammoEl.textContent = weapons[activeWeapon].ammo;
  materialsEl.textContent = materials;

  fpsCounter.classList.toggle("hidden", !showFps.checked);
  const now = performance.now();
  const fps = Math.round(1000 / Math.max(1, now - lastFrameTime));
  lastFrameTime = now;
  fpsCounter.textContent = `FPS ${fps}`;
}

function drawMinimap() {
  const s = minimap.width / mapSize;
  miniCtx.clearRect(0, 0, minimap.width, minimap.height);
  miniCtx.fillStyle = "#173b2f";
  miniCtx.fillRect(0, 0, minimap.width, minimap.height);
  miniCtx.strokeStyle = "#60a5fa";
  miniCtx.lineWidth = 2;
  miniCtx.beginPath();
  miniCtx.arc((stormCenter.x + halfMap) * s, (stormCenter.z + halfMap) * s, stormRadius * s, 0, Math.PI * 2);
  miniCtx.stroke();
  miniCtx.fillStyle = "rgba(96, 165, 250, 0.12)";
  miniCtx.fill();
  miniCtx.fillStyle = "#fb7185";
  bots.forEach((bot) => {
    if (!bot.userData.alive) return;
    miniCtx.fillRect((bot.position.x + halfMap) * s - 1, (bot.position.z + halfMap) * s - 1, 2, 2);
  });
  miniCtx.fillStyle = "#facc15";
  miniCtx.beginPath();
  miniCtx.arc((player.position.x + halfMap) * s, (player.position.z + halfMap) * s, 4, 0, Math.PI * 2);
  miniCtx.fill();
}

function addDamageNumber(text, red = false) {
  const node = document.createElement("div");
  node.className = "damage-number";
  node.textContent = text;
  node.style.color = red ? "#fb7185" : "#facc15";
  node.style.setProperty("--drift", `${Math.round((Math.random() - 0.5) * 70)}px`);
  damageLayer.appendChild(node);
  setTimeout(() => node.remove(), 760);
}

function showHitmarker() {
  hitmarker.classList.add("visible");
  setTimeout(() => hitmarker.classList.remove("visible"), 110);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 1800);
}

function randomPoint(radius) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function flatDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

playButton.addEventListener("click", startGame);
settingsToggle.addEventListener("click", () => settingsPanel.classList.toggle("open"));

weaponSlots.forEach((slot) => {
  slot.addEventListener("click", () => {
    activeWeapon = slot.dataset.weapon;
    weaponSlots.forEach((item) => item.classList.toggle("active", item === slot));
    refreshWeaponModel();
    updateHud();
  });
});

buildSlots.forEach((slot) => {
  slot.addEventListener("click", () => {
    activePiece = slot.dataset.piece;
    buildSlots.forEach((item) => item.classList.toggle("active", item === slot));
  });
});

function chooseBuildSlot(index, placeNow = false) {
  const slot = buildSlots[index];
  if (!slot) return;
  slot.click();
  if (placeNow) buildPiece();
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Digit1") weaponSlots[0].click();
  if (event.code === "Digit2") weaponSlots[1].click();
  if (event.code === "Digit3") weaponSlots[2].click();
  if (!event.repeat && event.code === "Digit4") chooseBuildSlot(0, true);
  if (!event.repeat && event.code === "Digit5") chooseBuildSlot(1, true);
  if (!event.repeat && event.code === "Digit6") chooseBuildSlot(2, true);
  if (!event.repeat && event.code === "KeyQ") buildPiece();
  if (!event.repeat && event.code === "KeyR") reloadWeapon();
  if (event.code === "Escape") {
    paused = !paused;
    showToast(paused ? "Paused" : "Resumed");
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("mousedown", (event) => {
  if (event.button === 0) shoot();
  if (event.button === 2) isAiming = true;
});
window.addEventListener("mouseup", (event) => {
  if (event.button === 2) isAiming = false;
});
window.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas || !running) return;
  const sens = Number(sensitivityRange.value) * 0.0022;
  mouse.yaw -= event.movementX * sens;
  mouse.pitch = THREE.MathUtils.clamp(mouse.pitch - event.movementY * sens, -0.75, 0.4);
});
window.addEventListener("resize", () => {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

qualitySelect.addEventListener("change", () => {
  saveSettings();
  if (!renderer) return;
  renderer.setPixelRatio(qualitySelect.value === "performance" ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = qualitySelect.value !== "performance";
});

[showFps, sensitivityRange, botVisionRange, botCountSelect].forEach((control) => {
  control.addEventListener("change", saveSettings);
  control.addEventListener("input", saveSettings);
});
