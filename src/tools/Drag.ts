import Tool from "./Tool";
import { paletteIndex } from "../utils";
import xbrz from "../xbrz";

export interface DragOptions {
}


/**
 * A fill tool.
 */
class Drag extends Tool {
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
   * The Y component of source anchor point for drawing the Line.
   */
  protected _startingSourceY: number = null;

  /**
   * The X component of source anchor point for drawing the Line.
   */
  protected _startingSourceX: number = null;

  /**
   * Canvas for pixel filtering of the drag preview.
   */
  protected _pixelsCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of _pixelsCanvas.
   */
  protected _pixelsContext: CanvasRenderingContext2D = this._pixelsCanvas.getContext("2d");

  /**
   * Canvas for pixel filtering of the drag preview. Used to draw the post-filtered image.
   */
  protected _textureCanvas: HTMLCanvasElement = document.createElement("canvas");


  /**
   * Cached context of _textureCanvas;
   */
  protected _textureContext: CanvasRenderingContext2D = this._textureCanvas.getContext("2d");


  /**
   * Creates a Bucket instance.
   * @param options - a config object
   */
  public constructor(options?: DragOptions) {
    super();
    if (arguments.length <= 0) return;
  }


  /**
   * Gets the palette pointer of the bucket.
   */
  public get paletteIndex(): number {
    return this._paletteIndex;
  }


  /**
   * Sets the palette pointer of the bucket.
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
   * Draws the cursor preview/indicator.
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX - the x coordinate of the source
   */
  protected _previewDrag(
    yChange: number,
    xChange: number,
  ): void {
    // assumes no pixel filter
    if (!this.drawer.pixelFilter)
      for (let sourceY = 0; sourceY < this.measurements.sourceHeight; ++sourceY) {
        for (let sourceX = 0; sourceX < this.measurements.sourceWidth; ++sourceX) {
          const shiftedSourceY = (sourceY + yChange + this.measurements.sourceHeight) % this.measurements.sourceHeight;
          const shiftedSourceX = (sourceX + xChange + this.measurements.sourceWidth) % this.measurements.sourceWidth;
          const paletteIndex = this.source.unreactive[shiftedSourceY][shiftedSourceX];
          this.previewContext.fillStyle = this.pattern.palette[paletteIndex];
          this.previewContext.fillRect(
            (this.measurements.pixelXStart + sourceX) * this.measurements.pixelSize,
            (this.measurements.pixelYStart + sourceY) * this.measurements.pixelSize,
            this.measurements.pixelSize,
            this.measurements.pixelSize,
          )
        }
      }
    else {
      this._pixelsCanvas.width = this.measurements.sourceWidth;
      this._pixelsCanvas.height = this.measurements.sourceHeight;
      this._textureCanvas.width = this.measurements.sourceWidth * 4;
      this._textureCanvas.height = this.measurements.sourceHeight * 4;
      this._pixelsContext.imageSmoothingEnabled = false;
      this._textureContext.imageSmoothingEnabled = false;
      for (let sourceY = 0; sourceY < this.measurements.sourceHeight; ++sourceY) {
        for (let sourceX = 0; sourceX < this.measurements.sourceWidth; ++sourceX) {
          const shiftedSourceY = (sourceY + yChange + this.measurements.sourceHeight) % this.measurements.sourceHeight;
          const shiftedSourceX = (sourceX + xChange + this.measurements.sourceWidth) % this.measurements.sourceWidth;
          const paletteIndex = this.source.unreactive[shiftedSourceY][shiftedSourceX];
          this._pixelsContext.fillStyle = this.pattern.palette[paletteIndex];
          this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
        }
      }

      // xbrz is fixed, can't scale on its own
      xbrz(
        this._pixelsContext,
        this.measurements.sourceWidth,
        this.measurements.sourceHeight,
        this._textureContext,
        4,
      );

      // third drawing operation to scale
      this.previewContext.drawImage(
        this._textureCanvas,
        0, 0,
        this._textureCanvas.width,
        this._textureCanvas.height,
        this.measurements.xStart,
        this.measurements.yStart,
        this.measurements.xSize,
        this.measurements.ySize,
      );
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
  }


  /**
   * Draws the cursor preview/indicator.
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX - the x coordinate of the source
   */
  protected _preview(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    if (this._startingSourceY != null && this._startingSourceX != null) {
      const sourceYChange = targetSourceY - this._startingSourceY;
      const sourceXChange = targetSourceX - this._startingSourceX;
      this._previewDrag(
        sourceYChange,
        sourceXChange,
      );
      this._previewDefaultCursor(this._startingSourceY, this._startingSourceX, 1);
    }
    this._previewDefaultCursor(targetSourceY, targetSourceX, 1);
  }


  /**
   * Commits pixels from the and triggers a redraws when fininished.
   * @param sourceYChange - the amount of change in Y, can be negative
   * @param sourceXChange - the amount of change in X, can be negative
   */
  protected _pixels(
    sourceYChange: number,
    sourceXChange: number,
  ): void {
    // need copy to alter
    const sourceCopy = new Array(this.measurements.sourceHeight)
      .fill(0)
      .map(v => new Array(this.measurements.sourceWidth).fill(0));

    // fill the copy
    for (let sourceY = 0; sourceY < this.measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this.measurements.sourceWidth; ++sourceX) {
        sourceCopy[sourceY][sourceX] = this.source.unreactive[sourceY][sourceX];
      }
    }


    for (let sourceY = 0; sourceY < this.measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this.measurements.sourceWidth; ++sourceX) {
        const shiftedSourceY = (sourceY + sourceYChange + this.measurements.sourceHeight) % this.measurements.sourceHeight;
        const shiftedSourceX = (sourceX + sourceXChange + this.measurements.sourceWidth) % this.measurements.sourceWidth;
        const paletteIndex = sourceCopy[shiftedSourceY][shiftedSourceX];
        this.source.unreactive[sourceY][sourceX] = paletteIndex;
      }
    }

    this.forceRefresh();
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

    if (this.preview) {
      this.refreshPreview();
      this._preview(targetSourceY, targetSourceX);
      requestAnimationFrame(this.redraw);
    }
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

    if (this._startingSourceY != null && this._startingSourceX != null) {
      this.refreshPreview();
      const sourceYChange = targetSourceY - this._startingSourceY;
      const sourceXChange = targetSourceX - this._startingSourceX;
      this._pixels(sourceYChange, sourceXChange);
      this._startingSourceY = null;
      this._startingSourceX = null;
      this._didDrawOnLastSource = true;
    }
    else if (this._startingSourceY == null && this._startingSourceX == null) {
      if (this.preview) {
        this.refreshPreview();
        this._preview(targetSourceY, targetSourceX);
      }
      this._startingSourceY = targetSourceY;
      this._startingSourceX = targetSourceX;
      requestAnimationFrame(this.redraw);
    }
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
    this._startingSourceY = null;
    this._startingSourceX = null;
    this.refreshPreview();
    requestAnimationFrame(this.redraw);
  };


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
    this.canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    this.canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default Drag;