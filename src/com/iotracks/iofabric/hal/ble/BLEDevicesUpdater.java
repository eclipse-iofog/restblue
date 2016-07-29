package com.iotracks.iofabric.hal.ble;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEDevicesUpdater implements Runnable {

    @Override
    public void run() {
        System.out.println("triggering devices map update - " + System.currentTimeMillis());
        BLEDevicesMapHolder.updateDevices();
    }
}
