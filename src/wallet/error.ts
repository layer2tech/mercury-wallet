import { isNonNullChain } from "typescript"

import { log } from './swap/swap_utils';

// Check if returned value from server is an error. Throw if so.
export const checkForServerError = (response: any) => {
    if (response == null) {
        return
    }
    let return_val = response?.data
    if (response.status >= 400) {
        throw Error(`http status: ${response.status}, data: ${return_val}`)
    }
    if (typeof (return_val) == "string" && (return_val.includes("Error") || return_val.includes("error"))) {
        if (return_val.includes("Not available until")) {
            throw Error("The server is currently unavailable due to a high request rate. Please try again.")
        }
        throw Error(return_val)
    }
    if (return_val != null && return_val?.error != null) {
        let error = return_val?.error
        error = error?.error ? error.error : error 
        const ecode = error?.code
        const statusCode = error?.statusCode
        console.log(`ecode: ${ecode}`)
        if ((ecode != null && ecode == "ECONNRESET") ||
            (statusCode != null && statusCode >=500 && statusCode <= 600))
        {
            log.warn(JSON.stringify(return_val.error))
        } else {
            throw Error(JSON.stringify(return_val.error))
        }
    }
}

export const handlePromiseRejection = (err: any, timeout_msg: string) => {
    let msg_str = err?.message
    if (msg_str != null && msg_str.search(/timeout of .*ms exceeded/) > -1) {
        throw new Error(`${timeout_msg}: ${msg_str}`)
    } 
    throw err
}