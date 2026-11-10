'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Play, Video, BookOpen, ExternalLink, Maximize2, X, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { useBackHandler } from '@/shared/utils/appBackHandler';

interface VideoGuiaCardProps {
  titulo?: string;
  subtitulo?: string;
  videoSrc?: string; // Ruta local /videos/... o URL externa
  posterSrc?: string;
}

export default function VideoGuiaCard({
  titulo = "Video Guía: Uso del Sistema",
  subtitulo = "Tutorial oficial paso a paso sobre el registro de descansos médicos, regla de 20 días y subsidios.",
  videoSrc = "/videos/tutorial-bienestar-social.mp4",
  posterSrc = "/images/logo-red-huanuco.png"
}: VideoGuiaCardProps) {
  const { data: session } = useSession();
  const rol = (session?.user as any)?.rol;
  const isSuperAdmin = rol === 'SUPER_ADMIN';

  const rutaManual = isSuperAdmin
    ? '/manuales/Manual_Usuario_Super_Admin_RedSaludHco.pdf'
    : '/manuales/Manual_Usuario_Admin_Microred_RedSaludHco.pdf';

  const textoManual = isSuperAdmin
    ? 'Descargar Manual Super Admin (PDF)'
    : 'Descargar Manual Microred (PDF)';

  const [modalAbierto, setModalAbierto] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  useBackHandler(modalAbierto, () => setModalAbierto(false));
  const [videoUrl, setVideoUrl] = useState(videoSrc);
  const [mostrarConfigUrl, setMostrarConfigUrl] = useState(false);

  const capitulos = [
    { tiempo: "0:00", titulo: "Inicio y Dashboard", desc: "Navegación general y roles" },
    { tiempo: "1:30", titulo: "Registro de Descansos", desc: "CITT médicos y evidencias" },
    { tiempo: "3:15", titulo: "Regla de los 20 Días", desc: "Días empleador vs EsSalud" },
    { tiempo: "4:45", titulo: "Semáforo y Reportes", desc: "Alertas y exportación Excel/PDF" },
  ];

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300">
        {/* Encabezado */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight flex items-center gap-1.5">
                {titulo}
                <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-semibold uppercase">
                  HD
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Capacitación Institucional</p>
            </div>
          </div>

          <button
            onClick={() => setModalAbierto(true)}
            title="Ver en pantalla completa"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Reproductor de Video / Carátula Interactiva */}
        <div className="relative aspect-video bg-slate-900 group overflow-hidden">
          {reproduciendo ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              onError={() => {
                alert("No se encontró el archivo de video en " + videoUrl + ". Puedes colocar tu video en la carpeta public/videos/ o configurar una URL de YouTube.");
                setReproduciendo(false);
              }}
            >
              Tu navegador no soporta el formato de video.
            </video>
          ) : (
            <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
              {/* Patrón de fondo geométrico decorativo */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#4a72fa_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* Logotipo con resplandor */}
              <div className="relative z-10 mb-3 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-blue-600/20 backdrop-blur-md border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Video className="w-7 h-7" />
                </div>
              </div>

              {/* Botón Central Play Gigante */}
              <button
                onClick={() => setReproduciendo(true)}
                className="relative z-10 w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 hover:scale-110 active:scale-95 transition-all duration-200 group-hover:ring-8 ring-red-500/20 mb-3"
                title="Reproducir Video Tutorial"
              >
                <Play className="w-6 h-6 ml-0.5 fill-current" />
              </button>

              <div className="relative z-10">
                <h4 className="text-white font-bold text-sm">Ver Video Tutorial del Sistema</h4>
                <p className="text-slate-400 text-xs mt-0.5 max-w-[260px] line-clamp-1">
                  Guía completa de licencias y subsidios
                </p>
              </div>

              {/* Insignia de Duración */}
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 border border-white/10">
                <Clock className="w-3 h-3 text-red-400" /> 6:15 min
              </div>
            </div>
          )}
        </div>

        {/* Contenido descriptivo y Capítulos */}
        <div className="p-4 space-y-3.5">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {subtitulo}
          </p>

          {/* Lista de Capítulos Rápidos */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Temas del Tutorial:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {capitulos.map((c, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 rounded-lg p-2 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1 rounded">
                      {c.tiempo}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {c.titulo}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones al pie: Manual PDF según el Rol + Opción de cambiar video */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
            <a
              href={rutaManual}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 transition-colors"
              title={textoManual}
            >
              <BookOpen className="w-3.5 h-3.5" /> {textoManual} <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => setMostrarConfigUrl(!mostrarConfigUrl)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {mostrarConfigUrl ? "Ocultar URL" : "Cambiar Video"}
            </button>
          </div>

          {/* Selector de URL en caso quieran apuntar a otro video */}
          {mostrarConfigUrl && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 mt-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                Ruta o Enlace del Video (MP4 o link):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="/videos/mi-tutorial.mp4 o https://..."
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-white"
                />
                <button
                  onClick={() => {
                    setReproduciendo(true);
                    setMostrarConfigUrl(false);
                  }}
                  className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Cargar
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Tip: Puedes colocar tu archivo .mp4 dentro de la carpeta <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">public/videos/</code>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pantalla Completa / Cine */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm tracking-tight">{titulo}</h3>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black">
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
                onError={() => {
                  alert("No se encontró el archivo de video en " + videoUrl);
                  setModalAbierto(false);
                }}
              >
                Tu navegador no soporta el formato de video.
              </video>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-slate-300 text-xs flex justify-between items-center">
              <span>Red de Salud Huánuco — Módulo de Bienestar Social</span>
              <button
                onClick={() => setModalAbierto(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                Cerrar Reproductor
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
