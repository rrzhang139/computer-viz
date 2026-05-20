// ConnectedMosfet — a MOSFET rendered to FIT the wire connection points
// of its parent gate. No rotation hack, no overlay: the source slab sits
// at the actual source-wire endpoint, the drain slab at the drain endpoint,
// the gate strip extends from the gate-wire endpoint to the body. The
// electron pulse drifts source → drain along the body axis.
//
// Use this anywhere the parent already knows where the wires meet the
// transistor (the gate-level NAND has this from its WIRES list).

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { parchment } from './parchment';
import type { Point3 } from './transistorConnections';

// Color palette — same lit-3D values that match LevelTransistor visually.
const NMOS_SUBSTRATE = '#a89876';
const NMOS_DOPED = '#7a8fa3';
const PMOS_SUBSTRATE = '#6e8a8c';
const PMOS_DOPED = '#b86b53';
const POLY_GATE = parchment.gate;
const CHANNEL_COLOR = parchment.electronGlow;

function conducts(kind: 'pmos' | 'nmos', gateOn: number): number {
  return kind === 'pmos' ? 1 - gateOn : gateOn;
}

export interface ConnectedMosfetProps {
  kind: 'pmos' | 'nmos';
  /** World coords where the source-side wire meets the transistor. */
  source: Point3;
  /** World coords where the drain-side wire meets the transistor. */
  drain: Point3;
  /** World coords where the gate-input wire meets the transistor. */
  gate: Point3;
  gateOn: number;
  /** Label at the TOP terminal (whichever terminal is higher in y). */
  topNet?: string;
  /** Label at the BOTTOM terminal. */
  bottomNet?: string;
  /** Label at the gate terminal. */
  gateNet?: string;
  /** Fixed body width perpendicular to the source→drain axis. */
  bodyWidth?: number;
}

