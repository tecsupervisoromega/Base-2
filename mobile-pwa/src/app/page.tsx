'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeTec() {
  const router = useRouter();
  const [form, setForm] = useState({ empresaCuit: '30-99999999-9', username: 'juan', password: 'admin123' });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('base2.token');
    if (token) router.push('/mi-dia');
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Credenciales invalidas');
      const data = await res.json();
      localStorage.setItem('base2.token', data.accessToken);
      localStorage.setItem('base2.user', JSON.stringify(data.user));
      router.push('/mi-dia');
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="bg-slate-800 rounded-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-brand rounded text-white flex items-center justify-center font-bold">B2</div>
          <div>
            <div className="font-bold">Base-2 Tecnico</div>
            <div className="text-xs text-slate-400">Control de Plagas</div>
          </div>
        </div>

        <input
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3"
          placeholder="CUIT empresa"
          value={form.empresaCuit}
          onChange={(e) => setForm({ ...form, empresaCuit: e.target.value })}
        />
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3"
          placeholder="Usuario"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {err && <div className="text-red-400 text-sm">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white rounded py-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
