import * as atlaspack from 'atlaspack';
import { GLTFContainer } from 'gltf-transform';

interface PackingOptions {};

const DEFAULTS = {
  maxSize: 2048
};

function pack(container: GLTFContainer, options: PackingOptions): GLTFContainer {
  throw new Error('Not implemented');
}

export { pack };
