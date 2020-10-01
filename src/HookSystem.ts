import Hook from "./Hook";
import PatternType from "./PatternType";
import { color } from "./utils";

export interface HookSystem {
  type: Hook<[PatternType]>;
  palette: Hook<[number, color]>;
  load: Hook<[]>;
  refresh: Hook<[]>;
};

export default HookSystem;