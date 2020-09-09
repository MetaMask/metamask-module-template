const greeter = require('./index');

describe('Test', () => {
  it('greets', () => {
    const name = 'Huey';
    const result = greeter(name);
    expect(result).toEqual('Hello, Huey!');
  });
});
