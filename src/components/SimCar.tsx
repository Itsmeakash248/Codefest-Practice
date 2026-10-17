"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { CarAction } from "@/lib/types";

export interface SimCarHandle {
  /** Drive the sim car; resolves when the move finishes. Failsafe stops it. */
  drive: (action: CarAction, speed: number, durationSec: number) => Promise<void>;
  estop: () => void;
}

const W = 520;
const H = 340;

interface Trail {
  x: number;
  y: number;
}

/**
 * Top-down simulated car. Moves on a grid; if no fresh command arrives
 * for FAILSAFE_MS the car stops itself (mirrors the ESP8266 firmware).
 */
const SimCar = forwardRef<SimCarHandle>(function SimCar(_, ref) {
  const [pos, setPos] = useState({ x: W / 2, y: H / 2, angle: -90 });
  const [moving, setMoving] = useState(false);
  const [lastCmd, setLastCmd] = useState<string>("S · stopped");
  const [trail, setTrail] = useState<Trail[]>([]);
  const state = useRef({ x: W / 2, y: H / 2, angle: -90, action: "S" as CarAction, speed: 0 });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFresh = useRef<number>(Date.now());
  const FAILSAFE_MS = 1500;

  // physics tick — 30fps
  useEffect(() => {
    timer.current = setInterval(() => {
      const s = state.current;
      // failsafe: no fresh command → stop
      if (s.action !== "S" && Date.now() - lastFresh.current > FAILSAFE_MS) {
        s.action = "S";
        s.speed = 0;
        setMoving(false);
        setLastCmd("S · failsafe stop (1.5s idle)");
      }
      if (s.action !== "S" && s.speed > 0) {
        const v = (s.speed / 255) * 3.2; // px per tick
        const rad = (s.angle * Math.PI) / 180;
        if (s.action === "F") {
          s.x += Math.cos(rad) * v;
          s.y += Math.sin(rad) * v;
        } else if (s.action === "B") {
          s.x -= Math.cos(rad) * v;
          s.y -= Math.sin(rad) * v;
        } else if (s.action === "L") {
          s.angle -= 3;
        } else if (s.action === "R") {
          s.angle += 3;
        }
        // walls
        s.x = Math.max(24, Math.min(W - 24, s.x));
        s.y = Math.max(24, Math.min(H - 24, s.y));
        setPos({ x: s.x, y: s.y, angle: s.angle });
        setTrail((t) => [...t.slice(-120), { x: s.x, y: s.y }]);
      }
    }, 33);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    drive(action, speed, durationSec) {
      return new Promise<void>((resolve) => {
        const s = state.current;
        s.action = action;
        s.speed = action === "S" ? 0 : speed;
        lastFresh.current = Date.now();
        setMoving(action !== "S");
        setLastCmd(
          `${action} · ${action === "S" ? "stopped" : `speed ${speed}`}`,
        );
        // keep-alive during the move, then stop (safe car-stop logic)
        const keep = setInterval(() => {
          lastFresh.current = Date.now();
        }, 400);
        setTimeout(() => {
          clearInterval(keep);
          s.action = "S";
          s.speed = 0;
          setMoving(false);
          setLastCmd("S · stopped (move complete)");
          resolve();
        }, Math.max(300, durationSec * 1000));
      });
    },
    estop() {
      state.current.action = "S";
      state.current.speed = 0;
      setMoving(false);
      setLastCmd("S · E-STOP");
    },
  }));

  const trailPath =
    trail.length > 1
      ? `M ${trail.map((t) => `${t.x.toFixed(1)} ${t.y.toFixed(1)}`).join(" L ")}`
      : "";

  return (
    <div className="rounded-3xl bg-[#2A1670] p-3 text-white">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs font-extrabold uppercase tracking-widest opacity-80">
          Simulated car
        </span>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            moving ? "bg-green-400 text-[#2A1670]" : "bg-white/20"
          }`}
        >
          {moving ? "● moving" : "○ idle"} · {lastCmd}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-2xl bg-[#1a1040]"
        role="img"
        aria-label="Simulated car arena"
      >
        {/* grid */}
        {Array.from({ length: 13 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 40}
            y1={0}
            x2={i * 40}
            y2={H}
            stroke="#ffffff"
            strokeOpacity={0.07}
          />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 40}
            x2={W}
            y2={i * 40}
            stroke="#ffffff"
            strokeOpacity={0.07}
          />
        ))}
        {trailPath && (
          <path
            d={trailPath}
            fill="none"
            stroke="#FFC83D"
            strokeWidth={3}
            strokeLinecap="round"
            strokeOpacity={0.8}
            strokeDasharray="8 6"
            style={{ animation: "fp-dash 1s linear infinite" }}
          />
        )}
        {/* car */}
        <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.angle + 90})`}>
          <rect x={-14} y={-22} width={28} height={44} rx={9} fill="#5B3CC4" />
          <rect x={-14} y={-22} width={28} height={16} rx={8} fill="#FF6B57" />
          <rect x={-9} y={-12} width={18} height={10} rx={3} fill="#E9E1FF" opacity={0.9} />
          <rect x={-18} y={-16} width={5} height={10} rx={2} fill="#0d0d0d" />
          <rect x={13} y={-16} width={5} height={10} rx={2} fill="#0d0d0d" />
          <rect x={-18} y={8} width={5} height={10} rx={2} fill="#0d0d0d" />
          <rect x={13} y={8} width={5} height={10} rx={2} fill="#0d0d0d" />
          {moving && (
            <circle cx={0} cy={-26} r={4} fill="#FFC83D">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      </svg>
      <p className="px-1 pt-2 text-[11px] opacity-70">
        Failsafe: stops if idle &gt; 1.5s — same rule as the ESP8266 firmware.
      </p>
    </div>
  );
});

export default SimCar;
