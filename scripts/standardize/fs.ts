import { isPlainObject } from '@metamask/utils';
import type { PlainObject } from '@metamask/utils';
import fs from 'fs';

import { isErrorWithCode, wrapError } from './misc-utils';

/**
 * Reads the file at the given path, assuming its content is encoded as UTF-8.
 *
 * @param filePath - The path to the file.
 * @returns The content of the file.
 * @throws An error with a stack trace if reading fails in any way.
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    throw wrapError(`Could not read file '${filePath}'`, error);
  }
}

/**
 * Reads the assumed JSON file at the given path, attempts to parse it, and
 * returns the resulting object.
 *
 * @param filePath - The path segments pointing to the JSON file. Will be passed
 * to path.join().
 * @returns The object corresponding to the parsed JSON file, typed against the
 * struct.
 * @throws An error with a stack trace if reading fails in any way, or if the
 * parsed value is not a plain object.
 */
export async function readJsonFile(filePath: string): Promise<PlainObject> {
  try {
    const content = await readFile(filePath);
    const json = JSON.parse(content);
    if (!isPlainObject(json)) {
      throw new Error(`Parsed version of "${filePath}" is not a plain object.`);
    }
    return json;
  } catch (error) {
    throw wrapError(`Could not read JSON file '${filePath}'`, error);
  }
}

/**
 * Determines whether the given path refers to a file.
 *
 * @param entryPath - The path.
 * @returns The boolean result.
 */
export async function isFile(entryPath: string): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(entryPath);
    return stats.isFile();
  } catch (error) {
    if (isErrorWithCode(error) && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Determines whether the given path refers to a directory.
 *
 * @param entryPath - The path.
 * @returns The boolean result.
 */
export async function isDirectory(entryPath: string): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(entryPath);
    return stats.isDirectory();
  } catch (error) {
    if (isErrorWithCode(error) && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
