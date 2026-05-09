// LevelGate — CMOS NAND gate, 4 transistors wired up.
//
// Visual cues for the learner:
//   - Wires turn terracotta (HIGH, ~Vdd) or dark sepia (LOW, ~GND) per their net.
//   - Active wires (carrying current right now) get a glowing pulse traveling
//     along them at ~1.5 s/loop, so you can SEE the path of charge.
//   - Each transistor has an ON / OFF label above it.
//   - A and B inputs show their value (= 0 or = 1) right at the input wire.
//   - Vdd reads "1.0 V"; GND reads "0 V"; Y shows its current logic value.
//   - Top-right legend explains color + pulse.
//
// Truth table cycles 00 → 01 → 11 → 10 on each clock tick.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import { TermText } from '../components/Term';
import { gateLevelSummary } from './descriptions';
import { LevelSummary } from './LevelSummary';
import {
  GATE_TYPE,
  LOGIC,
  SUPPLY,
  TRANSISTOR_ROLE,
  TRANSISTOR_TYPE,
  type TransistorRole,
} from './symbols';

type Bit = 0 | 1;
interface Inputs { A: Bit; B: Bit; Y: Bit }

interface TransistorSpec {
  id: number;
  role: TransistorRole;
  // Only PMOS or NMOS are placed in this gate (not CMOS / MOSFET as a whole).
  kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS;
  input: typeof LOGIC.A | typeof LOGIC.B;
  x: number;
  y: number;
}

const TRANSISTORS: readonly TransistorSpec[] = [
  { id: 0, role: TRANSISTOR_ROLE.P_A, kind: TRANSISTOR_TYPE.PMOS, input: LOGIC.A, x: -1.6, y: 1.5 },
  { id: 1, role: TRANSISTOR_ROLE.P_B, kind: TRANSISTOR_TYPE.PMOS, input: LOGIC.B, x:  1.6, y: 1.5 },
  { id: 2, role: TRANSISTOR_ROLE.N_A, kind: TRANSISTOR_TYPE.NMOS, input: LOGIC.A, x:  0,   y: -0.6 },
  { id: 3, role: TRANSISTOR_ROLE.N_B, kind: TRANSISTOR_TYPE.NMOS, input: LOGIC.B, x:  0,   y: -2.4 },
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
  const seq: [Bit, Bit][] = [[0, 0], [0, 1], [1, 1], [1, 0]];
  const [A, B] = seq[((cycle % 4) + 4) % 4];
  const Y: Bit = A === 1 && B === 1 ? 0 : 1;
  return { A, B, Y };
}

function isOn(t: TransistorSpec, inputs: Inputs): boolean {
  const v = inputs[t.input];
  return t.kind === TRANSISTOR_TYPE.PMOS ? v === 0 : v === 1;
}

const NET_HIGH_COLOR = parchment.gateOn;
const NET_LOW_COLOR = '#5c4438';
const RAIL_VDD_COLOR = parchment.gateOn;
const RAIL_GND_COLOR = parchment.ink;
const PULSE_COLOR = parchment.electronGlow;

interface MosfetProps {
  t: TransistorSpec;
  on: boolean;
  gateValue: Bit;
  hovered: boolean;
  onHover: (idx: number | null) => void;
  onClick: (idx: number, kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS) => void;
}

