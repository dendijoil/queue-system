import { ApiStatus } from './ApiStatus';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 720 }}>
      <h1>Aplikasi Loket</h1>
      <p>Operator memanggil, melayani, menunda, mentransfer, dan menyelesaikan tiket.</p>
      <ApiStatus />
    </main>
  );
}
