'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

type Cliente = {
  id: string;
  numero: string;
  razonSocial: string;
  cuit?: string;
  localidad?: string;
  provincia?: string;
  email?: string;
  telefono?: string;
  estado?: string;
};

const EMPTY: Omit<Cliente, 'id'> = {
  numero: '',
  razonSocial: '',
  cuit: '',
  localidad: '',
  provincia: '',
  email: '',
  telefono: '',
  estado: 'activo',
};

export default function DashboardPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; cliente: Cliente | null }>({
    open: false,
    cliente: null,
  });
  const [form, setForm] = useState<Omit<Cliente, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(localStorage.getItem('base2.user') || 'null'));
    cargar();
  }, [router]);

  async function cargar(busqueda = '') {
    setLoading(true);
    try {
      const data = await apiGet<Cliente[]>(`/api/v1/clientes${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ''}`);
      setClientes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    cargar(q);
  }

  function abrirNuevo() {
    setForm(EMPTY);
    setErr(null);
    setModal({ open: true, cliente: null });
  }

  function abrirEditar(c: Cliente) {
    setForm({ ...c });
    setErr(null);
    setModal({ open: true, cliente: c });
  }

  async function guardar() {
    setSaving(true);
    setErr(null);
    try {
      if (modal.cliente) {
        await apiPatch(`/api/v1/clientes/${modal.cliente.id}`, form);
      } else {
        await apiPost('/api/v1/clientes', form);
      }
      setModal({ open: false, cliente: null });
      await cargar(q);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(c: Cliente) {
    if (!confirm(`Eliminar cliente ${c.razonSocial}?`)) return;
    try {
      await apiDelete(`/api/v1/clientes/${c.id}`);
      await cargar(q);
    } catch (e: any) {
      alert(e.message);
    }
  }

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand rounded text-white flex items-center justify-center font-bold text-sm">
            B2
          </div>
          <h1 className="font-semibold">Backoffice DDD</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/dashboard" className="text-brand font-medium">Clientes</a>
          <a href="/sedes" className="text-slate-700 hover:text-brand">Sedes / Planos</a>
          <a href="/ordenes-trabajo" className="text-slate-700 hover:text-brand">Órdenes de trabajo</a>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">{user?.username}</span>
          <button onClick={logout} className="text-red-600">Cerrar sesión</button>
        </nav>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-bold">Clientes</h2>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <form onSubmit={buscar} className="flex gap-2 flex-1">
              <input
                className="border rounded px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Buscar por nombre, CUIT..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" className="bg-slate-100 border px-3 py-1.5 rounded text-sm hover:bg-slate-200">
                Buscar
              </button>
            </form>
            <button
              onClick={abrirNuevo}
              className="bg-brand text-white px-4 py-1.5 rounded text-sm font-medium whitespace-nowrap"
            >
              + Nuevo cliente
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Cargando…</div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-3">N°</th>
                  <th className="p-3">Razón social</th>
                  <th className="p-3">CUIT</th>
                  <th className="p-3">Localidad</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Sin clientes.{' '}
                      <button onClick={abrirNuevo} className="text-brand hover:underline">
                        Crear el primero
                      </button>
                    </td>
                  </tr>
                )}
                {clientes.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 text-slate-500 font-mono text-xs">{c.numero}</td>
                    <td className="p-3 font-medium">{c.razonSocial}</td>
                    <td className="p-3 text-slate-600">{c.cuit || '—'}</td>
                    <td className="p-3 text-slate-600">
                      {c.localidad || '—'}{c.provincia ? `, ${c.provincia}` : ''}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.estado === 'activo'
                            ? 'bg-green-100 text-green-700'
                            : c.estado === 'inactivo'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {c.estado ?? 'activo'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="text-brand text-xs hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(c)}
                        className="text-red-500 text-xs hover:underline"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">
                {modal.cliente ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button
                onClick={() => setModal({ open: false, cliente: null })}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-3">
              {err && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                  {err}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-600">N° cliente *</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-600">Estado</span>
                  <select
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    value={form.estado ?? 'activo'}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="potencial">Potencial</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-slate-600">Razón social *</span>
                <input
                  className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  value={form.razonSocial}
                  onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-600">CUIT</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    placeholder="20-12345678-9"
                    value={form.cuit ?? ''}
                    onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-600">Teléfono</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    value={form.telefono ?? ''}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-slate-600">Email</span>
                <input
                  type="email"
                  className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-600">Localidad</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    value={form.localidad ?? ''}
                    onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-600">Provincia</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    value={form.provincia ?? ''}
                    onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setModal({ open: false, cliente: null })}
                className="px-4 py-2 text-sm rounded border hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving || !form.numero || !form.razonSocial}
                className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-50"
              >
                {saving ? 'Guardando…' : modal.cliente ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
