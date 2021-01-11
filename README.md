# Mercury Wallet

A cross-platform GUI for Mercury written in node.js using Electron.


# Run development

`yarn install`

`yarn run dev`


# Run tests

`yarn run test`


# Development instructions

## Rust bindings

Cryptographic functions and protocols are written in Rust. The required individual functions
are wrapped and compiled to WebAssembly.

`client-wasm/src` contains the Rust code and `client-wasm/pkg` the built WebAssembly.

To rebuild after editing:

`yarn run build-wasm`

`yarn upgrade client_wasm`


Mac users may have to compile WebAssembly from within a Docker container:


### Docker instructions for building client-wasm

There is a DockerFile in `client-wasm/`, first build the image

`cd client-wasm`

`docker build -t rustwasm .`

Run container with

`docker run --rm -it -v ${PWD}:/code rustwasm bash`

To build wasm:

`cd /code`

`wasm-pack build`

You can edit files outside of container with your normal text editor and then
issue cargo/wasm build in container again.

# License 
