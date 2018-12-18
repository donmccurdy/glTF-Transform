import typescript from 'rollup-plugin-typescript2';

const name = 'gltf-transform-util';
const namespace = 'util';

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
        typescript({
            "include": ["src/**/*"]
        })
    ]
}
