"use client";

import {
  Bookmark,
  Code2,
  FileText,
  GitBranch,
  MessageSquare,
  PanelsTopLeft,
  Terminal,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

type ChaosIcon = {
  Icon: LucideIcon;
  x: number;
  y: number;
};

const chaosIcons: ChaosIcon[] = [
  { Icon: Bookmark, x: 0.08, y: 0.12 },
  { Icon: GitBranch, x: 0.57, y: 0.07 },
  { Icon: MessageSquare, x: 0.31, y: 0.4 },
  { Icon: Code2, x: 0.77, y: 0.34 },
  { Icon: PanelsTopLeft, x: 0.06, y: 0.7 },
  { Icon: Terminal, x: 0.43, y: 0.7 },
  { Icon: FileText, x: 0.78, y: 0.69 },
  { Icon: Workflow, x: 0.22, y: 0.12 },
];

export function ChaosVisualizer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let pointer: { x: number; y: number } | null = null;
    let hoveredIcon: HTMLDivElement | null = null;
    let stageSize = { width: 0, height: 0 };
    let frame = 0;
    let lastTime = performance.now();
    const animationStartedAt = lastTime;

    const states = chaosIcons.flatMap((icon, index) => {
      const element = iconRefs.current[index];
      if (!element) return [];

      return [{
        element,
        phase: index * 0.86,
        size: element.getBoundingClientRect().width || 72,
        vx: (index % 2 ? 1 : -1) * (0.14 + index * 0.01),
        vy: (index % 3 ? 1 : -1) * (0.105 + index * 0.01),
        x: icon.x,
        y: icon.y,
      }];
    });

    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      stageSize = { width: bounds.width, height: bounds.height };
      states.forEach((state, index) => {
        state.size = state.element.getBoundingClientRect().width || 72;
        state.x = Math.min(
          state.x,
          Math.max(0, stageSize.width - state.size),
        );
        state.y = Math.min(
          state.y,
          Math.max(0, stageSize.height - state.size),
        );

        if (state.x <= 1 && state.y <= 1) {
          state.x = chaosIcons[index].x * Math.max(0, stageSize.width - state.size);
          state.y = chaosIcons[index].y * Math.max(0, stageSize.height - state.size);
        }

        // Percentage positions provide a no-JavaScript fallback. Once animation
        // begins, movement is driven entirely by pixel transforms.
        state.element.style.left = "0px";
        state.element.style.top = "0px";
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      hoveredIcon = (event.target as Element).closest<HTMLDivElement>("[data-chaos-icon]");
    };

    const onPointerLeave = () => {
      pointer = null;
      hoveredIcon = null;
    };

    const animate = (time: number) => {
      const delta = Math.min(2, (time - lastTime) / 16.67);
      const loadProgress = Math.min(1, (time - animationStartedAt) / 850);
      const loadEase = 1 - (1 - loadProgress) ** 3;
      lastTime = time;

      states.forEach((state, index) => {
        if (pointer) {
          const dx = state.x + state.size / 2 - pointer.x;
          const dy = state.y + state.size / 2 - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < 130) {
            const force = ((130 - distance) / 130) * 0.16;
            state.vx += (dx / distance) * force;
            state.vy += (dy / distance) * force;
          }
        }

        state.vx = Math.max(-0.45, Math.min(0.45, state.vx)) * 0.9995;
        state.vy = Math.max(-0.45, Math.min(0.45, state.vy)) * 0.9995;
        state.x += state.vx * delta;
        state.y += state.vy * delta;

        const maxX = Math.max(0, stageSize.width - state.size);
        const maxY = Math.max(0, stageSize.height - state.size);
        if (state.x <= 0 || state.x >= maxX) {
          state.x = Math.max(0, Math.min(maxX, state.x));
          state.vx *= -1;
        }
        if (state.y <= 0 || state.y >= maxY) {
          state.y = Math.max(0, Math.min(maxY, state.y));
          state.vy *= -1;
        }

        const wobble = Math.sin(time / 700 + state.phase);
        const hovered = state.element === hoveredIcon;
        const rotation = wobble * 5 + (hovered ? wobble * 7 : 0);
        const scale = 1 + Math.sin(time / 900 + state.phase) * 0.045 + (hovered ? 0.16 : 0);
        const startOffsetX = (index % 2 ? 1 : -1) * (10 + index * 2) * (1 - loadEase);
        const startOffsetY = (index % 3 ? 1 : -1) * (8 + index * 2) * (1 - loadEase);
        state.element.style.transform = `translate3d(${state.x + startOffsetX}px, ${state.y + startOffsetY}px, 0) rotate(${rotation}deg) scale(${scale})`;
      });

      frame = requestAnimationFrame(animate);
    };

    measure();
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", measure);
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      aria-label="Scattered developer tools"
      className="relative h-80 overflow-hidden rounded-xl border border-orange-200/25 bg-[radial-gradient(circle_at_40%_60%,rgba(115,64,60,.2),transparent_45%),#11131c] [background-image:radial-gradient(rgba(160,130,130,.23)_0.7px,transparent_0.8px)] [background-size:16px_16px] sm:h-[22rem]"
      ref={stageRef}
      role="img"
    >
      {chaosIcons.map(({ Icon, x, y }, index) => (
        <div
          aria-hidden="true"
          className="absolute grid size-16 place-items-center text-slate-200 grayscale sm:size-[4.5rem]"
          data-chaos-icon
          key={`${x}-${y}`}
          ref={(node) => {
            iconRefs.current[index] = node;
          }}
          style={{
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Icon className="size-8 stroke-[1.7] sm:size-10" />
        </div>
      ))}
    </div>
  );
}
