import { GLTFUtil, LoggerVerbosity } from 'gltf-transform-util';

var splice = function (buffer, begin, count) {
    var a1 = buffer.slice(0, begin);
    var a2 = buffer.slice(begin + count);
    var a = join(a1, a2);
    var b = buffer.slice(begin, begin + count);
    return [a, b];
};
var join = function (a, b) {
    var out = new Uint8Array(a.byteLength + b.byteLength);
    out.set(new Uint8Array(a), 0);
    out.set(new Uint8Array(b), a.byteLength);
    return out.buffer;
};
var split = function (container, meshes) {
    var json = container.json;
    var logger = GLTFUtil.createLogger('gltf-transform-split', LoggerVerbosity.INFO);
    // Create Buffer instances.
    json.buffers.forEach(function (buffer, bufferIndex) {
        if (buffer.uri && buffer.uri.match(/^data:/)) {
            var uri = buffer.uri;
            buffer.uri = "buffer" + bufferIndex + ".bin";
            buffer['_buffer'] = GLTFUtil.createBufferFromDataURI(uri);
            return;
        }
        throw new Error('Only buffers using Data URIs are currently supported');
    });
    var bufferViewMap = {};
    // Group bufferviews by mesh.
    json.meshes.forEach(function (mesh) {
        if (meshes.indexOf(mesh.name) === -1)
            return;
        mesh.primitives.forEach(function (prim) {
            if (prim.indices)
                markAccessor(json.accessors[prim.indices]);
            Object.keys(prim.attributes).forEach(function (attrName) {
                markAccessor(json.accessors[prim.attributes[attrName]]);
            });
            function markAccessor(accessor) {
                var bufferView = json.bufferViews[accessor.bufferView];
                if (bufferViewMap[accessor.bufferView] === undefined) {
                    bufferViewMap[accessor.bufferView] = mesh.name;
                }
                else if (bufferViewMap[accessor.bufferView] !== mesh.name) {
                    throw new Error('Not implemented: Two meshes share a bufferview.');
                }
            }
        });
    });
    // Write data for each mesh to a new buffer.
    meshes.forEach(function (meshName) {
        var buffer = GLTFUtil.createBuffer();
        logger.info("\uD83D\uDCE6  " + meshName);
        json.bufferViews.forEach(function (bufferView, bufferViewIndex) {
            if (bufferViewMap[bufferViewIndex] !== meshName)
                return;
            logger.info(meshName + ':' + bufferViewIndex);
            // Extract data from original buffer.
            logger.info("original before: " + json.buffers[bufferView.buffer]['_buffer'].byteLength + " w/ offset " + bufferView.byteOffset + " and length " + bufferView.byteLength);
            var _a = splice(json.buffers[bufferView.buffer]['_buffer'], bufferView.byteOffset, bufferView.byteLength), original = _a[0], tmp = _a[1];
            logger.info("spliced: " + tmp.byteLength);
            json.buffers[bufferView.buffer]['_buffer'] = original;
            logger.info("original after: " + json.buffers[bufferView.buffer]['_buffer'].byteLength);
            // Write data to new buffer.
            var affectedByteOffset = bufferView.byteOffset + bufferView.byteLength;
            var affectedBuffer = bufferView.buffer;
            bufferView.byteOffset = buffer.byteLength;
            bufferView.buffer = json.buffers.length;
            buffer = join(buffer, tmp);
            // Update remaining buffers.
            json.bufferViews.forEach(function (affectedBufferView) {
                if (affectedBufferView.buffer === affectedBuffer
                    && affectedBufferView.byteOffset >= affectedByteOffset) {
                    affectedBufferView.byteOffset -= bufferView.byteLength;
                }
            });
            // TODO: Update embedded images, or throw an error.
        });
        var meshBuffer = { uri: meshName + ".bin", byteLength: undefined };
        meshBuffer['_buffer'] = buffer;
        json.buffers.push(meshBuffer);
    });
    // Filter out empty buffers.
    json.buffers = json.buffers.filter(function (buffer, bufferIndex) {
        buffer.byteLength = buffer['_buffer'].byteLength;
        delete buffer['_buffer'];
        if (buffer.byteLength > 0)
            return true;
        json.bufferViews.forEach(function (bufferView) {
            if (bufferView.buffer >= bufferIndex)
                bufferView.buffer--;
        });
        return false;
    });
    return container;
};
var test = 'test';

export { split, test };
