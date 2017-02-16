var noble = require('noble');
var http = require('http');
var url = require('url');

var util = require('./util');

const PORT = 10500;
const maxTimeout = 32 * 1000; // 32 sec
const BUFFER_URL = 'notify_buffer/';

var LOG_LEVEL/* = 'DEBUG'*/;
var timeoutResponseProcess;
var currTime;
var devices = {};
var deviceIdentifier = null;
var deviceScanId ;
var deviceScanCallback ;
var notifyBuffer = {};
var blPoweredOn = false;

noble.on('stateChange', function(state) {
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Bluetooth adapter state changed to ');
    }
    if (state === 'poweredOn') {
        if( LOG_LEVEL == 'DEBUG') {
            console.log('powerOn');
        }
        blPoweredOn = true;
        noble.startScanning(null, false, function(error){
            if(error) {
                // console.error('There was an error with starting the scan: ', error);
            } else {
                if( LOG_LEVEL == 'DEBUG') {
                    console.log('Scanning started successfully.');
                }
            }
        });
    } else {
        blPoweredOn = false;
        if( LOG_LEVEL == 'DEBUG') {
            console.log(state);
        }
        noble.stopScanning();
    }
});

noble.on('scanStart', function() {
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Scanning STARTED.');
    }
});
noble.on('stopStart', function() {
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Scanning STOPPED.');
    }
});

noble.on('discover', function(peripheral) {
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Found device with local name: ' + peripheral.advertisement.localName + ' ; address = ' + peripheral.address + ' ; mac-id = ' + peripheral.id);
    }
    if(deviceScanId && deviceScanCallback) {
        if (deviceScanId == peripheral.id) {
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
        generatedID = util.generateID(10);
    }
    devices[generatedID] = peripheral;
});

function connectToDevice(device, response, onConnectCallback) {
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Connecting to device with mac-id = ' +  device.id);
    }
    if( device ) {
        device.connect(function(error) {
            clearTimeout(timeoutResponseProcess);
            if (error) {
                util.sendErrorResponse(response, ' Connect to device mac-id = ' + device.id, error);
                device.disconnect();
            } else {
                if( LOG_LEVEL == 'DEBUG') {
                    console.log('SUCCESS: Connected to device with mac-id = ' + device.id);
                }
                if(onConnectCallback) {
                    startTimeoutResponseProcess(response);
                    onConnectCallback();
                }
            }
        });
        device.on('disconnect', function() {
            clearTimeout(timeoutResponseProcess);
            util.sendErrorResponse(response, 'Device with mac-id = ' + device.id + ' disconnected. ');
            for (var key in notifyBuffer) {
                if(notifyBuffer[key].deviceId == device.id) {
                    notifyBuffer[key].closed = true;
                    break;
                }
            }
        });
    } else {
        clearTimeout(timeoutResponseProcess);
        util.sendNotFoundResponse(response, 'Device not found in memory.');
    }
}

function checkDeviceStatus(device, response, mainCallback) {
    if(device) {
        if( device.state == 'connected' ) {
            if( LOG_LEVEL == 'DEBUG') {
                console.log('Device mac-id = ' + device.id +  ' is already connected');
            }
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
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Discovering services for device with mac-id = ' +  device.id);
    }
    device.discoverServices(null, function(error, services) {
        clearTimeout(timeoutResponseProcess);
        if (error) {
            util.sendErrorResponse(response, 'Discover services for device mac-id = ' + device.id, error);
        } else {
            if( LOG_LEVEL == 'DEBUG') {
                console.log('SUCCESS: Discovered services for device mac-id = ' + device.id);
            }
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
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Discovering service characteristics for device with mac-id = ' +  device.id);
    }
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
                        if( LOG_LEVEL == 'DEBUG') {
                            console.log('SUCCESS: Discovered characteristics for service uuid = ' + service.uuid);
                        }
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
            util.sendNotFoundResponse(response, 'Characteristic with uuid = ' + characteristicId + ' not found.');
        }
    });
}

