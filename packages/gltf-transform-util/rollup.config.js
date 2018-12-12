import typescript from 'rollup-plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
        file: 'dist/gltf-transform-util.js',
        format: 'cjs',
        sourcemap: true
    }
    ],
  plugins: [
    typescript()
  ]
}
