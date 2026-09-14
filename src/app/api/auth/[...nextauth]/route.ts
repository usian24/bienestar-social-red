import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/core/db/prisma";
// import bcrypt from "bcryptjs"; // Lo usaremos pronto cuando encriptemos las contraseñas

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        dni: { label: "Usuario (DNI)", type: "text" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.dni || !credentials?.password) return null;
        
        // 1. Buscamos al usuario en la base de datos por su DNI
        const user = await prisma.usuario.findUnique({
          where: { dni: credentials.dni }
        });
        
        if (!user) throw new Error("Usuario no encontrado");
        
        // 2. Comparamos la contraseña (por ahora texto plano, luego pondremos bcrypt)
        const isPasswordValid = credentials.password === user.passwordHash;
        
        if (!isPasswordValid) throw new Error("Contraseña incorrecta");
        
        // 3. Si todo está bien, dejamos pasar al usuario y guardamos sus datos en la sesión
        return { 
            id: user.id, 
            name: user.nombres, 
            email: user.dni, // NextAuth pide email por defecto, usaremos el DNI aquí internamente
        };
      }
    })
  ],
  pages: {
    signIn: '/login', // Le decimos a NextAuth dónde está nuestra pantalla de login personalizada
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

