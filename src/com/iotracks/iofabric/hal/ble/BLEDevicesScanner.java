package com.iotracks.iofabric.hal.ble;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.logging.Logger;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEDevicesScanner implements Runnable {

    private static final Logger log = Logger.getLogger(BLEDevicesScanner.class.getName());

    private final String cmdScanDevices = "hcitool lescan --duplicates";
    private final String macAddressPattern = "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$";
    //private final String cmdScanDevices = "hcitool scan";

    @Override
    public void run() {
        String s;
        try {
            Process p = Runtime.getRuntime().exec(cmdScanDevices);
            BufferedReader stdInput = new BufferedReader(new InputStreamReader(p.getInputStream()));
            BufferedReader stdError = new BufferedReader(new InputStreamReader(p.getErrorStream()));
            // read the output from the command
            System.out.println("CMD input:\n");
            while ((s = stdInput.readLine()) != null) {
                String[] tokens = s.split(" ");
                if(tokens.length > 1 && tokens[0].matches(macAddressPattern)) {
                    String name;
                    if(tokens.length == 2) {
                        name = tokens[1];
                    } else {
                        StringBuilder nameBuilder = new StringBuilder();
                        for(int i = 1; i < tokens.length; i++) {
                            nameBuilder.append(tokens[i]);
                        }
                        name = nameBuilder.toString();
                    }
                    BLEDevicesMapHolder.addDevice(tokens[0], name);
                }
            }
            // read any errors from the attempted command
            while ((s = stdError.readLine()) != null) {
                System.out.println(s);
                log.warning("CMD: Error running command line '" + cmdScanDevices + "' :\n " + s);
            }
        } catch (IOException e) {
            log.warning("Exception running command line:\n" + e.getMessage());
            e.printStackTrace();
        }

    }
}
