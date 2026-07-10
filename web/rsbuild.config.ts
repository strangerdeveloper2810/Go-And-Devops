import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';

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
  source: {
    // MUI v5+ đã hỗ trợ tree-shake native qua ESM exports — không cần transformImport
    // Khi import { Button } from '@mui/material', bundler tự động chỉ bundle Button
    // Prefer named imports: import Button from '@mui/material/Button'
  },
  output: {
    // Production: tắt sourceMap để giảm bundle size
    // Development: cheap-module-source-map đủ dùng, build nhanh
    sourceMap: {
      js: process.env.NODE_ENV === 'production' ? false : 'cheap-module-source-map',
    },
    // Loại bỏ license comments khỏi bundle production
    legalComments: 'none',
  },
  performance: {
    buildCache: true,
    // Xóa console.log/console.warn trong production (giữ error để debug)
    removeConsole: process.env.NODE_ENV === 'production' ? ['log', 'warn'] : false,
    // Preload async chunks — browser tải song song, tránh waterfall
    preload: true,
    chunkSplit: {
      strategy: 'custom',
      // Kích hoạt split tự động khi chunk vượt ngưỡng size
      override: {
        chunks: 'all',
        minSize: 20_000, // 20KB — chunk nhỏ hơn thì gộp chung
      },
      splitChunks: {
        cacheGroups: {
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'vendor-react',
            priority: 20,
            chunks: 'all',
          },
          mui: {
            test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
            name: 'vendor-mui',
            priority: 15,
            chunks: 'all',
          },
          query: {
            test: /[\\/]node_modules[\\/](@tanstack)[\\/]/,
            name: 'vendor-query',
            priority: 10,
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    },
  },
  tools: {
    // Lightning CSS thay thế PostCSS — minify CSS nhanh + nhỏ hơn
    lightningcssLoader: true,
    rspack: {
      optimization: {
        // Scope hoisting: nối các module nhỏ lại để giảm function wrapper overhead
        concatenateModules: true,
      },
    },
  },
});
