var noble = require('noble');
var utils = require('./utils');

const CHARACTERISTIC_NOT_FOUND_CODE = 'CHARACTERISTIC_NOT_FOUND';
const SERVICE_NOT_FOUND_CODE = 'SERVICE_NOT_FOUND';
const DESCRIPTOR_NOT_FOUND_CODE = 'DESCRIPTOR_NOT_FOUND';
const NOTIFY_BUFFER_URL_NOT_FOUND = 'NOTIFY_BUFFER_URL_NOT_FOUND';
const DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED';
const NO_DATA_PROVIDED = 'NO_DATA_PROVIDED';
const REQUEST_TIMEOUT_EXCEPTION = 'REQUEST_TIMEOUT_EXCEPTION';
const TIMEOUT_DATA = 'TIMEOUT_DATA';
const PROCESS_NAME = 'NOBLE UTILS';

const maxTimeout = 32 * 1000; // 32 sec
const defaultDeviceNotifyTimeout = 60 * 1000; // 60 sec

var LOG_NAME = PROCESS_NAME;

var currTime;
var notifyBuffer = {};

exports.DEVICE_NOT_FOUND_CODE = 'DEVICE_NOT_FOUND';
exports.BUFFER_URL = 'notify_buffer/';
exports.LOG_LEVEL = '' /*'DEBUG'*/;
exports.timeoutResponseProcess = null;
exports.blPoweredOn = false;

exports.init = function initializeNobleInstance(PARENT_PROCESS_NAME, scanWithDuplicates, onScanCb) {
    LOG_NAME = '[ ' + PARENT_PROCESS_NAME + ' / ' + PROCESS_NAME + ' ] : ';
    noble.on('stateChange', function(state) {
        if (state === 'poweredOn') {
            if (module.exports.LOG_LEVEL == 'DEBUG') {
                console.log(LOG_NAME + 'Bluetooth is powered On. Starting BLE scanning process.');
            }
            module.exports.blPoweredOn = true;
            noble.startScanning(null, scanWithDuplicates, function (error) {
                if (error) {
                    // always = true, doesn't give any specifics what's wrong
                    //console.error(PROCESS_NAME + 'There was an error starting BLE scan: ', error);
                } else {
                    if (module.exports.LOG_LEVEL == 'DEBUG') {
                        console.log(LOG_NAME + 'BLE scanning started successfully.');
                    }
                }
            });
        } else {
            if(module.exports.LOG_LEVEL == 'DEBUG') {
                console.log(LOG_NAME + 'Bluetooth adapter state changed to \'' + state + '\'');
            }
            console.error(LOG_NAME + 'Stopping BLE scanning.');
            noble.stopScanning();
        }
    });

    noble.on('scanStart', function () {
        if (module.exports.LOG_LEVEL == 'DEBUG') {
            console.log(LOG_NAME + 'BLE scan STARTED.');
        }
    });

    noble.on('stopStart', function () {
        if (module.exports.LOG_LEVEL == 'DEBUG') {
            console.log(LOG_NAME + 'BLE scan STOPPED.');
        }
    });

    noble.on('discover', function (peripheral) {
        if (module.exports.LOG_LEVEL == 'DEBUG') {
            console.log(LOG_NAME + 'Found device with \nlocal name: ' + peripheral.advertisement.localName + ' ; \naddress = ' + peripheral.address + ' ; \nmac-id = ' + peripheral.id + ' ; \nrssi = ' + peripheral.rssi);
        }
        if(onScanCb) {
            onScanCb(peripheral);
        }
    });
};