function readCharacteristic(device, serviceId, characteristicId, response) {
    characteristicEvent(device, serviceId, characteristicId, response, function readCharacteristicCallback(characteristic) {
        characteristic.read( function(error, data) {
            clearTimeout(timeoutResponseProcess);
            if(error) {
                util.sendErrorResponse(response, 'Error reading data from characteristic uuid = ' + characteristic.uuid, error);
            } else {
                if( LOG_LEVEL == 'DEBUG') {
                    console.log('SUCCESS: reading data from characteristic uuid = ' + characteristic.uuid + ' ; HEX data = ' + data.toString('hex'));
                }
                try {
                    util.sendResponse(response, 200, JSON.stringify({ 'data' : data.toString('base64')}));
                } catch (error) {
                    util.sendErrorResponse(response, 'Error transforming data to base64 of characteristic with uuid = ' + characteristic.uuid, error);
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
                            util.sendErrorResponse(response, 'Error writing data to characteristic uuid = ' + characteristic.uuid, error);
                        } else {
                            if( LOG_LEVEL == 'DEBUG') {
                                console.log('SUCCESS: Writing data to characteristic uuid = ' + characteristic.uuid);
                            }
                            util.sendOkResponse(response, 'Success writing data to characteristic uuid = ' + characteristic.uuid);
                        }
                    });
                } else {
                    clearTimeout(timeoutResponseProcess);
                    util.sendErrorResponse(response, 'Error writing data to characteristic uuid = ' + characteristic.uuid, 'No data provided.');
                }
            } catch (error) {
                clearTimeout(timeoutResponseProcess);
                util.sendErrorResponse(response, 'Error parsing request body to write to characteristic with uuid = ' + characteristic.uuid, error);
            }
        });
    });
}

function notify(device, serviceId, characteristicId, response, notify_flag) {
    characteristicEvent(device, serviceId, characteristicId, response, function writeCharacteristicCallback(characteristic) {
        characteristic.notify(notify_flag, function(error) {
            clearTimeout(timeoutResponseProcess);
            if(error) {
                util.sendErrorResponse(response, 'Error turning ON notification for characteristic uuid = ' + characteristic.uuid, error);
            } else {
                if( LOG_LEVEL == 'DEBUG') {
                    console.log('SUCCESS: Notification is turned ON for characteristic uuid = ' + characteristic.uuid);
                }
                var id = 'BUFFER_' + util.generateID(7); // TODO: decide what size do we need for this ID
                var responseJson = {'message' : 'Notification is turned ON for characteristic uuid = ' + characteristic.uuid,
                    'url': BUFFER_URL + id};
                util.sendOkResponse(response, responseJson);
                notifyBuffer[id] = { timestamp: Date.now(), deviceId: device.id, data: []};
                characteristic.on('read', function(data, isNotification) {
                    notifyBuffer[id].data.push(data.toString('base64'));
                });
            }
        });
    });
}

function discoverCharacteristicDescriptors(device, serviceId, characteristicId, response, callback) {
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Discovering characteristic descriptors for device with mac-id = ' +  device.id);
    }
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
                        if( LOG_LEVEL == 'DEBUG') {
                            console.log('SUCCESS: Discovered descriptors for characteristic uuid = ' + characteristic.uuid);
                        }
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
                util.sendErrorResponse(response, 'Error reading data from descriptor uuid = ' + descriptor.uuid, error);
            } else {
                if( LOG_LEVEL == 'DEBUG') {
                    console.log('SUCCESS: Reading data from descriptor uuid = ' + descriptor.uuid + '; HEX data = ' + data.toString('hex'));
                }
                try {
                    util.sendResponse(response, 200, JSON.stringify({ 'data' : data.toString('base64')}));
                } catch (error) {
                    util.sendErrorResponse(response, 'Error transforming data to base64 of descriptor with uuid = ' + descriptor.uuid, error);
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
                            util.sendErrorResponse(response, 'Error writing data to descriptor uuid = ' + descriptor.uuid, error);
                        } else {
                            if( LOG_LEVEL == 'DEBUG') {
                                console.log('SUCCESS: Writing data to descriptor uuid = ' + descriptor.uuid);
                            }
                            util.sendOkResponse(response, 'Success writing data to descriptor uuid = ' + descriptor.uuid);
                        }
                    });
                } else {
                    clearTimeout(timeoutResponseProcess);
                    util.sendErrorResponse(response, 'Error writing data to descriptor uuid = ' + descriptor.uuid, 'No data provided.');
                }
            } catch (error) {
                clearTimeout(timeoutResponseProcess);
                util.sendErrorResponse(response, 'Error parsing request body to write to descriptor with uuid = ' + descriptor.uuid, error);
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
            util.sendNotFoundResponse(response, 'Descriptor with uuid = ' + descriptorId + ' not found.');
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
                    util.sendNotFoundResponse(response, 'Device with id = ' + device.id + ' not found during new scanning');
                }
            };
        }
    }
    if ( result.device ) {
        if(scan) {
            deviceScanId = result.device.id;
            restartScanning();
        } else {
            if( LOG_LEVEL == 'DEBUG') {
                console.log('Getting services for device with mac-id = ' + result.device.id);
            }
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

function processPostRequest(request, response, processCallback) {
    var body = [];
    request.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        body = Buffer.concat(body).toString();
        try {
            var jsonRequestBody = JSON.parse(body);
            if(processCallback) {
                processCallback(jsonRequestBody);
            }
        } catch (error) {
            util.sendErrorResponse(response, 'Error parsing request body', error);
        }
    });
}

