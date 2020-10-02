import Tool from "./Tool";
import { pixel } from "../utils";

export interface BrushOptions {
  size?: number;
}

/**
 * A square Brush.
 */
class Brush extends Tool {
  /**
   * The last sourceY drawn on.
   */
  protected _lastSourceY: number = null;

  /**
   * The last sourceX drawn on.
   */
  protected _lastSourceX: number = null;

  /**
   * Flag to reduce drawing operations.
   */
  protected _didDrawOnLastSource: boolean = false;

  /**
   * The size of the brush, how wide/tall it is.
   */
  protected _size: number = 1;

  /**
   * The value to overwrite pixels with.
   * A pointer to a color in the pattern palette.
   */
  protected _colorIndex: pixel = 0;


  /**
   * Creates a Brush instance.
   * @param options - a config option with 'size'.
   */
  public constructor(options?: BrushOptions) {
    super();
    if (arguments.length <= 0) return;
    const { size } = options;
    if (size != null) this.size = size;
  }


  /**
   * Gets the size of the brush.
   */
  public get size(): number {
    return this._size;
  }


  /**
   * Sets the size of the brush.
   */
  public set size(size: number) {
    if (typeof size !== "number") throw new TypeError();
    this._size = size;
  }


  /**
   * Gets the color idx of the brush.
   */
  public get colorIndex(): number {
    return this._colorIndex;
  }


  /**
   * Sets the color idx of the brush.
   */
  public set colorIndex(colorIndex: number) {
    if (typeof colorIndex !== "number") {
      throw new TypeError();
    }
    this._colorIndex = colorIndex;
  };


  /**
   * Draws the preview/indicator.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _drawPreview(
    sourceY: number,
    sourceX: number,
  ): void {
    this.previewContext.strokeStyle = "#00d2c2";
    this.previewContext.lineWidth = Math.ceil(this.measurements.pixelSize / 4);
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
    this.previewContext.beginPath();
    // top left
    this.previewContext.moveTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // top right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + this._size) * this.measurements.pixelSize, this.measurements.xStop),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // bottom right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + this._size) * this.measurements.pixelSize, this.measurements.xStop),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + this._size) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // bottom left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + this._size) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // back to top left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    this.previewContext.stroke();
  }


  /**
   * Draws pixels from the and triggers a redraws when fininished.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _drawPixels(
    sourceY: number,
    sourceX: number,
  ): void {
    // even
    if (this._size === 1) {
      this.source[sourceY][sourceX] = this._colorIndex;
      return;
    }

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
        if (y >= this.measurements.sourceHeight || y < 0) continue;
        if (x >= this.measurements.sourceWidth || x < 0) continue;
        this.source.unreactive[y][x] = this._colorIndex;
      }
    }
    this.forceRefresh();
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const yx = this.mouseEventToSourceYX(mouseEvent);
    if (yx == null) return;
    const [sourceY, sourceX] = yx;

    if (
      this._lastSourceY === sourceY &&
      this._lastSourceX === sourceX
    ) return;

    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;
    this._didDrawOnLastSource = false;

    if (this.preview) {
      this.refreshPreview();
      this._drawPreview(sourceY, sourceX);
    }

    // this will automatically trigger redraw if it fires
    if (
      mouseEvent.buttons === 1 &&
      !this._didDrawOnLastSource
    ) {
      this._drawPixels(sourceY, sourceX);
      this._didDrawOnLastSource = true;
    }
    // otherwise make sure to request it!!!
    else if (this.preview) requestAnimationFrame(this.redraw);
  };


  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    const yx = this.mouseEventToSourceYX(mouseEvent);
    if (yx == null) return;
    const [sourceY, sourceX] = yx;

    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;

    if (this.preview) {
      this.refreshPreview();
      this._drawPreview(sourceY, sourceX);
    }

    this._drawPixels(sourceY, sourceX);
    this._didDrawOnLastSource = true;
  };


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
  }
}

export default Brush;