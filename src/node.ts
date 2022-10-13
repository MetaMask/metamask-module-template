// Running `yarn lint` does not cause any errors in this file.

// `crypto` import should be disallowed.
import { createHash } from 'crypto';

export const doThing = () => {
  // `Buffer` global should be disallowed.
  const value = Buffer.from('foo bar');

  createHash('sha256').update(value).digest('hex');
};
