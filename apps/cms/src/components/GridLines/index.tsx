"use client";

import { useEffect, useRef } from "react";

import type { BackdropTone } from "@/components/utils";
import { cn } from "@/components/utils";

const DOT_SPACING_PX = 50;
const POINTER_FALLOFF_RADIUS_PX = 160;
const POINTER_SMOOTHING = 0.16;
const BRIGHTEN_SPEED = 0.18;
const DIM_SPEED = 0.08;
const IDLE_BRIGHTNESS_EPSILON = 0.01;
const LIT_RGB = "45, 212, 191";

const REST_ALPHA = {
  dark: { dot: 0.11, line: 0.07 },
  light: { dot: 0.17, line: 0.11 },
} as const;
const PEAK_ALPHA = { dot: 0.66, line: 0.5 };

interface GridLinesProps {
  tone?: BackdropTone;
  className?: string;
}

export function GridLines({ tone = "dark", className }: GridLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rest = REST_ALPHA[tone];
    const restChannel = tone === "dark" ? "255, 255, 255" : "10, 19, 20";
    let rafId = 0;
    let cols = 0;
    let rows = 0;
    let brightness = new Float32Array(0);
    const pointer = { active: false, smoothedX: 0, smoothedY: 0, x: 0, y: 0 };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * DOT_SPACING_PX;
          const y = row * DOT_SPACING_PX;
          const lit = brightness[row * cols + col] ?? 0;
          const isLit = lit > 0.02;
          const channel = isLit ? LIT_RGB : restChannel;
          const lineAlpha = rest.line + (PEAK_ALPHA.line - rest.line) * lit;
          const dotAlpha = rest.dot + (PEAK_ALPHA.dot - rest.dot) * lit;

          ctx.strokeStyle = `rgba(${channel}, ${lineAlpha})`;
          ctx.beginPath();
          if (col < cols - 1) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + DOT_SPACING_PX, y);
          }
          if (row < rows - 1) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + DOT_SPACING_PX);
          }
          ctx.stroke();

          ctx.fillStyle = `rgba(${channel}, ${dotAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = () => {
      pointer.smoothedX += (pointer.x - pointer.smoothedX) * POINTER_SMOOTHING;
      pointer.smoothedY += (pointer.y - pointer.smoothedY) * POINTER_SMOOTHING;
      let maxBrightness = 0;
      const radiusSq = POINTER_FALLOFF_RADIUS_PX * POINTER_FALLOFF_RADIUS_PX;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const dx = col * DOT_SPACING_PX - pointer.smoothedX;
          const dy = row * DOT_SPACING_PX - pointer.smoothedY;
          const target = pointer.active ? Math.exp(-(dx * dx + dy * dy) / radiusSq) : 0;
          const index = row * cols + col;
          const current = brightness[index] ?? 0;
          const speed = target > current ? BRIGHTEN_SPEED : DIM_SPEED;
          const next = current + (target - current) * speed;
          brightness[index] = next;
          maxBrightness = Math.max(maxBrightness, next);
        }
      }
      draw();
      rafId =
        pointer.active || maxBrightness > IDLE_BRIGHTNESS_EPSILON ? requestAnimationFrame(tick) : 0;
    };

    const startLoop = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const handleMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      startLoop();
    };

    const handleLeave = () => {
      pointer.active = false;
      startLoop();
    };

    const resize = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      cols = Math.ceil(width / DOT_SPACING_PX) + 1;
      rows = Math.ceil(height / DOT_SPACING_PX) + 1;
      brightness = new Float32Array(cols * rows);
      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    if (!reduceMotion) {
      parent.addEventListener("pointermove", handleMove);
      parent.addEventListener("pointerleave", handleLeave);
    }

    return () => {
      observer.disconnect();
      parent.removeEventListener("pointermove", handleMove);
      parent.removeEventListener("pointerleave", handleLeave);
      cancelAnimationFrame(rafId);
    };
  }, [tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full [mask-image:radial-gradient(ellipse_at_center,#fff_35%,transparent_78%)]",
        className
      )}
    />
  );
}
