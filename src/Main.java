import com.iotracks.iofabric.hal.ble.api.BLEAPI;

public class Main {

    public static void main(String[] args) {
        BLEAPI bleapi = BLEAPI.getInstance();
        Thread thread = new Thread(bleapi);
        thread.start();
    }
}
