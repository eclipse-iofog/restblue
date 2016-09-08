# bluetooth-rest-api
Prerequisites:
- container needs to be run with 2 options: --net=host --privileged

Container provides next REST endpoints :

#### 1. Send config for bluetooth-rest-api system container, the scanning will be restarted after receiving config and all previously saved devices will be added anew with new IDs
<pre>
http://localhost:10500/config
</pre>
###### POST JSON raw body
<pre>
{ "deviceIdentifier" : "name/mac" }
</pre>
#### 2. Send restart scanning command
<pre>
http://localhost:10500/scan/restart
</pre>
#### 3. Get list of devices (GET)
<pre>
http://localhost:10500/devices
</pre>
#### 4. Get list of services for specified device ID (GET)
<pre>
http://localhost:10500/device/iid/{ID}/services
</pre>
#### 5. Get list of services for specified device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/services
</pre>
#### 6. Get list of characteristics for specified service sID and device dID (GET)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristics
</pre>
#### 7. Get list of characteristics for specified service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristics
</pre>
#### 8. Read the value from specified characteristic cID, service sID and device dID (GET)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
#### 9. Read the value from specified characteristic cID, service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
#### 10. Write value to specified characteristic cID, service sID and device dID (POST)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
###### POST JSON raw body
"withresponse" isn't required (in case it's omitted the dafault value will be false)
<pre>
{ "data" : "base64 encoded data" , "withresponse" : true }
</pre>
#### 11. Write value to specified characteristic cID, service sID and device Mac Address (POST)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### POST JSON raw body
"withresponse" isn't required (in case it's omitted the dafault value will be false)
<pre>
{ "data" : "base64 encoded data" , "withresponse" : true }
</pre>
#### 12. Get list of descriptors for specified characteristic cID, service sID and device dID (GET)
<pre>
http://localhost:10500/device/id/{dID}/service/{sID}/characteristic/{cID}/descriptors
</pre>
#### 13. Get list of descriptors for specified characteristic cID, service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptors
</pre>
#### 14. Read the value from specified descriptor dsID, characteristic cID, service sID and device dID (GET)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
#### 15. Read the value from specified descriptor dsID, characteristic cID, service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
#### 16. Write value to specified descriptor dsID, characteristic cID, service sID and device dID (POST)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### POST JSON raw body
<pre>
{ "data" : "base64 encoded data" }
</pre>
#### 17. Write value to specified descriptor dsID, characteristic cID, service sID and device Mac Address (POST)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### POST JSON raw body
<pre>
{ "data" : "base64 encoded data" }
</pre>

For REST calls specified under number 4-17 all the operations will be performed with previously stored devices (the scanning starts upon container's start). If to the url add parameter : ?scan=true, the device will be scanned anew.
For REST calls specified under numbers 5, 7, 9, 11, 13, 15, 17 (basically the ones with mac parameter to specify device) if add scan=true parameter to url, new device can be searched.