'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, authDownloadUrl } from '@/lib/api';

type Cliente = { id: string; razonSocial: string };
type Sede = { id: string; nombre: string; direccion?: string };
type Empleado = { id: string; nombre: string; apellidos?: string };
type OT = {
  id: string;
  numero: string;
  estado: string;
  estadoAsignacion: string;
  fechaBloqueo?: string;
  horaInicioBloqueo?: string;
  esDesinsectacion: boolean;
  esDesratizacion: boolean;
  esDesinfeccion: boolean;
  cliente: { id: string; razonSocial: string };
  sede: { id: string; nombre: string; direccion?: string };
  empleados: Array<{ empleado: { id: string; nombre: string }; esPrincipal: boolean }>;
};

const ESTADO_LABELS: Record<string, { label: string; cls: string }> = {
  creada: { label: 'Creada', cls: 'bg-slate-100 text-slate-600' },
  asignada: { label: 'Asignada', cls: 'bg-blue-100 text-blue-700' },
  en_curso: { label: 'En curso', cls: 'bg-yellow-100 text-yellow-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-green-100 text-green-700' },
  cancelada: { label: 'Cancelada', cls: 'bg-red-100 text-red-600' },
};

const HOY = new Date().toISOString().slice(0, 10);

export default function OrdenesTrabajoPage() {
  const router = useRouter();
  const [ots, setOts] = useState<OT[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [modalOT, setModalOT] = useState(false);
  const [form, setForm] = useState({
    clienteId: '',
    sedeId: '',
    lineaNegocioId: '',
    fechaBloqueo: HOY,
    esDesinsectacion: false,
    esDesratizacion: false,
    esDesinfeccion: false,
    numero: '',
  });
  const [lineasNegocio, setLineasNegocio] = useState<Array<{ id: string; nombre: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [sedesCliente, setSedesCliente] = useState<Sede[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/login');
      return;
    }
    cargarDatos();
  }, [router]);

  async function cargarDatos() {
    setLoading(true);
    setErr(null);
    try {
      const [otsData, clientesData, sedesData, empsData] = await Promise.all([
        apiGet<OT[]>('/api/v1/ordenes-trabajo'),
        apiGet<Cliente[]>('/api/v1/clientes'),
        apiGet<Sede[]>('/api/v1/sedes'),
        apiGet<Empleado[]>('/api/v1/empleados?tecnicos=true'),
      ]);
      setOts(Array.isArray(otsData) ? otsData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setSedes(Array.isArray(sedesData) ? sedesData : []);
      setEmpleados(Array.isArray(empsData) ? empsData : []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function cargarFiltrado() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroFecha) params.set('fecha', filtroFecha);
      const data = await apiGet<OT[]>(`/api/v1/ordenes-trabajo?${params}`);
      setOts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loading) cargarFiltrado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroFecha]);

  async function onClienteChange(clienteId: string) {
    setForm((f) => ({ ...f, clienteId, sedeId: '' }));
    if (!clienteId) {
      setSedesCliente([]);
      setLineasNegocio([]);
      return;
    }
    try {
      const c = await apiGet<any>(`/api/v1/clientes/${clienteId}`);
      setSedesCliente(c.sedes ?? []);
    } catch {
      setSedesCliente([]);
    }
  }

  async function crearOT() {
    setSaving(true);
    setFormErr(null);
    try {
      const payload = {
        ...form,
        lineaNegocioId: form.lineaNegocioId || undefined,
        estado: 'creada',
      };
      await apiPost('/api/v1/ordenes-trabajo', payload);
      setModalOT(false);
      await cargarFiltrado();
    } catch (e: any) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  const otsFiltradas = ots;

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
          <a href="/dashboard" className="text-slate-700 hover:text-brand">Clientes</a>
          <a href="/sedes" className="text-slate-700 hover:text-brand">Sedes / Planos</a>
          <a href="/ordenes-trabajo" className="text-brand font-medium">Órdenes de trabajo</a>
          <span className="text-slate-400">|</span>
          <button onClick={logout} className="text-red-600">Cerrar sesión</button>
        </nav>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-xl font-bold">Órdenes de trabajo</h2>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="creada">Creada</option>
              <option value="asignada">Asignada</option>
              <option value="en_curso">En curso</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <input
              type="date"
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            />

            {filtroFecha && (
              <button
                onClick={() => setFiltroFecha('')}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                ✕ fecha
              </button>
            )}

            <button
              onClick={() => setModalOT(true)}
              className="bg-brand text-white px-4 py-1.5 rounded text-sm font-medium whitespace-nowrap"
            >
              + Nueva OT
            </button>
          </div>
        </div>

        {err && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3 mb-4">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-slate-500 text-sm">Cargando…</div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-3">N° OT</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Sede</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Servicios</th>
                  <th className="p-3">Técnicos</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {otsFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      Sin órdenes de trabajo.
                    </td>
                  </tr>
                )}
                {otsFiltradas.map((ot) => {
                  const estado = ESTADO_LABELS[ot.estado] ?? { label: ot.estado, cls: 'bg-slate-100 text-slate-600' };
                  const servicios = [
                    ot.esDesinsectacion && 'Desinsec.',
                    ot.esDesratizacion && 'Desrat.',
                    ot.esDesinfeccion && 'Desinfec.',
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  const tecnicos = ot.empleados
                    .map((e) => `${e.empleado.nombre}${e.esPrincipal ? ' ★' : ''}`)
                    .join(', ');

                  return (
                    <tr key={ot.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs text-slate-700">{ot.numero}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estado.cls}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{ot.cliente?.razonSocial ?? '—'}</td>
                      <td className="p-3 text-slate-600">
                        {ot.sede?.nombre}
                        {ot.sede?.direccion ? (
                          <div className="text-xs text-slate-400">{ot.sede.direccion}</div>
                        ) : null}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {ot.fechaBloqueo
                          ? new Date(ot.fechaBloqueo).toLocaleDateString('es-AR')
                          : '—'}
                      </td>
                      <td className="p-3 text-slate-600 text-xs">{servicios || '—'}</td>
                      <td className="p-3 text-slate-600 text-xs">{tecnicos || '—'}</td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        {ot.estado === 'finalizada' && (
                          <a
                            href={authDownloadUrl(`/api/v1/ordenes-trabajo/${ot.id}/parte.pdf`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            PDF
                          </a>
                        )}
                        <Link
                          href={`/ordenes-trabajo/${ot.id}`}
                          className="text-brand text-xs hover:underline"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOT && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Nueva orden de trabajo</h3>
              <button
                onClick={() => setModalOT(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-3">
              {formErr && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                  {formErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-600">N° OT *</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-600">Fecha *</span>
                  <input
                    type="date"
                    className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    value={form.fechaBloqueo}
                    onChange={(e) => setForm({ ...form, fechaBloqueo: e.target.value })}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-slate-600">Cliente *</span>
                <select
                  className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  value={form.clienteId}
                  onChange={(e) => onClienteChange(e.target.value)}
                >
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-slate-600">Sede *</span>
                <select
                  className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  value={form.sedeId}
                  onChange={(e) => setForm({ ...form, sedeId: e.target.value })}
                  disabled={!form.clienteId}
                >
                  <option value="">— Seleccionar sede —</option>
                  {sedesCliente.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="border rounded p-3">
                <legend className="text-xs text-slate-600 px-1">Tipo de servicio</legend>
                <div className="flex gap-4 flex-wrap">
                  {[
                    { key: 'esDesinsectacion', label: 'Desinsectación' },
                    { key: 'esDesratizacion', label: 'Desratización' },
                    { key: 'esDesinfeccion', label: 'Desinfección' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form[key as keyof typeof form] as boolean}
                        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setModalOT(false)}
                className="px-4 py-2 text-sm rounded border hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearOT}
                disabled={saving || !form.numero || !form.clienteId || !form.sedeId}
                className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-50"
              >
                {saving ? 'Creando…' : 'Crear OT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
