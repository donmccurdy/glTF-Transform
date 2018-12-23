import ShelfPack from '@mapbox/shelf-pack';
import { GLTFContainer, GLTFUtil } from '@gltf-transform/core';
import { getSizePNG, getSizeJPEG } from './image-util';

interface IAtlasOptions {
  size,
  tilepad: boolean,
  bake: boolean,
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
  bake: false,
};

const KHR_TEXTURE_TRANSFORM = 'KHR_texture_transform';

function atlas(container: GLTFContainer, options: IAtlasOptions): Promise<GLTFContainer> {
  options = {...DEFAULT_OPTIONS, ...options};

  if (options.bake) {
    throw new Error('Not implemented: Baking UVs not yet supported.');
  }

  // Gather base color textures.
  let baseColorImages = [];
  container.json.materials.forEach((material) => {
    if (!material.pbrMetallicRoughness) return;
    if (!material.pbrMetallicRoughness.baseColorTexture) return;
    const textureIndex = material.pbrMetallicRoughness.baseColorTexture.index;
    const texture = container.json.textures[textureIndex];
    baseColorImages.push(texture.source);
  });
  baseColorImages = Array.from(new Set(baseColorImages));

  // Gather texture resources.
  // TODO: Separate PNG/JPEG atlases?
  let atlasIsPNG = false;
  let images = baseColorImages.map((index) => {
    const image = container.json.images[index];
    const arrayBuffer = container.resolveURI(image.uri);
    const mimeType = image.mimeType || (image.uri.match(/\.png$/) ? 'image/png' : 'image/jpeg');
    atlasIsPNG = atlasIsPNG || mimeType === 'image/png';
    const {width, height} = mimeType === 'image/png'
      ? getSizePNG(Buffer.from(arrayBuffer))
      : getSizeJPEG(Buffer.from(arrayBuffer));
    return {index, width, height, arrayBuffer, mimeType, x: undefined, y: undefined};
  });

  // Pack textures.
  const atlas = new ShelfPack(options.size, options.size);
  images.sort((a, b) => a.width * a.height > b.width * b.height ? 1 : -1);
  atlas.pack(images, {inPlace: true});

  if (!options.createImage || !options.createCanvas) {
    throw new Error('Support in browser not yet implemented.');
  }

  images = images.filter((t) => t.x !== undefined);
  if (images.length < 2) {
    throw new Error('No textures could be packed at this size.');
  }

  // Add KHR_texture_transform.
  // TODO: Implement 'bake' option, and/or support fallback.
  if (container.json.extensionsUsed
      && container.json.extensionsUsed.indexOf(KHR_TEXTURE_TRANSFORM) >= 0) {
    throw new Error('Not implemented: Cannot create atlas on models already using KHR_texture_transform.')
  }
  container.json.extensionsUsed = container.json.extensionsUsed || [];
  container.json.extensionsUsed.push(KHR_TEXTURE_TRANSFORM);
  container.json.extensionsRequired = container.json.extensionsRequired || [];
  container.json.extensionsRequired.push(KHR_TEXTURE_TRANSFORM);

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
  const pending: Array<Promise<void>> = images.map((image) => {
    if (image.x === undefined) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const imageEl = options.createImage();
      imageEl.onload = () => {
        ctx.drawImage(imageEl, image.x, image.y);
        resolve();
      };
      imageEl.onerror = err => reject(err);
      imageEl.src = Buffer.from(image.arrayBuffer) as any;
    });
  });

  return Promise.all(pending).then(() => {
    const buffer = (canvas as any).toBuffer() as Buffer;
    const arrayBuffer = GLTFUtil.trimBuffer(buffer);

    GLTFUtil.addImage(container, 'atlas', arrayBuffer, atlasIsPNG ? 'image/png': 'image/jpeg');
    const atlasImageIndex = container.json.images.length - 1;

    // Reassign textures to atlas.
    const imageMap = new Map();
    images.forEach((i) => imageMap.set(i.index, i));
    container.json.textures.forEach((textureDef) => {
      if (!imageMap.has(textureDef.source)) return;
      const image = imageMap.get(textureDef.source);
      textureDef.extensions = textureDef.extensions || {};
      textureDef.extensions[KHR_TEXTURE_TRANSFORM] = {offset: [image.x, image.y]};
      textureDef.source = atlasImageIndex;
    });

    // Remove unused images.
    const unusedImageIndices = images.map((i) => i.index);
    unusedImageIndices.sort((a, b) => a > b ? -1 : 1); // sort descending
    unusedImageIndices.forEach((index) => GLTFUtil.removeImage(container, index));

    return container;
  });
}

export { atlas };
