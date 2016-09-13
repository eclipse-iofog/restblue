# bluetooth-rest-api (REST-BLUE)
Prerequisites:
- container needs to be run with 2 options to grant access: --net=host --privileged

Upon startup the container will start scanning if bluetooth is powered on and upon discovering devices it will store them locally and generate an internal ID. In most cases the cantainer will work with this locally stored devices unless the scanning is restarted. If contrainer received command to restart scanning it will delete all previously stored devices and start scanning anew ( which results in genereting new local IDs for devices).
Container will return 'Timeout exception' in case if it didn't get any reaults of processing. 
> For example, if you try to hit http://localhost:10500/device/mac/{mac}/services?scan=true endpoint you can get 'Timeout exception' for next reasons:
> 1. device with specified mac was't found while scanning anew
> 2. device is inactive and container hang up on trying to connect to it
> 3. after connecting to device container hang up on descovering services

Container provides next REST endpoints :

#### Set config (POST)
This endpoit provides the possibility to set config for bluetooth-rest-api system container, upon receiving config container will wipe out all previously stored devices and restart scanning. 'name' - will tell container differentiate devices' uniqueness by localname, 'mac' - will tell container differentiate devices' uniqueness by mac address
###### Endpoit 1
<pre>
http://localhost:10500/config
</pre>
###### POST JSON raw body
<pre>
{ "deviceIdentifier" : "name/mac" }
</pre>
#### Restart scanning
This enpoint sends the command to restart scanning to a container. As a result all previously stored devices will be wiped out and then the scanning will be restarted. 
###### Endpoit 2
<pre>
http://localhost:10500/scan/restart
</pre>
#### Get list of devices (GET)
This endpoit returns a list of discovered devices till current moment.
###### Endpoit 3
<pre>
http://localhost:10500/devices
</pre>
###### Response
<pre>
</pre>
#### Get list of services (GET)
This endpoit returns a list of services discovered for specified device ID/Mac Address.
###### Endpoit 4
<pre>
http://localhost:10500/device/iid/{ID}/services
</pre>
###### Endpoit 5
<pre>
http://localhost:10500/device/mac/{mac}/services
</pre>
###### Response
<pre>
</pre>
#### Get list of characteristics (GET)
This endpoint returns the list of discovered characteristics for specified service sID and device dID/Mac Address
###### Endpoit 6
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristics
</pre>
###### Endpoit 7
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristics
</pre>
###### Response
<pre>
</pre>
#### Read characteristic's value (GET)
This enpoint reads the value from specified characteristic cID for specified service sID and device dID/Mac Address
###### Endpoit 8
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
###### Endpoit 9
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### Response
<pre>
</pre>
#### Write value to characteristic (POST)
This enpoint writes value to specified characteristic cID for specified service sID and device dID/Mac Address
###### Endpoit 10
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
###### Endpoit 11
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### POST JSON raw body
"withresponse" isn't required (in case it's omitted the dafault value will be false)
<pre>
{ "data" : "base64 encoded data" , "withresponse" : true }
</pre>
###### Response
<pre>
</pre>
#### Get list of descriptors (GET)
This endpoint returns a list of descovered descriptors for specified characteristic cID, service sID and device dID/Mac Address
###### Endpoit 12
<pre>
http://localhost:10500/device/id/{dID}/service/{sID}/characteristic/{cID}/descriptors
</pre>
###### Endpoit 13
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptors
</pre>
###### Response
<pre>
</pre>
#### Read the value from descriptor (GET)
This enpoint reads the value from specified descriptor dsID for specified characteristic cID, service sID and device dID/Mac Address
###### Endpoit 14
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### Endpoit 15
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### Response
<pre>
</pre>
#### Write value to descriptor (POST)
This endpoit writes value to specified descriptor dsID for specified characteristic cID, service sID and device dID/Mac Address
###### Endpoit 16
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### Endpoit 17
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### POST JSON raw body
<pre>
{ "data" : "base64 encoded data" }
</pre>
###### Response
<pre>
</pre>

For REST calls specified under number 4-17 all the operations will be performed with previously stored devices (the scanning starts upon container's start). If to the url add parameter : ?scan=true, the device will be scanned anew.
For REST calls specified under numbers 5, 7, 9, 11, 13, 15, 17 (basically the ones with mac parameter to specify device) if add scan=true parameter to url, new device can be searched.
