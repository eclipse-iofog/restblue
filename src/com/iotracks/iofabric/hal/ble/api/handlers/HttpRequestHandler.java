package com.iotracks.iofabric.hal.ble.api.handlers;

import com.iotracks.iofabric.hal.ble.BLEDevicesMapHolder;
import com.iotracks.iofabric.hal.ble.utils.BLEAPIURLType;
import io.netty.buffer.ByteBuf;
import io.netty.handler.codec.http.*;
import io.netty.util.internal.StringUtil;

import javax.json.*;
import java.io.StringReader;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.logging.Logger;

import static io.netty.handler.codec.http.HttpResponseStatus.OK;
import static io.netty.handler.codec.http.HttpVersion.HTTP_1_1;

/**
 * HttpRequest handler for all REST requests to HAL.
 */
public class HttpRequestHandler implements Callable {

    private static final Logger log = Logger.getLogger(HttpRequestHandler.class.getName());

    private final String MAC_ADDRESS_PARAM_NAME = "macaddress";

    private final FullHttpRequest req;
    private ByteBuf bytesData;
    private BLEAPIURLType urlType;

    public HttpRequestHandler(FullHttpRequest req, ByteBuf bytesData, BLEAPIURLType urlType){
        this.req = req;
        this.bytesData = bytesData;
        this.urlType = urlType;
    }

    @Override
    public Object call() throws Exception {
        HttpHeaders headers = req.headers();

        /*
        if (req.getMethod() != urlType.getHttpMethod()) {
            return sendErrorResponse(Collections.singleton(" # Error: Incorrect HTTP method type."));
        }
        */

        if(headers.get(HttpHeaders.Names.CONTENT_TYPE)!=null && !(headers.get(HttpHeaders.Names.CONTENT_TYPE).equals("application/json"))){
            return sendErrorResponse(Collections.singleton(" # Error: Incorrect HTTP headers."));
        }

        if(urlType!=null) {
            switch (urlType) {
                case GET_DEVICES_LIST:
                    System.out.println("-------- GET_DEVICES_LIST request ------------");
                    return handleGetDevicesRequest();
                case GET_SERVICES_LIST:
                    System.out.println("-------- GET_SERVICES_LIST request ------------");
                    ByteBuf msgBytes = req.content();
                    String requestBody = msgBytes.toString(io.netty.util.CharsetUtil.US_ASCII);
                    JsonReader reader = Json.createReader(new StringReader(requestBody));
                    JsonObject jsonObject = reader.readObject();
                    return handleGetServicesRequest(jsonObject);
            }
        }
        return sendErrorResponse(Collections.singleton("# Error: Unhandled request call."));
    }

    private void checkField(JsonObject jsonObject, String fieldName, Set<String > errors){
        if(!jsonObject.containsKey(fieldName)){
            errors.add(" # Error: Missing input field '" + fieldName +  "'.");
        }
    }

    private void parseLongField(JsonObject jsonObject, String fieldName, Set<String > errors){
        try{
            if(jsonObject.containsKey(fieldName)) {
                Long.parseLong(jsonObject.getJsonNumber(fieldName).toString());
            }
        }catch(Exception e){
            errors.add(" # Error: Invalid value of '" + fieldName + "'.");
        }
    }

    private void parseIntField(JsonObject jsonObject, String fieldName, Set<String > errors){
        parseFieldWithPattern(jsonObject, fieldName, errors, "[0-9]+");
    }

    private void parseFieldWithPattern(JsonObject jsonObject, String fieldName, Set<String > errors, String pattern){
        if(jsonObject.containsKey(fieldName)){
            String number = jsonObject.getJsonNumber(fieldName).toString();
            if(!(number.matches(pattern))){
                errors.add(" # Error: Invalid  value for field '" + fieldName + "'.");
            }
        }
    }

    private void parseStringField(JsonObject jsonObject, String fieldName, Set<String > errors){
        if(jsonObject.containsKey(fieldName) && StringUtil.isNullOrEmpty(jsonObject.getString(fieldName))) {
            errors.add(" # Error: Missing input field value for '" + fieldName + "'.");
        }
    }

    private void validateDeviceMAC(JsonObject jsonObject, Set<String> errors){
        checkField(jsonObject, MAC_ADDRESS_PARAM_NAME, errors);
        if(jsonObject.containsKey(MAC_ADDRESS_PARAM_NAME) && StringUtil.isNullOrEmpty(jsonObject.getString(MAC_ADDRESS_PARAM_NAME))){
            errors.add(" # Error: Missing input field '" + MAC_ADDRESS_PARAM_NAME + "' value.");
            return;
        }
    }

    private FullHttpResponse sendErrorResponse(Set<String> errors){
        errors.forEach(error -> bytesData.writeBytes(error.getBytes()));
        return new DefaultFullHttpResponse(HTTP_1_1, HttpResponseStatus.BAD_REQUEST, bytesData);
    }

    private FullHttpResponse sendResponse(){
        FullHttpResponse res = new DefaultFullHttpResponse(HTTP_1_1, OK, bytesData);
        HttpHeaders.setContentLength(res, bytesData.readableBytes());
        return res;
    }

    private FullHttpResponse handleGetDevicesRequest(){
        /*Set<String> errors = new HashSet<>();
        validateMessageID(jsonObject, errors);
        if(!errors.isEmpty()) {
            return sendErrorResponse(errors);
        }*/
        bytesData.writeBytes(BLEDevicesMapHolder.getDevices().toString().getBytes());
        System.out.println("Sending devices");
        return sendResponse();
    }

    private FullHttpResponse handleGetServicesRequest(JsonObject jsonObject){
        Set<String> errors = new HashSet<>();
        validateDeviceMAC(jsonObject, errors);
        if(!errors.isEmpty()) {
            return sendErrorResponse(errors);
        }
        bytesData.writeBytes(("Services for device MAC = " + jsonObject.getString(MAC_ADDRESS_PARAM_NAME) + " coming ... ").getBytes());
        return sendResponse();
    }

}

