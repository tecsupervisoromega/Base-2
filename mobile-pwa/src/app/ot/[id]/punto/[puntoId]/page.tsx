'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { mutateOrQueue } from '@/lib/sync';

type Pregunta = {
  id: string;
  codigo: string;
  textoPregunta: string;
  tipoRespuesta: 'boolean' | 'numerico' | 'texto' | 'opcion_unica' | 'opcion_multiple' | 'foto';
  orden: number;
  esPrincipal: boolean;
  esGraficable: boolean;
  valorPorDefecto?: string | null;
  opciones?: string[] | null;
};

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  nombreComercial?: string | null;
  materiaActiva?: string | null;
  registro?: string | null;
  unidadMedida?: string | null;
  dosificacion?: string | null;
};

type LineaProducto = {
  productoId: string;
  cantidad: number;
  unidadMedida?: string;
  lote?: string;
  fechaCaducidad?: string;
  dosificacion?: string;
  agenteACombatir?: string;
};

type Revision = {
  id: string;
  estado: string;
  estadoConservacion?: string | null;
  hayIncidencia: boolean;
  inaccesible: boolean;
  seCambiaElCebo: boolean;
  observaciones?: string | null;
  puntoControl: {
    id: string;
    codigo: string;
    detalleUbicacion?: string;
    tipo: { id: string; nombre: string; consumoDelCebo?: boolean };
  };
  respuestas: Array<{ preguntaId: string; codigoPregunta: string; respuesta?: string | null }>;
  productos: Array<LineaProducto & { producto: Producto }>;
  fotos: Array<{ id: string; url: string; descripcion?: string | null }>;
};

