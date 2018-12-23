import ShelfPack from '@mapbox/shelf-pack';
import { GLTFContainer, GLTFUtil } from '@gltf-transform/core';
import { getSizePNG, getSizeJPEG } from './image-util';

interface IAtlasOptions {
  size,
  tilepad: boolean,
  createCanvas: ICanvasFactory,
  createImage: IImageFactory,
};

interface ICanvasFactory {
  (w: number, h: number): HTMLCanvasElement;
}

interface IImageFactory {
  (): HTMLImageElement;
}

const DEFAULT_OPTIONS = {
  size: 512,
  tilepad: false,
  bakeUVs: false,
};

function atlas(container: GLTFContainer, options: IAtlasOptions): Promise<GLTFContainer> {
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
    const mimeType = image.mimeType || (image.uri.match(/\.png$/) ? 'image/png' : 'image/jpeg');
    const {width, height} = mimeType === 'image/png'
      ? getSizePNG(Buffer.from(arrayBuffer))
      : getSizeJPEG(Buffer.from(arrayBuffer));
    return {index, width, height, arrayBuffer, mimeType, x: undefined, y: undefined};
  });

  // Pack textures.
  const atlas = new ShelfPack(options.size, options.size);
  textures.sort((a, b) => a.width * a.height > b.width * b.height ? 1 : -1);
  atlas.pack(textures, {inPlace: true});

  // console.log(textures);

  if (!options.createImage || !options.createCanvas) {
    throw new Error('Support in browser not yet implemented.');
  }

  // Write pixels.
  let canvas: HTMLCanvasElement;
  if (options.createCanvas) {
    canvas = options.createCanvas(options.size, options.size);
  } else {
    canvas = document.createElement('canvas');
    canvas.height = options.size;
    canvas.width = options.size;
  }

  // Update texture references.
  const ctx = canvas.getContext('2d');
  const pending: Array<Promise<void>> = textures.map((texture) => {
    if (texture.x === undefined) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const img = options.createImage();
      img.onload = () => {
        ctx.drawImage(img, texture.x, texture.y);
        resolve();
      };
      img.onerror = err => reject(err);
      img.src = Buffer.from(texture.arrayBuffer) as any;
    });
  });

  return Promise.all(pending).then(() => {
    const buffer = (canvas as any).toBuffer() as Buffer;
    const arrayBuffer = GLTFUtil.trimBuffer(buffer);

    // TODO: Detect mimeType and reuse, or create separate atlases?
    GLTFUtil.addImage(container, 'atlas', arrayBuffer, 'image/png');
    const atlasImageIndex = container.json.images.length - 1;

    textures.forEach((texture) => {
      if (texture.x === undefined) return;
      const textureDef = container.json.textures[texture.index];
      textureDef.source = atlasImageIndex;
      // TODO: Check if texture transform already exists.
      textureDef.extensions = textureDef.extensions || {};
      textureDef.extensions.KHR_texture_transform = {offset: [texture.x, texture.y]};
    });

    // TODO: Try rotating images that didn't fit?

    // Remove unused images.
    // TODO: This doesn't quite seem to be working.
    const usedImages = new Set();
    const unusedImages = [];
    container.json.textures.forEach((texture) => usedImages.add(texture.source));
    container.json.images.forEach((image, imageIndex) => {
      if (!usedImages.has(imageIndex)) unusedImages.push(imageIndex);
    });
    unusedImages.sort((a, b) => a > b ? -1 : 1); // sort descending
    unusedImages.forEach((index) => GLTFUtil.removeImage(container, index));

    // console.log(container.json, container.resources);

    return container;
  });
}

export { atlas };
