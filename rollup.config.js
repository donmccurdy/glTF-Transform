import fs from 'fs';
import camelcase from 'camelcase';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

let PACKAGES = [ 'core', 'atlas', 'ao', 'colorspace', 'prune', 'split' ];

if (process.env.CI) {
  PACKAGES = PACKAGES.filter((pkg) => pkg !== 'ao' && pkg !== 'atlas');
}

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
