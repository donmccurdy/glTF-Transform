import fs from 'fs';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

const PACKAGES = ['core', 'colorspace'];
// let PACKAGES = [ 'core', 'atlas', 'ao', 'colorspace', 'prune', 'split' ];

// if (process.env.CI) {
//   PACKAGES = PACKAGES.filter((pkg) => pkg !== 'ao' && pkg !== 'atlas');
// }

const camelcase = (s) => s.replace(/-([a-z])/g, (g) =>  g[1].toUpperCase());

// Ensure dist/ directories exist.
PACKAGES.forEach((name) => {
  if (!fs.existsSync(`packages/${name}/dist`)) {
    fs.mkdirSync(`packages/${name}/dist`);
  }
});

// Export one input per package.
export default PACKAGES.map((name) => ({
  input: `packages/${name}/src/${name}.ts`,
  output: [
    {
      file: `packages/${name}/dist/gltf-transform-${name}.js`,
      format: 'cjs',
      sourcemap: !process.env.PRODUCTION
    },
    {
      file: `packages/${name}/dist/gltf-transform-${name}.umd.js`,
      format: 'umd',
      name: `gltfTransform.${camelcase(name)}`,
      sourcemap: !process.env.PRODUCTION
    },
    {
      file: `packages/${name}/dist/gltf-transform-${name}.module.js`,
      format: 'es'
    },
  ],
  plugins: [
    typescript(),
    resolve(),
    commonjs()
  ]
}));
