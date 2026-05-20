// LevelGate — CMOS NAND gate (4 transistors), rendered as pure SVG.
//
// Visual contract — matches LevelLatch byte-for-byte where possible:
//   • Vertical Vdd / GND pillars at the canvas edges, labels at the top.
//   • The gate body is drawn by GATE_MODULE.renderMini (NandSceneSvg) at
//     full viewport scale; `embedded: true` suppresses the internal rail
//     labels so the parent pillars are the only Vdd / GND markers.
//   • External terminals (A, B, Y) get standardized <IOPin> circles
//     projected onto the same world coords NandSceneSvg uses.
//
// Drill-down interaction (CLAUDE.md "preview-only click contract"):
//   • Each transistor gets a SMALL visible chip-label below its body
//     (the `zoom-target-{id}` button). ONLY the chip is clickable —
//     hovering the broader transistor body does nothing.
//   • Hovering a chip:
//       (a) updates the `hover-readout` text (e.g. "N_A") and
//       (b) swaps the simple transistor symbol in the scene for a
//           <MosfetCrossSection> preview (the same vertical cross-section
//           the user would see if they drilled into the transistor level).
//   • Clicking the chip cross-fades to the transistor level.
//
// Truth table cycles 00 → 01 → 11 → 10 on each clock tick.

import { useEffect, useMemo } from 'react';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import { IOPin } from './IOPin';
import { LOGIC, TRANSISTOR_ROLE, TRANSISTOR_TYPE, type TransistorRole } from './symbols';
import { GATE_MODULE } from './gateModule';
import { GATE_GEOMETRY, WIRE_NODES } from './nandWireGraph';
import { projectSceneToMini } from './MiniLevelView';
import { MosfetCrossSection } from './MiniViews';
import { useHoveredChild } from './connectedHover';
import { UI } from './ui_tokens';

type Bit = 0 | 1;
interface Inputs { A: Bit; B: Bit; Y: Bit }

interface TransistorSpec {
  id: number;
  role: TransistorRole;
  kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS;
  input: typeof LOGIC.A | typeof LOGIC.B;
  /** World-space center of the transistor body. */
  x: number;
  y: number;
}

const TRANSISTORS: readonly TransistorSpec[] = [
  { id: 0, role: TRANSISTOR_ROLE.P_A, kind: TRANSISTOR_TYPE.PMOS, input: LOGIC.A, x: -1.6, y: 1.5 },
  { id: 1, role: TRANSISTOR_ROLE.P_B, kind: TRANSISTOR_TYPE.PMOS, input: LOGIC.B, x:  1.6, y: 1.5 },
  { id: 2, role: TRANSISTOR_ROLE.N_A, kind: TRANSISTOR_TYPE.NMOS, input: LOGIC.A, x:  0,   y: -0.6 },
  { id: 3, role: TRANSISTOR_ROLE.N_B, kind: TRANSISTOR_TYPE.NMOS, input: LOGIC.B, x:  0,   y: -2.4 },
];

function inputsFor(cycle: number): Inputs {
  const seq: [Bit, Bit][] = [[0, 0], [0, 1], [1, 1], [1, 0]];
  const [A, B] = seq[((cycle % 4) + 4) % 4];
  const Y: Bit = A === 1 && B === 1 ? 0 : 1;
  return { A, B, Y };
}

interface Props {
  zoomTarget: number | null;
  onZoomTo: (idx: number, kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS) => void;
  onArrived: (idx: number) => void;
}

const VIEW_W = 600;
const VIEW_H = 400;
const MARGIN = 1.2;

// Per-transistor chip-label size in SVG px. The chip is the ONLY click /
// hover target — see "preview-only click contract" in the file header.
const CHIP_W = 60;
const CHIP_H = 20;
// Cross-section preview footprint (matches MosfetCrossSection's intrinsic
// 130×180 SVG). Sized large enough that the hovered detail dominates.
const PREVIEW_W = 130;
const PREVIEW_H = 180;

