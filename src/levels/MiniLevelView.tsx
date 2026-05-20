// MiniLevelView — generic embedded-scene component.
//
// Pattern: any level N's parent N+1 can render a thumbnail of level N's
// scene inline in its own SVG by passing the child's `SceneGeometry`
// (bounds + center + size) and the scene's React content. The view
// computes the world→parent-SVG transform, frames it, and (optionally)
// draws a border. The PARENT is responsible for wiring up the child's
// external terminals — typically via `projectSceneToMini` to compute
// where each child terminal lands in parent SVG coords.
//
// Reused by:
//   • LevelLatch → MiniNandView (gate scene embedded in latch)
//   • Future LevelDff → MiniLatchView (latch scene embedded in DFF)
//
// Why a single component / projection helper?
//   • Latch wire endpoints must align pixel-perfectly with where the
//     embedded gate's A/B/Y/Vdd/GND terminals render. The projection has
//     to be computed identically inside the scene (for the transform)
//     AND outside (for the latch's anchor calculations). Putting both
//     in this single module makes them share the same code path.
//   • The loose-end detection test category (external / absorbed /
//     junction / T-junction) generalizes to any level. The geometry +
//     terminals are enough to write the test once.

import type { ReactNode } from 'react';

export interface SceneGeometry {
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  center: { x: number; y: number };
  size: { w: number; h: number };
}

export interface MiniLevelViewProps {
  /** Center of the mini box in parent SVG coords. */
  cx: number;
  cy: number;
  /** Mini box footprint in parent SVG units. */
  w: number;
  h: number;
  /** The embedded child level's scene geometry (world coords). */
  geometry: SceneGeometry;
  /** Padding around the scene inside the mini box (1.0 = no padding). */
  margin?: number;
  /** Optional test id on the outer <g>. */
  testid?: string;
  /** Optional border stroke color; omit for no visible frame. */
  frameStroke?: string;
  /** Optional opaque background fill — used for hover-overlay minis that
   * must COVER the parent's underlying symbols (otherwise the parent's
   * version and the preview's version of the same component overlap). */
  frameFill?: string;
  /** The child scene content, rendered in world coordinates. */
  children: ReactNode;
}

/**
 * Compute the uniform world→pixel scale for fitting a scene of given
 * geometry into a (boxW × boxH) rectangle with `margin` padding on the
 * more-constraining axis.
 */
export function fitForGeometry(boxW: number, boxH: number, geometry: SceneGeometry, margin = 1.2) {
  const sceneAspect = geometry.size.w / geometry.size.h;
  const boxAspect = boxW / boxH;
  if (boxAspect >= sceneAspect) {
    return { pxPerWorld: boxH / (geometry.size.h * margin), fitBy: 'height' as const };
  } else {
    return { pxPerWorld: boxW / (geometry.size.w * margin), fitBy: 'width' as const };
  }
}

/**
 * Project a scene-world coordinate into the parent's SVG coords given the
 * mini's placement. Use this in the parent component to compute where to
 * route its external wires so they meet the embedded child's terminals.
 */
export function projectSceneToMini(
  worldX: number,
  worldY: number,
  miniCx: number,
  miniCy: number,
  miniW: number,
  miniH: number,
  geometry: SceneGeometry,
  margin = 1.2,
): { x: number; y: number } {
  const { pxPerWorld } = fitForGeometry(miniW, miniH, geometry, margin);
  return {
    x: miniCx + (worldX - geometry.center.x) * pxPerWorld,
    y: miniCy - (worldY - geometry.center.y) * pxPerWorld,
  };
}

export function MiniLevelView({
  cx, cy, w, h, geometry, margin = 1.2, testid, frameStroke, frameFill, children,
}: MiniLevelViewProps) {
  const { pxPerWorld } = fitForGeometry(w, h, geometry, margin);
  const left = cx - w / 2;
  const top = cy - h / 2;
  // World → mini SVG: translate to mini center, scale by pxPerWorld with
  // a Y-axis flip (world up = SVG down), then shift the scene centroid
  // to world origin.
  const transform = `translate(${cx}, ${cy}) scale(${pxPerWorld}, ${-pxPerWorld}) translate(${-geometry.center.x}, ${-geometry.center.y})`;
  return (
    <g data-testid={testid}>
      {frameStroke !== undefined && (
        <rect x={left} y={top} width={w} height={h} fill={frameFill ?? 'none'} stroke={frameStroke} strokeWidth={1} rx={4} />
      )}
      <g transform={transform}>{children}</g>
    </g>
  );
}
