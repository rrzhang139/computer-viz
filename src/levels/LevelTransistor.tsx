// LevelTransistor — Layer 0. Two MOSFETs side-by-side: an NMOS and a PMOS.
//
// The pedagogical goal is the COMPARISON:
//   - Same V_G drives both gates.
//   - NMOS channel inverts when V_G = 1 (active HIGH). PMOS does it when V_G = 0
//     (active LOW). Tick the clock and watch them flip OPPOSITELY.
//   - Doping is shown via color — NMOS has p-type substrate + n+ source/drain;
//     PMOS has n-type substrate + p+ source/drain.
//
// Geometry per MOSFET (LEFT = source / data, RIGHT = drain / output, TOP = gate):
//   substrate slab, two doped slabs at the ends, an "inversion channel" plate
//   above the substrate that glows when conducting, an oxide layer above that,
//   then the polysilicon gate strip + 3 metal contacts.
//
// No carrier particles — the level is about the device structure and the
// PMOS-vs-NMOS rule, not about modeling charge in motion.

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import type { ElectronsPart } from './descriptions';

type Part = ElectronsPart;
type Kind = 'NMOS' | 'PMOS';

interface MosfetTheme {
  substrate: string;
  substrateLabel: string;       // chemistry tag: "p-type" / "n-type"
  doped: string;
  dopedLabel: string;           // "n+" / "p+"
  channelEmissive: string;      // glow color for the inversion channel
  // Conduction intensity 0..1 given V_G.
  conducts: (gateOn: number) => number;
}

const NMOS_THEME: MosfetTheme = {
  substrate: parchment.substrate,           // warm sepia = p-type silicon
  substrateLabel: 'p-type bulk',
  doped: parchment.doped,                   // slate-blue = n+
  dopedLabel: 'n+',
  channelEmissive: parchment.electronGlow,
  conducts: (g) => g,                       // active HIGH
};

const PMOS_THEME: MosfetTheme = {
  substrate: '#6e8a8c',                     // muted teal = n-type / n-well
  substrateLabel: 'n-type bulk',
  doped: '#b86b53',                         // warm coral = p+
  dopedLabel: 'p+',
  channelEmissive: '#ffd28a',               // slightly warmer (just for distinction)
  conducts: (g) => 1 - g,                   // active LOW
};

const SUB_W = 4;
const SUB_H = 0.5;
const SUB_D = 1.3;
const CHANNEL_X_MIN = -1.0;
const CHANNEL_X_MAX = 1.0;

interface MosfetProps {
  kind: Kind;
  theme: MosfetTheme;
  gateOn: number;
  highlight: Part;
  onPickPart: (p: Part) => void;
}

