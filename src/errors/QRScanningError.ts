import { CustomError } from "ts-custom-error";

class QRScanningError extends CustomError {
  constructor(message: string = "") {
    super(message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, 'name', { value: 'QRScanningError' });
  }
}

export default QRScanningError;