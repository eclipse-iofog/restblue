package com.iotracks.iofabric.hal.ble.api;

import com.iotracks.iofabric.hal.ble.BLEDevicesUpdater;
import com.iotracks.iofabric.hal.ble.BLEDevicesScanner;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEAPI implements Runnable {

    private static final Logger log = Logger.getLogger(BLEAPI.class.getName());

    private static BLEAPI instance = null;
    public boolean isSeverStarted = false;
    private BLEAPIServer server;

    private ScheduledFuture cleanerFuture;
    private Thread scannerThread = null;
    private BLEDevicesScanner bleDevicesScanner;
    private BLEDevicesUpdater bleDevicesCleaner;
    private ScheduledExecutorService mScheduler;

    private BLEAPI() {
        this.mScheduler = Executors.newScheduledThreadPool(1);
        this.bleDevicesCleaner = new BLEDevicesUpdater();
        this.bleDevicesScanner = new BLEDevicesScanner();
        this.scannerThread = new Thread(bleDevicesScanner);
        this.scannerThread.start();
        this.cleanerFuture = mScheduler.scheduleWithFixedDelay(bleDevicesCleaner, 0, 5, TimeUnit.SECONDS);
    }

    /**
     * Instantiate HAL API
     * @return BLEAPI
     */
    public static BLEAPI getInstance(){
        if (instance == null) {
            synchronized (BLEAPI.class) {
                if(instance == null){
                    instance = new BLEAPI();
                }
            }
        }
        return instance;
    }

    /**
     * Stop HAL API server
     */
    public void stopServer() throws Exception {
        server.stop();
    }


    /**
     * Start HAL API server
     */
    @Override
    public void run() {
        server = new BLEAPIServer();
        try {
            server.start();
            isSeverStarted = true;
        } catch (Exception e) {
            try {
                stopServer();
                isSeverStarted = false;
            } catch (Exception ee) {
                log.warning(" Unable to start HAL API server: " + ee.getMessage());
                return;
            }
            log.warning(" Unable to start HAL API server: " + e.getMessage());
            return;
        }
    }
}
