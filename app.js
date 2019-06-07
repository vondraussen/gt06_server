const Gt06 = require('./gt06');
const net = require('net');

const serverPort = 64459;

var server = net.createServer((client) => {
    var gt06 = new Gt06();
    console.log('client connected');

    client.on('close', () => {
        console.log('client disconnected');
    });

    client.on('data', (data) => {
        try {
            gt06.parse(data);
        }
        catch (e) {
            console.log('err', e);
            return;
        }
        console.log(gt06);
        if (gt06.expectsResonce) {
            client.write(gt06.responseMsg);
        }
    });
});

server.listen(serverPort, () => {
    console.log('started server on port:', serverPort);
});

