import ShelfPack from '@mapbox/shelf-pack';
import { GLTFContainer } from '@gltf-transform/core';
import { getSizePNG, getSizeJPEG } from './image-util';

interface IAtlasOptions {
  size,
  tilepad: boolean,
  createCanvas: CanvasFactory,
};

interface CanvasFactory {
  (w: number, h: number): HTMLCanvasElement;
}

const DEFAULT_OPTIONS = {
  size: 512,
  tilepad: false,
  bakeUVs: false,
};

function atlas(container: GLTFContainer, options: IAtlasOptions): GLTFContainer {
  options = {...DEFAULT_OPTIONS, ...options};

  // Gather base color textures.
  let baseColorTextures = [];
  container.json.materials.forEach((material) => {
    if (!material.pbrMetallicRoughness) return;
    if (!material.pbrMetallicRoughness.baseColorTexture) return;
    const baseColorTexture = material.pbrMetallicRoughness.baseColorTexture;
    baseColorTextures.push(baseColorTexture.index);
  });
  baseColorTextures = Array.from(new Set(baseColorTextures));

  // Gather texture resources.
  const textures = baseColorTextures.map((index) => {
    const texture = container.json.textures[index];
    const image = container.json.images[texture.source];
    const arrayBuffer = container.resolveURI(image.uri);
    // TODO: Dimensions returned are incorrect.
    const {width, height} = image.mimeType === 'image/jpeg'
      ? getSizeJPEG(Buffer.from(arrayBuffer))
      : getSizePNG(Buffer.from(arrayBuffer));
    return {index, width, height, arrayBuffer};
  });

  // Pack textures.
  const atlas = new ShelfPack(options.size, options.size);
  textures.sort((a, b) => a.width * a.height > b.width * b.height ? 1 : -1);
  atlas.pack(textures, {inPlace: true});

  console.log(textures);

  // Write pixels.
  // let canvas;
  // if (options.createCanvas) {
  //   canvas = options.createCanvas(options.size, options.size);
  // } else {
  //   canvas = document.createElement('canvas');
  //   canvas.height = options.size;
  //   canvas.width = options.size;
  // }

  // Update texture references.

  return container;
}

export { atlas };
