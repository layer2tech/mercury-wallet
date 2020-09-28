# Mercury Client

## Introduction
Mercury client is a bitcoin minimalist decentralized wallet CLI app with a client side
state chain implementation.

## Requirements
Mercury server is required to interact with the client, for instruction on how to run it see [here](../server/README.md).

### Requirements for Tor
In order to enable Tor, openssl and python3 should be installed. The python package "stem" is also required. 

#### MacOs
Install openssl and python3 via homebrew:
```bash
brew install openssl
brew install python3
```
Install stem via pip3:
```bash
pip3 install stem
``` 

## Installation
```bash
git clone https://github.com/commerceblock/mercury.git
cd mercury/client
cargo build --release
```

## Connecting via Tor
Requests can be routed via Tor using a socks5 proxy as follows. 
### Installing and configuring Tor for MacOS
1) Install tor via homebrew:
```bash
brew install tor
```
2) Copy the sample Tor configuration file:
```bash
cp /usr/local/etc/tor/torrc.sample /usr/local/etc/tor/torrc
```
3) Set a control password and control port
```bash
tor --hash-password "<Tor control password>"
```
4) Edit the torrc file to include the following lines, replacing the password hash with the one generated above:
```
ControlPort 9051
HashedControlPassword 16:872860B76453A77D60CA2BB8C1A7042072093276A3D701AD684053EC4C
```

### MacOS:
1) Install tor if not already installed:
```bash
brew install tor
```
2) Start a Tor service (this will also start the service automatically each time the OS starts, see for more information):
```bash
brew services start tor
```
3) Configure the client to use connect via Tor with the following lines in Settings.toml:
```toml
[tor]
enable = true
```
The default URL "socks5h://127.0.0.1:9050" and control port 9051 will be used - if the Tor service is using a different URL and/or control port configure it as follows:
```toml
[tor]
enable = true
proxy = "<Tor proxy URL>"
control_port="<Tor control port>"
control_password="<Tor control password>"
```
As usual, the following environment variables will override the above settings:
```bash
export MERC_TOR_ENABLE="true"
export MERC_TOR_PROXY="<Tor proxy URL>"
export MERC_TOR_CONTROL_PORT="<Tor control port>"
export MERC_TOR_CONTROL_PASSWORD="<Tor control password>"
```

## Using the CLI
The wallet is currently exposed to a Mock Electrum server. The first 2 addresses generated have funds.

Export mercury endpoint:
```bash
export MERC_ENDPOINT="https://fakeapi.mercurywallet.io"
```

```bash
../target/release/cli --help            
```

```text
Command Line Interface for a minimalist decentralized crypto-currency wallet

USAGE:
    cli [FLAGS] [SUBCOMMAND]

FLAGS:
    -h, --help       Prints help information
    -V, --version    Prints version information
    -v               Sets the level of verbosity

SUBCOMMANDS:
    help             Prints this message or the help of the given subcommand(s)
    create-wallet    Create a new wallet
    wallet           Operation on wallet
    state-entity     State Entity API calls
```

## Wallet creation (required)
```bash
../target/release/cli create-wallet
```


## Wallet operations
```bash
../target/release/cli wallet --help
```

```text
Operation on wallet

USAGE:
    cli wallet [FLAGS] [SUBCOMMAND]

FLAGS:
    -a               Generate a new BTC address
    -b               Total balance
    -u               List unspent transactions (tx hash)
    -V, --version    Prints version information
    -h, --help       Prints help information

SUBCOMMANDS:
    help                Prints this message or the help of the given subcommand(s)
    send                Send a transaction
    deposit             Depotis funds to State Entity
    Withdraw            Withdraw funds from State Entity
    Transfer-sender     Transfer protocol Sender side
    Transfer-receiver   Transfer protocol Receiver side
```
### Get a derived/new address (HD)
```bash
../target/release/cli wallet -a
```

* Output:
```text
Network: [regtest]

Address: [bcrt1qq0znj64a5zukv7yew52zjzmdndch3r0vxu8668]
```

### Get total balance
```bash
../target/release/cli wallet -b
```

* Output:
```text
Network: [regtest]

Address:					Confirmed:	Unconfirmed:
bcrt1qsuqsurhgfduhqw6ejquw54482sqpkfc22gytyh	100000		0

State Chain ID:					Confirmed:	Unconfirmed:
1b4cc310-458d-40e8-8a1b-b91c2cc67397		100		0
```

### Get list unspent
```bash
../target/release/cli wallet -u
```

* Output:
```text
Network: [regtest]

Unspent tx hashes:
e0a97cb38e7e73617ef75a57eaf2841eb06833407c0eae08029bd04ea7e6115a
40bf39ffdf4322e4d30ed783feec5bd9eb2804b81f23ebd5e24ea2aa2365a326

```

### Deposit to State entity
```bash
../target/release/cli wallet deposit -a [SATOSHI_AMOUNT]
```

* Example:
```bash
../target/release/cli wallet deposit -a 1000
```

* Output:
```text
Network: [regtest]

Deposited 1000 satoshi's.
State Chain ID: c7c57bc7-db45-474f-86f6-109205eb6b99
```

### Withdraw from State entity
```bash
../target/release/cli wallet withdraw -i [STATE_CHAIN_ID]
```

* Example:
```bash
../target/release/cli wallet withdraw -i b7b56103-0d25-48c4-8ca7-66c235e30124
```

* Output:
```text
Network: [regtest]

Withdrawn 9000 satoshi's.
From State Chain ID: a3f8f121-7ae0-4be0-9793-101476fd141e

Withdraw Transaction hex: 02000000000101f712bceee061d....
```

### Generate State entity Address
```bash
../target/release/cli wallet se-addr -t [FUNDING_TXID]
```

