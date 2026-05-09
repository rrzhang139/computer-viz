// LevelTransistor — Tier 2 view of a single MOSFET (NMOS).
//
// This is the deepest level (level 7). The transistor is the smallest reusable
// digital primitive — a voltage-controlled switch. We show its physical
// structure (substrate / source / drain / oxide / gate / contacts) and the
// gate-on / gate-off behavior via material color cues. Carrier particles are
// intentionally NOT modeled — the level is about the device, not the physics
// of conduction.
//
// Geometry (LEFT=source data, RIGHT=drain output, TOP=gate control):
//   substrate slab in y<0 (warm sepia silicon)
//   source (n+) at LEFT, drain at RIGHT (muted slate-blue tint)
//   gate oxide as a thin translucent slab over the channel
//   polysilicon gate strip — terracotta when V_G high, ink-brown when low
//   "channel" plate under the oxide that glows when V_G high (carrier
//   inversion stand-in, no individual particles)
//
// Driven by global executionState: gate voltage rises on even cycles, falls
// on odd, with microStep providing sub-cycle smoothing.

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import type { ElectronsPart } from './descriptions';

type Part = ElectronsPart;

const SUB_W = 6;
const SUB_H = 0.6;
const SUB_D = 1.6;
const CHANNEL_X_MAX = 1.5;
const CHANNEL_X_MIN = -1.5;

function MOSFET({
  gateOn,
  highlight,
  onPickPart,
}: {
  gateOn: number;
  highlight: Part;
  onPickPart: (p: Part) => void;
}) {
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
    // Gate strip: lerp ink-brown → terracotta with V_G; pulse if highlighted.
    if (gateRef.current) {
      const mat = gateRef.current.material as THREE.MeshStandardMaterial;
      const c = new THREE.Color(parchment.gate).lerp(new THREE.Color(parchment.gateOn), gateOn);
      mat.color.copy(c);
      mat.emissive.set(parchment.gateOn);
      const baseI = gateOn * 0.35;
      const hiBoost = highlight === 'gate' ? 0.4 + Math.sin(performance.now() * 0.006) * 0.15 : 0;
      mat.emissiveIntensity = baseI + hiBoost;
    }
    // Oxide: opacity tracks V_G (more visible when active); extra brighten if highlighted.
    if (oxideRef.current) {
      const mat = oxideRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.18 + gateOn * 0.22 + (highlight === 'oxide' ? 0.25 : 0);
      mat.emissive.set(parchment.gateOn);
      mat.emissiveIntensity = highlight === 'oxide' ? 0.3 : 0;
    }
    // Channel under the oxide — glows when V_G high (the inversion layer).
    // This is the visual stand-in for "carriers can flow now."
    if (channelRef.current) {
      const mat = channelRef.current.material as THREE.MeshStandardMaterial;
      mat.emissive.set(parchment.electronGlow);
      mat.emissiveIntensity = gateOn * 0.55;
      mat.opacity = 0.15 + gateOn * 0.5;
    }
    partGlow(sourceRef, 'source', parchment.doped);
    partGlow(drainRef, 'drain', parchment.doped);
    partGlow(substrateRef, 'substrate', parchment.substrate);
  });

  return (
    <group>
      <mesh ref={substrateRef} position={[0, -SUB_H / 2 - 0.05, 0]} onClick={() => onPickPart('substrate')}>
        <boxGeometry args={[SUB_W, SUB_H, SUB_D]} />
        <meshStandardMaterial color={parchment.substrate} roughness={0.85} metalness={0.05} />
      </mesh>

      <mesh ref={sourceRef} position={[-2.25, -0.05, 0]} onClick={() => onPickPart('source')}>
        <boxGeometry args={[1.5, 0.18, SUB_D - 0.1]} />
        <meshStandardMaterial color={parchment.doped} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh ref={drainRef} position={[2.25, -0.05, 0]} onClick={() => onPickPart('drain')}>
        <boxGeometry args={[1.5, 0.18, SUB_D - 0.1]} />
        <meshStandardMaterial color={parchment.doped} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* The "channel" — inversion layer under the oxide. Glows when V_G high. */}
      <mesh ref={channelRef} position={[0, 0.06, 0]}>
        <boxGeometry args={[CHANNEL_X_MAX - CHANNEL_X_MIN, 0.04, SUB_D - 0.15]} />
        <meshStandardMaterial
          color={parchment.electron}
          emissive={parchment.electronGlow}
          emissiveIntensity={0}
          transparent
          opacity={0.15}
        />
      </mesh>

      <mesh ref={oxideRef} position={[0, 0.18, 0]} onClick={() => onPickPart('oxide')}>
        <boxGeometry args={[CHANNEL_X_MAX - CHANNEL_X_MIN + 0.3, 0.08, SUB_D - 0.05]} />
        <meshStandardMaterial color={parchment.oxide} transparent opacity={0.25} roughness={0.3} metalness={0.1} />
      </mesh>

      <mesh ref={gateRef} position={[0, 0.32, 0]} onClick={() => onPickPart('gate')}>
        <boxGeometry args={[CHANNEL_X_MAX - CHANNEL_X_MIN + 0.4, 0.16, SUB_D + 0.1]} />
        <meshStandardMaterial color={parchment.gate} emissive={parchment.gateOn} emissiveIntensity={0} roughness={0.55} metalness={0.2} />
      </mesh>

      <mesh position={[-2.7, 0.45, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.6]} />
        <meshStandardMaterial color={parchment.contact} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[2.7, 0.45, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.6]} />
        <meshStandardMaterial color={parchment.contact} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.45, 0.65, 0.45]} />
        <meshStandardMaterial color={parchment.contact} metalness={0.5} roughness={0.45} />
      </mesh>

      <Text position={[-2.7, 1.0, 0]} fontSize={0.18} color={parchment.ink} anchorX="center">S</Text>
      <Text position={[2.7, 1.0, 0]} fontSize={0.18} color={parchment.ink} anchorX="center">D</Text>
      <Text position={[0, 1.4, 0]} fontSize={0.18} color={parchment.gateOn} anchorX="center">G</Text>
    </group>
  );
}

