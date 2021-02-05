# Mercury Wallet

A cross-platform GUI for Mercury written in node.js using Electron.


# Run development

`yarn install`

`yarn run dev`


# Run tests

`yarn run test`

# Configuration

Custom configurations can be set in `/src/settings.json` in JSON format:

| Name            | Type          | Default |
|-----------------|---------------|----------|
| state_entity_endpoint | string | https://fakeapi.mercurywallet.io |
| swap_conductor_endpoint | string | https://fakeapi.mercurywallet.io |
| electrum_config | object | { host: 'https://electrumx-server.tbtc.network', port: 8443, protocol: 'wss'} |
| tor_proxy | string | none |
| min_anon_set | number | 10 |
| notifications | boolean | true |
| tutorials | boolean | false |




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


### Logs

Logs are written to console and file at the following locations:

- on Linux: ~/.config/{app name}/logs/{process type}.log
- on macOS: ~/Library/Logs/{app name}/{process type}.log
- on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log

# Contact

If you have any further questions you can find us at:

# Issue Tracker

# License

Mercury Wallet is released under the terms of the GNU General Public License. See for more information https://opensource.org/licenses/GPL-3.0
