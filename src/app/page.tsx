import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigimos automáticamente al módulo de salud
  redirect('/salud');
}

