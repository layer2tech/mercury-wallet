let typeforce = require('typeforce');

export const Root = typeforce.compile({
  id: typeforce.UInt32,
  value: typeforce.Array,
  commitment_info: typeforce.oneOf(typeforce.Any, typeforce.Null),
});


// re-export some basic types
export const Buffer256bit = typeforce.BufferN(32);
export const Hash160bit = typeforce.BufferN(20);
export const Hash256bit = typeforce.BufferN(32);
export const Number = typeforce.Number; // tslint:disable-line variable-name
export const Array = typeforce.Array;
export const Boolean = typeforce.Boolean; // tslint:disable-line variable-name
export const String = typeforce.String; // tslint:disable-line variable-name
