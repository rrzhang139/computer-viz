// LevelModule — the unit of reuse between adjacent levels.
//
// A LevelModule fully describes a level's scene for the purpose of being
// EMBEDDED as a mini in a parent level. The parent imports the child's
// module and uses its API to:
//
//   • compute where each external terminal projects into the parent's SVG
//     (`projectTerminal`), so the parent can route its wires to land on
//     the terminal pixel-precisely;
//   • render the mini view (`renderMini`), which draws the framed box +
//     the world-coord-transformed scene;
//   • feed into structural tests — loose-end detection, wire-connection
//     verification, no-orphan-terminal assertions — without each level
//     duplicating that boilerplate.
//
// The class keeps EVERY piece of geometry + terminal data together so a
// future engineer adding a new level (e.g. DFF) writes one module file
// and the parent level (e.g. register) gets the full embedding API for
// free.

import type { ComponentType, ReactNode } from 'react';
import {
  MiniLevelView,
  type SceneGeometry,
  projectSceneToMini,
  fitForGeometry,
} from './MiniLevelView';
import { parchment } from './parchment';

export interface Point2 { x: number; y: number }

export interface LevelModuleConfig<TerminalName extends string, Inputs> {
  /** Stable identifier — 'gate', 'latch', 'dff', etc. */
  id: string;
  /** World-coord bounds + center + size, used to fit the scene into a box. */
  geometry: SceneGeometry;
  /** External terminals: world coords of each point the PARENT level
   * connects to. The parent is responsible for wiring these up. */
  externalTerminals: Readonly<Record<TerminalName, readonly [number, number]>>;
  /** Absorbed terminals (transistor body etc.) — not loose despite being
   * graph-loose. Names only; not projected by this class. */
  absorbedTerminals?: readonly string[];
  /** The SVG scene renderer — takes the level's logical inputs and
   * outputs the wire/transistor/etc. content in WORLD coordinates. */
  Scene: ComponentType<{ inputs: Inputs; testid?: string }>;
}

export interface ConnectionMap {
  /** Required: each external terminal name → parent-supplied connection
   * description. Used by tests + by future auto-wire-drawing logic. */
  [terminal: string]: TerminalConnection;
}

export type TerminalConnection =
  | { kind: 'wire'; testid: string }        // routed by a named latch-level wire (or rail)
  | { kind: 'rail'; testid: string }        // sits on a rail (Vdd/GND)
  | { kind: 'unknown'; reason: string };    // explicitly unwired (debug only)

export class LevelModule<TerminalName extends string, Inputs> {
  public readonly id: string;
  public readonly geometry: SceneGeometry;
  public readonly externalTerminals: Readonly<Record<TerminalName, readonly [number, number]>>;
  public readonly absorbedTerminals: readonly string[];
  public readonly Scene: ComponentType<{ inputs: Inputs; testid?: string }>;

  constructor(cfg: LevelModuleConfig<TerminalName, Inputs>) {
    this.id = cfg.id;
    this.geometry = cfg.geometry;
    this.externalTerminals = cfg.externalTerminals;
    this.absorbedTerminals = cfg.absorbedTerminals ?? [];
    this.Scene = cfg.Scene;
  }

  /** Names of every external terminal — useful for iteration in tests. */
  get terminalNames(): TerminalName[] {
    return Object.keys(this.externalTerminals) as TerminalName[];
  }

  /** Project a single external terminal into a parent's SVG coords. */
  projectTerminal(
    name: TerminalName,
    miniCx: number,
    miniCy: number,
    miniW: number,
    miniH: number,
    margin: number = 1.2,
  ): Point2 {
    const coord = this.externalTerminals[name];
    if (!coord) throw new Error(`${this.id}: unknown terminal ${name}`);
    return projectSceneToMini(coord[0], coord[1], miniCx, miniCy, miniW, miniH, this.geometry, margin);
  }

  /** Project EVERY external terminal at once. */
  projectAllTerminals(
    miniCx: number,
    miniCy: number,
    miniW: number,
    miniH: number,
    margin: number = 1.2,
  ): Record<TerminalName, Point2> {
    const out = {} as Record<TerminalName, Point2>;
    for (const name of this.terminalNames) {
      out[name] = this.projectTerminal(name, miniCx, miniCy, miniW, miniH, margin);
    }
    return out;
  }

  /** Same scale a mini will render at — useful for the parent to size
   * stubs / verify that visible features (like supply rails) align. */
  pxPerWorld(miniW: number, miniH: number, margin: number = 1.2): number {
    return fitForGeometry(miniW, miniH, this.geometry, margin).pxPerWorld;
  }

  /** Render the framed mini box containing this level's scene. The
   * parent is responsible for its own external wire routing (using
   * projectTerminal). */
  renderMini(props: {
    cx: number;
    cy: number;
    w: number;
    h: number;
    inputs: Inputs;
    margin?: number;
    testid: string;
    frameStroke?: string;
    /** When true the underlying Scene suppresses Vdd/GND rail labels and
     * other parent-level signage that would otherwise duplicate. */
    embedded?: boolean;
    /** Optional extra SVG content rendered ABOVE the scene (parent labels,
     * per-child anchors, etc.). */
    overlay?: ReactNode;
  }): ReactNode {
    const Scene = this.Scene;
    // Cast to permit passing `embedded` even though TypeScript doesn't
    // know whether the Scene component's props include it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sceneProps: any = { inputs: props.inputs, testid: `${props.testid}-scene`, embedded: props.embedded };
    return (
      <MiniLevelView
        cx={props.cx}
        cy={props.cy}
        w={props.w}
        h={props.h}
        geometry={this.geometry}
        margin={props.margin ?? 1.2}
        testid={props.testid}
        frameStroke={props.frameStroke}
        // When the mini is being rendered as a hover overlay (embedded),
        // fill the frame with the parchment background so it COVERS the
        // parent's underlying symbols. Otherwise the parent + preview
        // both draw the same NANDs and they pile up.
        frameFill={props.embedded ? parchment.bg : undefined}
      >
        <Scene {...sceneProps} />
      </MiniLevelView>
    );
    // (overlay rendering happens at the parent level — kept out of the
    // box so the parent controls SVG ordering relative to other elements.)
  }

  /** Asserts every external terminal of this module is covered by the
   * parent's connection map. Surfaces missing connections at runtime
   * (and in tests). Returns the list of missing terminals (empty = OK). */
  validateConnections(connections: ConnectionMap): TerminalName[] {
    const missing: TerminalName[] = [];
    for (const name of this.terminalNames) {
      if (!connections[name]) missing.push(name);
    }
    return missing;
  }
}
