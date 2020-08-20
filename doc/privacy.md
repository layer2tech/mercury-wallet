# Mercury wallet privacy


## General Bitcoin wallet privacy

### Coin Labelling

Mercury wallet helps a user to organise their wallet and mitigate against privacy leakage by encouraging labelling of coins (UTXOs). By default coins with different labels are never used as inputs to the same transaction, meaning that a user can partition their coins into different groups and be confident that transactions made from coins in one group will not expose their ownership of coins in a different group. When sending a transaction the user can choose which group of coins to send from, or can manually choose inputs themselves.

As an example suppose a user shares some savings with their partner and would like to suprise them with a gift. Without labelling of coins a coin which is shared may be accidentaly included in the transaction which pays for the gift. The partner may notice that these funds have been spent and at best the suprise is ruined or at worse they may think they have been robbed! If the user had labeled all their coins as "savings" then Mercury wallet would ensure that this problem would not arise, and that only the users personal funds would be spent.
 
Of course, labels can be mostly assigned automatically by the wallet, such as all coins from a user's employer being marked "salary". Any outputs of transactions using "salary" coins as  inputs would then also be marked "salary" automatically. This is for convenience and to act as an important reminder to the user that basic Bitcoin transactions do not break ownership assumptions to an outside observer.


### Address reuse

Mercury wallet is sure to not allow address reuse by efficiently storing a list of all addresses which have ever been generated and querying it before presenting a newly generated address to the user. Any address which has been used on the blockchain is also stored and this list is checked before including an input to a transaction, this is to stop an attack in which Bitcoin is sent to an address which has already been used in hope that it will be automatically included in a new transaction and thus reveal more UTXOs owned by that wallet.



### SPV mode

By default Mercury wallet will connect to an Electrum Server ran by Mercury.io for blockchain information. All requests are performed via Tor and the Tor identity is refreshed regularly, however we stronlgy advise users to run their own full node and Electrum Personal Server to be sure that absolutely none of their transaction and UTXO information can be leaked. 


### Wallet fingerprinting

Information can be leaked about a transaction based on its structure, such as which output is change and which type of wallet was used to create the transaction. To mitigate against fingerprinting of Mercury wallet transactions are constructed under the following conditions:

- If an output is a non-standard address type then any change output will also be non-standard
- Addresses generated are of different types
- Coin selection involves randomness
- Input and output ordering involves randomness
- If unused, variable fields such as nLocktime and version number can be set at random times and with random but commonly used values
- Fee selection involves some randomness

Some extra options are availble to the user but are  disabled by default since they may increase the transaction fee significantly:

- Use a mixture of  compressed and  uncompressed public keys 
- Randomly include inputs and ouputs which are not needed, for example spreading change out over a random number of outputs




### Swaps

We have discussed some ways in which Mercury Wallet helps its user follow general Bitcoin privacy practices and provides protections against unintentionally revealing purchases to others. However no matter how many wallet privacy tools are implemented a users' coins can be followed through the public blockchain by the sender (or any other party who knows which UTXOs the  user onws). A user whose salary is paid to them in Bitcoin is at risk of their employer, and collegues,  seeing how much they are paid, how much they have saved, how they like to spend their money, etc via simple blockchain queries. 

Mercury Wallet helps to solve this problem by allowing users to transfer coins off-chain, i.e. without any blockchain footprint. Therefore from the perspective of a blockchain observer ownership of coins in a Mercury Wallet is impossible to know since they could have been transferred many times to any other Mercury wallet. 

There is a case in which a user wishes to privately send Bitcoin but the receiver is not running a Mercury wallet and so an off-chain transfer cannot be performed. With Mercury this user can transfer their coin to a different Mercury Wallet user in exchange for the other wallet transferring a coin of the same amount back. Now the user can spend this new coin with confidence that the original sender, or others who were aware of their owernship of a certain coin, have no idea which UTXO they are spending from.
