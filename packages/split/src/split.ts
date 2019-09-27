import { GLTFContainer, GLTFUtil, LoggerVerbosity } from '@gltf-transform/core';

const split = function (container: GLTFContainer, meshes: Array<string>): GLTFContainer {

  const json = container.json;
  const logger = GLTFUtil.createLogger('@gltf-transform/split', LoggerVerbosity.INFO);

  const bufferViewMap = {};
  const removedBufferViews = [];

  // Group bufferviews by mesh.
  json.meshes.forEach((mesh) => {
    if (meshes.indexOf(mesh.name) === -1) return;

    mesh.primitives.forEach((primitive) => {
      if (primitive.indices) markAccessor(primitive.indices);

      markAttributesAccessors(primitive.attributes);
      if (primitive.targets) primitive.targets.forEach(markAttributesAccessors);

      function markAttributesAccessors(attributes) {
        Object.values(attributes).forEach((index) => {
          markAccessor(index);
        });
      }

      function markAccessor(index) {
        const accessor = json.accessors[index];

        if (bufferViewMap[accessor.bufferView] === undefined) {
          bufferViewMap[accessor.bufferView] = mesh.name;
        } else if (bufferViewMap[accessor.bufferView] !== mesh.name) {
          throw new Error('Not implemented: Two meshes share a bufferview.');
        }
      };
    });
  });

  // Write data for each mesh to a new buffer.
  meshes.forEach((meshName) => {
    logger.info(`📦  ${meshName}`);

    json.bufferViews.forEach((bufferView, bufferViewIndex) => {
      if (bufferViewMap[bufferViewIndex] !== meshName) return;

      const bufferData = container.getBuffer(bufferView.buffer);
      const bufferViewData = bufferData.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);

      const newBufferURI = `${meshName}.bin`;
      const newBuffer = container.json.buffers.find((buffer) => buffer.uri === newBufferURI)
        || GLTFUtil.addBuffer(container, meshName, new ArrayBuffer(0));
      const newBufferIndex = container.json.buffers.indexOf(newBuffer);

      const newBufferView = GLTFUtil.addBufferView(container, bufferViewData, newBufferIndex);
      const newBufferViewIndex = container.json.bufferViews.indexOf(newBufferView);
      container.json.accessors.forEach((accessor) => {
        if (accessor.bufferView === bufferViewIndex) {
          accessor.bufferView = newBufferViewIndex;
        }
      })

      removedBufferViews.push(bufferViewIndex);
    });

  });

  // Removed emptied bufferviews.
  removedBufferViews.sort((a, b) => a > b ? -1 : 1);
  removedBufferViews.forEach((index) => GLTFUtil.removeBufferView(container, index));

  // Remove initial buffer, if empty.
  const buffer = json.buffers[0];
  if (buffer.byteLength === 0) {
    GLTFUtil.removeBuffer(container, 0);
  }

  return container;
}

export { split };
