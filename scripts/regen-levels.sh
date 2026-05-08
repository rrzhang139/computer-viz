#!/usr/bin/env bash
ROOT="/Users/richardzhang/personal/computer-viz/levels"
OUT="/Users/richardzhang/personal/computer-viz/src/data/levels.ts"

{
  echo "// Auto-generated from levels/ folder scan. Do not edit by hand — run scripts/regen-levels.sh."
  echo "// Each entry describes one node or connector folder."
  echo ""
  echo "export interface LevelNode {"
  echo "  id: string;          // slash-separated path under levels/"
  echo "  name: string;        // last segment"
  echo "  parent: string | null;"
  echo "  isConnector: boolean; // true if folder name starts with _"
  echo "  depth: number;       // depth from root level (0 = 00_computer)"
  echo "}"
  echo ""
  echo "export const levels: readonly LevelNode[] = ["

  find "$ROOT" -mindepth 1 -type d | sort | while read d; do
    rel="${d#$ROOT/}"
    name="${rel##*/}"
    parent="${rel%/*}"
    if [ "$parent" = "$rel" ]; then parent="null"; else parent="\"$parent\""; fi
    is_connector="false"
    case "$name" in _*) is_connector="true";; esac
    depth=$(echo "$rel" | tr -cd '/' | wc -c | tr -d ' ')
    echo "  { id: \"$rel\", name: \"$name\", parent: $parent, isConnector: $is_connector, depth: $depth },"
  done

  echo "];"
  echo ""
  echo "export const levelById = new Map(levels.map(l => [l.id, l]));"
  echo ""
  echo "export function childrenOf(id: string | null): LevelNode[] {"
  echo "  return levels.filter(l => l.parent === id);"
  echo "}"
} > "$OUT"

wc -l "$OUT"
