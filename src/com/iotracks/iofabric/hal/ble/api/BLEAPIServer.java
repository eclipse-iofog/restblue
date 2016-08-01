package com.iotracks.iofabric.hal.ble.api;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpServerCodec;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.util.SelfSignedCertificate;
import io.netty.util.concurrent.DefaultEventExecutorGroup;
import java.util.logging.Logger;

/**
 * @author ilaryionava
 * @since 2016
 */
public class BLEAPIServer {

    private static final Logger log = Logger.getLogger(BLEAPIServer.class.getName());

    EventLoopGroup bossGroup = new NioEventLoopGroup(1);
    EventLoopGroup workerGroup = new NioEventLoopGroup(10);

    static final boolean SSL = System.getProperty("ssl") != null;
    static final int PORT = 56789;

    /**
     * Create and start HAL API server
     */
    public void start() throws Exception {
        final SslContext sslCtx;
        if (SSL) {
            SelfSignedCertificate ssc = new SelfSignedCertificate();
            sslCtx = SslContextBuilder.forServer(ssc.certificate(), ssc.privateKey()).build();
        } else {
            sslCtx = null;
        }
        try{
            ServerBootstrap b = new ServerBootstrap();
            b.group(bossGroup, workerGroup)
                    .channel(NioServerSocketChannel.class)
                    .childHandler(
                            new ChannelInitializer() {
                                @Override
                                protected void initChannel(Channel channel) throws Exception {
                                    ChannelPipeline pipeline = channel.pipeline();
                                    if (sslCtx != null) {
                                        pipeline.addLast(sslCtx.newHandler(channel.alloc()));
                                    }
                                    pipeline.addLast(new HttpServerCodec());
                                    pipeline.addLast(new HttpObjectAggregator(Integer.MAX_VALUE));
                                    pipeline.addLast(new BLEAPIServerHandler(sslCtx != null, new DefaultEventExecutorGroup(10)));
                                }
                            });

            Channel ch = b.bind(PORT).sync().channel();
            log.info("Bluetooth API server started at port: " + PORT + "\n");
            ch.closeFuture().sync();
        }finally{
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();

        }
    }

    /**
     * Stop HAL API server
     */
    protected void stop() throws Exception {
        bossGroup.shutdownGracefully();
        workerGroup.shutdownGracefully();
        log.info("Bluetooth API server stopped\n");
    }
}
