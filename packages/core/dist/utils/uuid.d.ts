/**
 * Short ID generator.
 *
 * Generated IDs are short, easy to type, and unique for the duration of the program's execution.
 * Uniqueness across multiple program executions, or on other devices, is not guaranteed. Based on
 * [Short ID Generation in JavaScript](https://tomspencer.dev/blog/2014/11/16/short-id-generation-in-javascript/),
 * with alterations.
 *
 * @category Utilities
 * @hidden
 */
export declare const uuid: () => string;
