import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigimos automáticamente al inicio del sistema
  redirect('/inicio');
}

