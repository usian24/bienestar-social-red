'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Search, CheckCircle2, AlertCircle, Camera, Upload, 
  Loader2, Check, FileText, Scan, RefreshCw, Image as ImageIcon,
  Sparkles, Stethoscope, UserCheck, ShieldAlert, Lock, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { tienePermiso } from '@/shared/utils/permisos';

interface NuevoCittModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dni?: string) => void;
  tipoPorDefecto?: 'ENFERMEDAD_COMUN' | 'ACCIDENTE_COMUN' | 'MATERNIDAD' | 'PATERNIDAD' | 'LEY_30012';
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
  const [tipoLicencia, setTipoLicencia] = useState<'ENFERMEDAD_COMUN' | 'ACCIDENTE_COMUN' | 'MATERNIDAD' | 'PATERNIDAD' | 'LEY_30012'>(tipoPorDefecto);
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

  // Estados para Escáner y Cámara
  const [fotoCapturadaPreview, setFotoCapturadaPreview] = useState<string | null>(null);
  const [previewUrlManual, setPreviewUrlManual] = useState<string | null>(null);
  const [optimizandoFoto, setOptimizandoFoto] = useState(false);
  const [escaneandoIA, setEscaneandoIA] = useState(false);
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
    bloqueadoPorMicrored?: boolean;
    mensajeMicrored?: string;
    microredTrabajador?: string | null;
    microredUsuario?: string | null;
  } | null>(null);

  const inputCamaraNativaRef = useRef<HTMLInputElement>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputCamaraManualRef = useRef<HTMLInputElement>(null);
  const inputEvidenciaManualRef = useRef<HTMLInputElement>(null);
  const abortScanRef = useRef<AbortController | null>(null);

  // Inicializar o limpiar datos al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setTabActiva('manual');
        setOrigen(editData.origen);
        setTipoLicencia(editData.tipoLicencia || tipoPorDefecto || 'ENFERMEDAD_COMUN');
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
        setOrigen(tipoPorDefecto === 'LEY_30012' ? 'PARTICULAR' : 'ESSALUD_CITT');
        setTipoLicencia(tipoPorDefecto || 'ENFERMEDAD_COMUN');
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
      setFotoCapturadaPreview(null);
      if (previewUrlManual) {
        URL.revokeObjectURL(previewUrlManual);
        setPreviewUrlManual(null);
      }
    }
  }, [isOpen, editData, trabajadorFijo]);

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
  // --- COMPRESIÓN CLIENT-SIDE RESILIENTE Y ULTRA-RÁPIDA (Hardware móvil en GPU/C++ <30ms) ---
  const comprimirImagen = async (archivo: File, maxDimension = 1200, calidad = 0.82): Promise<File> => {
    if (!archivo || !archivo.type.startsWith('image/') || archivo.type === 'image/svg+xml' || archivo.type === 'image/gif') {
      return archivo;
    }
    // Si la imagen ya es súper liviana (< 300 KB), no tocarla
    if (archivo.size < 300 * 1024) {
      return archivo;
    }

    const nombreBase = (archivo.name || "citt-scan").replace(/\.[^/.]+$/, "") || "citt";

    // ESTRATEGIA 1: createImageBitmap (Hardware móvil ultra-rápido en GPU/C++, <30ms sin congelar la UI)
    if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
      try {
        const bitmap = await window.createImageBitmap(archivo);
        let { width, height } = bitmap;
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
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close(); // Liberar memoria nativa de GPU inmediatamente

          // toDataURL síncrono ultra-estable
          const dataUrl = canvas.toDataURL('image/jpeg', calidad);
          const parts = dataUrl.split(',');
          const byteString = atob(parts[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: 'image/jpeg' });
          if (blob.size < archivo.size) {
            console.log(`[OCR CITT] Imagen comprimida con hardware móvil de ${Math.round(archivo.size / 1024)} KB a ${Math.round(blob.size / 1024)} KB`);
            return new File([blob], `${nombreBase}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
          }
        }
      } catch (errBitmap) {
        console.warn('createImageBitmap no disponible o falló, usando método estándar:', errBitmap);
      }
    }

    // ESTRATEGIA 2: Canvas tradicional con new Image() y FileReader
    return new Promise<File>((resolve) => {
      let objectUrl: string | null = null;
      try {
        objectUrl = URL.createObjectURL(archivo);
        const img = new Image();

        img.onload = () => {
          try {
            let { width, height } = img;
            if (!width || !height) {
              if (objectUrl) URL.revokeObjectURL(objectUrl);
              resolve(archivo);
              return;
            }

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
              if (objectUrl) URL.revokeObjectURL(objectUrl);
              resolve(archivo);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            if (objectUrl) URL.revokeObjectURL(objectUrl);

            const dataUrl = canvas.toDataURL('image/jpeg', calidad);
            const parts = dataUrl.split(',');
            const byteString = atob(parts[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: 'image/jpeg' });
            if (blob.size < archivo.size) {
              console.log(`[OCR CITT] Imagen comprimida con Canvas estándar de ${Math.round(archivo.size / 1024)} KB a ${Math.round(blob.size / 1024)} KB`);
              resolve(new File([blob], `${nombreBase}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(archivo);
            }
          } catch (e) {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve(archivo);
          }
        };

        img.onerror = () => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          resolve(archivo);
        };

        img.src = objectUrl;
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(archivo);
      }
    });
  };

  // Iniciar escaneo inmediatamente con feedback visual instantáneo (overlay sobrepuesto)
  const iniciarEscaneoDesdeArchivo = async (archivoSeleccionado: File) => {
    setTabActiva('escaner');
    setEscaneandoIA(true);
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
      // Optimizar en el cliente para subida instantánea (reduce fotos de 20MB de móvil a ~300KB en ~50ms)
      let archivoParaEnviar = archivoSeleccionado;
      if (archivoSeleccionado.type.startsWith('image/')) {
        try {
          archivoParaEnviar = await comprimirImagen(archivoSeleccionado, 1200, 0.82);
        } catch (e) {
          console.warn('Aviso comprimiendo foto, enviando original:', e);
          archivoParaEnviar = archivoSeleccionado;
        }
        setArchivoAdjunto(archivoParaEnviar);
      }
      await procesarArchivoCitt(archivoParaEnviar, previewTemp);
    } catch (err: any) {
      console.error('Error preparando imagen:', err);
      setError('No se pudo procesar el archivo seleccionado.');
      setEscaneandoIA(false);
    }
  };



  // --- PROCESAMIENTO DEL CITT CON VISIÓN COMPUTACIONAL ---
  const procesarArchivoCitt = async (archivo: File, previewExistente?: string | null) => {
    // Abortar cualquier escaneo previo en vuelo para evitar condiciones de carrera
    if (abortScanRef.current) {
      abortScanRef.current.abort();
    }
    const controller = new AbortController();
    abortScanRef.current = controller;

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
      let res: Response;
      try {
        // 1. Envío ultrarrápido vía JSON con base64 para evitar cuellos de botella de streaming multipart en Android
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(archivo);
        });

        res = await fetch('/api/licencias/escanear-citt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imagenBase64: base64Data,
            nombreArchivo: archivo.name,
            tipoMime: archivo.type
          }),
          signal: controller.signal
        });
      } catch (jsonErr: any) {
        if (jsonErr?.name === 'AbortError') throw jsonErr;
        console.warn('Fallback a FormData tras error en JSON:', jsonErr);
        const formData = new FormData();
        formData.append('file', archivo);
        res = await fetch('/api/licencias/escanear-citt', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || 'No se pudo leer el certificado médico. Asegúrese de que esté bien iluminado y enfocado.');
        setResumenEscaneo(null);
        return;
      }

      setError(''); // Limpiar cualquier error previo

      // Pre-llenar campos
      if (data.datos) {
        if (data.datos.numeroCertificado) setNumeroCertificado(String(data.datos.numeroCertificado).toUpperCase());
        if (data.datos.origen) setOrigen(data.datos.origen);
        if (data.datos.tipoLicencia) setTipoLicencia(data.datos.tipoLicencia);
        if (data.datos.fechaInicio) setFechaInicio(data.datos.fechaInicio);
        if (data.datos.diasOtorgados) setDiasOtorgados(String(data.datos.diasOtorgados));
        if (data.datos.medico) setMedico(String(data.datos.medico).trim());
        if (data.datos.colegiatura) setColegiatura(String(data.datos.colegiatura).trim());
        if (data.datos.diagnostico) setDiagnostico(String(data.datos.diagnostico).trim());
      }

      // Auto-seleccionar si el trabajador fue hallado en BD Y NO está bloqueado por microred
      const esBloqueado = Boolean(data.bloqueadoPorMicrored);
      if (data.trabajador && !esBloqueado) {
        setTrabajadorSeleccionado(data.trabajador);
      } else {
        setTrabajadorSeleccionado(null);
        if (!esBloqueado && data.datos?.dni) {
          setBusqueda(data.datos.dni);
        }
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
        previewUrl: previewUrl || undefined,
        bloqueadoPorMicrored: esBloqueado,
        mensajeMicrored: data.mensajeMicrored,
        microredTrabajador: data.microredTrabajador,
        microredUsuario: data.microredUsuario
      });

    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Cancelado limpiamente por nueva acción
      console.warn('Aviso procesando CITT:', err?.message || err);
      setError(err?.message || 'No se pudo extraer la información automáticamente. Puedes completar los campos en el Registro Manual.');
      setResumenEscaneo(null);
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

    // Doble validación de permisos por Microred
    const isSuperAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const userMicroredId = (session?.user as any)?.microredId ? Number((session?.user as any).microredId) : null;
    const workerMicroredId = trabajadorSeleccionado?.establecimiento?.microredId || trabajadorSeleccionado?.microredId;
    if (!isSuperAdmin && userMicroredId && workerMicroredId && workerMicroredId !== userMicroredId) {
      setError(`No tienes autorización para registrar descansos para personal de otra microred. Esta acción es exclusiva del Super Admin.`);
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
          tipoLicencia: tipoLicencia || tipoPorDefecto,
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
              const file = e.target.files[0];
              const optimizado = await comprimirImagen(file, 1600, 0.85);
              setArchivoAdjunto(optimizado);
              setArchivoRutaServidor(null);
              if (previewUrlManual) URL.revokeObjectURL(previewUrlManual);
              setPreviewUrlManual(URL.createObjectURL(optimizado));
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
              const original = e.target.files[0];
              let finalFile = original;
              if (original.type.startsWith('image/')) {
                finalFile = await comprimirImagen(original, 1600, 0.85);
              }
              setArchivoAdjunto(finalFile);
              setArchivoRutaServidor(null);
              if (previewUrlManual) URL.revokeObjectURL(previewUrlManual);
              if (finalFile.type.startsWith('image/')) {
                setPreviewUrlManual(URL.createObjectURL(finalFile));
              } else {
                setPreviewUrlManual(null);
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
        {error && !resumenEscaneo && (
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


            </div>

            {/* CASO 1: ESTADO DE CARGA SOBREPUESTO DIRECTO EN LA IMAGEN */}
            {escaneandoIA && (
              <div className="relative w-full h-[360px] sm:h-[420px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl flex items-center justify-center select-none">
                {/* Foto capturada de fondo */}
                {fotoCapturadaPreview ? (
                  <img
                    src={fotoCapturadaPreview}
                    alt="CITT Capturado"
                    className="w-full h-full object-contain filter contrast-105 opacity-40 blur-[1px]"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900" />
                )}

                {/* Marco y esquinas luminosas */}
                <div className="absolute inset-4 sm:inset-6 border border-cyan-400/25 rounded-xl pointer-events-none z-10 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-sm shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-sm shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-sm shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                </div>

                {/* Línea láser de barrido vertical animada */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.95)] animate-laser-scan z-10 pointer-events-none" />

                {/* OVERLAY SOBREPUESTO (HUD centrado y limpio sin falsas etapas ni barras engañosas) */}
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg shadow-blue-500/10">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                  </div>

                  <h4 className="text-base font-bold text-white mb-1.5 flex items-center justify-center gap-2">
                    <Scan className="w-4 h-4 text-cyan-400" />
                    <span>Analizando Certificado CITT...</span>
                  </h4>

                  <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-4">
                    Extrayendo DNI, fechas de descanso, diagnóstico y médico tratante. Por favor, espera un momento...
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (abortScanRef.current) abortScanRef.current.abort();
                      setEscaneandoIA(false);
                      setFotoCapturadaPreview(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            )}



            {/* ESTADO INICIAL (Paso 1: Tomar foto o subir archivo) */}
            {!escaneandoIA && !resumenEscaneo && (
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
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/75 text-emerald-400 text-[9px] font-bold rounded flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Escaneado</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">Evidencia adjuntada</span>
                    </div>
                  )}

                  {/* Datos extraídos */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${resumenEscaneo.previewUrl ? 'md:col-span-2' : 'md:col-span-3'}`}>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px] mb-0.5">Servidor Identificado</span>
                      {resumenEscaneo.bloqueadoPorMicrored ? (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-200">
                              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                              Servidor de Otra Sede (Acceso Restringido)
                            </span>
                            <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-md uppercase shrink-0">
                              Bloqueado
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                            {resumenEscaneo.trabajadorNombre} • DNI {resumenEscaneo.dni}
                          </p>
                          <div className="text-[11px] text-rose-700 dark:text-rose-300 bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 leading-relaxed">
                            {resumenEscaneo.mensajeMicrored || `Este servidor pertenece a la microred "${resumenEscaneo.microredTrabajador}". Tu cuenta solo puede tramitar licencias de "${resumenEscaneo.microredUsuario}". Solo el Super Admin puede registrar personal de otras sedes.`}
                          </div>
                        </div>
                      ) : resumenEscaneo.trabajadorNombre ? (
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
                      <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Tipo de Certificado</span>
                      <div>
                        {resumenEscaneo.tipoLicencia === 'LEY_30012' ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold rounded text-xs border border-purple-200 dark:border-purple-800">
                            MINSA - Ley Nº 30012 (Familiar Grave)
                          </span>
                        ) : resumenEscaneo.origen === 'ESSALUD_CITT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-semibold text-xs rounded">
                            EsSalud CITT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-xs rounded">
                            Certificado Particular / MINSA
                          </span>
                        )}
                      </div>
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
                    {resumenEscaneo.bloqueadoPorMicrored
                      ? "Certificado bloqueado: El servidor pertenece a otra microred y no tienes autorización para tramitarlo."
                      : "Foto escaneada lista. Se guardará en el servidor al presionar \"Registrar Licencia\"."}
                  </span>

                  {resumenEscaneo.bloqueadoPorMicrored ? (
                    <button
                      type="button"
                      disabled
                      className="w-full sm:w-auto px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300 dark:border-slate-600 shadow-none opacity-80"
                      title="No puedes registrar descansos de servidores de otra microred"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Registro Bloqueado (Otra Sede)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTabActiva('manual')}
                      className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors active:scale-98"
                    >
                      <span>Pasar al Formulario y Guardar</span>
                    </button>
                  )}
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
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Origen / Tipo de Certificado</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      origen === 'ESSALUD_CITT' && tipoLicencia !== 'LEY_30012'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}>
                      <input 
                        type="radio" 
                        name="origenCertificado"
                        value="ESSALUD_CITT" 
                        checked={origen === 'ESSALUD_CITT' && tipoLicencia !== 'LEY_30012'} 
                        onChange={() => {
                          setOrigen('ESSALUD_CITT');
                          setTipoLicencia(tipoPorDefecto === 'LEY_30012' ? 'ENFERMEDAD_COMUN' : (tipoPorDefecto || 'ENFERMEDAD_COMUN'));
                        }} 
                        className="w-4 h-4 text-blue-600 mt-0.5" 
                      />
                      <div className="text-xs">
                        <span className="font-bold block text-slate-800 dark:text-slate-100">CITT EsSalud</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Descanso médico institucional</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      origen === 'PARTICULAR' && tipoLicencia !== 'LEY_30012'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}>
                      <input 
                        type="radio" 
                        name="origenCertificado"
                        value="PARTICULAR" 
                        checked={origen === 'PARTICULAR' && tipoLicencia !== 'LEY_30012'} 
                        onChange={() => {
                          setOrigen('PARTICULAR');
                          setTipoLicencia(tipoPorDefecto === 'LEY_30012' ? 'ENFERMEDAD_COMUN' : (tipoPorDefecto || 'ENFERMEDAD_COMUN'));
                        }} 
                        className="w-4 h-4 text-emerald-600 mt-0.5" 
                      />
                      <div className="text-xs">
                        <span className="font-bold block text-slate-800 dark:text-slate-100">Particular (CMP)</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Especie valorada o clínica</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      tipoLicencia === 'LEY_30012'
                        ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}>
                      <input 
                        type="radio" 
                        name="origenCertificado"
                        value="LEY_30012" 
                        checked={tipoLicencia === 'LEY_30012'} 
                        onChange={() => {
                          setOrigen('PARTICULAR');
                          setTipoLicencia('LEY_30012');
                        }} 
                        className="w-4 h-4 text-purple-600 mt-0.5" 
                      />
                      <div className="text-xs">
                        <span className="font-bold block text-purple-800 dark:text-purple-300">MINSA (Ley Nº 30012)</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Familiar grave o terminal</span>
                      </div>
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
