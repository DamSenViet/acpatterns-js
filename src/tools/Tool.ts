import HookableArray from "../HookableArray";
import { DrawerMeasurements } from "../Drawer";
import {
  pixel,
} from "../utils";

class Tool {
  public preview(
    source: HookableArray<Array<pixel>, [number, number, pixel]>,
    sourceY: number,
    sourceX: number,
    overlayContext: CanvasRenderingContext2D,
    measurements: DrawerMeasurements,
  ): void {}

  public draw(
    source: HookableArray<Array<pixel>, [number, number, pixel]>,
    sourceX: number,
    sourceY: number,
  ): void {}
}

export default Tool;