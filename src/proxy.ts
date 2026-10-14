import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // Si alguien no logueado intenta entrar, envíalo aquí
  },
});

// El "matcher" define a qué rutas se les pone el candado
export const config = {
  matcher: [
    // Protege rutas de la aplicación excepto login, api, recursos estáticos, imágenes y uploads
    "/((?!login|api|_next/static|_next/image|favicon.ico|images|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)",
  ],
};

