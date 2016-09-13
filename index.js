console.log('STARTED container.');

var noble = require('noble');
var http = require('http');
var url = require('url');

var util = require('./util');

const PORT = 10500;
const maxTimeout = 32 * 1000; // 32 sec

var timeoutResponseProcess;
var currTime;
var devices = {};
var deviceIdentifier = null;
var deviceScanId ;
var deviceScanCallback ;

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
    if(deviceScanId && deviceScanCallback) {
        if (deviceScanId == peripheral.uuid) {
            deviceScanCallback(peripheral);
            deviceScanId = null;
            deviceScanCallback = null;
        }
    }
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
});

function connectToDevice(device, response, onConnectCallback) {
    console.log('Connecting to device with id = ' +  device.id);
    if(device) {
        device.connect(function(error) {
            clearTimeout(timeoutResponseProcess);
            if (error) {
                util.sendErrorResponse(response, ' Connect to device id = ' + device.id, error);
                device.disconnect();
            } else {
                console.log('connected to device with id = ' + device.id);
                if(onConnectCallback) {
                    startTimeoutResponseProcess(response);
                    onConnectCallback();
                }
            }
        });
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
                    util.sendResponse(response, 200, JSON.stringify({ 'data' : data.toString('base64')}));
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
                    characteristic.write(new Buffer(jsonRequest.data, 'base64'), withResponse, function(error) {
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
                    util.sendResponse(response, 200, JSON.stringify({ 'data' : data.toString('base64')}));
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
                    descriptor.writeValue(new Buffer(jsonRequest.data, 'base64'), function(error) {
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

function restartScanning(){
    devices = {};
    noble.stopScanning();
    noble.startScanning();
}

function executeMainAction(response, requestUrl, urlTokens, callbackAction) {
    var urlParams = urlTokens[urlTokens.length - 1 ].split('?');
    var result = util.getDeviceByUrl(devices, requestUrl, urlTokens);
    var scan = false;
    if (urlParams.length >= 2) {
        if(url.parse(requestUrl, true).query.scan == 'true') {
            scan = true;
            deviceScanCallback = function(device) {
                if (device) {
                    checkDeviceStatus(device, response, function() {
                        callbackAction(device);
                    });
                } else {
                    util.sendNotFoundResponse(response, 'Device with uuid = ' + device.uuid + ' not found during new scanning');
                }
            };
        }
    }
    if ( result.device ) {
        if(scan) {
            deviceScanId = result.device.uuid;
            restartScanning();
        } else {
            console.log('Getting services for device with id = ' + result.device.id);
            checkDeviceStatus(result.device, response, function() {
                callbackAction(result.device)
            });
        }
    } else {
        if (scan && urlTokens[2] == 'mac') {
            deviceScanId = urlTokens[3];
            restartScanning();
        } else {
            clearTimeout(timeoutResponseProcess);
            util.sendNotFoundResponse(response, result.errorMsg);
        }
    }
}

var server = http.createServer(
    function handleRequest(request, response) {
        var requestUrl = request.url;
        var urlTokens = requestUrl.split('/');
        startTimeoutResponseProcess(response);
        if( requestUrl.indexOf('/config') > -1 && urlTokens.length == 2 ) {
            clearTimeout(timeoutResponseProcess);
            var body = [];
            request.on('data', function(chunk) {
                body.push(chunk);
            }).on('end', function() {
                body = Buffer.concat(body).toString();
                try {
                    var jsonRequest = JSON.parse(body);
                    if(jsonRequest.deviceIdentifier) {
                        deviceIdentifier = jsonRequest.deviceIdentifier;
                        restartScanning();
                        util.sendOkResponse(response, 'New config applied. Scanning restarted');
                    } else {
                        util.sendErrorResponse(response, 'No deviceIdentifier provided in json');
                    }
                } catch (error) {
                    util.sendErrorResponse(response, 'Error parsing request body to apply config', error);
                }
            });
        } else if (requestUrl.indexOf('/scan/restart') > -1 && urlTokens.length == 3) {
            restartScanning();
            util.sendOkResponse(response, 'Scanning restarted');
        } else if( requestUrl.indexOf('/devices') > -1 && urlTokens.length == 2 ) {
            clearTimeout(timeoutResponseProcess);
            util.sendOkResponse(response, util.devicesToJSON(devices));
        } else if ( requestUrl.indexOf('/services') > -1 && urlTokens.length == 5 ) {
            executeMainAction(response, requestUrl, urlTokens, function(device) {
                discoverDeviceServices(device, response);
            });
        } else if ( requestUrl.indexOf('/characteristics') > -1 && urlTokens.length == 7 ) {
            var serviceId = urlTokens[5];
            executeMainAction(response, requestUrl, urlTokens, function(device) {
                discoverServiceCharacteristics(device, serviceId, response);
            });
        } else if (requestUrl.indexOf('/characteristic') > -1 && urlTokens.length == 8) {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            if(request.method == 'POST') {
                executeMainAction(response, requestUrl, urlTokens, function(device) {
                    writeCharacteristic(device, serviceId, characteristicId, response, request);
                });
            } else {
                executeMainAction(response, requestUrl, urlTokens, function (device) {
                    readCharacteristic(device, serviceId, characteristicId, response);
                });
            }
        } else if (requestUrl.indexOf('/descriptors') > -1 && urlTokens.length == 9) {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            executeMainAction(response, requestUrl, urlTokens, function(device) {
                discoverCharacteristicDescriptors(device, serviceId, characteristicId, response);
            });
        } else if (requestUrl.indexOf('/descriptor') > -1 && urlTokens.length == 10) {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            var descriptorId = urlTokens[9];
            if(request.method == 'GET') {
                executeMainAction(response, requestUrl, urlTokens, function(device) {
                    readDescriptor(device, serviceId, characteristicId, descriptorId, response);
                });
            } /*else {
                executeMainAction(response, requestUrl, urlTokens, function(device) {
                    writeDescriptor(device, serviceId, characteristicId, descriptorId, response, request);
                });
            }*/
        } else {
            clearTimeout(timeoutResponseProcess);
            response.writeHead(200, {'Content-Type' : 'application-json'});
            response.end(JSON.stringify('This requestUrl is not supported : ' + requestUrl));
        }
    }
).listen(PORT, function serverListening() {
    console.log('Server is listening to port : ' + PORT);
});