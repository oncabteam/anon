import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  // ES Module build
  {
    input: 'platforms/web/VibeMeshWeb.js',
    output: {
      file: 'dist/web.esm.js',
      format: 'es',
      sourcemap: !isProduction,
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        declaration: true,
        declarationDir: 'dist',
        rootDir: '.',
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['> 1%', 'last 2 versions', 'not dead']
            },
            modules: false,
          }],
          '@babel/preset-typescript'
        ],
      }),
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          reserved: ['VibeMesh', 'vibemesh'],
        },
      }),
    ].filter(Boolean),
    external: ['uuid'],
  },
  
  // UMD build for browsers
  {
    input: 'platforms/web/VibeMeshWeb.js',
    output: {
      file: 'dist/web.umd.js',
      format: 'umd',
      name: 'VibeMesh',
      sourcemap: !isProduction,
      globals: {
        uuid: 'uuid'
      },
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['> 1%', 'last 2 versions', 'not dead']
            },
            modules: false,
          }],
        ],
      }),
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          reserved: ['VibeMesh', 'vibemesh'],
        },
      }),
    ].filter(Boolean),
    external: ['uuid'],
  },

  // CDN build (includes uuid)
  {
    input: 'platforms/web/VibeMeshWeb.js',
    output: {
      file: isProduction ? 'dist/vibemesh-web.min.js' : 'dist/vibemesh-web.js',
      format: 'iife',
      name: 'VibeMesh',
      sourcemap: !isProduction,
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['> 1%', 'last 2 versions', 'not dead']
            },
            modules: false,
          }],
        ],
      }),
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          reserved: ['VibeMesh', 'vibemesh'],
        },
      }),
    ].filter(Boolean),
  },
];