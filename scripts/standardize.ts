#!./node_modules/.bin/ts-node

import fs from 'fs';
import path from 'path';
// import util from 'util';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
// import { diff, jsonPatchPathConverter } from 'just-diff';
import {
  CompilerOptions,
  ProjectReference,
  TypeAcquisition,
  WatchOptions,
} from 'typescript';
// import { PartialDeep } from 'type-fest';
// import { applyPatch } from 'fast-json-patch'
import { mergeAndConcat } from 'merge-anything';
import { isPrimitive } from 'is-what';

// TODO: Is TypeScript really providing us with that much benefit here?

const ROOT_DIRECTORY = path.resolve(__dirname, '..');

type TSConfig = {
  files?: string[];
  extends?: string[];
  include?: string[];
  exclude?: string[];
  compilerOptions?: CompilerOptions;
  references?: ProjectReference[];
  watchOptions?: WatchOptions;
  typeAcquisition?: TypeAcquisition;
};

type ProjectConfig = {
  'tsconfig.json'?: TSConfig;
  'tsconfig.build.json'?: TSConfig;
};

type FilePath = keyof ProjectConfig;

class Project {
  #directoryPath: string;

  #name: string;

  #config: ProjectConfig;

  constructor(directoryPath: string) {
    this.#directoryPath = directoryPath;
    this.#name = path.basename(directoryPath);

    const packageConfigFile = path.join(directoryPath, 'package.json');
    const packageConfig = JSON.parse(
      fs.readFileSync(packageConfigFile, 'utf8'),
    );
    this.#config = packageConfig['module-template'] ?? {};
  }

  /**
   * Runs a litany of checks to ensure that the project rooted at the given path
   * conforms to this template.
   */
  standardize() {
    this.#standardizeTsConfig();
  }

  #standardizeTsConfig() {
    this.#copyJsonFile('tsconfig.json');
    this.#copyJsonFile('tsconfig.build.json');
  }

  #copyJsonFile(name: FilePath) {
    const filePath = path.join(this.#directoryPath, name);
    const templateFilePath = path.join(ROOT_DIRECTORY, name);
    const templateConfig = JSON.parse(
      fs.readFileSync(templateFilePath, 'utf8'),
    ) as TSConfig;
    const overrides = this.#config[name] ?? {};
    const mergedConfig = mergeAndConcat(templateConfig, overrides);

    const sortedConfig = deeplySpecificallySortObject(mergedConfig, [
      'extends',
      'compilerOptions',
      'files',
      'include',
      'exclude',
      'references',
      'watchOptions',
      'typeAcquisition',
    ]);

    fs.writeFileSync(filePath, JSON.stringify(sortedConfig, null, 2));
    console.log(`[${this.#name}] Wrote new version of ${name}.`);
  }
}

/**
 * `Object.keys` returns a set of keys for an object, but the type of those keys
 * is `string[]`. The rationale for this, according to the TypeScript folks, is
 * that it is impossible to guarantee the type of the object in question because
 * objects are so flexible. This makes sense, but we're willing to forego that
 * in favor of good types.
 *
 * See this for more: <https://fettblog.eu/typescript-better-object-keys/>.
 *
 * @param object - The object.
 * @returns The keys from that object.
 */
function keys<T extends object, K extends keyof T>(object: T): K[] {
  return Object.keys(object) as K[];
}

/**
 * Sorts the given value, assuming that it is sortable.
 *
 * @param value - The value to be sorted.
 */
function deeplySort<T>(value: T): T;
function deeplySort<T>(value: T[]): T[];
/* eslint-disable-next-line */
function deeplySort(value: any): any {
  if (Array.isArray(value)) {
    return deeplySortArray(value);
  } else if (isPrimitive(value)) {
    return value;
  }
  return deeplySortObject(value);
}

/**
 * Sorts the given object so that its keys appear in the given order and its
 * values are sorted recursively.
 *
 * @param object - The object to sort.
 * @param propertiesInDesiredOrder - The properties.
 * @returns The sorted version of the object.
 */
