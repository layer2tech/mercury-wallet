export interface BitcoinDaemonClientInterface {
  getBestBlockHash(): any;
  getBestBlockHeight(): any;
  getBlockHeader(height: number): any;
  getBlockHeader(hash: string): any;
  getTxIdData(txid: string): any;
  getHeaderByHash(hash: string): any;
  getBlockStatus(hash: string): any;
  getRawTransaction(txid: string): any;
  getTxOut(txid: string, vout: number): any;
  setTx(txid: string): any;
  getMerkleProofPosition(txid: string): any;
}
