'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Cliente = { id: string; numero: string; razonSocial: string; cuit?: string; localidad?: string };

export default function DashboardPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('base2.token');
    if (!token) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(localStorage.getItem('base2.user') || 'null'));
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setClientes(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [router]);

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand rounded text-white flex items-center justify-center font-bold">B2</div>
          <h1 className="font-semibold">Backoffice DDD</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{user?.username}</span>
          <button onClick={logout} className="text-red-600">Cerrar sesion</button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Clientes</h2>
        </div>

        {loading ? (
          <div>Cargando…</div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-sm text-slate-600">
                <tr>
                  <th className="p-3">N°</th>
                  <th className="p-3">Razon social</th>
                  <th className="p-3">CUIT</th>
                  <th className="p-3">Localidad</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Sin clientes. Ejecuta el seed: <code>pnpm --filter @base2/db seed</code>
                    </td>
                  </tr>
                )}
                {clientes.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.numero}</td>
                    <td className="p-3 font-medium">{c.razonSocial}</td>
                    <td className="p-3 text-slate-600">{c.cuit || '—'}</td>
                    <td className="p-3 text-slate-600">{c.localidad || '—'}</td>
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
