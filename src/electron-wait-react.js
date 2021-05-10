const net = require('net');
const port = process.env.PORT ? (process.env.PORT - 100) : 3000;

process.env.ELECTRON_START_URL = `http://localhost:${port}`;

const client = new net.Socket();

let startedElectron = false;

const tryConnection = () => client.connect({port: port}, () => {
        const exec = require('child_process').exec;
        client.end();
        if(!startedElectron) {
            
            startedElectron = true;

            console.log('starting electron');
            const electron = exec('npm run electron');
            electron.stdout.on("data", function(data) {
                console.log("stdout: " + data.toString());
            });

            console.log('starting tor');
            
            const tor = exec('npm --prefix tor run start');
            //, function (error, stdout, stderr) {
            //    if (error) {
            //    console.log(error.stack);
            //    console.log('Error code: '+error.code);
            //    console.log('Signal received: '+error.signal);
            //}
            //    console.log('Child Process STDOUT: '+stdout);
            //    console.log('Child Process STDERR: '+stderr);
            //});

            electron.on('exit', function (_code) {
                tor.kill("SIGINT");
            });
        }
    }
);


tryConnection();
  

        

client.on('error', (error) => {
    setTimeout(tryConnection, 1000);
});