export default function RevisionPunto({ params }: { params: { id: string; puntoId: string } }) {
  const router = useRouter();
  const [revision, setRevision] = useState<Revision | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [lineas, setLineas] = useState<LineaProducto[]>([]);
  const [obs, setObs] = useState('');
  const [conservacion, setConservacion] = useState<string>('bueno');
  const [incidencia, setIncidencia] = useState(false);
  const [inaccesible, setInaccesible] = useState(false);
  const [cambiaCebo, setCambiaCebo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/');
      return;
    }
    (async () => {
      try {
        const lat = await getPosition();
        const iniciada = await apiPost<{ id: string }>('/api/v1/revisiones/iniciar', {
          odtId: params.id,
          puntoControlId: params.puntoId,
          lat: lat?.latitude,
          lng: lat?.longitude,
        });
        const full = await apiGet<Revision>(`/api/v1/revisiones/${iniciada.id}`);
        const [preg, prods] = await Promise.all([
          apiGet<Pregunta[]>(
            `/api/v1/preguntas-revision?tipoPuntoControlId=${full.puntoControl.tipo.id}`,
          ).catch(() => [] as Pregunta[]),
          apiGet<Producto[]>('/api/v1/productos/catalogo').catch(() => [] as Producto[]),
        ]);
        setRevision(full);
        setPreguntas(preg);
        setProductos(prods);
        setObs(full.observaciones ?? '');
        setConservacion(full.estadoConservacion ?? 'bueno');
        setIncidencia(full.hayIncidencia);
        setInaccesible(full.inaccesible);
        setCambiaCebo(full.seCambiaElCebo);
        const map: Record<string, string> = {};
        for (const r of full.respuestas) map[r.preguntaId] = r.respuesta ?? '';
        // valores por defecto si no respondio todavia
        for (const p of preg) {
          if (map[p.id] === undefined && p.valorPorDefecto) map[p.id] = p.valorPorDefecto;
        }
        setRespuestas(map);
        setLineas(
          full.productos.map((lp) => ({
            productoId: lp.productoId,
            cantidad: Number(lp.cantidad),
            unidadMedida: lp.unidadMedida ?? undefined,
            lote: lp.lote ?? undefined,
            fechaCaducidad: lp.fechaCaducidad ?? undefined,
            dosificacion: lp.dosificacion ?? undefined,
            agenteACombatir: lp.agenteACombatir ?? undefined,
          })),
        );
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, params.puntoId, router]);

  const principales = useMemo(() => preguntas.filter((p) => p.esPrincipal), [preguntas]);
  const secundarias = useMemo(() => preguntas.filter((p) => !p.esPrincipal), [preguntas]);

  function setResp(preguntaId: string, value: string) {
    setRespuestas((r) => ({ ...r, [preguntaId]: value }));
  }

  function toggleOpcionMultiple(preguntaId: string, opt: string) {
    const cur = (respuestas[preguntaId] ?? '').split('|').filter(Boolean);
    const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
    setResp(preguntaId, next.join('|'));
  }

  function addLinea() {
    if (productos.length === 0) return;
    const first = productos[0];
    setLineas((L) => [
      ...L,
      { productoId: first.id, cantidad: 0, unidadMedida: first.unidadMedida ?? undefined },
    ]);
  }

  function updateLinea(i: number, patch: Partial<LineaProducto>) {
    setLineas((L) => L.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLinea(i: number) {
    setLineas((L) => L.filter((_, idx) => idx !== i));
  }

  async function uploadFoto(file: File) {
    if (!revision) return;
    try {
      const pre = await apiPost<{ uploadUrl: string; publicUrl: string }>(`/api/v1/storage/presign`, {
        prefix: `revisiones/${revision.id}`,
        filename: file.name,
        contentType: file.type || 'image/jpeg',
      });
      await fetch(pre.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      await apiPost(`/api/v1/revisiones/${revision.id}/fotos`, { url: pre.publicUrl });
      const r = await apiGet<Revision>(`/api/v1/revisiones/${revision.id}`);
      setRevision(r);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function removeFoto(fotoId: string) {
    if (!revision) return;
    try {
      await apiDelete(`/api/v1/revisiones/${revision.id}/fotos/${fotoId}`);
      setRevision({ ...revision, fotos: revision.fotos.filter((f) => f.id !== fotoId) });
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function finalizar() {
    if (!revision) return;
    setSaving(true);
    setErr(null);
    try {
      const respuestasPayload = preguntas
        .filter((p) => respuestas[p.id] !== undefined && respuestas[p.id] !== '')
        .map((p, idx) => ({
          preguntaId: p.id,
          codigoPregunta: p.codigo,
          textoPregunta: p.textoPregunta,
          respuesta: respuestas[p.id],
          orden: idx,
        }));

      await mutateOrQueue('PATCH', `/api/v1/revisiones/${revision.id}/finalizar`, {
        estadoConservacion: conservacion,
        hayIncidencia: incidencia,
        inaccesible,
        seCambiaElCebo: cambiaCebo,
        observaciones: obs || undefined,
        respuestas: respuestasPayload,
        productos: lineas.filter((l) => l.productoId && l.cantidad >= 0),
      });
      router.push(`/ot/${params.id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="p-4 text-slate-400">Cargando revision…</main>;
  if (!revision)
    return (
      <main className="p-4">
        <div className="text-red-400">{err ?? 'Revision no disponible'}</div>
      </main>
    );

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <Link href={`/ot/${params.id}`} className="text-xs text-slate-400">
          ← OT
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <div className="font-mono text-sm">{revision.puntoControl.codigo}</div>
            <div className="font-semibold">{revision.puntoControl.tipo.nombre}</div>
            {revision.puntoControl.detalleUbicacion && (
              <div className="text-xs text-slate-400">{revision.puntoControl.detalleUbicacion}</div>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {err && <div className="text-red-400 text-sm">{err}</div>}

        {/* Estado general */}
        <section className="bg-slate-800 rounded-lg p-3 space-y-3">
          <div>
            <label className="text-xs text-slate-400">Estado de conservacion</label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {['bueno', 'regular', 'malo', 'sustituido'].map((e) => (
                <button
                  key={e}
                  onClick={() => setConservacion(e)}
                  className={
                    'py-2 text-xs rounded ' +
                    (conservacion === e ? 'bg-brand text-white' : 'bg-slate-700 text-slate-300')
                  }
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2 bg-slate-700 rounded px-3 py-2">
              <input type="checkbox" checked={incidencia} onChange={(e) => setIncidencia(e.target.checked)} />
              <span>Incidencia</span>
            </label>
            <label className="flex items-center gap-2 bg-slate-700 rounded px-3 py-2">
              <input type="checkbox" checked={inaccesible} onChange={(e) => setInaccesible(e.target.checked)} />
              <span>Inaccesible</span>
            </label>
            {revision.puntoControl.tipo.consumoDelCebo && (
              <label className="flex items-center gap-2 bg-slate-700 rounded px-3 py-2 col-span-2">
                <input type="checkbox" checked={cambiaCebo} onChange={(e) => setCambiaCebo(e.target.checked)} />
                <span>Se repone el cebo</span>
              </label>
            )}
          </div>
        </section>

        {/* Checklist principal */}
        {preguntas.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs uppercase text-slate-500 px-1">Checklist</h2>
            {[...principales, ...secundarias].map((p) => (
              <PreguntaInput
                key={p.id}
                pregunta={p}
                value={respuestas[p.id] ?? ''}
                onChange={(v) => setResp(p.id, v)}
                onToggle={(opt) => toggleOpcionMultiple(p.id, opt)}
              />
            ))}
          </section>
        )}

        {/* Productos aplicados */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs uppercase text-slate-500">Productos aplicados</h2>
            <button onClick={addLinea} className="text-brand text-sm">
              + Agregar
            </button>
          </div>
          {lineas.length === 0 && (
            <div className="text-xs text-slate-500 px-1">Sin productos aplicados.</div>
          )}
          {lineas.map((l, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <select
                  value={l.productoId}
                  onChange={(e) => updateLinea(i, { productoId: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm flex-1"
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.registro ? ` · ${p.registro}` : ''}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeLinea(i)} className="ml-2 text-red-400 text-sm">
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.001"
                  inputMode="decimal"
                  placeholder="Cantidad"
                  value={l.cantidad}
                  onChange={(e) => updateLinea(i, { cantidad: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                />
                <input
                  placeholder="Unidad (g, ml, ...)"
                  value={l.unidadMedida ?? ''}
                  onChange={(e) => updateLinea(i, { unidadMedida: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                />
                <input
                  placeholder="Lote"
                  value={l.lote ?? ''}
                  onChange={(e) => updateLinea(i, { lote: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                />
                <input
                  type="date"
                  placeholder="Vencimiento"
                  value={l.fechaCaducidad?.slice(0, 10) ?? ''}
                  onChange={(e) => updateLinea(i, { fechaCaducidad: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </section>

        {/* Fotos */}
        <section className="space-y-2">
          <h2 className="text-xs uppercase text-slate-500 px-1">Fotos</h2>
          <div className="grid grid-cols-3 gap-2">
            {revision.fotos.map((f) => (
              <div key={f.id} className="relative">
                <img src={f.url} alt="" className="w-full h-24 object-cover rounded" />
                <button
                  onClick={() => removeFoto(f.id)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="h-24 border-2 border-dashed border-slate-700 rounded flex items-center justify-center text-slate-400 text-sm">
              + Foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFoto(f);
                }}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {/* Observaciones */}
        <section>
          <label className="text-xs text-slate-400 px-1">Observaciones</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm mt-1"
            placeholder="Detalles, indicios, recomendaciones..."
          />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900 border-t border-slate-800">
        <button
          onClick={finalizar}
          disabled={saving}
          className="w-full bg-brand text-white rounded py-3 font-semibold disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar revision'}
        </button>
      </div>
    </main>
  );
}

function PreguntaInput({
  pregunta,
  value,
  onChange,
  onToggle,
}: {
  pregunta: Pregunta;
  value: string;
  onChange: (v: string) => void;
  onToggle: (opt: string) => void;
}) {
  const opciones = Array.isArray(pregunta.opciones)
    ? (pregunta.opciones as string[])
    : [];
  const selected = (value ?? '').split('|').filter(Boolean);

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm">
          {pregunta.textoPregunta}
          {pregunta.esPrincipal && <span className="ml-2 text-xs text-brand">★</span>}
        </label>
      </div>
      {pregunta.tipoRespuesta === 'boolean' && (
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => onChange('true')}
            className={
              'py-2 text-sm rounded ' +
              (value === 'true' ? 'bg-green-700 text-white' : 'bg-slate-700 text-slate-300')
            }
          >
            Si
          </button>
          <button
            onClick={() => onChange('false')}
            className={
              'py-2 text-sm rounded ' +
              (value === 'false' ? 'bg-red-700 text-white' : 'bg-slate-700 text-slate-300')
            }
          >
            No
          </button>
        </div>
      )}
      {pregunta.tipoRespuesta === 'numerico' && (
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
        />
      )}
      {pregunta.tipoRespuesta === 'texto' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
        />
      )}
      {pregunta.tipoRespuesta === 'opcion_unica' && (
        <div className="grid grid-cols-3 gap-1">
          {opciones.map((o) => (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={
                'py-2 text-xs rounded ' +
                (value === o ? 'bg-brand text-white' : 'bg-slate-700 text-slate-300')
              }
            >
              {o}
            </button>
          ))}
        </div>
      )}
      {pregunta.tipoRespuesta === 'opcion_multiple' && (
        <div className="flex flex-wrap gap-1">
          {opciones.map((o) => (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className={
                'py-1 px-3 text-xs rounded ' +
                (selected.includes(o) ? 'bg-brand text-white' : 'bg-slate-700 text-slate-300')
              }
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getPosition(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { timeout: 3000, enableHighAccuracy: false },
    );
  });
}
