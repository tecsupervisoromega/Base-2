'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

type Plano = {
  id: string;
  nombre: string;
  archivoUrl: string;
  tipo: string;
  ancho?: number | null;
  alto?: number | null;
  activo: boolean;
};

type PuntoControl = {
  id: string;
  codigo: string;
  x?: number | null;
  y?: number | null;
  planoId?: string | null;
  detalleUbicacion?: string | null;
  tipo: { id: string; nombre: string; color?: string | null; codigo: string };
  zona?: { nombre: string } | null;
};

type PlanoDetalle = Plano & { puntosControl: PuntoControl[] };

type Sede = {
  id: string;
  nombre: string;
  direccion?: string;
  clienteId: string;
  cliente?: { razonSocial: string };
};

export default function PlanoSedePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [sede, setSede] = useState<Sede | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoActivo, setPlanoActivo] = useState<PlanoDetalle | null>(null);
  const [todosPuntos, setTodosPuntos] = useState<PuntoControl[]>([]);
  const [puntos, setPuntos] = useState<PuntoControl[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/login');
      return;
    }
    cargarTodo().catch((e) => setErr(e.message));
  }, [params.id, router]);

  async function cargarTodo() {
    const [s, ps, pcs] = await Promise.all([
      apiGet<Sede>(`/api/v1/sedes/${params.id}`),
      apiGet<Plano[]>(`/api/v1/planos?sedeId=${params.id}`),
      apiGet<PuntoControl[]>(`/api/v1/puntos-control?sedeId=${params.id}`),
    ]);
    setSede(s);
    setPlanos(ps);
    setTodosPuntos(pcs);
    const primero = ps.find((p) => p.activo) ?? ps[0];
    if (primero) await seleccionarPlano(primero.id, pcs);
    else {
      setPlanoActivo(null);
      setPuntos([]);
    }
  }

  async function seleccionarPlano(planoId: string, catalogo?: PuntoControl[]) {
    const full = await apiGet<PlanoDetalle>(`/api/v1/planos/${planoId}`);
    setPlanoActivo(full);
    const source = catalogo ?? todosPuntos;
    setPuntos(source.map((p) => ({ ...p })));
    setDirty(false);
  }

  function onImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  }

  // coords reales (naturalWidth x naturalHeight) relativos al evento
  function coordsFromEvent(e: React.PointerEvent): { x: number; y: number } | null {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const sx = img.naturalWidth / rect.width;
    const sy = img.naturalHeight / rect.height;
    return {
      x: Math.max(0, Math.min(img.naturalWidth, (e.clientX - rect.left) * sx)),
      y: Math.max(0, Math.min(img.naturalHeight, (e.clientY - rect.top) * sy)),
    };
  }

  function onPointerDownPunto(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
  }
  function onPointerMovePunto(e: React.PointerEvent) {
    if (!dragging) return;
    const pt = coordsFromEvent(e);
    if (!pt) return;
    setPuntos((arr) =>
      arr.map((p) =>
        p.id === dragging ? { ...p, x: pt.x, y: pt.y, planoId: planoActivo?.id ?? null } : p,
      ),
    );
    setDirty(true);
  }
  function onPointerUpPunto() {
    setDragging(null);
  }

  // Doble-click en la imagen para asignar un punto suelto en esa posicion
  function onImgDoubleClick(e: React.MouseEvent) {
    const sueltos = puntos.filter((p) => !p.planoId || p.planoId !== planoActivo?.id);
    if (sueltos.length === 0 || !planoActivo) return;
    const id = sueltos[0].id;
    const img = imgRef.current!;
    const rect = img.getBoundingClientRect();
    const sx = img.naturalWidth / rect.width;
    const sy = img.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    setPuntos((arr) =>
      arr.map((p) => (p.id === id ? { ...p, x, y, planoId: planoActivo.id } : p)),
    );
    setDirty(true);
  }

  function quitarDelPlano(id: string) {
    setPuntos((arr) => arr.map((p) => (p.id === id ? { ...p, planoId: null } : p)));
    setDirty(true);
  }

  async function guardar() {
    if (!planoActivo) return;
    setSaving(true);
    setErr(null);
    try {
      const payload = puntos
        .filter((p) => p.planoId === planoActivo.id || p.planoId === null)
        .map((p) => ({
          id: p.id,
          x: Number(p.x ?? 0),
          y: Number(p.y ?? 0),
          planoId: p.planoId ?? null,
        }));
      await apiPatch(`/api/v1/planos/${planoActivo.id}/posiciones`, { puntos: payload });
      setDirty(false);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function subirPlano(file: File, nombre: string) {
    setUploading(true);
    setErr(null);
    try {
      const pre = await apiPost<{ uploadUrl: string; publicUrl: string }>(`/api/v1/storage/presign`, {
        prefix: `planos/${params.id}`,
        filename: file.name,
        contentType: file.type || 'image/png',
      });
      await fetch(pre.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/png' },
        body: file,
      });
      // Leer dimensiones
      const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = URL.createObjectURL(file);
      });
      const nuevo = await apiPost<Plano>(`/api/v1/planos`, {
        sedeId: params.id,
        nombre: nombre || file.name,
        archivoUrl: pre.publicUrl,
        tipo: 'imagen',
        ancho: w,
        alto: h,
        activo: planos.length === 0,
      });
      await cargarTodo();
      await seleccionarPlano(nuevo.id);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function borrarPlano(id: string) {
    if (!confirm('Borrar este plano? Los puntos asociados quedaran sin plano.')) return;
    try {
      await apiDelete(`/api/v1/planos/${id}`);
      await cargarTodo();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const sueltos = useMemo(
    () => puntos.filter((p) => !p.planoId || p.planoId !== planoActivo?.id),
    [puntos, planoActivo],
  );
  const asignados = useMemo(
    () => puntos.filter((p) => p.planoId === planoActivo?.id),
    [puntos, planoActivo],
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
            ← Backoffice
          </Link>
          <h1 className="font-semibold">Plano de sede</h1>
          {sede && (
            <div className="text-xs text-slate-500">
              {sede.nombre} · {sede.cliente?.razonSocial ?? ''}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
              Cambios sin guardar
            </span>
          )}
          <button
            onClick={guardar}
            disabled={!dirty || saving || !planoActivo}
            className="bg-brand text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar posiciones'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 p-4">
        {/* Sidebar planos + sueltos */}
        <aside className="col-span-3 space-y-4">
          <section className="bg-white border rounded p-3 space-y-2">
            <div className="font-semibold text-sm">Planos</div>
            {planos.length === 0 && (
              <div className="text-xs text-slate-500">Sin planos todavia. Subi uno abajo.</div>
            )}
            {planos.map((p) => (
              <div
                key={p.id}
                className={
                  'flex items-center justify-between gap-2 text-sm rounded px-2 py-1 ' +
                  (planoActivo?.id === p.id ? 'bg-brand/10 text-brand' : 'hover:bg-slate-100')
                }
              >
                <button className="flex-1 text-left truncate" onClick={() => seleccionarPlano(p.id)}>
                  {p.nombre}
                </button>
                <button
                  onClick={() => borrarPlano(p.id)}
                  className="text-xs text-red-600"
                  title="Borrar"
                >
                  ×
                </button>
              </div>
            ))}

            <label className="block mt-3 border-2 border-dashed border-slate-300 rounded p-3 text-center text-xs text-slate-500 hover:bg-slate-50 cursor-pointer">
              {uploading ? 'Subiendo…' : 'Subir imagen del plano'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const nombre = prompt('Nombre del plano:', f.name) ?? f.name;
                    subirPlano(f, nombre);
                  }
                }}
              />
            </label>
          </section>

          <section className="bg-white border rounded p-3">
            <div className="font-semibold text-sm mb-2">
              Puntos sin posicionar ({sueltos.length})
            </div>
            <div className="text-xs text-slate-500 mb-2">
              Doble-clic en el plano para colocar el proximo.
            </div>
            <ul className="space-y-1 text-sm max-h-64 overflow-y-auto">
              {sueltos.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: p.tipo.color ?? '#64748b' }}
                  />
                  <span className="font-mono text-xs">{p.codigo}</span>
                  <span className="text-xs text-slate-500 truncate">{p.tipo.nombre}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* Canvas del plano */}
        <section className="col-span-9 bg-white border rounded p-2 overflow-auto">
          {err && <div className="text-red-600 text-sm p-2">{err}</div>}
          {!planoActivo && !err && (
            <div className="text-slate-400 p-10 text-center">
              Subi y selecciona un plano para posicionar los puntos de control.
            </div>
          )}
          {planoActivo && (
            <div
              ref={containerRef}
              className="relative inline-block select-none"
              onPointerMove={onPointerMovePunto}
              onPointerUp={onPointerUpPunto}
            >
              <img
                ref={imgRef}
                src={planoActivo.archivoUrl}
                onLoad={onImgLoad}
                onDoubleClick={onImgDoubleClick}
                alt={planoActivo.nombre}
                className="max-w-full block"
                draggable={false}
              />
              {imgSize.w > 0 &&
                asignados.map((p) => {
                  const rect = imgRef.current?.getBoundingClientRect();
                  const w = rect?.width ?? imgSize.w;
                  const h = rect?.height ?? imgSize.h;
                  const left = ((p.x ?? 0) / imgSize.w) * w;
                  const top = ((p.y ?? 0) / imgSize.h) * h;
                  return (
                    <div
                      key={p.id}
                      onPointerDown={(e) => onPointerDownPunto(e, p.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        quitarDelPlano(p.id);
                      }}
                      title={`${p.codigo} — ${p.tipo.nombre} (doble-clic para sacar del plano)`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                      style={{ left, top }}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: p.tipo.color ?? '#64748b' }}
                      >
                        {p.codigo.replace(/^[A-Z-]+/, '').slice(0, 3)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
