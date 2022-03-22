# Mercury Wallet

[Mercury wallet](https://mercurywallet.com/) is a cross-platform GUI for [Mercury](https://github.com/commerceblock/mercury) written in node.js using Electron. [Read the docs](https://docs.mercurywallet.com/docs/).

# Configuration

Custom configurations can be set in `/src/settings.json` in JSON format:

| Name                    | Type    | Default                                                                 |
| ----------------------- | ------- | ----------------------------------------------------------------------- |
| state_entity_endpoint   | string  | http://zo63hfpdcmonu52pcvflmeo62s47cqdabmibeejm7bhrfxmino3fl5qd.onion   |
| swap_conductor_endpoint | string  | http://zo63hfpdcmonu52pcvflmeo62s47cqdabmibeejm7bhrfxmino3fl5qd.onion   |
| electrum_config         | object  | { host: 'https://explorer.blockstream.com/api', port: null, protocol: 'http', type: '' }        |
| tor_proxy               | object  | { ip: 'localhost', port: 9060, controlPassword: '', controlPort: 9061 } |
| min_anon_set            | number  | 5                                                                       |
| notifications           | boolean | true                                                                    |
| tutorials               | boolean | false                                                                   |
| testing_mode            | boolean | false                                                                   |

In electrum_config, the protocol options are 'http' or 'wss'. http routes the connection via TOR and the 'port' should normally be set to 'null'. The 'type' setting indicates the server type, and should be set to 'eps' if using the "electrum personal server".


# Development instructions

## Run development

`yarn install`

`yarn run dev`

## Run development on windows

`npm install`

`npm run dev-windows`


## Run development in `testnet` mode
The testnet network configuration can be set by editing `/src/network.json`. To run in testnet mod, first edit `package.json` and edit the to include the `electron` script to include the `--testnet` flag as follows:

`"electron": "electron --inspect=5858 .",`


### Using a local mercury server and mock tor adapter

When running in development mode, a mock tor adapter can be used - the connection will not be done via a tor circuit - this allows connection to a mercury server on localhost. To use the mock tor adapter edit tor-adapter/server/settings.json and change the tor-proxy ip to 'mock' as in the following example:

`"tor_proxy": {"ip": "mock"}`

# Using electrum-personal-server

A electrum personal server (the CommerceBlock fork of electrum-personal-server is currently required https://github.com/commerceblock/electrum-personal-server)running on localhost can be used by setting the electrum_config.type to "eps" as in the following example:

`"electrum_config" : {
    "protocol": "http",
    "host": "127.0.0.1",
    "port": "50002",
    "type": "eps"
  }`

Each address generated for deposit should be included in the electrum-personal-server config file and the "rescan" script run if necessary.

## Run tests

### Unit tests

`yarn run test`

### End to end tests

`yarn run e2e`

## Testing mode

Setting testing_mode removes some inconveniences to make testing easier and faster:

-   No seed confirmation
-   Electrum calls mocked so no need to send and wait for funding transactions

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

## Connecting via a tor node

Configure the tor proxy settings either in the settings.json file as described above if running in develop mode, or using the "settings" page in the app. Click "save" in order for the settings to take effect.

The API calls will be routed via the tor node if a .onion address is used as the state entity or swap protocol endpoint. A new tor circuit will be obtained after each API call.

## Logs

Logs are written to console and file at the following locations:

-   on Linux: ~/.config/{app name}/logs/{process type}.log
-   on macOS: ~/Library/Logs/{app name}/{process type}.log
-   on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log

## Running with Chrome DevTools

The application can be started with Chrome DevTools by running the application with the NODE_ENV environment variable 
set to "development". 

### MacOs

The below instructions assume that mercurywallet.app in installed in the default location.

Method 1: open the app, and with the mercurywallet main window selected, press `Option-Command-I`.

Method 2: open the app by entering one of the following commands in a terminal:
  - to open the app with DevTools enabled in mainnet mode: `NODE_ENV=development open /Applications/mercurywallet.app`
  - to open the app with DevTools enabled in testnet mode: `NODE_ENV=development open /Applications/mercurywallet.app --args --testnet`

### Linux

In a terminal, change directory to the one containing the mercurywallet AppImage and execute the following command:

- Mainnet mode: `NODE_ENV=development ./mercurywallet-0.6.11.AppImage`
- Testnet mode: `NODE_ENV=development ./mercurywallet-0.6.11.AppImage --testnet`

### Windows 11

Assuming mercurywallet.exe is installed in the default location - enter the following command into the file explorer:

- Mainnet mode: `powershell "($env:NODE_ENV='development')  -and (C:\Users\User\AppData\Local\Programs\mercurywallet\mercurywallet.exe)"`

- Testnet mode: `powershell "($env:NODE_ENV='development')  -and (C:\Users\User\AppData\Local\Programs\mercurywallet\mercurywallet.exe --testnet)"`

# Recover of expired statecoins

On expiry, the expired statecoin's backup transaction is broadcast by Mercury Wallet, sending the amount (minus fees) to the corresponding bitcoin address. This address can be imported into a bitcoin wallet using the supplied WIF key. Alternatively, all addresses for expired statecoins from a particular wallet can be recovered using the wallet's seed phrase.

## Obtaining the WIF key

-   Go to 'settings' by clicking the gear icon at the top of the page.
-   Click 'manage back-up transactions'.
-   Click on the desired statecoin (if the statecoin has already expired and the backup transaction has been confirmed, it will be in the list of withdrawn statecoins. Click the '...' at the top right corner of the coins list and select 'withdrawn' to view the withdrawn statecoins).
-   Click 'show' next to 'Private Key WIF' in the 'Backup Transaction Details' box.

## Obtaining the seed phrase

-   Go to 'settings' by clicking the gear icon at the top of the page.
-   Enter the wallet password in the 'Seed Phrase: Enter password' box.
-   Click 'SHOW'. 

## Recovery of expired statecoins from WIF key

For example, in electrum wallet:

-   Select 'File -> New/Restore' form the menu.
-   Choose a name for the wallet and click 'Next'.
-   Select 'Import Bitcoin addresses or private keys' and click 'Next'
-   Copy the WIF key(s) into the text box and click 'Next'
-   Choose a password and click 'Next'

## Recovery of expired statecoins from seed

The seed phrase type is 'BIP39' and the derivation path is `m/0'`.

For example, to recover from the seed phrase in electrum wallet:

-   Select 'File -> New/Restore' form the menu.
-   Choose a name for the wallet and click 'Next'.
-   Select 'Standard wallet' and click 'Next'.
-   Select 'I already have a seed' and click 'Next'.
-   Click 'Options', select 'BIP39 seed' and click 'OK'.
-   Enter the seed into the text box and click 'Next'.
-   Select 'native segwit (p2wpkh)' and enter `m/0'`. Click 'Next'.
-   Choose a password and click 'Next'.
-   If many addresses were used in mercury wallet, you may need to generate additional addresses in order to find all the expired statecoin transactions. To do this, go to the Console tab (first, click 'View -> Show Console' if the Console tab is not shown). The enter the following command to e.g. generate 100 additional addresses: `[wallet.create_new_address(False) for i in range(100)]`. 



# Contact

If you have any further questions you can find us at: https://mercurywallet.com/

- [Mail](mailto:main@mercurywallet.com)
- [Twitter](https://twitter.com/mercury_wallet)
- [Discord](https://discord.gg/TjzqSNBKRe)

# Issue Tracker

# License

Mercury Wallet is released under the terms of the GNU General Public License. See for more information https://opensource.org/licenses/GPL-3.0