function useGateVoltage(): number {
  // V_G = cycle parity. Tick toggles between 0 and 1, end of story. The
  // µ-tick concept was confusing (it pulled V_G in the wrong direction
  // after a tick) and has been removed.
  const cycle = useExecution((s) => s.cycle);
  return cycle % 2 === 0 ? 0 : 1;
}

interface TransistorProps {
  highlight: Part;
  onHighlight: (p: Part) => void;
}

export function LevelTransistor({ highlight, onHighlight }: TransistorProps) {
  const gateOn = useGateVoltage();
  const setHighlight = onHighlight;

  return (
    <div style={containerStyle} data-testid="level-transistor">
      <Canvas
        camera={{ position: [3, 3, 5], fov: 35 }}
        style={{ width: '100%', height: '100%', background: parchment.bg }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[5, 8, 4]} intensity={0.9} />
        <directionalLight position={[-5, 4, -4]} intensity={0.35} color={parchment.oxide} />
        <MOSFET gateOn={gateOn} highlight={highlight} onPickPart={setHighlight} />
        <OrbitControls enablePan={false} minDistance={4} maxDistance={12} />
      </Canvas>
      <div style={overlayStyle}>
        <div>
          <span style={{ color: parchment.gateOn, fontSize: 11 }}>V_G </span>
          <span style={meterTrack}>
            <span style={{ ...meterFill, width: `${gateOn * 100}%` }} data-testid="vg-meter-fill" />
          </span>
          <span style={{ color: parchment.ink, fontSize: 11, marginLeft: 6, fontFamily: 'ui-monospace, monospace' }}>
            {gateOn.toFixed(2)}
          </span>
        </div>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 6 }}>
          drag to orbit · scroll to zoom
        </div>
        {highlight && (
          <div style={{ color: parchment.highlight, fontSize: 11, marginTop: 6 }} data-testid="highlight-readout">
            highlighted: <strong>{highlight}</strong>
          </div>
        )}
      </div>

      <div style={partPickerStyle} data-testid="part-picker">
        {(['gate', 'oxide', 'source', 'drain', 'substrate'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setHighlight(p)}
            data-testid={`pick-part-${p}`}
            aria-pressed={highlight === p}
            style={partBtn(highlight === p)}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setHighlight(null)}
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
  width: 220,
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
