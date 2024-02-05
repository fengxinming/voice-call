import { posix as path } from 'node:path';
import { emptyDirSync } from 'fs-extra/esm';
import { build } from 'vite';

const entries = {
  'voice-call/src/index.ts': 'voiceCall',
  'voice-call/src/plugins/helper.ts': 'voiceCallPluginHelper',
  'voice-call/src/plugins/visualizer.ts': 'voiceCallPluginVisualizer'
};

const cwd = process.cwd();
emptyDirSync(path.join(cwd, 'dist'));

Object.entries(entries).forEach(([entry, globalName]) => {
  build({
    configFile: false,
    build: {
      minify: 'terser',
      lib: {
        entry: path.join('./packages/', entry),
        name: globalName,
        fileName(format, entryName) {
          return `${entryName}${format === 'umd' ? '' : `.${format}`}.js`;
        },
        formats: ['iife', 'umd']
      },
      emptyOutDir: false
    }
  });
});
