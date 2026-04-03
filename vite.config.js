import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/its-just-a-dream/', // ВАЖНО: слеши в начале и конце!
  plugins: [react()],
});