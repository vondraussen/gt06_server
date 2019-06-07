# GT06 Server
This is a GT06 GPS Tracker server implementation  written in javascript.
It parses all messages received from the device and creates the response message, if needed.
Eventually it will send the received information to an MQTT broker.

So it acts as a server for GT06 trackers and a gateway to MQTT.
> Shout out to [Anton Holubenko](https://github.com/AntonHolubenko) because I've copied the initial version from him. [repo/gt06n](https://github.com/AntonHolubenko/gt06n)

## Configuration
The following environment variables are recognized. If not defined a default will be used.
- GT06_SERVER_PORT=64459
- MQTT_ROOT_TOPIC=gt06/
- MQTT_BROKER_URL=localhost
- MQTT_BROKER_PORT=1883
- MQTT_BROKER_USER=user
- MQTT_BROKER_PASSWD=passwd
