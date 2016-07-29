package com.iotracks.iofabric.hal.ble;

import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import java.util.*;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEDevicesMapHolder {

    static Map<String, BLEDevice> bleDevices = Collections.synchronizedMap(new HashMap<>());

    private static final String DEVICES_LIST_NAME = "bledevices";

    public static void addDevice(String macAddress, String name) {
        System.out.println("addDevice");
        synchronized (bleDevices) {
            System.out.println("macaddress - " + macAddress + " and name - " + name + " adding... ");
            if(bleDevices.containsKey(macAddress)) {
                bleDevices.get(macAddress).addAdvSignalTimestamp(System.currentTimeMillis());
                bleDevices.get(macAddress).setName(name);
            } else {
                bleDevices.put(macAddress, new BLEDevice(macAddress, name, System.currentTimeMillis()));
            }
        }
    }

    public static void updateDevices() {
        System.out.println("updateDevices");
        synchronized (bleDevices) {
            long currentTime = System.currentTimeMillis();
            System.out.println("cleaning... currentTime = " + currentTime);
            Iterator<Map.Entry<String, BLEDevice>> iter = bleDevices.entrySet().iterator();
            while (iter.hasNext()) {
                Map.Entry<String, BLEDevice> entry = iter.next();
                BLEDevice device = entry.getValue();
                long diff = currentTime - device.getLastAdvSignal() ;
                System.out.println("mac - " + entry.getKey() + " time diff = " + diff);
                switch (device.getBleStatus()){
                    case ACTIVE:
                        if( diff > device.getAvgAdvSignalInterval() ) {
                            System.out.println("inactivate device with mac - " + device.getMacAddress() + " and name - " + device.getName());
                            device.inactivate();
                        }
                    case INACTIVE:
                        if( diff > device.getMaxAdvSignalInterval()) {
                            System.out.println("removing device with mac - " + device.getMacAddress() + " and name - " + device.getName());
                            iter.remove();
                        }
                }
            }
        }
    }

    public static JsonObject getDevices() {
        System.out.println("getDevices");
        synchronized (bleDevices) {
            JsonArrayBuilder devicesBuilder = Json.createArrayBuilder();
            bleDevices.forEach((k,v) -> devicesBuilder.add(v.toJson()) );
            JsonObjectBuilder jsonBuilder = Json.createObjectBuilder().add(DEVICES_LIST_NAME, devicesBuilder);
            return jsonBuilder.build();
        }
    }

}
