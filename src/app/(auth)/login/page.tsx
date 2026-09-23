"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      dni,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/inicio");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-10 font-sans">
      
      {/* TARJETA GIGANTE CENTRAL */}
      <div className="relative w-full max-w-[1100px] h-[650px] bg-[#e1e5f8] rounded-[28px] shadow-2xl overflow-hidden flex flex-row">
        
        {/* DECORACIONES DENTRO DE LA TARJETA */}
        
        {/* 1. Círculo pequeño izquierdo */}
        <div className="absolute left-[7%] bottom-[18%] w-[45px] h-[45px] rounded-full border-[2.5px] border-[#9ba5d3] opacity-60 z-0"></div>
        
        {/* 2. Arco grande superior derecho */}
        <svg className="absolute right-[4%] top-[10%] w-[380px] h-[380px] opacity-80 z-0" viewBox="0 0 100 100">
          <path 
            d="M 10 50 A 40 40 0 1 1 82 72" 
            fill="none" 
            stroke="#5378ff" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
          />
        </svg>

        {/* 3. Círculo pequeño derecho (debajo del arco) */}
        <div className="absolute right-[16%] top-[58%] w-[55px] h-[55px] rounded-full border-[1.5px] border-[#a0aadd] opacity-50 z-0"></div>


        {/* CONTENIDO PRINCIPAL */}
        <div className="flex w-full h-full relative z-10 px-[10%]">
          
          {/* COLUMNA IZQUIERDA: Panel Azul */}
          <div className="w-[340px] h-full flex items-center justify-center relative">
            <div className="w-[310px] h-[500px] bg-[#4a72fa] relative rounded-[4px] overflow-hidden shadow-lg flex flex-col items-center justify-center">
              
              {/* Onda decorativa en el fondo del panel azul */}
              <div className="absolute -bottom-[20%] -left-[30%] w-[150%] h-[50%] bg-[#5d83fa] rounded-[50%] rotate-12 opacity-80"></div>
              
              <div className="w-[220px] h-[220px] relative mb-12 z-10">
                <Image 
                  src="/red-salud-logo.svg" 
                  alt="Logo Red de Salud Huánuco" 
                  fill
                  className="object-contain mix-blend-multiply opacity-90"
                />
              </div>
              <div className="absolute bottom-10 w-full text-center z-10">
                <h2 className="text-[#c1d1ff] text-[11px] tracking-[0.15em] font-medium uppercase">
                  RED DE SALUD HCO
                </h2>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Formulario */}
          <div className="flex-1 flex flex-col justify-center pl-[8%]">
            
            <h1 className="text-[34px] text-[#2c336b] mb-12 font-medium tracking-tight">
              Iniciar Sesión
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col w-[360px] space-y-12">
              
              {/* Input Usuario */}
              <div className="relative">
                <input
                  type="text"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="block w-full pb-2 bg-transparent border-0 border-b border-[#a0aadd] appearance-none focus:outline-none focus:ring-0 focus:border-[#4a72fa] text-[#2c336b] placeholder-[#8c94be] text-[14px]"
                  placeholder="Nombre de Usuario"
                />
              </div>

              {/* Input Contraseña + Ojito */}
              <div className="flex items-end gap-5 relative">
                <div className="w-full relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pb-2 bg-transparent border-0 border-b border-[#a0aadd] appearance-none focus:outline-none focus:ring-0 focus:border-[#4a72fa] text-[#2c336b] placeholder-[#8c94be] text-[14px]"
                    placeholder="Contraseña"
                  />
                </div>
                
                {/* Botón Ojito (Cuadrado con borde) */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="shrink-0 p-[9px] border border-[#a0aadd] rounded-[4px] text-[#8c94be] hover:text-[#4a72fa] hover:border-[#4a72fa] transition-colors focus:outline-none mb-0.5"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>

              {/* Mensaje de Error */}
              {error && (
                <div className="text-rose-500 text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Botón Iniciar Sesión */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-[calc(100%-3rem)] bg-[#5378ff] text-white py-[11px] rounded-[4px] text-[14px] font-medium hover:bg-blue-600 focus:outline-none transition-colors disabled:opacity-70 shadow-sm"
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
