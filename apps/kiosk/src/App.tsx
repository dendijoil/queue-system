import { ApiStatus } from './ApiStatus';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 720 }}>
      <h1>Kiosk</h1>
      <p>
        Pelanggan memilih layanan dan mengambil tiket. Menu, bahasa, dan isi tiket diambil dari
        pengaturan.
      </p>
      <ApiStatus />
    </main>
  );
}
