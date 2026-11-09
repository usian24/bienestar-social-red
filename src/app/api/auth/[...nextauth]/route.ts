import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/core/db/prisma";
import bcrypt from "bcryptjs";
import { logger } from "@/core/logging/systemLogger";

const isHttps = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;

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
        
        if (!user.passwordHash || !(user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$'))) {
          await logger.advertencia('SEGURIDAD', 'HASH_INVALIDO', `Cuenta sin hash bcrypt válido intentó autenticarse: ${user.dni}`, {
            usuarioId: user.id,
            ruta: '/api/auth/signin'
          });
          throw new Error("Configuración de credenciales inválida. Contacte al administrador.");
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
    },
    async redirect({ url, baseUrl }) {
      // 1. Si la URL es relativa, construir una URL absoluta válida con baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        const parsedUrl = new URL(url);
        // 2. Permitir el mismo origen, localhost o cualquier IP de red local (LAN / Wi-Fi / USB)
        if (
          parsedUrl.origin === baseUrl ||
          parsedUrl.hostname === 'localhost' ||
          parsedUrl.hostname === '127.0.0.1' ||
          parsedUrl.hostname.startsWith('192.168.') ||
          parsedUrl.hostname.startsWith('172.') ||
          parsedUrl.hostname.startsWith('10.') ||
          parsedUrl.hostname.endsWith('.gob.pe')
        ) {
          // Si intentaba redirigir a /login o a la raíz, redirigir a /inicio en ese mismo origen
          if (parsedUrl.pathname === '/login' || parsedUrl.pathname === '/') {
            return `${parsedUrl.origin}/inicio`;
          }
          return url;
        }
      } catch {
        // Ignorar error de parsing
      }
      // 3. Fallback siempre con URL absoluta para evitar que new URL() falle en el navegador
      return `${baseUrl}/inicio`;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: isHttps,
  cookies: {
    sessionToken: {
      name: isHttps ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isHttps,
      },
    },
    callbackUrl: {
      name: isHttps ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: isHttps,
      },
    },
    csrfToken: {
      name: isHttps ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isHttps,
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