function connectToDevice(deviceItem, response, onConnectCallback) {
    if(module.exports.LOG_LEVEL == 'DEBUG') {
        console.log(LOG_NAME + 'Connecting to device with mac-id = ' +  deviceItem.device.id);
    }
    if( deviceItem ) {
        deviceItem.device.connect(function(error) {
            clearTimeout(module.exports.timeoutResponseProcess);
            deviceItem.disconnected = false;
            deviceItem.diconnectTimestamp = 0;
            deviceItem.reconnectAttemptsCount = 0;
            if (error) {
                utils.sendErrorResponse(response, 'Error connecting to device mac-id = ' + deviceItem.device.id, error);
                deviceItem.device.disconnect();
            } else {
                if( module.exports.LOG_LEVEL == 'DEBUG') {
                    console.log(LOG_NAME + 'Successfully connected to device with mac-id = ' + deviceItem.device.id);
                }
                if(onConnectCallback) {
                    module.exports.startTimeoutResponseProcess(response);
                    onConnectCallback();
                }
            }
        });
        deviceItem.device.on('disconnect', function() {
            clearTimeout(module.exports.timeoutResponseProcess);
            deviceItem.disconnected = true;
            deviceItem.diconnectTimestamp = Date.now();
            utils.sendErrorResponse(response, 'Device with mac-id = ' + deviceItem.device.id + ' disconnected. ', DEVICE_DISCONNECTED);
            for (var key in notifyBuffer) {
                if(notifyBuffer[key].deviceId == deviceItem.device.id) {
                    deviceItem.disconnected = true;
                    deviceItem.diconnectTimestamp = 0;
                    deviceItem.reconnectAttemptsCount++;
                    notifyBuffer[key].closed = true;
                    if(deviceItem.reconnectAttemptsCount <= deviceItem.deviceReconnectAttempts) {
                        setTimeout( function reconnect() {
                            deviceItem.device.connect( function(error) {
                                clearTimeout(module.exports.timeoutResponseProcess);
                                if (error) {
                                    utils.sendErrorResponse(response, 'Error connecting to Device.Re-Connecting to device mac-id = ' + deviceItem.device.id, error);
                                    deviceItem.device.disconnect();
                                } else {
                                    deviceItem.disconnected = false;
                                    notifyBuffer[key].closed = true;
                                    if( module.exports.LOG_LEVEL == 'DEBUG') {
                                        console.log(LOG_NAME + 'Successfully re-connected to device with mac-id = ' + deviceItem.device.id);
                                    }
                                    module.exports.startTimeoutResponseProcess(response);
                                    module.exports.notify.call(this, notifyBuffer[key].notify_arguments[0], notifyBuffer[key].notify_arguments[1], notifyBuffer[key].notify_arguments[2], notifyBuffer[key].notify_arguments[3], notifyBuffer[key].notify_arguments[4], notifyBuffer[key].notify_arguments[5], key);
                                }
                            });
                        }, deviceItem.deviceReconnectTimeout);
                    }
                    break;
                }
            }
        });
    } else {
        clearTimeout(module.exports.timeoutResponseProcess);
        utils.sendNotFoundResponse(response, 'Device not found in memory.', module.exports.DEVICE_NOT_FOUND_CODE);
    }
}

exports.checkDeviceStatusAndConnect = function checkDeviceStatusAndConnect(deviceItem, response, mainCallback) {
    if(deviceItem) {
        if( deviceItem.device.state == 'connected' ) {
            if( module.exports.LOG_LEVEL == 'DEBUG') {
                console.log(LOG_NAME + 'Device mac-id = ' + deviceItem.device.id +  ' is already connected');
            }
            mainCallback();
        } else {
            connectToDevice(deviceItem, response, function afterConnectCallback() {
                mainCallback();
            });
        }
    } else {
        clearTimeout(module.exports.timeoutResponseProcess);
        utils.sendNotFoundResponse(response, 'Device with mac-id ' + deviceItem.device.id + ' not found in memory.', module.exports.DEVICE_NOT_FOUND_CODE);
    }
};

