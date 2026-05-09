// LevelGate — CMOS NAND gate, 4 transistors wired up.
//
// Topology:
//   Vdd ────────────────────────────────────
//          │                          │
//         [P_A]────────────────────[P_B]    ← PMOS pull-up (parallel)
//          │                          │
//          └──────────┬───────────────┘
//                     │
//                     ● Y                   ← output node
//                     │
//                    [N_A]                  ← NMOS pull-down (series)
//                     │
//                    [N_B]
//                     │
//                    GND
//
// Inputs A, B drive both the PMOS gates (turn on when input is LOW) and
// the NMOS gates (turn on when input is HIGH). Output Y = NAND(A, B).
//
// Clock advances inputs through the truth table on each tick:
//   cycle 0: A=0 B=0  →  Y=1
//   cycle 1: A=0 B=1  →  Y=1
//   cycle 2: A=1 B=1  →  Y=0
//   cycle 3: A=1 B=0  →  Y=1
//
// Active transistors glow. Active wires (the path connecting Y to Vdd or
// GND) carry the same color as their net potential. Click any transistor
// to fly the camera into it and see the device itself.

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';

type Bit = 0 | 1;
interface Inputs { A: Bit; B: Bit; Y: Bit }

interface TransistorSpec {
  id: number;
  role: 'P_A' | 'P_B' | 'N_A' | 'N_B';
  kind: 'PMOS' | 'NMOS';
  input: 'A' | 'B';
  x: number;
  y: number;
}

const TRANSISTORS: readonly TransistorSpec[] = [
  { id: 0, role: 'P_A', kind: 'PMOS', input: 'A', x: -1.6, y: 1.5 },
  { id: 1, role: 'P_B', kind: 'PMOS', input: 'B', x:  1.6, y: 1.5 },
  { id: 2, role: 'N_A', kind: 'NMOS', input: 'A', x:  0,   y: -0.6 },
  { id: 3, role: 'N_B', kind: 'NMOS', input: 'B', x:  0,   y: -2.4 },
];

const HOME_POS = new THREE.Vector3(0, 0, 9.5);
const HOME_LOOK = new THREE.Vector3(0, 0, 0);

function targetPoseFor(idx: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
  const t = TRANSISTORS[idx];
  return {
    pos: new THREE.Vector3(t.x, t.y, 3.0),
    look: new THREE.Vector3(t.x, t.y, 0),
  };
}

function inputsFor(cycle: number): Inputs {
  // Gray code through the truth table: 00, 01, 11, 10
  const seq: [Bit, Bit][] = [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
  ];
  const [A, B] = seq[((cycle % 4) + 4) % 4];
  const Y: Bit = A === 1 && B === 1 ? 0 : 1;
  return { A, B, Y };
}

function isOn(t: TransistorSpec, inputs: Inputs): boolean {
  const v = inputs[t.input];
  // PMOS conducts when its gate is LOW; NMOS when HIGH.
  return t.kind === 'PMOS' ? v === 0 : v === 1;
}

const NET_HIGH_COLOR = parchment.gateOn;       // terracotta
const NET_LOW_COLOR = parchment.ink;           // dark sepia
const RAIL_VDD_COLOR = parchment.gateOn;
const RAIL_GND_COLOR = parchment.ink;

interface MosfetProps {
  t: TransistorSpec;
  on: boolean;
  hovered: boolean;
  onHover: (idx: number | null) => void;
  onClick: (idx: number) => void;
}

