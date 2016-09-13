# bluetooth-rest-api (REST-BLUE)
Prerequisites:
- container needs to be run with 2 options to grant access: --net=host --privileged

Upon startup the container will start scanning if bluetooth is powered on and upon discovering devices it will store them locally and generate an internal ID. In most cases the container will work with this locally stored devices unless the scanning is restarted. If container received command to restart scanning it will delete all previously stored devices and start scanning anew ( which results in generating new local IDs for devices).
Container will return 'Timeout exception' in case if it didn't get any results of processing. 
> For example, if you try to hit http://localhost:10500/device/mac/{mac}/services?scan=true endpoint you can get 'Timeout exception' for next reasons:
> 1. device with specified mac was't found while scanning anew
> 2. device is inactive and container hang up on trying to connect to it
> 3. after connecting to device container hang up on discovering services

Container provides next REST endpoints :

#### Set config (POST)
This endpoint provides the possibility to set config for bluetooth-rest-api system container, upon receiving config container will wipe out all previously stored devices and restart scanning. 'name' - will tell container differentiate devices' uniqueness by localname, 'mac' - will tell container differentiate devices' uniqueness by mac address
###### endpoint 1
<pre>
http://localhost:10500/config
</pre>
###### POST JSON raw body
<pre>
{ "deviceIdentifier" : "name/mac" }
</pre>
###### Response
<pre>
"New config applied. Scanning restarted"
</pre>
#### Restart scanning
This endpoint sends the command to restart scanning to a container. As a result all previously stored devices will be wiped out and then the scanning will be restarted. 
###### Endpoint 2
<pre>
http://localhost:10500/scan/restart
</pre>
###### Response
<pre>
"Scanning restarted"
</pre>
#### Get list of devices (GET)
This endpoint returns a list of discovered devices till current moment.
###### Endpoint 3
<pre>
http://localhost:10500/devices
</pre>
###### Response
<pre>
[
  {
    "id": "TzPxHVbBnn",
    "mac-address": "fe:10:4f:c6:b9:39",
    "local-name": "Kontakt",
    "mac-id": "fe104fc6b939",
    "rssi": -74
  },
  {
    "id": "MvSG3gCXU3",
    "mac-address": "5b:d7:13:2b:f9:42",
    "mac-id": "5bd7132bf942",
    "rssi": -81
  }
]
</pre>
#### Get list of services (GET)
This endpoint returns a list of services discovered for specified device ID/Mac Address.
###### endpoint 4
<pre>
http://localhost:10500/device/iid/{ID}/services
</pre>
###### endpoint 5
<pre>
http://localhost:10500/device/mac/{mac}/services
</pre>
###### Response
<pre>
[
  {
    "uuid": "1800",
    "name": "Generic Access",
    "type": "org.bluetooth.service.generic_access"
  },
  {
    "uuid": "1801",
    "name": "Generic Attribute",
    "type": "org.bluetooth.service.generic_attribute"
  },
  {
    "uuid": "180a",
    "name": "Device Information",
    "type": "org.bluetooth.service.device_information"
  },
  {
    "uuid": "1804",
    "name": "Tx Power",
    "type": "org.bluetooth.service.tx_power"
  },
  {
    "uuid": "180f",
    "name": "Battery Service",
    "type": "org.bluetooth.service.battery_service"
  },
  {
    "uuid": "a1ea81100e1bd4a1b84063f88c8da1ea",
    "name": null,
    "type": null
  },
  {
    "uuid": "a1ea81200e1bd4a1b84063f88c8da1ea",
    "name": null,
    "type": null
  },
  {
    "uuid": "a1ea81300e1bd4a1b84063f88c8da1ea",
    "name": null,
    "type": null
  }
]
</pre>
#### Get list of characteristics (GET)
This endpoint returns the list of discovered characteristics for specified service sID and device dID/Mac Address
###### endpoint 6
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristics
</pre>
###### endpoint 7
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristics
</pre>
###### Response
<pre>
[
  {
    "uuid": "2a00",
    "name": "Device Name",
    "type": "org.bluetooth.characteristic.gap.device_name",
    "properties": [
      "read"
    ]
  },
  {
    "uuid": "2a01",
    "name": "Appearance",
    "type": "org.bluetooth.characteristic.gap.appearance",
    "properties": [
      "read"
    ]
  },
  {
    "uuid": "2a04",
    "name": "Peripheral Preferred Connection Parameters",
    "type": "org.bluetooth.characteristic.gap.peripheral_preferred_connection_parameters",
    "properties": [
      "read"
    ]
  }
]
</pre>
#### Read characteristic's value (GET)
This endpoint reads the value from specified characteristic cID for specified service sID and device dID/Mac Address
###### endpoint 8
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
###### endpoint 9
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### Response
<pre>
{
  "data": "base64 encoded data"
}
</pre>
#### Write value to characteristic (POST)
This endpoint writes value to specified characteristic cID for specified service sID and device dID/Mac Address
###### endpoint 10
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
###### endpoint 11
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### POST JSON raw body
"withresponse" isn't required (in case it's omitted the default value will be false)
<pre>
{ "data" : "base64 encoded data" , "withresponse" : true }
</pre>
###### Response
<pre>
"Success writing data to characteristic id = cID"
</pre>
#### Get list of descriptors (GET)
This endpoint returns a list of discovered descriptors for specified characteristic cID, service sID and device dID/Mac Address
###### endpoint 12
<pre>
http://localhost:10500/device/id/{dID}/service/{sID}/characteristic/{cID}/descriptors
</pre>
###### endpoint 13
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptors
</pre>
###### Response
<pre>
[
  {
    "uuid": "2901",
    "name": "Characteristic User Description",
    "type": "org.bluetooth.descriptor.gatt.characteristic_user_description"
  },
  {
    "uuid": "2900",
    "name": "Characteristic Extended Properties",
    "type": "org.bluetooth.descriptor.gatt.characteristic_extended_properties"
  }
]
</pre>
#### Read the value from descriptor (GET)
This endpoint reads the value from specified descriptor dsID for specified characteristic cID, service sID and device dID/Mac Address
###### endpoint 14
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### endpoint 15
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### Response
<pre>
{
  "data": "base64 encoded data"
}
</pre>

For REST calls specified under number 4-17 all the operations will be performed with previously stored devices (the scanning starts upon container's start). If to the url add parameter : ?scan=true, the device will be scanned anew.
For REST calls specified under numbers 5, 7, 9, 11, 13, 15, 17 (basically the ones with mac parameter to specify device) if add scan=true parameter to url, new device can be searched.
