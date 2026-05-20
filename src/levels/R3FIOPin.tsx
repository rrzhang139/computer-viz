// R3FIOPin — r3f counterpart of <IOPin>. Renders an Html overlay so the
// 3D gate level can show the same "circle around letter + value below"
// I/O symbol used in every SVG level. Visuals must stay in sync with
// IOPin.tsx — both read from UI tokens.

import { Html } from '@react-three/drei';
import { parchment } from './parchment';
import { UI } from './ui_tokens';

type Bit = 0 | 1;

interface Props {
  position: [number, number, number];
  label: string;
  value: Bit;
  /** drei <Html> distanceFactor — controls on-screen size at default camera. */
  distanceFactor?: number;
  testid?: string;
}

export function R3FIOPin({ position, label, value, distanceFactor = 9, testid }: Props) {
  const wireColor = value === 1 ? UI.NET_HIGH : UI.NET_LOW;
  const size = UI.PIN_RADIUS * 2;
  return (
    <Html position={position} center distanceFactor={distanceFactor} zIndexRange={[100, 0]}>
      <div data-testid={testid} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: parchment.bg,
            border: `${UI.PIN_STROKE}px solid ${wireColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: UI.PIN_LABEL_SIZE,
            fontWeight: 700,
            color: parchment.ink,
            fontFamily: 'serif',
            margin: '0 auto',
          }}
        >
          {label}
        </div>
        <div
          data-testid={testid ? `${testid}-value` : undefined}
          style={{
            textAlign: 'center',
            fontSize: UI.PIN_VALUE_SIZE,
            color: wireColor,
            fontFamily: 'serif',
            marginTop: 2,
            whiteSpace: 'nowrap',
          }}
        >
          = {value}
        </div>
      </div>
    </Html>
  );
}
