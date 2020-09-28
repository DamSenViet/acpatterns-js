import {
  Exception,
  Result,
} from "@zxing/library";


/**
 * Callback format for continuous decode scan.
 */
type MyDecodeContinuouslyCallback = (results: Array<Result>, error?: Exception) => any;
export default MyDecodeContinuouslyCallback;