function Mosfet({ t, on, gateValue, hovered, onHover, onClick }: MosfetProps) {
  const bodyRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!bodyRef.current) return;
    const m = bodyRef.current.material as THREE.MeshStandardMaterial;
    m.emissive.set(PULSE_COLOR);
    m.emissiveIntensity = on ? 0.7 + Math.sin(performance.now() * 0.005) * 0.15 : 0;
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
        onClick(t.id, t.kind);
      }}
    >
      <mesh ref={bodyRef}>
        <boxGeometry args={[0.7, 0.5, 0.3]} />
        <meshStandardMaterial
          color={t.kind === TRANSISTOR_TYPE.PMOS ? '#7a8fa3' : parchment.gate}
          emissive={PULSE_COLOR}
          emissiveIntensity={0}
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[t.kind === TRANSISTOR_TYPE.PMOS && t.x < 0 ? -0.45 : 0.45, 0, 0]}>
        <boxGeometry args={[0.18, 0.1, 0.32]} />
        <meshStandardMaterial color={parchment.gate} roughness={0.6} />
      </mesh>
      {hovered && (
        <mesh position={[0, 0, -0.12]}>
          <ringGeometry args={[0.55, 0.65, 24]} />
          <meshBasicMaterial color={parchment.gateOn} transparent opacity={0.7} />
        </mesh>
      )}
      {/* role label — above the body but pushed FORWARD in z so the
          electron pulses on the supply stubs (z=0.05) can't occlude it
          and create the "P_B → F_3" reading error. */}
      <Text
        position={[0, 0.55, 0.3]}
        fontSize={0.2}
        color={parchment.ink}
        anchorX="center"
        outlineWidth={0.014}
        outlineColor={parchment.bg}
      >
        {t.role} · {t.kind}
      </Text>
      {/* The inversion rule, RIGHT ON the transistor — so a beginner doesn't
          have to map sidebar text back to the diagram. PMOS = active LOW
          (turns ON when gate goes 0). NMOS = active HIGH (turns ON when 1). */}
      <Text
        position={[0, 0.32, 0.3]}
        fontSize={0.13}
        color={parchment.gateOn}
        anchorX="center"
        outlineWidth={0.012}
        outlineColor={parchment.bg}
      >
        {t.kind === TRANSISTOR_TYPE.PMOS ? '(active LOW)' : '(active HIGH)'}
      </Text>
      {/* ON / OFF chip — below the body, also forward so wires can't cover.
          Includes "gate=0" or "gate=1" so the PMOS-inverted-rule is visible
          inline (a beginner can SEE that PMOS turns OFF as gate goes 0→1). */}
      <Text
        position={[0, -0.55, 0.3]}
        fontSize={0.2}
        color={on ? parchment.gateOn : parchment.inkSoft}
        anchorX="center"
        outlineWidth={0.014}
        outlineColor={parchment.bg}
      >
        {on ? '● ON' : '○ OFF'}
      </Text>
      <Text
        position={[0, -0.85, 0.3]}
        fontSize={0.15}
        color={parchment.inkSoft}
        anchorX="center"
        outlineWidth={0.012}
        outlineColor={parchment.bg}
      >
        gate = {gateValue}
      </Text>
    </group>
  );
}

interface WireSpec {
  pts: [number, number, number][];
  net: 'Vdd' | 'GND' | 'Y' | 'mid' | 'A' | 'B';
  flowWhen?: (i: Inputs) => boolean; // when to render an electron pulse
}

