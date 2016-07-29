package com.iotracks.iofabric.hal.ble.api;

import com.iotracks.iofabric.hal.ble.api.handlers.HttpRequestHandler;
import com.iotracks.iofabric.hal.ble.utils.BLEAPIURLType;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.*;
import io.netty.handler.codec.http.websocketx.WebSocketFrame;
import io.netty.util.CharsetUtil;
import io.netty.util.concurrent.EventExecutorGroup;
import io.netty.util.concurrent.Future;
import io.netty.util.concurrent.GenericFutureListener;

import java.util.concurrent.*;
import java.util.logging.Logger;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEAPIServerHandler extends SimpleChannelInboundHandler<Object> {

    private static final Logger log = Logger.getLogger(BLEAPIServerHandler.class.getName());

    private final EventExecutorGroup executor;
    private final boolean ssl;

    public BLEAPIServerHandler(boolean ssl , EventExecutorGroup executor) {
        super(false);
        this.ssl = ssl;
        this.executor = executor;
    }

    /**
     * Method to be called on when channel receives data
     *
     * @param ctx - ChannelHandlerContext
     * @param data - Object
     */
    @Override
    public void channelRead0(ChannelHandlerContext ctx, Object data) {
        try {
            if (data instanceof FullHttpRequest) {
                handleHttpRequest(ctx, (FullHttpRequest) data);
            } else if (data instanceof WebSocketFrame) {
                WebSocketFrame frame = (WebSocketFrame) data;
                //handleSocketFrame(ctx, frame);
                log.info("Socket functionality not implemented yet. Coming soon.");
            }
        } catch (Exception e) {
            log.warning("Failed to initialize channel for the request: " + e.getMessage());
        }
    }

    /**
     * Handles FullHttpRequest
     *
     * @param ctx - ChannelHandlerContext
     */
    private void handleHttpRequest(ChannelHandlerContext ctx, FullHttpRequest request) throws Exception {

        runTask(new HttpRequestHandler(request, ctx.alloc().buffer(), BLEAPIURLType.getByUrl(request.getUri())), ctx, request);
        /*BLEAPIURLType urlType = BLEAPIURLType.getByUrl(request.getUri());
        if (urlType != null){
            runTask(new HttpRequestHandler(request, ctx.alloc().buffer(), urlType), ctx, request);
        } else {
            // TODO handle socket first connection
            System.out.println("Handle first socket connection coming.");
        }*/
    }

    /**
     * Method to be called on channel complete
     *
     * @param ctx - ChannelHandlerContext
     * @return void
     */
    @Override
    public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
        ctx.flush();
    }

    /**
     * Executes callable to send HTTP response on operation complete
     *
     * @param callable - Callable,
     * @param ctx - ChannelHandlerContext
     * @param req - FullHttpRequest
     */
    private void runTask(Callable<? extends Object> callable, ChannelHandlerContext ctx, HttpRequest req) {
        final Future<? extends Object> future = executor.submit(callable);
        future.addListener(new GenericFutureListener<Future<Object>>() {
            public void operationComplete(Future<Object> future)
                    throws Exception {
                if (future.isSuccess()) {
                    sendHttpResponse(ctx, req, (FullHttpResponse) future.get());
                } else {
                    ctx.fireExceptionCaught(future.cause());
                    ctx.close();
                }
            }
        });
    }

    /**
     * Sends HTTP response
     *
     * @param ctx - ChannelHandlerContext,
     * @param req - FullHttpRequest,
     * @param res - FullHttpResponse
     */
    private static void sendHttpResponse(ChannelHandlerContext ctx, HttpRequest req, FullHttpResponse res) throws Exception {
        if (res.getStatus().code() != 200) {
            ByteBuf buf = Unpooled.copiedBuffer(res.getStatus().toString(), CharsetUtil.UTF_8);
            res.content().writeBytes(buf);
            buf.release();
            HttpHeaders.setContentLength(res, res.content().readableBytes());
        }

        ChannelFuture f = ctx.channel().writeAndFlush(res);
        if (!HttpHeaders.isKeepAlive(req) || res.getStatus().code() != 200) {
            f.addListener(ChannelFutureListener.CLOSE);
        }
    }

}
