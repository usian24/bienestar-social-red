import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/core/db/prisma";
import bcrypt from "bcryptjs";

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
        
        const user = await prisma.usuario.findUnique({
          where: { dni: credentials.dni }
        });
        
        if (!user || !user.activo) throw new Error("Usuario no encontrado o inactivo");
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        
        if (!isPasswordValid) throw new Error("Contraseña incorrecta");
        
        return { 
            id: user.id, 
            name: user.nombres + ' ' + user.apellidos, 
            email: user.dni,
            rol: user.rol,
            permisos: user.permisos,
            microredId: user.microredId?.toString()
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = (user as any).rol;
        token.permisos = (user as any).permisos;
        token.microredId = (user as any).microredId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).rol = token.rol;
        (session.user as any).permisos = token.permisos || [];
        (session.user as any).microredId = token.microredId;
        (session.user as any).id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

