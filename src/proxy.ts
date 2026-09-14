import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // Si alguien no logueado intenta entrar, envíalo aquí
  },
});

// El "matcher" define a qué rutas se les pone el candado
export const config = {
  matcher: [
    "/inicio",
    "/salud",
    "/maternidad",
    "/paternidad",
    // Protege todas las rutas excepto el login y los archivos estáticos de Next.js
    "/((?!login|api|_next/static|_next/image|favicon.ico).*)",
  ],
};

