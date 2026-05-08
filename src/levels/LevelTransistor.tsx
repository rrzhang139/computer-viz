// LevelTransistor — Tier 2 view of a row of MOSFETs as discrete switches.
// Each transistor is a clickable artifact (mesh + matching HTML overlay
// button with data-testid="pick-transistor-{i}"). The clicked one becomes
// pinned (overrides the auto-cycle); "auto" returns to cycle-driven rotation.

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';

interface MosfetProps {
  position: [number, number, number];
  active: boolean;
  on: number;
  highlighted: boolean;
  onClick: () => void;
}

function Mosfet({ position, active, on, highlighted, onClick }: MosfetProps) {
  const gateRef = useRef<THREE.Mesh>(null);
  const channelRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (gateRef.current) {
      const m = gateRef.current.material as THREE.MeshStandardMaterial;
      const c = new THREE.Color(parchment.gate).lerp(new THREE.Color(parchment.gateOn), active ? on : 0);
      m.color.copy(c);
      m.emissive.set(parchment.gateOn);
      m.emissiveIntensity = active ? on * 0.3 : 0;
    }
    if (channelRef.current) {
      const m = channelRef.current.material as THREE.MeshStandardMaterial;
      const intensity = active ? on : 0;
      m.emissiveIntensity = intensity * 0.45;
      m.opacity = 0.22 + intensity * 0.45;
    }
    if (groupRef.current && highlighted) {
      // Subtle bobbing on the highlighted one to draw the eye.
      groupRef.current.position.y = position[1] + Math.sin(performance.now() * 0.003) * 0.04;
    } else if (groupRef.current) {
      groupRef.current.position.y = position[1];
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[2.5, 0.4, 1]} />
        <meshStandardMaterial color={parchment.substrate} roughness={0.85} />
      </mesh>
      <mesh position={[-0.85, -0.05, 0]}>
        <boxGeometry args={[0.6, 0.12, 0.85]} />
        <meshStandardMaterial color={parchment.doped} />
      </mesh>
      <mesh position={[0.85, -0.05, 0]}>
        <boxGeometry args={[0.6, 0.12, 0.85]} />
        <meshStandardMaterial color={parchment.doped} />
      </mesh>
      <mesh ref={channelRef} position={[0, 0.05, 0]}>
        <boxGeometry args={[1.05, 0.08, 0.8]} />
        <meshStandardMaterial color={parchment.electron} emissive={parchment.electronGlow} emissiveIntensity={0} transparent opacity={0.22} />
      </mesh>
      <mesh ref={gateRef} position={[0, 0.18, 0]}>
        <boxGeometry args={[0.4, 0.1, 1.1]} />
        <meshStandardMaterial color={parchment.gate} emissive={parchment.gateOn} emissiveIntensity={0} roughness={0.55} metalness={0.2} />
      </mesh>
      {highlighted && (
        <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.55, 32]} />
          <meshBasicMaterial color={parchment.highlight} />
        </mesh>
      )}
    </group>
  );
}

const POSITIONS: [number, number, number][] = [
  [-3.6, 0, 0],
  [-1.2, 0, 0],
  [1.2, 0, 0],
  [3.6, 0, 0],
];

function TransistorRow({
  gateOn,
  activeIdx,
  onPick,
}: {
  gateOn: number;
  activeIdx: number;
  onPick: (i: number) => void;
}) {
  return (
    <>
      {POSITIONS.map((pos, i) => (
        <Mosfet
          key={i}
          position={pos}
          active={i === activeIdx}
          on={gateOn}
          highlighted={i === activeIdx}
          onClick={() => onPick(i)}
        />
      ))}
      <Text position={[0, 1.3, 0]} fontSize={0.22} color={parchment.inkSoft} anchorX="center">
        4× [T] — click any to pin · drill in for carrier physics
      </Text>
    </>
  );
}

export function LevelTransistor() {
  const cycle = useExecution((s) => s.cycle);
  const microStep = useExecution((s) => s.microStep);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  const base = cycle % 2 === 0 ? 0 : 1;
  const ramp = Math.min(0.4, microStep * 0.08);
  const gateOn = Math.max(0, Math.min(1, base + (base === 0 ? ramp : -ramp)));
  const activeIdx = pinnedIdx ?? cycle % 4;

  return (
    <div style={containerStyle} data-testid="level-transistor">
      <Canvas camera={{ position: [0, 5, 13], fov: 38 }} style={{ width: '100%', height: '100%', background: parchment.bg }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 8, 5]} intensity={0.9} />
        <directionalLight position={[-4, 4, -3]} intensity={0.35} color={parchment.oxide} />
        <TransistorRow gateOn={gateOn} activeIdx={activeIdx} onPick={setPinnedIdx} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={14} />
      </Canvas>
      <div style={overlayStyle}>
        <strong style={{ color: parchment.ink }}>Transistor row</strong>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          The russet-ringed transistor is "current". Click a button below — or the
          mesh itself — to pin one. Channel glow tracks V_G.
        </div>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          drag canvas to orbit · scroll to zoom
        </div>
      </div>

      {/* HTML overlay artifacts — deterministic test targets */}
      <div style={pickerStyle} data-testid="transistor-picker">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => setPinnedIdx(i)}
            data-testid={`pick-transistor-${i}`}
            aria-pressed={pinnedIdx === i}
            style={pickBtn(pinnedIdx === i)}
          >
            T{i}
          </button>
        ))}
        <button
          onClick={() => setPinnedIdx(null)}
          data-testid="pick-transistor-auto"
          aria-pressed={pinnedIdx === null}
          style={pickBtn(pinnedIdx === null)}
        >
          auto
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
  width: 240,
};

const pickerStyle: React.CSSProperties = {
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

function pickBtn(active: boolean): React.CSSProperties {
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
