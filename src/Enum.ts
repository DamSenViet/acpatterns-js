// abstract class
// use this pattern over typescript enum builtin, similar to python Enum
// provides one way mappings
// allows enums as part of enums
class Enum {
  // block instances
  public constructor() {
    throw new Error(
      `Abstract class '${this.constructor.name}' cannot be instantiated.`);
  }

  // setting 'for ... of' loop
  public static [Symbol.iterator]() {
    return this.values();
  }

  // generator
  public static *keys() {
    for (let key in this) yield key;
  }

  // generator
  public static *values() {
    for (let key in this) yield this[key];
  }
};

export default Enum;