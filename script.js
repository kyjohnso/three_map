import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const locations = [
  { "name": "Mount Everest, Himalayas", "lat": 27.9881, "lon": 86.9250, "zoom": 12 },
  { "name": "Grand Canyon, USA", "lat": 36.1069, "lon": -112.1129, "zoom": 12 },
  { "name": "Geirangerfjord, Norway", "lat": 62.1049, "lon": 7.0050, "zoom": 12 },
  { "name": "Uluru (Ayers Rock), Australia", "lat": -25.3444, "lon": 131.0369, "zoom": 12 },
  { "name": "Matterhorn, Swiss Alps", "lat": 45.9763, "lon": 7.6586, "zoom": 12 },
  { "name": "Mauna Kea, Hawaii", "lat": 19.8207, "lon": -155.4681, "zoom": 12 },
  { "name": "Dead Sea Region", "lat": 31.5590, "lon": 35.4732, "zoom": 12 },
  { "name": "Torres del Paine, Patagonia, Chile", "lat": -50.9423, "lon": -73.4068, "zoom": 12 },
  { "name": "Bryce Canyon, Utah, USA", "lat": 37.5930, "lon": -112.1871, "zoom": 12 },
  { "name": "Mount Fuji, Japan", "lat": 35.3606, "lon": 138.7274, "zoom": 12 },
  { "name": "Denali, Alaska", "lat": 63.0692, "lon": -151.0070, "zoom": 12 }
];

const scene = new THREE.Scene();
scene.rotation.x = -Math.PI / 2;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 15, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Add Axis Helper
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const latInput = document.getElementById('lat');
const lonInput = document.getElementById('lon');
const zoomInput = document.getElementById('zoom');
const randomBtn = document.getElementById('randomBtn');
const updateBtn = document.getElementById('updateBtn');
const locationNameDiv = document.getElementById('locationName');

updateBtn.addEventListener('click', updateTerrain);

// Event: Random location selection
randomBtn.addEventListener('click', () => {
  const randomIndex = Math.floor(Math.random() * locations.length);
  const loc = locations[randomIndex];

  latInput.value = loc.lat;
  lonInput.value = loc.lon;
  zoomInput.value = loc.zoom;

  locationNameDiv.textContent = loc.name;
  updateTerrain();
});

let currentMesh;

function getTileSizeMeters(lat, zoom) {
  const earthCircumference = 40075017;
  return (earthCircumference * Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom);
}

async function getTerrainTexture(x, y, z) {
  const tileUrl = `https://a.tile.opentopomap.org/${z}/${x}/${y}.png`;
  const loader = new THREE.TextureLoader();
  return loader.loadAsync(tileUrl);
}

async function getTerrainHeight(x, y, z) {
  const elevationUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  
  const img = await new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => resolve(image);
    image.src = elevationUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, 256, 256).data;
  const heights = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const height = (r * 256 + g + b / 256) - 32768;
    heights.push(height);
  }
  return heights;
}

async function buildTerrain(lat, lon, zoom) {
  if (currentMesh) {
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
    scene.remove(currentMesh);
  }

  const tileSizeMeters = getTileSizeMeters(lat, zoom);
  const x = long2tile(lon, zoom);
  const y = lat2tile(lat, zoom);
  const geometry = new THREE.PlaneGeometry(10, 10, 255, 255);
  const heights = await getTerrainHeight(x, y, zoom);

  const scaleHeight = 10 / tileSizeMeters;
  geometry.attributes.position.array.forEach((_, idx) => {
    geometry.attributes.position.array[idx * 3 + 2] = heights[idx] * scaleHeight;
  });
  geometry.computeVertexNormals();

  const texture = await getTerrainTexture(x, y, zoom);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  currentMesh = new THREE.Mesh(geometry, material);
  scene.add(currentMesh);
}

function updateTerrain() {
  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);
  const zoom = parseInt(zoomInput.value);
  buildTerrain(lat, lon, zoom);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

function long2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  return Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom));
}

updateTerrain();