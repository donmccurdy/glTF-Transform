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
 * ```shell
 * npm install --global @gltf-transform/cli
 * ```
 *
 * Help output:
 *
 * ```shell
 * [[include:CLI_HELP.md]]
 * ```
 */
export namespace CLI {}