exports.discoverDeviceServices = function discoverDeviceServices(deviceItem, response, callback) {
    if(module.exports.LOG_LEVEL == 'DEBUG') {
        console.log(LOG_NAME + 'Discovering services for device with mac-id = ' +  deviceItem.device.id);
    }
    deviceItem.device.discoverServices(null, function(error, services) {
        clearTimeout(module.exports.timeoutResponseProcess);
        if (error) {
            utils.sendErrorResponse(response, 'Error discovering services for device with mac-id = ' + deviceItem.device.id, error);
        } else {
            if(module.exports.LOG_LEVEL == 'DEBUG') {
                console.log(LOG_NAME + 'Successfully discovered services for device with mac-id = ' + deviceItem.device.id);
            }
            if(callback) {
                module.exports.startTimeoutResponseProcess(response);
                callback(services);
            } else {
                utils.sendOkResponse(response, utils.servicesToJSON(services));
            }
        }
    });
};

exports.discoverServiceCharacteristics = function discoverServiceCharacteristics(deviceItem, serviceId, response, callback) {
    if(module.exports.LOG_LEVEL == 'DEBUG') {
        console.log(LOG_NAME + 'Discovering service characteristics for device with mac-id = ' +  deviceItem.device.id);
    }
    module.exports.discoverDeviceServices(deviceItem, response, function characteristicsCallback(services){
        var foundService = false;
        for (var i in services) {
            if(serviceId == services[i].uuid) {
                foundService = true;
                var service = services[i];
                service.discoverCharacteristics(null, function (error, characteristics) {
                    clearTimeout(module.exports.timeoutResponseProcess);
                    if(error) {
                        utils.sendErrorResponse(response, 'Error discovering characteristics for service with uuid = ' + service.uuid, error);
                    } else {
                        if(module.exports.LOG_LEVEL == 'DEBUG') {
                            console.log(LOG_NAME + 'Successfully discovered characteristics for service with uuid = ' + service.uuid);
                        }
                        if(callback) {
                            module.exports.startTimeoutResponseProcess(response);
                            callback(characteristics);
                        } else {
                            utils.sendOkResponse(response, utils.characteristicsToJSON(characteristics));
                        }
                    }
                });
                break;
            }
        }
        if (!foundService) {
            clearTimeout(module.exports.timeoutResponseProcess);
            utils.sendNotFoundResponse(response, 'Service with uuid = ' + serviceId + ' not found.', SERVICE_NOT_FOUND_CODE);
        }
    });
};

function characteristicEvent(deviceItem, serviceId, characteristicId, response, callback) {
    module.exports.discoverServiceCharacteristics(deviceItem, serviceId, response, function characteristicEventCallback(characteristics){
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
            clearTimeout(module.exports.timeoutResponseProcess);
            utils.sendNotFoundResponse(response, 'Characteristic with uuid = ' + characteristicId + ' not found.', CHARACTERISTIC_NOT_FOUND_CODE);
        }
    });
}

exports.readCharacteristic = function readCharacteristic(deviceItem, serviceId, characteristicId, response) {
    characteristicEvent(deviceItem, serviceId, characteristicId, response, function readCharacteristicCallback(characteristic) {
        characteristic.read( function(error, data) {
            clearTimeout(module.exports.timeoutResponseProcess);
            if(error) {
                utils.sendErrorResponse(response, 'Error reading data from characteristic with uuid = ' + characteristic.uuid, error);
            } else {
                if(module.exports.LOG_LEVEL == 'DEBUG') {
                    console.log(LOG_NAME + 'Successfully reading data from characteristic with uuid = ' + characteristic.uuid + ' ; HEX data = ' + data.toString('hex'));
                }
                try {
                    utils.sendOkResponse(response, { 'data' : data.toString('base64')});
                } catch (error) {
                    utils.sendErrorResponse(response, 'Error transforming data to base64 of characteristic with uuid = ' + characteristic.uuid, error);
                }
            }
        });
    });
};

