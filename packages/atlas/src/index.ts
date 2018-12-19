import * as atlaspack from 'atlaspack';
import { GLTFContainer } from 'gltf-transform-util';

interface AtlasOptions {};

const DEFAULTS = {
  maxSize: 2048
};

function atlas(container: GLTFContainer, options: AtlasOptions): GLTFContainer {
  throw new Error('Not implemented');
}

export { atlas };
