import Hook from "./Hook";

class HookableArray<T> extends Array<T> {
  public hook: Hook = new Hook();
  public constructor(...args) {
    super(...args);
  }
}

export default HookableArray;