export function ConnectedMosfet({
  kind,
  source,
  drain,
  gate,
  gateOn,
  topNet,
  bottomNet,
  gateNet,
  bodyWidth = 0.5,
}: ConnectedMosfetProps) {
  const isPmos = kind === 'pmos';
  const substrateColor = isPmos ? PMOS_SUBSTRATE : NMOS_SUBSTRATE;
  const dopedColor = isPmos ? PMOS_DOPED : NMOS_DOPED;

  // Body axis: source → drain. We assume an axis-aligned (vertical or
  // horizontal) line — the gate-level wiring is grid-aligned. Compute the
  // axis direction + length, then build the slab around the midpoint.
  const dx = drain[0] - source[0];
  const dy = drain[1] - source[1];
  const isVertical = Math.abs(dy) >= Math.abs(dx);
  const length = isVertical ? Math.abs(dy) : Math.abs(dx);
  const cx = (source[0] + drain[0]) / 2;
  const cy = (source[1] + drain[1]) / 2;
  const cz = (source[2] + drain[2]) / 2;

  // Gate strip extends from the gate point toward the substrate edge.
  // For vertical body, the gate is on the left or right side of the body.
  const gateSideSign = isVertical ? Math.sign(gate[0] - cx) : Math.sign(gate[1] - cy);
  const bodyEdgeX = isVertical ? cx + (gateSideSign * bodyWidth) / 2 : cx;
  const bodyEdgeY = isVertical ? cy : cy + (gateSideSign * bodyWidth) / 2;
  const stripCenter: [number, number, number] = isVertical
    ? [(gate[0] + bodyEdgeX) / 2, gate[1], cz + 0.05]
    : [gate[0], (gate[1] + bodyEdgeY) / 2, cz + 0.05];
  const stripLength = isVertical
    ? Math.abs(gate[0] - bodyEdgeX)
    : Math.abs(gate[1] - bodyEdgeY);
  const stripBox: [number, number, number] = isVertical
    ? [stripLength, 0.16, 0.18]
    : [0.16, stripLength, 0.18];

  // Substrate, source/drain, channel meshes are positioned in body-local
  // coords; we wrap them in a group at (cx, cy, cz). For a horizontal
  // body we'd want to rotate, but since the gate-level layout is purely
  // vertical-bodied, we keep things axis-aligned.
  const dopedH = Math.min(0.22, length * 0.35);

  // Channel + electron refs.
  const channelRef = useRef<THREE.Mesh>(null);
  const electronRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (channelRef.current) {
      const c = conducts(kind, gateOn);
      const mat = channelRef.current.material as THREE.MeshStandardMaterial;
      mat.emissive.set(CHANNEL_COLOR);
      const pulse = c > 0.5 ? 0.5 + 0.4 * Math.sin(performance.now() * 0.008) : 0;
      mat.emissiveIntensity = c * 0.7 + pulse;
      mat.opacity = 0.18 + c * 0.55;
    }
    if (electronRef.current) {
      const c = conducts(kind, gateOn);
      const visible = c > 0.5;
      electronRef.current.visible = visible;
      if (!visible) return;
      // Animate in the CONVENTIONAL CURRENT direction so the visible flow
      // matches the parent gate's existing wire pulses (which all stream
      // top → bottom along the supply→output→GND axis):
      //   PMOS pull-up: source(Vdd, top)  → drain(Y, bottom)
      //   NMOS pull-down: drain(Y, top)   → source(mid/GND, bottom)
      // → unified rule: animate from the higher-y terminal to the lower-y.
      const [hi, lo] = source[1] >= drain[1] ? [source, drain] : [drain, source];
      const period = 1100;
      const t = (performance.now() % period) / period;
      const x = hi[0] + (lo[0] - hi[0]) * t;
      const y = hi[1] + (lo[1] - hi[1]) * t;
      const z = hi[2] + (lo[2] - hi[2]) * t + 0.5;
      electronRef.current.position.set(x, y, z);
    }
  });

  return (
    <group>
      {/* Substrate slab — spans the source→drain axis, centered between them */}
      <mesh position={[cx, cy, cz]}>
        <boxGeometry args={isVertical ? [bodyWidth, length + 0.04, 0.18] : [length + 0.04, bodyWidth, 0.18]} />
        <meshStandardMaterial color={substrateColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Source doped chip — sits AT the source-wire endpoint */}
      <mesh position={[source[0], source[1], source[2] + 0.1]}>
        <boxGeometry args={isVertical ? [bodyWidth - 0.1, dopedH, 0.06] : [dopedH, bodyWidth - 0.1, 0.06]} />
        <meshStandardMaterial color={dopedColor} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Drain doped chip — sits AT the drain-wire endpoint */}
      <mesh position={[drain[0], drain[1], drain[2] + 0.1]}>
        <boxGeometry args={isVertical ? [bodyWidth - 0.1, dopedH, 0.06] : [dopedH, bodyWidth - 0.1, 0.06]} />
        <meshStandardMaterial color={dopedColor} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Channel — thin glow strip running source→drain through the body */}
      <mesh ref={channelRef} position={[cx, cy, cz + 0.13]}>
        <boxGeometry args={isVertical ? [0.18, length * 0.9, 0.04] : [length * 0.9, 0.18, 0.04]} />
        <meshStandardMaterial color={CHANNEL_COLOR} emissive={CHANNEL_COLOR} emissiveIntensity={0} transparent opacity={0.18} />
      </mesh>

      {/* Polysilicon gate strip running from the gate-wire endpoint to the body edge */}
      <mesh position={stripCenter}>
        <boxGeometry args={stripBox} />
        <meshStandardMaterial color={POLY_GATE} emissive={CHANNEL_COLOR} emissiveIntensity={gateOn * 0.3} roughness={0.55} metalness={0.2} />
      </mesh>
      {/* Polysilicon "tab" hugging the body edge so the strip clearly attaches */}
      <mesh position={[isVertical ? bodyEdgeX : cx, isVertical ? cy : bodyEdgeY, cz + 0.05]}>
        <boxGeometry args={isVertical ? [0.08, length * 0.7, 0.22] : [length * 0.7, 0.08, 0.22]} />
        <meshStandardMaterial color={POLY_GATE} emissive={CHANNEL_COLOR} emissiveIntensity={gateOn * 0.4} roughness={0.55} metalness={0.2} />
      </mesh>
      {/* PMOS bubble (active-low marker) right at the gate point */}
      {isPmos && (
        <mesh position={[gate[0], gate[1], gate[2] + 0.15]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={parchment.bg} emissive={parchment.gateOn} emissiveIntensity={0.3} />
        </mesh>
      )}

      {/* Electron pulse — bright sphere drifting source → drain along the
          ACTUAL wire-connected axis. depthTest:false + renderOrder:999 so
          it draws on top of every other mesh. */}
      <mesh ref={electronRef} visible={false} renderOrder={999}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial
          color={CHANNEL_COLOR}
          emissive={CHANNEL_COLOR}
          emissiveIntensity={1.4}
          toneMapped={false}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Net labels — placed at the actual terminal positions so the user
          sees the parent wire literally meeting the body. Top/bottom is
          spatial (y-axis), independent of which terminal is source vs
          drain (PMOS source is on top, NMOS source is on bottom). */}
      {topNet && (() => {
        const top = source[1] >= drain[1] ? source : drain;
        return (
          <Text
            position={[top[0] + (isVertical ? bodyWidth / 2 + 0.2 : 0), top[1], top[2] + 0.5]}
            fontSize={0.22}
            color={parchment.gateOn}
            anchorX="left"
            outlineWidth={0.014}
            outlineColor={parchment.bg}
            fontWeight="bold"
          >
            {topNet}
          </Text>
        );
      })()}
      {bottomNet && (() => {
        const bot = source[1] < drain[1] ? source : drain;
        return (
          <Text
            position={[bot[0] + (isVertical ? bodyWidth / 2 + 0.2 : 0), bot[1], bot[2] + 0.5]}
            fontSize={0.22}
            color={parchment.gateOn}
            anchorX="left"
            outlineWidth={0.014}
            outlineColor={parchment.bg}
            fontWeight="bold"
          >
            {bottomNet}
          </Text>
        );
      })()}
      {gateNet && (
        <Text
          // Push the label OUTWARD from the body — Math.sign(gate[0]-cx)
          // is +1 if gate is to the right of body, -1 if to the left, so
          // adding a positive multiple of that sign moves the label further
          // away from the body in the same direction as the gate stub.
          position={[gate[0] + (isVertical ? 0.5 * Math.sign(gate[0] - cx) : 0), gate[1], gate[2] + 0.5]}
          fontSize={0.22}
          color={parchment.gateOn}
          anchorX={isVertical ? (gate[0] < cx ? 'right' : 'left') : 'center'}
          outlineWidth={0.014}
          outlineColor={parchment.bg}
          fontWeight="bold"
        >
          {gateNet}
        </Text>
      )}
    </group>
  );
}
