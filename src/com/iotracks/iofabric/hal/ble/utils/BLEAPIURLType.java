package com.iotracks.iofabric.hal.ble.utils;

import io.netty.handler.codec.http.HttpMethod;

/**
 * @author ilaryionava
 * @since 2016
 */
public enum BLEAPIURLType {

    GET_DEVICES_LIST ("/hal/ble/devices", HttpMethod.GET) ,
    GET_SERVICES_LIST ("/hal/ble/services", HttpMethod.POST);

    private String url;
    private HttpMethod httpMethod;

    BLEAPIURLType(String url, HttpMethod httpMethod){
        this.url = url;
        this.httpMethod = httpMethod;
    }

    public String getURL(){
        return this.url;
    }

    public HttpMethod getHttpMethod(){
        return this.httpMethod;
    }

    public static BLEAPIURLType getByUrl(String url){
        for (BLEAPIURLType urlType : BLEAPIURLType.values()) {
            if(urlType.getURL().equals(url)){
                return urlType;
            }
        }
        return null;
    }
}
