var noble = require('noble');
var http = require('http');
var url = require('url');

var utils = require('./utils');
var noble_utils = require('./noble_utils');

const IDENTIFIER_MISSING = 'IDENTIFIER_MISSING';
const LOG_LEVEL_MISSING = 'LOG_LEVEL_MISSING';
const URL_NOT_SUPPORTED = 'URL_NOT_SUPPORTED';
const PROCESS_NAME = 'RESTBLUE SERVER';
const PORT = 10500;

const defaultDeviceReconnectAttempts = 5;
const defaultDeviceReconnectTimeout = 1000; // 1 sec

var LOG_NAME = '[ ' + PROCESS_NAME + ' ] : ';
var LOG_LEVEL/* = 'DEBUG'*/;
var devices = {};
var deviceIdentifier = null;
var deviceScanId ;
var deviceScanCallback ;

var server = http.createServer(
    function handleRequest(request, response) {
        var requestUrl = request.url;
        var urlTokens = requestUrl.split('/');
        noble_utils.startTimeoutResponseProcess(response);
        if( requestUrl.indexOf('/config/scan') > -1 && urlTokens.length == 3 ) {
            clearTimeoutResponseProcess();
            processPostRequest(request, response, function(jsonRequestBody) {
                if(jsonRequestBody.deviceIdentifier) {
                    deviceIdentifier = jsonRequestBody.deviceIdentifier;
                    restartScanning();
                    utils.sendOkResponse(response, 'New config applied. Scanning restarted');
                } else {
                    utils.sendErrorResponse(response, 'No deviceIdentifier provided in json', IDENTIFIER_MISSING);
                }
            });
        } else if ( requestUrl.indexOf('/config/logging') > -1 && urlTokens.length == 3 && request.method == 'POST' ) {
            clearTimeoutResponseProcess();
            processPostRequest(request, response, function(jsonRequestBody) {
                if(jsonRequestBody.LOG_LEVEL) {
                    LOG_LEVEL = jsonRequestBody.LOG_LEVEL;
                    utils.sendOkResponse(response, 'LOG_LEVEL = ' + LOG_LEVEL + ' is applied');
                } else {
                    utils.sendErrorResponse(response, 'No LOG_LEVEL provided in json', LOG_LEVEL_MISSING);
                }
            });
        } else if (requestUrl.indexOf('/scan/restart') > -1 && urlTokens.length == 3) {
            restartScanning();
            utils.sendOkResponse(response, 'Scanning restarted');
        } else if( requestUrl.indexOf('/devices') > -1 && urlTokens.length == 2 ) {
            clearTimeoutResponseProcess();
            utils.sendOkResponse(response, utils.devicesToJSON(devices));
        } else if ( requestUrl.indexOf('/services') > -1 && urlTokens.length == 5 ) {
            executeMainAction(response, requestUrl, urlTokens, function(deviceItem) {
                noble_utils.discoverDeviceServices(deviceItem, response);
            });
        } else if ( requestUrl.indexOf('/characteristics') > -1 && urlTokens.length == 7 ) {
            var serviceId = urlTokens[5];
            executeMainAction(response, requestUrl, urlTokens, function(deviceItem) {
                noble_utils.discoverServiceCharacteristics(deviceItem, serviceId, response);
            });
        } else if (requestUrl.indexOf('/characteristic') > -1 && urlTokens.length == 8) {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            if(request.method == 'POST') {
                executeMainAction(response, requestUrl, urlTokens, function(deviceItem) {
                    noble_utils.writeCharacteristic(deviceItem, serviceId, characteristicId, response, request);
                });
            } else {
                executeMainAction(response, requestUrl, urlTokens, function (deviceItem) {
                    noble_utils.readCharacteristic(deviceItem, serviceId, characteristicId, response);
                });
            }
        } else if (requestUrl.indexOf('/characteristic') > -1 && requestUrl.indexOf('/notify') > -1 && urlTokens.length == 9) {
            // TODO: Do we need 2 options: turn ON/OFF notify ?
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            var notifyDeviceTimeout;
            var urlParams = url.parse(requestUrl, true).query;
            if (Object.keys(urlParams).length > 0) {
                notifyDeviceTimeout = url.parse(requestUrl, true).query.timeout;
            }
            executeMainAction(response, requestUrl, urlTokens, function(deviceItem) {
                noble_utils.notify(deviceItem, serviceId, characteristicId, response, true, notifyDeviceTimeout);
            });
        } else if (requestUrl.indexOf('/descriptors') > -1 && urlTokens.length == 9) {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            executeMainAction(response, requestUrl, urlTokens, function(deviceItem) {
                noble_utils.discoverCharacteristicDescriptors(deviceItem, serviceId, characteristicId, response);
            });
        } else if (requestUrl.indexOf('/descriptor') > -1 && urlTokens.length == 10 && request.method == 'GET') {
            var serviceId = urlTokens[5];
            var characteristicId = urlTokens[7];
            var descriptorId = urlTokens[9];
            /*if(request.method == 'GET') {*/
            executeMainAction(response, requestUrl, urlTokens, function(deviceItem) {
                noble_utils.readDescriptor(deviceItem, serviceId, characteristicId, descriptorId, response);
            });
            /*} else {
             executeMainAction(response, requestUrl, urlTokens, function(deviceItem) {
             noble_utils.writeDescriptor(deviceItem, serviceId, characteristicId, descriptorId, response, request);
             });
             }*/
        } else if (requestUrl.indexOf(noble_utils.BUFFER_URL) > -1 && urlTokens.length == 3) {
            var bufferId = urlTokens[2];
            noble_utils.getNotifyBufferData(response, bufferId);
            clearTimeoutResponseProcess();
        } else if (requestUrl.indexOf('/status') > -1) {
            clearTimeoutResponseProcess();
            utils.sendOkResponse(response, { bluetooth_adapter_powered_on: noble_utils.blPoweredOn});
        } else {
            clearTimeoutResponseProcess();
            utils.sendNotFoundResponse(response, 'This requestUrl is not supported : ' + requestUrl, URL_NOT_SUPPORTED);
        }
    }
).listen(PORT, function serverListening() {
    if( LOG_LEVEL == 'DEBUG') {
        console.log(LOG_NAME + 'Server is listening to port : ' + PORT);
    }
});

