'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { getWithCache, mutateOrQueue } from '@/lib/sync';

export default function FirmarOt({ params }: { params: { id: string } }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [puntosPendientes, setPuntosPendientes] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('base2.token')) {
      router.push('/');
      return;
    }
    // Chequeo de cantidad de PC pendientes antes de cerrar (usa cache si no hay red)
    getWithCache<any[]>(`/api/v1/ordenes-trabajo/${params.id}/puntos-control`)
      .then((ps) => setPuntosPendientes(ps.filter((p) => !p.revisionActual).length))
      .catch(() => setPuntosPendientes(null));
  }, [params.id, router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ajustar tamaño segun el contenedor con devicePixelRatio para que se vea nitido
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  function getPoint(evt: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    setDrawing(true);
    setLastPoint(getPoint(e));
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const pt = getPoint(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
    setLastPoint(pt);
    setDirty(true);
  }
  function onPointerUp() {
    setDrawing(false);
    setLastPoint(null);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
    setDirty(false);
  }

  async function getPos(): Promise<GeolocationCoordinates | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p.coords),
        () => resolve(null),
        { timeout: 3000, enableHighAccuracy: true },
      );
    });
  }

  async function cerrar() {
    setErr(null);
    if (!dirty) {
      setErr('Firma requerida');
      return;
    }
    if (!nombre.trim()) {
      setErr('Nombre del firmante requerido');
      return;
    }
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!online) {
      setErr('Se necesita conexion para subir la firma. Conectate e intentalo de nuevo.');
      return;
    }
    setSaving(true);
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png');
      const { url: firmaUrl } = await apiPost<{ url: string }>('/api/v1/storage/firma', {
        dataUrl,
        odtId: params.id,
      });
      const coords = await getPos();
      // cerrar se puede encolar: si el servidor cae despues del upload, reintenta en background
      await mutateOrQueue('PATCH', `/api/v1/ordenes-trabajo/${params.id}/cerrar`, {
        personaFirmante: nombre,
        dniFirmante: dni || undefined,
        firmaUrl,
        notaPublica: nota || undefined,
        lat: coords?.latitude,
        lng: coords?.longitude,
      });
      router.push('/mi-dia');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <Link href={`/ot/${params.id}`} className="text-xs text-slate-400">
          ← OT
        </Link>
        <div className="font-semibold mt-1">Firma del cliente</div>
      </header>

      <div className="p-4 space-y-4">
        {puntosPendientes !== null && puntosPendientes > 0 && (
          <div className="bg-yellow-900/40 border border-yellow-700 rounded p-3 text-sm">
            ⚠️ Hay {puntosPendientes} punto(s) de control sin revisar. Puedes cerrar igual pero quedaran marcados como pendientes.
          </div>
        )}

        <input
          placeholder="Nombre del firmante"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3"
        />
        <input
          placeholder="DNI (opcional)"
          inputMode="numeric"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3"
        />
        <textarea
          placeholder="Nota publica para el cliente (opcional)"
          rows={2}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Firma</label>
            <button onClick={clearCanvas} className="text-xs text-red-400">
              Limpiar
            </button>
          </div>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="w-full h-56 bg-white rounded border border-slate-700 touch-none"
            style={{ touchAction: 'none' }}
          />
        </div>

        {err && <div className="text-red-400 text-sm">{err}</div>}

        <button
          onClick={cerrar}
          disabled={saving}
          className="w-full bg-green-600 text-white rounded py-3 font-semibold disabled:opacity-50"
        >
          {saving ? 'Cerrando OT…' : 'Cerrar OT'}
        </button>
      </div>
    </main>
  );
}
