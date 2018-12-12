'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Wrapper for a glTF asset.
 */
var GLTFContainer = /** @class */ (function () {
    function GLTFContainer(json, resources) {
        this.json = json;
        this.resources = resources;
    }
    /**
     * Resolves a resource URI.
     * @param uri
     */
    GLTFContainer.prototype.resolveURI = function (uri) {
        return this.resources[uri];
    };
    /**
     * Adds a new image to the glTF container.
     * @param container
     * @param name
     * @param file
     * @param type
     */
    GLTFContainer.prototype.addImage = function (name, file, type) {
        var uri, mimeType;
        switch (type) {
            case 'image/jpeg':
                uri = name + ".jpg";
                mimeType = GLTF.ImageMimeType.JPEG;
                break;
            case 'image/png':
                uri = name + ".png";
                mimeType = GLTF.ImageMimeType.PNG;
                break;
            default:
                throw new Error("Unsupported image type, \"" + type + "\".");
        }
        this.json.images.push({ name: name, mimeType: mimeType, uri: uri });
        this.resources[uri] = file;
        return this;
    };
    /**
     * Removes an image from the glTF container. Fails if image is still in use.
     * @param container
     * @param index
     */
    GLTFContainer.prototype.removeImage = function (index) {
        var textures = this.json.textures.filter(function (texture) { return texture.source === index; });
        if (textures.length) {
            throw new Error("Image is in use by " + textures.length + " textures and cannot be removed.");
        }
        var image = this.json.images[index];
        var imageBuffer = this.resolveURI(image.uri);
        if (!imageBuffer) {
            throw new Error('No such image, or image is embedded.');
        }
        this.json.images.splice(index, 1);
        this.json.textures.forEach(function (texture) {
            if (texture.source > index)
                texture.source--;
        });
        return this;
    };
    /**
     * Adds a new buffer to the glTF container.
     * @param container
     * @param name
     * @param buffer
     */
    GLTFContainer.prototype.addBuffer = function (name, buffer) {
        var uri = name + ".bin";
        this.json.buffers.push({ name: name, uri: uri, byteLength: buffer.byteLength });
        this.resources[uri] = buffer;
        return this;
    };
    /**
     * Removes a buffer from the glTF container. Fails if buffer is still in use.
     * @param container
     * @param index
     */
    GLTFContainer.prototype.removeBuffer = function (index) {
        var bufferViews = this.json.bufferViews.filter(function (view) { return view.buffer === index; });
        if (bufferViews.length) {
            throw new Error("Buffer is in use by " + bufferViews.length + " bufferViews and cannot be removed.");
        }
        var buffer = this.json.buffers[index];
        this.json.buffers.splice(index, 1);
        delete this.resources[buffer.uri];
        return this;
    };
    GLTFContainer.prototype.addAccessor = function (array, type, target) {
        throw new Error('Not implemented.');
    };
    /**
     * Returns the accessor for the given index, as a typed array.
     * @param index
     */
    GLTFContainer.prototype.getAccessorArray = function (index) {
        var accessor = this.json.accessors[index];
        var type = accessor.type;
        var bufferView = this.json.bufferViews[accessor.bufferView];
        var buffer = this.json.buffers[bufferView.buffer];
        var resource = this.resources[buffer.uri];
        var valueSize;
        switch (accessor.type) {
            case GLTF.AccessorType.VEC4:
                valueSize = 4;
                break;
            case GLTF.AccessorType.VEC3:
                valueSize = 3;
                break;
            case GLTF.AccessorType.VEC2:
                valueSize = 2;
                break;
            default:
                throw new Error("Accessor type " + accessor.type + " not implemented.");
        }
        var elementSize;
        var data;
        switch (accessor.componentType) {
            case GLTF.AccessorComponentType.FLOAT:
                elementSize = Float32Array.BYTES_PER_ELEMENT;
                data = resource.slice(bufferView.byteOffset + accessor.byteOffset, accessor.count * valueSize * elementSize);
                return new Float32Array(data);
            case GLTF.AccessorComponentType.UNSIGNED_INT:
                elementSize = Uint32Array.BYTES_PER_ELEMENT;
                data = resource.slice(bufferView.byteOffset + accessor.byteOffset, accessor.count * valueSize * elementSize);
                return new Uint32Array(data);
            case GLTF.AccessorComponentType.UNSIGNED_SHORT:
                elementSize = Uint16Array.BYTES_PER_ELEMENT;
                data = resource.slice(bufferView.byteOffset + accessor.byteOffset, accessor.count * valueSize * elementSize);
                return new Uint16Array(data);
            default:
                throw new Error("Accessor componentType " + accessor.componentType + " not implemented.");
        }
    };
    return GLTFContainer;
}());

