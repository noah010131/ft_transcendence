import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync('/app/certs/key.pem'),
      cert: fs.readFileSync('/app/certs/cert.pem'),
    },
    // suna : host를 고정하지 않으면 브라우저가 현재 접속 origin(localhost/LAN IP)을 그대로 사용한다.
    // 원격 접속(LAN IP)에서도 HMR WSS가 같은 호스트로 붙도록 host 라인 제거.
    hmr: {
      protocol: 'wss',
      clientPort: 5173,
    },
  },
});