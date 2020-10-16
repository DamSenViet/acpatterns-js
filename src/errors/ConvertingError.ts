import { CustomError } from "ts-custom-error";

class ConvertingError extends CustomError {
  constructor(message: string = "") {
    super(message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, 'name', { value: 'ConvertingError' });
  }
}

export default ConvertingError;