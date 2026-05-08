// LevelElectrons — Tier 2 react-three-fiber scene of a single NMOS channel
// with carrier drift visualized as instanced particles. Parchment palette.
//
// Geometry (LEFT=source data, RIGHT=drain output, TOP=gate control):
//   substrate slab in y<0 (warm sepia silicon)
//   source (n+) at LEFT, drain at RIGHT (muted slate-blue tint)
//   gate oxide as a thin translucent slab over the channel
//   polysilicon gate strip — terracotta when V_G high, ink-brown when low
//   ~120 instanced carriers drift L→R when V_G high; cluster at source when low
//
// Driven by global executionState: gate voltage rises on even cycles, falls
// on odd, with microStep providing sub-cycle smoothing.

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import type { ElectronsPart } from './descriptions';

type Part = ElectronsPart;

const N_ELECTRONS = 120;

const SUB_W = 6;
const SUB_H = 0.6;
const SUB_D = 1.6;
const CHANNEL_X_MIN = -1.5;
const CHANNEL_X_MAX = 1.5;
const SOURCE_X = -2.5;
const DRAIN_X = 2.5;

function MOSFET({
  gateOn,
  highlight,
  onPickPart,
}: {
  gateOn: number;
  highlight: Part;
  onPickPart: (p: Part) => void;
}) {
  const electronsRef = useRef<THREE.InstancedMesh>(null);
  const gateRef = useRef<THREE.Mesh>(null);
  const oxideRef = useRef<THREE.Mesh>(null);
  const sourceRef = useRef<THREE.Mesh>(null);
  const drainRef = useRef<THREE.Mesh>(null);
  const substrateRef = useRef<THREE.Mesh>(null);

  const partGlow = (ref: React.RefObject<THREE.Mesh | null>, name: Part, base: string) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissive.set(parchment.gateOn);
    const isHi = highlight === name;
    m.emissiveIntensity = isHi ? 0.45 + Math.sin(performance.now() * 0.006) * 0.12 : 0;
    if (!isHi) m.color.set(base);
  };

  const electrons = useMemo(
    () =>
      Array.from({ length: N_ELECTRONS }, () => ({
        x: SOURCE_X + (Math.random() - 0.5) * 0.8,
        y: 0.05 + Math.random() * 0.08,
        z: (Math.random() - 0.5) * 1.2,
        vx: 0,
      })),
    []
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_state, delta) => {
    const fieldStrength = gateOn;
    const driftVelocity = fieldStrength * 2.5;

    if (gateRef.current) {
      const mat = gateRef.current.material as THREE.MeshStandardMaterial;
      const c = new THREE.Color(parchment.gate).lerp(new THREE.Color(parchment.gateOn), gateOn);
      mat.color.copy(c);
      mat.emissive.set(parchment.gateOn);
      // base intensity from V_G; pulse boost if highlighted
      const baseI = gateOn * 0.35;
      const hiBoost = highlight === 'gate' ? 0.4 + Math.sin(performance.now() * 0.006) * 0.15 : 0;
      mat.emissiveIntensity = baseI + hiBoost;
    }
    if (oxideRef.current) {
      const mat = oxideRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.18 + gateOn * 0.22 + (highlight === 'oxide' ? 0.25 : 0);
      mat.emissive.set(parchment.gateOn);
      mat.emissiveIntensity = highlight === 'oxide' ? 0.3 : 0;
    }
    partGlow(sourceRef, 'source', parchment.doped);
    partGlow(drainRef, 'drain', parchment.doped);
    partGlow(substrateRef, 'substrate', parchment.substrate);

    if (electronsRef.current) {
      for (let i = 0; i < N_ELECTRONS; i++) {
        const e = electrons[i];
        if (e.x > DRAIN_X) {
          e.x = SOURCE_X + (Math.random() - 0.5) * 0.6;
          e.y = 0.05 + Math.random() * 0.08;
          e.z = (Math.random() - 0.5) * 1.2;
          e.vx = 0;
        }
        if (e.x < CHANNEL_X_MIN) {
          // Cluster near source contact, jitter, no drift.
          e.x += (Math.random() - 0.5) * 0.04;
          e.y += (Math.random() - 0.5) * 0.01;
          e.z += (Math.random() - 0.5) * 0.04;
          e.y = Math.max(0.02, Math.min(0.18, e.y));
          if (gateOn > 0.3 && e.x > SOURCE_X - 0.3 && Math.random() < 0.02 * gateOn) {
            e.x = CHANNEL_X_MIN + 0.05;
            e.y = 0.06;
            e.vx = driftVelocity * 0.5;
          }
        } else {
          e.vx = driftVelocity + (Math.random() - 0.5) * 0.2;
          e.x += e.vx * delta;
          e.y = 0.06 + Math.sin((e.x + 5) * 4) * 0.01;
          e.z += (Math.random() - 0.5) * 0.05;
          e.z = Math.max(-0.7, Math.min(0.7, e.z));
        }

        dummy.position.set(e.x, e.y, e.z);
        dummy.scale.setScalar(0.06);
        dummy.updateMatrix();
        electronsRef.current.setMatrixAt(i, dummy.matrix);
      }
      electronsRef.current.instanceMatrix.needsUpdate = true;
    }
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

      <instancedMesh ref={electronsRef} args={[undefined, undefined, N_ELECTRONS]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color={parchment.electron} emissive={parchment.electronGlow} emissiveIntensity={0.7} roughness={0.4} />
      </instancedMesh>

      <Text position={[-2.7, 1.0, 0]} fontSize={0.18} color={parchment.ink} anchorX="center">S</Text>
      <Text position={[2.7, 1.0, 0]} fontSize={0.18} color={parchment.ink} anchorX="center">D</Text>
      <Text position={[0, 1.4, 0]} fontSize={0.18} color={parchment.gateOn} anchorX="center">G</Text>
    </group>
  );
}

function useGateVoltage(): number {
  // Tick toggles the gate (square wave on cycle parity); µ-tick adds a soft
  // ramp toward the next target so successive µ-ticks visibly trend.
  const cycle = useExecution((s) => s.cycle);
  const microStep = useExecution((s) => s.microStep);
  const base = cycle % 2 === 0 ? 0 : 1;
  const ramp = Math.min(0.4, microStep * 0.08);
  // Toward 1 if base is 0 and microStep accumulating; toward 0 if base is 1.
  return Math.max(0, Math.min(1, base + (base === 0 ? ramp : -ramp)));
}

interface ElectronsProps {
  highlight: Part;
  onHighlight: (p: Part) => void;
}

export function LevelElectrons({ highlight, onHighlight }: ElectronsProps) {
  const gateOn = useGateVoltage();
  const setHighlight = onHighlight;

  return (
    <div style={containerStyle} data-testid="level-electrons">
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
        <div style={{ marginTop: 0 }}>
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

      {/* HTML overlay artifacts — deterministic test targets */}
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
