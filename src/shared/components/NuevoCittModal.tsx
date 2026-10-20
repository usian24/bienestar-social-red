'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Search, CheckCircle2, AlertCircle, Camera, Upload, 
  Loader2, Check, FileText, Scan, RefreshCw, Image as ImageIcon,
  Zap, RotateCw, Sparkles, Stethoscope, UserCheck
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { tienePermiso } from '@/shared/utils/permisos';

interface NuevoCittModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dni?: string) => void;
  tipoPorDefecto?: 'ENFERMEDAD_COMUN' | 'MATERNIDAD' | 'PATERNIDAD';
  editData?: any; // Datos de la licencia a editar
  trabajadorFijo?: any; // Si ya sabemos de qué trabajador es
}

export default function NuevoCittModal({ 
  isOpen, onClose, onSuccess, tipoPorDefecto = 'ENFERMEDAD_COMUN', editData, trabajadorFijo 
}: NuevoCittModalProps) {
  const { data: session } = useSession();
  const rol = (session?.user as any)?.rol || 'CONSULTA';
  const permisos = (session?.user as any)?.permisos || [];
  const puedeSubirArchivo = tienePermiso(permisos, rol, 'SUBIR_ARCHIVOS');

  // Pestaña activa: 'manual' o 'escaner' (estilo Reportes)
  const [tabActiva, setTabActiva] = useState<'manual' | 'escaner'>('manual');

  // Estados del Buscador de Trabajador
  const [busqueda, setBusqueda] = useState('');
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<any | null>(null);
  const [buscando, setBuscando] = useState(false);

  // Estados del Formulario del CITT
  const [origen, setOrigen] = useState('ESSALUD_CITT');
  const [numeroCertificado, setNumeroCertificado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [diasOtorgados, setDiasOtorgados] = useState('');
  const [medico, setMedico] = useState('');
  const [colegiatura, setColegiatura] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState('Guardando descanso médico...');
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [archivoRutaServidor, setArchivoRutaServidor] = useState<string | null>(null);

  // Estados para Escáner y Cámara Inteligente
  const [fotoCapturadaPreview, setFotoCapturadaPreview] = useState<string | null>(null);
  const [previewUrlManual, setPreviewUrlManual] = useState<string | null>(null);
  const [optimizandoFoto, setOptimizandoFoto] = useState(false);
  const [mostrarCamaraWebRTC, setMostrarCamaraWebRTC] = useState(false);
  const [errorCamara, setErrorCamara] = useState('');
  const [escaneandoIA, setEscaneandoIA] = useState(false);
  const [pasoEscaneoIndex, setPasoEscaneoIndex] = useState(0);
  const [orientacionMarco, setOrientacionMarco] = useState<'horizontal' | 'vertical'>('horizontal');
  const [linternaEncendida, setLinternaEncendida] = useState(false);
  const [soportaLinterna, setSoportaLinterna] = useState(false);
  const [resumenEscaneo, setResumenEscaneo] = useState<{
    dni?: string;
    numeroCertificado?: string;
    origen?: string;
    fechaInicio?: string;
    fechaFin?: string;
    diasOtorgados?: number;
    medico?: string;
    colegiatura?: string;
    diagnostico?: string;
    tipoLicencia?: string;
    trabajadorNombre?: string;
    encontradoEnBD?: boolean;
    previewUrl?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const guideBoxRef = useRef<HTMLDivElement>(null);
  const inputCamaraNativaRef = useRef<HTMLInputElement>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputCamaraManualRef = useRef<HTMLInputElement>(null);
  const inputEvidenciaManualRef = useRef<HTMLInputElement>(null);

  // Inicializar o limpiar datos al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setTabActiva('manual');
        setOrigen(editData.origen);
        setNumeroCertificado(editData.numeroCertificado);
        const fecha = new Date(editData.fechaInicio);
        setFechaInicio(fecha.toISOString().split('T')[0]);
        setDiasOtorgados(editData.diasOtorgados.toString());
        setArchivoRutaServidor(editData.archivoRuta || null);
        setMedico((editData as any).medico || '');
        setColegiatura((editData as any).colegiatura || '');
        setDiagnostico((editData as any).diagnostico || '');
      } else {
        setTabActiva('manual');
        setOrigen('ESSALUD_CITT');
        setNumeroCertificado('');
        setFechaInicio('');
        setDiasOtorgados('');
        setMedico('');
        setColegiatura('');
        setDiagnostico('');
        setArchivoAdjunto(null);
        setArchivoRutaServidor(null);
        if (previewUrlManual) {
          URL.revokeObjectURL(previewUrlManual);
          setPreviewUrlManual(null);
        }
      }

      if (trabajadorFijo) {
        setTrabajadorSeleccionado(trabajadorFijo);
      } else if (!editData) {
        setTrabajadorSeleccionado(null);
      }
      setError('');
      setResumenEscaneo(null);
      setFotoCapturadaPreview(null);
    } else {
      detenerCamara();
      setFotoCapturadaPreview(null);
      if (previewUrlManual) {
        URL.revokeObjectURL(previewUrlManual);
        setPreviewUrlManual(null);
      }
    }
  }, [isOpen, editData, trabajadorFijo]);

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  // Limpiar cámara al cambiar de pestaña
  useEffect(() => {
    if (tabActiva !== 'escaner') {
      detenerCamara();
    }
  }, [tabActiva]);

  // Asegurar reproducción del video al montarse el visor
  useEffect(() => {
    if (mostrarCamaraWebRTC && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn('Error reproduciendo stream de video:', e));
    }
  }, [mostrarCamaraWebRTC]);

  // Buscar trabajador cuando escriben el DNI o Nombre
  useEffect(() => {
    const delay = setTimeout(async () => {
      const q = busqueda.trim();
      if (q.length >= 2 && !trabajadorSeleccionado) {
        setBuscando(true);
        try {
          const res = await fetch(`/api/trabajadores/buscar?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          setTrabajadores(Array.isArray(data) ? data : (data.trabajadores || []));
        } catch (e) {
          console.error(e);
        } finally {
          setBuscando(false);
        }
      } else {
        setTrabajadores([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [busqueda, trabajadorSeleccionado]);

  // --- COMPRESIÓN CLIENT-SIDE DE IMÁGENES (Subida ultrarrápida y ahorro de datos móviles) ---
  const comprimirImagen = async (archivo: File, maxDimension = 1920, calidad = 0.82): Promise<File> => {
    if (!archivo.type.startsWith('image/')) {
      return archivo;
    }
    if (archivo.type === 'image/svg+xml' || archivo.type === 'image/gif') {
      return archivo;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(archivo);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (!width || !height) {
          resolve(archivo);
          return;
        }

        // Si la foto supera la dimensión máxima, redimensionar manteniendo proporción
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(archivo);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(archivo);
              return;
            }
            // Si la compresión resultó más pesada que el original, mantener original
            if (blob.size >= archivo.size) {
              resolve(archivo);
              return;
            }
            const nombreBase = archivo.name.replace(/\.[^/.]+$/, "");
            const archivoComprimido = new File([blob], `${nombreBase}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(archivoComprimido);
          },
          'image/jpeg',
          calidad
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(archivo);
      };

      img.src = objectUrl;
    });
  };

  // --- MANEJO SEGURO DE CÁMARA (Compatible con móvil, escritorio, HTTP y HTTPS) ---
  const activarCamaraOSelector = () => {
    const soporteWebRTC = typeof window !== 'undefined' && 
                          typeof navigator !== 'undefined' && 
                          Boolean(navigator.mediaDevices?.getUserMedia);

    if (soporteWebRTC) {
      iniciarCamara();
    } else {
      // Si el navegador no tiene getUserMedia (por ej. en IP HTTP de red local), abre la cámara nativa del celular
      inputCamaraNativaRef.current?.click();
    }
  };

  const iniciarCamara = async () => {
    try {
      setErrorCamara('');
      if (!navigator.mediaDevices?.getUserMedia) {
        inputCamaraNativaRef.current?.click();
        return;
      }

      setMostrarCamaraWebRTC(true);
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      // Verificar soporte de linterna en el sensor de cámara
      const track = stream.getVideoTracks()[0];
      const capabilities = (track as any)?.getCapabilities?.();
      if (capabilities && 'torch' in capabilities) {
        setSoportaLinterna(true);
      } else {
        setSoportaLinterna(false);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Error al iniciar video:', e));
      }
    } catch (err: any) {
      console.warn('WebRTC no disponible, utilizando cámara del sistema:', err);
      setMostrarCamaraWebRTC(false);
      inputCamaraNativaRef.current?.click();
    }
  };

  const toggleLinterna = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nuevoEstado = !linternaEncendida;
      await (track as any).applyConstraints({
        advanced: [{ torch: nuevoEstado }]
      });
      setLinternaEncendida(nuevoEstado);
    } catch (e) {
      console.warn('No se pudo alternar la linterna:', e);
    }
  };

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    setMostrarCamaraWebRTC(false);
    setLinternaEncendida(false);
    setErrorCamara('');
  };

  // Escaneo y recorte de alta precisión al documento encuadrado
  const escanearDocumento = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const container = scannerContainerRef.current;
    const frame = guideBoxRef.current;

    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    let sx = 0;
    let sy = 0;
    let sw = vWidth;
    let sh = vHeight;

    // Calcular exactamente la región delimitada por el cuadro guía en pantalla
    if (container && frame) {
      const cRect = container.getBoundingClientRect();
      const fRect = frame.getBoundingClientRect();

      const frameLeft = fRect.left - cRect.left;
      const frameTop = fRect.top - cRect.top;
      const frameWidth = fRect.width;
      const frameHeight = fRect.height;

      const containerRatio = cRect.width / cRect.height;
      const videoRatio = vWidth / vHeight;

      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (videoRatio > containerRatio) {
        scale = vHeight / cRect.height;
        const renderedWidth = vWidth / scale;
        offsetX = (renderedWidth - cRect.width) / 2;
      } else {
        scale = vWidth / cRect.width;
        const renderedHeight = vHeight / scale;
        offsetY = (renderedHeight - cRect.height) / 2;
      }

      sx = (frameLeft + offsetX) * scale;
      sy = (frameTop + offsetY) * scale;
      sw = frameWidth * scale;
      sh = frameHeight * scale;

      // Margen de seguridad del 4% para asegurar que los bordes del papel y sellos queden intactos
      const marginX = sw * 0.04;
      const marginY = sh * 0.04;

      sx = Math.max(0, sx - marginX);
      sy = Math.max(0, sy - marginY);
      sw = Math.min(vWidth - sx, sw + marginX * 2);
      sh = Math.min(vHeight - sy, sh + marginY * 2);
    }

    const canvas = document.createElement('canvas');
    if (sw > 80 && sh > 80) {
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // Fallback a cuadro completo
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `citt-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      detenerCamara();
      iniciarEscaneoDesdeArchivo(file);
    }, 'image/jpeg', 0.92);
  };

  // --- PASOS DINÁMICOS DE ESCANEO IA ---
  const pasosEscaneo = [
    { texto: 'Optimizando resolución y nitidez de la fotografía...', porcentaje: 25, badge: 'Paso 1/4' },
    { texto: 'Analizando certificado con Inteligencia Artificial...', porcentaje: 52, badge: 'Paso 2/4' },
    { texto: 'Extrayendo N° Certificado CITT, fechas y CMP...', porcentaje: 78, badge: 'Paso 3/4' },
    { texto: 'Identificando diagnóstico CIE-10 y cruzando con la BD...', porcentaje: 92, badge: 'Paso 4/4' },
  ];

  // Progresión secuencial automática para dar feedback en tiempo real al usuario
  useEffect(() => {
    if (!escaneandoIA) {
      setPasoEscaneoIndex(0);
      return;
    }
    const t1 = setTimeout(() => setPasoEscaneoIndex(1), 2200);
    const t2 = setTimeout(() => setPasoEscaneoIndex(2), 5500);
    const t3 = setTimeout(() => setPasoEscaneoIndex(3), 9500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [escaneandoIA]);

  // Iniciar escaneo inmediatamente con feedback visual instantáneo (fondito de espera inmediato)
  const iniciarEscaneoDesdeArchivo = async (archivoSeleccionado: File) => {
    setTabActiva('escaner');
    setEscaneandoIA(true);
    setPasoEscaneoIndex(0);
    setError('');
    setResumenEscaneo(null);

    // Crear preview de inmediato para que la pantalla con escáner láser aparezca al instante
    let previewTemp: string | null = null;
    if (archivoSeleccionado.type.startsWith('image/')) {
      previewTemp = URL.createObjectURL(archivoSeleccionado);
      setFotoCapturadaPreview(previewTemp);
      setPreviewUrlManual(previewTemp);
    } else {
      setFotoCapturadaPreview(null);
    }
    setArchivoAdjunto(archivoSeleccionado);
    setArchivoRutaServidor(null);

    try {
      let archivoAEnviar = archivoSeleccionado;
      if (archivoSeleccionado.type.startsWith('image/')) {
        archivoAEnviar = await comprimirImagen(archivoSeleccionado);
        setArchivoAdjunto(archivoAEnviar);
      }
      await procesarArchivoCitt(archivoAEnviar, previewTemp);
    } catch (err: any) {
      console.error('Error preparando imagen:', err);
      setError('No se pudo procesar el archivo seleccionado.');
      setEscaneandoIA(false);
    }
  };

  // --- PROCESAMIENTO DEL CITT CON VISIÓN COMPUTACIONAL ---
  const procesarArchivoCitt = async (archivo: File, previewExistente?: string | null) => {
    setEscaneandoIA(true);
    setError('');
    setResumenEscaneo(null);

    const previewUrl = previewExistente || (archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null);
    if (previewUrl) {
      setFotoCapturadaPreview(previewUrl);
      setPreviewUrlManual(previewUrl);
    }
    setArchivoAdjunto(archivo);
    setArchivoRutaServidor(null);

    try {
      const formData = new FormData();
      formData.append('file', archivo);

      const res = await fetch('/api/licencias/escanear-citt', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo leer el certificado.');
      }

      // Pre-llenar campos
      if (data.datos) {
        if (data.datos.numeroCertificado) setNumeroCertificado(String(data.datos.numeroCertificado).toUpperCase());
        if (data.datos.origen) setOrigen(data.datos.origen);
        if (data.datos.fechaInicio) setFechaInicio(data.datos.fechaInicio);
        if (data.datos.diasOtorgados) setDiasOtorgados(String(data.datos.diasOtorgados));
        if (data.datos.medico) setMedico(String(data.datos.medico).trim());
        if (data.datos.colegiatura) setColegiatura(String(data.datos.colegiatura).trim());
        if (data.datos.diagnostico) setDiagnostico(String(data.datos.diagnostico).trim());
      }

      // Auto-seleccionar si el trabajador fue hallado en BD
      if (data.trabajador) {
        setTrabajadorSeleccionado(data.trabajador);
      } else if (data.datos?.dni) {
        setBusqueda(data.datos.dni);
      }

      setResumenEscaneo({
        dni: data.datos?.dni,
        numeroCertificado: data.datos?.numeroCertificado,
        origen: data.datos?.origen,
        fechaInicio: data.datos?.fechaInicio,
        fechaFin: data.datos?.fechaFin,
        diasOtorgados: data.datos?.diasOtorgados,
        medico: data.datos?.medico,
        colegiatura: data.datos?.colegiatura,
        diagnostico: data.datos?.diagnostico,
        tipoLicencia: data.datos?.tipoLicencia,
        trabajadorNombre: data.trabajador ? data.trabajador.apellidosNombres : (data.datos?.apellidosNombres || undefined),
        encontradoEnBD: Boolean(data.trabajador),
        previewUrl: previewUrl || undefined
      });

    } catch (err: any) {
      console.error('Error procesando CITT:', err);
      setError('No se pudo extraer la información automáticamente. Puedes completar los campos en el Registro Manual.');
    } finally {
      setEscaneandoIA(false);
    }
  };

  if (!isOpen) return null;

  const seleccionarTrabajador = (t: any) => {
    setTrabajadorSeleccionado(t);
    setBusqueda('');
    setTrabajadores([]);
  };

  const calcularFechaFin = (inicio: string, dias: number) => {
    if (!inicio || !dias) return '';
    const date = new Date(inicio + 'T00:00:00');
    date.setDate(date.getDate() + (dias - 1));
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabajadorSeleccionado) {
      setError('Debes seleccionar un trabajador.');
      return;
    }
    if (!fechaInicio || !diasOtorgados || !numeroCertificado) {
      setError('Por favor completa todos los campos.');
      return;
    }
    
    let archivoRutaStr = archivoRutaServidor || editData?.archivoRuta || null;
    
    if (!archivoRutaStr && !archivoAdjunto) {
      setError('Es obligatorio adjuntar la evidencia fotográfica del descanso.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensajeGuardado(archivoAdjunto && !archivoRutaServidor 
      ? 'Subiendo evidencia médica de respaldo a la nube...' 
      : 'Registrando descanso médico en la base de datos...'
    );

    const fechaFinCalculada = calcularFechaFin(fechaInicio, parseInt(diasOtorgados));
    const fechaObj = new Date(fechaInicio + 'T00:00:00');
    const mesContable = fechaObj.getMonth() + 1;
    const anioContable = fechaObj.getFullYear();

    try {
      if (archivoAdjunto && !archivoRutaServidor) {
        const formData = new FormData();
        formData.append('file', archivoAdjunto);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Error subiendo el archivo adjunto.");
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          archivoRutaStr = uploadData.url;
        }
      }

      setMensajeGuardado('Registrando licencia y calculando días de subsidio...');

      const url = editData ? `/api/licencias/${editData.id}` : '/api/licencias';
      const method = editData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajadorId: trabajadorSeleccionado.id,
          tipoLicencia: tipoPorDefecto,
          origen,
          numeroCertificado,
          fechaInicio,
          fechaFin: fechaFinCalculada,
          diasOtorgados: parseInt(diasOtorgados),
          anioEjercicio: anioContable,
          mesEjercicio: mesContable,
          archivoRuta: archivoRutaStr,
          medico: medico.trim() || null,
          colegiatura: colegiatura.trim() || null,
          diagnostico: diagnostico.trim() || null
        })
      });

      if (!res.ok) throw new Error('Error al guardar el descanso');

      const dniGuardado = trabajadorSeleccionado?.dni;
      setExito(true);
      setTimeout(() => {
        setTrabajadorSeleccionado(null);
        setNumeroCertificado('');
        setFechaInicio('');
        setDiasOtorgados('');
        setMedico('');
        setColegiatura('');
        setDiagnostico('');
        setArchivoAdjunto(null);
        setArchivoRutaServidor(null);
        if (previewUrlManual) {
          URL.revokeObjectURL(previewUrlManual);
          setPreviewUrlManual(null);
        }
        setExito(false);
        setGuardando(false);
        onSuccess(dniGuardado);
        onClose();
      }, 1300);
      
    } catch (err) {
      setError('Hubo un problema guardando el registro.');
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* Overlay de Carga durante el Guardado de Licencia */}
        {guardando && (
          <div className="absolute inset-0 z-40 bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border-2 border-blue-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                <Loader2 className="w-8 h-8 text-cyan-300 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping" />
            </div>
            
            <h4 className="text-base font-bold text-white tracking-wide">
              {editData ? 'Actualizando Descanso Médico' : 'Registrando Descanso Médico'}
            </h4>
            
            <p className="text-xs text-blue-200/90 mt-1.5 max-w-sm leading-relaxed">
              {mensajeGuardado}
            </p>
            
            {/* Barra de progreso pulsante */}
            <div className="w-52 h-2 bg-slate-800/80 rounded-full overflow-hidden mt-4 border border-white/10 shadow-inner">
              <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-pulse rounded-full w-full" />
            </div>
            
            <p className="text-[10px] text-slate-400 mt-2">
              Sincronizando con la Red de Salud Huánuco...
            </p>
          </div>
        )}

        {/* Pantalla de Éxito Flotante */}
        {exito && (
          <div className="absolute inset-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs flex flex-col items-center justify-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-3 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">¡Registrado con Éxito!</h2>
            <p className="text-slate-500 text-sm mt-1">Guardado en la base de datos.</p>
          </div>
        )}

        {/* Inputs ocultos para cámara de teléfono y archivos */}
        <input 
          ref={inputCamaraNativaRef}
          type="file" 
          accept="image/*" 
          capture="environment"
          onChange={async (e) => {
            if (e.target.files && e.target.files[0]) {
              iniciarEscaneoDesdeArchivo(e.target.files[0]);
            }
            e.target.value = '';
          }}
          className="hidden" 
        />
        <input 
          ref={inputArchivoRef}
          type="file" 
          accept="image/*,application/pdf"
          onChange={async (e) => {
            if (e.target.files && e.target.files[0]) {
              iniciarEscaneoDesdeArchivo(e.target.files[0]);
            }
            e.target.value = '';
          }}
          className="hidden" 
        />
        <input 
          ref={inputCamaraManualRef}
          type="file" 
          accept="image/*" 
          capture="environment"
          onChange={async (e) => {
            if (e.target.files && e.target.files[0]) {
              setOptimizandoFoto(true);
              try {
                const file = await comprimirImagen(e.target.files[0]);
                setArchivoAdjunto(file);
                setArchivoRutaServidor(null);
                if (previewUrlManual) URL.revokeObjectURL(previewUrlManual);
                setPreviewUrlManual(URL.createObjectURL(file));
              } catch (err) {
                console.error("Error optimizando imagen de cámara:", err);
                setArchivoAdjunto(e.target.files[0]);
                setArchivoRutaServidor(null);
              } finally {
                setOptimizandoFoto(false);
              }
            }
            e.target.value = '';
          }}
          className="hidden" 
        />
        <input 
          ref={inputEvidenciaManualRef}
          type="file" 
          accept="image/*,application/pdf"
          onChange={async (e) => {
            if (e.target.files && e.target.files[0]) {
              setOptimizandoFoto(true);
              try {
                const original = e.target.files[0];
                const file = original.type.startsWith('image/')
                  ? await comprimirImagen(original)
                  : original;
                setArchivoAdjunto(file);
                setArchivoRutaServidor(null);
                if (previewUrlManual) URL.revokeObjectURL(previewUrlManual);
                if (file.type.startsWith('image/')) {
                  setPreviewUrlManual(URL.createObjectURL(file));
                } else {
                  setPreviewUrlManual(null);
                }
              } catch (err) {
                console.error("Error optimizando evidencia:", err);
                setArchivoAdjunto(e.target.files[0]);
                setArchivoRutaServidor(null);
              } finally {
                setOptimizandoFoto(false);
              }
            }
            e.target.value = '';
          }}
          className="hidden" 
        />

        {/* Cabecera del Modal con Selector de Pestañas tipo Reportes */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              {editData ? 'Editar Descanso Médico' : 'Registrar Descanso Médico'}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Pestañas limpias (Segmented Control igual al de Reportes) */}
            {!editData && (
              <div className="bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setTabActiva('manual')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    tabActiva === 'manual'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Registro Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTabActiva('escaner')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    tabActiva === 'escaner'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Escanear</span>
                </button>
              </div>
            )}

            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer" 
              disabled={guardando || escaneandoIA}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mensaje de Error General */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* CONTENIDO DE LA PESTAÑA: ESCANEAR */}
        {tabActiva === 'escaner' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            
            {/* Header del Escáner */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Escáner Inteligente CITT
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {escaneandoIA 
                    ? 'Evaluando la fotografía y extrayendo los datos en tiempo real.' 
                    : resumenEscaneo 
                    ? 'Certificado escaneado y reconocido satisfactoriamente.' 
                    : 'Tome una foto o suba el certificado para escanearlo automáticamente.'}
                </p>
              </div>

              {mostrarCamaraWebRTC && !escaneandoIA && !resumenEscaneo && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {soportaLinterna && (
                    <button
                      type="button"
                      onClick={toggleLinterna}
                      title={linternaEncendida ? 'Apagar linterna' : 'Encender linterna'}
                      className={`p-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        linternaEncendida 
                          ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs' 
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOrientacionMarco(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                    title="Girar orientación del marco guía"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="capitalize">{orientacionMarco}</span>
                  </button>
                  <button
                    type="button"
                    onClick={detenerCamara}
                    title="Cerrar cámara"
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* CASO 1: SEGUNDA EVALUACIÓN - ESCANEO LÁSER EN TIEMPO REAL SOBRE LA FOTO TOMADA */}
            {escaneandoIA && (
              <div className="space-y-4">
                <div className="relative w-full h-[340px] sm:h-[400px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-2xl flex items-center justify-center select-none">
                  {/* Foto capturada visible en alta fidelidad */}
                  {fotoCapturadaPreview ? (
                    <img
                      src={fotoCapturadaPreview}
                      alt="CITT Capturado"
                      className="w-full h-full object-contain filter contrast-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-3">
                      <Scan className="w-16 h-16 text-cyan-400 animate-pulse" />
                      <span className="text-xs text-cyan-300 font-medium">Cargando documento...</span>
                    </div>
                  )}

                  {/* Sombra de viñeta para destacar el escaneo */}
                  <div className="absolute inset-0 bg-slate-950/35 pointer-events-none" />

                  {/* Marco guía del escáner en pantalla */}
                  <div className="absolute inset-4 sm:inset-6 border border-cyan-400/35 rounded-xl pointer-events-none shadow-[0_0_30px_rgba(34,211,238,0.2)] flex flex-col justify-between p-3">
                    {/* 4 Esquinas brillantes del escáner */}
                    <div className="absolute -top-1 -left-1 w-7 h-7 border-t-3 border-l-3 border-cyan-400 rounded-tl-sm shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                    <div className="absolute -top-1 -right-1 w-7 h-7 border-t-3 border-r-3 border-cyan-400 rounded-tr-sm shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                    <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-3 border-l-3 border-cyan-400 rounded-bl-sm shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-3 border-r-3 border-cyan-400 rounded-br-sm shadow-[0_0_12px_rgba(34,211,238,0.9)]" />

                    {/* Línea láser de barrido animada en tiempo real */}
                    <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_rgba(34,211,238,1)] animate-laser-scan" />

                    {/* Badge superior indicando escaneo activo */}
                    <div className="z-10 text-center">
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-950/90 text-cyan-300 text-[11px] font-bold tracking-wider uppercase rounded-full border border-cyan-400/50 shadow-lg backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        Escaneando CITT con Inteligencia Artificial
                      </span>
                    </div>

                    {/* Badge inferior con detalle de análisis */}
                    <div className="z-10 text-center px-4 w-full">
                      <span className="inline-block px-4 py-1.5 bg-slate-900/90 text-white text-[11px] font-medium rounded-full border border-white/10 shadow-md backdrop-blur-md transition-all duration-300">
                        {pasosEscaneo[pasoEscaneoIndex]?.texto || 'Analizando certificado...'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de progreso dinámico con micro-pasos */}
                <div className="p-4 bg-gradient-to-r from-blue-50/90 via-cyan-50/70 to-blue-50/90 dark:from-slate-900 dark:via-blue-950/50 dark:to-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-cyan-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-100 block">
                          {pasosEscaneo[pasoEscaneoIndex]?.texto || 'Procesando certificado...'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Reconociendo caracteres médicos y validando contra el padrón...
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-blue-600 dark:text-cyan-400 font-mono">
                        {pasosEscaneo[pasoEscaneoIndex]?.porcentaje || 50}%
                      </span>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {pasosEscaneo[pasoEscaneoIndex]?.badge || 'Paso 2/4'}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso interactiva animada */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700/60">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(34,211,238,0.7)]"
                      style={{ width: `${pasosEscaneo[pasoEscaneoIndex]?.porcentaje || 50}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CASO 2: CÁMARA EN VIVO WEBRTC (Para laptop o si el usuario decide activarla) */}
            {mostrarCamaraWebRTC && !escaneandoIA && !resumenEscaneo && (
              <div className="space-y-3">
                <div 
                  ref={scannerContainerRef}
                  className="relative w-full h-[320px] sm:h-[380px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl select-none"
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                    <div
                      ref={guideBoxRef}
                      className={`relative transition-all duration-300 flex flex-col justify-between items-center p-3 ${
                        orientacionMarco === 'horizontal'
                          ? 'w-[90%] max-w-[460px] aspect-[1.44/1]'
                          : 'h-[86%] max-h-[350px] aspect-[1/1.44]'
                      }`}
                      style={{
                        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)'
                      }}
                    >
                      <div className="absolute -top-1 -left-1 w-6 sm:w-7 h-6 sm:h-7 border-t-3 border-l-3 border-blue-500 rounded-tl-sm shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                      <div className="absolute -top-1 -right-1 w-6 sm:w-7 h-6 sm:h-7 border-t-3 border-r-3 border-blue-500 rounded-tr-sm shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                      <div className="absolute -bottom-1 -left-1 w-6 sm:w-7 h-6 sm:h-7 border-b-3 border-l-3 border-blue-500 rounded-bl-sm shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                      <div className="absolute -bottom-1 -right-1 w-6 sm:w-7 h-6 sm:h-7 border-b-3 border-r-3 border-blue-500 rounded-br-sm shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                      <div className="absolute inset-0 border border-blue-400/25 rounded-xs" />
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_rgba(59,130,246,0.95)] animate-laser-scan" />

                      <div className="z-10 mt-1">
                        <span className="px-2.5 py-0.5 bg-slate-900/80 backdrop-blur-md text-blue-300 text-[10px] font-semibold tracking-wider uppercase rounded-full border border-blue-500/30 shadow-xs">
                          Marco de Documento ({orientacionMarco})
                        </span>
                      </div>

                      <div className="z-10 mb-1">
                        <span className="px-3 py-1 bg-black/75 backdrop-blur-md text-white text-[11px] font-medium rounded-full border border-white/10 shadow-xs">
                          Alinee los bordes del papel dentro del recuadro
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 z-20">
                    <button
                      type="button"
                      onClick={() => setOrientacionMarco(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                      className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white/90 text-[11px] font-medium rounded-lg backdrop-blur-md border border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>{orientacionMarco === 'horizontal' ? 'Formato Vertical' : 'Formato Horizontal'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={escanearDocumento}
                    className="w-full sm:w-auto px-10 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Scan className="w-5 h-5 text-blue-200" />
                    <span>Escanear Documento</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASO 3: ESTADO INICIAL (Paso 1: Tomar foto o subir archivo) */}
            {!mostrarCamaraWebRTC && !escaneandoIA && !resumenEscaneo && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center bg-slate-50/70 dark:bg-slate-900/40 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                  <Scan className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Escanear Certificado CITT
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Toma una fotografía clara del documento CITT. Luego, la aplicación escaneará la fotografía en pantalla mediante láser visual y extraerá automáticamente el código, DNI, fechas y servidor.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => inputCamaraNativaRef.current?.click()}
                    className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer active:scale-98"
                  >
                    <Camera className="w-4 h-4 text-blue-200" />
                    <span>Tomar Foto para Escanear</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => inputArchivoRef.current?.click()}
                    className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Subir Imagen o PDF</span>
                  </button>
                </div>

                {/* Opción secundaria para activar webcam en laptop si se desea */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={activarCamaraOSelector}
                    className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer underline transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Abrir visor de cámara en vivo (Webcam)</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASO 4: RESULTADO DEL ESCANEO CON RECONOCIMIENTO Y MINIATURA */}
            {resumenEscaneo && !escaneandoIA && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm space-y-0">
                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Certificado Escaneado y Reconocido
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setResumenEscaneo(null);
                      setFotoCapturadaPreview(null);
                      inputCamaraNativaRef.current?.click();
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Volver a escanear
                  </button>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Miniatura de la evidencia escaneada */}
                  {resumenEscaneo.previewUrl && (
                    <div className="md:col-span-1 flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                        <img 
                          src={resumenEscaneo.previewUrl} 
                          alt="Evidencia CITT" 
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/75 text-emerald-400 text-[9px] font-bold rounded">
                          ✓ Escaneado
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">Evidencia adjuntada</span>
                    </div>
                  )}

                  {/* Datos extraídos */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${resumenEscaneo.previewUrl ? 'md:col-span-2' : 'md:col-span-3'}`}>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px] mb-0.5">Servidor Identificado</span>
                      {resumenEscaneo.trabajadorNombre ? (
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-bold text-emerald-900 dark:text-emerald-100 text-xs">
                              {resumenEscaneo.trabajadorNombre}
                            </p>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                              DNI {resumenEscaneo.dni} • Vinculado en Planilla de la Red
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md uppercase">
                            Identificado
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="font-semibold text-amber-900 dark:text-amber-100 text-xs">
                            DNI: {resumenEscaneo.dni || 'No detectado'}
                          </p>
                          <span className="text-[11px] text-amber-700 dark:text-amber-300">
                            No figura en el padrón local. Podrás seleccionarlo o buscarlo en el formulario.
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Número de Certificado</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {resumenEscaneo.numeroCertificado || 'No detectado'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Tipo de Origen</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {resumenEscaneo.origen === 'ESSALUD_CITT' ? 'EsSalud CITT' : 'Particular / MINSA'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Periodo de Descanso</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {resumenEscaneo.fechaInicio || '...'} {resumenEscaneo.fechaFin ? `al ${resumenEscaneo.fechaFin}` : ''}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Días Otorgados</span>
                      <p className="font-bold text-blue-600 dark:text-blue-400">
                        {resumenEscaneo.diasOtorgados ? `${resumenEscaneo.diasOtorgados} día(s)` : 'No detectado'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Médico Tratante</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={resumenEscaneo.medico}>
                        {resumenEscaneo.medico || 'No detectado'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Colegiatura (CMP)</span>
                      <div>
                        {resumenEscaneo.colegiatura ? (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold rounded text-xs">
                            CMP {resumenEscaneo.colegiatura}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">No detectada</span>
                        )}
                      </div>
                    </div>

                    {resumenEscaneo.diagnostico && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Diagnóstico / CIE-10</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300 text-xs bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                          {resumenEscaneo.diagnostico}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Foto escaneada lista. Se guardará en el servidor al presionar &quot;Registrar Licencia&quot;.
                  </span>
                  <button
                    type="button"
                    onClick={() => setTabActiva('manual')}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors active:scale-98"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Pasar al Formulario y Guardar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO DE LA PESTAÑA 1: REGISTRO MANUAL */}
        {tabActiva === 'manual' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

            {/* 1. SELECCIÓN DE TRABAJADOR */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                1. Datos del Servidor
              </h4>
              
              {!trabajadorSeleccionado ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Escribe DNI o Apellidos (Ej. 6079 o Rojas)..." 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-blue-500 focus:bg-white"
                  />
                  
                  {buscando && <p className="text-xs text-blue-500 mt-1.5 ml-1">Buscando en la base de datos...</p>}
                  
                  {trabajadores.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                      {trabajadores.map(t => (
                        <li 
                          key={t.id} 
                          onClick={() => seleccionarTrabajador(t)}
                          className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex flex-col transition-colors"
                        >
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                            {t.dni} - {t.apellidosNombres ? t.apellidosNombres : `${t.apellidos}, ${t.nombres}`}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t.establecimiento?.nombre} ({t.establecimiento?.microred?.nombre})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Servidor Seleccionado:
                    </span>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {trabajadorSeleccionado.dni} - {trabajadorSeleccionado.apellidosNombres ? trabajadorSeleccionado.apellidosNombres : `${trabajadorSeleccionado.apellidos}, ${trabajadorSeleccionado.nombres}`}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {trabajadorSeleccionado.cargo} — {trabajadorSeleccionado.establecimiento?.nombre || trabajadorSeleccionado.establecimiento}
                    </p>
                  </div>
                  {!trabajadorFijo && (
                    <button 
                      type="button"
                      onClick={() => setTrabajadorSeleccionado(null)}
                      className="text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs font-medium transition-colors cursor-pointer"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. DETALLE DEL CITT / CERTIFICADO MÉDICO */}
            <div className={`transition-opacity duration-200 ${!trabajadorSeleccionado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                2. Detalle del Descanso Médico
              </h4>
              
              <form id="citt-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Origen del Certificado</label>
                  <div className="flex flex-wrap gap-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        value="ESSALUD_CITT" 
                        checked={origen === 'ESSALUD_CITT'} 
                        onChange={(e) => setOrigen(e.target.value)} 
                        className="w-4 h-4 text-blue-600" 
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">CITT EsSalud</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        value="PARTICULAR" 
                        checked={origen === 'PARTICULAR'} 
                        onChange={(e) => setOrigen(e.target.value)} 
                        className="w-4 h-4 text-blue-600" 
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">Certificado Particular (Especie Valorada)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Número de Certificado</label>
                  <input 
                    type="text" 
                    required
                    value={numeroCertificado}
                    onChange={(e) => setNumeroCertificado(e.target.value.toUpperCase())}
                    placeholder="Ej. A-12345678"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-100 focus:outline-blue-500"
                  />
                </div>

                {/* Colegiatura CMP (Suficiente para identificar legalmente al médico ante EsSalud) */}
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Colegiatura Médica (CMP)</label>
                  <input 
                    type="text" 
                    value={colegiatura}
                    onChange={(e) => setColegiatura(e.target.value)}
                    placeholder="Ej. 094296"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-100 focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-100 focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Cantidad de Días Otorgados</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={diasOtorgados}
                    onChange={(e) => setDiasOtorgados(e.target.value)}
                    placeholder="Ej. 15"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-100 focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Fecha de Fin (Calculada)</label>
                  <input 
                    type="date" 
                    disabled
                    value={calcularFechaFin(fechaInicio, parseInt(diasOtorgados || '0'))}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* Diagnóstico / CIE-10 */}
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Diagnóstico / Código CIE-10</label>
                  <input 
                    type="text" 
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    placeholder="Ej. Contusión en zona lumbosacro (S30.0)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-100 focus:outline-blue-500"
                  />
                </div>

                {/* SECCIÓN EVIDENCIA */}
                <div className="sm:col-span-2 pt-1">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Evidencia del Descanso <span className="text-red-500 font-bold">(Obligatorio)</span>
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {puedeSubirArchivo ? (
                      <>
                        <button
                          type="button"
                          onClick={() => inputCamaraManualRef.current?.click()}
                          disabled={optimizandoFoto}
                          className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {optimizandoFoto ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                          <span>Tomar Foto con Cámara</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => inputEvidenciaManualRef.current?.click()}
                          disabled={optimizandoFoto}
                          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir Archivo o PDF</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 flex items-center gap-2 w-full">
                        <AlertCircle className="w-4 h-4 shrink-0" /> No tienes permisos para adjuntar archivos a los trámites.
                      </div>
                    )}
                  </div>

                  {optimizandoFoto && (
                    <div className="p-3 mb-3 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-cyan-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100 block">
                            Optimizando evidencia fotográfica...
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Ajustando resolución para carga ultrarrápida sin pérdida de nitidez
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full shrink-0">
                        Procesando
                      </span>
                    </div>
                  )}

                  {/* Vista previa de archivo adjunto */}
                  {archivoRutaServidor ? (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200 truncate max-w-xs">
                          Evidencia adjuntada: {archivoRutaServidor}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setArchivoRutaServidor(null)} 
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-0.5 cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : archivoAdjunto ? (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2.5 truncate">
                        {previewUrlManual ? (
                          <img 
                            src={previewUrlManual} 
                            alt="Vista previa evidencia" 
                            className="w-10 h-10 object-cover rounded-md border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                            {archivoAdjunto.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {(archivoAdjunto.size / 1024).toFixed(0)} KB {archivoAdjunto.type.startsWith('image/') ? '• Optimizado' : ''}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setArchivoAdjunto(null);
                          if (previewUrlManual) {
                            URL.revokeObjectURL(previewUrlManual);
                            setPreviewUrlManual(null);
                          }
                        }} 
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2.5 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : editData?.archivoRuta ? (
                    <p className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-md border border-emerald-100 dark:border-emerald-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Ya existe una evidencia guardada para este registro.
                    </p>
                  ) : null}
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Pie del Modal */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            disabled={guardando || escaneandoIA}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          {tabActiva === 'manual' ? (
            <button 
              type="submit" 
              form="citt-form"
              disabled={!trabajadorSeleccionado || guardando || escaneandoIA}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {editData ? 'Actualizar Licencia' : 'Registrar Licencia'}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTabActiva('manual')}
              disabled={!trabajadorSeleccionado}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Ir al Formulario</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
