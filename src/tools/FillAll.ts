import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface FillAllOptions {
  size?: number;
}

/**
 * A square Brush.
 */
class FillAll extends Tool {
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
   * The value to overwrite pixels with.
   * A pointer to a color in the palette palette.
   */
  protected _paletteIndex: paletteIndex = 0;


  /**
   * Creates a Brush instance.
   * @param options - a config object with 'size'.
   */
  public constructor(options?: FillAllOptions) {
    super();
    if (arguments.length <= 0) return;
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
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _previewDefaultCursor(
    targetSourceY: number,
    targetSourceX: number,
    size: number,
  ): void {
    this.previewContext.strokeStyle = "#00d2c2";
    this.previewContext.lineWidth = Math.ceil(this.measurements.pixelSize / 4);
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
    this.previewContext.beginPath();
    // top left
    this.previewContext.moveTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // top right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + size) * this.measurements.pixelSize, this.measurements.xStop),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // bottom right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + size) * this.measurements.pixelSize, this.measurements.xStop),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + size) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // bottom left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + size) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // back to top left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    this.previewContext.stroke();
  }


  /**
   * Draws the preview
   */
  protected _preview(): void {
    let isFilled = true;
    this.previewContext.fillStyle = this.pattern.palette[this._paletteIndex];
    for (let sourceY = 0; sourceY < this.measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this.measurements.sourceWidth; ++sourceX) {
        if (this.source.unreactive[sourceY][sourceX] !== this._paletteIndex) {
          isFilled = false;
        }
      }
    }
    if (isFilled === true) return;
    
    this.previewContext.fillStyle = this.pattern.palette[this._paletteIndex];
    for (let sourceY = 0; sourceY < this.measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this.measurements.sourceWidth; ++sourceX) {
        this.previewContext.fillRect(
          (this.measurements.pixelXStart + sourceX) * this.measurements.pixelSize,
          (this.measurements.pixelYStart + sourceY) * this.measurements.pixelSize,
          this.measurements.pixelSize,
          this.measurements.pixelSize,
        );
      }
    }

    if (this.drawer.grid)
      this.previewContext.drawImage(
        this.gridCanvas,
        0, 0,
        this.measurements.size,
        this.measurements.size,
        0, 0,
        this.measurements.size,
        this.measurements.size,
      );
      
    this.previewContext.fillRect(
      (this.measurements.pixelXCenter - 2) * this.measurements.pixelSize,
      (this.measurements.pixelYCenter - 2) * this.measurements.pixelSize,
      this.measurements.pixelSize * 4,
      this.measurements.pixelSize * 4,
    );
      
    // draw square around center
    this._previewDefaultCursor(
      Math.floor(this.measurements.sourceHeight / 2) - 1,
      Math.floor(this.measurements.sourceWidth / 2),
      4
    );
  }

  /**
   * Commits pixels from the and triggers a redraws when fininished.
   */
  protected _pixels(): void {
    // even
    for (let sourceY = 0; sourceY < this.measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this.measurements.sourceWidth; ++sourceX) {
        this.source.unreactive[sourceY][sourceX] = this._paletteIndex;
      }
    }
    this.forceRefresh();
  }


  /**
   * Mouseover callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseOver = (mouseEvent: MouseEvent) => {
    // otherwise make sure to request it!!!

    if (this.preview) {
      console.log("previewing");
      this._preview();
      requestAnimationFrame(this.redraw);
    }
  };


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

    if (this.preview) {
      this.refreshPreview();
      this._preview();
      requestAnimationFrame(this.redraw);
    }
  };

  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    this._pixels();
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
    this.refreshPreview();
    requestAnimationFrame(this.redraw);
  };

  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this.canvas.addEventListener("mouseenter", this._onMouseOver);
    this.canvas.addEventListener("mousemove", this._onMouseMove)
    this.canvas.addEventListener("mousedown", this._onMouseDown);
    this.canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this.canvas.removeEventListener("mouseenter", this._onMouseOver);
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    this.canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default FillAll;