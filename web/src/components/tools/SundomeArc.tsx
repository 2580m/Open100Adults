"use client";

import { useId } from "react";

export type SundomeArcMode = "go" | "slow" | "stop";

export interface SundomeTrace {
  end?: number;
  edges: number[];
  segs: [number, SundomeArcMode][];
}

export const ARC_COLORS: Record<SundomeArcMode, string> = {
  go: "#86e3bb",
  slow: "#f4d48c",
  stop: "#ff98a8",
};

export function arcTime(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function arcModel(trace: SundomeTrace, came: boolean) {
  const W = 340;
  const H = 110;
  const end = Math.max(
    trace.end ?? 0,
    ...trace.edges,
    trace.segs[trace.segs.length - 1]?.[0] ?? 0,
    1000,
  );
  const x = (t: number) => (t / end) * W;
  const y = (level: number) => H - 86 * level - 4;
  const modeAt = (t: number): SundomeArcMode => {
    let mode: SundomeArcMode = "go";
    for (const [at, segMode] of trace.segs) {
      if (at <= t) mode = segMode;
    }
    return mode;
  };

  const stepMs = end / 220;
  const pts: [number, number][] = [];
  let level = 0.18;
  let edgeIdx = 0;
  const edges = [...trace.edges].sort((a, b) => a - b);

  for (let i = 0; i <= 220; i++) {
    const t = i * stepMs;
    const mode = modeAt(t);
    const dtSec = stepMs / 1000;
    level +=
      mode === "go" ? 0.013 * dtSec : mode === "slow" ? -0.004 * dtSec : -0.03 * dtSec;
    while (edgeIdx < edges.length && edges[edgeIdx] <= t) {
      level = 0.97;
      edgeIdx++;
    }
    if (came && i === 220) level = 1;
    level = Math.max(0.12, Math.min(came && i === 220 ? 1 : 0.97, level));
    pts.push([x(t), y(level)]);
  }

  const segs: [number, SundomeArcMode][] = trace.segs.length
    ? trace.segs
    : [[0, "go"]];

  return {
    W,
    H,
    end,
    x,
    y,
    pts,
    edges,
    edgeY: y(0.97),
    segs,
  };
}

export function SundomeArc({
  trace,
  came,
}: {
  trace: SundomeTrace;
  came: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const { W, H, end, x, y, pts, edges, edgeY, segs } = arcModel(trace, came);

  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    d += ` Q${px.toFixed(1)},${py.toFixed(1)} ${((px + cx) / 2).toFixed(1)},${((py + cy) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last[0].toFixed(1)},${last[1].toFixed(1)}`;

  const endX = x(end);
  const heartY = y(1) - 3;

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 30}`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      role="img"
      aria-label=""
      data-sundome-arc
      data-sundome-arc-edges={edges.length}
    >
      <defs>
        <linearGradient id={`${uid}l`} x1="0" x2="1">
          <stop offset="0" stopColor="rgb(var(--glass-a, 245,163,200))" />
          <stop offset="1" stopColor="rgb(var(--glass-b, 184,164,255))" />
        </linearGradient>
        <linearGradient id={`${uid}f`} x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0"
            stopColor="rgb(var(--glass-a, 245,163,200))"
            stopOpacity=".22"
          />
          <stop
            offset="1"
            stopColor="rgb(var(--glass-a, 245,163,200))"
            stopOpacity="0"
          />
        </linearGradient>
        <filter id={`${uid}b`} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="9" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="b2" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${uid}d`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line
        x1="0"
        x2={W}
        y1={edgeY}
        y2={edgeY}
        stroke="rgb(var(--glass-a, 245,163,200))"
        strokeOpacity=".35"
        strokeDasharray="5 7"
      />
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${uid}f)`} />
      <path
        className="sundome-arc-draw"
        d={d}
        fill="none"
        stroke={`url(#${uid}l)`}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#${uid}b)`}
      />

      {edges.map((edgeAt, idx) => (
        <g
          key={idx}
          className="sundome-arc-pop"
          style={{
            animationDelay: `${0.5 + 0.2 * idx}s`,
            transformOrigin: `${x(edgeAt)}px ${edgeY}px`,
          }}
          filter={`url(#${uid}d)`}
        >
          <circle cx={x(edgeAt)} cy={edgeY} r="4.5" fill="#fff" />
        </g>
      ))}

      {came && (
        <g
          className="sundome-arc-pop"
          style={{
            animationDelay: "2.2s",
            transformOrigin: `${endX}px ${heartY}px`,
          }}
          filter={`url(#${uid}d)`}
        >
          <path
            d={`M${endX},${heartY + 6.3} C${endX - 11.2},${heartY - 0.7} ${endX - 5.6},${heartY - 9.8} ${endX},${heartY - 3.5} C${endX + 5.6},${heartY - 9.8} ${endX + 11.2},${heartY - 0.7} ${endX},${heartY + 6.3}Z`}
            fill="#ffd1dc"
          />
        </g>
      )}

      {segs.map(([startAt, mode], idx) => {
        const nextAt = segs[idx + 1]?.[0] ?? end;
        return (
          <rect
            key={idx}
            x={x(startAt) + 1.2}
            y={H + 12}
            width={Math.max(1, x(nextAt) - x(startAt) - 2.4)}
            height="3.6"
            rx="1.8"
            fill={ARC_COLORS[mode]}
            fillOpacity=".8"
          />
        );
      })}

      <text
        x="0"
        y={H + 30}
        fill="currentColor"
        fillOpacity=".35"
        fontSize="11"
      >
        0:00
      </text>
      <text
        x={W}
        y={H + 30}
        textAnchor="end"
        fill="currentColor"
        fillOpacity=".35"
        fontSize="11"
      >
        {arcTime(end)}
      </text>
    </svg>
  );
}
