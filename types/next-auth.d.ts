import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      rol: string;
      permisos: string[];
      microredId?: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    rol: string;
    permisos: string[];
    microredId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    rol: string;
    permisos: string[];
    microredId?: string | null;
  }
}
