import isCallable from 'is-callable';

/**
 * Returns whether the given argument is callable or not.
 *
 * @param callable - A function.
 * @returns Whether the given argument is callable or not.
 */
function maybeCall(callable: any): any {
  if (isCallable(callable)) {
    return callable();
  }
  return null;
}

export default maybeCall;
