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

    static Long batchNumber = 0L;
    static final Long maxAdvSignalInterval = 24*60*60*1000L; // 24h = 1 day

    private static final String DEVICES_LIST_NAME = "bledevices";

    public static void addDevice(String macAddress, String name, Long timestamp, Long pBatchNumber) {
        synchronized (bleDevices) {
            //System.out.println("new command line device (advSignal) : --- macaddress --- " + macAddress + ", --- name --- " + name + ", --- timestamp --- " + timestamp  + ", --- batchNumber --- " + pBatchNumber );
            batchNumber = pBatchNumber;
            if(bleDevices.containsKey(macAddress)) {
                bleDevices.get(macAddress).updateDevice(timestamp, pBatchNumber);
                if(!name.trim().equals("(unknown)")) {
                    bleDevices.get(macAddress).setName(name);
                }
            } else {
                bleDevices.put(macAddress, new BLEDevice(macAddress, name, timestamp, pBatchNumber));
            }
        }
    }

    public static void updateDevices() {
        synchronized (bleDevices) {
            Iterator<Map.Entry<String, BLEDevice>> iter = bleDevices.entrySet().iterator();
            while (iter.hasNext()) {
                Map.Entry<String, BLEDevice> entry = iter.next();
                BLEDevice device = entry.getValue();
                //System.out.println("checking mac - " + device.getMacAddress() + " , name = " + device.getName() + " , lastAdvSignal = " + device.getLastAdvSignal() + " , deviceBatchNumber = " + device.getBatchNumber() + " , mapBatchNumber = " + batchNumber);
                switch (device.getBleStatus()){
                    case PRESENT:
                        if( device.getBatchNumber() < batchNumber) {
                            device.outofscope();
                        }
                    case NO_SIGNALS:
                        if(System.currentTimeMillis() - device.getLastAdvSignal() > maxAdvSignalInterval) {
                            //System.out.println("removing device - " + device.getMacAddress() + " and name - " + device.getName());
                            iter.remove();
                        }
                }
            }
        }
    }

    public static JsonObject getDevices() {
        synchronized (bleDevices) {
            JsonArrayBuilder devicesBuilder = Json.createArrayBuilder();
            bleDevices.forEach((k,v) -> devicesBuilder.add(v.toJson()) );
            JsonObjectBuilder jsonBuilder = Json.createObjectBuilder().add(DEVICES_LIST_NAME, devicesBuilder);
            return jsonBuilder.build();
        }
    }

}
