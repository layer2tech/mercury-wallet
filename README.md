# Mercury Wallet

GUI Client Mercury implementation.


# Run dev

`yarn install`

`yarn build-wallet`

`yarn run dev`


# Development instructions

## Wallet logic (typescript)

Our wallet logic is written in Typescript and Built to Javascript.

Wallet logic can be found in `src/wallet`. To work on code make changes to `src/ts_wallet`
and build to Javascript with `yarn run build-wallet`.


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

`docker build -t tomos/rustwasm .`

Run container with

`docker run --rm -it -v ${PWD}:/code tomos/rustwasm bash`

To build wasm:

`cd /code`

`wasm-pack build`

You can edit files outside of container with your normal text editor and then
issue cargo/wasm build in container again.
