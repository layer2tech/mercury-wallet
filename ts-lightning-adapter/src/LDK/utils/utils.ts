export function hexToBytes(hex: String) {
    if (hex === undefined) return;
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    var bytesUint8Array: Uint8Array = new Uint8Array(bytes)
    // bytes = new Uint8Array(bytes)
    return bytesUint8Array;
  }

export function hexToUint8Array<Uint8Array>(hex: string){
  let matchHex = hex.match(/.{1,2}/g);
  if(matchHex){
    return matchHex.map((byte) => parseInt(byte, 16))
  }
  else{
    return
  }
}

export function uint8ArrayToHexString(arr: Uint8Array) {
  return Buffer.from(arr.buffer).toString('hex');
}