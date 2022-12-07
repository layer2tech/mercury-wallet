// Convert a byte array to a hex string
export function bytesToHex(bytes: Uint8Array) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return hex.join("");
}

export function hexToBytes(str: string) {
    if (!str) {
      return new Uint8Array();
    }
    
    var a = [];
    for (var i = 0, len = str.length; i < len; i+=2) {
      a.push(parseInt(str.substr(i,2),16));
    }
    
    return new Uint8Array(a);
}

export function dispatchEvent(TYPE: string, params: any){
    window.dispatchEvent(new CustomEvent(TYPE, {
        detail: params
    }))
}