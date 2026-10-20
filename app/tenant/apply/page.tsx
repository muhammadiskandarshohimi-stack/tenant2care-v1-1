
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function TenantApplyPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.replace('/tenant/login');
        return;
      }

      setEmail(data.user.email || '');
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return <p>Checking tenant session...</p>;
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#fff6fb',
      padding: '40px 20px',
      color: '#431331'
    }}>
      <section style={{
        maxWidth: 600,
        margin: 'auto',
        background: '#fff',
        padding: 30,
        borderRadius: 18,
        border: '1px solid #f1d4e3'
      }}>
        <h1 style={{ color: '#b51677' }}>
          Tenant2Care v1.1
        </h1>

        <h2>Tenant Application Portal</h2>

        <p>Signed in as: {email}</p>

        <p>
          Tenant authentication successful.
          Rental application features are being configured.
        </p>
      </section>
    </main>
  );
}

