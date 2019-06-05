const Gt06 = require('./gt06');
const net = require('net');

const gt06 = new Gt06();
const serverPort = 64459;

var server = net.createServer((client) => {
    console.log('client connected');

    client.on('close', () => {
        console.log('client disconnected');
    });

    client.on('data', (data) => {
        try {
            var msg = gt06.parse(data)
        }
        catch (e) {
            console.log('err', e);
            return;
        }
        console.log(msg);
        if (msg.respondToClient) {
            client.write(msg.responseMsg);
        }
    });
});

server.listen(serverPort, () => {
    console.log('started server on port:', serverPort);
});

