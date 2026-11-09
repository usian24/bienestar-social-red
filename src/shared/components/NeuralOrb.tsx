'use client';

import React, { useEffect, useRef } from 'react';

export type OrbState = 'idle' | 'thinking' | 'speaking';

interface NeuralOrbProps {
  state?: OrbState;
  size?: number;
  paused?: boolean;
  className?: string;
}

const ORB_LAYERS = [
  { rRatio: 0.76, speed: 0.022, r: 255, g: 110, b: 180, a: 0.48 },
  { rRatio: 0.70, speed: 0.017, r: 120, g: 140, b: 255, a: 0.52 },
  { rRatio: 0.64, speed: 0.026, r: 255, g: 180, b: 80, a: 0.45 },
  { rRatio: 0.56, speed: 0.019, r: 90, g: 215, b: 235, a: 0.55 },
  { rRatio: 0.44, speed: 0.031, r: 200, g: 130, b: 255, a: 0.60 },
] as const;

export const NeuralOrb: React.FC<NeuralOrbProps> = ({
  state = 'idle',
  size = 72,
  paused = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<OrbState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let t = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const render = () => {
      if (
        (typeof document !== 'undefined' && document.hidden) ||
        canvas.getBoundingClientRect().width === 0
      ) {
        animationFrameId = window.requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = size / 2;
      const cy = size / 2;
      const baseR = (size / 2) * 0.72;

      // Modulación dinámica por estado
      let speedMult = 1.0;
      let ampMult = 1.0;
      const currentState = stateRef.current;

      if (currentState === 'thinking') {
        speedMult = 2.4;
        ampMult = 1.55;
      } else if (currentState === 'speaking') {
        speedMult = 1.6;
        ampMult = 1.25;
      }

      t += 0.016 * speedMult;

      // Aura luminosa sutil (visible también en modo oscuro)
      const aura = ctx.createRadialGradient(cx, cy, baseR * 0.08, cx, cy, baseR * 1.35);
      aura.addColorStop(0, 'rgba(235, 242, 255, 0.85)');
      aura.addColorStop(0.5, 'rgba(255, 225, 238, 0.35)');
      aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Capas armónicas de color orgánico
      ORB_LAYERS.forEach((layer, idx) => {
        ctx.save();
        ctx.beginPath();

        const points = 36;
        const angleStep = (Math.PI * 2) / points;
        const phase = t * layer.speed * 40 + idx * 1.3;

        for (let i = 0; i <= points; i++) {
          const theta = i * angleStep;
          const noise =
            Math.sin(theta * 3 + phase) * 0.18 +
            Math.cos(theta * 2 - phase * 0.8) * 0.14 +
            Math.sin(theta * 5 + phase * 1.4) * 0.08;

          const currentR = baseR * layer.rRatio * (1 + noise * ampMult);
          const px = cx + Math.cos(theta) * currentR;
          const py = cy + Math.sin(theta) * currentR;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        ctx.closePath();

        const grad = ctx.createRadialGradient(
          cx + Math.cos(phase) * (baseR * 0.14),
          cy + Math.sin(phase) * (baseR * 0.14),
          baseR * 0.06,
          cx,
          cy,
          baseR * layer.rRatio * 1.15
        );
        grad.addColorStop(0, `rgba(${layer.r}, ${layer.g}, ${layer.b}, ${Math.min(layer.a * 1.2, 0.92)})`);
        grad.addColorStop(0.72, `rgba(${layer.r}, ${layer.g}, ${layer.b}, ${layer.a * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fill();
        ctx.restore();
      });

      // Reflejo especular blanco puro superior
      const specular = ctx.createRadialGradient(
        cx - baseR * 0.22,
        cy - baseR * 0.25,
        Math.max(1, baseR * 0.04),
        cx,
        cy,
        baseR * 0.75
      );
      specular.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      specular.addColorStop(0.35, 'rgba(255, 255, 255, 0.25)');
      specular.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = specular;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [size, paused]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      aria-hidden="true"
      className={`select-none pointer-events-none ${className}`}
    />
  );
};

export default NeuralOrb;