(function (LoggerVerbosity) {
    LoggerVerbosity[LoggerVerbosity["NONE"] = 3] = "NONE";
    LoggerVerbosity[LoggerVerbosity["ERROR"] = 2] = "ERROR";
    LoggerVerbosity[LoggerVerbosity["WARNING"] = 1] = "WARNING";
    LoggerVerbosity[LoggerVerbosity["INFO"] = 0] = "INFO";
})(exports.LoggerVerbosity || (exports.LoggerVerbosity = {}));
/**
 * Logger utility class.
 */
var Logger = /** @class */ (function () {
    function Logger(name, verbosity) {
        this.name = name;
        this.verbosity = verbosity;
    }
    /**
     * Logs at level INFO.
     * @param text
     */
    Logger.prototype.info = function (text) {
        if (this.verbosity >= exports.LoggerVerbosity.INFO) {
            console.log(this.name + ": " + text);
        }
    };
    /**
     * Logs at level WARNING.
     * @param text
     */
    Logger.prototype.warn = function (text) {
        if (this.verbosity >= exports.LoggerVerbosity.WARNING) {
            console.warn(this.name + ": " + text);
        }
    };
    /**
     * Logs at level ERROR.
     * @param text
     */
    Logger.prototype.error = function (text) {
        if (this.verbosity >= exports.LoggerVerbosity.ERROR) {
            console.error(this.name + ": " + text);
        }
    };
    return Logger;
}());

/**
 * Utility class for glTF transforms.
 */
