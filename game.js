import * as THREE from "three";

const canvas = document.getElementById("game");
const startScreen = document.getElementById("start");
const playButton = document.getElementById("play");
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const coinAmount = document.getElementById("coinAmount");
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
const masterVolumeRange = document.getElementById("masterVolumeRange");
const sfxVolumeRange = document.getElementById("sfxVolumeRange");
const qualitySelect = document.getElementById("qualitySelect");
const resolutionScaleSelect = document.getElementById("resolutionScaleSelect");
const shadowQualitySelect = document.getElementById("shadowQualitySelect");
const entityDensitySelect = document.getElementById("entityDensitySelect");
const renderDistanceRange = document.getElementById("renderDistanceRange");
const fovRange = document.getElementById("fovRange");
const sensitivityRange = document.getElementById("sensitivityRange");
const botBrainSelect = document.getElementById("botBrainSelect");
const botVisionRange = document.getElementById("botVisionRange");
const botAccuracyRange = document.getElementById("botAccuracyRange");
const botAggressionRange = document.getElementById("botAggressionRange");
const botCountSelect = document.getElementById("botCountSelect");
const hitmarker = document.getElementById("hitmarker");
const damageLayer = document.getElementById("damageLayer");
const minimap = document.getElementById("minimap");
const toast = document.getElementById("toast");
const killFeed = document.getElementById("killFeed");
const crosshair = document.querySelector(".crosshair");
const adsReticle = document.getElementById("adsReticle");
const matchEnd = document.getElementById("matchEnd");
const lobbyButton = document.getElementById("lobbyButton");
const endElims = document.getElementById("endElims");
const endTime = document.getElementById("endTime");
const weaponSlots = [...document.querySelectorAll(".weapon-slot")];
const buildSlots = [...document.querySelectorAll(".buildbar .slot")];
const lobbyTabs = [...document.querySelectorAll(".tab-button")];
const lobbyPanels = [...document.querySelectorAll(".lobby-panel")];
const bindButtons = [...document.querySelectorAll(".bind-button")];
const shopGrid = document.getElementById("shopGrid");
const lockerGrid = document.getElementById("lockerGrid");
const mapGrid = document.getElementById("mapGrid");

const mapSize = 240;
const halfMap = mapSize / 2;
const keys = new Set();
const mouse = { yaw: 0, pitch: -0.18 };
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const miniCtx = minimap.getContext("2d");
const SETTINGS_KEY = "skyline-build-royale-settings-v4";
const PROFILE_KEY = "skyline-build-royale-profile-v1";

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
let matchEnded = false;
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
let waterPlane;
let sunGlow;
let weaponBobTime = 0;
let weaponMoveBlend = 0;
let weaponRecoil = 0;
let isAiming = false;
let aimBlend = 0;
let verticalVelocity = 0;
let isGrounded = true;

const weaponHipPosition = new THREE.Vector3(0.38, -0.72, -1.12);
const weaponHipRotation = new THREE.Euler(0.03, Math.PI / 2 - 0.1, -0.06);
const weaponAimPosition = new THREE.Vector3(0.28, -0.62, -1.42);
const weaponAimRotation = new THREE.Euler(0.02, Math.PI / 2 - 0.04, -0.025);

const defaultKeybinds = {
  forward: "KeyW",
  backward: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  sprint: "ShiftLeft",
  reload: "KeyR",
  build: "KeyQ",
  weapon1: "Digit1",
  weapon2: "Digit2",
  weapon3: "Digit3",
  wall: "Digit4",
  ramp: "Digit5",
  floor: "Digit6",
  pause: "Escape",
};

let keybinds = { ...defaultKeybinds };
let waitingForBind = null;
let audioState = {
  ctx: null,
  master: null,
  sfx: null,
};

const playerSkins = [
  { id: "default", name: "Sky Runner", price: 0, primary: 0x5eead4, accent: 0xfacc15, detail: "Starter tactical suit" },
  { id: "volt", name: "Volt Prime", price: 900, primary: 0x38bdf8, accent: 0xa3e635, detail: "Bright competitive armor" },
  { id: "ember", name: "Ember Ops", price: 1250, primary: 0xfb7185, accent: 0xf97316, detail: "Hot red combat rig" },
  { id: "onyx", name: "Onyx Guard", price: 1600, primary: 0x111827, accent: 0xc084fc, detail: "Dark heavy armor" },
  { id: "gold", name: "Gold Rift", price: 2000, primary: 0xfacc15, accent: 0x22d3ee, detail: "Premium shiny suit" },
];

const weaponSkins = [
  { id: "sand", name: "Sand Scar", price: 0, body: 0xd5c18e, secondary: 0xbda56f, dark: 0x343b45, accent: 0xfacc15, detail: "Default tan wrap" },
  { id: "neon", name: "Neon Pulse", price: 800, body: 0x0f172a, secondary: 0x22d3ee, dark: 0x020617, accent: 0xa3e635, detail: "Glowing arcade wrap" },
  { id: "crimson", name: "Crimson Rail", price: 1100, body: 0x7f1d1d, secondary: 0xef4444, dark: 0x1f2937, accent: 0xfbbf24, detail: "Aggressive red metal" },
  { id: "arctic", name: "Arctic Glass", price: 1400, body: 0xe0f2fe, secondary: 0x93c5fd, dark: 0x475569, accent: 0x67e8f9, detail: "Clean ice-blue finish" },
  { id: "royal", name: "Royal Mythic", price: 2000, body: 0x6d28d9, secondary: 0xfacc15, dark: 0x1e1b4b, accent: 0xfef08a, detail: "Mythic gold wrap" },
];

const mapPresets = [
  {
    id: "skyline",
    name: "Skyline Island",
    detail: "Balanced grass, towns, roads, and water",
    grass: 0x49a752,
    water: 0x1487b9,
    sky: 0x8fd3ff,
    fog: 0x8fd3ff,
    road: 0x293241,
    sand: 0xd7c184,
    tree: 0x19783b,
    treeDark: 0x0f6b32,
    towns: [
      [-48, -44, 0x64748b],
      [58, -56, 0x0891b2],
      [-62, 55, 0x16a34a],
      [62, 52, 0xb45309],
    ],
    treeCount: 82,
    rockCount: 22,
  },
  {
    id: "metro",
    name: "Metro Strike",
    detail: "Dense city blocks and sharper cover",
    grass: 0x2f7d5b,
    water: 0x0e7490,
    sky: 0x9bd5ff,
    fog: 0xa7d8ff,
    road: 0x1f2937,
    sand: 0xa3a3a3,
    tree: 0x15803d,
    treeDark: 0x14532d,
    towns: [
      [-38, -42, 0x475569],
      [34, -46, 0x334155],
      [-42, 42, 0x155e75],
      [46, 38, 0x4b5563],
      [2, -4, 0x0f172a],
    ],
    treeCount: 52,
    rockCount: 16,
  },
  {
    id: "dust",
    name: "Dust Ridge",
    detail: "Warm desert colors, more rocks, clear fights",
    grass: 0xb99555,
    water: 0x1d8fa3,
    sky: 0xf8d8a8,
    fog: 0xf8d8a8,
    road: 0x5b4636,
    sand: 0xe7c77d,
    tree: 0x5f7a32,
    treeDark: 0x3f5f23,
    towns: [
      [-52, -38, 0xb45309],
      [50, -58, 0x92400e],
      [-64, 52, 0x854d0e],
      [64, 50, 0xa16207],
    ],
    treeCount: 42,
    rockCount: 42,
  },
  {
    id: "frost",
    name: "Frost Peak",
    detail: "Cold map, pale terrain, blue light",
    grass: 0xb9d6d2,
    water: 0x38bdf8,
    sky: 0xc7e9ff,
    fog: 0xdff6ff,
    road: 0x475569,
    sand: 0xe2e8f0,
    tree: 0x0f766e,
    treeDark: 0x115e59,
    towns: [
      [-48, -44, 0x64748b],
      [58, -56, 0x0e7490],
      [-62, 55, 0x64748b],
      [62, 52, 0x1d4ed8],
    ],
    treeCount: 70,
    rockCount: 30,
  },
];

let profile = loadProfile();

applySavedSettings();

const weapons = {
  rifle: { label: "AR", damage: 24, ammo: 30, mag: 30, reserve: 30, startReserve: 30, maxReserve: 180, delay: 120, range: 95, spread: 0.018 },
  shotgun: { label: "SG", damage: 14, ammo: 8, mag: 8, reserve: 8, startReserve: 8, maxReserve: 48, delay: 650, range: 36, spread: 0.095, pellets: 7 },
  smg: { label: "SMG", damage: 14, ammo: 36, mag: 36, reserve: 36, startReserve: 36, maxReserve: 216, delay: 72, range: 55, spread: 0.034 },
};

const materialsLib = {};
const texturesLib = {};

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    return {
      coins: saved.coins ?? 900,
      ownedPlayerSkins: saved.ownedPlayerSkins || ["default"],
      ownedWeaponSkins: saved.ownedWeaponSkins || ["sand"],
      equippedPlayer: saved.equippedPlayer || "default",
      equippedWeapon: saved.equippedWeapon || "sand",
      selectedMap: saved.selectedMap || "skyline",
    };
  } catch {
    return {
      coins: 900,
      ownedPlayerSkins: ["default"],
      ownedWeaponSkins: ["sand"],
      equippedPlayer: "default",
      equippedWeapon: "sand",
      selectedMap: "skyline",
    };
  }
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      showFps: showFps.checked,
      masterVolume: masterVolumeRange.value,
      sfxVolume: sfxVolumeRange.value,
      quality: qualitySelect.value,
      resolutionScale: resolutionScaleSelect.value,
      shadowQuality: shadowQualitySelect.value,
      entityDensity: entityDensitySelect.value,
      renderDistance: renderDistanceRange.value,
      fov: fovRange.value,
      sensitivity: sensitivityRange.value,
      botBrain: botBrainSelect.value,
      botVision: botVisionRange.value,
      botAccuracy: botAccuracyRange.value,
      botAggression: botAggressionRange.value,
      botCount: botCountSelect.value,
      keybinds,
    })
  );
}

