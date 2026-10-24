import type { ReactNode } from 'react';
export default function RecoveryCard({ children }: { children: ReactNode }) {
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#fff0f7', padding: 20 }}>
    <section style={{ background: '#fff', padding: 30, borderRadius: 18, width: '100%', maxWidth: 400, boxSizing: 'border-box', boxShadow: '0 8px 30px #a9137220' }}>
      <h1 style={{ color: '#a91372', textAlign: 'center' }}>Tenant2Care v1.1</h1>
      {children}
    </section>
  </main>;
}
