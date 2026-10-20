"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Si ya tiene sesión activa, redirigir automáticamente al dashboard
  useEffect(() => {
    if (status === "authenticated") {
      window.location.href = "/inicio";
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        dni,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else if (result?.ok) {
        // Usar window.location.href asegura que las cookies de sesión se confirmen en WebViews de Android
        window.location.href = "/inicio";
      } else {
        setError("No se pudo iniciar sesión. Verifica tus credenciales.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("[Login] Error al iniciar sesión:", err);
      setError(err?.message || "Error de conexión al servidor");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Contenedor central con las bolitas decorativas en el fondo */}
      <div className="relative w-full max-w-[780px] my-auto">
        
        {/* Bolita 1: Superior Derecha */}
        <img 
          src="/images/bolitas-login1.png" 
          alt="" 
          aria-hidden="true"
          className="absolute -top-16 -right-16 sm:-top-20 sm:-right-20 w-64 sm:w-80 md:w-96 pointer-events-none select-none z-0 opacity-90"
        />

        {/* Bolita 2: Inferior Izquierda */}
        <img 
          src="/images/bolitas-login2.png" 
          alt="" 
          aria-hidden="true"
          className="absolute -bottom-8 -left-10 sm:-bottom-10 sm:-left-12 w-32 sm:w-40 pointer-events-none select-none z-0 opacity-90"
        />

        {/* TARJETA DE LOGIN */}
        <div className="relative z-10 w-full bg-white rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[400px] border border-slate-100">
          
          {/* COLUMNA IZQUIERDA: Panel Azul con Logo */}
          <div className="w-full md:w-[44%] bg-[#2575e6] text-white flex flex-col items-center justify-between p-7 sm:p-8 relative overflow-hidden select-none">
            
            {/* Curva decorativa sutil en la parte inferior */}
            <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-white/10 pointer-events-none" />
            
            {/* Logo Circular Centrado */}
            <div className="my-auto flex flex-col items-center justify-center relative z-10 py-4">
              <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-white/15 flex items-center justify-center p-3 relative shadow-inner">
                <img 
                  src="/images/logo-red-huanuco.png" 
                  alt="Logo Red de Salud Huánuco" 
                  className="w-full h-full object-contain filter contrast-125 brightness-75 drop-shadow-xs"
                />
              </div>
            </div>

            {/* Texto inferior */}
            <div className="w-full text-center relative z-10 mt-auto pt-2">
              <span className="text-[10px] sm:text-[11px] text-white/90 font-medium tracking-widest uppercase">
                RED DE SALUD HCO
              </span>
            </div>
          </div>

          {/* COLUMNA DERECHA: Formulario de Inicio de Sesión */}
          <div className="w-full md:w-[58%] bg-white p-7 sm:p-10 md:p-12 flex flex-col justify-center">
            
            <h1 className="text-2xl sm:text-[26px] font-semibold text-[#1e293b] mb-6 tracking-tight">
              Iniciar Sesión
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              
              {/* Campo: Nombre de Usuario */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="w-full border border-slate-200 rounded-xs px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-[#2575e6] focus:ring-1 focus:ring-[#2575e6] transition-all"
                />
              </div>

              {/* Campo: Contraseña + Botón de Ver */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Contraseña
                </label>
                <div className="flex items-center border border-slate-200 rounded-xs overflow-hidden bg-white focus-within:border-[#2575e6] focus-within:ring-1 focus-within:ring-[#2575e6] transition-all">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm text-slate-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2 text-slate-400 hover:text-slate-600 border-l border-slate-200 bg-white transition-colors cursor-pointer flex items-center justify-center"
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de Error */}
              {error && (
                <div className="p-2 rounded bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Botón Iniciar Sesión */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2575e6] hover:bg-[#1d65cc] text-white py-2.5 px-4 rounded-xs text-sm font-semibold transition-colors disabled:opacity-60 shadow-xs cursor-pointer flex items-center justify-center"
                >
                  {loading ? "Iniciando..." : "Iniciar Sesión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
