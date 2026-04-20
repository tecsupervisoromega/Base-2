import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-xl">
            B2
          </div>
          <div>
            <h1 className="text-2xl font-bold">Base-2 DDD</h1>
            <p className="text-sm text-slate-500">Gestion de empresas de control de plagas</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <Link
            href="/login"
            className="p-5 border rounded-lg hover:border-brand hover:bg-brand-50 transition"
          >
            <div className="text-lg font-semibold">Backoffice</div>
            <div className="text-sm text-slate-500 mt-1">Gestion de clientes, OTs, facturacion</div>
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_API_URL + '/api/docs'}
            className="p-5 border rounded-lg hover:border-brand hover:bg-brand-50 transition"
          >
            <div className="text-lg font-semibold">API Docs</div>
            <div className="text-sm text-slate-500 mt-1">Swagger / OpenAPI</div>
          </a>
        </div>

        <div className="mt-8 text-sm text-slate-400">
          Version: 0.0.1 · MVP Fase 2
        </div>
      </div>
    </main>
  );
}
