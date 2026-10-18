'use client';

import React from 'react';

interface BienestarMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  estado?: 'idle' | 'waving' | 'thinking' | 'talking';
  className?: string;
  onClick?: () => void;
}

export default function BienestarMascot({
  size = 'md',
  estado = 'idle',
  className = '',
  onClick
}: BienestarMascotProps) {
  // Tamaños en píxeles
  const sizeMap = {
    sm: 'w-9 h-9',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  return (
    <div 
      onClick={onClick}
      className={`relative select-none flex items-center justify-center ${sizeMap[size]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        animation: estado === 'thinking' ? 'mascotBounce 1s ease-in-out infinite' : 'mascotFloat 3.5s ease-in-out infinite'
      }}
    >
      <style jsx>{`
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes mascotBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-7px) scale(1.03); }
        }
        @keyframes mascotBlink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
        @keyframes mascotWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(18deg); }
          75% { transform: rotate(-14deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .mascot-eye {
          transform-origin: center;
          animation: mascotBlink 4s infinite;
        }
        .mascot-arm-wave {
          transform-origin: 22px 58px;
          animation: mascotWave 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Halo de resplandor suave de fondo */}
      <div 
        className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md pointer-events-none"
        style={{ animation: 'pulseGlow 3s ease-in-out infinite' }}
      />

      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-md overflow-visible"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antena / Auricular de Asistente Institucional */}
        <path d="M 50 18 L 50 11" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="50" cy="9" r="4.5" fill="#10B981" />
        <circle cx="50" cy="9" r="2.5" fill="#FFFFFF" />

        {/* Audífono / Diadema de atención */}
        <path d="M 23 37 Q 50 16 77 37" stroke="#0369A1" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="20" y="34" width="6" height="11" rx="3" fill="#0284C7" />
        <rect x="74" y="34" width="6" height="11" rx="3" fill="#0284C7" />

        {/* Cabeza del Personaje (Forma amigable y suave) */}
        <rect x="24" y="22" width="52" height="42" rx="20" fill="url(#headGradient)" stroke="#0284C7" strokeWidth="2.5" />

        {/* Pantallita / Rostro interior suave */}
        <rect x="29" y="27" width="42" height="32" rx="14" fill="#F0FDF4" />

        {/* Ojos Tiernos y Amigables con Pestañeo */}
        <g className="mascot-eye">
          <ellipse cx="40" cy="40" rx="4.5" ry="5.5" fill="#0F172A" />
          <circle cx="41.5" cy="38.5" r="1.8" fill="#FFFFFF" />
          <circle cx="39" cy="42" r="0.8" fill="#FFFFFF" />

          <ellipse cx="60" cy="40" rx="4.5" ry="5.5" fill="#0F172A" />
          <circle cx="61.5" cy="38.5" r="1.8" fill="#FFFFFF" />
          <circle cx="59" cy="42" r="0.8" fill="#FFFFFF" />
        </g>

        {/* Mejillas sonrojadas de empatía y calidez */}
        <circle cx="34" cy="46" r="3.2" fill="#F43F5E" opacity="0.45" />
        <circle cx="66" cy="46" r="3.2" fill="#F43F5E" opacity="0.45" />

        {/* Sonrisa Cálida */}
        {estado === 'thinking' ? (
          <ellipse cx="50" cy="48" rx="3.5" ry="2" fill="#0F172A" />
        ) : (
          <path d="M 44 47 Q 50 53 56 47" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        )}

        {/* Cuello y estetoscopio */}
        <path d="M 40 68 Q 50 72 60 68" stroke="#0284C7" strokeWidth="2.5" fill="none" />

        {/* Cuerpo / Bata de Salud Huánuco */}
        <path 
          d="M 28 67 Q 24 92 24 95 L 76 95 Q 76 92 72 67 Z" 
          fill="url(#coatGradient)" 
          stroke="#0284C7" 
          strokeWidth="2.5" 
        />

        {/* Solapa / Cuello de la bata */}
        <path d="M 40 67 L 50 81 L 60 67" stroke="#0284C7" strokeWidth="2" fill="#FFFFFF" />

        {/* Corazón / Escudo de Bienestar Social en el pecho */}
        <circle cx="50" cy="85" r="5" fill="#10B981" />
        <path d="M 50 82.5 L 50 87.5 M 47.5 85 L 52.5 85" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

        {/* Brazo Izquierdo (Saludando cordialmente) */}
        <g className={estado === 'waving' || estado === 'idle' ? 'mascot-arm-wave' : ''}>
          <path d="M 24 67 Q 12 55 18 47 Q 23 48 24 57" fill="#0284C7" stroke="#0369A1" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="17" cy="47" r="4.5" fill="#10B981" />
        </g>

        {/* Brazo Derecho (Sosteniendo tablilla de orientación) */}
        <path d="M 72 67 Q 83 75 80 85 Q 75 84 73 78" fill="#0284C7" stroke="#0369A1" strokeWidth="2" strokeLinejoin="round" />
        <rect x="76" y="73" width="9" height="13" rx="2" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.2" transform="rotate(8 76 73)" />
        <line x1="78" y1="77" x2="83" y2="78" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="78" y1="80" x2="83" y2="81" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
        <line x1="78" y1="83" x2="82" y2="84" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />

        {/* Definición de gradientes ricos */}
        <defs>
          <linearGradient id="headGradient" x1="24" y1="22" x2="76" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="0.7" stopColor="#F0F9FF" />
            <stop offset="1" stopColor="#E0F2FE" />
          </linearGradient>
          <linearGradient id="coatGradient" x1="24" y1="67" x2="76" y2="95" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="0.8" stopColor="#F1F5F9" />
            <stop offset="1" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
