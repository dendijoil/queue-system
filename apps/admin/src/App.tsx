import { ApiStatus } from './ApiStatus';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 720 }}>
      <h1>Dashboard Admin</h1>
      <p>Pengaturan tenant, cabang, layanan, loket, perangkat, laporan, dan integrasi.</p>
      <ApiStatus />
    </main>
  );
}
