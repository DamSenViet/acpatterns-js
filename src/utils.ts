
/**
 * Name of array methods that can change an array length.
 */
type ArrayLengthMutationKeys = 'splice' | 'push' | 'pop' | 'shift' | 'unshift'

/**
 * Alias for fixed length array support.
 */
export type FixedLengthArray<T, TObj = [...Array<T>]> =
  Pick<TObj, Exclude<keyof TObj, ArrayLengthMutationKeys>>
  & {
    readonly length;
    [I: number]: T
    [Symbol.iterator]: () => IterableIterator<T>
  };

/**
 * Property configs to lock down length. Used w/ FixedLengthArray type.
 */
export const fixedLengthPropertyConfig = {
  enumerable: false,
  configurable: false,
  writable: false,
};

/**
 * A valid byte value from 0 - 255.
 */
export type byte = number;

/**
 * A css hex string;
 */
export type color = string;

/**
 * A number pointing to the palette index with the color.
 * Maps a pixel's color to a pattern's palette index.
 */
export type paletteIndex = number;

/**
 * A grid of coordinate values [x, y].
 * Used to create accessor arrays that redirect access from a coordinate in it
 * to another array at a different coordinate.
 */
export type mapping = Array<Array<[number, number]>>;


/**
 * Checks if bytes in byte array are valid values.
 */
export const validateBytes = (bytes: Array<byte>) => {
  if (!(bytes instanceof Array)) {
    const message = `Expect an array of bytes.`;
    throw new TypeError(message);
  }
  for (const byte of bytes) {
    if (
      typeof byte !== "number" ||
      byte < 0 ||
      byte > 255
    ) {
      const message = `Expected a valid unsigned byte value (number).`;
      throw new TypeError(message);
    }
  }
};


/**
 * Turns a Uint16 number into two bytes (little endian).
 * @param number - the Uint16 number to convert
 */
export const Uint16ToBytes = (number: number): [byte, byte] => {
  if (number < 0 || number > 65535) {
    const message = `Expected a valid Uint16 number.`;
    throw new RangeError(message);
  }
  const bytes = [];
  // little most significant byte last
  bytes.push(number & 0xff);
  bytes.push((number >> 8) & 0xff);
  return <[byte, byte]>bytes;
};


/**
 * Turns two bytes (little endian) into a Uin16 number.
 * @param bytes - the two bytes to convert
 */
export const bytesToUint16 = (bytes: [byte, byte]): number => {
  validateBytes(bytes);
  // little endian grab most signifcant bytes first
  return (bytes[1] << 8) + bytes[0];
};


/**
 * Encodes a utf16 JS string into bytes (little endian).
 * @param string - the string to convert
 */
export const stringToBytes = (string: string): byte[] => {
  if (typeof string !== "string") {
    const message = `Expected a string.`;
    throw new TypeError(message);
  }
  const bytes: byte[] = [];
  for (let i = 0; i < string.length; ++i) {
    const charCode = string.charCodeAt(i); // 16 bit, is two bytes
    bytes.push(charCode & 0xff);
    bytes.push((charCode >> 8) & 0xff); // little endian significant byte last
  }
  return bytes;
};


/**
 * Decodes bytes (little endian) to a utf16 JS string.
 * @param bytes - the bytes to convert
 */
export const bytesToString = (bytes: byte[]): string => {
  validateBytes(bytes);
  if (bytes.length % 2 !== 0) {
    const message = `Expected an (even length) array of bytes encoding a utf16 JS string.`;
    throw new TypeError(message);
  }
  // javascript strings are utf16, two bytes = one char
  let string: string = "";
  for (let i = 0; i < bytes.length; i += 2) {
    // little endian, grab most significant bytes first
    const charCode = (bytes[i + 1] << 8) + bytes[i];
    // ignore eos padding / null char
    if (charCode !== 0) string += String.fromCharCode(charCode);
  }
  return string;
};


/**
 * Encodes bytes (little endian) to a utf16 binary string.
 * @param bytes - the bytes (little endian) to convert
 */
export const bytesToBinaryString = (bytes: byte[]): string => {
  let string: string = "";
  for (let i = 0; i < bytes.length; ++i) {
    string += String.fromCharCode(bytes[i]);
  }
  return string;
};


/**
 * Decodes a utf16 binary string into an array of byte values.
 * @param binaryString - the binary string to convert
 */
export const binaryStringToBytes = (binaryString: string): Array<byte> => {
  if (typeof binaryString !== "string") {
    const message = `Expected a string constructed from bytes (little endian).`;
    throw new TypeError(message);
  }
  const bytes: Array<byte> = new Array<byte>();
  for (let i = 0; i < binaryString.length; ++i) {
    const charCode = binaryString.charCodeAt(i);
    bytes.push(charCode);
  }
  return bytes;
};

/**
 * Default property configs for configuring api objects.
 */
export const propertyConfig = {
  enumerable: true,
  configurable: true,
};

/**
 * Creates a debounced version of a function.
 * @param func - the function to create a debounced version of
 * @param wait - the wait time in ms
 * @param immediate - whether to execute right away
 */
export function debounce(func: Function, wait: number, immediate: boolean = false) {
  let timeout;

  return function executedFunction() {
    let context = this;
    let args = arguments;

    let later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    let callNow = immediate && !timeout;

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
};