import { GLTFContainer, GLTFUtil } from './@gltf-transform/core';
import { pack } from './packer';

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
    // TODO: Implement 'bake' option, and/or support fallback.
    throw new Error('Not implemented: Baking UVs not yet supported.');
  }

  const bannedMaterials = new Set();

  container.json.meshes.forEach((meshDef) => {
    meshDef.primitives.forEach((primitiveDef) => {
      if (primitiveDef.material !== undefined && primitiveDef.attributes.TEXCOORD_0) {
        const accessorData = container.getAccessorArray(primitiveDef.attributes.TEXCOORD_0);
        for (let i = 0; i < accessorData.length; i += 2) {
          const u = accessorData[i];
          const v = accessorData[i + 1];
          if (u < -0.1 || u > 1.1 || v < -0.1 || v > 1.1) {
            console.log(`Banning: ${u},${v}`);
            bannedMaterials.add(primitiveDef.material);
            break;
          }
        }
      }
    });
  });

  // Gather base color textures.
  let baseColorImages = [];
  const bannedImages = new Set();
  container.json.materials.forEach((material, materialIndex) => {
    if (!material.pbrMetallicRoughness) return;
    if (!material.pbrMetallicRoughness.baseColorTexture) return;
    const textureIndex = material.pbrMetallicRoughness.baseColorTexture.index;
    const texture = container.json.textures[textureIndex];
    if (bannedMaterials.has(materialIndex)) {
      bannedImages.add(texture.source);
    } else {
      baseColorImages.push(texture.source);
    }
  });
  console.log('Before filter: ' + baseColorImages.length);
  baseColorImages = Array.from(new Set(baseColorImages))
    .filter((index) => !bannedImages.has(index));
  console.log('After filter: ' + baseColorImages.length);

  // Gather texture resources.
  // TODO: Separate PNG/JPEG atlases?
  let atlasIsPNG = false;
  let images = baseColorImages.map((index) => {
    const image = container.json.images[index];
    const arrayBuffer = container.resolveURI(image.uri);
    const mimeType = image.mimeType || (image.uri.match(/\.png$/) ? 'image/png' : 'image/jpeg');
    atlasIsPNG = atlasIsPNG || mimeType === 'image/png';
    const {width, height} = GLTFUtil.getImageSize(container, index);
    return {index, width, height, arrayBuffer, mimeType, x: undefined, y: undefined};
  });

  // Pack textures.
  const [atlasWidth, atlasHeight] = pack(images);

  if (!options.createImage || !options.createCanvas) {
    throw new Error('Support in browser not yet implemented.');
  }

  images = images.filter((t) => t.x !== undefined);
  if (images.length < 2) {
    throw new Error('No textures could be packed at this size.');
  }

  // Add KHR_texture_transform.
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
    canvas = options.createCanvas(atlasWidth, atlasHeight);
  } else {
    canvas = document.createElement('canvas');
    canvas.height = atlasHeight;
    canvas.width = atlasWidth;
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
    container.json.materials.forEach((material) => {
      if (!material.pbrMetallicRoughness) return;
      if (!material.pbrMetallicRoughness.baseColorTexture) return;
      const baseColorTexture = material.pbrMetallicRoughness.baseColorTexture;
      const textureIndex = baseColorTexture.index;
      const textureDef = container.json.textures[textureIndex];
      if (!imageMap.has(textureDef.source)) return;
      const image = imageMap.get(textureDef.source);
      baseColorTexture['extensions'] = baseColorTexture['extensions'] || {};
      baseColorTexture['extensions'][KHR_TEXTURE_TRANSFORM] = {
        offset: [image.x / atlasWidth, image.y / atlasHeight],
        scale: [image.width / atlasWidth, image.height / atlasHeight]
      };
      textureDef.source = atlasImageIndex;
    });

    // Remove unused images.
    const unusedImageIndices = images.map((i) => i.index);
    unusedImageIndices.sort((a, b) => a > b ? -1 : 1); // sort descending
    unusedImageIndices.forEach((index) => GLTFUtil.removeImage(container, index));

    // Merge duplicate textures.
    // TODO: This is pretty verbose.
    // const reusedTextureMap = new Map();
    // const duplicateTextureMap = new Map();
    // const duplicateTextureIndices = [];
    // container.json.textures.forEach((textureDef, textureIndex) => {
    //   // Ignore transforms here, because we disallowed arbitrary transform inputs.
    //   const textureKey = `${textureDef.source}:${textureDef.sampler}`;
    //   if (reusedTextureMap.has(textureKey)) {
    //     duplicateTextureMap.set(textureIndex, reusedTextureMap.get(textureKey)[1]);
    //     duplicateTextureIndices.push(textureIndex);
    //   } else {
    //     reusedTextureMap.set(textureKey, textureIndex);
    //   }
    // });
    // container.json.materials.forEach((materialDef) => {
    //   if (!materialDef.pbrMetallicRoughness) return;
    //   if (!materialDef.pbrMetallicRoughness.baseColorTexture) return;
    //   const baseColorTexture = materialDef.pbrMetallicRoughness.baseColorTexture;
    //   if (duplicateTextureMap.has(baseColorTexture.index)) {
    //     baseColorTexture.index = duplicateTextureMap.get(baseColorTexture.index);
    //   }
    // });
    // duplicateTextureIndices.sort((a, b) => a[0] > b[0] ? -1 : 1); // sort descending
    // duplicateTextureIndices.forEach((index) => {
    //   GLTFUtil.removeTexture(container, index);
    // });

    return container;
  });
}

export { atlas };
