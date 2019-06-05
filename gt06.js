// get more info about the protocol from:
// https://www.traccar.org/protocols/
// https://dl.dropboxusercontent.com/s/sqtkulcj51zkria/GT06_GPS_Tracker_Communication_Protocol_v1.8.1.pdf
const getCrc16 = require('./crc16');
module.exports = Gt06 = function () { }

Gt06.prototype.parse = function (data) {
    let result;
    let expectsResonce = false;
    let responseMsg = null;
    if (!this.checkHeader(data)) {
        throw { error: 'unknown message header', header: data.slice(0, 2) };
    }
    switch (this.selectEvent(data).number) {
        case 0x01:
            result = this.parseLogin(data);
            expectsResonce = true;
            responseMsg = this.createResponse(data);
            break;
        case 0x12:
            result = this.parseLocation(data);
            break;
        case 0x13:
            result = this.parseStatus(data);
            expectsResonce = true;
            responseMsg = this.createResponse(data);
            break;
        // case 0x15:
        //     //parseLocation(data);
        //     break;
        // case 0x16:
        //     result = this.parseAlarm(data);
        //     break;
        // case 0x1A:
        //     //parseLocation(data);
        //     break;
        // case 0x80:
        //     //parseLocation(data);
        //     break;
        default:
            result = 'unknown message type!'
            break;
    }
    return {
        dataPacket: data,
        event: this.selectEvent(data),
        respondToClient: expectsResonce,
        responseMsg: responseMsg,
        parsed: result
    };
}

Gt06.prototype.checkHeader = function (data) {
    let header = data.slice(0, 2);
    if (!header.equals(Buffer.from('7878', 'hex'))) {
        return false;
    }
    return true;
}

Gt06.prototype.selectEvent = function (data) {
    let eventStr = 'unknown';
    switch (data[3]) {
        case 0x01:
            eventStr = 'login';
            break;
        case 0x12:
            eventStr = 'location';
            break;
        case 0x13:
            eventStr = 'status';
            break;
        case 0x16:
            eventStr = 'alarm';
            break;
        default:
            eventStr = 'unknown';
            break;
    }
    return { number: data[3], string: eventStr };
}

Gt06.prototype.parseLogin = function (data) {
    return {
        imei: parseInt(data.slice(4, 12).toString('hex'), 10),
        serialNumber: data.readUInt16BE(12),
        errorCheck: data.readUInt16BE(14)
    };
}

Gt06.prototype.parseStatus = function (data) {
    let statusInfo = data.slice(4, 9);
    let terminalInfo = statusInfo.slice(0, 1).readUInt8(0);
    let voltageLevel = statusInfo.slice(1, 2).readUInt8(0);
    let gsmSigStrength = statusInfo.slice(2, 3).readUInt8(0);

    let alarm = (terminalInfo & 0x38) >> 3;
    let alarmType = 'Normal';
    switch (alarm) {
        case 1:
            alarmType = 'Shock'
            break;
        case 2:
            alarmType = 'Power Cut'
            break;
        case 3:
            alarmType = 'Low Battery'
            break;
        case 4:
            alarmType = 'SOS'
            break;
        default:
            alarmType = 'Normal';
            break;
    }

    let termObj = {
        status: Boolean(terminalInfo & 0x01),
        ignition: Boolean(terminalInfo & 0x02),
        charging: Boolean(terminalInfo & 0x04),
        alarmType: alarmType,
        gpsTracking: Boolean(terminalInfo & 0x40),
        relayState: Boolean(terminalInfo & 0x80)
    }

    let voltageLevelStr = 'no power (shutting down)'
    switch (voltageLevel) {
        case 1:
            voltageLevelStr = 'extremely low battery'
            break;
        case 2:
            voltageLevelStr = 'very low battery (low battery alarm)'
            break;
        case 3:
            voltageLevelStr = 'low battery (can be used normally)'
            break;
        case 4:
            voltageLevelStr = 'medium'
            break;
        case 5:
            voltageLevelStr = 'high'
            break;
        case 6:
            voltageLevelStr = 'very high'
            break;
        default:
            voltageLevelStr = 'no power (shutting down)'
            break;
    }

    let gsmSigStrengthStr = 'no signla'; // how shall it send without signal :-D
    switch (gsmSigStrength) {
        case 1:
            gsmSigStrengthStr = 'extremely weak signal';
            break;
        case 2:
            gsmSigStrengthStr = 'very weak signal';
            break;
        case 3:
            gsmSigStrengthStr = 'good signal';
            break;
        case 4:
            gsmSigStrengthStr = 'strong signal';
            break;
        default:
            gsmSigStrengthStr = 'no signla';
            break;
    }

    return {
        terminalInfo: termObj,
        voltageLevel: voltageLevelStr,
        gsmSigStrength: gsmSigStrengthStr
    };
}

