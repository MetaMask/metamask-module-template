import { mocked } from 'ts-jest/utils';
import isCallable from 'is-callable';
import callMeMaybe from './callMeMaybe';

jest.mock('is-callable');

const mockedIsCallable = mocked(isCallable, true);

describe('callMeMaybe', () => {
  it('returns the result of the callable when isCallable returns true', () => {
    mockedIsCallable.mockReturnValue(true);
    const fn = () => 42;
    expect(callMeMaybe(fn)).toBe(42);
  });

  it('returns null when isCallable returns false', () => {
    mockedIsCallable.mockReturnValue(false);
    const fn = () => 42;
    expect(callMeMaybe(fn)).toBeNull();
  });
});
