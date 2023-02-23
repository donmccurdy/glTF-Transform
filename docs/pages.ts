/** @module pages */

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-namespace */

// Generates standalone documentation pages not related to any particular class.
// May want to consider using `typedoc-plugin-pages` for this in the future, but
// it appears to be unmaintained now.

/** [[include:CONCEPTS.md]] */
export namespace Concepts {}

/** [[include:EXTENSIONS.md]] */
export namespace Extensions {}

/** [[include:CONTRIBUTING.md]] */
export namespace Contributing {}

/** [[include:CREDITS.md]] */
export namespace Credits {}

/**
 * # CLI
 *
 * For easier access to its library, glTF-Transform offers a command-line interface (CLI). The
 * CLI supports many of the features of the `@gltf-transform/functions` package, and some general
 * tools for inspecting and packing/unpacking glTF or GLB files.
 *
 * Installation:
 *
 * ```bash
 * npm install --global @gltf-transform/cli
 * ```
 *
 * Help output:
 *
 * ```text
 * [[include:CLI_HELP.md]]
 * ```
 *
 * ## Configuration
 *
 * > _**EXPERIMENTAL:** Support for command-line configuration is experimental, and may have
 * > breaking changes in non-major releases. Please provide feedback on GitHub if this feature
 * > could be helpful to you._
 *
 * Configuration installs custom commands or extensions in the CLI. Extensions will be
 * available to any commands executed by the CLI, allowing operations on glTF files that would
 * otherwise be unsupported — unofficial compression, texture formats, materials, and other features.
 * Extensions must be implemented using the {@link Extension} API.
 *
 * Usage:
 *
 * ```text
 * gltf-transform --help --config path/to/gltf-transform.config.mjs
 * ```
 *
 * Example configuration:
 *
 * ```javascript
 * // gltf-transform.config.mjs
 * import { Extension } from '@gltf-transform/core';
 * import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
 *
 * // NOTE: The minimal implementation below does not read or write any data
 * // associated with the extension. See the Extension documentation and
 * // official implementations in the /examples package for full usage.
 * class GizmoExtension extends Extension {
 *  static EXTENSION_NAME = 'ACME_gizmo';
 *  extensionName = 'ACME_gizmo';
 *  write(context) { return this; }
 *  read(context) { return this; }
 * }
 *
 * export default {
 *  extensions: [...ALL_EXTENSIONS, GizmoExtension],
 *  onProgramReady: ({ program, io, Session }) => {
 *      // Usage: https://caporal.io/
 *      program
 *          .command('custom', 'Custom command')
 *          .help('Lorem ipsum dolorem...')
 *          .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) model')
 *          .argument('<output>', 'Path to write output')
 *          .action(({ args, options, logger }) =>
 *          	Session.create(io, logger, args.input, args.output).transform(customTransform(options))
 *          );
 *  },
 * };
 *
 * // Custom transform example; clears materials.
 * function customTransform(options) {
 *  return async (document) => {
 *      for (const material of document.getRoot().listMaterials()) {
 *          material.dispose();
 *      }
 *  };
 * }
 * ```
 *
 * Writing extensions in TypeScript is strongly encouraged. However, `gltf-transform.config.mjs` must be
 * written in, or compiled to, plain JavaScript.
 */
export namespace CLI {}
