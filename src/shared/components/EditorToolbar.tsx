import React from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, RemoveFormatting, Indent, Outdent } from 'lucide-react';

export default function EditorToolbar() {
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

    // Truco: usar execCommand('fontSize') para que el navegador resuelva
    // los nodos complejos (selecciones parciales, múltiples líneas, etc.)
    // Esto envuelve todo en <font size="7">
    document.execCommand('fontSize', false, '7');
    
    // Buscar esos font recién inyectados y convertirlos a tamaño en píxeles real
    const fonts = document.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
      font.removeAttribute('size');
      (font as HTMLElement).style.fontSize = `${newSize}px`;
    });
  };

  return (
    <div className="fixed right-4 top-110 -translate-y-1/2 bg-slate-800 text-white p-3 rounded-xl flex flex-col gap-4 items-center z-50 print:hidden shadow-2xl border-r-4 border-blue-500 w-16">
      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center mb-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
        Editor
      </div>
      
      <div className="flex flex-col gap-1 w-full bg-slate-700 rounded-md p-1">
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Negrita">
          <Bold className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Cursiva">
          <Italic className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Subrayado">
          <Underline className="w-4 h-4" />
        </button>
      </div>

      <div className="w-8 h-px bg-slate-600"></div>

      {/* Botones de tamaño de fuente */}
      <div className="flex flex-col gap-1 w-full bg-slate-700 rounded-md p-1">
        <button onMouseDown={(e) => { e.preventDefault(); changeFontSize('increase'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center text-sm font-bold items-center leading-none h-8" title="Aumentar Tamaño">
          A+
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); changeFontSize('decrease'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center text-sm font-bold items-center leading-none h-8" title="Reducir Tamaño">
          A-
        </button>
      </div>

      <div className="w-8 h-px bg-slate-600"></div>

      <div className="flex flex-col gap-1 w-full bg-slate-700 rounded-md p-1">
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Alinear a la izquierda">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Centrar">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Alinear a la derecha">
          <AlignRight className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyFull'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Justificar">
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      <div className="w-8 h-px bg-slate-600"></div>

      <div className="flex flex-col gap-1 w-full bg-slate-700 rounded-md p-1">
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('indent'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Aumentar Sangría">
          <Indent className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('outdent'); }} className="p-2 hover:bg-slate-600 transition-colors rounded flex justify-center" title="Reducir Sangría">
          <Outdent className="w-4 h-4" />
        </button>
      </div>

      <div className="w-8 h-px bg-slate-600"></div>

      <button onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }} className="p-2 bg-red-900/50 text-red-200 hover:bg-red-800 rounded-md transition-colors flex justify-center w-full" title="Borrar Formato">
        <RemoveFormatting className="w-4 h-4" />
      </button>
    </div>
  );
}
