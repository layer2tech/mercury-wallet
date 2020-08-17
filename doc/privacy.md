# Mercury wallet privacy


## General Bitcoin wallet privacy

### Coin Labelling

Mercury wallet helps a user to organise their wallet and mitigate against privacy leakage by encouraging labelling of coins (UTXOs). By default coins with different labels are never used as inputs to the same transaction, meaning that a user can partition their coins into different groups and be confident that transactions made from coins in one group will not expose their ownership of coins in a different group. When sending a transaction the user can choose which group of coins to send from, or can manually choose inputs themselves.

As an example suppose a user shares some savings with their partner and would like to suprise them with a gift. Without labelling of coins a coin which is shared may be accidentaly included in the transaction which pays for the gift. The partner may notice that these funds have been spent and at best the suprise is ruined or at worse they may think they have been robbed! If the user had labeled all their coins as "savings" then Mercury wallet would ensure that this problem would not arise, and that only the users personal funds would be spent.
 
Of course, labels can be mostly assigned automatically by the wallet, such as all coins from a user's employer being marked "salary". Any outputs of transactions using "salary" coins as  inputs would then also be marked "salary" automatically. This is for convenience and to act as an important reminder to the user that basic Bitcoin transactions do not break ownership assumptions to an outside observer.


### Address reuse

Mercury wallet is sure to not allow address reuse by efficiently storing a list of all addresses which have ever been generated and quering it before presenting a newly generated address to the user.