function Mosfet({ t, on, hovered, onHover, onClick }: MosfetProps) {
  const bodyRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!bodyRef.current) return;
    const m = bodyRef.current.material as THREE.MeshStandardMaterial;
    m.emissive.set(t.kind === 'PMOS' ? parchment.gateOn : parchment.electronGlow);
    m.emissiveIntensity = on ? 0.55 + Math.sin(performance.now() * 0.004) * 0.1 : 0;
  });

  return (
    <group
      position={[t.x, t.y, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(t.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(t.id);
      }}
    >
      {/* the body — a small box; PMOS slightly bluer, NMOS warmer */}
      <mesh ref={bodyRef}>
        <boxGeometry args={[0.7, 0.5, 0.3]} />
        <meshStandardMaterial
          color={t.kind === 'PMOS' ? '#7a8fa3' : parchment.gate}
          emissive={parchment.gateOn}
          emissiveIntensity={0}
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>
      {/* gate stub on the side (visual cue for the input terminal) */}
      <mesh position={[t.kind === 'PMOS' && t.x < 0 ? -0.45 : 0.45, 0, 0]}>
        <boxGeometry args={[0.18, 0.1, 0.32]} />
        <meshStandardMaterial color={parchment.gate} roughness={0.6} />
      </mesh>
      {/* hover ring (cyan/orange, "this is clickable") */}
      {hovered && (
        <mesh position={[0, 0, -0.12]}>
          <ringGeometry args={[0.55, 0.65, 24]} />
          <meshBasicMaterial color={parchment.gateOn} transparent opacity={0.7} />
        </mesh>
      )}
      {/* role label */}
      <Text position={[0, 0.55, 0]} fontSize={0.22} color={parchment.ink} anchorX="center">
        {t.role}
      </Text>
    </group>
  );
}

interface WireSpec {
  pts: [number, number, number][];
  netLow: string;   // color when net is at low potential
  netHigh: string;  // color when net is at high potential
  net: 'Vdd' | 'GND' | 'Y' | 'mid' | 'A' | 'B';
}

const WIRES: readonly WireSpec[] = [
  // Vdd rail (always high)
  { pts: [[-3, 3, 0], [3, 3, 0]], netLow: RAIL_VDD_COLOR, netHigh: RAIL_VDD_COLOR, net: 'Vdd' },
  // Vdd → PMOS drains
  { pts: [[-1.6, 3, 0], [-1.6, 1.85, 0]], netLow: RAIL_VDD_COLOR, netHigh: RAIL_VDD_COLOR, net: 'Vdd' },
  { pts: [[ 1.6, 3, 0], [ 1.6, 1.85, 0]], netLow: RAIL_VDD_COLOR, netHigh: RAIL_VDD_COLOR, net: 'Vdd' },
  // PMOS sources → Y junction
  { pts: [[-1.6, 1.15, 0], [-1.6, 0.5, 0], [1.6, 0.5, 0], [1.6, 1.15, 0]], netLow: NET_LOW_COLOR, netHigh: NET_HIGH_COLOR, net: 'Y' },
  // Y → output marker (right of the gate)
  { pts: [[0, 0.5, 0], [3.0, 0.5, 0]], netLow: NET_LOW_COLOR, netHigh: NET_HIGH_COLOR, net: 'Y' },
  // Y junction → N_A drain
  { pts: [[0, 0.5, 0], [0, -0.25, 0]], netLow: NET_LOW_COLOR, netHigh: NET_HIGH_COLOR, net: 'Y' },
  // N_A source → N_B drain (mid net)
  { pts: [[0, -0.95, 0], [0, -2.05, 0]], netLow: NET_LOW_COLOR, netHigh: NET_LOW_COLOR, net: 'mid' },
  // N_B source → GND
  { pts: [[0, -2.75, 0], [0, -3.5, 0]], netLow: RAIL_GND_COLOR, netHigh: RAIL_GND_COLOR, net: 'GND' },
  // GND rail
  { pts: [[-3, -3.5, 0], [3, -3.5, 0]], netLow: RAIL_GND_COLOR, netHigh: RAIL_GND_COLOR, net: 'GND' },
  // A input wires (gates of P_A and N_A)
  { pts: [[-4, 1.5, 0], [-2.05, 1.5, 0]], netLow: NET_LOW_COLOR, netHigh: NET_HIGH_COLOR, net: 'A' },
  { pts: [[-3.2, 1.5, 0], [-3.2, -0.6, 0], [-0.45, -0.6, 0]], netLow: NET_LOW_COLOR, netHigh: NET_HIGH_COLOR, net: 'A' },
  // B input wires (gates of P_B and N_B)
  { pts: [[ 4, 1.5, 0], [ 2.05, 1.5, 0]], netLow: NET_LOW_COLOR, netHigh: NET_HIGH_COLOR, net: 'B' },
  { pts: [[ 3.2, 1.5, 0], [ 3.2, -2.4, 0], [ 0.45, -2.4, 0]], netLow: NET_LOW_COLOR, netHigh: NET_HIGH_COLOR, net: 'B' },
];

