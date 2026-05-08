// LevelTransistor — Tier 2 view of a row of MOSFETs as discrete switches.
// Same vocabulary as LevelElectrons but zoomed out so the user gets scale.
// Parchment palette to match the manuscript-illustration feel.

import { useRef } from 'react';
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
}

function Mosfet({ position, active, on, highlighted }: MosfetProps) {
  const gateRef = useRef<THREE.Mesh>(null);
  const channelRef = useRef<THREE.Mesh>(null);

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
  });

  return (
    <group position={position}>
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

function TransistorRow({ gateOn, activeIdx }: { gateOn: number; activeIdx: number }) {
  const positions: [number, number, number][] = [
    [-3.6, 0, 0],
    [-1.2, 0, 0],
    [1.2, 0, 0],
    [3.6, 0, 0],
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <Mosfet key={i} position={pos} active={i === activeIdx} on={gateOn} highlighted={i === activeIdx} />
      ))}
      <Text position={[0, 1.3, 0]} fontSize={0.22} color={parchment.inkSoft} anchorX="center">
        4× [T] — drill in for carrier physics
      </Text>
    </>
  );
}

export function LevelTransistor() {
  const cycle = useExecution((s) => s.cycle);
  const microStep = useExecution((s) => s.microStep);
  const base = cycle % 2 === 0 ? 0 : 1;
  const ramp = Math.min(0.4, microStep * 0.08);
  const gateOn = Math.max(0, Math.min(1, base + (base === 0 ? ramp : -ramp)));
  const activeIdx = cycle % 4;

  return (
    <div style={containerStyle} data-testid="level-transistor">
      <Canvas camera={{ position: [0, 4, 7], fov: 35 }} style={{ width: '100%', height: '100%', background: parchment.bg }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 8, 5]} intensity={0.9} />
        <directionalLight position={[-4, 4, -3]} intensity={0.35} color={parchment.oxide} />
        <TransistorRow gateOn={gateOn} activeIdx={activeIdx} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={14} />
      </Canvas>
      <div style={overlayStyle}>
        <strong style={{ color: parchment.ink }}>Transistor row</strong>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          The russet-ringed transistor is "current". Each tick the gate cycles —
          channel glow tracks V_G.
        </div>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          drag to orbit · scroll to zoom
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
