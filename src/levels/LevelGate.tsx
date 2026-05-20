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
import {
  GATE_TYPE,
  LOGIC,
  SUPPLY,
  TRANSISTOR_ROLE,
  TRANSISTOR_TYPE,
  type TransistorRole,
} from './symbols';
import { TRANSISTOR_NETS } from './MiniViews';
import { ConnectedMosfet } from './ConnectedMosfet';
import { TRANSISTOR_CONNECTIONS } from './transistorConnections';
import { WIRES, wirePoints, type WireSpec } from './nandWireGraph';

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

  // Click + hover are handled by the large Html overlay rendered in
  // HoverTargets (positioned at the transistor's center with a 100×150 px
  // hit area). Putting handlers on the r3f group here would be redundant
  // and was unreliable — clicks on the visible 3D body wouldn't bubble to
  // the group consistently across viewport sizes.
  return (
    <group position={[t.x, t.y, 0]}>
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

// WireSpec, WIRES, and the named-node table are owned by ./nandWireGraph.ts.
// Every wire has explicit `from`/`to` node identifiers and the renderer below
// derives the polyline via `wirePoints(wire)`. The unit test in
// tests/unit/nandWireGraph.test.ts asserts pts[0] / pts[-1] match the declared
// endpoints, so electrons can never animate against the declared direction.

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

// HoverMosfetPreview — renders a ConnectedMosfet whose terminals sit at
// the ACTUAL wire endpoints in the parent NAND. No rotation, no scaling
// hacks: the source slab sits where the Vdd/GND/mid wire stub ends, the
// drain slab where the Y/mid wire begins, the gate strip extends from
// the A/B-wire endpoint to the body. The electron flows source → drain
// along the same axis the wire is physically on.
function HoverMosfetPreview({ t, inputs }: { t: TransistorSpec; inputs: Inputs }) {
  const isPmos = t.kind === TRANSISTOR_TYPE.PMOS;
  const gateOn: number = inputs[t.input] === 1 ? 1 : 0;
  const nets = TRANSISTOR_NETS[t.role];
  const conn = TRANSISTOR_CONNECTIONS[t.role];
  return (
    <group>
      <ConnectedMosfet
        kind={isPmos ? 'pmos' : 'nmos'}
        source={conn.source}
        drain={conn.drain}
        gate={conn.gate}
        gateOn={gateOn}
        topNet={nets.top}
        bottomNet={nets.bottom}
        gateNet={nets.side}
      />
      {/* Invisible testid anchor — keeps the e2e contract that asserts the
          parent-net mappings without adding a visible label that would
          compete with the inline 3D Vdd/Y/A net labels. */}
      <Html position={[t.x, t.y, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div
          data-testid={`${t.role}-detailed`}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
        >
          <span data-testid={`${t.role}-detailed-top-net`}>{nets.top}</span>
          <span data-testid={`${t.role}-detailed-bottom-net`}>{nets.bottom}</span>
          <span data-testid={`${t.role}-detailed-side-net`}>{nets.side}</span>
        </div>
      </Html>
    </group>
  );
}

// Exported so a mini-view (e.g. the NAND hover preview INSIDE LevelLatch)
// can render the EXACT same r3f scene at a smaller scale. Pass `mini` to
// drop the secondary HUD elements (Vdd/GND/A/B labels, Y chip,
// next-gate placeholder) that only make sense in the full-size view.
export function NandScene({
  inputs,
  hovered = null,
  onHover,
  onClick,
  mini = false,
}: {
  inputs: Inputs;
  hovered?: number | null;
  onHover?: (i: number | null) => void;
  onClick?: (i: number, kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS) => void;
  mini?: boolean;
}) {
  const noop = () => {};
  const handleHover = onHover ?? noop;
  const handleClick = onClick ?? noop;
  return (
    <>
      {/* wires + pulses */}
      {WIRES.map((w, i) => {
        const pts = wirePoints(w);
        return (
          <group key={i}>
            <Line points={pts} color={netColorFor(w.net, inputs)} lineWidth={3.2} />
            {w.flowWhen?.(inputs) && <ElectronPulse pts={pts} />}
          </group>
        );
      })}

      {/* transistors. Each is a simple block; on hover we render the
          ACTUAL transistor 3D mesh inline at the transistor's position —
          the same component LevelTransistor uses for its zoomed-in view,
          just scaled and rotated to match the wiring orientation in the
          NAND gate (gate stub on the side the A/B wire enters from,
          source/drain stacked vertically along the Vdd/Y/GND axis). No
          stylized cross-section to drift out of sync. */}
      {TRANSISTORS.map((t) => (
        <group key={t.id}>
          {/* Simple block when not hovered. On hover the SAME footprint
              gets replaced by the ConnectedMosfet — terminals literally on
              the wire endpoints, electron flowing source→drain. The block
              fully unmounts so the swap is clean (no overlay artifacts). */}
          {hovered === t.id ? (
            <HoverMosfetPreview t={t} inputs={inputs} />
          ) : (
            <Mosfet
              t={t}
              on={isOn(t, inputs)}
              gateValue={inputs[t.input]}
              hovered={false}
              onHover={handleHover}
              onClick={handleClick}
            />
          )}
        </group>
      ))}

      {/* Voltage / value labels — full-size only. Mini view skips these. */}
      {!mini && (
        <>
      {/* Vdd rail tag */}
      <Text position={[3.2, 3.05, 0]} fontSize={0.22} color={RAIL_VDD_COLOR} anchorX="left">
        Vdd = 1.0 V
      </Text>
      {/* GND rail tag */}
      <Text position={[3.2, -3.45, 0]} fontSize={0.22} color={RAIL_GND_COLOR} anchorX="left">
        GND = 0 V
      </Text>
      {/* A input label + value (LEFT side) */}
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
      {/* B input label + value (RIGHT side — feedback wire arrives here from
          the cross-coupled neighbor in the latch level above) */}
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
      )}
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
        // The ONLY clickable region per transistor is the small visible
        // "preview" label below it (the parchment-colored role tag).
        // Keeping the hit area tight to a single visible element prevents
        // cursor flickers (pointer ↔ default) when moving across the gate
        // canvas, and keeps the contract simple: "if you can see a label,
        // you can click it; otherwise nothing here is interactive."
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
              padding: '6px 14px',
              background: 'rgba(241,231,205,0.95)',
              color: parchment.ink,
              border: `1.5px solid ${parchment.gateOn}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(80,60,30,0.2)',
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

      {/* Tiny role badge at the bottom — keeps the hover affordance for
          tests + accessibility. The rich preview lives ON the transistor
          itself, swapped in inside the Canvas. */}
      {hovered !== null && (
        <div style={hoverChipStyle} data-testid="hover-readout">
          hovering: <strong>{TRANSISTORS[hovered].role}</strong>
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: parchment.bg,
};

const hoverChipStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '4px 10px',
  background: 'rgba(241,231,205,0.95)',
  border: `1px solid ${parchment.rule}`,
  borderRadius: 4,
  color: parchment.gateOn,
  fontSize: 11,
};