export function LevelGate({ zoomTarget, onZoomTo, onArrived }: Props) {
  const cycle = useExecution((s) => s.cycle);
  const inputs = useMemo(() => inputsFor(cycle), [cycle]);
  const { hovered, enter, leaveIf, leaveAll } = useHoveredChild<TransistorRole>();

  // Honor parent-initiated zooms (e.g. via keyboard shortcut). With the
  // 3D camera-fly gone, "arrival" is immediate — LevelView's cross-fade
  // between level panes is the only transition.
  useEffect(() => {
    if (zoomTarget != null) onArrived(zoomTarget);
  }, [zoomTarget, onArrived]);

  const project = (wx: number, wy: number) =>
    projectSceneToMini(wx, wy, VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, GATE_GEOMETRY, MARGIN);

  // External terminals + transistor centers projected into SVG coords.
  const aPt = project(WIRE_NODES.A_input[0], WIRE_NODES.A_input[1]);
  const bPt = project(WIRE_NODES.B_input[0], WIRE_NODES.B_input[1]);
  const yPt = project(WIRE_NODES.Y_out[0], WIRE_NODES.Y_out[1]);
  const VddY = project(0, WIRE_NODES.Vdd_rail_left[1]).y;
  const GndY = project(0, WIRE_NODES.GND_rail_left[1]).y;

  return (
    <div style={containerStyle} data-testid="gate-scene">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Vertical supply pillars — same recipe as the latch. */}
        <line x1={15} y1={20} x2={15} y2={VIEW_H - 15} stroke={UI.RAIL_VDD} strokeWidth={UI.OUTER_PILLAR} data-testid="gate-vdd-pillar" />
        <text x={2} y={14} fontSize={11} fontWeight={700} fill={UI.RAIL_VDD} fontFamily="serif">Vdd</text>
        <line x1={VIEW_W - 15} y1={20} x2={VIEW_W - 15} y2={VIEW_H - 15} stroke={UI.RAIL_GND} strokeWidth={UI.OUTER_PILLAR} data-testid="gate-gnd-pillar" />
        <text x={VIEW_W - 30} y={14} fontSize={11} fontWeight={700} fill={UI.RAIL_GND} fontFamily="serif">GND</text>

        {/* Connect each horizontal rail (inside NandSceneSvg) into the
            vertical pillars so power buses read as continuous lines. */}
        <line x1={15} y1={VddY} x2={VIEW_W - 15} y2={VddY} stroke={UI.RAIL_VDD} strokeWidth={UI.OUTER_WIRE} data-testid="gate-vdd-rail" />
        <line x1={15} y1={GndY} x2={VIEW_W - 15} y2={GndY} stroke={UI.RAIL_GND} strokeWidth={UI.OUTER_WIRE} data-testid="gate-gnd-rail" />

        {/* Gate body — same scene NandSceneSvg renders inside the latch
            hover preview, just at viewport scale. `embedded: true`
            suppresses internal rail labels (we draw them on the pillars). */}
        {GATE_MODULE.renderMini({
          cx: VIEW_W / 2,
          cy: VIEW_H / 2,
          w: VIEW_W,
          h: VIEW_H,
          inputs,
          testid: 'gate-body',
          margin: MARGIN,
          embedded: true,
        })}

        {/* Standardized I/O pins at the external terminals. */}
        <IOPin cx={aPt.x - 18} cy={aPt.y} label={LOGIC.A} value={inputs.A} testid="a-input-pin" />
        <IOPin cx={bPt.x + 18} cy={bPt.y} label={LOGIC.B} value={inputs.B} testid="b-input-pin" />
        <IOPin cx={yPt.x + 18} cy={yPt.y} label={LOGIC.Y} value={inputs.Y} testid="y-output-pin" />

        {/* Hover previews — cross-section of the hovered transistor. Sits
            on top of (but doesn't replace) the scene body so the parent
            wires stay visible underneath. */}
        {TRANSISTORS.map((t) => {
          if (hovered !== t.role) return null;
          const c = project(t.x, t.y);
          // Center the cross-section above the transistor body, biased a
          // bit so it doesn't cover the IOPins or the rails.
          const fx = c.x - PREVIEW_W / 2;
          const fy = c.y - PREVIEW_H / 2;
          return (
            <foreignObject key={t.id} x={fx} y={fy} width={PREVIEW_W} height={PREVIEW_H}>
              <MosfetCrossSection
                kind={t.kind === TRANSISTOR_TYPE.PMOS ? 'pmos' : 'nmos'}
                role={t.role}
                testid={`${t.role}-detailed`}
              />
            </foreignObject>
          );
        })}

        {/* Chip labels — the ONE clickable / hoverable element per
            transistor. Drawn LAST so they sit above any preview overlay
            (in case a preview ever covers them at unusual viewports). */}
        {TRANSISTORS.map((t) => {
          const c = project(t.x, t.y);
          // Chip sits BELOW each transistor body so it never overlaps the
          // body label inside NandSceneSvg.
          const cx = c.x;
          const cy = c.y + 36;
          const rx = cx - CHIP_W / 2;
          const ry = cy - CHIP_H / 2;
          const isHovered = hovered === t.role;
          return (
            <g key={t.id}>
              <rect
                x={rx}
                y={ry}
                width={CHIP_W}
                height={CHIP_H}
                rx={4}
                fill={parchment.bg}
                stroke={isHovered ? UI.RAIL_VDD : parchment.ink}
                strokeWidth={isHovered ? 2 : 1.5}
                data-testid={`zoom-target-${t.id}`}
                aria-label={`zoom to ${t.role}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomTo(t.id, t.kind);
                  onArrived(t.id);
                }}
                onMouseEnter={() => enter(t.role)}
                onMouseLeave={() => leaveIf(t.role)}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={parchment.ink}
                fontFamily="serif"
                pointerEvents="none"
              >
                {t.role}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover readout — small floating chip in the bottom-left of the
          canvas that names whatever the cursor is currently over. Hidden
          when nothing is hovered. Outside the SVG so it overlays all
          scene content cleanly. */}
      {hovered && (
        <div
          data-testid="hover-readout"
          onMouseLeave={() => leaveAll()}
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            background: parchment.bgDeep,
            color: parchment.ink,
            border: `1.5px solid ${UI.RAIL_VDD}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'serif',
            pointerEvents: 'none',
            boxShadow: '0 1px 3px rgba(80,60,30,0.25)',
          }}
        >
          {hovered}
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
  overflow: 'hidden',
};
