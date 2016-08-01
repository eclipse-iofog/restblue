package com.iotracks.iofabric.hal.ble;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEDevicesUpdater implements Runnable {

    @Override
    public void run() {
        BLEDevicesMapHolder.updateDevices();
    }
}