var server = http.createServer(
    function handleRequest(request, response) {
        var requestUrl = request.url;
        var urlTokens = requestUrl.split('/');
        startTimeoutResponseProcess(response);
        if( requestUrl.indexOf('/config/scan') > -1 && urlTokens.length == 3 ) {
            clearTimeout(timeoutResponseProcess);
            processPostRequest(request, response, function(jsonRequestBody) {
                if(jsonRequestBody.deviceIdentifier) {
                    deviceIdentifier = jsonRequestBody.deviceIdentifier;
                    restartScanning();
                    util.sendOkResponse(response, 'New config applied. Scanning restarted');
                } else {
                    util.sendErrorResponse(response, 'No deviceIdentifier provided in json');
                }
            });
        } else if ( requestUrl.indexOf('/config/logging') > -1 && urlTokens.length == 3 && request.method == 'POST' ) {
            clearTimeout(timeoutResponseProcess);
            processPostRequest(request, response, function(jsonRequestBody) {
                if(jsonRequestBody.LOG_LEVEL) {
                    LOG_LEVEL = jsonRequestBody.LOG_LEVEL;
                    util.sendOkResponse(response, 'LOG_LEVEL = ' + LOG_LEVEL + ' is applied');
                } else {
                    util.sendErrorResponse(response, 'No LOG_LEVEL provided in json');
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
        } else if (requestUrl.indexOf('/characteristic') > -1 && requestUrl.indexOf('/notify') > -1 && urlTokens.length == 9) {
            // TODO: Do we need 2 options: turn ON/OFF notify ?
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            executeMainAction(response, requestUrl, urlTokens, function(device) {
                notify(device, serviceId, characteristicId, response, true);
            });
        } else if (requestUrl.indexOf('/descriptors') > -1 && urlTokens.length == 9) {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            executeMainAction(response, requestUrl, urlTokens, function(device) {
                discoverCharacteristicDescriptors(device, serviceId, characteristicId, response);
            });
        } else if (requestUrl.indexOf('/descriptor') > -1 && urlTokens.length == 10 && request.method == 'GET') {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            var descriptorId = urlTokens[9];
            /*if(request.method == 'GET') {*/
                executeMainAction(response, requestUrl, urlTokens, function(device) {
                    readDescriptor(device, serviceId, characteristicId, descriptorId, response);
                });
            /*} else {
                executeMainAction(response, requestUrl, urlTokens, function(device) {
                    writeDescriptor(device, serviceId, characteristicId, descriptorId, response, request);
                });
            }*/
        } else if (requestUrl.indexOf(BUFFER_URL) > -1 && urlTokens.length == 3) {
            var bufferId = urlTokens[2];
            if( bufferId in notifyBuffer) {
                var responseJson = notifyBuffer[bufferId].data;
                notifyBuffer[bufferId].data = [];
                notifyBuffer[bufferId].timestamp = Date.now();
                util.sendOkResponse(response, responseJson);
                if(notifyBuffer[bufferId].closed) {
                    delete notifyBuffer[bufferId];
                }
            } else {
                util.sendNotFoundResponse(response, 'There\'s no such notify buffer ID. Try reconnecting a-new to device to get new notify buffer url.');
            }
        } if (requestUrl.indexOf('/status') > -1) {
            util.sendOkResponse(response, { bluetooth_adapter_powered_on: blPoweredOn});
        } else {
            clearTimeout(timeoutResponseProcess);
            response.writeHead(200, {'Content-Type' : 'application-json'});
            response.end(JSON.stringify('This requestUrl is not supported : ' + requestUrl));
        }
    }
).listen(PORT, function serverListening() {
    if( LOG_LEVEL == 'DEBUG') {
        console.log('Server is listening to port : ' + PORT);
    }
});