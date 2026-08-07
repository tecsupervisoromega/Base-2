'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch, authDownloadUrl } from '@/lib/api';

type OTDetalle = {
  id: string;
  numero: string;
  estado: string;
  estadoAsignacion: string;
  fechaBloqueo?: string;
  horaInicioBloqueo?: string;
  horaInicioReal?: string;
  horaFinReal?: string;
  horaCierre?: string;
  esDesinsectacion: boolean;
  esDesratizacion: boolean;
  esDesinfeccion: boolean;
  personaFirmante?: string;
  dniFirmante?: string;
  firmaUrl?: string;
  notaPublica?: string;
  cliente: { id: string; razonSocial: string; cuit?: string; email?: string; telefono?: string };
  sede: { id: string; nombre: string; direccion?: string; localidad?: string };
  lineaNegocio?: { nombre: string };
  empleados: Array<{ empleado: { id: string; nombre: string; apellidos?: string }; esPrincipal: boolean }>;
  revisiones: Array<{
    id: string;
    estado: string;
    puntoControl: { codigo: string; tipo: { nombre: string } };
    hayIncidencia: boolean;
  }>;
};

const ESTADO_LABELS: Record<string, { label: string; cls: string }> = {
  creada: { label: 'Creada', cls: 'bg-slate-100 text-slate-600' },
  asignada: { label: 'Asignada', cls: 'bg-blue-100 text-blue-700' },
  en_curso: { label: 'En curso', cls: 'bg-yellow-100 text-yellow-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-green-100 text-green-700' },
  cancelada: { label: 'Cancelada', cls: 'bg-red-100 text-red-600' },
};

export default function OTDetallePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [ot, setOt] = useState<OTDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/login');
      return;
    }
    cargar();
  }, [params.id, router]);

  async function cargar() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGet<OTDetalle>(`/api/v1/ordenes-trabajo/${params.id}`);
      setOt(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function iniciar() {
    if (!confirm('¿Iniciar esta OT?')) return;
    setActualizando(true);
    try {
      await apiPatch(`/api/v1/ordenes-trabajo/${params.id}/iniciar`, {});
      await cargar();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActualizando(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Cargando…</div>
      </main>
    );
  }

  if (err || !ot) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600">{err ?? 'OT no encontrada'}</div>
      </main>
    );
  }

  const estado = ESTADO_LABELS[ot.estado] ?? { label: ot.estado, cls: 'bg-slate-100 text-slate-600' };
  const servicios = [
    ot.esDesinsectacion && 'Desinsectación',
    ot.esDesratizacion && 'Desratización',
    ot.esDesinfeccion && 'Desinfección',
  ]
    .filter(Boolean)
    .join(' · ');

  const tecnicos = ot.empleados
    .sort((a, b) => (b.esPrincipal ? 1 : -1))
    .map((e) => `${e.empleado.nombre} ${e.empleado.apellidos ?? ''}${e.esPrincipal ? ' ★' : ''}`)
    .join(', ');

  const incidencias = ot.revisiones?.filter((r) => r.hayIncidencia) ?? [];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div>
          <Link href="/ordenes-trabajo" className="text-xs text-slate-500 hover:underline">
            ← Órdenes de trabajo
          </Link>
          <h1 className="font-semibold">OT {ot.numero}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${estado.cls}`}>
            {estado.label}
          </span>
          {ot.estado === 'finalizada' && (
            <a
              href={authDownloadUrl(`/api/v1/ordenes-trabajo/${ot.id}/parte.pdf`)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded hover:bg-indigo-700"
            >
              Descargar parte PDF
            </a>
          )}
          {(ot.estado === 'creada' || ot.estado === 'asignada') && (
            <button
              onClick={iniciar}
              disabled={actualizando}
              className="bg-yellow-500 text-white text-sm px-4 py-1.5 rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {actualizando ? '…' : 'Iniciar OT'}
            </button>
          )}
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <section className="bg-white border rounded-lg p-4 space-y-2">
            <h2 className="font-semibold text-sm text-slate-700 mb-3">Cliente y sede</h2>
            <div>
              <div className="text-xs text-slate-500">Cliente</div>
              <div className="font-medium">{ot.cliente.razonSocial}</div>
              {ot.cliente.cuit && <div className="text-xs text-slate-500">CUIT {ot.cliente.cuit}</div>}
              {ot.cliente.email && <div className="text-xs text-slate-500">{ot.cliente.email}</div>}
            </div>
            <div>
              <div className="text-xs text-slate-500 mt-2">Sede</div>
              <div className="font-medium">{ot.sede.nombre}</div>
              <div className="text-xs text-slate-500">
                {ot.sede.direccion}{ot.sede.localidad ? `, ${ot.sede.localidad}` : ''}
              </div>
            </div>
          </section>

          <section className="bg-white border rounded-lg p-4 space-y-2">
            <h2 className="font-semibold text-sm text-slate-700 mb-3">Detalles</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-slate-500">Fecha</div>
                <div>
                  {ot.fechaBloqueo
                    ? new Date(ot.fechaBloqueo).toLocaleDateString('es-AR')
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Servicios</div>
                <div>{servicios || '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500">Técnicos</div>
                <div>{tecnicos || '—'}</div>
              </div>
              {ot.horaInicioReal && (
                <div>
                  <div className="text-xs text-slate-500">Inicio real</div>
                  <div>{new Date(ot.horaInicioReal).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              )}
              {ot.horaFinReal && (
                <div>
                  <div className="text-xs text-slate-500">Fin real</div>
                  <div>{new Date(ot.horaFinReal).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-sm text-slate-700 mb-3">
            Puntos de control revisados ({ot.revisiones?.length ?? 0})
            {incidencias.length > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {incidencias.length} incidencia{incidencias.length > 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {!ot.revisiones?.length ? (
            <div className="text-slate-500 text-sm">Sin revisiones aún.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {ot.revisiones.map((r) => (
                <div
                  key={r.id}
                  className={`border rounded p-2 text-xs flex items-start gap-2 ${
                    r.hayIncidencia ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${
                      r.hayIncidencia ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                  <div>
                    <div className="font-mono font-bold">{r.puntoControl.codigo}</div>
                    <div className="text-slate-500">{r.puntoControl.tipo?.nombre}</div>
                    <div className="text-slate-400">{r.estado}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {ot.estado === 'finalizada' && (
          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold text-sm text-slate-700 mb-3">Cierre</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {ot.personaFirmante && (
                <div>
                  <div className="text-xs text-slate-500">Firmante</div>
                  <div>{ot.personaFirmante}</div>
                </div>
              )}
              {ot.dniFirmante && (
                <div>
                  <div className="text-xs text-slate-500">DNI</div>
                  <div>{ot.dniFirmante}</div>
                </div>
              )}
              {ot.horaCierre && (
                <div>
                  <div className="text-xs text-slate-500">Fecha/hora cierre</div>
                  <div>{new Date(ot.horaCierre).toLocaleString('es-AR')}</div>
                </div>
              )}
              {ot.notaPublica && (
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Nota al cliente</div>
                  <div className="italic">{ot.notaPublica}</div>
                </div>
              )}
            </div>
            {ot.firmaUrl && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">Firma</div>
                <img
                  src={ot.firmaUrl}
                  alt="Firma"
                  className="border rounded max-h-24 bg-white"
                />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
