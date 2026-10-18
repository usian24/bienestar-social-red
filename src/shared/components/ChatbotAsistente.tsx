'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, User, RefreshCw, X, ChevronDown, MessageSquare, AlertCircle, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { puedeUsarChatbot } from '@/shared/utils/permisos';

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
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [estaMinimizado, setEstaMinimizado] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Inicializar mensaje de bienvenida según rol
  useEffect(() => {
    if (!tieneAcceso) return;
    const saludoInicial: MensajeChat = {
      id: 'saludo-1',
      remitente: 'asistente',
      texto: rol === 'TRABAJADOR'
        ? `¡Hola, ${nombreUsuario}! 👋 Soy **BienestarBot**, tu asistente para licencias médicas y descansos de la Red de Salud Huánuco. ¿En qué puedo orientarte hoy?`
        : `¡Hola, ${nombreUsuario}! 🏛️ Soy **BienestarBot**, asistente de Bienestar Social. Puedo buscar expedientes por DNI/nombre, revisar alertas de CITT y calcular subsidios.`,
      origen: 'gemini_flash_lite',
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMensajes([saludoInicial]);
  }, [tieneAcceso, rol, nombreUsuario]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [mensajes, cargando]);

  // Preguntas sugeridas según el rol
  const sugerencias = rol === 'TRABAJADOR' ? [
    '¿Cuántos días de descanso me quedan este año?',
    '¿Qué es la regla de los 20 días?',
    '¿Cómo tramito mi canje de CITT?'
  ] : [
    'Buscar expediente de DNI 74425510',
    '¿Qué alertas de CITT están vencidas o en rojo?',
    '¿Cómo funciona la regla de los 20 días?'
  ];

  const enviarMensaje = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando) return;

    const nuevoMsgUsuario: MensajeChat = {
      id: 'usr-' + Date.now(),
      remitente: 'usuario',
      texto,
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMensajes(prev => [...prev, nuevoMsgUsuario]);
    if (!textoAEnviar) setInputTexto('');
    setCargando(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          historial: mensajes.slice(-4)
        })
      });

      const data = await res.json();

      if (res.ok && data.respuesta) {
        setMensajes(prev => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
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
      setMensajes(prev => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          remitente: 'asistente',
          texto: 'Lo siento, ocurrió un problema al conectar con el asistente. Intenta de nuevo en unos momentos.',
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
    const saludoInicial: MensajeChat = {
      id: 'saludo-' + Date.now(),
      remitente: 'asistente',
      texto: `Conversación reiniciada. ¿En qué otra consulta puedo orientarte, ${nombreUsuario}?`,
      origen: 'gemini_flash_lite',
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMensajes([saludoInicial]);
  };

  // Renderizador simple de markdown (negritas y viñetas)
  const renderTextoFormateado = (txt: string) => {
    return txt.split('\n').map((linea, idx) => {
      // Reemplazo básico de **texto** por negrita
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

  // Si el usuario no tiene permisos para el chatbot, no renderizar nada
  if (!tieneAcceso) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 ${modo === 'flotante' ? 'w-[380px] h-[520px] fixed bottom-5 right-5 z-50 shadow-2xl' : 'w-full h-[520px]'}`}>
      
      {/* Cabecera del Bot */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-700 rounded-full animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm tracking-tight leading-none text-white">BienestarBot</h3>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-medium text-blue-100 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-300" /> Flash Lite
              </span>
            </div>
            <p className="text-[11px] text-blue-100/80 font-normal mt-0.5">Red de Salud Huánuco</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={reiniciarChat}
            title="Reiniciar chat"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {modo === 'flotante' && onCerrar && (
            <button
              onClick={onCerrar}
              title="Cerrar ventana"
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo de Mensajes */}
      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60 dark:bg-slate-900/40 text-[13px]">
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.remitente === 'usuario' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.remitente === 'asistente' && (
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-slate-700 dark:text-slate-200 ${
                msg.remitente === 'usuario'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{renderTextoFormateado(msg.texto)}</div>
              <div className={`text-[10px] mt-1 text-right font-medium ${msg.remitente === 'usuario' ? 'text-blue-200' : 'text-slate-400'}`}>
                {msg.fecha}
              </div>
            </div>

            {msg.remitente === 'usuario' && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200 dark:border-indigo-800">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {cargando && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Consultando normativa y expediente...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chips de Sugerencias Rápidas */}
      {mensajes.length <= 2 && (
        <div className="px-3 py-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-1.5 shrink-0">
          {sugerencias.map((sug, i) => (
            <button
              key={i}
              onClick={() => enviarMensaje(sug)}
              disabled={cargando}
              className="text-[11px] text-left bg-slate-100 hover:bg-blue-50 dark:bg-slate-700/60 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 px-2.5 py-1 rounded-full border border-slate-200/70 dark:border-slate-600 transition-all font-medium"
            >
              💡 {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input de Enviar Mensaje */}
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
            className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!inputTexto.trim() || cargando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-2.5 rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center shrink-0"
            title="Enviar pregunta"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Información protegida por Ley
          </span>
          <span>Red Huánuco © 2026</span>
        </div>
      </div>
    </div>
  );
}
