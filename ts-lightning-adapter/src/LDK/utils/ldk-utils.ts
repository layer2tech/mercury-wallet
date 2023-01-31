import { getLDKClient } from "../init/importLDK.js";

export const closeConnections = () => {
    console.log("Closing all the connections")
    getLDKClient().netHandler.stop();
}

// export const createInvoice = (amtInSats: number, invoiceExpirySecs: number, description: string) => {
//     let mSats = getLDKClient().LDK.Option_u64Z.constructor_some(BigInt(amtInSats * 1000));

//     let invoice = getLDKClient().channel_manager.create_inbound_payment(
//       mSats,
//       invoiceExpirysecs
//     );

//     let payment_hash = invoice.res.get_a();
//     let payment_secret = invoice.res.get_b();

//     let encodedInvoice = lightningPayReq.encode({
//       satoshis: amtInSats,
//       timestamp: Date.now(),
//       tags: [
//         {
//           tagName: "payment_hash",
//           data: payment_hash,
//         },
//         {
//           tagName: "payment_secret",
//           data: payment_secret,
//         },
//         {
//           tagName: "description",
//           data: description,
//         },
//       ],
//     });

//     // Hardcoded for now, needs to be changed
//     let privateKeyHex =
//       "e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734";
//     let signedInvoice = lightningPayReq.sign(encodedInvoice, privateKeyHex);
//     return signedInvoice;
// }