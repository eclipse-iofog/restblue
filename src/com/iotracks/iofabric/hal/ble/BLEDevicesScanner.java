package com.iotracks.iofabric.hal.ble;

import java.io.*;
import java.util.logging.Logger;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEDevicesScanner implements Runnable {

    private static final Logger log = Logger.getLogger(BLEDevicesScanner.class.getName());

    private final String cmdScanDevices = "hcitool lescan --duplicates";
    private final String macAddressPattern = "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$";

    @Override
    public void run() {
        String s;
        try {
            Process p = Runtime.getRuntime().exec(cmdScanDevices);

            /*Scanner sInput = new Scanner(p.getInputStream());
            Scanner sError = new Scanner(p.getErrorStream());*/
            //BufferedReader stdInput = new BufferedReader(new InputStreamReader(p.getInputStream()), 1);
            //BufferedReader stdError = new BufferedReader(new InputStreamReader(p.getErrorStream()), 1);
            // read the output from the command
            // read any errors from the attempted command

            //System.out.println("CMD input:\n");
            while ((s = readLine(p.getInputStream())/*sError.nextLine()*/) != null) {
                Long timestamp = System.currentTimeMillis();
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
                    BLEDevicesMapHolder.addDevice(tokens[0], name, timestamp);
                }
            }

            while ((s = readLine(p.getErrorStream())/*sError.nextLine()*/) != null) {
                log.warning("CMD: Error running command line '" + cmdScanDevices + "' :\n " + s);
            }
        } catch (IOException e) {
            log.warning("Exception running command line:\n" + e.getMessage());
            e.printStackTrace();
        }

    }

    public static String readLine(InputStream inputStream) throws IOException {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        int c;
        for (c = inputStream.read(); c != '\n' && c != -1 ; c = inputStream.read()) {
            byteArrayOutputStream.write(c);
        }
        if (c == -1 && byteArrayOutputStream.size() == 0) {
            return null;
        }
        String line = byteArrayOutputStream.toString("UTF-8");
        return line;
    }
}
