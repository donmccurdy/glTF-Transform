import { BufferViewTarget, GLTFContainer, GLTFUtil, LoggerVerbosity } from '../../../packages-disabled/ao/src/@gltf-transform/core';

const prune = function (container: GLTFContainer): GLTFContainer {
  const json = container.json;
  const logger = GLTFUtil.createLogger('@gltf-transform/prune', LoggerVerbosity.INFO);

  // Find all accessors used for mesh data.
  let meshAccessorIndices = [];
  json.meshes.forEach((mesh) => {
    mesh.primitives.forEach((primitive) => {
      for (const semantic in primitive.attributes) {
        meshAccessorIndices.push(primitive.attributes[semantic]);
      }
      if (primitive.indices) {
        meshAccessorIndices.push(primitive.indices);
      }
    })
  });

  meshAccessorIndices = Array.from(new Set(meshAccessorIndices)); // dedupe
  meshAccessorIndices.sort((a, b) => a > b ? 1 : -1); // sort ascending

  // Find duplicate mesh accessors.
  const duplicateAccessors = new Map();
  for (let i = 0; i < meshAccessorIndices.length; i++) {
    if (duplicateAccessors.has(i)) continue;
    const iAccessor = container.json.accessors[i];
    const iAccessorData = container.getAccessorArray(i).slice().buffer;
    for (let j = i + 1; j < meshAccessorIndices.length; j++) {
      if (duplicateAccessors.has(j)) continue;
      const jAccessor = container.json.accessors[j];
      const jAccessorData = container.getAccessorArray(j).slice().buffer;
      if (iAccessor.type !== jAccessor.type) continue;
      if (iAccessor.componentType !== jAccessor.componentType) continue;
      if (iAccessor.count !== jAccessor.count) continue;
      if (iAccessor.normalized !== jAccessor.normalized) continue;
      if (GLTFUtil.arrayBufferEquals(iAccessorData, jAccessorData)) {
        duplicateAccessors.set(j, i);
      }
    }
  }
  logger.info(`Duplicates: ${Array.from(duplicateAccessors).length} of ${json.accessors.length}.`);

  // Replace accessor references.
  json.meshes.forEach((mesh) => {
    mesh.primitives.forEach((primitive) => {
      for (const semantic in primitive.attributes) {
        const index = primitive.attributes[semantic];
        if (duplicateAccessors.has(index)) {
          primitive.attributes[semantic] = duplicateAccessors.get(index);
        }
      }
      if (primitive.indices && duplicateAccessors.has(primitive.indices)) {
        primitive.indices = duplicateAccessors.get(primitive.indices);
      }
    });
  });

  // Clean up.
  const removedAccessors = Array.from(duplicateAccessors).map(([dup, _]) => dup);
  removedAccessors.sort((a, b) => a > b ? -1 : 1); // sort descending
  removedAccessors.forEach((index) => GLTFUtil.removeAccessor(container, index));
  for (let i = container.json.bufferViews.length - 1; i >= 0; i--) {
    const bufferView = container.json.bufferViews[i];
    if (bufferView.byteLength === 0) {
      GLTFUtil.removeBufferView(container, i);
    }
  }

  return container;
}

export { prune };
