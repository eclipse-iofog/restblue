package com.iotracks.iofabric.hal.ble;

import org.apache.commons.collections4.queue.CircularFifoQueue;

import javax.json.Json;
import javax.json.JsonObject;
import java.util.*;

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

    private Long avgAdvSignalInterval;
    private Long maxAdvSignalInterval;

    private Queue<Long> advSignalsTimestamps;

    public BLEDevice(String macAddress, String name, Long advSignalTimestamp) {
        this.macAddress = macAddress;
        this.name = name;
        bleStatus = BLEStatus.VERIFYING;
        avgAdvSignalInterval = 0L;
        maxAdvSignalInterval = 24*60*60*1000L;
        advSignalsTimestamps = new CircularFifoQueue<>(5);
        advSignalsTimestamps.add(advSignalTimestamp);
    }

    public String getMacAddress() {
        return macAddress;
    }

    public void setMacAddress(String macAddress) {
        this.macAddress = macAddress;
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

    public void setBleStatus(BLEStatus bleStatus) {
        this.bleStatus = bleStatus;
    }

    public Long getAvgAdvSignalInterval() {
        return avgAdvSignalInterval;
    }

    public void setAvgAdvSignalInterval(Long avgAdvSignalInterval) {
        this.avgAdvSignalInterval = avgAdvSignalInterval;
    }

    public Long getMaxAdvSignalInterval() {
        return maxAdvSignalInterval;
    }

    public void setMaxAdvSignalInterval(Long maxAdvSignalInterval) {
        this.maxAdvSignalInterval = maxAdvSignalInterval;
    }

    public Queue<Long> getAdvSignalsTimestamps() {
        return advSignalsTimestamps;
    }

    public void setAdvSignalsTimestamps(Queue<Long> advSignalsTimestamps) {
        this.advSignalsTimestamps = advSignalsTimestamps;
    }

    public void addAdvSignalTimestamp(Long advSignalTimestamp) {
        if(advSignalsTimestamps != null) {
            advSignalsTimestamps.add(advSignalTimestamp);
            verify();
        }
    }

    public void inactivate() {
        System.out.println("Inactivated");
        advSignalsTimestamps = new CircularFifoQueue<>(5);
        bleStatus = BLEStatus.INACTIVE;
        avgAdvSignalInterval = 0L;
    }

    public void verify() {
        if(advSignalsTimestamps != null && advSignalsTimestamps.size() == 5) {
            List<Long> advSignalIntervals = new ArrayList<>(4);
            List<Long> advSignalsTimestampsArray = new ArrayList<>(advSignalsTimestamps);
            for(int i = 0; i + 1 < advSignalsTimestampsArray.size(); i++) {
                advSignalIntervals.add(advSignalsTimestampsArray.get(i+1) - advSignalsTimestampsArray.get(i));
            }
            //System.out.println("advSignalsTimestamps : " + advSignalsTimestamps);
            //System.out.println("advSignalIntervals : " + advSignalIntervals);
            Long newAvgAdvSignalInterval = Collections.max(advSignalIntervals)*2;
            if(newAvgAdvSignalInterval > 0L) {
                avgAdvSignalInterval = newAvgAdvSignalInterval;
            }
            //System.out.println("avgAdvSignalInterval : " + avgAdvSignalInterval);
            bleStatus = BLEStatus.ACTIVE;
            System.out.println("!!! Verified !!! + average signal interval updated");
        }
    }

    public Long getLastAdvSignal(){
        Iterator<Long> intervalIterator = advSignalsTimestamps.iterator();
        Long lastInterval = intervalIterator.next();
        while(intervalIterator.hasNext()) {
            lastInterval = intervalIterator.next();
        }
        return lastInterval;
    }

    public JsonObject toJson(){
        return Json.createObjectBuilder().add(MAC_ADDRESS_PROP_NAME, getMacAddress())
                .add(NAME_PROP_NAME, getName())
                .add(STATUS_PROP_NAME, getBleStatus().name()).build();
    }

}