exports.writeCharacteristic = function writeCharacteristic(deviceItem, serviceId, characteristicId, response, request) {
    characteristicEvent(deviceItem, serviceId, characteristicId, response, function writeCharacteristicCallback(characteristic) {
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
                        clearTimeout(module.exports.timeoutResponseProcess);
                        if(error) {
                            utils.sendErrorResponse(response, 'Error writing data to characteristic with uuid = ' + characteristic.uuid, error);
                        } else {
                            if(module.exports.LOG_LEVEL == 'DEBUG') {
                                console.log(LOG_NAME + 'Successfully writing data to characteristic with uuid = ' + characteristic.uuid);
                            }
                            utils.sendOkResponse(response, 'Success writing data to characteristic with uuid = ' + characteristic.uuid);
                        }
                    });
                } else {
                    clearTimeout(module.exports.timeoutResponseProcess);
                    utils.sendErrorResponse(response, 'Error writing data to characteristic with uuid = ' + characteristic.uuid, NO_DATA_PROVIDED);
                }
            } catch (error) {
                clearTimeout(module.exports.timeoutResponseProcess);
                utils.sendErrorResponse(response, 'Error parsing request body to write data to characteristic with uuid = ' + characteristic.uuid, error);
            }
        });
    });
};

exports.notify = function notify(deviceItem, serviceId, characteristicId, response, notify_flag, notify_device_timeout, reconnect) {
    var notify_args = arguments;
    characteristicEvent(deviceItem, serviceId, characteristicId, response, function writeCharacteristicCallback(characteristic) {
        characteristic.notify(notify_flag, function(error) {
            deviceItem.reconnectAttemptsCount = 0;
            clearTimeout(module.exports.timeoutResponseProcess);
            if(error) {
                utils.sendErrorResponse(response, 'Error turning ON notification for characteristic uuid = ' + characteristic.uuid, error);
            } else {
                if( module.exports.LOG_LEVEL == 'DEBUG') {
                    console.log('Successfully turned ON notification for characteristic uuid = ' + characteristic.uuid);
                }
                var id , notifyBufferObject = {};
                if(!reconnect) {
                    id = 'BUFFER_' + utils.generateID(7); // TODO: decide what size do we need for this ID

                    var responseJson = {'message' : 'Notification is turned ON for characteristic uuid = ' + characteristic.uuid,
                        'url': module.exports.BUFFER_URL + id};
                    utils.sendOkResponse(response, responseJson);

                    var notifyDeviceTimeout = defaultDeviceNotifyTimeout;
                    if (notify_device_timeout) {
                        notifyDeviceTimeout = notify_device_timeout;
                    }

                    notifyBufferObject = {
                        data: [],
                        timeout: notifyDeviceTimeout
                    };
                } else {
                    id = reconnect;
                    notifyBufferObject = notifyBuffer[id];
                }

                notifyBufferObject.timestamp = Date.now();
                notifyBufferObject.deviceId = deviceItem.device.id;
                notifyBufferObject.characteristic = characteristic;
                notifyBufferObject.closed = false;
                notifyBufferObject.notify_arguments = notify_args;

                notifyBuffer[id] = notifyBufferObject;

                characteristic.on('data', function(data, isNotification) { // read or data event
                    //console.log('got data from notify : ' + data.toString('hex'));
                    var notifyBufferCurrentObject = notifyBuffer[id];
                    notifyBufferCurrentObject.data.push(data.toString('base64'));
                    notifyBufferCurrentObject.timestamp = Date.now();
                    notifyBuffer[id] = notifyBufferCurrentObject;
                });
            }
        });
    });
};

/*exports.clearNotifyBuffer = function clearNotifyBuffer(bufferId) {
    if( bufferId in notifyBuffer) {
        var responseJson = notifyBuffer[bufferId].data;
        notifyBuffer[bufferId].data = [];
        if(module.exports.LOG_LEVEL == 'DEBUG') {
            console.log(PROCESS_NAME + ' --- notify data buffer emptied --- ');
        }
        notifyBuffer[bufferId].timestamp = Date.now();
        if(notifyBuffer[bufferId].closed) {
            delete notifyBuffer[bufferId];
        }
        return responseJson;
    } else {
        return null;
    }
};*/

