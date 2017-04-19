/**
 * Created by root on 16.8.16.
 */

/*
 * Util methods to transform objects of devices, services and characteristics to arrays ready to be send as JSON.
 */
exports.servicesToJSON = function servicesToJSON(services) {
    var servicesResponse = [];
    for (var i in services) {
        //console.log('  [' + i + '] service uuid: ' + services[i]);
        var service = services[i];
        servicesResponse.push({
            'uuid' : service.uuid,
            'name' : service.name,
            'type' : service.type
        });
    }
    return servicesResponse;
};

exports.devicesToJSON = function devicesToJSON(devices) {
    var responseDevices = [];
    for (var iid in devices) {
        responseDevices.push({
            'id' : iid,
            'mac_address' : devices[iid].device.address,
            'local_name' : devices[iid].device.advertisement.localName,
            'mac_id' : devices[iid].device.id,
            'rssi' : devices[iid].device.rssi,
            'disconnected' : devices[iid].disconnected,
            'device_reconnect_timeout' : devices[iid].deviceReconnectTimeout,
            'device_reconnect_attempts' : devices[iid].deviceReconnectAttempts
        });
    }
    return responseDevices;
};

exports.characteristicsToJSON = function characteristicsToJSON(characteristics) {
    var characteristicsResponse = [];
    for (var j in characteristics) {
        characteristicsResponse.push({
            'uuid': characteristics[j].uuid,
            'name': characteristics[j].name,
            'type': characteristics[j].type,
            'properties': characteristics[j].properties
        });
        /*characteristics[j].subscribe(function(error){
         console.log('Couldn\'t subscribe to characteristic = ' + characteristics[j].uuid + '; error = ' + error);
         });
         characteristics[j].on('data', function(data, isNotification){
         console.log('OnData for characteristic = ' + characteristics[j].uuid );
         console.log('OnData data = ' + data );
         console.log('OnData isNotification = ' + isNotification );
         });*/
        /*characteristics[j].discoverDescriptors(function(error, descriptors){
         console.log('Discovered descriptors for characteristics = ' + characteristics[j]);
         console.log('Discovered descriptors  = ' + descriptors);
         console.log('Discovered descriptors  error = ' + error);
         });*/
    }
    return characteristicsResponse;
};

exports.descriptorsToJSON = function descriptorsToJSON(descriptors) {
    var descriptorsResponse = [];
    for (var j in descriptors) {
        descriptorsResponse.push({
            'uuid': descriptors[j].uuid,
            'name': descriptors[j].name,
            'type': descriptors[j].type
        });
    }
    return descriptorsResponse;
};

/*
Util methods to send different responses.
 */
exports.sendResponse = function sendResponse(response, statusCode, json) {
    response.writeHead(statusCode, {'Content-Type' : 'application-json'});
    response.end(json);
};

exports.sendOkResponse = function sendOkResponse(response, object){
    try {
        module.exports.sendResponse(response, 200, JSON.stringify(object));
    } catch (error) {
        module.exports.sendResponse(response, 417, JSON.stringify(error));
    }
};

exports.sendNotFoundResponse = function sendNotFoundResponse(response, msg, code){
    var responseObject = { message: msg, code: code};
    module.exports.sendResponse(response, 404, JSON.stringify(responseObject));
};

exports.sendErrorResponse = function sendErrorResponse(response, msg, error){
    console.error(msg + ' : ', error);
    var responseObject = { message: msg, error: error.toString()};
    module.exports.sendResponse(response, 417, JSON.stringify( responseObject ));
};

exports.generateID = function(length) {
    const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    var rtn = '';
    for (var i = 0; i < length; i++) {
        rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return rtn;
}

exports.getDeviceByUrl = function (devices, url, urlTokens) {
    var device;
    var errorMsg = '';
    var identifier = urlTokens[3];
    if(url.indexOf('iid') > -1) {
        errorMsg = 'No device found with id = ' + identifier;
        if (identifier in devices) {
            device = devices[identifier];
        }
    } else if (url.indexOf('mac') > -1) {
        errorMsg = 'No device found with mac = ' + identifier;
        var result = findDeviceByProperty(devices, identifier, function(device){
            return device.id.toLocaleLowerCase();
        });
        if(result) {
            device = result.deviceItem;
        }
    }
    return {'deviceItem' : device, 'errorMsg': errorMsg };
}

exports.findDeviceByName = function (devices, name) {
    return findDeviceByProperty(devices, name, function(device){
        return device.advertisement.localName;
    });
};

exports.findDeviceByMac = function (devices, mac) {
    return findDeviceByProperty(devices, mac, function(device){
        return device.address.toLocaleLowerCase();
    });
};

function findDeviceByProperty(devices, deviceProperty, getPropertyCb) {
    for (var iid in devices) {
        var property = getPropertyCb(devices[iid].device);
        if (property == deviceProperty) {
            return { 'deviceItem' : devices[iid], 'id' : iid };
        }
    }
    return null;
}