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

            let tor = exec("tor", (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });

            console.log("starting tor-adapter")

            let tor_adapter = exec("npm --prefix tor-adapter start", (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
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