function applySavedSettings() {
  const settings = loadSettings();
  showFps.checked = settings.showFps ?? showFps.checked;
  masterVolumeRange.value = settings.masterVolume || masterVolumeRange.value;
  sfxVolumeRange.value = settings.sfxVolume || sfxVolumeRange.value;
  qualitySelect.value = settings.quality || qualitySelect.value;
  resolutionScaleSelect.value = settings.resolutionScale || resolutionScaleSelect.value;
  shadowQualitySelect.value = settings.shadowQuality || shadowQualitySelect.value;
  entityDensitySelect.value = settings.entityDensity || entityDensitySelect.value;
  renderDistanceRange.value = settings.renderDistance || renderDistanceRange.value;
  fovRange.value = settings.fov || fovRange.value;
  sensitivityRange.value = settings.sensitivity || sensitivityRange.value;
  botBrainSelect.value = settings.botBrain || botBrainSelect.value;
  botVisionRange.value = settings.botVision || botVisionRange.value;
  botAccuracyRange.value = settings.botAccuracy || botAccuracyRange.value;
  botAggressionRange.value = settings.botAggression || botAggressionRange.value;
  botCountSelect.value = settings.botCount || botCountSelect.value;
  keybinds = repairKeybinds({ ...defaultKeybinds, ...(settings.keybinds || {}) });
}

function makeMaterial(name, color, options = {}) {
  materialsLib[name] = new THREE.MeshStandardMaterial({
    color,
    map: options.map || null,
    bumpMap: options.bumpMap || null,
    bumpScale: options.bumpScale ?? 0,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
  return materialsLib[name];
}

function createCanvasTexture(name, size, repeatX, repeatY, painter) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = size;
  canvasTexture.height = size;
  const ctx = canvasTexture.getContext("2d");
  painter(ctx, size);
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 4) : 4;
  texturesLib[name] = texture;
  return texture;
}

function createRadialTexture(name, inner, outer) {
  return createCanvasTexture(name, 128, 1, 1, (ctx, size) => {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.42, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
}

function createProceduralTextures(map) {
  createCanvasTexture("grass", 256, 34, 34, (ctx, size) => {
    ctx.fillStyle = `#${map.grass.toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1400; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 2 + Math.random() * 8;
      ctx.strokeStyle = Math.random() > 0.52 ? "rgba(230,255,210,.16)" : "rgba(15,60,25,.18)";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 2 - 1, y - len);
      ctx.stroke();
    }
  });

  createCanvasTexture("road", 256, 18, 18, (ctx, size) => {
    ctx.fillStyle = `#${map.road.toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i += 1) {
      const shade = 18 + Math.random() * 55;
      ctx.fillStyle = `rgba(${shade},${shade + 4},${shade + 10},${0.12 + Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 26; i += 1) {
      ctx.strokeStyle = "rgba(255,255,255,.055)";
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.lineTo(Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
  });

  createCanvasTexture("water", 256, 10, 10, (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#0ea5c5");
    gradient.addColorStop(0.5, `#${map.water.toString(16).padStart(6, "0")}`);
    gradient.addColorStop(1, "#075985");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 120; i += 1) {
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 1 + Math.random() * 1.8;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(Math.random() * size * 0.25, y);
      ctx.bezierCurveTo(size * 0.35, y - 12, size * 0.65, y + 12, size, y + Math.random() * 18 - 9);
      ctx.stroke();
    }
  });

  createCanvasTexture("wood", 256, 5, 5, (ctx, size) => {
    ctx.fillStyle = "#9c6b3b";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
      ctx.strokeStyle = y % 16 ? "rgba(74,40,17,.28)" : "rgba(235,172,93,.18)";
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y) * 3);
      ctx.bezierCurveTo(size * 0.25, y - 5, size * 0.58, y + 8, size, y + Math.sin(y * 0.2) * 4);
      ctx.stroke();
    }
    for (let i = 0; i < 34; i += 1) {
      ctx.strokeStyle = "rgba(62,33,15,.35)";
      ctx.beginPath();
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.ellipse(x, y, 7 + Math.random() * 18, 2 + Math.random() * 5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  createCanvasTexture("metal", 256, 4, 4, (ctx, size) => {
    ctx.fillStyle = "#8795a8";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1800; i += 1) {
      const shade = 120 + Math.random() * 80;
      ctx.fillStyle = `rgba(${shade},${shade + 8},${shade + 15},.16)`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 5, 1);
    }
  });

  createRadialTexture("sunGlow", "rgba(255,244,191,0.95)", "rgba(255,210,90,0)");
}

function init() {
  const map = getSelectedMap();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(map.sky);
  scene.fog = new THREE.Fog(map.fog, 90, Number(renderDistanceRange.value || 520));

  camera = new THREE.PerspectiveCamera(Number(fovRange.value || 68), window.innerWidth / window.innerHeight, 0.1, Number(renderDistanceRange.value || 520));
  renderer = new THREE.WebGLRenderer({ canvas, antialias: qualitySelect.value !== "performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyRendererSettings();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = qualitySelect.value === "cinematic" ? 1.12 : 1.04;
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
  const map = getSelectedMap();
  createProceduralTextures(map);
  makeMaterial("grass", map.grass, { roughness: 0.92, map: texturesLib.grass, bumpMap: texturesLib.grass, bumpScale: 0.055 });
  makeMaterial("road", map.road, { roughness: 0.78, map: texturesLib.road, bumpMap: texturesLib.road, bumpScale: 0.028 });
  makeMaterial("water", map.water, { roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.78, map: texturesLib.water, emissive: map.water, emissiveIntensity: 0.03 });
  makeMaterial("wood", 0x9c6b3b, { roughness: 0.86, map: texturesLib.wood, bumpMap: texturesLib.wood, bumpScale: 0.045 });
  makeMaterial("woodLight", 0xc48a4a, { roughness: 0.86, map: texturesLib.wood, bumpMap: texturesLib.wood, bumpScale: 0.035 });
  makeMaterial("woodDark", 0x6f4726, { roughness: 0.9, map: texturesLib.wood, bumpMap: texturesLib.wood, bumpScale: 0.04 });
  makeMaterial("woodNail", 0x2f2117, { roughness: 0.78, metalness: 0.2 });
  makeMaterial("brick", 0xb5523f, { roughness: 0.82 });
  makeMaterial("metal", 0x8795a8, { roughness: 0.36, metalness: 0.42, map: texturesLib.metal, bumpMap: texturesLib.metal, bumpScale: 0.018 });
  makeMaterial("skin", 0x5eead4, { roughness: 0.52 });
  makeMaterial("skin2", 0xfacc15, { roughness: 0.48, metalness: 0.05 });
  makeMaterial("bot", 0xfb7185, { roughness: 0.58 });
  makeMaterial("bot2", 0x60a5fa, { roughness: 0.58 });
  makeMaterial("loot", 0xfacc15, { roughness: 0.38, metalness: 0.12 });
}

function createLights() {
  scene.add(new THREE.HemisphereLight(0xe8fbff, 0x2f5f32, qualitySelect.value === "performance" ? 1.05 : 1.22));
  const sun = new THREE.DirectionalLight(0xfff0cf, qualitySelect.value === "cinematic" ? 3.1 : 2.45);
  sun.position.set(70, 110, 55);
  sun.castShadow = renderer.shadowMap.enabled;
  const shadowSize = getShadowMapSize();
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.035;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x7dd3fc, 0.38);
  fill.position.set(-90, 45, -70);
  scene.add(fill);

  sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texturesLib.sunGlow,
    color: 0xfff1b8,
    transparent: true,
    opacity: qualitySelect.value === "performance" ? 0.28 : 0.48,
    depthWrite: false,
  }));
  sunGlow.position.set(210, 180, 120);
  sunGlow.scale.set(92, 92, 1);
  scene.add(sunGlow);
}

