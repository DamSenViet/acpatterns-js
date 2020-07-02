import Hook from "./Hook";

class HookableArray<T, U extends any[]> extends Array<T> {
  public hook: Hook<U> = new Hook<U>();
  public constructor(...args) {
    super(...args);
  }
}

export default HookableArray;