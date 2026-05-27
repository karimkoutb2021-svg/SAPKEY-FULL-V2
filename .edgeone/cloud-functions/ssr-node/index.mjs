
  import { createFrameworkServer, importShim } from './bootstrap.js';
  import handler from './handler.js';
  importShim();
  createFrameworkServer(handler);
