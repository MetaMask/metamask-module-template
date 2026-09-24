import { describe, it, expect } from 'vitest';

import greeter from './index.js';

describe('greeter', () => {
  it('greets', () => {
    const name = 'Huey';
    const result = greeter(name);
    expect(result).toBe('Hello, Huey!');
  });
});
