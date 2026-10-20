import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/core/db/prisma";
import bcrypt from "bcryptjs";
import { logger } from "@/core/logging/systemLogger";

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
          where: { dni: credentials.dni },
          include: { rol: true, microred: true }
        });
        
        if (!user || !user.activo) {
          await logger.advertencia('AUTH', 'LOGIN_FALLIDO', `Intento de acceso con DNI inexistente o inactivo: ${credentials.dni}`, {
            ruta: '/api/auth/signin'
          });
          throw new Error("Usuario no encontrado o inactivo");
        }
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        
        if (!isPasswordValid) {
          await logger.advertencia('AUTH', 'PASSWORD_INCORRECTO', `Contraseña incorrecta para el usuario: ${credentials.dni} (${user.nombres})`, {
            usuarioId: user.id,
            ruta: '/api/auth/signin'
          });
          throw new Error("Contraseña incorrecta");
        }

        await logger.info('AUTH', 'LOGIN_EXITOSO', `Inicio de sesión exitoso: ${user.nombres} ${user.apellidos} [${user.rol?.nombre || 'SIN_ROL'}]`, {
          usuarioId: user.id,
          ruta: '/api/auth/signin'
        });
        
        // Unificar los permisos del rol con los permisos excepcionales de este usuario
        const todosLosPermisos = Array.from(new Set([
          ...(user.rol?.permisos || []),
          ...(user.permisosExtra || [])
        ]));
        
        const microredNombre = user.microred?.nombre || (user.microredId ? `Microred #${user.microredId}` : 'SEDE CENTRAL');

        return { 
            id: user.id, 
            name: user.nombres + ' ' + user.apellidos, 
            email: user.dni,
            rol: user.rol?.nombre || 'VISUALIZADOR', // Fallback si no tiene rol
            permisos: todosLosPermisos,
            microredId: user.microredId?.toString(),
            microredNombre
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
        token.microredNombre = (user as any).microredNombre;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).rol = token.rol;
        (session.user as any).permisos = token.permisos || [];
        (session.user as any).microredId = token.microredId;
        (session.user as any).microredNombre = token.microredNombre;
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
  useSecureCookies: false,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

