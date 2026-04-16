import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Base-2 DDD — Gestion',
  description: 'Plataforma de gestion para empresas de control de plagas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
