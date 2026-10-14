import { useId } from "react";
import type { Seat } from "../types";
import { statusOf } from "../data";

const p = (x: number, y: number, z = 0) =>
  `${400 + (x - y) * 0.89},${77 + (x + y) * 0.43 - z}`;
function Box({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  colors,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  colors: string[];
}) {
  return (
    <g>
      <polygon
        points={`${p(x, y + d, z)} ${p(x + w, y + d, z)} ${p(x + w, y + d, z + h)} ${p(x, y + d, z + h)}`}
        fill={colors[1]}
      />
      <polygon
        points={`${p(x + w, y, z)} ${p(x + w, y + d, z)} ${p(x + w, y + d, z + h)} ${p(x + w, y, z + h)}`}
        fill={colors[2]}
      />
      <polygon
        points={`${p(x, y, z + h)} ${p(x + w, y, z + h)} ${p(x + w, y + d, z + h)} ${p(x, y + d, z + h)}`}
        fill={colors[0]}
      />
    </g>
  );
}
export const palette = [
  "#a1f6c6",
  "#c7b5ed",
  "#e7c18d",
  "#9acde1",
  "#a1f6c6",
  "#d4b7cc",
];
export function Avatar({ id, size = 40 }: { id: number; size?: number }) {
  const color = palette[id % palette.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="avatar"
    >
      <rect width="48" height="48" rx="13" fill={color} fillOpacity=".12" />
      <path d="M11 43v-7a13 13 0 0 1 26 0v7" fill={color} fillOpacity=".6" />
      <path d="M12 23c0-10 24-10 24 0v5c0 10-24 10-24 0z" fill={color} />
      <circle cx="17" cy="19" r="6" fill={color} />
      <circle cx="31" cy="19" r="6" fill={color} />
      <circle cx="18" cy="19" r="2" fill="#1b3027" />
      <circle cx="30" cy="19" r="2" fill="#1b3027" />
      <path
        d="M20 27q4 3 8 0"
        fill="none"
        stroke="#1b3027"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="m20 36 4 4 4-4" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
}
function Desk({
  x,
  y,
  color,
  active,
}: {
  x: number;
  y: number;
  color: string;
  active: boolean;
}) {
  const [cx, cy] = p(x + 29, y + 58, 40)
    .split(",")
    .map(Number);
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy + 36}
        rx="42"
        ry="14"
        fill="#0a1510"
        opacity=".3"
      />
      <Box
        x={x + 14}
        y={y + 47}
        z={9}
        w={31}
        d={27}
        h={7}
        colors={["#34423f", "#202c29", "#17251f"]}
      />
      <Box
        x={x + 27}
        y={y + 57}
        w={5}
        d={5}
        h={11}
        colors={["#55665d", "#29382e", "#1b2921"]}
      />

      <Box
        x={x}
        y={y}
        w={5}
        d={5}
        h={27}
        colors={["#6e877b", "#3a5145", "#263d30"]}
      />
      <Box
        x={x + 63}
        y={y + 34}
        w={5}
        d={5}
        h={27}
        colors={["#6e877b", "#3a5145", "#263d30"]}
      />
      <Box
        x={x}
        y={y + 34}
        w={5}
        d={5}
        h={27}
        colors={["#6e877b", "#3a5145", "#263d30"]}
      />
      <Box
        x={x - 3}
        y={y - 2}
        z={27}
        w={76}
        d={45}
        h={5}
        colors={["#a3b5a3", "#6f8671", "#4f6854"]}
      />
      <Box
        x={x + 25}
        y={y + 10}
        z={32}
        w={24}
        d={13}
        h={2}
        colors={["#364d43", "#213a2b", "#213a2b"]}
      />
      <Box
        x={x + 34}
        y={y + 13}
        z={34}
        w={4}
        d={4}
        h={6}
        colors={["#60766a", "#354d40", "#354d40"]}
      />
      <Box
        x={x + 15}
        y={y + 7}
        z={39}
        w={41}
        d={4}
        h={26}
        colors={["#496b58", "#1c3027", "#344e3e"]}
      />
      <polygon
        points={`${p(x + 18, y + 11.1, 42)} ${p(x + 53, y + 11.1, 42)} ${p(x + 53, y + 11.1, 62)} ${p(x + 18, y + 11.1, 62)}`}
        fill={active ? "#a1f6c6" : "#687f73"}
      />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={p(x + 22, y + 11.2, 57 - i * 5).split(",")[0]}
          y1={p(x + 22, y + 11.2, 57 - i * 5).split(",")[1]}
          x2={p(x + 41 - i * 4, y + 11.2, 57 - i * 5).split(",")[0]}
          y2={p(x + 41 - i * 4, y + 11.2, 57 - i * 5).split(",")[1]}
          stroke="#305d42"
          strokeWidth="1.5"
        />
      ))}
      <Box
        x={x + 19}
        y={y + 26}
        z={32}
        w={35}
        d={10}
        h={1.5}
        colors={["#d1ddd0", "#819785", "#819785"]}
      />
      <g transform={`translate(${cx},${cy})`}>
        <path d="M-18 17q0-19 18-19t18 19v12h-36z" fill={color} />
        <path d="M-17 12v15h8V7" fill="#000" opacity=".16" />
        <ellipse cx="1" cy="-7" rx="23" ry="19" fill={color} />
        <circle cx="-11" cy="-20" r="10" fill={color} />
        <circle cx="13" cy="-20" r="10" fill={color} />
        <ellipse cx="-9" cy="-21" rx="4.5" ry="5" fill="#f0fff5" />
        <ellipse cx="15" cy="-21" rx="4.5" ry="5" fill="#f0fff5" />
        <ellipse cx="-8" cy="-20" rx="2" ry="3" fill="#183328" />
        <ellipse cx="16" cy="-20" rx="2" ry="3" fill="#183328" />
        <path
          d="M-8-5q10 7 20-1"
          stroke="#234936"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="-14" cy="-7" rx="4" ry="2" fill="#fff" opacity=".2" />
        <path
          d="m-5 12 6 5 7-5"
          stroke="#fff"
          strokeWidth="2"
          opacity=".5"
          fill="none"
        />
      </g>
    </g>
  );
}
const positions = [
  [30, 38],
  [140, 38],
  [250, 38],
  [30, 153],
  [140, 153],
  [250, 153],
];
export default function Office({
  agents,
  onSelect,
}: {
  agents: Seat[];
  onSelect: (id: number) => void;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <div className="office-scene">
      <svg className="office-art" viewBox="0 0 800 390" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}glow`}>
            <stop stopColor="#a1f6c6" stopOpacity=".1" />
            <stop offset="1" stopColor="#a1f6c6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx="410"
          cy="225"
          rx="370"
          ry="160"
          fill={`url(#${uid}glow)`}
        />
        <ellipse cx="420" cy="277" rx="270" ry="75" fill="#000" opacity=".18" />
        <Box
          x={-8}
          y={-8}
          z={-14}
          w={370}
          d={278}
          h={14}
          colors={["#34473d", "#1e3026", "#263c2e"]}
        />
        <polygon
          points={`${p(-8, -8)} ${p(362, -8)} ${p(362, 270)} ${p(-8, 270)}`}
          fill="none"
          stroke="#6f947b"
          strokeWidth="1"
        />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={i}
            d={`M${p(i * 55, -8)}L${p(i * 55, 270)}M${p(-8, i * 45)}L${p(362, i * 45)}`}
            stroke="#506453"
            strokeWidth=".6"
            opacity=".5"
          />
        ))}
        <Box
          x={-8}
          y={-8}
          w={370}
          d={7}
          h={51}
          colors={["#648270", "#3e5949", "#2a4435"]}
        />
        <Box
          x={-8}
          y={-8}
          w={7}
          d={278}
          h={51}
          colors={["#648270", "#496253", "#34503d"]}
        />
        <Box
          x={12}
          y={1}
          z={12}
          w={110}
          d={3}
          h={32}
          colors={["#294133", "#192b22", "#294133"]}
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M${p(23 + i * 18, 4.1, 19)}L${p(23 + i * 18, 4.1, 29 + (i % 3) * 4)}`}
            stroke="#a1f6c6"
            strokeWidth="5"
            opacity=".7"
          />
        ))}
        <Box
          x={295}
          y={3}
          z={12}
          w={48}
          d={3}
          h={30}
          colors={["#b4c3ab", "#b4c3ab", "#738a74"]}
        />
        <path
          d={`M${p(307, 6.1, 30)}L${p(330, 6.1, 30)}M${p(307, 6.1, 23)}L${p(323, 6.1, 23)}`}
          stroke="#466a50"
          strokeWidth="3"
        />
        {positions.map(([x, y], i) => (
          <Desk
            key={i}
            x={x}
            y={y}
            color={
              agents[i]
                ? palette[agents[i].tokenId % palette.length]
                : "#687b6c"
            }
            active={Boolean(agents[i]?.working)}
          />
        ))}
        <Box
          x={337}
          y={226}
          w={18}
          d={18}
          h={23}
          colors={["#b5ba9c", "#929e7b", "#667a59"]}
        />
        <g
          transform={`translate(${p(346, 235, 28)})`}
          stroke="#82b38d"
          strokeWidth="3"
        >
          <path d="M0 0v-38M0-12l-15-15M0-20l14-16" />
          <ellipse
            cx="-12"
            cy="-28"
            rx="9"
            ry="17"
            fill="#8ecb9d"
            stroke="none"
            transform="rotate(-35 -12 -28)"
          />
          <ellipse
            cx="12"
            cy="-38"
            rx="9"
            ry="15"
            fill="#689f77"
            stroke="none"
            transform="rotate(35 12 -38)"
          />
          <ellipse
            cx="0"
            cy="-48"
            rx="8"
            ry="16"
            fill="#a7d6a7"
            stroke="none"
          />
        </g>
      </svg>
      {agents.map((agent, index) => {
        const [x, y] = positions[index];
        const [left, top] = p(x + 29, y + 58, 89)
          .split(",")
          .map(Number);
        return (
          <button
            type="button"
            key={agent.tokenId}
            className="agent-pin"
            style={{ left: `${left / 8}%`, top: `${(top - 7) / 3.9}%` }}
            onClick={() => onSelect(agent.tokenId)}
            aria-label={`View Agent #${agent.tokenId}, ${statusOf(agent)}`}
          >
            <span className={`dot ${agent.working ? "mint" : "gray"}`} />
            <span>#{agent.tokenId}</span>
          </button>
        );
      })}
    </div>
  );
}
