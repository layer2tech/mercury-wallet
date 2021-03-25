import {SIGNSWAPTOKEN_DATA} from './test_data'
import {SwapToken} from '../swap/swap'
import {fromSeed} from 'bip32';

let bitcoin = require('bitcoinjs-lib')

describe('swapTokenSign', function() {
  test('Gen and Verify', async function() {
    SIGNSWAPTOKEN_DATA.forEach(data => {
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(data.priv, "hex"));
      //let proof_key_der = wallet.getBIP32forProofKeyPubKey(data.priv);
      // console.log('proof_key_der', proof_key_der);
      let pub = proof_key_der.publicKey.toString('hex');
      expect(pub).toBe(data.pub);
      let st = data.swap_token;
      let st_cls = new SwapToken(st.id, st.amount, st.time_out, st.statechain_ids);

      let swap_sig = st_cls.sign(proof_key_der,data.swap_token, data.priv);
    expect(swap_sig).toBe(data.swap_token_sig);
  })
});
})

describe('Swaps', function() {
  describe('swapTokenSign', function() {
    test('Gen and Verify', async function() {
      let proof_key_der = fromSeed(Buffer.from("0123456789abcdef"), bitcoin.networks.bitcoin);
      console.log("proof_key_der: ", proof_key_der.privateKey.toString("hex"))
      console.log("proof_key_der: ", Array.from(proof_key_der.privateKey))
      let pub = proof_key_der.publicKey.toString('hex');
      console.log("pub: ", pub)

      let swap_token = new SwapToken(
        "120270b4-1a97-46c8-aed6-6b48bf9ff310",
        10,
        10,
        []);

      let msg = swap_token.to_message()
      let swap_sig = swap_token.sign(proof_key_der);
      console.log("swap_sig: ", swap_sig)
      console.log("swap_sig: ", swap_token.verify_sig(proof_key_der, swap_sig))
    })
  });
});
