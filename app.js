require('dotenv').config();
const Gt06 = require('./gt06');
const Mqtt = require('mqtt');
const net = require('net');
const fs = require('fs');

const serverPort = process.env.GT06_SERVER_PORT || 64459;
const rootTopic = process.env.MQTT_ROOT_TOPIC || 'gt06';
const brokerUrl = process.env.MQTT_BROKER_URL || 'localhost';
const brokerPort = process.env.MQTT_BROKER_PORT || 1883;
const mqttProtocol = process.env.MQTT_BROKER_PROTO || 'mqtt';
const brokerUser = process.env.MQTT_BROKER_USER || 'user';
const brokerPasswd = process.env.MQTT_BROKER_PASSWD || 'passwd';
const trustedCaPath = process.env.MQTT_BROKER_CA || '';
const TRUSTED_CA = fs.readFileSync(trustedCaPath);

var mqttClient = Mqtt.connect(
    {
        host: brokerUrl,
        port: brokerPort,
        protocol: mqttProtocol,
        ca: TRUSTED_CA,
        username: brokerUser,
        password: brokerPasswd
    }
);

mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
});

var server = net.createServer((client) => {
    var gt06 = new Gt06();
    console.log('client connected');

    server.on('error', (err) => {
        console.error('server error', err);
    });

    client.on('error', (err) => {
        console.error('client error', err);
    });

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
        if (gt06.expectsResponse) {
            client.write(gt06.responseMsg);
        }
        mqttClient.publish(rootTopic + '/' + gt06.imei + '/pos', JSON.stringify(gt06));
    });
});

server.listen(serverPort, () => {
    console.log('started server on port:', serverPort);
});

