const net = require('net');
const port = process.env.PORT ? (process.env.PORT - 100) : 3000;

process.env.ELECTRON_START_URL = `http://localhost:${port}`;

const client = new net.Socket();

let startedElectron = false;
let startedTor = false;
const tryConnection = () => client.connect({port: port}, () => {
        client.end();
        if(!startedElectron) {
            console.log('starting electron');
            startedElectron = true;

            const exec = require('child_process').exec;
            
            const electron = exec('npm run electron');
            electron.stdout.on("data", function(data) {
                console.log("stdout: " + data.toString());
            });
        }
        if(!startedTor) {
            console.log('starting tor');
            startedTor = true;

            const exec = require('child_process').exec;

            
            const tor = exec('npm --prefix tor run start', function (error, stdout, stderr) {
                if (error) {
                console.log(error.stack);
                console.log('Error code: '+error.code);
                console.log('Signal received: '+error.signal);
            }
                console.log('Child Process STDOUT: '+stdout);
                console.log('Child Process STDERR: '+stderr);
            });
  
            tor.on('exit', function (code) {
                console.log('Child process exited with exit code '+code);
            });
        }
    }
);

tryConnection();

client.on('error', (error) => {
    setTimeout(tryConnection, 1000);
});