function Mosfet({ kind, theme, gateOn, highlight, onPickPart }: MosfetProps) {
  const gateRef = useRef<THREE.Mesh>(null);
  const oxideRef = useRef<THREE.Mesh>(null);
  const channelRef = useRef<THREE.Mesh>(null);
  const sourceRef = useRef<THREE.Mesh>(null);
  const drainRef = useRef<THREE.Mesh>(null);
  const substrateRef = useRef<THREE.Mesh>(null);

  const partGlow = (
    ref: React.RefObject<THREE.Mesh | null>,
    name: Part,
    base: string,
  ) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissive.set(parchment.gateOn);
    const isHi = highlight === name;
    m.emissiveIntensity = isHi ? 0.45 + Math.sin(performance.now() * 0.006) * 0.12 : 0;
    if (!isHi) m.color.set(base);
  };

  useFrame(() => {
    // Gate strip: warms with V_G regardless of type.
    if (gateRef.current) {
      const mat = gateRef.current.material as THREE.MeshStandardMaterial;
      const c = new THREE.Color(parchment.gate).lerp(new THREE.Color(parchment.gateOn), gateOn);
      mat.color.copy(c);
      mat.emissive.set(parchment.gateOn);
      const baseI = gateOn * 0.35;
      const hiBoost = highlight === 'gate' ? 0.4 + Math.sin(performance.now() * 0.006) * 0.15 : 0;
      mat.emissiveIntensity = baseI + hiBoost;
    }
    // Oxide opacity tracks gate; brighten if highlighted.
    if (oxideRef.current) {
      const mat = oxideRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.18 + gateOn * 0.22 + (highlight === 'oxide' ? 0.25 : 0);
      mat.emissive.set(parchment.gateOn);
      mat.emissiveIntensity = highlight === 'oxide' ? 0.3 : 0;
    }
    // CHANNEL — the THE difference: NMOS glows when V_G=1, PMOS when V_G=0.
    if (channelRef.current) {
      const c = theme.conducts(gateOn);
      const mat = channelRef.current.material as THREE.MeshStandardMaterial;
      mat.emissive.set(theme.channelEmissive);
      mat.emissiveIntensity = c * 0.65;
      mat.opacity = 0.12 + c * 0.55;
    }
    partGlow(sourceRef, 'source', theme.doped);
    partGlow(drainRef, 'drain', theme.doped);
    partGlow(substrateRef, 'substrate', theme.substrate);
  });

  const conducting = theme.conducts(gateOn) > 0.5;

  return (
    <group>
      {/* substrate */}
      <mesh ref={substrateRef} position={[0, -SUB_H / 2 - 0.05, 0]} onClick={() => onPickPart('substrate')}>
        <boxGeometry args={[SUB_W, SUB_H, SUB_D]} />
        <meshStandardMaterial color={theme.substrate} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* source / drain — doped slabs */}
      <mesh ref={sourceRef} position={[-1.3, -0.05, 0]} onClick={() => onPickPart('source')}>
        <boxGeometry args={[1.0, 0.16, SUB_D - 0.1]} />
        <meshStandardMaterial color={theme.doped} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh ref={drainRef} position={[1.3, -0.05, 0]} onClick={() => onPickPart('drain')}>
        <boxGeometry args={[1.0, 0.16, SUB_D - 0.1]} />
        <meshStandardMaterial color={theme.doped} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* inversion-layer channel under the oxide */}
      <mesh ref={channelRef} position={[0, 0.06, 0]}>
        <boxGeometry args={[CHANNEL_X_MAX - CHANNEL_X_MIN, 0.04, SUB_D - 0.15]} />
        <meshStandardMaterial
          color={theme.channelEmissive}
          emissive={theme.channelEmissive}
          emissiveIntensity={0}
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* oxide layer */}
      <mesh ref={oxideRef} position={[0, 0.18, 0]} onClick={() => onPickPart('oxide')}>
        <boxGeometry args={[CHANNEL_X_MAX - CHANNEL_X_MIN + 0.3, 0.07, SUB_D - 0.05]} />
        <meshStandardMaterial color={parchment.oxide} transparent opacity={0.25} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* polysilicon gate strip */}
      <mesh ref={gateRef} position={[0, 0.3, 0]} onClick={() => onPickPart('gate')}>
        <boxGeometry args={[CHANNEL_X_MAX - CHANNEL_X_MIN + 0.4, 0.14, SUB_D + 0.1]} />
        <meshStandardMaterial color={parchment.gate} emissive={parchment.gateOn} emissiveIntensity={0} roughness={0.55} metalness={0.2} />
      </mesh>

      {/* metal contacts */}
      <mesh position={[-2.0, 0.4, 0]}>
        <boxGeometry args={[0.35, 0.55, 0.55]} />
        <meshStandardMaterial color={parchment.contact} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[2.0, 0.4, 0]}>
        <boxGeometry args={[0.35, 0.55, 0.55]} />
        <meshStandardMaterial color={parchment.contact} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.4]} />
        <meshStandardMaterial color={parchment.contact} metalness={0.5} roughness={0.45} />
      </mesh>

      {/* terminal letters S, D, G */}
      <Text position={[-2.0, 0.88, 0.3]} fontSize={0.18} color={parchment.ink} anchorX="center" outlineWidth={0.012} outlineColor={parchment.bg}>
        S
      </Text>
      <Text position={[2.0, 0.88, 0.3]} fontSize={0.18} color={parchment.ink} anchorX="center" outlineWidth={0.012} outlineColor={parchment.bg}>
        D
      </Text>
      <Text position={[0, 1.18, 0.3]} fontSize={0.18} color={parchment.gateOn} anchorX="center" outlineWidth={0.012} outlineColor={parchment.bg}>
        G
      </Text>

      {/* doping labels — small, in the corners of the slabs */}
      <Text position={[-1.3, -0.4, 0.3]} fontSize={0.13} color={parchment.ink} anchorX="center" outlineWidth={0.01} outlineColor={parchment.bg}>
        {theme.dopedLabel}
      </Text>
      <Text position={[1.3, -0.4, 0.3]} fontSize={0.13} color={parchment.ink} anchorX="center" outlineWidth={0.01} outlineColor={parchment.bg}>
        {theme.dopedLabel}
      </Text>
      <Text position={[0, -0.78, 0.3]} fontSize={0.13} color={parchment.inkSoft} anchorX="center" outlineWidth={0.01} outlineColor={parchment.bg}>
        {theme.substrateLabel}
      </Text>

      {/* type label + ON/OFF state, BIG */}
      <Text position={[0, 1.7, 0.3]} fontSize={0.32} color={parchment.ink} anchorX="center" outlineWidth={0.014} outlineColor={parchment.bg}>
        {kind}
      </Text>
      <Text
        position={[0, 1.35, 0.3]}
        fontSize={0.18}
        color={parchment.gateOn}
        anchorX="center"
        outlineWidth={0.012}
        outlineColor={parchment.bg}
      >
        {kind === 'PMOS' ? '(active LOW)' : '(active HIGH)'}
      </Text>
      <Text
        position={[0, -1.1, 0.3]}
        fontSize={0.24}
        color={conducting ? parchment.gateOn : parchment.inkSoft}
        anchorX="center"
        outlineWidth={0.014}
        outlineColor={parchment.bg}
      >
        {conducting ? '● CONDUCTING' : '○ blocked'}
      </Text>
    </group>
  );
}

