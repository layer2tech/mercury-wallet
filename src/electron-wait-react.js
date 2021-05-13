const net = require('net');
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

            console.log("starting tor")
            let tor = exec("tor");
            tor.stdout.on("data", function(data) {
                console.log("tor stdout: " + data.toString());
            });

            console.log("starting tor-adapter")
            let tor_adapter = exec("npm --prefix tor-adapter start");
            tor_adapter.stdout.on("data", function(data) {
                console.log("tor-adapter stdout: " + data.toString());
            });

            electron.on('exit', (error) => {
                console.log("stopping tor-adapter");
                tor_adapter.kill("SIGINT");
                console.log("stopping tor");
                tor.kill("SIGINT");
            });
        
        }
    }
);


tryConnection();
  

        

client.on('error', (error) => {
    setTimeout(tryConnection, 1000);
});
