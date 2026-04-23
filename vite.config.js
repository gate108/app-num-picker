import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const dhProxy = {
  '/api/lotto': {
    target: 'https://www.dhlottery.co.kr',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => {
      const round = new URL(path, 'http://localhost').searchParams.get('round');
      return `/common.do?method=getLottoNumber&drwNo=${round}`;
    },
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        proxyReq.setHeader('Referer', 'https://www.dhlottery.co.kr/');
        proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
      });
    },
  },
};

export default defineConfig({
  plugins: [react()],
  server:  { proxy: dhProxy },
  preview: { proxy: dhProxy },
})
