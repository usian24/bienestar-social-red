import React, { useState } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  RemoveFormatting, Indent, Outdent, ChevronRight, PenTool, X 
} from 'lucide-react';

export default function EditorToolbar() {
  const [estaExpandido, setEstaExpandido] = useState(false);

  const execCmd = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
  };

  const changeFontSize = (action: 'increase' | 'decrease') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Obtener el tamaño actual aproximado
    const parent = selection.anchorNode?.parentElement;
    if (!parent) return;
    
    const style = window.getComputedStyle(parent);
    let currentSize = parseFloat(style.fontSize);
    if (isNaN(currentSize)) currentSize = 15; // tamaño base del documento
    
    // Calcular nuevo tamaño (+2px o -2px)
    const newSize = action === 'increase' ? currentSize + 2 : Math.max(8, currentSize - 2);

    // Envolver en <font size="7">
    document.execCommand('fontSize', false, '7');
    
    // Convertir font a píxeles reales
    const fonts = document.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
      font.removeAttribute('size');
      (font as HTMLElement).style.fontSize = `${newSize}px`;
    });
  };

  // Estado contraído: Botón flotante discreto
  if (!estaExpandido) {
    return (
      <button 
        type="button"
        onClick={() => setEstaExpandido(true)}
        className="fixed right-3 bottom-24 md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-[#1e293b] hover:bg-blue-600 text-white px-3.5 py-3 rounded-full shadow-2xl flex items-center gap-2 z-50 print:hidden transition-all duration-300 border-2 border-blue-500/80 active:scale-95 group cursor-pointer"
        title="Abrir Barra de Formato de Texto"
      >
        <PenTool className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
        <span className="text-xs font-semibold tracking-wide pr-1">Formato</span>
      </button>
    );
  }

  // Estado expandido: Barra completa con botón de contraer
  return (
    <div className="fixed right-3 bottom-20 md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-slate-900 text-white p-2.5 rounded-2xl flex flex-col gap-2.5 items-center z-50 print:hidden shadow-2xl border-2 border-blue-500 w-16 max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
      
      {/* Botón para contraer */}
      <button 
        type="button"
        onClick={() => setEstaExpandido(false)}
        className="w-full flex flex-col items-center justify-center p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
        title="Contraer Barra de Formato"
      >
        <ChevronRight className="w-4 h-4" />
        <span className="text-[8px] uppercase tracking-tighter">Cerrar</span>
      </button>

      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
        Editor
      </div>
      
      <div className="flex flex-col gap-1 w-full bg-slate-800 rounded-md p-1 border border-slate-700">
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Negrita">
          <Bold className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Cursiva">
          <Italic className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Subrayado">
          <Underline className="w-4 h-4" />
        </button>
      </div>

      <div className="w-8 h-px bg-slate-700"></div>

      {/* Botones de tamaño de fuente */}
      <div className="flex flex-col gap-1 w-full bg-slate-800 rounded-md p-1 border border-slate-700">
        <button onMouseDown={(e) => { e.preventDefault(); changeFontSize('increase'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-xs font-bold items-center leading-none h-8 text-blue-400" title="Aumentar Tamaño">
          A+
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); changeFontSize('decrease'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-xs font-bold items-center leading-none h-8 text-blue-400" title="Reducir Tamaño">
          A-
        </button>
      </div>

      <div className="w-8 h-px bg-slate-700"></div>

      {/* Alineaciones */}
      <div className="flex flex-col gap-1 w-full bg-slate-800 rounded-md p-1 border border-slate-700">
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Alinear a la izquierda">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Centrar">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Alinear a la derecha">
          <AlignRight className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyFull'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Justificar">
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      <div className="w-8 h-px bg-slate-700"></div>

      {/* Sangría */}
      <div className="flex flex-col gap-1 w-full bg-slate-800 rounded-md p-1 border border-slate-700">
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('indent'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Aumentar Sangría">
          <Indent className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('outdent'); }} className="p-2 hover:bg-slate-700 transition-colors rounded flex justify-center text-slate-200 hover:text-white" title="Reducir Sangría">
          <Outdent className="w-4 h-4" />
        </button>
      </div>

      <div className="w-8 h-px bg-slate-700"></div>

      <button onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }} className="p-2 bg-red-950/60 text-red-300 hover:bg-red-800 rounded-md transition-colors flex justify-center w-full border border-red-800/50" title="Borrar Formato">
        <RemoveFormatting className="w-4 h-4" />
      </button>
    </div>
  );
}
