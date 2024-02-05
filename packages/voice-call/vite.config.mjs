import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';
import external from 'vite-plugin-external';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: [
        'src/index.ts',
        'src/plugins/helper.ts',
        'src/plugins/visualizer.ts'
      ],
      fileName(format, entryName) {
        return `${entryName}${format === 'cjs' ? '' : `.${format}`}.js`;
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      output: {
        generatedCode: 'es5'
      }
    }
  },
  plugins: [
    typescript(),
    external({
      externalizeDeps: Object.keys(pkg.dependencies)
    })
  ]
});
