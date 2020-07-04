import HookableArray from "../HookableArray";
import {
  pixel,
} from "../utils";

class Tool {
  public preview(
    source: HookableArray<Array<pixel>, [number, number, pixel]>,
    sourceY: number,
    sourceX: number,
    previewContext: CanvasRenderingContext2D,
    pixelSize: number,
    offsetPixelY: number,
    offsetPixelX: number,
  ): void {}

  public draw(
    source: HookableArray<Array<pixel>, [number, number, pixel]>,
    sourceX: number,
    sourceY: number,
  ): void {}
}

export default Tool;