* Example:
```bash
../target/release/cli wallet se-addr -t e0a97cb38e7e73617ef75a57eaf2841eb06833407c0eae08029bd04ea7e6115a
```

* Output:
```text
Network: [regtest],

New State Entity address:
"{\"backup_tx_addr\":\"bcrt1qjh4cs26aur7uct8fjavmrzqgxxdkpgjusanarx\",\"proof_key\":\"02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f\"}"
```

### Transfer State Chain (Sender)
```bash
../target/release/cli wallet transfer-sender -a [RECIPIENT_ADDRESS]
```

* Example:
```bash
../target/release/cli wallet transfer-sender -a "{\"backup_tx_addr\":\"bcrt1qjh4cs26aur7uct8fjavmrzqgxxdkpgjusanarx\",\"proof_key\":\"02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f\"}" -i 03dadad7-91b9-45b5-9f17-5cd945565121
```

* Output:
```text
Transfer initiated for StateChain ID: 03dadad7-91b9-45b5-9f17-5cd945565121.

Transfer message: "{\"shared_key_id\":\"665d2d2c-6c3b-4384-a410-15e8a48b7dc5\",\"t1\":\"221d6675ddcff3b623027d9a70771629a3e10fda1bed594fa022e61a35d1edb4\",\"state_chain_sig\":{\"purpose\":\"TRANSFER\",\"data\":\"02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f\",\"sig\":\"3045022100c0823ccc9d8954ac5e6947a523bef1c110bc01a1a0f725ed7ddc94bfcf7c27ac02206ff8121c57a6646f3fe5e9f2eb737c2907f63666cee0d5986ad044d010bcd699\"},\"state_chain_id\":\"03dadad7-91b9-45b5-9f17-5cd945565121\",\"backup_tx_psm\":{\"BackUpTx\":{\"protocol\":\"Deposit\",\"spending_addr\":\"bcrt1qyxaad6plw90z94njaclvfat38qzfc6e3acut7j\",\"input\":\"de812f33c8fa5cc2455f8cafcbbf62b7d32114cad57418886d5421c75f01d350:0\",\"address\":\"bcrt1qx9cs0t7u7gr4w0fh8rrsfm4l367hjuurdpw2pg\",\"amount\":10000,\"proof_key\":\"039afb8b85ba5c1b6664df7e68d4d79ea194e7022c76f0f9f3dadc3f94d8c79211\"}},\"rec_addr\":{\"backup_tx_addr\":\"bcrt1qjh4cs26aur7uct8fjavmrzqgxxdkpgjusanarx\",\"proof_key\":\"02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f\"}}"
```

### Transfer State Chain (Receiver)
```bash
../target/release/cli wallet transfer-receiver -m [TRANSFER_MESAGE]
```

* Example:
```bash
../target/release/cli wallet transfer-receiver -m "{\"shared_key_id\":\"665d2d2c-6c3b-4384-a410-15e8a48b7dc5\",\"t1\":\"221d6675ddcff3b623027d9a70771629a3e10fda1bed594fa022e61a35d1edb4\",\"state_chain_sig\":{\"purpose\":\"TRANSFER\",\"data\":\"02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f\",\"sig\":\"3045022100c0823ccc9d8954ac5e6947a523bef1c110bc01a1a0f725ed7ddc94bfcf7c27ac02206ff8121c57a6646f3fe5e9f2eb737c2907f63666cee0d5986ad044d010bcd699\"},\"state_chain_id\":\"03dadad7-91b9-45b5-9f17-5cd945565121\",\"backup_tx_psm\":{\"BackUpTx\":{\"protocol\":\"Deposit\",\"spending_addr\":\"bcrt1qyxaad6plw90z94njaclvfat38qzfc6e3acut7j\",\"input\":\"de812f33c8fa5cc2455f8cafcbbf62b7d32114cad57418886d5421c75f01d350:0\",\"address\":\"bcrt1qx9cs0t7u7gr4w0fh8rrsfm4l367hjuurdpw2pg\",\"amount\":10000,\"proof_key\":\"039afb8b85ba5c1b6664df7e68d4d79ea194e7022c76f0f9f3dadc3f94d8c79211\"}},\"rec_addr\":{\"backup_tx_addr\":\"bcrt1qjh4cs26aur7uct8fjavmrzqgxxdkpgjusanarx\",\"proof_key\":\"02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f\"}}"
```

* Output:
```text
Network: [regtest],

Transfer complete for StateChain ID: 03dadad7-91b9-45b5-9f17-5cd945565121.
```


## State Entity operations

```text
Call State Entity's API

USAGE:
    cli state-entity [FLAGS] [SUBCOMMAND]


FLAGS:
    -f                  Returns State Entity's Fee information

SUBCOMMANDS:
    fee-info            Return State Entity's fee information
    get-statechain      Returns a StateChain's information
```

### fee-info
```bash
../target/release/cli state-entity fee-info
```

* Output:
```text
State Entity fee info:

Fee address: bcrt1qjjwk2rk7nuxt6c79tsxthf5rpnky0sdhjr493x,
Deposit fee: 100
Withdrawal fee: 100
```


### get-statechain
```bash
../target/release/cli state-entity get-statechain -i [STATE_CHAIN_ID]
```

* Example:
```bash
../target/release/cli state-entity get-statechain -i a8880da3-9c53-4b11-ba3a-a3cf7c999d39
```

* Output:
```text
State Chain with Id a8880da3-9c53-4b11-ba3a-a3cf7c999d39 info:

utxo:
    txid: 0158f2978e5c2cf407970d7213f2b4289993b2fe3ef6aca531316cdcf347cc41,
    vout: 0
amount: 9000
chain: [State { data: "026ff25fd651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e", next_state: None }]
```
