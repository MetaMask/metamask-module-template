type CacheComputers<Properties> = {
  [Key in keyof Properties]: () => Promise<Properties[Key]>;
};

export class Cache<
  Properties extends Record<string | number | symbol, unknown>,
> {
  #computers: CacheComputers<Properties>;

  #cache: Partial<Properties>;

  constructor(computers: CacheComputers<Properties>) {
    this.#computers = computers;
    this.#cache = {};
  }

  async fetch<Key extends keyof Properties>(
    key: Key,
  ): Promise<Properties[Key]> {
    const possibleValue: Properties[Key] | undefined = this.#cache[key];
    let definiteValue: Properties[Key];
    if (possibleValue === undefined) {
      definiteValue = await this.#computers[key]();
    } else {
      definiteValue = possibleValue;
    }
    this.#cache[key] = definiteValue;
    return definiteValue;
  }
}
