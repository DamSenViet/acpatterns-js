import Hook from "./Hook";
import HookableArray from "./HookableArray";

export type byte = number;
export type color = string;
export type pixel = number;

export type mapping = Array<Array<[pixel, pixel]>>;
export interface PatternType {
  name: string;
  size: number; // how many rows there are, default is 32x by 128y
  sections: {
    texture: mapping;
    [key: string]: mapping;
  };
  // 32 bit numbers only
  mask?: number[];
};

// avoid having to set up
export type PatternPalette = [
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
];

export interface HookSystem {
  type: Hook<[PatternType]>;
  palette: Hook<[number, color]>;
};

export interface Drawable {
  type: PatternType;
  palette: Array<color>;
  hooks: HookSystem;
  pixels: HookableArray<Array<pixel>, [number, number, pixel]>;
  sections: {
    texture: HookableArray<Array<pixel>, [number, number, pixel]>;
    [key: string]: HookableArray<Array<pixel>, [number, number, pixel]>;
  }
};

// assume bytes were stored little endian
export const Uint16ToBytes = (number: number): [byte, byte] => {
  const bytes = [];
  // little most significant byte last
  bytes.push(number & 0xff);
  bytes.push((number >> 8) & 0xff);
  return <[byte, byte]>bytes;
}

export const bytesToUint16 = (bytes: [byte, byte]): number => {
  // little endian grab most signifcant bytes first
  return (bytes[1] << 8) + bytes[0];
}

export const stringToBytes = (string: string): byte[] => {
  const bytes: byte[] = [];
  for (let i = 0; i < string.length; ++i) {
    const charCode = string.charCodeAt(i); // 16 bit, is two bytes
    bytes.push(charCode & 0xff);
    bytes.push((charCode >> 8) & 0xff); // little endian significant byte last
  }
  return bytes;
};

export const bytesToString = (bytes: byte[]): string => {
  let string: string = "";
  for (let i = 0; i < bytes.length; i += 2) {
    // little endian, grab most significant bytes first
    const charCode = (bytes[i + 1] << 8) + bytes[i];
    // ignore eos padding / null char
    if (charCode !== 0) string += String.fromCharCode(charCode);
  }
  return string;
};

export const bytesToBinaryString = (bytes: byte[]): string => {
  let string: string = "";
  for (let i = 0; i < bytes.length; ++i) {
    string += String.fromCharCode(bytes[i]);
  }
  return string;
};

export const binaryStringToBytes = (binaryString: string): byte[] => {
  const bytes: byte[] = [];
  for (let i = 0; i < binaryString.length; ++i) {
    const charCode = binaryString.charCodeAt(i); // 16 bit, is two bytes
    bytes.push(charCode);
  }
  return bytes;
};

export const propertyConfig = {
  enumerable: true,
  configurable: true,
};


export function debounce(func: Function, wait: number, immediate: boolean = false) {
  let timeout;

  return function executedFunction() {
    let context = this;
    let args = arguments;

    let later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    let callNow = immediate && !timeout;

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
};