function deeplySpecificallySortObject<T extends Record<any, any>>(
  object: T,
  propertiesInDesiredOrder: string[],
): T {
  return propertiesInDesiredOrder.reduce((sortedObject, property) => {
    if (!(property in object) || object[property] === undefined) {
      return sortedObject;
    }
    return { ...sortedObject, [property]: deeplySort(object[property]) };
  }, {} as T);
}

/**
 * Sorts the given object so that its keys appear in alphabetical order and its
 * values are sorted recursively.
 *
 * @param value - The object to sort.
 * @returns The sorted version of the object.
 */
function deeplySortObject<T extends Record<string | symbol | number, any>>(
  value: T,
): T {
  return keys(value)
    .sort()
    .reduce((object, key) => {
      return { ...object, [key]: deeplySort(value[key]) };
    }, {} as T);
}

/**
 * Sorts the given array and its contents recursively.
 *
 * @param values - The values to sort.
 * @returns The sorted version of the array.
 */
function deeplySortArray<T>(values: T[]): T[] {
  return values
    .slice()
    .sort()
    .map((value) => deeplySort(value));
}

/**
 * Produces an inspected version of the given object.
 *
 * @param object - The object.
 * @returns The inspected version.
 */
// function inspect(object: any): string {
// return util.inspect(object, { depth: null });
// }

/**
 * Accesses a value at a particular path in an object.
 *
 * @param object - The object.
 * @param propertyPath - An array of property names which will be used to locate
 * the value.
 * @returns The value at the given path.
 * @throws if the value cannot be found.
 */
// function lookup(object: any, propertyPath: (string | number)[]): any {
// return propertyPath.reduce((value, key) => {
// return value[key];
// }, object);
// }

/**
 * Makes the given path more compact by replacing the root directory of this
 * module template with "@/".
 *
 * @param entryPath - The path.
 * @returns The normalized path.
 */
// function normalizePath(entryPath: string): string {
// return entryPath.replace(`${ROOT_DIRECTORY}/`, '@/');
// }

/**
 * Determines whether the given path refers to a file.
 *
 * @param entryPath - The path.
 * @returns The boolean result.
 */
// function isFile(entryPath: string): boolean {
// const stats = fs.statSync(entryPath, {
// throwIfNoEntry: false,
// });

// return stats ? stats.isFile() : false;
// }

/**
 * Determines whether the given path refers to a directory.
 *
 * @param entryPath - The path.
 * @returns The boolean result.
 */
function isDirectory(entryPath: string): boolean {
  const stats = fs.statSync(entryPath, {
    throwIfNoEntry: false,
  });

  return stats ? stats.isDirectory() : false;
}

/**
 * Expands the given path, checking first that it likely refers to a MetaMask
 * project.
 *
 * @param unresolvedPath - A filesystem path.
 * @returns The full path.
 * @throws if any of the paths is not a directory.
 */
function lookupProject(unresolvedPath: string): Project {
  if (
    isDirectory(unresolvedPath) &&
    isDirectory(path.join(unresolvedPath, '.git'))
  ) {
    return new Project(path.resolve(ROOT_DIRECTORY, unresolvedPath));
  }
  throw new Error(
    `${unresolvedPath} does not seem to point to a project. Please correct this path and try again.`,
  );
}

/**
 * The main entrypoint of this script.
 */
async function main() {
  const args = await yargs(hideBin(process.argv))
    .usage('USAGE: $0 [OPTIONS] PATHS...')
    .demandCommand(1, 'Must provide at least one path to a project directory!')
    .version(false)
    .help('help', "You're looking at it ;)")
    .strict()
    .parse();
  const unresolvedPaths = args._ as string[];
  const projects = unresolvedPaths.map(lookupProject);
  projects.forEach((project) => project.standardize());
}

main().catch((error) => console.error(error));
