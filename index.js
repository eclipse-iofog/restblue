console.log('STARTED container.');

var noble = require('noble');
var http = require('http');

var util = require('./util');

const PORT = 10500;
const maxTimeout = 32 * 1000; // 32 sec

var timeoutResponseProcess;
var currTime;
var devices = {};
var deviceIdentifier = null;


noble.on('stateChange', function(state) {
    console.log('noble stateChanged');
    if (state === 'poweredOn') {
        console.log('noble powerOn');
        noble.startScanning(null, false, function(error){
            if(error) {
                console.error('There was an error with start scanning: ', error);
            } else {
                console.log('Scanning started successfully.');
            }
        });
    } else {
        console.log('noble NOT powerOn');
        noble.stopScanning();
    }
});

noble.on('scanStart', function() {
    console.log('Scanning STARTed.');
});
noble.on('stopStart', function() {
    console.log('Scanning STOPed.');
});

noble.on('discover', function(peripheral) {
    console.log('Found device with local name: ' + peripheral.advertisement.localName + ' ; address = ' + peripheral.address + ' ; id = ' + peripheral.id);
    var generatedID;
    var result;
    if(deviceIdentifier) {
        if(deviceIdentifier == 'name') {
            result = util.findDeviceByName(devices, peripheral.advertisement.localName);
        } if (deviceIdentifier == 'mac') {
            result = util.findDeviceByMac(devices, peripheral.address);
        }
    }
    if (result) {
        generatedID = result.id;
    } else {
        generatedID = util.generateID();
    }
    devices[generatedID] = peripheral;
    /*peripheral.on('rssiUpdate', function(rssi){
        console.log('rssi update for devie id = ' + peripheral.id);
        devices[generatedID].rssi = rssi;
    });*/
});

function connectToDevice(device, response, onConnectCallback) {
    console.log('Connecting to device with id = ' +  device.id);
    if(device) {
        device.connect(function(error) {
            clearTimeout(timeoutResponseProcess);
            if (error) {
                util.sendErrorResponse(response, ' Connect to device id = ' + device.id, error);
            } else {
                console.log('connected to device with id = ' + device.id);
                if(onConnectCallback) {
                    startTimeoutResponseProcess(response);
                    onConnectCallback();
                }
            }
        });
        /*device.updateRssi(function (error, rssi) {
            console.log('Update RSSI for devie id = ' + device.id);
        });*/
        device.on('disconnect', function() {
            clearTimeout(timeoutResponseProcess);
            util.sendErrorResponse(response, 'Info', 'Device with id = ' + device.id + ' disconnected. ');
        });
    } else {
        clearTimeout(timeoutResponseProcess);
        util.sendNotFoundResponse(response, 'Device not found in memory.');
    }
}

function checkDeviceStatus(device, response, mainCallback) {
    if(device) {
        if( device.state == 'connected' ) {
            console.log('device is already connected');
            mainCallback();
        } else {
            connectToDevice(device, response, function afterConnectCallback() {
                mainCallback();
            });
        }
    } else {
        clearTimeout(timeoutResponseProcess);
        util.sendNotFoundResponse(response, 'Device not found in memory.');
    }
}

function discoverDeviceServices(device, response, callback) {
    console.log('Discovering services for device with id = ' +  device.id);
    device.discoverServices(null, function(error, services) {
        clearTimeout(timeoutResponseProcess);
        if (error) {
            util.sendErrorResponse(response, 'Discover services for device uuid - ' + device.uuid, error);
        } else {
            console.log('discovered services for device uuid - ' + device.address);
            if(callback) {
                startTimeoutResponseProcess(response);
                callback(services);
            } else {
                util.sendOkResponse(response, util.servicesToJSON(services));
            }
        }
    });
}

