(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.gltfTransform = global.gltfTransform || {}, global.gltfTransform.atlas = {})));
}(this, (function (exports) { 'use strict';

  function pack(container, options) {
      throw new Error('Not implemented');
  }

  exports.pack = pack;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=gltf-transform-atlas.umd.js.map