exports.discoverCharacteristicDescriptors = function discoverCharacteristicDescriptors(deviceItem, serviceId, characteristicId, response, callback) {
    if(module.exports.LOG_LEVEL == 'DEBUG') {
        console.log(LOG_NAME + 'Discovering characteristic\'s descriptors for device with mac-id = ' +  deviceItem.device.id);
    }
    module.exports.discoverServiceCharacteristics(deviceItem, serviceId, response, function descriptorsCallback(characteristics) {
        var foundCharacteristic = false;
        for (var i in characteristics) {
            if(characteristicId == characteristics[i].uuid) {
                foundCharacteristic = true;
                var characteristic = characteristics[i];
                characteristic.discoverDescriptors(function (error, descriptors) {
                    clearTimeout(module.exports.timeoutResponseProcess);
                    if(error) {
                        utils.sendErrorResponse(response, 'Error discovering descriptors for characteristic with uuid = ' + characteristic.uuid, error);
                    } else {
                        if(module.exports.LOG_LEVEL == 'DEBUG') {
                            console.log(LOG_NAME + 'Successfully discovered descriptors for characteristic with uuid = ' + characteristic.uuid);
                        }
                        if(callback) {
                            module.exports.startTimeoutResponseProcess(response);
                            callback(descriptors);
                        } else {
                            utils.sendOkResponse(response, utils.descriptorsToJSON(descriptors));
                        }
                    }
                });
                break;
            }
        }
        if (!foundCharacteristic) {
            clearTimeout(module.exports.timeoutResponseProcess);
            utils.sendNotFoundResponse(response, 'Characteristic with uuid = ' + characteristicId + ' not found.', CHARACTERISTIC_NOT_FOUND_CODE);
        }
    });
};

exports.readDescriptor = function readDescriptor(deviceItem, serviceId, characteristicId, descriptorId, response) {
    descriptorEvent(deviceItem, serviceId, characteristicId, descriptorId, response, function readDescriptorCallback(descriptor) {
        descriptor.readValue(function(error, data) {
            clearTimeout(module.exports.timeoutResponseProcess);
            if(error) {
                utils.sendErrorResponse(response, 'Error reading data from descriptor with uuid = ' + descriptor.uuid, error);
            } else {
                if(module.exports.LOG_LEVEL == 'DEBUG') {
                    console.log(LOG_NAME + 'Successfully reading data from descriptor with uuid = ' + descriptor.uuid + '; HEX data = ' + data.toString('hex'));
                }
                try {
                    utils.sendResponse(response, 200, { 'data' : data.toString('base64')});
                } catch (error) {
                    utils.sendErrorResponse(response, 'Error transforming data of descriptor with uuid to base64 format = ' + descriptor.uuid, error);
                }
            }
        });
    });
};


exports.writeDescriptor = function writeDescriptor(deviceItem, serviceId, characteristicId, descriptorId, response, request) {
    descriptorEvent(deviceItem, serviceId, characteristicId, descriptorId, response, function writeDescriptorCallback(descriptor) {
        var body = [];
        request.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            try {
                var jsonRequest = JSON.parse(body);
                if(jsonRequest.data) {
                    descriptor.writeValue(new Buffer(jsonRequest.data, 'base64'), function(error) {
                        clearTimeout(module.exports.timeoutResponseProcess);
                        if(error) {
                            utils.sendErrorResponse(response, 'Error writing data to descriptor with uuid = ' + descriptor.uuid, error);
                        } else {
                            if(module.exports.LOG_LEVEL == 'DEBUG') {
                                console.log(LOG_NAME + 'Successfully wrote data to descriptor with uuid = ' + descriptor.uuid);
                            }
                            utils.sendOkResponse(response, 'Successfully wrote data to descriptor with uuid = ' + descriptor.uuid);
                        }
                    });
                } else {
                    clearTimeout(module.exports.timeoutResponseProcess);
                    utils.sendErrorResponse(response, 'Error writing data to descriptor with uuid = ' + descriptor.uuid, NO_DATA_PROVIDED);
                }
            } catch (error) {
                clearTimeout(module.exports.timeoutResponseProcess);
                utils.sendErrorResponse(response, 'Error parsing request body to write data to descriptor with uuid = ' + descriptor.uuid, error);
            }
        });
    });
};

