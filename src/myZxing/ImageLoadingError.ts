import { CustomError } from "ts-custom-error";

class ImageLoadingError extends Error {
  public constructor(...args) {
    super(...args);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ImageLoadingError);
    }

    this.name = "ImageLoadingError";
  }
}

export default ImageLoadingError;