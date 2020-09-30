const client_lib = require('../native');
module.exports = client_lib;

client_lib.makeServer();

setTimeout(function() {
  do_some_api_calls()
}, 500);

function do_some_api_calls() {
  console.log(client_lib.apiGenBTCAddr());
  console.log(client_lib.apiGenSEAddr("0158f2978e5c2cf407970d7213f2b4289993b2fe3ef6aca531316cdcf347cc41"));
  console.log(client_lib.apiGetSEfees());
}