function descriptorEvent(deviceItem, serviceId, characteristicId, descriptorId, response, callback) {
    module.exports.discoverCharacteristicDescriptors(deviceItem, serviceId, characteristicId, response, function descriptorEventCallback(descriptors){
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
            clearTimeout(module.exports.timeoutResponseProcess);
            utils.sendNotFoundResponse(response, 'Descriptor with uuid = ' + descriptorId + ' not found.', DESCRIPTOR_NOT_FOUND_CODE);
        }
    });
}

exports.restartScanning = function restartScanning(){
    noble.stopScanning();
    noble.startScanning();
};

function checkTimeout(response) {
    var time = Date.now();
    if(time - currTime >= maxTimeout) {
        utils.sendErrorResponse(response, 'Sorry, system didn\'t get response in ' + maxTimeout + ' seconds', REQUEST_TIMEOUT_EXCEPTION);
    }
}

exports.startTimeoutResponseProcess = function startTimeoutResponseProcess(response) {
    currTime = Date.now();
    module.exports.timeoutResponseProcess = setTimeout(function() {
        checkTimeout(response);
    }, maxTimeout);
};

exports.getNotifyBufferData = function getNotifyBufferData(response, bufferId) {
    if( bufferId in notifyBuffer) {
        var responseMessage = {};
        if(notifyBuffer[bufferId].closed) {
            responseMessage.data = notifyBuffer[bufferId].data;
            responseMessage.device_disconnected = true;
            delete notifyBuffer[bufferId];
        } else {
            if(notifyBuffer[bufferId].data.length > 0) { // if data is not empty we update timestamp
                notifyBuffer[bufferId].timestamp = Date.now();
                responseMessage.data = notifyBuffer[bufferId].data;
                notifyBuffer[bufferId].data = [];
            } else if ( Date.now() - notifyBuffer[bufferId].timestamp > notifyBuffer[bufferId].timeout ) {
                // if we have empty for specified timeout: didn't get anything on notify, we discharge url
                utils.sendErrorResponse(response, 'RESTBlue didn\'t receive any data on notify from device with id = ' + notifyBuffer[bufferId].deviceId + ' for specified timeout = ' + notifyBuffer[bufferId].timeout + '. Discharging notify buffer url.', TIMEOUT_DATA);
                var characteristic = notifyBuffer[bufferId].characteristic;
                notifyBuffer[bufferId].characteristic.notify(false, function(error) {
                    if(error) {
                        utils.sendErrorResponse(response, 'Error turning OFF notification for characteristic uuid = ' + characteristic.uuid, error);
                    } else {
                        if( module.exports.LOG_LEVEL == 'DEBUG') {
                            console.log(LOG_NAME + 'Successfully turned OFF notification for characteristic uuid = ' + characteristic.uuid);
                        }
                    }
                });
                delete notifyBuffer[bufferId];
            }
        }
        utils.sendOkResponse(response, responseMessage);
    } else {
        utils.sendNotFoundResponse(response, 'There\'s no such notify buffer ID. Try reconnecting a-new to device to get new notify buffer url.', NOTIFY_BUFFER_URL_NOT_FOUND);
    }
};