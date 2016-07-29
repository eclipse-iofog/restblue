import com.iotracks.iofabric.hal.ble.api.BLEAPI;

public class Main {

    public static void main(String[] args) {
        BLEAPI bleapi = BLEAPI.getInstance();
        Thread thread = new Thread(bleapi);
        thread.start();

        /*Queue<Integer> queue = new CircularFifoQueue(5);
        for(int i=0;i<10;i++) {
            queue.add(i);
            System.out.println("Step " + i + " , queue = " + queue );
            System.out.println("queue size = " + queue.size() );
        }*/

    }
}
