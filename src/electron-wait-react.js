const net = require('net');
//const fixPath = require('fix-path');
const port = process.env.PORT ? (process.env.PORT - 100) : 3000;


process.env.ELECTRON_START_URL = `http://localhost:${port}`;

const client = new net.Socket();

let startedElectron = false;

const tryConnection = () => client.connect({port: port}, () => {
        client.end();
        if(!startedElectron) {
            const exec = require('child_process').exec;
            startedElectron = true;

            console.log('starting electron');
            const electron = exec('npm run electron');
            
            electron.stdout.on("data", function(data) {
                console.log("stdout: " + data.toString());
            });
        }
    }
);
tryConnection();
  
client.on('error', (error) => {
    setTimeout(tryConnection, 1000);
});