function discoverServiceCharacteristics(device, serviceId, response, callback) {
    console.log('Discovering service characteristics for device with id = ' +  device.id);
    discoverDeviceServices(device, response, function characteristicsCallback(services){
        var foundService = false;
        for (var i in services) {
            if(serviceId == services[i].uuid) {
                foundService = true;
                var service = services[i];
                service.discoverCharacteristics(null, function (error, characteristics) {
                    clearTimeout(timeoutResponseProcess);
                    if(error) {
                        util.sendErrorResponse(response, 'Discover characteristics for service uuid = ' + service.uuid, error);
                    } else {
                        console.log(' discovered characteristics for service uuid - ' + service.uuid);
                        if(callback) {
                            startTimeoutResponseProcess(response);
                            callback(characteristics);
                        } else {
                            util.sendOkResponse(response, util.characteristicsToJSON(characteristics));
                        }
                    }
                });
                break;
            }
        }
        if (!foundService) {
            clearTimeout(timeoutResponseProcess);
            util.sendNotFoundResponse(response, 'Service with uuid = ' + serviceId + ' not found.');
        }
    });
}

function characteristicEvent(device, serviceId, characteristicId, response, callback) {
    discoverServiceCharacteristics(device, serviceId, response, function characteristicEventCallback(characteristics){
        var foundCharacteristic = false;
        for (var i in characteristics) {
            if(characteristicId == characteristics[i].uuid) {
                foundCharacteristic = true;
                if(callback) {
                    callback(characteristics[i]);
                }
                break;
            }
        }
        if (!foundCharacteristic) {
            clearTimeout(timeoutResponseProcess);
            util.sendNotFoundResponse(response, 'Characteristic with id = ' + characteristicId + ' not found.');
        }
    });
}

function readCharacteristic(device, serviceId, characteristicId, response) {
    characteristicEvent(device, serviceId, characteristicId, response, function readCharacteristicCallback(characteristic) {
        characteristic.read( function(error, data) {
            clearTimeout(timeoutResponseProcess);
            if(error) {
                util.sendErrorResponse(response, 'Error reading data to characteristic id = ' + characteristic.uuid, error);
            } else {
                console.log('Success reading data from characteristic id = ' + characteristic.uuid);
                try {
                    // TODO : decide how to return data
                    util.sendResponse(response, 200, JSON.stringify({ 'data' : data.toString('hex')}));
                } catch (error) {
                    util.sendErrorResponse(response, 'Error transforming data to base64 of characteristic with id = ' + characteristic.uuid, error);
                }
            }
        });
    });
}

function writeCharacteristic(device, serviceId, characteristicId, response, request) {
    characteristicEvent(device, serviceId, characteristicId, response, function writeCharacteristicCallback(characteristic) {
        var body = [];
        request.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            try {
                var jsonRequest = JSON.parse(body);
                if(jsonRequest.data) {
                    var withResponse = false;
                    if(jsonRequest.withresponse) {
                        withResponse = true;
                    }
                    characteristic.write(new Buffer(jsonRequest.data), withResponse, function(error) {
                        clearTimeout(timeoutResponseProcess);
                        if(error) {
                            util.sendErrorResponse(response, 'Error writing data to characteristic id = ' + characteristic.uuid, error);
                        } else {
                            console.log('Success writing data to characteristic id = ' + characteristic.uuid);
                            util.sendOkResponse(response, 'Success writing data to characteristic id = ' + characteristic.uuid);
                        }
                    });
                } else {
                    clearTimeout(timeoutResponseProcess);
                    util.sendErrorResponse(response, 'Error writing data to characteristic id = ' + characteristic.uuid, 'No data provided.');
                }
            } catch (error) {
                clearTimeout(timeoutResponseProcess);
                util.sendErrorResponse(response, 'Error parsing request body to write to characteristic with id = ' + characteristic.uuid, error);
            }
        });
    });
}

