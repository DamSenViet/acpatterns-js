import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface PenOptions {
  size?: number;
}

/**
 * A square Brush.
 */
class Pen extends Tool {
  /**
   * The last sourceY passed over.
   */
  protected _lastSourceY: number = null;

  /**
   * The last sourceX passed over.
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
  protected _paletteIndex: paletteIndex = 0;


  /**
   * Creates a Brush instance.
   * @param options - a config object with 'size'.
   */
  public constructor(options?: PenOptions) {
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
  public get paletteIndex(): number {
    return this._paletteIndex;
  }


  /**
   * Sets the color idx of the brush.
   */
  public set paletteIndex(paletteIndex: number) {
    if (typeof paletteIndex !== "number") {
      throw new TypeError();
    }
    this._paletteIndex = paletteIndex;
  };


  /**
   * Draws the preview/indicator.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _previewCursor(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    this.previewContext.strokeStyle = "#00d2c2";
    this.previewContext.lineWidth = Math.ceil(this.measurements.pixelSize / 4);
    // top left of the square
    let topLeftSourceX: number;
    let topLeftSourceY: number;
    if (this._size % 2 === 0) {
      topLeftSourceX = targetSourceX - (this._size / 2);
      topLeftSourceY = targetSourceY - (this._size / 2) + 1;
    }
    else {
      topLeftSourceX = targetSourceX - Math.floor(this._size / 2);
      topLeftSourceY = targetSourceY - Math.floor(this._size / 2);
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
   * Commits pixels from the and triggers a redraws when fininished.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _pixels(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    // even
    if (this._size === 1) {
      this.source[targetSourceY][targetSourceX] = this._paletteIndex;
      return;
    }

    let topLeftX: number;
    let topLeftY: number;
    if (this._size % 2 === 0) {
      topLeftX = targetSourceX - (this._size / 2);
      topLeftY = targetSourceY - (this._size / 2) + 1;
    }
    else {
      topLeftX = targetSourceX - Math.floor(this._size / 2);
      topLeftY = targetSourceY - Math.floor(this._size / 2);
    }
    for (let sourceY = topLeftY; sourceY < topLeftY + this._size; ++sourceY) {
      for (let sourceX = topLeftX; sourceX < topLeftX + this._size; ++sourceX) {
        if (sourceY >= this.measurements.sourceHeight || sourceY < 0) continue;
        if (sourceX >= this.measurements.sourceWidth || sourceX < 0) continue;
        this.source.unreactive[sourceY][sourceX] = this._paletteIndex;
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
    const targetSourceY = yx[0];
    const targetSourceX = yx[1];

    if (
      this._lastSourceY === targetSourceY &&
      this._lastSourceX === targetSourceX
    ) return;

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;
    this._didDrawOnLastSource = false;

    if (this.preview) {
      this.refreshPreview();
      this._previewCursor(targetSourceY, targetSourceX);
    }

    // this will automatically trigger redraw if it fires
    if (
      mouseEvent.buttons === 1 &&
      !this._didDrawOnLastSource
    ) {
      this._pixels(targetSourceY, targetSourceX);
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
      this._previewCursor(sourceY, sourceX);
    }

    this._pixels(sourceY, sourceX);
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

export default Pen;