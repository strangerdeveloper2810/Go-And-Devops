import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(config) {
        // React Compiler phải chạy đầu tiên trong pipeline
        config.plugins?.unshift('babel-plugin-react-compiler');
      },
    }),
  ],
  server: {
    port: 3000,
  },
  html: {
    title: 'PM Platform',
  },
});
