import { CustomError } from "ts-custom-error";

class IllegalStateError extends CustomError {
  constructor(message: string = "") {
    super(message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, 'name', { value: 'IllegalStateError' });
  }
}

export default IllegalStateError;