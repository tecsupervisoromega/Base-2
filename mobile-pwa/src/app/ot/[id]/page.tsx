'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

type PuntoControl = {
  id: string;
  codigo: string;
  detalleUbicacion?: string;
  tipo: { id: string; codigo: string; nombre: string; color?: string; icono?: string };
  zona?: { nombre: string } | null;
  revisionActual: {
    id: string;
    estado: 'pendiente' | 'realizada' | 'inaccesible' | 'no_revisado';
    hayIncidencia: boolean;
  } | null;
};

type Odt = {
  id: string;
  numero: string;
  estado: string;
  esDesinsectacion?: boolean;
  esDesratizacion?: boolean;
  esDesinfeccion?: boolean;
  horaInicioBloqueo?: string;
  cliente: { razonSocial: string; telefono?: string };
  sede: { nombre: string; direccion: string };
};

export default function OrdenTrabajoDetalle({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [odt, setOdt] = useState<Odt | null>(null);
  const [puntos, setPuntos] = useState<PuntoControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/');
      return;
    }
    Promise.all([
      apiGet<Odt>(`/api/v1/ordenes-trabajo/${params.id}`),
      apiGet<PuntoControl[]>(`/api/v1/ordenes-trabajo/${params.id}/puntos-control`),
    ])
      .then(([o, p]) => {
        setOdt(o);
        setPuntos(p);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function iniciarOt() {
    if (!odt) return;
    try {
      const updated = await apiPatch<Odt>(`/api/v1/ordenes-trabajo/${odt.id}/iniciar`, {});
      setOdt(updated);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const total = puntos.length;
  const realizadas = puntos.filter((p) => p.revisionActual?.estado === 'realizada').length;
  const incidencias = puntos.filter((p) => p.revisionActual?.hayIncidencia).length;

  if (loading) {
    return <main className="p-4 text-slate-400">Cargando OT…</main>;
  }
  if (err || !odt) {
    return (
      <main className="p-4">
        <div className="text-red-400 text-sm">{err ?? 'OT no encontrada'}</div>
        <Link href="/mi-dia" className="text-brand underline text-sm">
          Volver a mi dia
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <Link href="/mi-dia" className="text-xs text-slate-400">
          ← Mi dia
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <div className="text-xs text-slate-400">OT {odt.numero}</div>
            <div className="font-semibold">{odt.cliente.razonSocial}</div>
            <div className="text-sm text-slate-300">{odt.sede.nombre}</div>
            <div className="text-xs text-slate-400">{odt.sede.direccion}</div>
          </div>
          <span
            className={
              'text-xs px-2 py-1 rounded ' +
              (odt.estado === 'en_curso' ? 'bg-yellow-700' : odt.estado === 'finalizada' ? 'bg-green-700' : 'bg-blue-700')
            }
          >
            {odt.estado}
          </span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {odt.esDesinsectacion && <span className="text-xs bg-amber-900 px-2 py-1 rounded">Desinsectacion</span>}
          {odt.esDesratizacion && <span className="text-xs bg-red-900 px-2 py-1 rounded">Desratizacion</span>}
          {odt.esDesinfeccion && <span className="text-xs bg-cyan-900 px-2 py-1 rounded">Desinfeccion</span>}
        </div>
      </header>

      <div className="p-4 space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-slate-800 rounded p-2">
            <div className="text-xs text-slate-400">Total</div>
            <div className="font-bold">{total}</div>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <div className="text-xs text-slate-400">Revisados</div>
            <div className="font-bold text-green-400">{realizadas}</div>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <div className="text-xs text-slate-400">Incidencias</div>
            <div className="font-bold text-red-400">{incidencias}</div>
          </div>
        </div>

        {odt.estado === 'asignada' && (
          <button
            onClick={iniciarOt}
            className="w-full bg-brand text-white rounded py-3 font-semibold"
          >
            Iniciar OT
          </button>
        )}

        <div className="space-y-2 mt-2">
          {puntos.length === 0 && (
            <div className="text-center text-slate-400 py-10">Sin puntos de control.</div>
          )}
          {puntos.map((p) => {
            const estado = p.revisionActual?.estado;
            const incidencia = p.revisionActual?.hayIncidencia;
            return (
              <Link
                key={p.id}
                href={`/ot/${odt.id}/punto/${p.id}`}
                className="block bg-slate-800 rounded-lg p-3 border border-slate-700 active:bg-slate-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: p.tipo.color ?? '#64748b' }}
                      />
                      <span className="font-mono text-sm">{p.codigo}</span>
                      <span className="text-xs text-slate-400 truncate">{p.tipo.nombre}</span>
                    </div>
                    {p.detalleUbicacion && (
                      <div className="text-xs text-slate-400 mt-1 truncate">
                        {p.detalleUbicacion}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {!estado && <span className="text-xs text-slate-500">pendiente</span>}
                    {estado === 'realizada' && (
                      <span className={`text-xs px-2 py-1 rounded ${incidencia ? 'bg-red-800' : 'bg-green-800'}`}>
                        {incidencia ? 'incidencia' : 'OK'}
                      </span>
                    )}
                    {estado === 'inaccesible' && (
                      <span className="text-xs bg-slate-600 px-2 py-1 rounded">inaccesible</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {odt.estado !== 'finalizada' && total > 0 && (
          <Link
            href={`/ot/${odt.id}/firmar`}
            className="fixed bottom-4 left-4 right-4 bg-green-600 text-white text-center rounded-lg py-3 font-semibold shadow-lg"
          >
            Firmar y cerrar OT ({realizadas}/{total})
          </Link>
        )}
      </div>
    </main>
  );
}
