import Tool, { defaultFillStyle } from "./Tool";
import { paletteIndex } from "../utils";

export interface FillAllOptions {
  paletteIndex?: paletteIndex;
}

/**
 * A square Brush.
 */
class FillAll extends Tool {
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
   * The value to overwrite pixels with.
   * A pointer to a color in the palette palette.
   */
  protected _paletteIndex: paletteIndex = 0;


  /**
   * Instantiates a Brush tool.
   * @param options - a config object with 'size'.
   */
  public constructor(options?: FillAllOptions) {
    super();
    if (arguments.length <= 0) return;
    const { paletteIndex } = options;
    if (paletteIndex != null) this.paletteIndex = paletteIndex;
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
   * Draws the default cursor preview/indicator.
   * @param sourceX - the x coordinate of the source
   * @param sourceY - the y coordinate of the source
   */
  protected _indicateDefaultCursor(
    targetSourceX: number,
    targetSourceY: number,
    size: number,
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
   * Draws the preview
   */
  protected _indicate(): void {
    let isFilled = true;
    for (let sourceY = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        if (this._source.unreactive[sourceX][sourceY] !== this._paletteIndex) {
          isFilled = false;
        }
      }
    }
    if (isFilled === true) return;
    
    if (this._paletteIndex !== this._pattern.palette.length)
      this._indicatorContext.fillStyle = this._pattern.palette[this._paletteIndex];
    else
      this._indicatorContext.fillStyle = defaultFillStyle;
    for (let sourceY = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        this._indicatorContext.fillRect(
          (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
          (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
          this._measurements.pixelSize,
          this._measurements.pixelSize,
        );
      }
    }

    if (this.drawer.grid)
      this._indicatorContext.drawImage(
        this._gridCanvas,
        0, 0,
        this._measurements.size,
        this._measurements.size,
        0, 0,
        this._measurements.size,
        this._measurements.size,
      );
      
    this._indicatorContext.fillRect(
      (this._measurements.pixelXCenter - 2) * this._measurements.pixelSize,
      (this._measurements.pixelYCenter - 2) * this._measurements.pixelSize,
      this._measurements.pixelSize * 4,
      this._measurements.pixelSize * 4,
    );
      
    // draw square around center
    this._indicateDefaultCursor(
      Math.floor(this._measurements.sourceWidth / 2),
      Math.floor(this._measurements.sourceHeight / 2) - 1,
      4
    );
  }

  /**
   * Commits pixels from the and triggers a redraws when fininished.
   */
  protected _pixels(): void {
    // even
    for (let sourceY = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        this._source.unreactive[sourceX][sourceY] = this._paletteIndex;
      }
    }
    this._pattern.hooks.refresh.trigger();
  }


  /**
   * Mouseover callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseOver = (mouseEvent: MouseEvent) => {
    // otherwise make sure to request it!!!
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const targetPixelX = pixelPoint[0];
    const targetPixelY = pixelPoint[1];
    this._lastPixelX = targetPixelX;
    this._lastPixelY = targetPixelY;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    
    // ONLY WHEN IM ON A VALID POINT
    if (this._indicator) {
      this._indicate();
      requestAnimationFrame(this._redraw);
    }
  };


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
      this._indicate();
      requestAnimationFrame(this._redraw);
    }
  };

  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const targetPixelX = pixelPoint[0];
    const targetPixelY = pixelPoint[1];
    this._lastPixelX = targetPixelX;
    this._lastPixelY = targetPixelY;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    
    this._pixels();
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
    this._canvas.addEventListener("mouseover", this._onMouseOver);
    this._canvas.addEventListener("mousemove", this._onMouseMove)
    this._canvas.addEventListener("mousedown", this._onMouseDown);
    this._canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this._canvas.removeEventListener("mouseover", this._onMouseOver);
    this._canvas.removeEventListener("mousemove", this._onMouseMove);
    this._canvas.removeEventListener("mousedown", this._onMouseDown);
    this._canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default FillAll;