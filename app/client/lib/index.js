const client_lib = require('../native');
module.exports = client_lib;

client_lib.makeServer();

setTimeout(function() {
  do_some_api_calls()
}, 500);


function do_some_api_calls() {
  // console.log(client_lib.makeServerRequestExample());
  console.log(client_lib.apiGenAddr());
}
