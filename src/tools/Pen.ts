import Tool, { defaultStrokeStyle } from "./Tool";
import { paletteIndex } from "../utils";

export interface PenOptions {
  size?: number;
  paleletteIndex?: paletteIndex;
};

/**
 * A square Brush.
 */
class Pen extends Tool {
  /**
   * The last pixelX passed over.
   */
  protected _lastPixelX: number = null;

  /**
   * The last pixelY pased over.
   */
  protected _lastPixelY: number = null;

  /**
   * The last sourceX passed over.
   */
  protected _lastSourceX: number = null;

  /**
   * The last sourceY passed over.
   */
  protected _lastSourceY: number = null;

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
   * Instantiates a Brush tool.
   * @param options - a config object with 'size'.
   */
  public constructor(options?: PenOptions) {
    super();
    if (arguments.length <= 0) return;
    const { size, paleletteIndex } = options;
    if (size != null) this.size = size;
    if (paleletteIndex != null) this.paletteIndex = paleletteIndex;
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
   * @param targetSourceX - the x coordinate of the source
   * @param targetSourceY - the y coordinate of the source
   */
  protected _indicateCursor(
    targetSourceX: number,
    targetSourceY: number,
    size: number = this._size,
  ): void {
    this._indicatorContext.strokeStyle = defaultStrokeStyle;
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
   * @param targetSourceX - x coordinate in source
   * @param targetSourceY - y coordinate in source
   */
  protected _pixels(
    targetSourceX: number,
    targetSourceY: number,
  ): void {
    // even
    if (this._size === 1) {
      this._source.reactive[targetSourceX][targetSourceY] = this._paletteIndex;
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
        this._source.unreactive[sourceX][sourceY] = this._paletteIndex;
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
    const targetPixelX = pixelPoint[0];
    const targetPixelY = pixelPoint[1];
    if (
      this._lastPixelX === targetPixelX &&
      this._lastPixelY === targetPixelY
    ) return;
    this._lastPixelX = targetPixelX;
    this._lastPixelY = targetPixelY;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    const targetSourceX = sourcePoint[0];
    const targetSourceY = sourcePoint[1];

    if (
      this._lastSourceX === targetSourceX &&
      this._lastSourceY === targetSourceY
    ) return;

    this._lastSourceX = targetSourceX;
    this._lastSourceY = targetSourceY;
    this._didDrawOnLastSource = false;

    if (this._indicator) {
      this._refreshIndicator();
      this._indicateCursor(targetSourceX, targetSourceY);
    }

    // this will automatically trigger redraw if it fires
    if (
      mouseEvent.buttons === 1 &&
      !this._didDrawOnLastSource
    ) {
      this._pixels(targetSourceX, targetSourceY);
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
    const targetSourceX = sourcePoint[0];
    const targetSourceY = sourcePoint[1];

    this._lastSourceX = targetSourceX;
    this._lastSourceY = targetSourceY;

    if (this._indicator) {
      this._refreshIndicator();
      this._indicateCursor(targetSourceX, targetSourceY);
    }

    this._pixels(targetSourceX, targetSourceY);
    this._didDrawOnLastSource = true;
  };


  /**
   * Mouseout callback. Clears the preview.
   * @param mouseEvent - mouse event passed to the callback
   */
  public _onMouseOut = (mouseEvent?: MouseEvent): void => {
    this._lastPixelX = null;
    this._lastPixelY = null;
    this._lastSourceX = null;
    this._lastSourceY = null;
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