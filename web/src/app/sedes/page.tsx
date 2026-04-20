'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type Sede = {
  id: string;
  nombre: string;
  direccion?: string;
  localidad?: string;
  clienteId: string;
  cliente?: { razonSocial: string };
};

export default function SedesPage() {
  const router = useRouter();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/login');
      return;
    }
    apiGet<Sede[]>('/api/v1/sedes')
      .then(setSedes)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
          ← Backoffice
        </Link>
        <h1 className="font-semibold">Sedes</h1>
      </header>
      <div className="p-6 max-w-6xl mx-auto">
        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
        {loading ? (
          <div>Cargando…</div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-sm text-slate-600">
                <tr>
                  <th className="p-3">Sede</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Direccion</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {sedes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Sin sedes. Corre el seed.
                    </td>
                  </tr>
                )}
                {sedes.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-medium">{s.nombre}</td>
                    <td className="p-3 text-slate-600">{s.cliente?.razonSocial ?? '—'}</td>
                    <td className="p-3 text-slate-600">
                      {s.direccion} {s.localidad ? `· ${s.localidad}` : ''}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/sedes/${s.id}/plano`}
                        className="text-brand text-sm hover:underline"
                      >
                        Editar plano →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
