# bluetooth-rest-api
Prerequisites:
- container needs to be run with 2 options to grant access: --net=host --privileged

Upon startup the container will start scanning if bluetooth is powered on and upon discovering devices it will store them locally and generate an internal ID. In most cases the cantainer will work with this locally stored devices unless the scanning is restarted. If contrainer received command to restart scanning it will delete all previously stored devices and start scanning anew ( which results in genereting new local IDs for devices).
Container will return 'Timeout exception' in case if it didn't get any reaults of processing. 
> For example, if you try to hit http://localhost:10500/device/mac/{mac}/services?scan=true endpoint you can get 'Timeout exception' for next reasons:
> 1. device with specified mac was't found while scanning anew
> 2. device is inactive and container hang up on trying to connect to it
> 3. after connecting to device container hang up on descovering services

Container provides next REST endpoints :

#### Send config for bluetooth-rest-api system container, the scanning will be restarted after receiving config and all previously saved devices will be added anew with new IDs
<pre>
<b>1.</b> http://localhost:10500/config
</pre>
###### POST JSON raw body
<pre>
{ "deviceIdentifier" : "name/mac" }
</pre>
#### Send restart scanning command
<pre>
<b>2.</b> http://localhost:10500/scan/restart
</pre>
#### Get list of devices (GET)
<pre>
<b>3.</b> http://localhost:10500/devices
</pre>
#### Get list of services for specified device ID/Mac Address (GET)
<pre>
<b>4.</b> http://localhost:10500/device/iid/{ID}/services
</pre>
<pre>
<b>5.</b> http://localhost:10500/device/mac/{mac}/services
</pre>
#### Get list of characteristics for specified service sID and device dID/Mac Address (GET)
<pre>
<b>6.</b> http://localhost:10500/device/iid/{dID}/service/{sID}/characteristics
</pre>
<pre>
<b>7.</b> http://localhost:10500/device/mac/{mac}/service/{sID}/characteristics
</pre>
#### Read the value from specified characteristic cID, service sID and device dID/Mac Address (GET)
<pre>
<b>8.</b> http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
<pre>
<b>9.</b> http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
#### Write value to specified characteristic cID, service sID and device dID/Mac Address (POST)
<pre>
<b>10.</b> http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}
</pre>
<pre>
<b>11.</b> http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}
</pre>
###### POST JSON raw body
"withresponse" isn't required (in case it's omitted the dafault value will be false)
<pre>
{ "data" : "base64 encoded data" , "withresponse" : true }
</pre>
#### Get list of descriptors for specified characteristic cID, service sID and device dID/Mac Address (GET)
<pre>
<b>12.</b> http://localhost:10500/device/id/{dID}/service/{sID}/characteristic/{cID}/descriptors
</pre>
<pre>
<b>13.</b> http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptors
</pre>
#### Read the value from specified descriptor dsID, characteristic cID, service sID and device dID/Mac Address (GET)
<pre>
<b>14.</b> http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
<pre>
<b>15.</b> http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
#### Write value to specified descriptor dsID, characteristic cID, service sID and device dID/Mac Address (POST)
<pre>
<b>16.</b> http://localhost:10500/device/iid/{dID}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
<pre>
<b>17.</b> http://localhost:10500/device/mac/{mac}/service/{sID}/characteristic/{cID}/descriptor/{dsID}
</pre>
###### POST JSON raw body
<pre>
{ "data" : "base64 encoded data" }
</pre>

For REST calls specified under number 4-17 all the operations will be performed with previously stored devices (the scanning starts upon container's start). If to the url add parameter : ?scan=true, the device will be scanned anew.
For REST calls specified under numbers 5, 7, 9, 11, 13, 15, 17 (basically the ones with mac parameter to specify device) if add scan=true parameter to url, new device can be searched.
