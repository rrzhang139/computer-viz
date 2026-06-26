import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page Vite build — each .html in the project root is its own entry.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:       resolve(__dirname, 'index.html'),
        latch:      resolve(__dirname, 'latch.html'),
        dlatch:     resolve(__dirname, 'dlatch.html'),
        dff:        resolve(__dirname, 'dff.html'),
        register:   resolve(__dirname, 'register.html'),
        halfadder:  resolve(__dirname, 'halfadder.html'),
        fulladder:  resolve(__dirname, 'fulladder.html'),
        adder4:     resolve(__dirname, 'adder4.html'),
        counter:    resolve(__dirname, 'counter.html'),
        decoder:    resolve(__dirname, 'decoder.html'),
        mux:        resolve(__dirname, 'mux.html'),
        regfile:    resolve(__dirname, 'regfile.html'),
        alu:        resolve(__dirname, 'alu.html'),
        alu1:       resolve(__dirname, 'alu1.html'),
        datapath:   resolve(__dirname, 'datapath.html'),
        idecode:    resolve(__dirname, 'idecode.html'),
        mem:        resolve(__dirname, 'mem.html'),
        fetch:      resolve(__dirname, 'fetch.html'),
        cpu:        resolve(__dirname, 'cpu.html'),
      },
    },
  },
});
