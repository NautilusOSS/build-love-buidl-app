import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Custom plugin to handle Pera wallet library
const peraWalletPlugin = () => {
  return {
    name: 'pera-wallet-plugin',
    transform(code: string, id: string) {
      // Only transform Pera wallet related files
      if (id.includes('@perawallet/connect') || id.includes('pera-wallet')) {
        // Replace problematic function calls with safe alternatives
        return {
          code: code
            .replace(/np\.from/g, 'Buffer.from')
            .replace(/mu\.from/g, 'Buffer.from')
            .replace(/Ve\.from/g, 'Buffer.from'),
          map: null
        };
      }
      return null;
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    global: "globalThis",
    Buffer: ["buffer", "Buffer"],
    // Polyfill for Node.js Buffer functions
    "Buffer.from": "Buffer.from",
    "Buffer.alloc": "Buffer.alloc",
    "Buffer.allocUnsafe": "Buffer.allocUnsafe",
    // Additional polyfills for Pera wallet
    "process.env": "{}",
    "process.version": '"v16.0.0"',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure Buffer is always available
      "buffer": "buffer",
    },
  },
  optimizeDeps: {
    include: [
      '@perawallet/connect',
      '@walletconnect/modal',
      '@walletconnect/sign-client',
      '@blockshake/defly-connect',
      'lute-connect',
      'algosdk',
      'buffer',
    ],
    exclude: [],
    esbuildOptions: {
      // Ensure proper handling of ES modules
      target: 'es2020',
      keepNames: true,
    },
  },
  esbuild: {
    // Ignore type errors from external packages
    logOverride: { 
      'this-is-undefined-in-esm': 'silent',
      'unsupported-jsx-comment': 'silent',
      'this-is-undefined-in-cjs': 'silent'
    },
    target: 'es2020',
    keepNames: true,
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), peraWalletPlugin(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          // Separate wallet libraries to prevent bundling issues
          'pera-wallet': ['@perawallet/connect'],
          'wallet-connect': ['@walletconnect/modal', '@walletconnect/sign-client'],
          'defly-wallet': ['@blockshake/defly-connect'],
          'lute-wallet': ['lute-connect'],
        },
      },
      onwarn(warning, warn) {
        // Suppress warnings about external modules and type errors
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.message.includes('@perawallet/connect')) return;
        if (warning.message.includes('@walletconnect')) return;
        warn(warning);
      },
    },
    commonjsOptions: {
      // Ensure proper handling of CommonJS modules
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    target: 'es2020',
    minify: false, // Disable minification to prevent function name mangling
  },
  ssr: {
    // Ensure SSR compatibility for wallet libraries
    noExternal: ['@perawallet/connect', '@walletconnect/modal'],
  },
}));
