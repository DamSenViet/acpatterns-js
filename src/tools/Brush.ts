import Tool from "./Tool";
import HookableArray from "../HookableArray";
import { DrawerMeasurements } from "../Drawer";
import { pixel } from "../utils";


export type colorIndex = number;

export interface BrushOptions {
  size?: number;
}

class Brush extends Tool {
  private _size: number = 1;
  private _colorIndex: colorIndex = 0;

  public constructor(options?: BrushOptions) {
    super();
    if (arguments.length <= 0) return;
    const { size } = options;
    if (size != null) this.size = size;
  }

  public get size(): number {
    return this._size;
  }

  public set size(size: number) {
    if (typeof size !== "number") throw new TypeError();
    this._size = size;
  }

  public preview(
    source: HookableArray<Array<pixel>, [number, number, pixel]>,
    sourceY: number,
    sourceX: number,
    previewContext: CanvasRenderingContext2D,
    measurements: DrawerMeasurements,
  ): void {
    previewContext.strokeStyle = "#00d2c2";
    previewContext.lineWidth = Math.ceil(measurements.pixelSize / 4);
    // top left of the square
    let topLeftSourceX: number;
    let topLeftSourceY: number;
    if (this._size % 2 === 0) {
      topLeftSourceX = sourceX - (this._size / 2);
      topLeftSourceY = sourceY - (this._size / 2) + 1;
    }
    else {
      topLeftSourceX = sourceX - Math.floor(this._size / 2);
      topLeftSourceY = sourceY - Math.floor(this._size / 2);
    }
    previewContext.beginPath();
    // top left
    previewContext.moveTo(
      Math.max((measurements.pixelXStart + topLeftSourceX) * measurements.pixelSize, measurements.xStart),
      Math.max((measurements.pixelYStart + topLeftSourceY) * measurements.pixelSize, measurements.yStart),
    );
    // top right
    previewContext.lineTo(
      Math.min((measurements.pixelXStart + topLeftSourceX + this._size) * measurements.pixelSize, measurements.xStop),
      Math.max((measurements.pixelYStart + topLeftSourceY) * measurements.pixelSize, measurements.yStart),
    );
    // bottom right
    previewContext.lineTo(
      Math.min((measurements.pixelXStart + topLeftSourceX + this._size) * measurements.pixelSize, measurements.xStop),
      Math.min((measurements.pixelYStart + topLeftSourceY + this._size) * measurements.pixelSize, measurements.yStop),
    );
    // bottom left
    previewContext.lineTo(
      Math.max((measurements.pixelXStart + topLeftSourceX) * measurements.pixelSize, measurements.xStart),
      Math.min((measurements.pixelYStart + topLeftSourceY + this._size) * measurements.pixelSize, measurements.yStop),
    );
    // back to top left
    previewContext.lineTo(
      Math.max((measurements.pixelXStart + topLeftSourceX) * measurements.pixelSize, measurements.xStart),
      Math.max((measurements.pixelYStart + topLeftSourceY) * measurements.pixelSize, measurements.yStart),
    );
    previewContext.stroke();
  }

  public draw(
    source: HookableArray<Array<pixel>, [number, number, pixel]>,
    sourceY: number,
    sourceX: number,
    previewContext: CanvasRenderingContext2D,
    measurements: DrawerMeasurements,
  ): void {
    // even
    let topLeftX: number;
    let topLeftY: number;
    if (this._size % 2 === 0) {
      topLeftX = sourceX - (this._size / 2);
      topLeftY = sourceY - (this._size / 2) + 1;
    }
    else {
      topLeftX = sourceX - Math.floor(this._size / 2);
      topLeftY = sourceY - Math.floor(this._size / 2);
    }
    for (let y = topLeftY; y < topLeftY + this._size; ++y) {
      for (let x = topLeftX; x < topLeftX + this._size; ++x) {
        if (y >= source.length || y < 0) continue;
        if (x >= source[0].length || x < 0) continue;
        source[y][x] = this._colorIndex;
      }
    }
  }
}

export default Brush;