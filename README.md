# bluetooth-rest-api
Prerequisites:
- container needs to be run with 2 options: --net=host --privileged

Container provides next REST endpoints :

#### Get list of devices (GET)
<pre>
http://localhost:10500/devices
</pre>
#### Get list of services for specified device ID (GET)
<pre>
http://localhost:10500/device/iid/{ID}/services
</pre>
#### Get list of services for specified device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/services
</pre>
#### Get list of characteristics for specified service sID and device dID (GET)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristics
</pre>
#### Get list of characteristics for specified service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristics
</pre>
#### Read the value from specified characteristic cID, service sID and device dID (GET)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
#### Read the value from specified characteristic cID, service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
#### Write value to specified characteristic cID, service sID and device dID (POST)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
###### POST parameters
"withresponse" isn't required (in case it's omitted the dafault value will be false)
<pre>
{ "data" : "base64 encoded data" , "withresponse" : true }
</pre>
#### Write value to specified characteristic cID, service sID and device Mac Address (POST)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### POST parameters
"withresponse" isn't required (in case it's omitted the dafault value will be false)
<pre>
{ "data" : "base64 encoded data" , "withresponse" : true }
</pre>
#### Get list of descriptors for specified characteristic cID, service sID and device dID (GET)
<pre>
http://localhost:10500/device/id/{dID}/service/{sID}/characteristic/{cID}/descriptors
</pre>
#### Get list of descriptors for specified characteristic cID, service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptors
</pre>
#### Read the value from specified descriptor dsID, characteristic cID, service sID and device dID (GET)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
#### Read the value from specified descriptor dsID, characteristic cID, service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
#### Write value to specified descriptor dsID, characteristic cID, service sID and device dID (POST)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### POST parameters
<pre>
{ "data" : "base64 encoded data" }
</pre>
#### Write value to specified descriptor dsID, characteristic cID, service sID and device Mac Address (POST)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### POST parameters
<pre>
{ "data" : "base64 encoded data" }
</pre>
