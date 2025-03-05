import { describe, it, expectTypeOf } from 'vitest';

import greeter from '.';

describe('greeter', () => {
  it('returns a string', () => {
    expectTypeOf(greeter('Huey')).toEqualTypeOf<string>();
  });
});
