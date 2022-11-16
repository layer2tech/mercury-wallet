// http://localhost:3001/electrs/blocks/tip/hash

const axios = require('axios');

// Start Tor adapter


async function getBlockHash(){
    // Make sure this returns a hash
    let blockHash = await axios("http://localhost:3001/electrs/blocks/tip/hash")
    console.log(blockHash)
}


// Then create or get an Account
// Can bypass some steps by creating fake name and seed

getBlockHash()




