import { CustomError } from "ts-custom-error";

class ImageProjectingError extends CustomError {
  constructor(message: string = "") {
    super(message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, 'name', { value: 'ImageProjectingError' });
  }
}

export default ImageProjectingError;