function discoverCharacteristicDescriptors(device, serviceId, characteristicId, response, callback) {
    console.log('Discovering characteristic descriptors for device with id = ' +  device.id);
    discoverServiceCharacteristics(device, serviceId, response, function descriptorsCallback(characteristics) {
        var foundCharacteristic = false;
        for (var i in characteristics) {
            if(characteristicId == characteristics[i].uuid) {
                foundCharacteristic = true;
                var characteristic = characteristics[i];
                characteristic.discoverDescriptors(function (error, descriptors) {
                    clearTimeout(timeoutResponseProcess);
                    if(error) {
                        util.sendErrorResponse(response, 'Discover descriptors for characteristic uuid = ' + characteristic.uuid, error);
                    } else {
                        console.log(' discovered descriptors for characteristic uuid - ' + characteristic.uuid);
                        if(callback) {
                            startTimeoutResponseProcess(response);
                            callback(descriptors);
                        } else {
                            util.sendOkResponse(response, util.descriptorsToJSON(descriptors));
                        }
                    }
                });
                break;
            }
        }
        if (!foundCharacteristic) {
            clearTimeout(timeoutResponseProcess);
            util.sendNotFoundResponse(response, 'Characteristic with uuid = ' + characteristicId + ' not found.');
        }
    });
}

function readDescriptor(device, serviceId, characteristicId, descriptorId, response) {
    descriptorEvent(device, serviceId, characteristicId, descriptorId, response, function readDescriptorCallback(descriptor) {
        descriptor.readValue(function(error, data) {
            clearTimeout(timeoutResponseProcess);
            if(error) {
                util.sendErrorResponse(response, 'Error reading data from descriptor id = ' + descriptor.uuid, error);
            } else {
                console.log('Success reading data from descriptor id = ' + descriptor.uuid);
                try {
                    // TODO : decide how to return data
                    util.sendResponse(response, 200, JSON.stringify({ 'data' : data.toString()}));
                } catch (error) {
                    util.sendErrorResponse(response, 'Error transforming data to base64 of descriptor with id = ' + descriptor.uuid, error);
                }
            }
        });
    });
}


function writeDescriptor(device, serviceId, characteristicId, descriptorId, response, request) {
    descriptorEvent(device, serviceId, characteristicId, descriptorId, response, function writeDescriptorCallback(descriptor) {
        var body = [];
        request.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            try {
                var jsonRequest = JSON.parse(body);
                if(jsonRequest.data) {
                    descriptor.writeValue(new Buffer(jsonRequest.data), function(error) {
                        clearTimeout(timeoutResponseProcess);
                        if(error) {
                            util.sendErrorResponse(response, 'Error writing data to descriptor id = ' + descriptor.uuid, error);
                        } else {
                            console.log('Success writing data to descriptor id = ' + descriptor.uuid);
                            util.sendOkResponse(response, 'Success writing data to descriptor id = ' + descriptor.uuid);
                        }
                    });
                } else {
                    clearTimeout(timeoutResponseProcess);
                    util.sendErrorResponse(response, 'Error writing data to descriptor id = ' + descriptor.uuid, 'No data provided.');
                }
            } catch (error) {
                clearTimeout(timeoutResponseProcess);
                util.sendErrorResponse(response, 'Error parsing request body to write to descriptor with id = ' + descriptor.uuid, error);
            }
        });
    });
}

function descriptorEvent(device, serviceId, characteristicId, descriptorId, response, callback) {
    discoverCharacteristicDescriptors(device, serviceId, characteristicId, response, function descriptorEventCallback(descriptors){
        var foundDescriptor = false;
        for (var i in descriptors) {
            if(descriptorId == descriptors[i].uuid) {
                foundDescriptor = true;
                if(callback) {
                    callback(descriptors[i]);
                }
                break;
            }
        }
        if (!foundDescriptor) {
            clearTimeout(timeoutResponseProcess);
            util.sendNotFoundResponse(response, 'Descriptor with id = ' + descriptorId + ' not found.');
        }
    });
}

function checkTimeout(response) {
    var time = Date.now();
    if(time - currTime >= maxTimeout) {
        util.sendErrorResponse(response, 'Sorry, system didn\'t get response in ' + maxTimeout + ' seconds', 'Timeout exception.');
    }
}

function startTimeoutResponseProcess(response) {
    currTime = Date.now();
    timeoutResponseProcess = setTimeout(function() {
        checkTimeout(response);
    }, maxTimeout);
}


