"use strict";
export class ChannelList {
    channels: Channel[]
    constructor(){
        this.channels = []
    }
    addChannel(proof_key:string, funding_addr: string, amount: number, wallet_version: string, peer_pubkey: string, host: string, port: number){
        let newChannelFunding: ChannelFunding = {
            proof_key: proof_key,
            funding_txid: null,
            funding_vout: null,
            addr: funding_addr,
            block: null,
            withdrawalTx: null,
            value: null
        }
        let newChannel: Channel = {
            wallet_version: wallet_version,
            info: null,
            funding: newChannelFunding,
            amount: amount,
            status: CHANNEL_STATUS.INITIALISED,
            peer_pubkey: peer_pubkey,
            host: host,
            port: port
        }
        this.channels.push(newChannel);
    }
    getChannel(proof_key: string){
        let channel = this.channels.filter( chan => chan.funding?.proof_key === proof_key);
        return channel;
    }
    addChannelFunding(txid: string, vout: number, addr: string, block: number, value: number){
        let channelFund = this.channels.filter((channel) => channel.funding?.addr === addr);
        if(channelFund[0].funding){
            channelFund[0].funding.funding_txid = txid;
            channelFund[0].funding.funding_vout = vout;
            channelFund[0].funding.block = block;
            channelFund[0].funding.value = value
        }
    }
    getTotalChannelBalance(){
        let channelsInfo: ChannelInfo[] = []
        // Get list of channel Infos if any
        this.channels.map(channel => {
          if(channel.info){
            channelsInfo.push(channel.info)
          }
        });
        // Get total channel amount
        let total = channelsInfo.reduce((sum, currentItem) => sum + currentItem.amount, 0);
        return total
    }
}
export interface Channel {
    wallet_version: string;
    info: ChannelInfo | null;
    funding: ChannelFunding | null;
    status: CHANNEL_STATUS;
    amount: number| null; // in satoshis
    peer_pubkey: string;
    host: string;
    port: number;
}
export interface ChannelInfo {
    id: string;
    name: string;
    amount: number; // in satoshis
    push_msat: number;
    user_id: string;
    config_id: string;
    wallet_id: string;
    peer_id: string;
}
export interface ChannelFunding {
    proof_key: string | null;
    funding_txid: string | null;
    funding_vout: number | null;
    addr: string; // addr user sends funding to
    block: number | null;
    withdrawalTx: any | null; // add this type later - Information about if this tx is withdrawn i.e. unable to open channel
    value: number | null;
}
// STATUS represent each stage in the lifecycle of a channel.
export enum CHANNEL_STATUS {
    // INITIALISED channels are awaiting their funding transaction to appear in the mempool
    INITIALISED = "INITIALISED",
    // IN_MEMPOOL funding transaction in the mempool
    IN_MEMPOOL = "IN_MEMPOOL",
    // UNCONFIRMED coins are awaiting more confirmations on their funding transaction
    UNCONFIRMED = "UNCONFIRMED",
    // Coins are fully owned by wallet and unspent
    // AVAILABLE = “AVAILABLE”,
    // A withdrawal transaction has been broadcast but has not yet been confirmed
    // WITHDRAWING = “WITHDRAWING”,
    // Coin used to belonged to wallet but has been withdraw
    // WITHDRAWN = “WITHDRAWN”,
    // Coin has reached it’s backup timelock and has been spent
    // EXPIRED = “EXPIRED”,
    // Coin has been deleted
    // DELETED = “DELETED”,
    // Duplicate deposit to single shared key
    // DUPLICATE = “DUPLICATE”,
  }
  Object.freeze(CHANNEL_STATUS);