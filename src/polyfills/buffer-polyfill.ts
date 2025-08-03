// Buffer polyfill for Pera wallet library - Load immediately
import { Buffer } from 'buffer';

// Immediately set Buffer globally before any other code runs
if (typeof window !== 'undefined') {
  // Set Buffer on all possible global objects
  (window as any).Buffer = Buffer;
  (globalThis as any).Buffer = Buffer;
  
  // Also set it on the global scope if available
  if (typeof global !== 'undefined') {
    (global as any).Buffer = Buffer;
  }
  
  // Ensure Buffer is available in the module scope
  (globalThis as any).Buffer = Buffer;
  
  // Polyfill specific Buffer methods that Pera wallet needs
  if (!Buffer.from) {
    Buffer.from = function(data: any, encoding?: any) {
      return new Buffer(data, encoding);
    };
  }
  
  if (!Buffer.alloc) {
    Buffer.alloc = function(size: number, fill?: any, encoding?: any) {
      const buf = new Buffer(size);
      if (fill !== undefined) {
        buf.fill(fill, 0, size, encoding);
      }
      return buf;
    };
  }
  
  if (!Buffer.allocUnsafe) {
    Buffer.allocUnsafe = function(size: number) {
      return new Buffer(size);
    };
  }
  
  // Log for debugging
  console.log('Buffer polyfill loaded successfully');
}

// Also export Buffer for module imports
export { Buffer }; 