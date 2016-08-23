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
#### Read the value for specified characteristic cID, service sID and device dID (GET)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
#### Read the value for specified characteristic cID, service sID and device Mac Address (GET)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
#### Write value for specified characteristic cID, service sID and device dID (POST)
<pre>
http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
###### POST parameters
<pre>
{ "data" : "base64 encoded data" }
</pre>
#### Write value for specified characteristic cID, service sID and device Mac Address (POST)
<pre>
http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### POST parameters
<pre>
{ "data" : "base64 encoded data" }
</pre>