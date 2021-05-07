# Mercury Wallet

Mercury wallet is a cross-platform GUI for [Mercury](https://github.com/commerceblock/mercury) written in node.js using Electron.


# Configuration

Custom configurations can be set in `/src/settings.json` in JSON format:

| Name            | Type          | Default |
|-----------------|---------------|----------|
| state_entity_endpoint | string | https://beta.mercurywallet.io |
| swap_conductor_endpoint | string | https://beta.mercurywallet.io |
| electrum_config | object | { host: 'wallet.mercurywallet.io', port: 50004, protocol: 'wss'} |
| tor_proxy | object | { ip: 'localhost', port: 9050, controlPassword: 'password', controlPort: 9051 } |
| min_anon_set | number | 5 |
| notifications | boolean | true |
| tutorials | boolean | false |
| testing_mode | boolean | false |



# Development instructions

## Run development

`yarn install`

`yarn run dev`


## Run tests

`yarn run test`


## Testing mode

Setting testing_mode removes some inconveniences to make testing easier and faster:

- No seed confirmation
- Electrum calls mocked so no need to send and wait for funding transactions


## Rust bindings

Cryptographic functions and protocols are written in Rust. The required individual functions
are wrapped and compiled to WebAssembly.

`client-wasm/src` contains the Rust code and `client-wasm/pkg` the built WebAssembly.

To rebuild after editing:

`yarn run build-wasm`

`yarn upgrade client_wasm`


Mac users may have to compile WebAssembly from within a Docker container:


## Docker instructions for building client-wasm

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


## Logs

Logs are written to console and file at the following locations:

- on Linux: ~/.config/{app name}/logs/{process type}.log
- on macOS: ~/Library/Logs/{app name}/{process type}.log
- on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log

# Contact

If you have any further questions you can find us at:

# Issue Tracker

# License

Mercury Wallet is released under the terms of the GNU General Public License. See for more information https://opensource.org/licenses/GPL-3.0