var GLTFUtil = /** @class */ (function () {
    function GLTFUtil() {
    }
    /**
     * Creates a GLTFContainer from the given JSON and files.
     * @param json
     * @param files
     */
    GLTFUtil.wrapGLTF = function (json, resources) {
        return new GLTFContainer(json, resources);
    };
    /**
     * Creates a GLTFContainer from the given GLB binary.
     * @param glb
     */
    GLTFUtil.wrapGLB = function (glb) {
        // Decode and verify GLB header.
        var header = new Uint32Array(glb, 0, 3);
        if (header[0] !== 0x46546C67) {
            throw new Error('Invalid glTF asset.');
        }
        else if (header[1] !== 2) {
            throw new Error("Unsupported glTF binary version, \"" + header[1] + "\".");
        }
        // Decode and verify chunk headers.
        var jsonChunkHeader = new Uint32Array(glb, 12, 2);
        var jsonByteOffset = 20;
        var jsonByteLength = jsonChunkHeader[0];
        var binaryChunkHeader = new Uint32Array(glb, jsonByteOffset + jsonByteLength, 2);
        if (jsonChunkHeader[1] !== 0x4E4F534A || binaryChunkHeader[1] !== 0x004E4942) {
            throw new Error('Unexpected GLB layout.');
        }
        // Decode content.    
        var jsonText = this.decodeText(glb.slice(jsonByteOffset, jsonByteOffset + jsonByteLength));
        var json = JSON.parse(jsonText);
        var binaryByteOffset = jsonByteOffset + jsonByteLength + 8;
        var binaryByteLength = binaryChunkHeader[0];
        var binary = glb.slice(binaryByteOffset, binaryByteOffset + binaryByteLength);
        var buffer = json.buffers.filter(function (b) { return !b.uri; }).pop();
        buffer.uri = 'resources.bin';
        // TODO(donmccurdy): Unpack embedded textures.
        // TODO(donmccurdy): Decode Draco content.
        return new GLTFContainer(json, { 'resources.bin': binary });
    };
    /**
     * Serializes a GLTFContainer to GLTF JSON and external files.
     * @param container
     */
    GLTFUtil.bundleGLTF = function (container) {
        var json = container.json, resources = container.resources;
        return { json: json, resources: resources };
    };
    /**
     * Serializes a GLTFContainer to a GLB binary.
     * @param container
     */
    GLTFUtil.bundleGLB = function (container) {
        throw new Error('Not implemented.');
    };
    /**
     * Creates an empty buffer.
     */
    GLTFUtil.createBuffer = function () {
        if (typeof Buffer === 'undefined') {
            // Browser.
            return new ArrayBuffer(0);
        }
        else {
            // Node.js.
            return new Buffer([]);
        }
    };
    /**
     * Creates a buffer from a Data URI.
     * @param dataURI
     */
    GLTFUtil.createBufferFromDataURI = function (dataURI) {
        if (typeof Buffer === 'undefined') {
            // Browser.
            var byteString = atob(dataURI.split(',')[1]);
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return ia.buffer;
        }
        else {
            // Node.js.
            return new Buffer(dataURI.split(',')[1], 'base64');
        }
    };
    GLTFUtil.createLogger = function (name, verbosity) {
        return new Logger(name, verbosity);
    };
    GLTFUtil.encodeText = function (text) {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(text);
        }
        return Buffer.from(text).buffer;
    };
    GLTFUtil.decodeText = function (buffer) {
        if (typeof TextDecoder !== 'undefined') {
            return new TextDecoder().decode(buffer);
        }
        var a = Buffer.from(buffer);
        return a.toString('utf8');
    };
    GLTFUtil.analyze = function (container) {
        var _this = this;
        var report = {
            meshes: (container.json.meshes || []).length,
            textures: (container.json.textures || []).length,
            materials: (container.json.materials || []).length,
            animations: (container.json.animations || []).length,
            primitives: 0,
            dataUsage: {
                geometry: 0,
                targets: 0,
                animation: 0,
                textures: 0,
                json: 0
            }
        };
        // Primitives and targets.
        (container.json.meshes || []).forEach(function (mesh) {
            report.primitives += mesh.primitives.length;
            mesh.primitives.forEach(function (primitive) {
                if (primitive.indices !== undefined) {
                    report.dataUsage.geometry += _this.getAccessorByteLength(container.json.accessors[primitive.indices]);
                }
                Object.keys(primitive.attributes).forEach(function (attr) {
                    var accessor = container.json.accessors[primitive.attributes[attr]];
                    report.dataUsage.geometry += _this.getAccessorByteLength(accessor);
                });
                (primitive.targets || []).forEach(function (target) {
                    Object.keys(target).forEach(function (attr) {
                        var accessor = container.json.accessors[target[attr]];
                        report.dataUsage.targets += _this.getAccessorByteLength(accessor);
                    });
                });
            });
        });
        // Animation
        (container.json.animations || []).forEach(function (animation) {
            animation.samplers.forEach(function (sampler) {
                var input = container.json.accessors[sampler.input];
                var output = container.json.accessors[sampler.output];
                report.dataUsage.animation += _this.getAccessorByteLength(input);
                report.dataUsage.animation += _this.getAccessorByteLength(output);
            });
        });
        // Textures
        (container.json.images || []).forEach(function (image) {
            if (image.uri !== undefined) {
                report.dataUsage.textures += container.resolveURI(image.uri).byteLength;
            }
            else {
                report.dataUsage.textures += container.json.bufferViews[image.bufferView].byteLength;
            }
        });
        // JSON
        report.dataUsage.json += JSON.stringify(container.json).length;
        return report;
    };
    GLTFUtil.getAccessorByteLength = function (accessor) {
        var itemSize = AccessorType[accessor.type].size;
        var valueSize = AccessorComponentType[accessor.componentType].size;
        return itemSize * valueSize * accessor.count;
    };
    return GLTFUtil;
}());
var AccessorType = {
    SCALAR: { value: 'SCALAR', size: 1 },
    VEC2: { value: 'VEC2', size: 2 },
    VEC3: { value: 'VEC3', size: 3 },
    VEC4: { value: 'VEC4', size: 4 },
    MAT2: { value: 'MAT2', size: 4 },
    MAT3: { value: 'MAT3', size: 9 },
    MAT4: { value: 'MAT4', size: 16 }
};
var AccessorComponentType = {
    '5120': { value: 'BYTE', size: 1 },
    '5121': { value: 'UNSIGNED_BYTE', size: 1 },
    '5122': { value: 'SHORT', size: 2 },
    '5123': { value: 'UNSIGNED_SHORT', size: 2 },
    '5125': { value: 'UNSIGNED_INT', size: 4 },
    '5126': { value: 'FLOAT', size: 4 }
};

exports.GLTFUtil = GLTFUtil;
exports.GLTFContainer = GLTFContainer;
exports.Logger = Logger;
//# sourceMappingURL=gltf-transform-util.js.map
