'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, RotateCcw, X, ArrowUp, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { puedeUsarChatbot } from '@/shared/utils/permisos';
import { NeuralOrb, OrbState } from './NeuralOrb';

interface MensajeChat {
  id: string;
  remitente: 'usuario' | 'asistente';
  texto: string;
  origen?: string;
  fecha: string;
}

interface ChatbotAsistenteProps {
  modo?: 'tarjeta' | 'flotante';
  onCerrar?: () => void;
}

export default function ChatbotAsistente({ modo = 'tarjeta', onCerrar }: ChatbotAsistenteProps) {
  const { data: session } = useSession();
  const rol = (session?.user as any)?.rol;
  const permisos = (session?.user as any)?.permisos || [];
  const tieneAcceso = puedeUsarChatbot(rol, permisos);

  const nombreUsuario = (session?.user?.name || 'Servidor').split(' ')[0];

  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [textoReset, setTextoReset] = useState<string | null>(null);
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [statusText, setStatusText] = useState('En espera');
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalMovilAbierto, setModalMovilAbierto] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const expandedChatContainerRef = useRef<HTMLDivElement>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<number | null>(null);
  const msgSeqRef = useRef(0);

  const detenerStream = () => {
    if (streamIntervalRef.current !== null) {
      window.clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current !== null) {
        window.clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  // --- LÓGICA DE ORBE FLOTANTE MÓVIL ARRASTRABLE Y MAGNÉTICO ---
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [posicionBurbuja, setPosicionBurbuja] = useState<{ x: number; y: number } | null>(null);
  const [arrastrandoBurbuja, setArrastrandoBurbuja] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);
  const ignoreClickRef = useRef(false);

  // Adaptación de posición al redimensionar pantalla (sin setState síncrono al montar)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const BUBBLE_SIZE = 64;
    const MARGIN_BOTTOM = 84;
    const MARGIN_SIDE = 12;

    const handleResize = () => {
      setPosicionBurbuja(prev => {
        if (!prev) return null;
        const maxX = window.innerWidth - BUBBLE_SIZE - MARGIN_SIDE;
        const maxY = window.innerHeight - MARGIN_BOTTOM - BUBBLE_SIZE;
        const snapX = prev.x > window.innerWidth / 2 ? maxX : MARGIN_SIDE;
        const snapY = Math.min(Math.max(70, prev.y), maxY);
        return { x: snapX, y: snapY };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBubblePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    let initialX = posicionBurbuja?.x;
    let initialY = posicionBurbuja?.y;
    if (initialX === undefined || initialY === undefined) {
      const rect = bubbleRef.current?.getBoundingClientRect();
      if (!rect) return;
      initialX = rect.left;
      initialY = rect.top;
    }

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
      hasMoved: false,
    };
    setArrastrandoBurbuja(true);
  };

  // Manejadores globales en window mientras se arrastra (evita pérdidas de puntero en WebView Android)
  useEffect(() => {
    if (!arrastrandoBurbuja) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      if (!dragStartRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 6) {
        dragStartRef.current.hasMoved = true;
        ignoreClickRef.current = true;
      }

      if (dragStartRef.current.hasMoved) {
        const BUBBLE_SIZE = 64;
        const MARGIN_TOP = 70;
        const MARGIN_BOTTOM = 84;

        const currentX = Math.min(
          Math.max(4, dragStartRef.current.initialX + deltaX),
          window.innerWidth - BUBBLE_SIZE - 4
        );
        const currentY = Math.min(
          Math.max(MARGIN_TOP, dragStartRef.current.initialY + deltaY),
          window.innerHeight - MARGIN_BOTTOM - BUBBLE_SIZE
        );

        setPosicionBurbuja({ x: currentX, y: currentY });
      }
    };

    const handlePointerUp = () => {
      if (!dragStartRef.current) return;
      const { hasMoved } = dragStartRef.current;
      dragStartRef.current = null;
      setArrastrandoBurbuja(false);

      if (hasMoved) {
        setPosicionBurbuja(prev => {
          if (!prev) return null;
          const BUBBLE_SIZE = 64;
          const MARGIN_SIDE = 10;
          const MARGIN_TOP = 70;
          const MARGIN_BOTTOM = 84;

          const centroX = prev.x + BUBBLE_SIZE / 2;
          const pantallaMitad = window.innerWidth / 2;
          const snapX = centroX < pantallaMitad ? MARGIN_SIDE : window.innerWidth - BUBBLE_SIZE - MARGIN_SIDE;

          const clampedY = Math.min(
            Math.max(MARGIN_TOP, prev.y),
            window.innerHeight - MARGIN_BOTTOM - BUBBLE_SIZE
          );

          return { x: snapX, y: clampedY };
        });

        setTimeout(() => {
          ignoreClickRef.current = false;
        }, 150);
      } else {
        ignoreClickRef.current = false;
        setModalMovilAbierto(true);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [arrastrandoBurbuja]);

  // Saludo inicial derivado de sesión sin efectos síncronos
  const mensajesMostrados = useMemo<MensajeChat[]>(() => {
    if (!tieneAcceso) return mensajes;
    const saludoInicial: MensajeChat = {
      id: textoReset ? 'saludo-reset' : 'saludo-1',
      remitente: 'asistente',
      texto:
        textoReset ??
        (rol === 'TRABAJADOR'
          ? `Hola, **${nombreUsuario}**. Bienvenido a la **Mesa de Orientación** de Bienestar Social. Puedo informarte sobre tus descansos médicos, saldo anual de cobertura, requisitos de canje CITT y subsidios.`
          : `Hola, **${nombreUsuario}**. Mesa de consulta institucional de **Bienestar Social**. Puedo apoyarte ubicando expedientes por DNI o nombre, revisando alertas de canje CITT y verificando subsidios EsSalud.`),
      fecha: 'Ahora',
    };
    return [saludoInicial, ...mensajes];
  }, [tieneAcceso, rol, nombreUsuario, textoReset, mensajes]);

  // Auto-scroll en las vistas activas
  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    expandedChatContainerRef.current?.scrollTo({ top: expandedChatContainerRef.current.scrollHeight, behavior: 'smooth' });
    mobileChatContainerRef.current?.scrollTo({ top: mobileChatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajesMostrados, cargando, isExpanded, modalMovilAbierto]);

  // Consultas sugeridas contextuales según rol
  const sugerencias = rol === 'TRABAJADOR' ? [
    '¿A qué sede y microred pertenezco?',
    '¿Cuántos días de descanso me quedan este año?',
    '¿Cómo funciona la regla de los 20 días?',
    '¿Cuáles son los pasos para canjear mi CITT?'
  ] : [
    '¿A qué microred y sede pertenezco?',
    'Buscar expediente por DNI',
    '¿Qué alertas de CITT están vencidas?',
    '¿Cómo funciona la regla de los 20 días?'
  ];

  const iniciarStreamingRespuesta = (fullResponse: string, origen?: string) => {
    detenerStream();
    msgSeqRef.current += 1;
    const botId = `bot-${msgSeqRef.current}`;
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setOrbState('speaking');
    setStatusText('Respondiendo');

    // Para respuestas breves o si prefieren lectura instantánea sin corte visual
    setMensajes(prev => [
      ...prev,
      {
        id: botId,
        remitente: 'asistente',
        texto: '',
        origen,
        fecha: hora,
      },
    ]);

    const step = Math.max(5, Math.ceil(fullResponse.length / 42));
    let currentIndex = 0;

    streamIntervalRef.current = window.setInterval(() => {
      currentIndex += step;
      if (currentIndex >= fullResponse.length) {
        detenerStream();
        setMensajes(prev =>
          prev.map(m => (m.id === botId ? { ...m, texto: fullResponse } : m))
        );
        setOrbState('idle');
        setStatusText('En espera');
      } else {
        const parcial = fullResponse.slice(0, currentIndex);
        setMensajes(prev =>
          prev.map(m => (m.id === botId ? { ...m, texto: parcial } : m))
        );
      }
    }, 24);
  };

  const enviarMensaje = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando || orbState === 'speaking') return;

    detenerStream();
    msgSeqRef.current += 1;
    const seq = msgSeqRef.current;
    const ahoraLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const nuevoMsgUsuario: MensajeChat = {
      id: `usr-${seq}`,
      remitente: 'usuario',
      texto,
      fecha: ahoraLabel
    };

    const historialPrevio = mensajesMostrados.slice(-4);
    setMensajes(prev => [...prev, nuevoMsgUsuario]);
    if (!textoAEnviar) setInputTexto('');
    setCargando(true);
    setOrbState('thinking');
    setStatusText('Consultando');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          historial: historialPrevio
        })
      });

      const data = await res.json();

      if (res.ok && data.respuesta) {
        setCargando(false);
        iniciarStreamingRespuesta(data.respuesta, data.origen);
      } else {
        throw new Error(data.error || 'Respuesta vacía');
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      detenerStream();
      setCargando(false);
      msgSeqRef.current += 1;
      const errSeq = msgSeqRef.current;
      setMensajes(prev => [
        ...prev,
        {
          id: `bot-err-${errSeq}`,
          remitente: 'asistente',
          texto: 'Hubo un breve retraso al consultar los registros institucionales. Por favor, intenta nuevamente en unos segundos.',
          origen: 'error',
          fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setOrbState('idle');
      setStatusText('En espera');
    }
  };

  const reiniciarChat = () => {
    detenerStream();
    setCargando(false);
    setOrbState('idle');
    setStatusText('En espera');
    setTextoReset(`Consulta reiniciada. Indícame qué expediente, plazo o normativa necesitas revisar, ${nombreUsuario}.`);
    setMensajes([]);
  };

  // Renderizador declarativo seguro: convierte primero viñetas (* / -) en • antes de negritas y cursivas
  const renderInlineMarkdown = (textoLinea: string, esUsuario: boolean) => {
    const bloquesNegrita = textoLinea.split(/(\*\*[^\n]+?\*\*)/g);
    return bloquesNegrita.map((bloque, bIdx) => {
      if (bloque.startsWith('**') && bloque.endsWith('**') && bloque.length > 4) {
        return (
          <strong
            key={bIdx}
            className={
              esUsuario
                ? 'font-semibold text-white'
                : 'font-semibold text-[#1d1d1f] dark:text-white'
            }
          >
            {bloque.slice(2, -2)}
          </strong>
        );
      }
      const subPartes = bloque.split(/(\*[^\s*\n][^*\n]*?[^\s*\n]\*|\*[^\s*\n]\*)/g);
      return subPartes.map((sub, sIdx) => {
        if (sub.startsWith('*') && sub.endsWith('*') && sub.length >= 3) {
          return (
            <em key={`${bIdx}-${sIdx}`} className="italic opacity-90">
              {sub.slice(1, -1)}
            </em>
          );
        }
        return sub;
      });
    });
  };

  const renderTextoFormateado = (txt: string, esUsuario = false) => {
    return txt.split('\n').map((lineaRaw, idx) => {
      const lineaNormalizada = lineaRaw.replace(/^\s*[-*]\s+/, '• ');
      return (
        <span key={idx} className="block leading-relaxed">
          {renderInlineMarkdown(lineaNormalizada, esUsuario)}
        </span>
      );
    });
  };

  if (!tieneAcceso) {
    return null;
  }

  // CABECERA MINIMALISTA CON ORBE VIVO INTEGRADO
  const renderHeader = (variante: 'compacto' | 'expandido' | 'movil') => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-slate-800 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {variante === 'movil' && (
          <button
            type="button"
            onClick={() => setModalMovilAbierto(false)}
            title="Volver"
            className="p-1.5 -ml-1 text-[#86868b] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="shrink-0">
          <NeuralOrb
            state={orbState}
            size={36}
            paused={
              (variante === 'compacto' && (isExpanded || modalMovilAbierto)) ||
              (variante === 'expandido' && !isExpanded) ||
              (variante === 'movil' && !modalMovilAbierto)
            }
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1d1d1f] dark:text-white truncate">
              Orientación Bienestar
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <p className="text-[10px] text-[#86868b] dark:text-slate-400 truncate">
            {statusText} · Red de Salud Huánuco
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={reiniciarChat}
          title="Reiniciar chat"
          className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {variante !== 'movil' && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Reducir' : 'Agrandar'}
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {variante === 'movil' && (
          <button
            type="button"
            onClick={() => setModalMovilAbierto(false)}
            title="Cerrar"
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {variante === 'expandido' && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            title="Cerrar vista ampliada"
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {variante === 'compacto' && modo === 'flotante' && onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar"
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  // LISTA DE MENSAJES ESTILO MINIMALISTA
  const renderListaMensajes = (refContenedor: React.RefObject<HTMLDivElement | null>) => (
    <div
      ref={refContenedor}
      className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-white dark:bg-slate-900 scroll-smooth"
    >
      {mensajesMostrados.map((msg) => {
        const esUsuario = msg.remitente === 'usuario';
        return (
          <div
            key={msg.id}
            className={`flex flex-col animate-chat-enter ${
              esUsuario ? 'items-end' : 'items-start'
            }`}
          >
            <span className="text-[10px] text-[#86868b] dark:text-slate-400 mb-1 px-1">
              {esUsuario ? 'Tú' : 'Bienestar Social'} · {msg.fecha}
            </span>
            <div
              className={`text-[13px] leading-relaxed max-w-[86%] rounded-2xl px-4 py-2.5 shadow-2xs ${
                esUsuario
                  ? 'bg-[#0071e3] dark:bg-blue-600 text-white rounded-br-sm'
                  : 'bg-[#f5f5f7] dark:bg-slate-800 text-[#1d1d1f] dark:text-slate-100 rounded-bl-sm border border-black/[0.04] dark:border-slate-700/70'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {renderTextoFormateado(msg.texto, esUsuario)}
              </div>
            </div>
          </div>
        );
      })}

      {cargando && (
        <div className="flex flex-col items-start space-y-1 animate-chat-enter">
          <span className="text-[10px] text-[#86868b] dark:text-slate-400 px-1">
            Bienestar Social
          </span>
          <div className="flex items-center gap-2 bg-[#f5f5f7] dark:bg-slate-800 text-[#86868b] dark:text-slate-300 px-3.5 py-2 rounded-2xl text-xs rounded-bl-sm border border-black/[0.04] dark:border-slate-700/70">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#86868b] dark:bg-slate-400 rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-[#86868b] dark:bg-slate-400 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-[#86868b] dark:bg-slate-400 rounded-full animate-pulse [animation-delay:300ms]" />
            </span>
            <span>Consultando registros...</span>
          </div>
        </div>
      )}
    </div>
  );

  // DOCK INFERIOR CON SUGERENCIAS E INPUT PILL
  const renderInputDock = () => (
    <div className="border-t border-black/[0.05] dark:border-slate-800 bg-[#fafafc] dark:bg-slate-900/95 shrink-0">
      {mensajesMostrados.length <= 2 && (
        <div className="px-3.5 pt-2.5 pb-1 flex flex-wrap gap-1.5">
          {sugerencias.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => enviarMensaje(sug)}
              disabled={cargando || orbState === 'speaking'}
              className="text-[11px] text-left bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#1d1d1f] dark:hover:text-white px-2.5 py-1 rounded-full border border-black/[0.07] dark:border-slate-700 transition-colors font-medium cursor-pointer disabled:opacity-50"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      <div className="p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviarMensaje();
          }}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full border border-black/[0.08] dark:border-slate-700 px-3.5 py-1.5 focus-within:border-black/20 dark:focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-black/[0.03] transition-all"
        >
          <input
            type="text"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            placeholder={
              rol === 'TRABAJADOR'
                ? 'Consulta tus descansos, CITT o subsidios...'
                : 'Consulta por DNI, nombre o normativa...'
            }
            disabled={cargando || orbState === 'speaking'}
            className="flex-1 text-xs sm:text-[13px] bg-transparent outline-none text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] dark:placeholder:text-slate-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputTexto.trim() || cargando || orbState === 'speaking'}
            title="Enviar consulta"
            className="w-7 h-7 rounded-full bg-[#1d1d1f] dark:bg-white text-white dark:text-slate-900 flex items-center justify-center disabled:opacity-20 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 px-2 text-[10px] text-[#86868b] dark:text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Ley N° 29733 · Uso interno
          </span>
          <span>Red de Salud Huánuco</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. VISTA EN CELULAR / PANTALLAS PEQUEÑAS (md:hidden) */}
      <div className="block md:hidden w-full print:hidden">
        <div
          onClick={() => setModalMovilAbierto(true)}
          className="bg-white/95 dark:bg-slate-900 border border-black/[0.08] dark:border-slate-800 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <NeuralOrb state={orbState} size={50} paused={modalMovilAbierto} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-[#1d1d1f] dark:text-white text-sm truncate">
                    Orientación Bienestar
                  </h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <p className="text-xs text-[#86868b] dark:text-slate-400 mt-0.5 line-clamp-1">
                  Toca para consultar expedientes, CITT o subsidios
                </p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-[#1d1d1f] dark:text-white bg-[#f5f5f7] dark:bg-slate-800 px-3 py-1.5 rounded-full border border-black/[0.06] dark:border-slate-700 shrink-0">
              Abrir
            </span>
          </div>
        </div>

        {/* Orbe flotante arrastrable y magnético encima de la barra inferior móvil */}
        {!modalMovilAbierto && (
          <div
            ref={bubbleRef}
            onPointerDown={handleBubblePointerDown}
            onClick={() => {
              if (!ignoreClickRef.current) {
                setModalMovilAbierto(true);
              }
            }}
            style={
              posicionBurbuja
                ? {
                    left: `${posicionBurbuja.x}px`,
                    top: `${posicionBurbuja.y}px`,
                    transition: arrastrandoBurbuja
                      ? 'none'
                      : 'left 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28), top 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28), transform 0.15s ease',
                    touchAction: 'none',
                  }
                : {
                    right: '10px',
                    bottom: '84px',
                    touchAction: 'none',
                  }
            }
            className={`fixed z-40 flex items-center justify-center select-none cursor-grab active:cursor-grabbing transition-transform ${
              arrastrandoBurbuja ? 'scale-110 z-50' : 'hover:scale-110 active:scale-95'
            }`}
            title="Arrastra para mover o toca para abrir Orientación Bienestar"
          >
            <div className="relative flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-[0_8px_28px_-6px_rgba(79,70,229,0.32)] ring-1 ring-black/[0.06] dark:ring-white/15 p-0.5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-200/50 via-pink-200/40 to-amber-100/50 blur-lg opacity-85 pointer-events-none" />
              <div className="animate-bounce-slow relative">
                <NeuralOrb state={arrastrandoBurbuja ? 'thinking' : orbState} size={60} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. MODAL FULLSCREEN EN CELULAR (Portal en body por encima de barra inferior) */}
      {modalMovilAbierto &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[70] md:hidden bg-black/40 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4">
            <div className="w-full h-full sm:h-[88vh] sm:max-w-lg bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-black/[0.08] dark:border-slate-800">
              {renderHeader('movil')}
              {renderListaMensajes(mobileChatContainerRef)}
              {renderInputDock()}
            </div>
          </div>,
          document.body
        )}

      {/* 3. VISTA COMPACTA EN ESCRITORIO / TABLETS (hidden md:flex) */}
      <div
        className={`hidden md:flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-black/[0.08] dark:border-slate-800 rounded-3xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.08)] flex-col overflow-hidden transition-all duration-300 print:hidden ${
          modo === 'flotante'
            ? 'w-[390px] h-[540px] fixed bottom-5 right-5 z-50 shadow-2xl'
            : 'w-full h-[540px]'
        }`}
      >
        {renderHeader('compacto')}
        {renderListaMensajes(chatContainerRef)}
        {renderInputDock()}
      </div>

      {/* 4. MODO EXPANDIDO WIDESCREEN EN ESCRITORIO (Portal con Orbe grande 280px a la izquierda) */}
      {isExpanded &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="hidden md:flex fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm items-center justify-center p-6 lg:p-10">
            <div className="w-full max-w-5xl h-[86vh] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] dark:border-slate-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden">
              {renderHeader('expandido')}

              <div className="flex-1 flex overflow-hidden">
                {/* Lado Izquierdo: Orbe Matemático Grande */}
                <div className="w-[44%] lg:w-1/2 flex flex-col items-center justify-center border-r border-black/[0.05] dark:border-slate-800 bg-[#fafafc]/80 dark:bg-slate-950/60 p-8 relative">
                  <NeuralOrb state={orbState} size={280} />
                  <p className="mt-8 text-xs font-medium tracking-widest uppercase text-[#86868b] dark:text-slate-400">
                    {orbState === 'thinking'
                      ? 'Analizando expediente...'
                      : orbState === 'speaking'
                      ? 'Transmitiendo orientación'
                      : 'Sistema en espera'}
                  </p>
                </div>

                {/* Lado Derecho: Conversación + Dock */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                  {renderListaMensajes(expandedChatContainerRef)}
                  {renderInputDock()}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
