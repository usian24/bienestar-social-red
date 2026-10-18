'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  RemoveFormatting, Indent, Outdent, List, ListOrdered,
  Undo, Redo, Calendar, Minus,
  ChevronDown, Palette, Highlighter, 
  Ruler, Sparkles, CornerDownLeft
} from 'lucide-react';

export default function EditorToolbar() {
  const [tabActiva, setTabActiva] = useState<'inicio' | 'disposicion' | 'insertar'>('inicio');
  const [paletaTextoAbierta, setPaletaTextoAbierta] = useState(false);
  const [paletaResaltadoAbierta, setPaletaResaltadoAbierta] = useState(false);
  const [menuInterlineadoAbierto, setMenuInterlineadoAbierto] = useState(false);
  const [reglaVisible, setReglaVisible] = useState(true);

  // Márgenes en cm
  const [margenIzqCm, setMargenIzqCm] = useState(2.0);
  const [margenDerCm, setMargenDerCm] = useState(2.0);
  const [sangriaIndentCm, setSangriaIndentCm] = useState(0.0);

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const spacingPickerRef = useRef<HTMLDivElement>(null);

  // Paleta de colores estándar Office
  const coloresTexto = [
    { label: 'Negro automático', color: '#000000' },
    { label: 'Gris carbón', color: '#374151' },
    { label: 'Azul institucional', color: '#185abd' },
    { label: 'Azul marino', color: '#1e3a8a' },
    { label: 'Rojo oscuro', color: '#991b1b' },
    { label: 'Verde oscuro', color: '#166534' },
    { label: 'Morado formal', color: '#6b21a8' },
    { label: 'Ámbar corporativo', color: '#b45309' },
  ];

  // Resaltadores fluorescentes estilo Word
  const coloresResaltador = [
    { label: 'Amarillo', color: '#fef08a' },
    { label: 'Verde', color: '#bbf7d0' },
    { label: 'Celeste', color: '#bae6fd' },
    { label: 'Rosa', color: '#fbcfe8' },
    { label: 'Naranja', color: '#fed7aa' },
    { label: 'Sin resaltado', color: 'transparent' },
  ];

  const fuentes = [
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Geneva, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  ];

  const tamanosPt = [9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setPaletaTextoAbierta(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(e.target as Node)) {
        setPaletaResaltadoAbierta(false);
      }
      if (spacingPickerRef.current && !spacingPickerRef.current.contains(e.target as Node)) {
        setMenuInterlineadoAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMarginUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        if (typeof custom.detail.leftCm === 'number') setMargenIzqCm(custom.detail.leftCm);
        if (typeof custom.detail.rightCm === 'number') setMargenDerCm(custom.detail.rightCm);
        if (typeof custom.detail.indentCm === 'number') setSangriaIndentCm(custom.detail.indentCm);
      }
    };
    window.addEventListener('word-margin-updated', handleMarginUpdated);
    return () => window.removeEventListener('word-margin-updated', handleMarginUpdated);
  }, []);

  const execCmd = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
  };

  const setExactFontSize = (ptSize: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    document.execCommand('fontSize', false, '7');
    const fonts = document.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
      font.removeAttribute('size');
      (font as HTMLElement).style.fontSize = `${ptSize}pt`;
    });
  };

  const changeFontSize = (action: 'increase' | 'decrease') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const parent = selection.anchorNode?.parentElement;
    if (!parent) return;

    const style = window.getComputedStyle(parent);
    let currentSize = parseFloat(style.fontSize);
    if (isNaN(currentSize)) currentSize = 15;

    const newSize = action === 'increase' ? currentSize + 2 : Math.max(8, currentSize - 2);

    document.execCommand('fontSize', false, '7');
    const fonts = document.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
      font.removeAttribute('size');
      (font as HTMLElement).style.fontSize = `${newSize}px`;
    });
  };

  const setLineSpacing = (spacing: string) => {
    const selection = window.getSelection();
    let blockFound = false;

    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.anchorNode;
      while (node && node !== document.body && !(node as HTMLElement)?.isContentEditable) {
        if (node instanceof HTMLElement && ['P', 'DIV', 'H1', 'H2', 'H3', 'TD', 'TH', 'LI'].includes(node.tagName)) {
          node.style.lineHeight = spacing;
          blockFound = true;
          break;
        }
        node = node.parentNode;
      }
    }

    if (!blockFound) {
      const doc = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (doc) doc.style.lineHeight = spacing;
    }
    setMenuInterlineadoAbierto(false);
  };

  const setMarginPreset = (leftCm: number, rightCm: number) => {
    setMargenIzqCm(leftCm);
    setMargenDerCm(rightCm);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('word-set-margin', {
        detail: { leftCm, rightCm, indentCm: sangriaIndentCm }
      }));
    }
  };

  const toggleRegla = () => {
    const nuevoEstado = !reglaVisible;
    setReglaVisible(nuevoEstado);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('word-toggle-ruler', {
        detail: { visible: nuevoEstado }
      }));
    }
  };

  const insertarFecha = () => {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const hoy = new Date();
    execCmd('insertText', `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`);
  };

  const insertarLineaDivisoria = () => {
    execCmd('insertHorizontalRule');
  };

  const insertarSaltoDePagina = () => {
    execCmd('insertHTML', '<div class="page-break my-4 border-b-2 border-dashed border-blue-400 text-center text-[10px] text-blue-500 font-bold select-none py-1 print:my-0 print:border-none print:py-0">--- SALTO DE PÁGINA IMPRESIÓN ---</div><p><br/></p>');
  };

  const insertarBloqueFirma = () => {
    const htmlFirma = `
      <div style="margin-top: 40px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; font-size: 11px; color: #1e293b;">
        <div style="width: 220px; border-top: 1px solid #334155; margin-bottom: 4px;"></div>
        <strong style="font-size: 11px; text-transform: uppercase;">Área de Bienestar Social</strong>
        <span style="font-size: 10px; color: #64748b;">Red de Salud Huánuco</span>
      </div>
    `;
    execCmd('insertHTML', htmlFirma);
  };

  return (
    <div className="w-full max-w-[210mm] sm:max-w-4xl mx-auto mb-3 sticky top-0 z-40 print:hidden bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800">
      
      {/* PESTAÑAS PLANAS ESTILO WORD DESKTOP (Sin tarjeta, sin gradientes) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-2 bg-slate-50 dark:bg-slate-950 text-xs">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setTabActiva('inicio')}
            className={`px-3 py-1.5 font-bold transition-all text-[11px] cursor-pointer border-b-2 ${
              tabActiva === 'inicio'
                ? 'border-[#185abd] text-[#185abd] dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Inicio
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('disposicion')}
            className={`px-3 py-1.5 font-bold transition-all text-[11px] cursor-pointer border-b-2 ${
              tabActiva === 'disposicion'
                ? 'border-[#185abd] text-[#185abd] dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Disposición
          </button>
          <button
            type="button"
            onClick={() => setTabActiva('insertar')}
            className={`px-3 py-1.5 font-bold transition-all text-[11px] cursor-pointer border-b-2 ${
              tabActiva === 'insertar'
                ? 'border-[#185abd] text-[#185abd] dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Insertar
          </button>
        </div>

        <div className="flex items-center gap-2 py-1 pr-1">
          <button
            type="button"
            onClick={toggleRegla}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
              reglaVisible 
                ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700' 
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title="Alternar Reglas de Word"
          >
            <Ruler className="w-3 h-3" />
            <span>Reglas {reglaVisible ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS PLANA (100% estilo cinta de Office) */}
      <div className="p-1.5 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-1.5 text-slate-800 dark:text-slate-200 text-xs overflow-x-auto">
        
        {/* PESTAÑA INICIO */}
        {tabActiva === 'inicio' && (
          <>
            {/* Historial */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('undo'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Deshacer (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('redo'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Rehacer (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

            {/* Fuente y Tamaño */}
            <div className="flex items-center gap-1">
              <select
                onChange={(e) => execCmd('fontName', e.target.value)}
                defaultValue="Arial, Helvetica, sans-serif"
                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[11px] font-medium rounded px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 focus:outline-blue-500 cursor-pointer w-28 sm:w-32"
                title="Fuente"
              >
                {fuentes.map((f, i) => (
                  <option key={i} value={f.value}>{f.label}</option>
                ))}
              </select>

              <select
                onChange={(e) => setExactFontSize(Number(e.target.value))}
                defaultValue="12"
                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[11px] font-bold rounded px-1 py-0.5 border border-slate-300 dark:border-slate-700 focus:outline-blue-500 cursor-pointer w-12"
                title="Tamaño (pt)"
              >
                {tamanosPt.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); changeFontSize('increase'); }}
                className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-[11px] cursor-pointer"
                title="Aumentar tamaño"
              >
                A+
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); changeFontSize('decrease'); }}
                className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-[11px] cursor-pointer"
                title="Reducir tamaño"
              >
                A-
              </button>
            </div>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

            {/* Estilos */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
                title="Negrita"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                title="Cursiva"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                title="Subrayado"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('strikeThrough'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                title="Tachado"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('subscript'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Subíndice"
              >
                <Subscript className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('superscript'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Superíndice"
              >
                <Superscript className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

            {/* Colores */}
            <div className="flex items-center gap-0.5">
              {/* Color Texto */}
              <div className="relative" ref={colorPickerRef}>
                <button
                  type="button"
                  onClick={() => setPaletaTextoAbierta(prev => !prev)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-0.5 cursor-pointer"
                  title="Color de Fuente"
                >
                  <div className="flex flex-col items-center">
                    <span className="font-serif font-black text-xs leading-none">A</span>
                    <div className="w-3 h-0.5 bg-red-600 rounded-full mt-0.5"></div>
                  </div>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                </button>

                {paletaTextoAbierta && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-300 dark:border-slate-700 z-50 grid grid-cols-4 gap-1.5 w-36">
                    {coloresTexto.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          execCmd('foreColor', c.color);
                          setPaletaTextoAbierta(false);
                        }}
                        className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Resaltador */}
              <div className="relative" ref={highlightPickerRef}>
                <button
                  type="button"
                  onClick={() => setPaletaResaltadoAbierta(prev => !prev)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-0.5 cursor-pointer"
                  title="Resaltado"
                >
                  <div className="flex flex-col items-center">
                    <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                    <div className="w-3 h-0.5 bg-yellow-400 rounded-full mt-0.5"></div>
                  </div>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                </button>

                {paletaResaltadoAbierta && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-300 dark:border-slate-700 z-50 grid grid-cols-3 gap-1.5 w-32">
                    {coloresResaltador.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (c.color === 'transparent') {
                            execCmd('removeFormat');
                          } else {
                            if (!document.execCommand('hiliteColor', false, c.color)) {
                              document.execCommand('backColor', false, c.color);
                            }
                          }
                          setPaletaResaltadoAbierta(false);
                        }}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-[9px] font-bold"
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      >
                        {c.color === 'transparent' ? '✕' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrar formato */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer"
                title="Borrar formato"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

            {/* Párrafo */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Alinear a la izquierda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Centrar"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Alinear a la derecha"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('justifyFull'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Justificar"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>

              {/* Interlineado */}
              <div className="relative" ref={spacingPickerRef}>
                <button
                  type="button"
                  onClick={() => setMenuInterlineadoAbierto(prev => !prev)}
                  className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                  title="Interlineado"
                >
                  <span>1.5</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>

                {menuInterlineadoAbierto && (
                  <div className="absolute top-full left-0 mt-1 p-1 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-300 dark:border-slate-700 z-50 flex flex-col gap-0.5 w-24">
                    {['1.0', '1.15', '1.5', '2.0'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLineSpacing(val)}
                        className="px-2 py-0.5 text-left text-xs rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 font-medium cursor-pointer"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Viñetas"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Numeración"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('outdent'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Disminuir sangría"
              >
                <Outdent className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd('indent'); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Aumentar sangría"
              >
                <Indent className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* PESTAÑA DISPOSICIÓN */}
        {tabActiva === 'disposicion' && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold text-[11px]">Márgenes:</span>
              <button
                type="button"
                onClick={() => setMarginPreset(2.5, 2.0)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                  margenIzqCm === 2.5 && margenDerCm === 2.0
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                Normal (2.5 / 2.0 cm)
              </button>
              <button
                type="button"
                onClick={() => setMarginPreset(1.27, 1.27)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                  margenIzqCm === 1.27 && margenDerCm === 1.27
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                Estrecho (1.27 cm)
              </button>
              <button
                type="button"
                onClick={() => setMarginPreset(1.9, 1.9)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                  margenIzqCm === 1.9 && margenDerCm === 1.9
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                Moderado (1.9 cm)
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              <span>Izq: <strong className="text-blue-600">{margenIzqCm.toFixed(1)}cm</strong></span>
              <span>•</span>
              <span>Der: <strong className="text-blue-600">{margenDerCm.toFixed(1)}cm</strong></span>
            </div>
          </div>
        )}

        {/* PESTAÑA INSERTAR */}
        {tabActiva === 'insertar' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={insertarFecha}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Calendar className="w-3 h-3 text-blue-500" />
              <span>Fecha Actual</span>
            </button>

            <button
              type="button"
              onClick={insertarLineaDivisoria}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Minus className="w-3 h-3 text-slate-500" />
              <span>Línea Divisoria</span>
            </button>

            <button
              type="button"
              onClick={insertarSaltoDePagina}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <CornerDownLeft className="w-3 h-3 text-indigo-500" />
              <span>Salto de Página</span>
            </button>

            <button
              type="button"
              onClick={insertarBloqueFirma}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Firma y Sello</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