const WIRES: readonly WireSpec[] = [
  { pts: [[-3, 3, 0], [3, 3, 0]], net: SUPPLY.Vdd, flowWhen: () => false },
  { pts: [[-1.6, 3, 0], [-1.6, 1.85, 0]], net: SUPPLY.Vdd, flowWhen: (i) => i.A === 0 },
  { pts: [[ 1.6, 3, 0], [ 1.6, 1.85, 0]], net: SUPPLY.Vdd, flowWhen: (i) => i.B === 0 },
  // PMOS sources → Y junction (left arm + bottom + right arm)
  { pts: [[-1.6, 1.15, 0], [-1.6, 0.5, 0], [1.6, 0.5, 0], [1.6, 1.15, 0]], net: LOGIC.Y, flowWhen: (i) => i.Y === 1 },
  // Y → output marker
  { pts: [[0, 0.5, 0], [3.0, 0.5, 0]], net: LOGIC.Y, flowWhen: () => true },
  // Y → N_A drain
  { pts: [[0, 0.5, 0], [0, -0.25, 0]], net: LOGIC.Y, flowWhen: (i) => i.A === 1 && i.B === 1 },
  // N_A source → N_B drain
  { pts: [[0, -0.95, 0], [0, -2.05, 0]], net: 'mid', flowWhen: (i) => i.A === 1 && i.B === 1 },
  // N_B source → GND
  { pts: [[0, -2.75, 0], [0, -3.5, 0]], net: SUPPLY.GND, flowWhen: (i) => i.A === 1 && i.B === 1 },
  { pts: [[-3, -3.5, 0], [3, -3.5, 0]], net: SUPPLY.GND, flowWhen: () => false },
  // A input wires
  { pts: [[-4, 1.5, 0], [-2.05, 1.5, 0]], net: LOGIC.A, flowWhen: (i) => i.A === 1 },
  { pts: [[-3.2, 1.5, 0], [-3.2, -0.6, 0], [-0.45, -0.6, 0]], net: LOGIC.A, flowWhen: (i) => i.A === 1 },
  // B input wires
  { pts: [[ 4, 1.5, 0], [ 2.05, 1.5, 0]], net: LOGIC.B, flowWhen: (i) => i.B === 1 },
  { pts: [[ 3.2, 1.5, 0], [ 3.2, -2.4, 0], [ 0.45, -2.4, 0]], net: LOGIC.B, flowWhen: (i) => i.B === 1 },
];

function netColorFor(net: WireSpec['net'], inputs: Inputs): string {
  switch (net) {
    case SUPPLY.Vdd: return RAIL_VDD_COLOR;
    case SUPPLY.GND: return RAIL_GND_COLOR;
    case LOGIC.A: return inputs.A === 1 ? NET_HIGH_COLOR : NET_LOW_COLOR;
    case LOGIC.B: return inputs.B === 1 ? NET_HIGH_COLOR : NET_LOW_COLOR;
    case LOGIC.Y: return inputs.Y === 1 ? NET_HIGH_COLOR : NET_LOW_COLOR;
    case 'mid': return inputs.A === 1 && inputs.B === 1 ? RAIL_GND_COLOR : NET_LOW_COLOR;
  }
}

