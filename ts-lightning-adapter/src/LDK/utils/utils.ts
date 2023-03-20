import * as secp256k1 from "secp256k1";

export function hexToBytes(hex: String) {
  if (hex === undefined) return;
  let bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  var bytesUint8Array: Uint8Array = new Uint8Array(bytes);
  // bytes = new Uint8Array(bytes)
  return bytesUint8Array;
}

export function hexToUint8Array<Uint8Array>(hex: string) {
  let matchHex = hex.match(/.{1,2}/g);

  try {
    if (matchHex)
      return new Uint8Array(matchHex.map((byte) => parseInt(byte, 16)));
    else throw "err";
  } catch (e) {
    throw new Error(`Conversion Hex -> Uint8Array Err`);
  }
}

export function uint8ArrayToHexString(arr: Uint8Array) {
  return Buffer.from(arr.buffer).toString("hex");
}

export const validateSigFunction = (
  publicKey: Buffer,
  signature: Buffer,
  data: Buffer
): boolean => {
  // Extract the public key in compressed form
  const publicKeyBuffer = publicKey.slice(1);

  // Verify the signature against the public key and data
  const verified = secp256k1.ecdsaVerify(data, signature, publicKeyBuffer);

  // Return the result of the verification
  return verified;
};