function createMap() {
  const map = getSelectedMap();
  const entityScale = Math.min(Number(entityDensitySelect.value || 1), 1.28);
  createSkyDome(map);
  const detailSegments = qualitySelect.value === "cinematic" ? 72 : qualitySelect.value === "performance" ? 30 : 52;
  const groundGeometry = new THREE.PlaneGeometry(mapSize, mapSize, detailSegments, detailSegments);
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

  waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(520, 520, 18, 18), materialsLib.water);
  waterPlane.rotation.x = -Math.PI / 2;
  waterPlane.position.y = -0.22;
  waterPlane.receiveShadow = true;
  scene.add(waterPlane);

  const shore = new THREE.Mesh(
    new THREE.TorusGeometry(halfMap - 4, 2.8, 8, 160),
    new THREE.MeshStandardMaterial({ color: map.sand, roughness: 0.9 })
  );
  shore.rotation.x = Math.PI / 2;
  shore.position.y = 0.16;
  scene.add(shore);

  addBox(0, 0.04, -18, 210, 0.08, 7, materialsLib.road);
  addBox(28, 0.05, 22, 7, 0.08, 170, materialsLib.road);
  createRoadMarkings();

  map.towns.forEach(([cx, cz, color], townIndex) => {
    const buildingCount = Math.round((townIndex === 4 ? 8 : 6) * entityScale);
    for (let i = 0; i < buildingCount; i += 1) {
      const w = 7 + Math.random() * 7;
      const h = 7 + Math.random() * (map.id === "metro" ? 24 : 15);
      const d = 7 + Math.random() * 7;
      const x = cx + (Math.random() - 0.5) * 36;
      const z = cz + (Math.random() - 0.5) * 36;
      createBuildingModel(x, z, w, h, d, color);
    }
  });

  createLandmarks(map);

  for (let i = 0; i < Math.round(map.treeCount * Math.min(entityScale, 1.08)); i += 1) {
    const point = randomPoint(halfMap - 18);
    if (Math.hypot(point.x, point.z) < 18) continue;
    createTree(point.x, point.z);
  }

  for (let i = 0; i < Math.round(map.rockCount * Math.min(entityScale, 1.12)); i += 1) {
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

function createSkyDome(map) {
  const skyTexture = createCanvasTexture(`sky-${map.id}`, 256, 1, 1, (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(0.38, `#${map.sky.toString(16).padStart(6, "0")}`);
    gradient.addColorStop(0.72, "#dff6ff");
    gradient.addColorStop(1, `#${map.sand.toString(16).padStart(6, "0")}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size * 0.38, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(420, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false })
  );
  dome.position.y = -35;
  scene.add(dome);
}

function createRoadMarkings() {
  const markMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.72, depthWrite: false });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.82, depthWrite: false });

  for (let x = -96; x <= 96; x += 14) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 0.24), yellowMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.115, -18);
    scene.add(dash);
  }

  for (let z = -56; z <= 100; z += 14) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 6.8), yellowMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(28, 0.12, z);
    scene.add(dash);
  }

  [
    { x: 0, z: -21.35, w: 210, h: 0.16 },
    { x: 0, z: -14.65, w: 210, h: 0.16 },
    { x: 24.65, z: 22, w: 0.16, h: 170 },
    { x: 31.35, z: 22, w: 0.16, h: 170 },
  ].forEach((line) => {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(line.w, line.h), markMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(line.x, 0.13, line.z);
    scene.add(edge);
  });
}

function createLandmarks(map) {
  const metal = materialsLib.metal;
  const road = materialsLib.road;
  const accent = new THREE.MeshStandardMaterial({ color: map.sand, roughness: 0.7, metalness: 0.05 });
  const neon = new THREE.MeshStandardMaterial({
    color: map.water,
    roughness: 0.35,
    metalness: 0.2,
    emissive: map.water,
    emissiveIntensity: qualitySelect.value === "performance" ? 0.05 : 0.16,
  });

  const points = [
    [-15, -26],
    [18, 40],
    [-74, -3],
    [78, 4],
    [2, 74],
    [-8, -78],
  ];

  points.forEach(([x, z], index) => {
    const base = addBox(x, 0.7, z, 6.4, 1.4, 6.4, accent, true);
    base.rotation.y = index * 0.42;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 9 + (index % 2) * 3, 12), metal);
    mast.position.set(x, 5.6, z);
    mast.castShadow = true;
    scene.add(mast);
    solidObjects.push({ x, z, radius: 1.1, height: 10, mesh: mast });

    const light = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.18), neon);
    light.position.set(x, 10 + (index % 2) * 1.4, z);
    light.rotation.y = Math.PI / 4 + index * 0.2;
    scene.add(light);
  });

  const containerCount = qualitySelect.value === "performance" ? 3 : 5;
  for (let i = 0; i < containerCount; i += 1) {
    const point = randomPoint(halfMap - 28);
    const container = addBox(point.x, 1.25, point.z, 7.8, 2.5, 2.7, i % 2 ? road : metal, true);
    container.rotation.y = Math.random() * Math.PI;
    for (let rib = -3; rib <= 3; rib += 1) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.65, 2.82), materialsLib.woodDark);
      strip.position.set(rib * 1.05, 0, 0);
      container.add(strip);
    }
  }
}

function createAtmosphereDetails() {
  const map = getSelectedMap();
  const entityScale = Math.min(Number(entityDensitySelect.value || 1), 1.25);
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, transparent: true, opacity: 0.82 });
  for (let i = 0; i < Math.round(14 * Math.min(1.35, entityScale)); i += 1) {
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

  const flowerColors = [0xfacc15, 0xfb7185, 0x5eead4, map.sand];
  for (let i = 0; i < Math.round(72 * entityScale); i += 1) {
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

function createBuildingModel(x, z, width, height, depth, color) {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x273241, roughness: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8ed8ff,
    roughness: 0.22,
    metalness: 0.12,
    emissive: 0x0d4f6a,
    emissiveIntensity: 0.08,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.7, 0.45, depth + 0.7), trimMat);
  roof.position.y = height + 0.28;
  roof.castShadow = true;
  group.add(roof);

  const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.35, depth + 0.35), trimMat);
  base.position.y = 0.18;
  base.castShadow = true;
  group.add(base);

  const windowRows = Math.max(1, Math.floor(height / 4));
  for (let row = 0; row < windowRows; row += 1) {
    const wy = 2.1 + row * 3.4;
    if (wy > height - 0.7) continue;
    for (let col = -1; col <= 1; col += 2) {
      const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, 0.9, 0.06), glassMat);
      frontWindow.position.set(col * width * 0.22, wy, depth / 2 + 0.035);
      group.add(frontWindow);

      const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, depth * 0.18), glassMat);
      sideWindow.position.set(width / 2 + 0.035, wy, col * depth * 0.22);
      group.add(sideWindow);
    }
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(width * 0.22, 1.8, 0.08), trimMat);
  door.position.set(0, 0.95, depth / 2 + 0.06);
  group.add(door);

  if (height > 10) {
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8), trimMat);
    antenna.position.set(width * 0.25, height + 1.25, depth * 0.2);
    group.add(antenna);
  }

  group.position.set(x, 0, z);
  scene.add(group);
  solidObjects.push({ x, z, radius: Math.max(width, depth) * 0.58, height, mesh: group });
  return group;
}

function createTree(x, z) {
  const map = getSelectedMap();
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 4.5, 8), materialsLib.wood);
  trunk.position.y = 2.25;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  const trunkBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.66, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x6d4524, roughness: 0.9 })
  );
  trunkBand.position.y = 1.35;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(3, 6.4, 9),
    new THREE.MeshStandardMaterial({ color: map.tree, roughness: 0.9 })
  );
  leaves.position.y = 6;
  leaves.castShadow = true;
  const leavesTop = new THREE.Mesh(
    new THREE.ConeGeometry(2.25, 4.8, 9),
    new THREE.MeshStandardMaterial({ color: map.treeDark, roughness: 0.92 })
  );
  leavesTop.position.y = 8.2;
  leavesTop.castShadow = true;
  tree.add(trunk, trunkBand, leaves, leavesTop);
  tree.position.set(x, 0, z);
  scene.add(tree);
  solidObjects.push({ x, z, radius: 1.35, height: 8.7, mesh: tree });
}

function createPlayer() {
  player = new THREE.Group();
  player.position.set(0, 0, 30);
  const skin = getPlayerSkin(profile.equippedPlayer);
  const localBody = createCharacter(skin.primary, skin.accent, activeWeapon, profile.equippedPlayer, profile.equippedWeapon);
  localBody.visible = false;
  player.add(localBody);
  scene.add(player);

  weaponModel = createWeaponModel(activeWeapon, profile.equippedWeapon);
  applyWeaponRestPose();
  camera.add(weaponModel);
  scene.add(camera);
}

function createCharacter(colorA, colorB, weaponKind = "smg", skinId = null, weaponSkinId = null) {
  const group = new THREE.Group();
  const skin = skinId ? getPlayerSkin(skinId) : null;
  const primaryColor = skin?.primary ?? colorA;
  const accentColor = skin?.accent ?? colorB;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.54,
    metalness: skinId === "gold" ? 0.18 : 0.04,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.45,
    metalness: skinId === "gold" || skinId === "onyx" ? 0.22 : 0.05,
    emissive: skinId === "volt" || skinId === "royal" ? accentColor : 0x000000,
    emissiveIntensity: skinId === "volt" ? 0.15 : 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0bd90, roughness: 0.72 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.76 });

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

  const shoulderGeo = new THREE.BoxGeometry(0.34, 0.22, 0.32);
  const leftShoulder = new THREE.Mesh(shoulderGeo, accentMat);
  leftShoulder.position.set(-0.62, 2.12, 0.02);
  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = 0.62;

  const armGeo = new THREE.CapsuleGeometry(0.13, 0.8, 5, 10);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.78, 1.58, 0.1);
  leftArm.rotation.z = -0.2;
  leftArm.castShadow = true;
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.78;
  rightArm.rotation.z = 0.2;

  const legGeo = new THREE.CapsuleGeometry(0.16, 0.82, 5, 10);
  const leftLeg = new THREE.Mesh(legGeo, bootMat);
  leftLeg.position.set(-0.24, 0.58, 0);
  leftLeg.castShadow = true;
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.24;

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.24), accentMat);
  backpack.position.set(0, 1.72, -0.52);
  backpack.castShadow = true;

  const botGun = createWeaponModel(weaponKind, weaponSkinId || profile.equippedWeapon);
  botGun.position.set(0.72, 1.5, 0.48);
  botGun.rotation.set(-0.05, -0.88, 0.04);
  botGun.scale.setScalar(0.34);

  group.add(body, head, visor, chest, leftShoulder, rightShoulder, leftArm, rightArm, leftLeg, rightLeg, backpack, botGun);
  return group;
}

function createWeaponModel(kind = "rifle", skinId = null) {
  const group = new THREE.Group();
  const skin = getWeaponSkin(skinId || profile.equippedWeapon);
  const tan = new THREE.MeshStandardMaterial({
    color: skin.body,
    roughness: 0.42,
    metalness: 0.08,
    emissive: skin.id === "neon" || skin.id === "royal" ? skin.accent : 0x000000,
    emissiveIntensity: skin.id === "neon" ? 0.08 : 0.03,
  });
  const tanDark = new THREE.MeshStandardMaterial({ color: skin.secondary, roughness: 0.55, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: skin.dark, roughness: 0.46, metalness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: skin.dark, roughness: 0.58, metalness: 0.28 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa1a9b4, roughness: 0.38, metalness: 0.52 });
  const accent = new THREE.MeshStandardMaterial({
    color: skin.accent,
    roughness: 0.38,
    metalness: 0.22,
    emissive: skin.accent,
    emissiveIntensity: skin.id === "sand" ? 0.02 : 0.1,
  });

  if (kind === "shotgun") {
    group.add(gunBox(-0.18, 0, 0, 1.7, 0.38, 0.48, dark));
    group.add(gunBox(0.25, 0.25, 0, 1.35, 0.11, 0.22, metal));
    group.add(gunCylinder(1.06, 0.08, 0.1, 2.55, 0.07, black));
    group.add(gunCylinder(1.06, 0.08, -0.1, 2.55, 0.07, black));
    group.add(gunCylinder(0.88, -0.18, 0, 2.15, 0.085, metal));
    group.add(gunBox(-1.08, -0.02, 0, 0.95, 0.34, 0.44, tanDark, 0, 0, -0.14));
    group.add(gunBox(-1.66, -0.02, 0, 0.14, 0.42, 0.46, black));
    group.add(gunBox(-0.18, -0.5, 0, 0.32, 0.86, 0.32, tanDark, 0, 0, -0.24));
    group.add(gunBox(0.72, -0.36, 0, 0.9, 0.24, 0.42, tanDark));
    for (let i = 0; i < 5; i += 1) {
      group.add(gunCylinder(-0.1 + i * 0.18, 0.35, 0.28, 0.22, 0.045, accent));
    }
    group.add(gunBox(1.1, 0.42, 0, 0.1, 0.32, 0.18, black));
    group.add(gunBox(-0.55, 0.42, 0, 0.14, 0.28, 0.2, black));
    group.scale.setScalar(0.98);
    return group;
  }

  if (kind === "smg") {
    group.add(gunBox(0, 0, 0, 1.28, 0.38, 0.44, dark));
    group.add(gunBox(0.08, 0.3, 0, 1.05, 0.12, 0.2, metal));
    group.add(gunCylinder(0.88, 0.03, 0, 1.18, 0.06, black));
    group.add(gunCylinder(1.58, 0.03, 0, 0.38, 0.095, dark));
    group.add(gunBox(-0.88, -0.02, 0, 0.64, 0.24, 0.36, tanDark));
    group.add(gunBox(-1.28, -0.02, 0, 0.42, 0.18, 0.32, black));
    group.add(gunBox(-0.08, -0.54, 0, 0.28, 0.82, 0.27, dark, 0, 0, 0.08));
    group.add(gunBox(0.38, -0.5, 0, 0.34, 0.9, 0.25, tanDark, 0, 0, -0.1));
    group.add(gunBox(0.26, 0.43, 0, 0.14, 0.22, 0.18, black));
    group.add(gunBox(-0.42, 0.42, 0, 0.14, 0.2, 0.18, black));
    for (let i = 0; i < 7; i += 1) {
      group.add(gunBox(-0.35 + i * 0.12, 0.42, 0, 0.045, 0.045, 0.2, accent));
    }
    group.scale.setScalar(0.95);
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
    group.add(gunBox(0.42 + i * 0.16, -0.04, 0.255, 0.1, 0.07, 0.03, accent));
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
  weaponModel = createWeaponModel(activeWeapon, profile.equippedWeapon);
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
  const hipFov = Number(fovRange.value || 68);
  camera.fov += ((isAiming ? Math.max(44, hipFov - 14) : hipFov) - camera.fov) * Math.min(1, delta * 12);
  camera.updateProjectionMatrix();
  adsReticle.classList.toggle("visible", aimBlend > 0.55);
  crosshair.classList.toggle("aiming", aimBlend > 0.55);
}

function spawnLoot() {
  loot = [];
  const chestCount = qualitySelect.value === "performance" ? 16 : 22;
  for (let i = 0; i < chestCount; i += 1) {
    const p = i === 0 ? new THREE.Vector3(0, 0, 22) : randomPoint(halfMap - 24);
    const chest = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.35), materialsLib.loot);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.32, 1.5), materialsLib.metal);
    const latch = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.34, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.42, metalness: 0.55 })
    );
    const strapA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.24, 1.54), materialsLib.metal);
    const strapB = strapA.clone();
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.055, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x343b45, roughness: 0.58, metalness: 0.3 })
    );
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65 })
    );
    lid.position.y = 0.72;
    latch.position.set(0, 0.38, 0.74);
    strapA.position.set(-0.72, 0.08, 0);
    strapB.position.set(0.72, 0.08, 0);
    handle.position.set(0, 0.96, 0);
    handle.rotation.x = Math.PI / 2;
    glow.rotation.x = Math.PI / 2;
    glow.position.y = -0.58;
    const previewKind = ["rifle", "shotgun", "smg"][i % 3];
    const previewGun = createWeaponModel(previewKind, weaponSkins[(i + 2) % weaponSkins.length].id);
    previewGun.position.set(0, 1.65, 0);
    previewGun.rotation.set(0.18, Math.PI / 2, 0.08);
    previewGun.scale.setScalar(0.32);
    chest.add(box, lid, latch, strapA, strapB, handle, glow, previewGun);
    chest.position.set(p.x, 0.8, p.z);
    chest.userData.kind = Math.random() > 0.5 ? "shield" : "ammo";
    chest.userData.weaponKind = previewKind;
    chest.castShadow = true;
    scene.add(chest);
    loot.push(chest);
  }
}

function spawnBots(count) {
  bots = [];
  const botWeaponKinds = ["rifle", "shotgun", "smg"];
  const botSkinIds = playerSkins.filter((skin) => skin.id !== "default").map((skin) => skin.id);
  const botWeaponSkinIds = weaponSkins.map((skin) => skin.id);
  for (let i = 0; i < count; i += 1) {
    const p = findBotSpawnPoint(count);
    const bot = new THREE.Group();
    const weaponKind = botWeaponKinds[i % botWeaponKinds.length];
    const skinId = botSkinIds[i % botSkinIds.length] || "default";
    const weaponSkinId = botWeaponSkinIds[(i + 1) % botWeaponSkinIds.length] || "sand";
    bot.position.copy(p);
    bot.add(createCharacter(i % 2 ? 0xfb7185 : 0x60a5fa, 0xfacc15, weaponKind, skinId, weaponSkinId));
    bot.userData = {
      hp: 100,
      shield: 30,
      cooldown: Math.random() * 0.7,
      target: randomPoint(halfMap - 24),
      aggroUntil: 0,
      weaponKind,
      skinId,
      weaponSkinId,
      scanAt: 0,
      focus: null,
      combatTarget: null,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      nextStrafeAt: performance.now() + Math.random() * 1200,
      movementMode: "advance",
      nextDecisionAt: performance.now() + Math.random() * 800,
      reaction: 0.2 + Math.random() * 0.35,
      alive: true,
    };
    scene.add(bot);
    bots.push(bot);
  }
}

function findBotSpawnPoint(totalBots) {
  const minDistanceFromPlayer = 44;
  const minDistanceFromBots = totalBots > 35 ? 8 : totalBots > 20 ? 10 : 14;
  let best = randomPoint(halfMap - 18);
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const point = randomPoint(halfMap - 18);
    const playerDistance = point.distanceTo(player.position);
    const nearestBotDistance = bots.reduce((nearest, bot) => Math.min(nearest, point.distanceTo(bot.position)), Infinity);
    const score = Math.min(playerDistance, nearestBotDistance);
    if (playerDistance > minDistanceFromPlayer && nearestBotDistance > minDistanceFromBots) return point;
    if (score > bestScore) {
      best = point;
      bestScore = score;
    }
  }

  return best;
}

function destroyScene() {
  if (!scene) return;
  scene.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    }
  });
  if (renderer) renderer.dispose();
  scene = null;
  camera = null;
  renderer = null;
  player = null;
  weaponModel = null;
  bots = [];
  bullets = [];
  builds = [];
  loot = [];
}

function startGame() {
  if (running) return;
  ensureAudio();
  destroyScene();
  resetWeaponAmmo();
  killFeed.innerHTML = "";
  init();
  running = true;
  paused = false;
  matchEnded = false;
  health = 100;
  shield = 40;
  stamina = 100;
  elims = 0;
  materials = 240;
  verticalVelocity = 0;
  isGrounded = true;
  startedAt = performance.now();
  matchEnd.classList.add("hidden");
  startScreen.classList.add("hidden");
  canvas.requestPointerLock?.();
  playTone(330, 0.08, 0.08, "sine", 160);
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
    updateBuildHealthBars();
    updateStorm(delta);
    if (isFireHeld) shoot();
    updateHud();
    drawMinimap();
  }
  renderer.render(scene, camera);
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(Math.sin(mouse.yaw), 0, Math.cos(mouse.yaw));
  const right = new THREE.Vector3(Math.cos(mouse.yaw), 0, -Math.sin(mouse.yaw));
  const move = new THREE.Vector3();
  if (isActionPressed("forward")) move.add(forward);
  if (isActionPressed("backward")) move.sub(forward);
  if (isActionPressed("left")) move.add(right);
  if (isActionPressed("right")) move.sub(right);

  const sprint = isActionPressed("sprint");
  const isMoving = move.lengthSq() > 0;
  if (isMoving) {
    move.normalize();
    const speed = sprint && stamina > 4 ? 15.6 : 9.4;
    player.position.addScaledVector(move, speed * delta);
    stamina = Math.max(0, stamina - (sprint ? 18 : 5) * delta);
  } else {
    stamina = Math.min(100, stamina + 28 * delta);
  }

  if (isActionPressed("jump") && isGrounded) {
    verticalVelocity = 9.2;
    isGrounded = false;
  }
  verticalVelocity -= 24 * delta;
  player.position.y += verticalVelocity * delta;

  player.position.x = THREE.MathUtils.clamp(player.position.x, -halfMap + 5, halfMap - 5);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -halfMap + 5, halfMap - 5);
  resolveSolidCollisions(player.position, 1.05);
  const surfaceY = getSurfaceHeight(player.position.x, player.position.z);
  if (player.position.y <= surfaceY) {
    player.position.y = surfaceY;
    verticalVelocity = 0;
    isGrounded = true;
  }
  player.rotation.y = mouse.yaw;

  const eye = player.position.clone().add(new THREE.Vector3(0, 2.62, 0));
  const lookDir = new THREE.Vector3(Math.sin(mouse.yaw), mouse.pitch, Math.cos(mouse.yaw)).normalize();
  camera.position.lerp(eye, 0.58);
  camera.lookAt(eye.clone().add(lookDir.multiplyScalar(12)));
  updateWeaponSway(delta, isMoving, sprint && stamina > 4);
}

function updateBots(delta) {
  const ai = getAiProfile();
  const now = performance.now();
  for (const bot of bots) {
    if (!bot.userData.alive) continue;
    const botWeapon = weapons[bot.userData.weaponKind] || weapons.rifle;
    const combatTarget = chooseBotTarget(bot, ai, now);
    let target = combatTarget ? getTargetPosition(combatTarget) : bot.userData.target;

    if (combatTarget) {
      bot.userData.target = target.clone();
      bot.lookAt(target.x, bot.position.y, target.z);
      bot.userData.cooldown -= delta;
      botFireAtTarget(bot, combatTarget, ai, now);
    } else if (bot.position.distanceTo(target) < 5 || Math.random() < 0.004 + ai.aggression * 0.002) {
      bot.userData.target = randomPoint(halfMap - 20);
      target = bot.userData.target;
    }

    applyBotMovement(bot, target, combatTarget, botWeapon, ai, delta, now);
    resolveSolidCollisions(bot.position, 0.9);
    bot.position.y = getSurfaceHeight(bot.position.x, bot.position.z);
  }
}

function getAiProfile() {
  const brain = botBrainSelect.value;
  const brainBonus = brain === "elite" ? 0.28 : brain === "smart" ? 0.14 : 0;
  return {
    brain,
    vision: Math.max(35, Number(botVisionRange.value || 72)) * (1 + brainBonus * 0.35),
    accuracy: Number(botAccuracyRange.value || 58) / 100 + brainBonus,
    aggression: Number(botAggressionRange.value || 72) / 100 + brainBonus * 0.65,
    reaction: brain === "elite" ? 0.12 : brain === "smart" ? 0.2 : 0.34,
    strafe: brain === "elite" ? 1 : brain === "smart" ? 0.82 : 0.58,
  };
}

function getTargetPosition(target) {
  return target.type === "player" ? player.position : target.bot.position;
}

function getBotFireRange(weapon, ai) {
  return Math.max(32, Math.min(weapon.range * (0.74 + ai.aggression * 0.1), ai.vision + 16));
}

function botFireAtTarget(bot, combatTarget, ai, now) {
  const weapon = weapons[bot.userData.weaponKind] || weapons.rifle;
  const targetPosition = getTargetPosition(combatTarget);
  const fireRange = getBotFireRange(weapon, ai);
  const distance = flatDistance(bot.position, targetPosition);
  if (distance > fireRange || bot.userData.cooldown > 0) return;
  if (!hasClearShot(bot.position, targetPosition)) return;

  const delayScale = ai.brain === "elite" ? 0.72 : ai.brain === "smart" ? 0.86 : 1;
  bot.userData.cooldown = Math.max(0.14, (weapon.delay / 1000) * delayScale) + bot.userData.reaction + Math.random() * (0.42 - ai.accuracy * 0.18);

  const start = bot.position.clone().add(new THREE.Vector3(0, 2.25, 0));
  const end = targetPosition.clone().add(new THREE.Vector3(0, combatTarget.type === "player" ? 2.1 : 2.0, 0));
  addTracer(start, end, bot.userData.weaponKind === "rifle" ? 0xfacc15 : bot.userData.weaponKind === "shotgun" ? 0xff8a3d : 0x67e8f9);
  playGunSound(bot.userData.weaponKind, combatTarget.type === "player" ? 0.42 : 0.24);

  const hitChance = getBotHitChance(distance, fireRange, weapon, ai);
  if (Math.random() > hitChance) return;

  const damage = weapon.damage * (combatTarget.type === "player" ? 0.34 : 0.31) + Math.random() * 5;
  if (combatTarget.type === "player") {
    if (now - lastDamageAt > 220) damagePlayer(damage);
  } else {
    damageBot(combatTarget.bot, damage, "bot", bot);
  }
}

function getBotHitChance(distance, fireRange, weapon, ai) {
  const distanceFactor = 1 - THREE.MathUtils.clamp(distance / fireRange, 0, 1);
  const weaponBonus = weapon.pellets ? -0.08 : weapon.delay < 90 ? -0.04 : 0.04;
  return THREE.MathUtils.clamp(0.16 + ai.accuracy * 0.48 + distanceFactor * 0.28 + weaponBonus, 0.12, 0.86);
}

function applyBotMovement(bot, target, combatTarget, weapon, ai, delta, now) {
  const dir = target.clone().sub(bot.position);
  dir.y = 0;
  const distance = Math.max(0.001, dir.length());
  const moveDir = new THREE.Vector3();

  if (distance > 0.1) {
    const forward = dir.clone().normalize();
    if (combatTarget) {
      const idealRange = Math.min(getBotFireRange(weapon, ai) * 0.7, ai.vision * 0.58);
      const closeRange = idealRange * (weapon.pellets ? 0.34 : 0.48);
      const farRange = idealRange * (weapon.pellets ? 1.35 : 1.18);

      if (now > bot.userData.nextDecisionAt) {
        if (!hasClearShot(bot.position, target)) bot.userData.movementMode = "advance";
        else if (distance > farRange) bot.userData.movementMode = "advance";
        else if (distance < closeRange) bot.userData.movementMode = "retreat";
        else bot.userData.movementMode = Math.random() < 0.72 ? "strafe" : "hold";
        if (Math.random() < 0.38) bot.userData.strafeDir *= -1;
        bot.userData.nextDecisionAt = now + 850 + Math.random() * 950;
      }

      const side = new THREE.Vector3(forward.z, 0, -forward.x);
      if (bot.userData.movementMode === "advance") {
        moveDir.addScaledVector(forward, 0.95);
        moveDir.addScaledVector(side, bot.userData.strafeDir * ai.strafe * 0.22);
      } else if (bot.userData.movementMode === "retreat") {
        moveDir.addScaledVector(forward, -0.42);
        moveDir.addScaledVector(side, bot.userData.strafeDir * ai.strafe * 0.85);
      } else if (bot.userData.movementMode === "hold") {
        moveDir.addScaledVector(side, bot.userData.strafeDir * ai.strafe * 0.26);
      } else {
        moveDir.addScaledVector(side, bot.userData.strafeDir * ai.strafe);
        if (distance > idealRange) moveDir.addScaledVector(forward, 0.28);
      }
    } else {
      moveDir.add(forward);
    }
  }

  moveDir.add(getBotSeparation(bot).multiplyScalar(1.55));
  if (moveDir.lengthSq() > 0.01) {
    moveDir.normalize();
    const baseSpeed = combatTarget ? 4.6 + ai.aggression * 1.8 : 4.2 + ai.aggression * 0.8;
    bot.position.addScaledVector(moveDir, baseSpeed * delta);
    bot.rotation.y = Math.atan2(moveDir.x, moveDir.z);
  }
}

function getBotSeparation(bot) {
  const push = new THREE.Vector3();
  for (const other of bots) {
    if (other === bot || !other.userData.alive) continue;
    const dx = bot.position.x - other.position.x;
    const dz = bot.position.z - other.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001 && distance < 5.2) {
      const strength = (5.2 - distance) / 5.2;
      push.x += (dx / distance) * strength;
      push.z += (dz / distance) * strength;
    }
  }
  return push;
}

function updateLoot(delta) {
  for (let i = loot.length - 1; i >= 0; i -= 1) {
    const chest = loot[i];
    chest.rotation.y += delta * 1.4;
    chest.position.y = 0.8 + Math.sin(performance.now() * 0.004 + i) * 0.08;
    if (chest.position.distanceTo(player.position) < 4) {
      if (chest.userData.kind === "shield") shield = Math.min(100, shield + 25);
      if (chest.userData.weaponKind) selectWeapon(chest.userData.weaponKind);
      const ammoKind = chest.userData.weaponKind || activeWeapon;
      const ammoAmount = grantAmmo(ammoKind, 1);
      materials += 50;
      scene.remove(chest);
      loot.splice(i, 1);
      playChestSound();
      showToast(`Chest opened: +50 mats, +${ammoAmount} ${weapons[ammoKind].label} reserve`);
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
    if (now - lastEmptyToastAt > 900) {
      lastEmptyToastAt = now;
      playEmptyClick();
      showToast(weapon.reserve > 0 ? "Press R to reload" : "No reserve ammo");
    }
    return;
  }

  lastShotAt = now;
  playGunSound(activeWeapon, 1);
  weaponRecoil = Math.min(1, weaponRecoil + (activeWeapon === "shotgun" ? 0.72 : 0.34));
  weapon.ammo -= 1;
  crosshair.classList.add("firing");
  setTimeout(() => crosshair.classList.remove("firing"), 90);

  const pellets = weapon.pellets || 1;
  const targets = [
    ...bots.filter((bot) => bot.userData.alive).flatMap((bot) => bot.children),
    ...solidObjects.map((object) => object.mesh),
    ...climbables.map((object) => object.mesh),
  ];
  for (let i = 0; i < pellets; i += 1) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const spread = weapon.spread * (isAiming ? 0.35 : 1);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    raycaster.set(camera.position, dir);
    raycaster.far = weapon.range;
    const hits = raycaster.intersectObjects(targets, true);
    const end = hits.length ? hits[0].point : camera.position.clone().add(dir.multiplyScalar(weapon.range));
    addTracer(camera.position.clone(), end, 0xfacc15);

    if (hits.length) {
      const bot = findParentBot(hits[0].object);
      if (bot) damageBot(bot, weapon.damage);
      else {
        const build = findParentBuild(hits[0].object);
        if (build) damageBuild(build, weapon.damage);
      }
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
  if (weapon.reserve <= 0) {
    playEmptyClick();
    showToast("No reserve ammo");
    return;
  }

  isReloading = true;
  playReloadSound();
  showToast("Reloading...");
  setTimeout(() => {
    if (!running) return;
    const needed = weapon.mag - weapon.ammo;
    const loaded = Math.min(needed, weapon.reserve);
    weapon.ammo += loaded;
    weapon.reserve -= loaded;
    isReloading = false;
    showToast("Reloaded");
    updateHud();
  }, activeWeapon === "shotgun" ? 900 : 650);
}

function damageBot(bot, amount, source = "player", attacker = null) {
  if (!bot.userData.alive) return;
  if (source === "player") {
    bot.userData.aggroUntil = performance.now() + 6500;
    bot.userData.target = player.position.clone();
    bot.userData.focus = null;
    bot.userData.combatTarget = { type: "player", distance: flatDistance(bot.position, player.position) };
  } else if (attacker) {
    bot.userData.focus = attacker;
    bot.userData.target = attacker.position.clone();
    bot.userData.combatTarget = { type: "bot", bot: attacker, distance: flatDistance(bot.position, attacker.position) };
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
    playHitSound();
    addDamageNumber(Math.round(amount));
  }
  if (bot.userData.hp <= 0) {
    bot.userData.alive = false;
    bot.visible = false;
    if (source === "player") {
      elims += 1;
      materials += 35;
      profile.coins += 15;
      saveProfile();
      updateProfileUi();
      showToast("Elimination +35 mats +15 credits");
      addKillFeed("You", bot.userData.skinId || "bot");
    } else if (attacker) {
      addKillFeed(attacker.userData.skinId || "bot", bot.userData.skinId || "bot");
    }
    checkMatchWin();
  }
}

function buildPiece() {
  if (!running || materials < 10) return;
  materials -= 10;
  playBuildSound();
  const buildYaw = snapBuildYaw(mouse.yaw);
  const forward = new THREE.Vector3(Math.sin(buildYaw), 0, Math.cos(buildYaw));
  const pos = snapBuildPosition(player.position.clone().add(forward.multiplyScalar(7.2)));
  let mesh;
  if (activePiece === "wall") {
    mesh = addBox(pos.x, 3.25, pos.z, 7.4, 6.5, 0.5, materialsLib.wood);
    mesh.rotation.y = buildYaw;
    addBuildDetails(mesh, "wall");
    solidObjects.push(createBuildCollider(mesh, 7.4, 6.5, 0.5));
  } else if (activePiece === "ramp") {
    mesh = addBox(pos.x, 1.8, pos.z, 8.2, 0.45, 9.4, materialsLib.wood);
    mesh.rotation.set(-0.5, buildYaw, 0);
    addBuildDetails(mesh, "ramp");
    climbables.push({ x: pos.x, z: pos.z, radius: 5.1, height: 3.8, mesh });
  } else {
    mesh = addBox(pos.x, 0.55, pos.z, 8.2, 0.4, 8.2, materialsLib.wood);
    mesh.rotation.y = buildYaw;
    addBuildDetails(mesh, "floor");
    climbables.push({ x: pos.x, z: pos.z, radius: 4.7, height: 0.55, mesh });
  }
  setupBuild(mesh, activePiece);
  builds.push(mesh);
}

function setupBuild(mesh, type) {
  mesh.userData.isBuild = true;
  mesh.userData.piece = type;
  mesh.userData.maxHp = 50;
  mesh.userData.hp = 50;
  mesh.userData.healthBarUntil = 0;
  mesh.userData.healthBar = createBuildHealthBar(mesh, type);
  mesh.traverse((object) => {
    object.userData.buildRoot = mesh;
  });
}

function snapBuildYaw(yaw) {
  const quarterTurn = Math.PI / 2;
  return Math.round(yaw / quarterTurn) * quarterTurn;
}

function snapBuildPosition(position) {
  const grid = 8;
  position.x = Math.round(position.x / grid) * grid;
  position.z = Math.round(position.z / grid) * grid;
  return position;
}

function createBuildHealthBar(mesh, type) {
  const bar = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.34),
    new THREE.MeshBasicMaterial({ color: 0x05070b, transparent: true, opacity: 0.78, depthTest: false })
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x38d36f, transparent: true, opacity: 0.96, depthTest: false })
  );
  const chip = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthTest: false })
  );
  fill.position.z = 0.01;
  chip.position.set(0, 0.22, 0.02);
  bar.add(bg, fill, chip);
  bar.userData.fill = fill;
  bar.userData.buildRoot = mesh;
  bar.userData.heightOffset = type === "wall" ? 7.25 : type === "ramp" ? 4.7 : 2.1;
  bar.visible = false;
  bar.renderOrder = 60;
  scene.add(bar);
  return bar;
}

function createBuildCollider(mesh, width, height, depth) {
  return {
    kind: "box",
    x: mesh.position.x,
    z: mesh.position.z,
    width,
    depth,
    halfWidth: width / 2,
    halfDepth: depth / 2,
    rotationY: mesh.rotation.y,
    radius: Math.max(width, depth) * 0.5,
    height,
    mesh,
  };
}

function addBuildDetails(mesh, type) {
  const dark = materialsLib.woodDark || materialsLib.wood;
  const light = materialsLib.woodLight || materialsLib.wood;
  const nail = materialsLib.woodNail || dark;
  const plankMats = [materialsLib.wood, light, dark];
  if (type === "wall") {
    for (let i = -3; i <= 3; i += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.86, 6.72, 0.14), plankMats[(i + 3) % plankMats.length]);
      plank.position.set(i * 1.02, 0, 0.36);
      plank.rotation.z = (i % 2 ? 0.018 : -0.015);
      mesh.add(plank);
      const backPlank = plank.clone();
      backPlank.position.z = -0.36;
      backPlank.rotation.z *= -1;
      mesh.add(backPlank);
    }
    for (let i = -1; i <= 1; i += 1) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(7.55, 0.16, 0.16), dark);
      brace.position.set(0, i * 1.9, 0.48);
      mesh.add(brace);
    }
    const diagA = new THREE.Mesh(new THREE.BoxGeometry(8.05, 0.18, 0.18), dark);
    diagA.position.set(0, 0, 0.56);
    diagA.rotation.z = 0.62;
    const diagB = diagA.clone();
    diagB.rotation.z = -0.62;
    mesh.add(diagA, diagB);
    for (let i = -3; i <= 3; i += 1) {
      for (const y of [-2.65, 2.65]) {
        const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), nail);
        bolt.position.set(i * 1.02, y, 0.65);
        mesh.add(bolt);
      }
    }
  } else if (type === "ramp") {
    for (let i = -4; i <= 4; i += 1) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(8.25, 0.16, 0.22), plankMats[(i + 4) % plankMats.length]);
      step.position.set(0, 0.32, i * 0.98);
      mesh.add(step);
    }
    for (const x of [-3.95, 3.95]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 9.4), dark);
      rail.position.set(x, 0.42, 0);
      mesh.add(rail);
    }
  } else {
    for (let i = -4; i <= 4; i += 1) {
      const plankA = new THREE.Mesh(new THREE.BoxGeometry(8.25, 0.1, 0.48), plankMats[(i + 4) % plankMats.length]);
      plankA.position.set(0, 0.28, i * 0.88);
      mesh.add(plankA);
    }
    for (let i = -3; i <= 3; i += 1) {
      const plankB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 8.25), dark);
      plankB.position.set(i * 1.18, 0.42, 0);
      mesh.add(plankB);
    }
  }
}

function damagePlayer(amount) {
  if (matchEnded) return;
  lastDamageAt = performance.now();
  let left = amount;
  if (shield > 0) {
    const block = Math.min(shield, left);
    shield -= block;
    left -= block;
  }
  health -= left;
  playDamageSound();
  addDamageNumber(Math.round(amount), true);
  if (health <= 0) {
    health = 0;
    endMatch("You were eliminated");
  }
}

function endMatch(title, reward = 0) {
  if (matchEnded) return;
  matchEnded = true;
  running = false;
  paused = true;
  isFireHeld = false;
  isAiming = false;
  if (document.pointerLockElement) document.exitPointerLock();
  endElims.textContent = elims;
  endTime.textContent = timerEl.textContent;
  document.getElementById("endTitle").textContent = title;
  if (reward > 0) {
    profile.coins += reward;
    saveProfile();
    updateProfileUi();
    playVictorySound();
    showToast(`Victory reward +${reward} credits`);
  }
  matchEnd.classList.remove("hidden");
  updateHud();
}

function backToLobby() {
  matchEnd.classList.add("hidden");
  startScreen.classList.remove("hidden");
  running = false;
  paused = false;
  matchEnded = false;
}

function checkMatchWin() {
  if (!running || matchEnded) return;
  if (bots.some((bot) => bot.userData.alive)) return;
  endMatch("Victory Royale", 100);
}

function addTracer(start, end, color) {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 })
  );
  scene.add(line);
  bullets.push({ line, life: 0.08 });
}

function damageBuild(build, amount) {
  if (!build?.userData?.isBuild) return;
  build.userData.hp = Math.max(0, build.userData.hp - amount);
  showBuildHealthBar(build);
  addDamageNumber(Math.max(1, Math.round(amount)));
  playHitSound();
  if (build.userData.hp > 0) return;

  scene.remove(build);
  if (build.userData.healthBar) {
    scene.remove(build.userData.healthBar);
    disposeObject(build.userData.healthBar);
  }
  builds = builds.filter((item) => item !== build);
  solidObjects = solidObjects.filter((item) => item.mesh !== build);
  climbables = climbables.filter((item) => item.mesh !== build);
  disposeObject(build);
  showToast("Build destroyed");
}

function showBuildHealthBar(build) {
  build.userData.healthBarUntil = performance.now() + 1800;
  updateBuildHealthBar(build);
}

function updateBuildHealthBars() {
  for (const build of builds) {
    updateBuildHealthBar(build);
  }
}

function updateBuildHealthBar(build) {
  const bar = build.userData.healthBar;
  if (!bar || !camera) return;
  const now = performance.now();
  bar.visible = build.visible && now < build.userData.healthBarUntil;
  if (!bar.visible) return;

  const ratio = THREE.MathUtils.clamp(build.userData.hp / build.userData.maxHp, 0, 1);
  const fill = bar.userData.fill;
  fill.scale.x = ratio;
  fill.position.x = -1.55 * (1 - ratio);
  fill.material.color.set(ratio > 0.55 ? 0x38d36f : ratio > 0.25 ? 0xfacc15 : 0xfb7185);
  bar.position.set(build.position.x, build.position.y + bar.userData.heightOffset, build.position.z);
  bar.quaternion.copy(camera.quaternion);
}

function disposeObject(root) {
  const sharedMaterials = new Set(Object.values(materialsLib));
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (Array.isArray(object.material)) object.material.forEach((material) => {
        if (!sharedMaterials.has(material)) material.dispose();
      });
      else if (!sharedMaterials.has(object.material)) object.material.dispose();
    }
  });
}

function findParentBot(object) {
  let current = object;
  while (current) {
    if (bots.includes(current)) return current;
    current = current.parent;
  }
  return null;
}

function findParentBuild(object) {
  let current = object;
  while (current) {
    if (builds.includes(current)) return current;
    if (current.userData?.buildRoot) return current.userData.buildRoot;
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

function findBestVisibleBot(source, range) {
  let best = null;
  let bestScore = -Infinity;
  for (const bot of bots) {
    if (bot === source || !bot.userData.alive) continue;
    const distance = flatDistance(source.position, bot.position);
    if (distance > range) continue;
    if (!hasClearShot(source.position, bot.position)) continue;
    const lowHealthBonus = (100 - (bot.userData.hp + bot.userData.shield * 0.35)) / 130;
    const score = (1 - distance / range) * 1.2 + lowHealthBonus + Math.random() * 0.2;
    if (score > bestScore) {
      best = bot;
      bestScore = score;
    }
  }
  return best;
}

function hasClearShot(from, to) {
  for (const object of solidObjects) {
    if (!object.mesh.visible || object.height < 1.2) continue;
    if (object.kind === "box") {
      if (segmentIntersectsOrientedBox2D(from.x, from.z, to.x, to.z, object, 0.18)) return false;
      continue;
    }
    const distance = pointSegmentDistance2D(object.x, object.z, from.x, from.z, to.x, to.z);
    if (distance < Math.min(object.radius * 0.78, 5.6)) {
      const fromDistance = flatDistance(from, object);
      const toDistance = flatDistance(to, object);
      const wholeDistance = flatDistance(from, to);
      if (fromDistance > 2.2 && toDistance > 2.2 && fromDistance < wholeDistance + object.radius) return false;
    }
  }
  return true;
}

function pointSegmentDistance2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  const t = THREE.MathUtils.clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function segmentIntersectsOrientedBox2D(ax, az, bx, bz, object, padding = 0) {
  const a = worldToBoxLocal(ax, az, object);
  const b = worldToBoxLocal(bx, bz, object);
  const minX = -object.halfWidth - padding;
  const maxX = object.halfWidth + padding;
  const minZ = -object.halfDepth - padding;
  const maxZ = object.halfDepth + padding;
  let tMin = 0;
  let tMax = 1;
  const dx = b.x - a.x;
  const dz = b.z - a.z;

  const clip = (p, q) => {
    if (Math.abs(p) < 0.0001) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return false;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return false;
      if (t < tMax) tMax = t;
    }
    return true;
  };

  return (
    clip(-dx, a.x - minX) &&
    clip(dx, maxX - a.x) &&
    clip(-dz, a.z - minZ) &&
    clip(dz, maxZ - a.z) &&
    tMax >= tMin
  );
}

function worldToBoxLocal(x, z, object) {
  const dx = x - object.x;
  const dz = z - object.z;
  const cos = Math.cos(-object.rotationY);
  const sin = Math.sin(-object.rotationY);
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos,
  };
}

function chooseBotTarget(bot, ai, now) {
  const cached = bot.userData.combatTarget;
  if (cached && now < bot.userData.scanAt) {
    const targetPosition = getTargetPosition(cached);
    const distance = flatDistance(bot.position, targetPosition);
    if (distance < ai.vision * 1.25 && (cached.type === "player" || cached.bot?.userData?.alive)) {
      return { ...cached, distance };
    }
  }

  bot.userData.scanAt = now + 160 + Math.random() * (ai.brain === "elite" ? 110 : 220);

  const focus = bot.userData.focus;
  if (focus?.userData?.alive) {
    const focusDistance = flatDistance(bot.position, focus.position);
    if (focusDistance < ai.vision * 1.35 && hasClearShot(bot.position, focus.position)) {
      const target = { type: "bot", bot: focus, distance: focusDistance };
      bot.userData.combatTarget = target;
      return target;
    }
    bot.userData.focus = null;
  }

  const playerDistance = flatDistance(bot.position, player.position);
  const playerVisible = playerDistance < ai.vision && hasClearShot(bot.position, player.position);
  const enemyBot = findBestVisibleBot(bot, ai.vision * 1.05);
  const enemyDistance = enemyBot ? flatDistance(bot.position, enemyBot.position) : Infinity;
  const options = [];

  if (playerVisible) {
    options.push({
      type: "player",
      distance: playerDistance,
      score: 1.1 + ai.aggression + (1 - playerDistance / ai.vision) * 1.4 + (now < bot.userData.aggroUntil ? 0.75 : 0),
    });
  }

  if (enemyBot) {
    options.push({
      type: "bot",
      bot: enemyBot,
      distance: enemyDistance,
      score: 1.25 + (1 - enemyDistance / ai.vision) * 1.6 + Math.random() * 0.35,
    });
  }

  if (!options.length) {
    bot.userData.combatTarget = null;
    return null;
  }

  options.sort((a, b) => b.score - a.score);
  const target = options[0];
  bot.userData.combatTarget = target;
  return target;
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
    if (object.kind === "box") {
      resolveBoxCollision(position, radius, object);
      continue;
    }
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

function resolveBoxCollision(position, radius, object) {
  if (position.y >= object.height + 0.8) return;
  const local = worldToBoxLocal(position.x, position.z, object);
  const halfWidth = object.halfWidth + radius;
  const halfDepth = object.halfDepth + radius;
  if (Math.abs(local.x) >= halfWidth || Math.abs(local.z) >= halfDepth) return;

  const pushX = halfWidth - Math.abs(local.x);
  const pushZ = halfDepth - Math.abs(local.z);
  if (pushX < pushZ) {
    local.x += local.x >= 0 ? pushX : -pushX;
  } else {
    local.z += local.z >= 0 ? pushZ : -pushZ;
  }

  const cos = Math.cos(object.rotationY);
  const sin = Math.sin(object.rotationY);
  position.x = object.x + local.x * cos - local.z * sin;
  position.z = object.z + local.x * sin + local.z * cos;
}

function updateHud() {
  const elapsed = Math.floor((performance.now() - startedAt) / 1000);
  timerEl.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  enemiesEl.textContent = bots.filter((bot) => bot.userData.alive).length;
  elimsEl.textContent = elims;
  healthBar.style.width = `${Math.max(0, health)}%`;
  shieldBar.style.width = `${shield}%`;
  staminaBar.style.width = `${stamina}%`;
  ammoEl.textContent = `${weapons[activeWeapon].ammo}/${weapons[activeWeapon].reserve}`;
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

function addKillFeed(attacker, victim) {
  const item = document.createElement("div");
  item.className = "feed-item";
  item.innerHTML = `<strong>${attacker}</strong> eliminated <strong>${victim}</strong>`;
  killFeed.prepend(item);
  setTimeout(() => item.remove(), 4200);
}

function randomPoint(radius) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function flatDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function repairKeybinds(binds) {
  const fixed = { ...binds };
  if (fixed.left === "KeyS" && fixed.backward === "KeyA") {
    fixed.left = "KeyA";
    fixed.backward = "KeyS";
  }
  if (fixed.left === "KeyD" && fixed.right === "KeyA") {
    fixed.left = "KeyA";
    fixed.right = "KeyD";
  }
  if (fixed.forward === "KeyA" && fixed.left === "KeyW") {
    fixed.forward = "KeyW";
    fixed.left = "KeyA";
  }
  return fixed;
}

function ensureAudio() {
  if (!audioState.ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    audioState.ctx = new AudioCtx();
    audioState.master = audioState.ctx.createGain();
    audioState.sfx = audioState.ctx.createGain();
    audioState.sfx.connect(audioState.master);
    audioState.master.connect(audioState.ctx.destination);
    updateAudioVolumes();
  }
  if (audioState.ctx.state === "suspended") audioState.ctx.resume();
  return true;
}

function updateAudioVolumes() {
  if (!audioState.ctx) return;
  audioState.master.gain.value = Number(masterVolumeRange.value || 86) / 100;
  audioState.sfx.gain.value = Number(sfxVolumeRange.value || 92) / 100;
}

function playTone(freq, duration, gain, type = "sine", bend = 0, delay = 0) {
  if (!ensureAudio()) return;
  const ctx = audioState.ctx;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(24, freq + bend), now + duration);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(audioState.sfx);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playNoise(duration, gain, filterFreq = 1200, filterType = "lowpass", delay = 0) {
  if (!ensureAudio()) return;
  const ctx = audioState.ctx;
  const now = ctx.currentTime + delay;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const fade = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * fade;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(audioState.sfx);
  source.start(now);
  source.stop(now + duration + 0.02);
}

function playGunSound(kind, volume = 1) {
  const loud = Math.max(0, volume);
  if (kind === "shotgun") {
    playNoise(0.18, 0.72 * loud, 850, "lowpass");
    playNoise(0.055, 0.5 * loud, 3600, "bandpass");
    playTone(82, 0.12, 0.34 * loud, "triangle", -34);
    playTone(190, 0.05, 0.13 * loud, "square", -80, 0.025);
    return;
  }
  if (kind === "smg") {
    playNoise(0.055, 0.42 * loud, 1900, "bandpass");
    playTone(150, 0.045, 0.2 * loud, "sawtooth", -48);
    playTone(640, 0.025, 0.07 * loud, "square", -180);
    return;
  }
  playNoise(0.09, 0.58 * loud, 1400, "bandpass");
  playTone(105, 0.08, 0.28 * loud, "triangle", -44);
  playTone(430, 0.035, 0.08 * loud, "square", -140, 0.015);
}

function playReloadSound() {
  playNoise(0.055, 0.2, 2400, "bandpass");
  playTone(430, 0.05, 0.06, "square", -90, 0.08);
  playNoise(0.06, 0.18, 1800, "bandpass", 0.16);
}

function playBuildSound() {
  playNoise(0.075, 0.28, 950, "lowpass");
  playTone(250, 0.07, 0.08, "triangle", 90);
}

function playChestSound() {
  playTone(520, 0.08, 0.12, "sine", 120);
  playTone(760, 0.11, 0.1, "sine", 180, 0.08);
  playNoise(0.08, 0.18, 3200, "bandpass");
}

function playHitSound() {
  playTone(820, 0.055, 0.1, "square", -260);
  playNoise(0.045, 0.12, 2500, "bandpass");
}

function playDamageSound() {
  playTone(150, 0.11, 0.16, "sawtooth", -70);
  playNoise(0.1, 0.15, 700, "lowpass");
}

function playVictorySound() {
  [440, 554, 659, 880].forEach((freq, index) => playTone(freq, 0.18, 0.11, "sine", 80, index * 0.08));
}

function playEmptyClick() {
  playNoise(0.035, 0.12, 3200, "highpass");
  playTone(250, 0.035, 0.04, "square", -80);
}

function getSelectedMap() {
  return mapPresets.find((map) => map.id === profile.selectedMap) || mapPresets[0];
}

function getPlayerSkin(id) {
  return playerSkins.find((skin) => skin.id === id) || playerSkins[0];
}

function getWeaponSkin(id) {
  return weaponSkins.find((skin) => skin.id === id) || weaponSkins[0];
}

function getShadowMapSize() {
  if (shadowQualitySelect.value === "off" || qualitySelect.value === "performance") return 512;
  if (shadowQualitySelect.value === "ultra" || qualitySelect.value === "cinematic") return 4096;
  if (shadowQualitySelect.value === "medium") return 1024;
  return 2048;
}

function applyRendererSettings() {
  if (!renderer) return;
  const resolutionScale = Number(resolutionScaleSelect.value || 1);
  const qualityCap = qualitySelect.value === "cinematic" ? 4 : qualitySelect.value === "epic" ? 3 : qualitySelect.value === "high" ? 2 : 1;
  const pixelRatio = qualitySelect.value === "performance" ? 1 : Math.min(devicePixelRatio * resolutionScale, qualityCap);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = shadowQualitySelect.value !== "off" && qualitySelect.value !== "performance";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function resetWeaponAmmo() {
  Object.values(weapons).forEach((weapon) => {
    weapon.ammo = weapon.mag;
    weapon.reserve = weapon.startReserve;
  });
}

function grantAmmo(kind, magazines = 1) {
  const weapon = weapons[kind] || weapons[activeWeapon];
  const amount = weapon.mag * magazines;
  weapon.reserve = Math.min(weapon.maxReserve, weapon.reserve + amount);
  return amount;
}

function isActionCode(action, code) {
  const bound = keybinds[action];
  if (code === bound) return true;
  return action === "sprint" && bound === "ShiftLeft" && code === "ShiftRight";
}

function isActionPressed(action) {
  const bound = keybinds[action];
  return keys.has(bound) || (action === "sprint" && bound === "ShiftLeft" && keys.has("ShiftRight"));
}

function keyLabel(code) {
  return code
    .replace("Key", "")
    .replace("Digit", "")
    .replace("ShiftLeft", "Shift")
    .replace("ShiftRight", "Shift")
    .replace("ControlLeft", "Ctrl")
    .replace("ControlRight", "Ctrl")
    .replace("AltLeft", "Alt")
    .replace("AltRight", "Alt")
    .replace("Space", "Space")
    .replace("Escape", "Esc");
}

function updateBindLabels() {
  bindButtons.forEach((button) => {
    button.querySelector("b").textContent = keyLabel(keybinds[button.dataset.bind] || "");
    button.classList.toggle("listening", waitingForBind === button.dataset.bind);
  });
  weaponSlots[0].querySelector("small").textContent = keyLabel(keybinds.weapon1);
  weaponSlots[1].querySelector("small").textContent = keyLabel(keybinds.weapon2);
  weaponSlots[2].querySelector("small").textContent = keyLabel(keybinds.weapon3);
  buildSlots[0].querySelector("small").textContent = keyLabel(keybinds.wall);
  buildSlots[1].querySelector("small").textContent = keyLabel(keybinds.ramp);
  buildSlots[2].querySelector("small").textContent = keyLabel(keybinds.floor);
}

function updateProfileUi() {
  coinAmount.textContent = profile.coins;
  renderShop();
  renderLocker();
  renderMaps();
}

function hexColor(value) {
  return `#${Number(value).toString(16).padStart(6, "0")}`;
}

function createPreviewMarkup(item, type) {
  if (type === "map") {
    return `
      <div class="item-preview map-preview" style="--sky:${hexColor(item.sky)};--ground:${hexColor(item.grass)};--water:${hexColor(item.water)};--road:${hexColor(item.road)};--sand:${hexColor(item.sand)}">
        <span class="preview-sky"></span>
        <span class="preview-ground"></span>
        <span class="preview-water"></span>
        <span class="preview-road"></span>
        <span class="preview-buildings"></span>
        <span class="preview-trees"></span>
      </div>
    `;
  }

  if (type === "player") {
    return `
      <div class="item-preview player-preview" style="--skin-a:${hexColor(item.primary)};--skin-b:${hexColor(item.accent)}">
        <span class="preview-body"></span>
        <span class="preview-head"></span>
        <span class="preview-visor"></span>
        <span class="preview-arm left"></span>
        <span class="preview-arm right"></span>
        <span class="preview-leg left"></span>
        <span class="preview-leg right"></span>
      </div>
    `;
  }

  return `
    <div class="item-preview weapon-preview" style="--wrap-a:${hexColor(item.body)};--wrap-b:${hexColor(item.secondary)};--wrap-dark:${hexColor(item.dark)};--wrap-accent:${hexColor(item.accent)}">
      <span class="preview-stock"></span>
      <span class="preview-gun-body"></span>
      <span class="preview-barrel"></span>
      <span class="preview-mag"></span>
      <span class="preview-grip"></span>
      <span class="preview-rail"></span>
    </div>
  `;
}

function renderShop() {
  shopGrid.innerHTML = "";
  const items = [
    ...weaponSkins.map((item) => ({ ...item, type: "weapon" })),
    ...playerSkins.map((item) => ({ ...item, type: "player" })),
  ];

  items.forEach((item) => {
    const owned = item.type === "weapon" ? profile.ownedWeaponSkins.includes(item.id) : profile.ownedPlayerSkins.includes(item.id);
    const equipped = item.type === "weapon" ? profile.equippedWeapon === item.id : profile.equippedPlayer === item.id;
    const card = document.createElement("article");
    card.className = `shop-card${equipped ? " active" : ""}`;
    card.innerHTML = `
      ${createPreviewMarkup(item, item.type)}
      <div class="item-copy">
        <strong>${item.name}</strong>
        <small>${item.type === "weapon" ? "Weapon Skin" : "Player Skin"} - ${item.detail}</small>
      </div>
      <button class="item-action" type="button">${equipped ? "Equipped" : owned ? "Equip" : `${item.price} credits`}</button>
    `;
    const action = card.querySelector("button");
    action.disabled = equipped;
    action.addEventListener("click", () => buyOrEquipItem(item, owned));
    shopGrid.appendChild(card);
  });
}

function renderLocker() {
  lockerGrid.innerHTML = "";
  const ownedItems = [
    ...weaponSkins.filter((item) => profile.ownedWeaponSkins.includes(item.id)).map((item) => ({ ...item, type: "weapon" })),
    ...playerSkins.filter((item) => profile.ownedPlayerSkins.includes(item.id)).map((item) => ({ ...item, type: "player" })),
  ];

  ownedItems.forEach((item) => {
    const equipped = item.type === "weapon" ? profile.equippedWeapon === item.id : profile.equippedPlayer === item.id;
    const card = document.createElement("article");
    card.className = `locker-card${equipped ? " active" : ""}`;
    card.innerHTML = `
      ${createPreviewMarkup(item, item.type)}
      <div class="item-copy">
        <strong>${item.name}</strong>
        <small>${item.type === "weapon" ? "Weapon wrap" : "Player outfit"}</small>
      </div>
      <button class="item-action" type="button">${equipped ? "Equipped" : "Equip"}</button>
    `;
    const action = card.querySelector("button");
    action.disabled = equipped;
    action.addEventListener("click", () => equipItem(item));
    lockerGrid.appendChild(card);
  });
}

function renderMaps() {
  mapGrid.innerHTML = "";
  mapPresets.forEach((map) => {
    const selected = profile.selectedMap === map.id;
    const card = document.createElement("article");
    card.className = `map-card${selected ? " active" : ""}`;
    card.innerHTML = `
      ${createPreviewMarkup(map, "map")}
      <div class="item-copy">
        <strong>${map.name}</strong>
        <small>${map.detail}</small>
      </div>
      <button class="item-action" type="button">${selected ? "Selected" : "Select"}</button>
    `;
    const action = card.querySelector("button");
    action.disabled = selected;
    action.addEventListener("click", () => {
      profile.selectedMap = map.id;
      saveProfile();
      updateProfileUi();
      showToast(`${map.name} selected`);
    });
    mapGrid.appendChild(card);
  });
}

function buyOrEquipItem(item, owned) {
  if (!owned) {
    if (profile.coins < item.price) {
      showToast("Not enough credits yet");
      return;
    }
    profile.coins -= item.price;
    if (item.type === "weapon") profile.ownedWeaponSkins.push(item.id);
    else profile.ownedPlayerSkins.push(item.id);
  }
  equipItem(item);
}

function equipItem(item) {
  if (item.type === "weapon") {
    profile.equippedWeapon = item.id;
    refreshWeaponModel();
  } else {
    profile.equippedPlayer = item.id;
  }
  saveProfile();
  updateProfileUi();
  showToast(`${item.name} equipped`);
}

playButton.addEventListener("click", startGame);
settingsToggle.addEventListener("click", () => settingsPanel.classList.toggle("open"));
lobbyButton.addEventListener("click", backToLobby);

function selectWeapon(kind) {
  activeWeapon = kind;
  weaponSlots.forEach((item) => item.classList.toggle("active", item.dataset.weapon === kind));
  refreshWeaponModel();
  updateHud();
}

weaponSlots.forEach((slot) => {
  slot.addEventListener("click", () => {
    selectWeapon(slot.dataset.weapon);
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
  if (waitingForBind) {
    event.preventDefault();
    keybinds[waitingForBind] = event.code;
    waitingForBind = null;
    updateBindLabels();
    saveSettings();
    showToast("Key bind saved");
    return;
  }

  keys.add(event.code);
  if (isActionCode("weapon1", event.code)) weaponSlots[0].click();
  if (isActionCode("weapon2", event.code)) weaponSlots[1].click();
  if (isActionCode("weapon3", event.code)) weaponSlots[2].click();
  if (!event.repeat && isActionCode("wall", event.code)) chooseBuildSlot(0, true);
  if (!event.repeat && isActionCode("ramp", event.code)) chooseBuildSlot(1, true);
  if (!event.repeat && isActionCode("floor", event.code)) chooseBuildSlot(2, true);
  if (!event.repeat && isActionCode("build", event.code)) buildPiece();
  if (!event.repeat && isActionCode("reload", event.code)) reloadWeapon();
  if (!event.repeat && isActionCode("pause", event.code)) {
    paused = !paused;
    showToast(paused ? "Paused" : "Resumed");
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    isFireHeld = true;
    shoot();
  }
  if (event.button === 2) isAiming = true;
});
window.addEventListener("mouseup", (event) => {
  if (event.button === 0) isFireHeld = false;
  if (event.button === 2) isAiming = false;
});
window.addEventListener("blur", () => {
  isFireHeld = false;
  isAiming = false;
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
  applyRendererSettings();
});

lobbyTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const panel = tab.dataset.lobbyPanel;
    lobbyTabs.forEach((button) => button.classList.toggle("active", button === tab));
    lobbyPanels.forEach((item) => item.classList.toggle("active", item.dataset.panel === panel));
  });
});

bindButtons.forEach((button) => {
  button.addEventListener("click", () => {
    waitingForBind = button.dataset.bind;
    updateBindLabels();
    showToast("Press a key for this bind");
  });
});

const settingsControls = [
  showFps,
  masterVolumeRange,
  sfxVolumeRange,
  qualitySelect,
  resolutionScaleSelect,
  shadowQualitySelect,
  entityDensitySelect,
  renderDistanceRange,
  fovRange,
  sensitivityRange,
  botBrainSelect,
  botVisionRange,
  botAccuracyRange,
  botAggressionRange,
  botCountSelect,
];

settingsControls.forEach((control) => {
  control.addEventListener("change", saveSettings);
  control.addEventListener("input", saveSettings);
});

[masterVolumeRange, sfxVolumeRange].forEach((control) => {
  control.addEventListener("input", updateAudioVolumes);
  control.addEventListener("change", () => {
    updateAudioVolumes();
    playTone(620, 0.05, 0.06, "sine", 80);
  });
});

[qualitySelect, resolutionScaleSelect, shadowQualitySelect, renderDistanceRange, fovRange].forEach((control) => {
  control.addEventListener("change", () => {
    applyRendererSettings();
    if (camera) {
      camera.far = Number(renderDistanceRange.value || 520);
      camera.fov = Number(fovRange.value || 68);
      camera.updateProjectionMatrix();
    }
    if (scene?.fog) scene.fog.far = Number(renderDistanceRange.value || 520);
  });
});

updateBindLabels();
updateProfileUi();
