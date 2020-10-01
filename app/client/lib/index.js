const client_lib = require('../native');

client_lib.makeServer();

setTimeout(function() {
  do_some_api_calls()
}, 500);

function do_some_api_calls() {
  console.log(client_lib.apiGenBTCAddr());

  client_lib.callRustAsAsync((err, result) => {
    console.log('async result:');
    console.log(client_lib.apiGetSEfees());
  });

  console.log("Some other code on main thread.");
}

module.exports = client_lib;
