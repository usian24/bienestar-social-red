'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, RefreshCw, X, MessageCircle, ShieldCheck, User, ArrowLeft, HeartPulse, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { puedeUsarChatbot } from '@/shared/utils/permisos';
import BienestarMascot from './BienestarMascot';

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
  const [modalMovilAbierto, setModalMovilAbierto] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DE BURBUJA FLOTANTE MÓVIL ARRASTRABLE Y MAGNÉTICA ---
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

    const BUBBLE_SIZE = 56;
    const MARGIN_BOTTOM = 86;
    const MARGIN_SIDE = 14;

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

  // Manejadores globales en window mientras se arrastra (evita pérdidas de puntero y errores de releasePointerCapture)
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
        const BUBBLE_SIZE = 56;
        const MARGIN_TOP = 70;
        const MARGIN_BOTTOM = 86;

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
        // Fin de arrastre: efecto imán magnético hacia el lateral más cercano (izq o der)
        setPosicionBurbuja(prev => {
          if (!prev) return null;
          const BUBBLE_SIZE = 56;
          const MARGIN_SIDE = 12;
          const MARGIN_TOP = 70;
          const MARGIN_BOTTOM = 86;

          const centroX = prev.x + BUBBLE_SIZE / 2;
          const pantallaMitad = window.innerWidth / 2;
          const snapX = centroX < pantallaMitad ? MARGIN_SIDE : window.innerWidth - BUBBLE_SIZE - MARGIN_SIDE;

          const clampedY = Math.min(
            Math.max(MARGIN_TOP, prev.y),
            window.innerHeight - MARGIN_BOTTOM - BUBBLE_SIZE
          );

          return { x: snapX, y: clampedY };
        });

        // Prevenir que el evento click nativo subsecuente abra el modal
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

  // Saludo inicial derivado sin efectos ni mutaciones síncronas
  const mensajesMostrados = useMemo<MensajeChat[]>(() => {
    if (!tieneAcceso) return mensajes;
    const saludoInicial: MensajeChat = {
      id: textoReset ? 'saludo-reset' : 'saludo-1',
      remitente: 'asistente',
      texto:
        textoReset ??
        (rol === 'TRABAJADOR'
          ? `¡Hola, ${nombreUsuario}! Soy **BienestarBot**, tu orientador institucional de la Red de Salud Huánuco. Puedo ayudarte a consultar tus descansos médicos, saldo de días acumulados, requisitos de canje de CITT y subsidios. ¿En qué te oriento hoy?`
          : `¡Hola, ${nombreUsuario}! Bienvenido al área de Bienestar Social. Como asistente de la Red de Salud Huánuco, puedo ayudarte a buscar expedientes por DNI/nombre, revisar alertas críticas de CITT y calcular subsidios EsSalud.`),
      fecha: 'Ahora',
    };
    return [saludoInicial, ...mensajes];
  }, [tieneAcceso, rol, nombreUsuario, textoReset, mensajes]);

  // Auto-scroll al final en ambos contenedores (desktop y móvil)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    if (mobileChatContainerRef.current) {
      mobileChatContainerRef.current.scrollTop = mobileChatContainerRef.current.scrollHeight;
    }
  }, [mensajesMostrados, cargando, modalMovilAbierto]);

  // Preguntas sugeridas contextuales según el rol
  const sugerencias = rol === 'TRABAJADOR' ? [
    '¿A qué sede y microred pertenezco?',
    '¿Cuántos días de descanso me quedan este año?',
    '¿Cómo funciona la regla de los 20 días?',
    '¿Cuáles son los pasos para canjear mi CITT?'
  ] : [
    '¿A qué microred y sede pertenezco?',
    'Buscar expediente por DNI',
    '¿Qué alertas de CITT están vencidas o en rojo?',
    '¿Cómo funciona la regla de los 20 días?'
  ];

  const msgSeqRef = useRef(0);

  const enviarMensaje = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando) return;

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
        msgSeqRef.current += 1;
        const botSeq = msgSeqRef.current;
        setMensajes(prev => [
          ...prev,
          {
            id: `bot-${botSeq}`,
            remitente: 'asistente',
            texto: data.respuesta,
            origen: data.origen,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(data.error || 'Respuesta vacía');
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      msgSeqRef.current += 1;
      const errSeq = msgSeqRef.current;
      setMensajes(prev => [
        ...prev,
        {
          id: `bot-err-${errSeq}`,
          remitente: 'asistente',
          texto: 'Disculpa el inconveniente, hubo un breve retraso al consultar los registros. Por favor, reintenta tu pregunta en unos segundos.',
          origen: 'error',
          fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const reiniciarChat = () => {
    setTextoReset(`Conversación reiniciada. Con gusto puedo orientarte con otra consulta, ${nombreUsuario}.`);
    setMensajes([]);
  };

  // Renderizador amigable de markdown (negritas y viñetas)
  const renderTextoFormateado = (txt: string) => {
    return txt.split('\n').map((linea, idx) => {
      const partes = linea.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={idx} className="block leading-relaxed">
          {partes.map((parte, pIdx) => {
            if (parte.startsWith('**') && parte.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">{parte.slice(2, -2)}</strong>;
            }
            return parte;
          })}
        </span>
      );
    });
  };

  if (!tieneAcceso) {
    return null;
  }

  // CONTENIDO REUTILIZABLE DE LA CONVERSACIÓN
  const renderListaMensajes = (refContenedor: React.RefObject<HTMLDivElement | null>) => (
    <div ref={refContenedor} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/80 dark:bg-slate-900/60 text-[13px]">
      {mensajesMostrados.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-start gap-2.5 ${msg.remitente === 'usuario' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.remitente === 'asistente' && (
            <div className="shrink-0 mt-0.5">
              <BienestarMascot size="sm" estado={cargando ? 'thinking' : 'idle'} />
            </div>
          )}

          <div
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-slate-800 dark:text-slate-100 ${
              msg.remitente === 'usuario'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-tl-none'
            }`}
          >
            <div className="whitespace-pre-wrap">{renderTextoFormateado(msg.texto)}</div>
            <div className={`text-[10px] mt-1 text-right font-medium ${msg.remitente === 'usuario' ? 'text-blue-100' : 'text-slate-400'}`}>
              {msg.fecha}
            </div>
          </div>

          {msg.remitente === 'usuario' && (
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-700 shadow-xs">
              <User className="w-4 h-4" />
            </div>
          )}
        </div>
      ))}

      {cargando && (
        <div className="flex items-start gap-2.5 justify-start">
          <div className="shrink-0 mt-0.5">
            <BienestarMascot size="sm" estado="thinking" />
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium ml-1">Revisando expediente y normativa...</span>
          </div>
        </div>
      )}
    </div>
  );

  // BARRA DE INPUT Y SUGERENCIAS
  const renderInputForm = () => (
    <>
      {/* Sugerencias Rápidas */}
      {mensajesMostrados.length <= 2 && (
        <div className="px-3 py-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-1.5 shrink-0">
          {sugerencias.map((sug, i) => (
            <button
              key={i}
              onClick={() => enviarMensaje(sug)}
              disabled={cargando}
              className="text-[11px] text-left bg-slate-100/90 hover:bg-emerald-50 dark:bg-slate-700/60 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-600 transition-all font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{sug}</span>
            </button>
          ))}
        </div>
      )}

      {/* Formulario de Entrada */}
      <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviarMensaje();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregúntale a BienestarBot..."
            disabled={cargando}
            className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!inputTexto.trim() || cargando}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-2.5 rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
            title="Enviar consulta"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Orientación oficial protegida
          </span>
          <span>Red de Salud Huánuco</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. VISTA EN CELULAR / PANTALLAS PEQUEÑAS (md:hidden)
          Muestra el personaje animado interactivo. Al tocarlo abre el chat completo. */}
      <div className="block md:hidden w-full">
        <div 
          onClick={() => setModalMovilAbierto(true)}
          className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50/40 to-blue-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border border-emerald-200/80 dark:border-slate-700 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
        >
          {/* Adorno decorativo de fondo */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-4">
            {/* Personaje Animado Saludando */}
            <div className="shrink-0 relative">
              <BienestarMascot size="lg" estado="waving" />
              <span className="absolute bottom-0 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse" />
            </div>

            {/* Bocadillo de Texto de Bienvenida */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold tracking-wide uppercase mb-1">
                <HeartPulse className="w-3 h-3 text-emerald-600" /> Asistente de Bienestar
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                ¡Hola! Soy BienestarBot
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                Tócame aquí para consultar tus descansos médicos, subsidios o el estado de tus trámites.
              </p>

              {/* Botón de Llamada a la Acción */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tocar para hablar conmigo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botón flotante del personaje móvil: Arrastrable y con magnetismo al borde más cercano */}
        {!modalMovilAbierto && (
          <div 
            ref={bubbleRef}
            onPointerDown={handleBubblePointerDown}
            onClick={() => {
              if (!ignoreClickRef.current) {
                setModalMovilAbierto(true);
              }
            }}
            style={posicionBurbuja ? {
              left: `${posicionBurbuja.x}px`,
              top: `${posicionBurbuja.y}px`,
              transition: arrastrandoBurbuja 
                ? 'none' 
                : 'left 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28), top 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28), transform 0.15s ease',
              touchAction: 'none'
            } : {
              right: '14px',
              bottom: '86px',
              touchAction: 'none'
            }}
            className={`fixed z-40 flex items-center select-none cursor-grab active:cursor-grabbing transition-transform ${
              arrastrandoBurbuja ? 'scale-110 z-50' : 'hover:scale-105 active:scale-95'
            }`}
            title="Arrastra para mover o toca para consultar con BienestarBot"
          >
            <div className={`relative p-2 bg-white dark:bg-slate-800 rounded-full shadow-2xl border-2 transition-all duration-200 ${
              arrastrandoBurbuja 
                ? 'border-emerald-500 shadow-emerald-500/40 shadow-xl' 
                : 'border-emerald-400 shadow-lg'
            }`}>
              <BienestarMascot size="sm" estado={arrastrandoBurbuja ? 'thinking' : 'waving'} />
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full animate-ping" />
            </div>
          </div>
        )}
      </div>

      {/*  2. MODAL A PANTALLA COMPLETA EN CELULAR (Cuando el usuario toca el personaje) */}
      {modalMovilAbierto && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4">
          <div className="w-full h-full sm:h-[88vh] sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
            
            {/* Cabecera Móvil con el Personaje */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalMovilAbierto(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg active:bg-white/10 cursor-pointer"
                  title="Volver"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="shrink-0">
                  <BienestarMascot size="sm" estado={cargando ? 'thinking' : 'waving'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">BienestarBot</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En línea
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">Red de Salud Huánuco</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={reiniciarChat}
                  title="Reiniciar chat"
                  className="p-2 text-slate-300 hover:text-white rounded-lg active:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setModalMovilAbierto(false)}
                  title="Cerrar ventana"
                  className="p-2 text-slate-300 hover:text-white rounded-lg active:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mensajes en Móvil */}
            {renderListaMensajes(mobileChatContainerRef)}

            {/* Input en Móvil */}
            {renderInputForm()}
          </div>
        </div>
      )}

      {/* 3. VISTA EN ESCRITORIO / TABLETS (hidden md:flex) Se integra con estilo institucional pulcro en la columna derecha. */}
      <div className={`hidden md:flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md flex-col overflow-hidden transition-all duration-300 ${modo === 'flotante' ? 'w-[380px] h-[520px] fixed bottom-5 right-5 z-50 shadow-2xl' : 'w-full h-[520px]'}`}>
        
        {/* Cabecera Institucional en Escritorio */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="shrink-0 relative">
              <BienestarMascot size="sm" estado={cargando ? 'thinking' : 'idle'} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight leading-none text-white">BienestarBot</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Orientación
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-normal mt-0.5">Asistente de Bienestar Social</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={reiniciarChat}
              title="Reiniciar conversación"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {modo === 'flotante' && onCerrar && (
              <button
                onClick={onCerrar}
                title="Cerrar ventana"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Mensajes en Escritorio */}
        {renderListaMensajes(chatContainerRef)}

        {/* Input en Escritorio */}
        {renderInputForm()}
      </div>
    </>
  );
}
