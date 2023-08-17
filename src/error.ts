import WrappedLogger from "./WrappedLogger";

declare const window: any;
export let log: any;
log = new WrappedLogger();

export const handleErrors = (error: any) => {
  handleNetworkError(error);
  handleServerError(error);
};

export const handleNetworkError = (error: any) => {
  if (error == null) {
    return;
  }
  let name = error?.name;
  if (name === "RequestError") {
    log.warn(JSON.stringify(error));
    return;
  }
  const err_str = error?.message;
  const err_code = error?.code;
  const err_stack = error?.stack;

  if (
    (err_str != null &&
      (err_str.includes("Network Error") ||
        err_str.includes("Socks5 proxy rejected connection") ||
        err_str.includes("API request timed out"))) ||
    (err_code != null && err_code === "ECONNRESET")
  ) {
    log.warn(error);
  } else {
    if (err_stack.includes("ElectrsClient")) {
      throw Error(
        "Check access to localhost:3001/electrs/block/height and localhost:3002/electrs/block/height"
      );
    } else {
      throw error;
    }
  }
};

export const handleServerError = (error: any) => {
  if (error == null) {
    return;
  }
  let error_2 = error?.error;
  if (error_2 != null) {
    const statusCode = error_2?.statusCode;
    const msg = error_2?.message;
    if (
      statusCode != null &&
      statusCode >= 500 &&
      statusCode < 600 &&
      msg != null &&
      msg.includes("try again")
    ) {
      log.warn(JSON.stringify(error));
      return;
    }
  }
  const err_stack = error?.stack;
  if (err_stack.includes("ElectrsClient")) {
    throw Error(
      "Check access to localhost:3001/electrs/block/height and localhost:3002/electrs/block/height"
    );
  } else {
    throw error;
  }
};
