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
   * The last pixelY pased over.
   */
  protected _lastPixelY: number = null;

  /**
   * The last pixelX passed over.
   */
  protected _lastPixelX: number = null;

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
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX - the x coordinate of the source
   */
  protected _indicateCursor(
    targetSourceY: number,
    targetSourceX: number,
    size: number = this._size,
  ): void {
    this._indicatorContext.strokeStyle = "#00d2c2";
    this._indicatorContext.lineWidth = Math.ceil(this._measurements.pixelSize / 4);
    // top left of the square
    let topLeftSourceX: number;
    let topLeftSourceY: number;
    if (size % 2 === 0) {
      topLeftSourceX = targetSourceX - (size / 2);
      topLeftSourceY = targetSourceY - (size / 2) + 1;
    }
    else {
      topLeftSourceX = targetSourceX - Math.floor(size / 2);
      topLeftSourceY = targetSourceY - Math.floor(size / 2);
    }
    this._indicatorContext.beginPath();
    // top left
    this._indicatorContext.moveTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    // top right
    this._indicatorContext.lineTo(
      Math.min((this._measurements.pixelXStart + topLeftSourceX + size) * this._measurements.pixelSize, this._measurements.xStop),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    // bottom right
    this._indicatorContext.lineTo(
      Math.min((this._measurements.pixelXStart + topLeftSourceX + size) * this._measurements.pixelSize, this._measurements.xStop),
      Math.min((this._measurements.pixelYStart + topLeftSourceY + size) * this._measurements.pixelSize, this._measurements.yStop),
    );
    // bottom left
    this._indicatorContext.lineTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.min((this._measurements.pixelYStart + topLeftSourceY + size) * this._measurements.pixelSize, this._measurements.yStop),
    );
    // back to top left
    this._indicatorContext.lineTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    this._indicatorContext.stroke();
  }


  /**
   * Commits pixels from the and triggers a redraws when fininished.
   * @param targetSourceY - y coordinate in source
   * @param targetSourceX - x coordinate in source
   */
  protected _pixels(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    // even
    if (this._size === 1) {
      this._source[targetSourceY][targetSourceX] = this._paletteIndex;
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
        if (sourceY >= this._measurements.sourceHeight || sourceY < 0) continue;
        if (sourceX >= this._measurements.sourceWidth || sourceX < 0) continue;
        this._source.unreactive[sourceY][sourceX] = this._paletteIndex;
      }
    }
    this._pattern.hooks.refresh.trigger();
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const targetPixelY = pixelPoint[0];
    const targetPixelX = pixelPoint[1];
    if (
      this._lastPixelY === targetPixelY &&
      this._lastPixelX === targetPixelX
    ) return;
    this._lastPixelY = targetPixelY;
    this._lastPixelX = targetPixelX;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    const targetSourceY = sourcePoint[0];
    const targetSourceX = sourcePoint[1];

    if (
      this._lastSourceY === targetSourceY &&
      this._lastSourceX === targetSourceX
    ) return;

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;
    this._didDrawOnLastSource = false;

    if (this._indicator) {
      this._refreshIndicator();
      this._indicateCursor(targetSourceY, targetSourceX);
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
    else if (this._indicator) requestAnimationFrame(this._redraw);
  };


  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) return;
    const targetSourceY = sourcePoint[0];
    const targetSourceX = sourcePoint[1];

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;

    if (this._indicator) {
      this._refreshIndicator();
      this._indicateCursor(targetSourceY, targetSourceX);
    }

    this._pixels(targetSourceY, targetSourceX);
    this._didDrawOnLastSource = true;
  };


  /**
   * Mouseout callback. Clears the preview.
   * @param mouseEvent - mouse event passed to the callback
   */
  public _onMouseOut = (mouseEvent?: MouseEvent): void => {
    this._lastPixelY = null;
    this._lastPixelX = null;
    this._lastSourceY = null;
    this._lastSourceX = null;
    this._refreshIndicator();
    requestAnimationFrame(this._redraw);
  };

  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this._canvas.addEventListener("mousemove", this._onMouseMove);
    this._canvas.addEventListener("mousedown", this._onMouseDown);
    this._canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this._canvas.removeEventListener("mousemove", this._onMouseMove);
    this._canvas.removeEventListener("mousedown", this._onMouseDown);
    this._canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default Pen;