export default function Offline() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-bold mb-2">Sin conexion</h1>
        <p className="text-slate-400 text-sm">
          Trabajas en modo offline. Tus cambios se sincronizaran cuando recuperes la señal.
        </p>
      </div>
    </main>
  );
}
