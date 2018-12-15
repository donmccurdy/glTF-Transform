import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';

const name = 'gltf-transform-occlusion-vertex';
const namespace = 'occlusionVertex';

export default {
    input: './src/index.ts',
    output: [
        {
            file: `dist/${name}.js`,
            format: 'cjs',
            sourcemap: true
        },
        {
            file: `dist/${name}.umd.js`,
            format: 'umd',
            name: `gltfTransform.${namespace}`,
            sourcemap: true
        },
        {
            file: `dist/${name}.module.js`,
            format: 'es'
        },
    ],
    plugins: [
        typescript(),
        resolve(),
        commonjs()
    ]
}
