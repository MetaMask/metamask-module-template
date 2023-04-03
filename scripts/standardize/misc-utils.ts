import { isObject } from '@metamask/utils';
import debug from 'debug';
import execa from 'execa';
import { ErrorWithCause } from 'pony-cause';

export const log = debug('standardize');

/**
 * Type guard for determining whether the given value is an instance of Error.
 * For errors generated via `fs.promises`, `error instanceof Error` won't work,
 * so we have to come up with another way of testing.
 *
 * @param error - The object to check.
 * @returns True or false, depending on the result.
 */
function isError(error: unknown): error is Error {
  return (
    error instanceof Error ||
    (isObject(error) && error.constructor.name === 'Error')
  );
}

/**
 * Type guard for determining whether the given value is an error object with a
 * `code` property such as the type of error that Node throws for filesystem
 * operations, etc.
 *
 * @param error - The object to check.
 * @returns True or false, depending on the result.
 */
export function isErrorWithCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Builds a new error object, linking to the original error via the `cause`
 * property if it is an Error.
 *
 * This function is useful to reframe error messages in general, but is
 * _critical_ when interacting with any of Node's filesystem functions as
 * provided via `fs.promises`, because these do not produce stack traces in the
 * case of an I/O error (see <https://github.com/nodejs/node/issues/30944>).
 *
 * @param message - The desired message of the new error.
 * @param originalError - The error that you want to cover (either an Error or
 * something throwable).
 * @returns A new error object.
 */
export function wrapError(message: string, originalError: unknown) {
  if (isError(originalError)) {
    const error: any = new ErrorWithCause(message, { cause: originalError });

    if (isErrorWithCode(originalError)) {
      error.code = originalError.code;
    }

    return error;
  }

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return new Error(`${message}: ${originalError}`);
}

/**
 * Runs a Git command, splitting up the immediate output into lines.
 *
 * @param command - The command to execute.
 * @param args - The positional arguments to the command.
 * @param options - The options to `execa`.
 * @returns The standard output of the command.
 * @throws An `execa` error object if the command fails in some way.
 * @see `execa`.
 */
export async function getLinesFromCommand(
  command: string,
  args?: readonly string[] | undefined,
  options?: execa.Options | undefined,
): Promise<string[]> {
  const { stdout } = await execa(command, args, options);
  return stdout.split('\n').filter((value) => value !== '');
}

/**
 * `Object.keys()` is intentionally generic: it returns the keys of an object,
 * but it cannot make guarantees about the contents of that object, so the type
 * of the keys is merely `string[]`. While this is technically accurate, it is
 * also unnecessary if we have an object that we own and whose contents are
 * known exactly.
 *
 * @param object - The object.
 * @returns The keys of an object, typed according to the type of the object
 * itself.
 */
export function knownKeysOf<K extends string | number | symbol>(
  object: Partial<Record<K, any>>,
) {
  return Object.keys(object) as K[];
}

/**
 * TODO.
 *
 * @param object - TODO.
 * @param rootPropertyPath - TODO.
 * @returns TODO.
 */
export function flattenObject(
  object: Record<string, any>,
  rootPropertyPath: string[] = [],
) {
  return Object.keys(object).reduce<{ propertyPath: string[]; value: any }[]>(
    (flattenedObject, propertyName) => {
      const propertyPath = [...rootPropertyPath, propertyName];
      return [
        ...flattenedObject,
        { propertyPath, value: object[propertyName] },
      ];
    },
    [],
  );
}

/**
 * TODO.
 *
 * @param object - TODO.
 * @param propertyPath - TODO.
 * @returns TODO.
 */
export function getPropertyViaPath(
  object: Record<string, any>,
  propertyPath: string[],
): any {
  const firstPath = propertyPath[0];

  if (firstPath === undefined) {
    return object;
  }

  const value = object[firstPath];

  if (typeof value === 'object' && value !== null) {
    return getPropertyViaPath(value, propertyPath.slice(1));
  }

  return value;
}

/**
 * TODO.
 *
 * @param character - TODO.
 * @param desiredLength - TODO.
 * @returns TODO.
 */
export function buildDivider(character: string, desiredLength: number): string {
  let divider = '';
  for (let i = 0; i < desiredLength; i++) {
    divider += character;
  }
  return divider;
}