Gt06.prototype.parseLocation = function (data) {
    let datasheet = {
        start_bit: data.readUInt16BE(0),
        protocol_length: data.readUInt8(2),
        protocol_number: data.readUInt8(3),
        datetime: data.slice(4, 10),
        quantity: data.readUInt8(10),
        lat: data.readUInt32BE(11),
        lon: data.readUInt32BE(15),
        speed: data.readUInt8(19),
        course: data.readUInt16BE(20),
        mcc: data.readUInt16BE(22),
        mnc: data.readUInt8(24),
        lac: data.readUInt16BE(25),
        cell_id: parseInt(data.slice(27, 30).toString('hex'), 16),
        serial_number: data.readUInt16BE(30),
        error_check: data.readUInt16BE(32),
        stop_bit: data.readUInt16BE(34)
    };

    let parsed = {
        datetime: this.parseDatetime(datasheet.datetime).toISOString(),
        satelites: (datasheet.quantity & 0xF0) >> 4,
        satelitesActive: (datasheet.quantity & 0x0F),
        lat: this.decodeGt06Lat(datasheet.lat, datasheet.course),
        lon: this.decodeGt06Lon(datasheet.lon, datasheet.course),
        speed: datasheet.speed,
        speed_unit: 'km/h',
        real_time_gps: Boolean(datasheet.course & 0x2000),
        gps_positioned: Boolean(datasheet.course & 0x1000),
        east_longitude: !Boolean(datasheet.course & 0x0800),
        north_latitude: Boolean(datasheet.course & 0x0400),
        course: (datasheet.course & 0x3FF),
        mcc: datasheet.mcc,
        mnc: datasheet.mnc,
        lac: datasheet.lac,
        cell_id: datasheet.cell_id,
        serial_number: datasheet.serial_number,
        error_check: datasheet.error_check,
        stop_bit: datasheet.stop_bit
    };
    return parsed;
}

// not tested! not sent by my tracker
Gt06.prototype.parseAlarm = function (data) {
    let datasheet = {
        start_bit: data.readUInt16BE(0),
        protocol_length: data.readUInt8(2),
        protocol_number: data.readUInt8(3),
        datetime: data.slice(4, 10),
        quantity: data.readUInt8(10),
        lat: data.readUInt32BE(11),
        lon: data.readUInt32BE(15),
        speed: data.readUInt8(19),
        course: data.readUInt16BE(20),
        mcc: data.readUInt16BE(22),
        mnc: data.readUInt8(24),
        lac: data.readUInt16BE(25),
        cell_id: parseInt(data.slice(27, 30).toString('hex'), 16),
        terminal_information: data.readUInt8(31),
        voltage_level: data.readUInt8(32),
        gps_signal: data.readUInt8(33),
        alarm_lang: data.readUInt16BE(34),
        serial_number: data.readUInt16BE(36),
        error_check: data.readUInt16BE(38),
        stop_bit: data.readUInt16BE(40)
    };

    let parsed = {
        datetime: parseDatetime(datasheet.datetime),
        satelites: (datasheet.quantity & 0xF0) >> 4,
        satelitesActive: (datasheet.quantity & 0x0F),
        lat: decodeGt06Lat(datasheet.lat, datasheet.course),
        lon: decodeGt06Lon(datasheet.lon, datasheet.course),
        speed: datasheet.speed,
        speed_unit: 'km/h',
        real_time_gps: Boolean(datasheet.course & 0x2000),
        gps_positioned: Boolean(datasheet.course & 0x1000),
        east_longitude: !Boolean(datasheet.course & 0x0800),
        north_latitude: Boolean(datasheet.course & 0x0400),
        course: (datasheet.course & 0x3FF),
        mmc: datasheet.mnc,
        cell_id: datasheet.cell_id,
        terminal_information: datasheet.terminal_information,
        voltage_level: datasheet.voltage_level,
        gps_signal: datasheet.gps_signal,
        alarm_lang: datasheet.alarm_lang,
        serial_number: datasheet.serial_number,
        error_check: datasheet.error_check,
        stop_bit: datasheet.stop_bit
    };
    return parsed;
}

Gt06.prototype.createResponse = function (data) {
    let respRaw = Buffer.from('787805FF0001d9dc0d0a', 'hex');
    // we put the protocol of the received message into the response message
    // at position byte 3 (0xFF in the raw message)
    respRaw[3] = data[3];
    this.appendCrc16(respRaw);
    return respRaw;
}

Gt06.prototype.parseDatetime = function (data) {
    return new Date(
        Date.UTC(data[0] + 2000, data[1] - 1, data[2], data[3], data[4], data[5]));
}

Gt06.prototype.decodeGt06Lat = function (lat, course) {
    var latitude = lat / 60.0 / 30000.0;
    if (!(course & 0x0400)) {
        latitude = -latitude;
    }
    return Math.round(latitude * 1000000) / 1000000;
}

Gt06.prototype.decodeGt06Lon = function (lon, course) {
    var longitude = lon / 60.0 / 30000.0;
    if (course & 0x0800) {
        longitude = -longitude;
    }
    return Math.round(longitude * 1000000) / 1000000;
}

Gt06.prototype.appendCrc16 = function (data) {
    // write the crc16 at the 4th position from the right (2 bytes)
    // the last two bytes are the line ending
    data.writeUInt16BE(getCrc16(data.slice(2, 6)).readUInt16BE(0), data.length - 4);
}