function useGateVoltage(): number {
  const cycle = useExecution((s) => s.cycle);
  return cycle % 2 === 0 ? 0 : 1;
}

interface TransistorProps {
  highlight: Part;
  onHighlight: (p: Part) => void;
}

export function LevelTransistor({ highlight, onHighlight }: TransistorProps) {
  const gateOn = useGateVoltage();

  return (
    <div style={containerStyle} data-testid="level-transistor">
      <Canvas
        camera={{ position: [0, 2, 11], fov: 50 }}
        style={{ width: '100%', height: '100%', background: parchment.bg }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 4]} intensity={0.9} />
        <directionalLight position={[-5, 4, -4]} intensity={0.35} color={parchment.oxide} />

        {/* NMOS on the LEFT */}
        <group position={[-3.5, 0, 0]}>
          <Mosfet kind="NMOS" theme={NMOS_THEME} gateOn={gateOn} highlight={highlight} onPickPart={onHighlight} />
        </group>
        {/* PMOS on the RIGHT */}
        <group position={[3.5, 0, 0]}>
          <Mosfet kind="PMOS" theme={PMOS_THEME} gateOn={gateOn} highlight={highlight} onPickPart={onHighlight} />
        </group>

        {/* Big shared V_G label between them */}
        <Text position={[0, 1.7, 0.3]} fontSize={0.36} color={parchment.gateOn} anchorX="center" outlineWidth={0.014} outlineColor={parchment.bg}>
          {`V_G = ${gateOn}`}
        </Text>
        <Text position={[0, 1.25, 0.3]} fontSize={0.16} color={parchment.inkSoft} anchorX="center" outlineWidth={0.012} outlineColor={parchment.bg}>
          (same input drives both gates)
        </Text>

        <OrbitControls enablePan={false} minDistance={6} maxDistance={16} />
      </Canvas>

      <div style={overlayStyle}>
        <strong style={{ color: parchment.ink }}>NMOS vs PMOS</strong>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          Same V_G drives both. NMOS conducts when V_G = 1; PMOS conducts when V_G = 0.
          Tick the clock — they flip OPPOSITELY.
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{ color: parchment.gateOn, fontSize: 11 }}>V_G </span>
          <span style={meterTrack}>
            <span style={{ ...meterFill, width: `${gateOn * 100}%` }} data-testid="vg-meter-fill" />
          </span>
          <span style={{ color: parchment.ink, fontSize: 11, marginLeft: 6, fontFamily: 'ui-monospace, monospace' }}>
            {gateOn.toFixed(2)}
          </span>
        </div>
        {highlight && (
          <div style={{ color: parchment.highlight, fontSize: 11, marginTop: 6 }} data-testid="highlight-readout">
            highlighted: <strong>{highlight}</strong>
          </div>
        )}
      </div>

      {/* TOP-RIGHT — color legend keyed for both transistors */}
      <div style={legendStyle} data-testid="t-legend">
        <div style={{ color: parchment.inkSoft, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          legend
        </div>
        <LegendBox color={NMOS_THEME.substrate} label="NMOS bulk · p-type Si" />
        <LegendBox color={NMOS_THEME.doped} label="NMOS source/drain · n+" />
        <LegendBox color={PMOS_THEME.substrate} label="PMOS bulk · n-type Si" />
        <LegendBox color={PMOS_THEME.doped} label="PMOS source/drain · p+" />
        <LegendBox color={parchment.gate} label="polysilicon gate" />
      </div>

      <div style={partPickerStyle} data-testid="part-picker">
        {(['gate', 'oxide', 'source', 'drain', 'substrate'] as const).map((p) => (
          <button
            key={p}
            onClick={() => onHighlight(p)}
            data-testid={`pick-part-${p}`}
            aria-pressed={highlight === p}
            style={partBtn(highlight === p)}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onHighlight(null)}
          data-testid="pick-part-clear"
          aria-pressed={highlight === null}
          style={partBtn(highlight === null)}
        >
          clear
        </button>
      </div>
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
          height: 11,
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
  pointerEvents: 'none',
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
  width: 200,
};

const meterTrack: React.CSSProperties = {
  display: 'inline-block',
  width: 100,
  height: 6,
  background: parchment.bgDeep,
  border: `1px solid ${parchment.rule}`,
  borderRadius: 2,
  verticalAlign: 'middle',
};

const meterFill: React.CSSProperties = {
  display: 'block',
  height: '100%',
  background: parchment.gateOn,
  transition: 'width 80ms linear',
};

const partPickerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 6,
  padding: '6px 8px',
  background: 'rgba(241,231,205,0.92)',
  border: `1px solid ${parchment.rule}`,
  borderRadius: 6,
};

function partBtn(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    background: active ? parchment.gateOn : 'transparent',
    color: active ? '#fff' : parchment.ink,
    border: `1px solid ${parchment.rule}`,
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: active ? 600 : 400,
  };
}
