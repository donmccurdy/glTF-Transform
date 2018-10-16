import { GLTFContainer } from '../../../src/container';
// import * as splice from 'buffer-splice';

const split = function (container: GLTFContainer, meshes: Array<string>): GLTFContainer {

  const json = container.json;

  // Create Buffer instances.
  container.json.buffers.forEach((buffer, bufferIndex) => {
    if (buffer.uri && buffer.uri.match(/^data:/)) {
      const uri = buffer.uri;
      buffer.uri = `buffer${bufferIndex}.bin`;
      buffer._buffer = new Buffer(uri.split(',')[1], 'base64');
      return;
    }
    throw new Error('Only buffers using Data URIs are currently supported');
  });

  const meshSet = new Set(meshes);
  const bufferViewMap = {};

  // Group bufferviews by mesh.
  json.meshes.forEach((mesh) => {
    if (!meshSet.has(mesh.name)) return;
    mesh.primitives.forEach((prim) => {
      if (prim.indices) markAccessor(json.accessors[prim.indices]);
      Object.keys(prim.attributes).forEach((attrName) => {
        markAccessor(json.accessors[prim.attributes[attrName]]);
      });

      function markAccessor(accessor) {
        const bufferView = json.bufferViews[accessor.bufferView];
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
    let buffer = new Buffer([]);

    console.log(`📦  ${meshName}`);

    json.bufferViews.forEach((bufferView, bufferViewIndex) => {
      if (bufferViewMap[bufferViewIndex] !== meshName) return;
      console.log(meshName + ':' + bufferViewIndex, bufferView);

      // Extract data from original buffer.
      console.log(`original before: ${json.buffers[bufferView.buffer]._buffer.byteLength} w/ offset ${bufferView.byteOffset} and length ${bufferView.byteLength}`);
      const spliceOpts = { buffer: json.buffers[bufferView.buffer]._buffer };
      const tmp = splice(spliceOpts, bufferView.byteOffset, bufferView.byteLength);
      console.log(`spliced: ${tmp.byteLength}`);
      json.buffers[bufferView.buffer]._buffer = spliceOpts.buffer;
      console.log(`original after: ${json.buffers[bufferView.buffer]._buffer.byteLength}`);

      // Write data to new buffer.
      const affectedByteOffset = bufferView.byteOffset + bufferView.byteLength;
      const affectedBuffer = bufferView.buffer;
      bufferView.byteOffset = buffer.byteLength;
      bufferView.buffer = json.buffers.length;
      buffer = splice(buffer, null, null, tmp);

      // Update remaining buffers.
      json.bufferViews.forEach((affectedBufferView) => {
        if (affectedBufferView.buffer === affectedBuffer
          && affectedBufferView.byteOffset >= affectedByteOffset) {
          affectedBufferView.byteOffset -= bufferView.byteLength;
        }
      });
      // TODO: Update embedded images, or throw an error.
    });

    json.buffers.push({ uri: `${meshName}.bin`, _buffer: buffer });
  });

  // Filter out empty buffers.
  json.buffers = json.buffers.filter((buffer, bufferIndex) => {
    buffer.byteLength = buffer._buffer.byteLength;
    if (buffer.byteLength > 0) return true;
    json.bufferViews.forEach((bufferView) => {
      if (bufferView.buffer >= bufferIndex) bufferView.buffer--;
    });
    return false;
  });

  return container;
}

export { split };