// initializing noble scanning process without duplicates
noble_utils.init(PROCESS_NAME, false, function(peripheral) {
    if(deviceScanId && deviceScanCallback) {
        if (deviceScanId == peripheral.id) {
            deviceScanCallback({ device: peripheral });
            deviceScanId = null;
            deviceScanCallback = null;
        }
    }
    var generatedID;
    var result;
    if(deviceIdentifier) {
        if(deviceIdentifier == 'name') {
            result = utils.findDeviceByName(devices, peripheral.advertisement.localName);
        } if (deviceIdentifier == 'mac') {
            result = utils.findDeviceByMac(devices, peripheral.address);
        }
    }
    if (result) {
        generatedID = result.id;
    } else {
        generatedID = utils.generateID(10);
    }
    devices[generatedID] = { device: peripheral };
});

function executeMainAction(response, requestUrl, urlTokens, callbackAction) {
    var urlParams = url.parse(requestUrl, true).query;
    var result = utils.getDeviceByUrl(devices, requestUrl, urlTokens);
    var scan = false, deviceReconnectTimeout, deviceReconnectAttempts;
    if (Object.keys(urlParams).length > 0) {
        if(urlParams.scan == 'true') {
            scan = true;
            deviceScanCallback = function(deviceItem) {
                if (deviceItem) {
                    noble_utils.checkDeviceStatusAndConnect(deviceItem, response, function() {
                        callbackAction(deviceItem);
                    });
                } else {
                    utils.sendNotFoundResponse(response, 'Device with id = ' + deviceItem.device.id + ' not found during new scanning', noble_utils.DEVICE_NOT_FOUND_CODE);
                }
            };
        }
        if(urlParams.drct) {
            deviceReconnectTimeout = urlParams.drct;
        }
        if(urlParams.drca) {
            deviceReconnectAttempts = urlParams.drca;
        }
    }
    if ( result.deviceItem ) {
        if(scan) {
            deviceScanId = result.deviceItem.device.id;
            restartScanning();
        } else {
            if( LOG_LEVEL == 'DEBUG') {
                console.log(LOG_NAME + 'Getting services for device with mac-id = ' + result.deviceItem.device.id);
            }
            if(deviceReconnectAttempts && !result.deviceItem.deviceReconnectAttempts) {
                result.deviceItem.deviceReconnectAttempts = deviceReconnectAttempts;
            } else {
               result.deviceItem.deviceReconnectAttempts = defaultDeviceReconnectAttempts;
            }
            if(deviceReconnectTimeout && !result.deviceItem.deviceReconnectTimeout) {
                result.deviceItem.deviceReconnectTimeout = deviceReconnectTimeout;
            } else {
                result.deviceItem.deviceReconnectTimeout = defaultDeviceReconnectTimeout;
            }
            noble_utils.checkDeviceStatusAndConnect(result.deviceItem, response, function() {
                callbackAction(result.deviceItem)
            });
        }
    } else {
        if (scan && urlTokens[2] == 'mac') {
            deviceScanId = urlTokens[3];
            restartScanning()
        } else {
            clearTimeoutResponseProcess();
            utils.sendNotFoundResponse(response, result.errorMsg, noble_utils.DEVICE_NOT_FOUND_CODE);
        }
    }
}

function restartScanning() {
    devices = {};
    noble_utils.restartScanning();
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
            utils.sendErrorResponse(response, 'Error parsing request body', error);
        }
    });
}

function clearTimeoutResponseProcess() {
    if(noble_utils.timeoutResponseProcess) {
        clearTimeout(noble_utils.timeoutResponseProcess);
    }
}