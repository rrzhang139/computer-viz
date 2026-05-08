// LevelTransistor — Tier 2 row of MOSFETs as discrete switches.
//
// Interaction model:
//   - Hover a MOSFET (or its anchored Html button) → highlight + cursor pointer.
//   - Click a MOSFET (or its button) → camera flies toward that MOSFET, and
//     once it gets close, the parent (LevelView) swaps to LevelElectrons.
//   - No "zoom in" button — the meshes themselves are the zoom targets.
//
// Test handles: each MOSFET has an <Html> overlay button with
// data-testid="zoom-target-{i}". Buttons are anchored at the mesh's world
// position so they follow the camera. Tests can click them deterministically.

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';

const POSITIONS: readonly [number, number, number][] = [
  [-3.6, 0, 0],
  [-1.2, 0, 0],
  [1.2, 0, 0],
  [3.6, 0, 0],
];

const HOME_POS = new THREE.Vector3(0, 5, 13);
const HOME_LOOK = new THREE.Vector3(0, 0, 0);

function targetPoseFor(idx: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
  const x = POSITIONS[idx][0];
  return {
    pos: new THREE.Vector3(x, 2, 4.5), // close to the picked MOSFET
    look: new THREE.Vector3(x, 0, 0),
  };
}

interface MosfetProps {
  position: [number, number, number];
  idx: number;
  hovered: boolean;
  active: boolean;
  on: number;
  onHover: (idx: number | null) => void;
  onClick: (idx: number) => void;
}

function Mosfet({ position, idx, hovered, active, on, onHover, onClick }: MosfetProps) {
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
      const mat = channelRef.current.material as THREE.MeshStandardMaterial;
      const intensity = active ? on : 0;
      mat.emissiveIntensity = intensity * 0.45;
      mat.opacity = 0.22 + intensity * 0.45;
    }
    if (groupRef.current) {
      // Active MOSFET bobs subtly. Hovered MOSFET lifts a touch (clickability cue).
      const lift = (hovered ? 0.15 : 0) + (active ? Math.sin(performance.now() * 0.003) * 0.04 : 0);
      groupRef.current.position.y = position[1] + lift;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(idx);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(idx);
      }}
    >
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

      {/* Hover ring — cyan-tinted: "this is clickable" */}
      {hovered && (
        <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.40, 1.65, 32]} />
          <meshBasicMaterial color={parchment.gateOn} transparent opacity={0.7} />
        </mesh>
      )}

      {/* Active ring — russet: "this is the current MOSFET" */}
      {active && (
        <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.55, 32]} />
          <meshBasicMaterial color={parchment.highlight} />
        </mesh>
      )}
    </group>
  );
}

// Time-based camera fly. Frame-rate independent so Playwright (which can
// throttle requestAnimationFrame in headless workers) reaches "arrived" in
// real wall-clock time. Duration ≈ 1.0 s; a small extra hold before firing
// onArrived ensures the cross-fade kicks in once the camera is visibly close.
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
    // On target change, snapshot start pose + reset timer.
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
    // Cubic ease-in-out for natural microscope feel.
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
  onHover: (idx: number | null) => void;
  onClick: (idx: number) => void;
}) {
  return (
    <>
      {POSITIONS.map((pos, i) => (
        <Html key={i} position={[pos[0], 1.0, 0]} center distanceFactor={9}>
          <button
            data-testid={`zoom-target-${i}`}
            aria-label={`zoom to transistor ${i}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(i);
            }}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            style={hoverBtnStyle}
          >
            T{i}
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

export function LevelTransistor({ zoomTarget, onZoomTo, onArrived }: Props) {
  const cycle = useExecution((s) => s.cycle);
  const microStep = useExecution((s) => s.microStep);
  const [hovered, setHovered] = useState<number | null>(null);

  const base = cycle % 2 === 0 ? 0 : 1;
  const ramp = Math.min(0.4, microStep * 0.08);
  const gateOn = Math.max(0, Math.min(1, base + (base === 0 ? ramp : -ramp)));
  // Picked transistor wins; otherwise auto-cycle on each clock tick.
  const activeIdx = zoomTarget ?? cycle % 4;

  // Reset cursor on unmount in case hover leaves it pointer.
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <div style={containerStyle} data-testid="level-transistor">
      <Canvas camera={{ position: [0, 5, 13], fov: 38 }} style={{ width: '100%', height: '100%', background: parchment.bg }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 8, 5]} intensity={0.9} />
        <directionalLight position={[-4, 4, -3]} intensity={0.35} color={parchment.oxide} />
        <CameraRig targetIdx={zoomTarget} onArrived={onArrived} />
        {POSITIONS.map((pos, i) => (
          <Mosfet
            key={i}
            position={pos}
            idx={i}
            hovered={hovered === i}
            active={i === activeIdx}
            on={gateOn}
            onHover={setHovered}
            onClick={onZoomTo}
          />
        ))}
        <HoverTargets onHover={setHovered} onClick={onZoomTo} />
        <Text position={[0, 2.0, 0]} fontSize={0.28} color={parchment.inkSoft} anchorX="center">
          4× [T] — hover to highlight · click to dive in
        </Text>
      </Canvas>

      <div style={overlayStyle}>
        <strong style={{ color: parchment.ink }}>Transistor row</strong>
        <div style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 4 }}>
          Each cell is a clickable [T]. Hover any to highlight; click to fly the
          camera toward it and zoom into the carrier-physics view.
        </div>
        {hovered !== null && (
          <div data-testid="hover-readout" style={{ color: parchment.gateOn, fontSize: 11, marginTop: 6 }}>
            hovering: <strong>T{hovered}</strong>
          </div>
        )}
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

const hoverBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(241,231,205,0.85)',
  color: parchment.ink,
  border: `1px solid ${parchment.gateOn}`,
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'inherit',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
