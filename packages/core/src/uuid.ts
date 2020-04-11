/**
 * UUID generator.
 *
 * Based on https://tomspencer.dev/blog/2014/11/16/short-id-generation-in-javascript/,
 * with alterations. Quick, simple, and no dependencies.
 */

const ALPHABET = '23456789abdegjkmnpqrvwxyzABDEGJKMNPQRVWXYZ';
const UNIQUE_RETRIES = 999;
const ID_LENGTH = 6;

const previousIDs = new Set();

const generateOne = function() {
  let rtn = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
}

export const uuid = function() {
  for (let retries = 0; retries < UNIQUE_RETRIES; retries++) {
    const id = generateOne();
    if (!previousIDs.has(id)) return id;
  }
  return '';
};