function netColorFor(net: WireSpec['net'], inputs: Inputs): string {
  switch (net) {
    case 'Vdd': return RAIL_VDD_COLOR;
    case 'GND': return RAIL_GND_COLOR;
    case 'A': return inputs.A === 1 ? NET_HIGH_COLOR : NET_LOW_COLOR;
    case 'B': return inputs.B === 1 ? NET_HIGH_COLOR : NET_LOW_COLOR;
    case 'Y': return inputs.Y === 1 ? NET_HIGH_COLOR : NET_LOW_COLOR;
    case 'mid': {
      // mid is at GND when both NMOS conducting (path open to GND), otherwise floating
      return inputs.A === 1 && inputs.B === 1 ? RAIL_GND_COLOR : NET_LOW_COLOR;
    }
  }
}

function NandScene({
  inputs,
  hovered,
  onHover,
  onClick,
}: {
  inputs: Inputs;
  hovered: number | null;
  onHover: (i: number | null) => void;
  onClick: (i: number) => void;
}) {
  return (
    <>
      {/* wires */}
      {WIRES.map((w, i) => (
        <Line
          key={i}
          points={w.pts}
          color={netColorFor(w.net, inputs)}
          lineWidth={3}
        />
      ))}
      {/* transistors */}
      {TRANSISTORS.map((t) => (
        <Mosfet
          key={t.id}
          t={t}
          on={isOn(t, inputs)}
          hovered={hovered === t.id}
          onHover={onHover}
          onClick={onClick}
        />
      ))}
      {/* labels */}
      <Text position={[-3.4, 3.0, 0]} fontSize={0.28} color={RAIL_VDD_COLOR} anchorX="right">
        Vdd
      </Text>
      <Text position={[-3.4, -3.5, 0]} fontSize={0.28} color={RAIL_GND_COLOR} anchorX="right">
        GND
      </Text>
      <Text position={[-4.2, 1.5, 0]} fontSize={0.32} color={parchment.ink} anchorX="right">
        A
      </Text>
      <Text position={[ 4.2, 1.5, 0]} fontSize={0.32} color={parchment.ink} anchorX="left">
        B
      </Text>
      <Text position={[ 3.2, 0.85, 0]} fontSize={0.32} color={parchment.ink} anchorX="left">
        Y
      </Text>
    </>
  );
}

