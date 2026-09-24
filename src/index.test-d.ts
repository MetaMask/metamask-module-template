import { describe, it, expectTypeOf } from 'vitest';

import greeter from './index.js';

describe('greeter', () => {
  it('returns a string', () => {
    expectTypeOf(greeter('Huey')).toEqualTypeOf<string>();
  });
});
