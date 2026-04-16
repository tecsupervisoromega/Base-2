'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ empresaCuit: '30-99999999-9', username: 'admin', password: 'admin123' });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      localStorage.setItem('base2.empresa', JSON.stringify(data.empresa));
      router.push('/dashboard');
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow p-8 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Iniciar sesion</h1>
        <p className="text-sm text-slate-500">Base-2 DDD — Backoffice</p>

        <div>
          <label className="text-sm font-medium">CUIT empresa</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.empresaCuit}
            onChange={(e) => setForm({ ...form, empresaCuit: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Usuario</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Contraseña</label>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white rounded py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