const FLY_DURATION_S = 1.0;
function CameraRig({
  targetIdx,
  onArrived,
}: {
  targetIdx: number | null;
  onArrived: (idx: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const arrivedFor = useRef<number | null>(null);
  const lastTarget = useRef<number | null>(null);
  const flyStartMs = useRef<number | null>(null);
  const startPos = useRef(new THREE.Vector3());
  const startLook = useRef(new THREE.Vector3().copy(HOME_LOOK));
  const lookVec = useRef(new THREE.Vector3().copy(HOME_LOOK));

  useFrame(() => {
    if (lastTarget.current !== targetIdx) {
      lastTarget.current = targetIdx;
      flyStartMs.current = performance.now();
      startPos.current.copy(camera.position);
      startLook.current.copy(lookVec.current);
      if (targetIdx === null) arrivedFor.current = null;
    }
    const want = targetIdx === null
      ? { pos: HOME_POS, look: HOME_LOOK }
      : targetPoseFor(targetIdx);
    const elapsed = (performance.now() - (flyStartMs.current ?? 0)) / 1000;
    const t = Math.min(1, elapsed / FLY_DURATION_S);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos.current, want.pos, e);
    lookVec.current.lerpVectors(startLook.current, want.look, e);
    camera.lookAt(lookVec.current);

    if (targetIdx !== null && arrivedFor.current !== targetIdx && t >= 1) {
      arrivedFor.current = targetIdx;
      onArrived(targetIdx);
    }
  });
  return null;
}

function HoverTargets({
  onHover,
  onClick,
}: {
  onHover: (i: number | null) => void;
  onClick: (i: number) => void;
}) {
  return (
    <>
      {TRANSISTORS.map((t) => (
        <Html
          key={t.id}
          position={[t.x, t.y - 0.6, 0]}
          center
          distanceFactor={9}
        >
          <button
            data-testid={`zoom-target-${t.id}`}
            aria-label={`zoom to ${t.role}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(t.id);
            }}
            onMouseEnter={() => onHover(t.id)}
            onMouseLeave={() => onHover(null)}
            style={{
              padding: '4px 10px',
              background: 'rgba(241,231,205,0.9)',
              color: parchment.ink,
              border: `1px solid ${parchment.gateOn}`,
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'inherit',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {t.role}
          </button>
        </Html>
      ))}
    </>
  );
}

interface Props {
  zoomTarget: number | null;
  onZoomTo: (idx: number) => void;
  onArrived: (idx: number) => void;
}

export function LevelGate({ zoomTarget, onZoomTo, onArrived }: Props) {
  const cycle = useExecution((s) => s.cycle);
  const [hovered, setHovered] = useState<number | null>(null);
  const inputs = inputsFor(cycle);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <div style={containerStyle} data-testid="level-gate">
      <Canvas camera={{ position: [0, 0, 9.5], fov: 45 }} style={{ width: '100%', height: '100%', background: parchment.bg }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 5]} intensity={0.6} />
        <CameraRig targetIdx={zoomTarget} onArrived={onArrived} />
        <NandScene
          inputs={inputs}
          hovered={hovered}
          onHover={setHovered}
          onClick={onZoomTo}
        />
        <HoverTargets onHover={setHovered} onClick={onZoomTo} />
      </Canvas>

      <div style={overlayStyle}>
        <strong style={{ color: parchment.ink }}>NAND gate</strong>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          2 PMOS pull-up (parallel) on top, 2 NMOS pull-down (series) on bottom.
          Click any transistor to fly into it.
        </div>
        {hovered !== null && (
          <div style={{ color: parchment.gateOn, fontSize: 11, marginTop: 6 }} data-testid="hover-readout">
            hovering: <strong>{TRANSISTORS[hovered].role}</strong>
          </div>
        )}
      </div>

      {/* Truth-table state readout */}
      <div style={truthStyle} data-testid="nand-truth">
        <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
          inputs
        </div>
        <div style={truthRowStyle}>
          <span style={bitChip(inputs.A === 1)} data-testid="bit-A">A = {inputs.A}</span>
          <span style={bitChip(inputs.B === 1)} data-testid="bit-B">B = {inputs.B}</span>
          <span style={{ color: parchment.inkSoft, margin: '0 4px' }}>→</span>
          <span style={bitChip(inputs.Y === 1)} data-testid="bit-Y">Y = {inputs.Y}</span>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: parchment.bg,
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  background: 'rgba(241,231,205,0.92)',
  border: `1px solid ${parchment.rule}`,
  borderRadius: 4,
  padding: '8px 12px',
  width: 240,
};

const truthStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  alignItems: 'center',
  padding: '6px 12px',
  background: 'rgba(241,231,205,0.92)',
  border: `1px solid ${parchment.rule}`,
  borderRadius: 6,
};

const truthRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
  fontSize: 12,
};

function bitChip(active: boolean): React.CSSProperties {
  return {
    padding: '2px 8px',
    background: active ? parchment.gateOn : 'transparent',
    color: active ? '#fff' : parchment.ink,
    border: `1px solid ${active ? parchment.gateOn : parchment.rule}`,
    borderRadius: 3,
    fontWeight: 600,
  };
}
