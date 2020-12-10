// wallet utilities
import { Network, TransactionBuilder } from 'bitcoinjs-lib';
// import { TransactionBuilder } from 'bitcoinjs-lib/types/transaction_builder';

/// Temporary - fees should be calculated dynamically
const FEE = 300;


// Verify Spase Merkle Tree proof of inclusion
export const verifySmtProof = async (root: string, proof_key: string, proof: string) => {
  let wasm = await import('client-wasm');
  return wasm.verify_statechain_smt(root, proof_key, proof);
}


// Backup Tx builder
export const txBackupBuild = (network: Network, funding_txid: string, backup_receive_addr: string, value: number, init_locktime: number) => {
  if (FEE >= value) throw "Not enough value to cover fee.";

  let txb = new TransactionBuilder(network);
  txb.setLockTime(init_locktime);
  txb.addInput(funding_txid, 0);
  txb.addOutput(backup_receive_addr, value - FEE);

  // let backup_txid = txb.buildIncomplete().getId()
  return txb
}