var server = http.createServer(
    function handleRequest(request, response) {
        var url = request.url;
        var urlTokens = url.split('/');
        startTimeoutResponseProcess(response);
        if( url.indexOf('/config') > -1 && urlTokens.length == 2 ) {
            var body = [];
            request.on('data', function(chunk) {
                body.push(chunk);
            }).on('end', function() {
                body = Buffer.concat(body).toString();
                try {
                    var jsonRequest = JSON.parse(body);
                    if(jsonRequest.deviceIdentifier) {
                        clearTimeout(timeoutResponseProcess);
                        deviceIdentifier = jsonRequest.deviceIdentifier;
                        devices = {};
                        noble.stopScanning();
                        noble.startScanning();
                        util.sendOkResponse(response, 'New config applied. Scanning restarted');
                    } else {
                        util.sendErrorResponse(response, 'No deviceIdentifier provided in json');
                    }
                } catch (error) {
                    util.sendErrorResponse(response, 'Error parsing request body to apply config', error);
                }
            });
        } else if( url.indexOf('/devices') > -1 && urlTokens.length == 2 ) {
            clearTimeout(timeoutResponseProcess);
            util.sendOkResponse(response, util.devicesToJSON(devices));
        } else if ( url.indexOf('/services') > -1 && urlTokens.length == 5 ) {
            var result = util.getDeviceByUrl(devices, url, urlTokens);
            if ( result.device ) {
                console.log('Getting services for device with id = ' +  result.device.id);
                checkDeviceStatus(result.device, response, function () {
                    discoverDeviceServices(result.device, response);
                });
            } else {
                clearTimeout(timeoutResponseProcess);
                util.sendNotFoundResponse(response, result.errorMsg);
            }
        } else if ( url.indexOf('/characteristics') > -1 && urlTokens.length == 7 ) {
            var result = util.getDeviceByUrl(devices, url, urlTokens);
            var serviceId = urlTokens[5];
            if ( result.device ) {
                checkDeviceStatus(result.device, response, function () {
                    discoverServiceCharacteristics(result.device, serviceId, response);
                });
            } else {
                clearTimeout(timeoutResponseProcess);
                util.sendNotFoundResponse(response, result.errorMsg);
            }
        } else if (url.indexOf('/characteristic') > -1 && urlTokens.length == 8) {
            var result = util.getDeviceByUrl(devices, url, urlTokens);
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            if ( result.device ) {
                if(request.method == 'POST') {
                    checkDeviceStatus(result.device, response, function () {
                        writeCharacteristic(result.device, serviceId, characteristicId, response, request);
                    });
                } else {
                    checkDeviceStatus(result.device, response, function () {
                        readCharacteristic(result.device, serviceId, characteristicId, response);
                    });
                }
            } else {
                clearTimeout(timeoutResponseProcess);
                util.sendNotFoundResponse(response, result.errorMsg);
            }
        } else if (url.indexOf('/descriptors') > -1 && urlTokens.length == 9) {
            var result = util.getDeviceByUrl(devices, url, urlTokens);
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            if ( result.device ) {
                checkDeviceStatus(result.device, response, function () {
                    discoverCharacteristicDescriptors(result.device, serviceId, characteristicId, response);
                });
            } else {
                clearTimeout(timeoutResponseProcess);
                util.sendNotFoundResponse(response, result.errorMsg);
            }
        } else if (url.indexOf('/descriptor') > -1 && urlTokens.length == 10) {
            var result = util.getDeviceByUrl(devices, url, urlTokens);
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            var descriptorId = urlTokens[9];
            if ( result.device ) {
                if(request.method == 'POST') {
                    checkDeviceStatus(result.device, response, function () {
                        writeDescriptor(result.device, serviceId, characteristicId, descriptorId, response, request);
                    });
                } else {
                    checkDeviceStatus(result.device, response, function () {
                        readDescriptor(result.device, serviceId, characteristicId, descriptorId, response);
                    });
                }
            } else {
                clearTimeout(timeoutResponseProcess);
                util.sendNotFoundResponse(response, result.errorMsg);
            }
        } else {
            clearTimeout(timeoutResponseProcess);
            response.writeHead(200, {'Content-Type' : 'application-json'});
            response.end('This url is not supported : ' + url);
        }
    }
).listen(PORT, function serverListening() {
    console.log('Server is listening to port : ' + PORT);
});