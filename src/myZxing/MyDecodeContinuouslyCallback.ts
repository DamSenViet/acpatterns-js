import {
  Exception,
  Result,
} from '@zxing/library/esm';


/**
 * Callback format for continuous decode scan.
 */
type MyDecodeContinuouslyCallback = (results: Array<Result>, error?: Exception) => any;
export default MyDecodeContinuouslyCallback;