function ElectronPulse({ pts, period = 1400 }: { pts: [number, number, number][]; period?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const lengths = useMemo(() => {
    const ls = [0];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      const dz = pts[i][2] - pts[i - 1][2];
      ls.push(ls[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    return ls;
  }, [pts]);
  const total = lengths[lengths.length - 1] || 1;

  useFrame(() => {
    if (!ref.current) return;
    const t = (performance.now() % period) / period;
    const target = t * total;
    let i = 0;
    while (i < lengths.length - 1 && lengths[i + 1] < target) i++;
    if (i >= pts.length - 1) i = pts.length - 2;
    const segLen = lengths[i + 1] - lengths[i];
    const localT = segLen > 0.0001 ? (target - lengths[i]) / segLen : 0;
    ref.current.position.set(
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * localT,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * localT,
      pts[i][2] + (pts[i + 1][2] - pts[i][2]) * localT + 0.05,
    );
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.11, 16, 16]} />
      <meshStandardMaterial
        color={PULSE_COLOR}
        emissive={PULSE_COLOR}
        emissiveIntensity={1.4}
        toneMapped={false}
      />
    </mesh>
  );
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
  onClick: (i: number, kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS) => void;
}) {
  return (
    <>
      {/* wires + pulses */}
      {WIRES.map((w, i) => (
        <group key={i}>
          <Line points={w.pts} color={netColorFor(w.net, inputs)} lineWidth={3.2} />
          {w.flowWhen?.(inputs) && <ElectronPulse pts={w.pts} />}
        </group>
      ))}

      {/* transistors */}
      {TRANSISTORS.map((t) => (
        <Mosfet
          key={t.id}
          t={t}
          on={isOn(t, inputs)}
          gateValue={inputs[t.input]}
          hovered={hovered === t.id}
          onHover={onHover}
          onClick={onClick}
        />
      ))}

      {/* Voltage / value labels */}
      {/* Vdd rail tag */}
      <Text position={[3.2, 3.05, 0]} fontSize={0.22} color={RAIL_VDD_COLOR} anchorX="left">
        Vdd = 1.0 V
      </Text>
      {/* GND rail tag */}
      <Text position={[3.2, -3.45, 0]} fontSize={0.22} color={RAIL_GND_COLOR} anchorX="left">
        GND = 0 V
      </Text>
      {/* A input label + value */}
      <Text position={[-4.2, 1.5, 0]} fontSize={0.36} color={parchment.ink} anchorX="right">
        A
      </Text>
      <Text
        position={[-4.2, 1.05, 0]}
        fontSize={0.26}
        color={inputs.A === 1 ? parchment.gateOn : parchment.inkSoft}
        anchorX="right"
      >
        = {inputs.A}
      </Text>
      {/* B input label + value */}
      <Text position={[4.2, 1.5, 0]} fontSize={0.36} color={parchment.ink} anchorX="left">
        B
      </Text>
      <Text
        position={[4.2, 1.05, 0]}
        fontSize={0.26}
        color={inputs.B === 1 ? parchment.gateOn : parchment.inkSoft}
        anchorX="left"
      >
        = {inputs.B}
      </Text>
      {/* Y output label */}
      <Text position={[3.2, 0.95, 0.3]} fontSize={0.32} color={parchment.ink} anchorX="left" outlineWidth={0.01} outlineColor={parchment.bg}>
        Y
      </Text>
      {/* Y output VALUE — rendered as an HTML pill so it's easy to read at any
          zoom level and stands out as "this is the answer". */}
      <Html position={[3.7, 0.45, 0]} center distanceFactor={9} zIndexRange={[100, 0]}>
        <div
          data-testid="y-output-chip"
          style={{
            background: inputs.Y === 1 ? parchment.gateOn : '#3d2f1e',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'ui-monospace, monospace',
            boxShadow: '0 2px 6px rgba(80,60,30,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {LOGIC.Y} = {inputs.Y}
        </div>
      </Html>
      {/* y-downstream-note — explains Y's wire-level meaning + propagation */}
      <Html position={[3.9, 0.05, 0]} center distanceFactor={9} zIndexRange={[100, 0]}>
        <div
          data-testid="y-downstream-note"
          style={{
            background: 'rgba(241,231,205,0.95)',
            color: parchment.ink,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 9,
            lineHeight: 1.35,
            fontFamily: 'inherit',
            border: `1px solid ${parchment.rule}`,
            maxWidth: 180,
            textAlign: 'center',
          }}
        >
          {inputs.Y === 1
            ? `wire held at ${SUPPLY.Vdd} (~1.0 V) → next gate's input reads ${LOGIC.HIGH}`
            : `wire held at ${SUPPLY.GND} (0 V) → next gate's input reads ${LOGIC.LOW}`}
        </div>
      </Html>
      {/* next-gate placeholder — physically depicts that Y continues into
          another logic stage. Drawn as a dashed grey box with one input wire
          coming from the Y output line. Greyed-out to signal "out of scope". */}
      <Line
        points={[[3.0, 0.5, 0], [4.8, 0.5, 0]]}
        color={inputs.Y === 1 ? NET_HIGH_COLOR : NET_LOW_COLOR}
        lineWidth={3.2}
        dashed
        dashSize={0.12}
        gapSize={0.08}
      />
      <Html position={[5.4, 0.5, 0]} center distanceFactor={9} zIndexRange={[100, 0]}>
        <div
          data-testid="next-gate-placeholder"
          style={{
            background: 'rgba(241,231,205,0.85)',
            color: parchment.inkSoft,
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 10,
            border: `1px dashed ${parchment.inkSoft}`,
            textAlign: 'center',
            minWidth: 70,
            fontStyle: 'italic',
          }}
        >
          <div style={{ fontWeight: 700, color: parchment.ink, fontStyle: 'normal' }}>
            next {GATE_TYPE.NAND}
          </div>
          <div>(takes {LOGIC.Y} as one of its inputs)</div>
        </div>
      </Html>
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
  onClick: (i: number, kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS) => void;
}) {
  return (
    <>
      {TRANSISTORS.map((t) => (
        <Html key={t.id} position={[t.x, t.y - 0.95, 0]} center distanceFactor={9}>
          <button
            data-testid={`zoom-target-${t.id}`}
            aria-label={`zoom to ${t.role}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(t.id, t.kind);
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
  onZoomTo: (idx: number, kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS) => void;
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

      {/* TOP-LEFT — title + interaction copy (jargon hover-defined) */}
      <div style={overlayStyle}>
        <strong style={{ color: parchment.ink }}>NAND gate</strong>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          <TermText>
            Built from 4 transistors in CMOS style: 2 PMOS pull-up on top,
            2 NMOS pull-down on bottom. Click any transistor to fly into it.
          </TermText>
        </div>
        {hovered !== null && (
          <div style={{ color: parchment.gateOn, fontSize: 11, marginTop: 6 }} data-testid="hover-readout">
            hovering: <strong>{TRANSISTORS[hovered].role}</strong>
          </div>
        )}
      </div>

      {/* TOP-RIGHT — color legend + the all-important PMOS/NMOS rule.
          Without this rule a beginner can't predict the diagram. */}
      <div style={legendStyle} data-testid="legend">
        <div style={{ color: parchment.inkSoft, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          legend
        </div>
        <LegendRow color={NET_HIGH_COLOR} label="wire HIGH (1, ~Vdd)" />
        <LegendRow color={NET_LOW_COLOR} label="wire LOW (0, GND)" />
        <LegendRow color={PULSE_COLOR} label="charge flow on active wire" round />
        <LegendBox color="#7a8fa3" label="PMOS transistor body" />
        <LegendBox color={parchment.gate} label="NMOS transistor body" />
        <LegendRow color={parchment.gateOn} label="● ON  ○ OFF (per transistor)" />
        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: `1px dashed ${parchment.rule}`,
            color: parchment.ink,
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          <strong>The rule:</strong>
          <div>PMOS turns <strong>ON</strong> when its gate is <strong>0</strong>.</div>
          <div>NMOS turns <strong>ON</strong> when its gate is <strong>1</strong>.</div>
        </div>
      </div>

      <LevelSummary summary={gateLevelSummary} />

      {/* phase explainer — truth-table state + per-phase WHY */}
      <div style={truthStyle} data-testid="nand-truth">
        <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
          phase {((cycle % 4) + 4) % 4 + 1} of 4 · inputs · output
        </div>
        <div style={truthRowStyle}>
          <span style={bitChip(inputs.A === 1)} data-testid="bit-A">A = {inputs.A}</span>
          <span style={bitChip(inputs.B === 1)} data-testid="bit-B">B = {inputs.B}</span>
          <span style={{ color: parchment.inkSoft, margin: '0 4px' }}>NAND →</span>
          <span style={bitChip(inputs.Y === 1)} data-testid="bit-Y">Y = {inputs.Y}</span>
        </div>
        <div style={explainerStyle} data-testid="phase-explainer">
          <strong style={{ color: parchment.ink }}>{PHASE_TEXT[phaseKey(inputs)].headline}</strong>
          <div style={{ color: parchment.inkSoft, marginTop: 2 }}>
            {PHASE_TEXT[phaseKey(inputs)].body}
          </div>
          <div
            style={{
              color: parchment.gateOn,
              marginTop: 6,
              paddingTop: 6,
              borderTop: `1px dashed ${parchment.rule}`,
              fontSize: 11,
              lineHeight: 1.45,
            }}
            data-testid="phase-downstream"
          >
            <strong>Downstream:</strong> {PHASE_TEXT[phaseKey(inputs)].downstream}
          </div>
        </div>
      </div>
    </div>
  );
}

function phaseKey(i: Inputs): '00' | '01' | '11' | '10' {
  return `${i.A}${i.B}` as '00' | '01' | '11' | '10';
}

const PHASE_TEXT: Record<
  '00' | '01' | '11' | '10',
  { headline: string; body: string; downstream: string }
> = {
  '00': {
    headline: 'Both inputs LOW → Y = 1',
    body:
      'Both PMOS conduct (PMOS is active LOW). Y is connected to Vdd through both pull-up paths in parallel. Both NMOS are off, so no path to GND.',
    downstream:
      "Y wire is held at Vdd (~1.0 V). The next gate's input reads a logical 1 — same as if A or B were directly connected to Vdd.",
  },
  '01': {
    headline: 'B flipped HIGH — Y stays at 1',
    body:
      'P_B turned OFF and N_B turned ON, but P_A is still ON (A is still 0), so Y stays connected to Vdd through P_A. The pull-down chain is broken (N_A off).',
    downstream:
      "Y wire is still held at Vdd. From the next gate's perspective, nothing changed — its input still reads 1. (NAND only cares when BOTH inputs are 1.)",
  },
  '11': {
    headline: 'Both inputs HIGH → Y = 0  ⤓',
    body:
      'Both PMOS are OFF — no path to Vdd. Both NMOS are ON, completing the SERIES chain to GND. Y is pulled down to ground. THIS is the only state that produces 0.',
    downstream:
      "Y wire is now held at GND (0 V). The next gate's input reads a logical 0 — exactly the state where this NAND signals 'both inputs were 1.' That 0 will switch the next gate's PMOS on / NMOS off, propagating the change forward.",
  },
  '10': {
    headline: 'B flipped LOW — Y back to 1',
    body:
      'A is still 1 (so P_A off, N_A on) but B = 0 means P_B is ON again. P_B alone is enough to pull Y up to Vdd. The NMOS series chain is broken (N_B off).',
    downstream:
      "Y wire snaps back to Vdd. The next gate's input reads 1 again. The previous '0' (from phase 3) is forgotten — gates are stateless; only their CURRENT input determines the output.",
  },
};

function LegendRow({ color, label, round = false }: { color: string; label: string; round?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: parchment.ink, marginTop: 2 }}>
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: round ? 8 : 4,
          background: color,
          borderRadius: round ? 4 : 1,
          boxShadow: round ? `0 0 6px ${color}` : 'none',
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function LegendBox({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: parchment.ink, marginTop: 2 }}>
      <span
        style={{
          display: 'inline-block',
          width: 16,
          height: 12,
          background: color,
          border: `1px solid ${parchment.ink}`,
          borderRadius: 2,
        }}
      />
      <span>{label}</span>
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

const legendStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  background: 'rgba(241,231,205,0.92)',
  border: `1px solid ${parchment.rule}`,
  borderRadius: 4,
  padding: '6px 10px',
  width: 190,
};

const truthStyle: React.CSSProperties = {
  // moved to bottom-RIGHT to make room for the LevelSummary at bottom-LEFT.
  position: 'absolute',
  bottom: 12,
  right: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  alignItems: 'flex-start',
  padding: '8px 12px',
  background: 'rgba(241,231,205,0.95)',
  border: `1px solid ${parchment.rule}`,
  borderRadius: 6,
  maxWidth: 320,
};

const explainerStyle: React.CSSProperties = {
  marginTop: 6,
  paddingTop: 6,
  borderTop: `1px dashed ${parchment.rule}`,
  fontSize: 11,
  lineHeight: 1.45,
  color: parchment.inkSoft,
  width: '100%',
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
