package com.iotracks.iofabric.hal.ble;

import javax.json.Json;
import javax.json.JsonObject;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEDevice {

    private static final String MAC_ADDRESS_PROP_NAME = "macaddress";
    private static final String NAME_PROP_NAME = "name";
    private static final String STATUS_PROP_NAME = "status";

    private String macAddress;
    private String name;
    private BLEStatus bleStatus;
    private Long lastAdvSignal;
    private Long batchNumber;

    public BLEDevice(String macAddress, String name, Long lastAdvSignal, Long batchNumber) {
        this.macAddress = macAddress;
        this.name = name;
        this.lastAdvSignal = lastAdvSignal;
        this.batchNumber = batchNumber;
        bleStatus = BLEStatus.PRESENT;
    }

    public String getMacAddress() {
        return macAddress;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BLEStatus getBleStatus() {
        return bleStatus;
    }

    public Long getLastAdvSignal() {
        return lastAdvSignal;
    }

    public void updateDevice(Long lastAdvSignal, Long batchNumber) {
        if(bleStatus == BLEStatus.NO_SIGNALS) {
            bleStatus = BLEStatus.PRESENT;
        }
        this.batchNumber = batchNumber;
        this.lastAdvSignal = lastAdvSignal;
    }

    public Long getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(Long batchNumber) {
        this.batchNumber = batchNumber;
    }

    public void outofscope() {
        System.out.println(" -- NO SIGNAL -- " + macAddress);
        bleStatus = BLEStatus.NO_SIGNALS;
    }

    public JsonObject toJson(){
        return Json.createObjectBuilder().add(MAC_ADDRESS_PROP_NAME, getMacAddress())
                .add(NAME_PROP_NAME, getName())
                .add(STATUS_PROP_NAME, getBleStatus().name()).build();
    }

}
