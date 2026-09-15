// render/ — three.js scene assembly for the "Soft Clay · Lit" look
// (tech-spec §4, tracker/tickets/003): straight-on ~35° perspective camera,
// InstancedMesh per diggable tile type, soft MeshStandardMaterial lighting,
// dark back wall, sky background, grass strip. Not headless-testable (needs
// a real WebGL context), so the grid-space math it depends on lives in
// worldSpace.ts/tileInstances.ts where it can be unit tested instead.

import * as THREE from 'three';
import { collectTilePositions, buildTileIndex, tileKey, type TilePosition } from './tileInstances';
import { tileCenterWorldX, tileCenterWorldY, toWorldX, toWorldY } from './worldSpace';
import type { TileGrid } from '../core/tileGrid';

const FOV_DEGREES = 35;
const TILES_ACROSS = 16;
const DIGGABLE_TYPES = ['dirt', 'rock'] as const;
type DiggableType = (typeof DIGGABLE_TYPES)[number];

const TILE_COLORS: Record<DiggableType, number> = {
  dirt: 0xa9714b,
  rock: 0x6e6862,
};

const SKY_COLOR = 0x8ec7e6;
const BACK_WALL_COLOR = 0x221510;
const GRASS_COLOR = 0x6fae4e;

const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

function jitteredColor(base: number, seed: number): THREE.Color {
  const color = new THREE.Color(base);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const jitter = ((seed * 2654435761) >>> 0) % 100 / 100;
  color.setHSL(hsl.h, hsl.s, hsl.l * (0.92 + jitter * 0.16));
  return color;
}

/** Rounded/beveled tile per ticket 003's "Look C" resolution. */
function roundedTileGeometry(): THREE.ExtrudeGeometry {
  const radius = 0.16;
  const half = 0.48;
  const shape = new THREE.Shape();
  shape.moveTo(-half + radius, -half);
  shape.lineTo(half - radius, -half);
  shape.quadraticCurveTo(half, -half, half, -half + radius);
  shape.lineTo(half, half - radius);
  shape.quadraticCurveTo(half, half, half - radius, half);
  shape.lineTo(-half + radius, half);
  shape.quadraticCurveTo(-half, half, -half, half - radius);
  shape.lineTo(-half, -half + radius);
  shape.quadraticCurveTo(-half, -half, -half + radius, -half);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.7,
    bevelEnabled: true,
    bevelSize: 0.07,
    bevelThickness: 0.09,
    bevelSegments: 3,
    curveSegments: 5,
  });
  geometry.translate(0, 0, -0.45);
  return geometry;
}

function cameraDistanceForAspect(aspect: number): number {
  const vfov = (FOV_DEGREES * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  return TILES_ACROSS / 2 / Math.tan(hfov / 2);
}

function buildTileTypeMesh(
  grid: TileGrid,
  type: DiggableType,
  geometry: THREE.BufferGeometry,
): { mesh: THREE.InstancedMesh; index: ReadonlyMap<string, number>; positions: TilePosition[] } {
  const positions = collectTilePositions(grid, type);
  const material = new THREE.MeshStandardMaterial({ color: TILE_COLORS[type], roughness: 0.85, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(positions.length, 1));
  mesh.count = positions.length;
  positions.forEach((position, i) => {
    const matrix = new THREE.Matrix4().makeTranslation(
      tileCenterWorldX(position.col),
      tileCenterWorldY(position.row),
      0,
    );
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, jitteredColor(TILE_COLORS[type], position.col + position.row * grid.width));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return { mesh, index: buildTileIndex(positions), positions };
}

function buildGrassStrip(grid: TileGrid): THREE.InstancedMesh {
  const geometry = new THREE.BoxGeometry(1, 0.18, 1.02);
  const material = new THREE.MeshStandardMaterial({ color: GRASS_COLOR, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geometry, material, grid.width);
  for (let col = 0; col < grid.width; col++) {
    const matrix = new THREE.Matrix4().makeTranslation(tileCenterWorldX(col), tileCenterWorldY(-1), 0);
    mesh.setMatrixAt(col, matrix);
    mesh.setColorAt(col, jitteredColor(GRASS_COLOR, col));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function buildPlayerBlob(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.4, 24, 18);
  const material = new THREE.MeshStandardMaterial({ color: 0xe8823c, roughness: 0.85, metalness: 0 });
  const blob = new THREE.Mesh(geometry, material);
  blob.scale.set(1, 0.95, 1);
  blob.position.z = 0.12;
  return blob;
}

/** Blob shadow, deliberately stubbed per tech-spec §4 ("blob shadows ok to stub"). */
function buildPlayerShadow(): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(0.32, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
  const shadow = new THREE.Mesh(geometry, material);
  shadow.position.z = 0.02;
  return shadow;
}

export interface InitialPlayerPosition {
  x: number;
  y: number;
}

export interface SceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: THREE.Object3D;
  playerShadow: THREE.Object3D;
  hideTile(type: DiggableType, col: number, row: number): void;
  resize(aspect: number): void;
  dispose(): void;
}

export function buildScene(grid: TileGrid, initialPlayer: InitialPlayerPosition): SceneHandle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);

  // ≤3 dynamic lights total (tech-spec §4 performance rules).
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.0);
  sun.position.set(6, 9, 7);
  const hemi = new THREE.HemisphereLight(0xfff6e6, 0x3a2a1e, 0.7);
  scene.add(ambient, sun, hemi);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(grid.width + 4, grid.height + 4),
    new THREE.MeshBasicMaterial({ color: BACK_WALL_COLOR }),
  );
  backWall.position.set(tileCenterWorldX(grid.width / 2 - 0.5), tileCenterWorldY(grid.height / 2 - 0.5), -0.6);
  scene.add(backWall);

  const tileGeometry = roundedTileGeometry();
  const tileMeshes = new Map<DiggableType, { mesh: THREE.InstancedMesh; index: ReadonlyMap<string, number> }>();
  for (const type of DIGGABLE_TYPES) {
    const { mesh, index } = buildTileTypeMesh(grid, type, tileGeometry);
    scene.add(mesh);
    tileMeshes.set(type, { mesh, index });
  }

  const grass = buildGrassStrip(grid);
  scene.add(grass);

  const player = buildPlayerBlob();
  const playerShadow = buildPlayerShadow();
  player.position.x = toWorldX(initialPlayer.x);
  player.position.y = toWorldY(initialPlayer.y);
  playerShadow.position.x = player.position.x;
  playerShadow.position.y = player.position.y;
  scene.add(playerShadow, player);

  const camera = new THREE.PerspectiveCamera(FOV_DEGREES, 1, 0.1, 200);
  camera.position.set(player.position.x, player.position.y, cameraDistanceForAspect(1));

  function hideTile(type: DiggableType, col: number, row: number): void {
    const entry = tileMeshes.get(type);
    if (!entry) return;
    const i = entry.index.get(tileKey(col, row));
    if (i === undefined) return;
    entry.mesh.setMatrixAt(i, HIDDEN_MATRIX);
    entry.mesh.instanceMatrix.needsUpdate = true;
  }

  function resize(aspect: number): void {
    camera.aspect = aspect;
    camera.position.z = cameraDistanceForAspect(aspect);
    camera.updateProjectionMatrix();
  }

  function dispose(): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
  }

  return { scene, camera, player, playerShadow, hideTile, resize, dispose };
}
