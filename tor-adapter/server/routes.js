const GET_ROUTE = {
    PING: "/eps/ping",
    //latestBlockHeader "/Electrs/block/:hash/header",
    BLOCK: "/eps/block",
    HEADER: "header",
    //getTransaction /tx/:txid
    TX: "/eps/tx",
    //getScriptHashListUnspent /scripthash/:hash/utxo
    SCRIPTHASH: "/eps/scripthash",
    UTXO: "utxo",
    //getFeeHistogram
    FEE_ESTIMATES: "/eps/fee-estimates",
  };
  Object.freeze(GET_ROUTE);
  
  const POST_ROUTE = {
    //broadcast transaction
    TX: "/eps/tx",
  };
  Object.freeze(POST_ROUTE);

module.exports = {
    GET_ROUTE,
    POST_ROUTE
}