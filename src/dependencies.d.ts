declare module 'is-callable' {
  export default function isCallable<T>(
    value: any,
  ): value is (...args: any[]) => T;
}
