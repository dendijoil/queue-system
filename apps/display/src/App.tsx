import { ApiStatus } from './ApiStatus';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 720 }}>
      <h1>Display</h1>
      <p>Menampilkan nomor yang dipanggil dan memutar pengumuman suara.</p>
      <ApiStatus />
    </main>
  );
}
