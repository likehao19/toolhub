package com.chat.server;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpServerCodec;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.stream.ChunkedWriteHandler;
import io.netty.handler.timeout.IdleStateHandler;

import java.net.InetAddress;
import java.util.concurrent.TimeUnit;

/**
 * WebSocket 聊天服务器
 * 用法：
 *   java -jar chat-server.jar              # 默认端口 8765
 *   java -jar chat-server.jar 9090         # 自定义端口
 *   java -jar chat-server.jar 9090 0.0.0.0 # 自定义端口+绑定地址
 */
public class ChatServer {

    private final int port;
    private final String host;

    public ChatServer(int port, String host) {
        this.port = port;
        this.host = host;
    }

    public void start() throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup(1);
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap b = new ServerBootstrap();
            b.group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline()
                            // 心跳检测：60s 无读取则断开
                            .addLast(new IdleStateHandler(60, 0, 0, TimeUnit.SECONDS))
                            // HTTP 编解码
                            .addLast(new HttpServerCodec())
                            .addLast(new ChunkedWriteHandler())
                            // 聚合 HTTP 请求（最大 64KB）
                            .addLast(new HttpObjectAggregator(65536))
                            // WebSocket 握手，路径为 /chat/{roomId}
                            .addLast(new WebSocketServerProtocolHandler("/chat", null, true))
                            // 业务处理
                            .addLast(new ChatWebSocketHandler());
                    }
                });

            ChannelFuture future = b.bind(host, port).sync();
            String localIp = InetAddress.getLocalHost().getHostAddress();

            System.out.println("╔══════════════════════════════════════╗");
            System.out.println("║       即时聊天服务器已启动            ║");
            System.out.println("╠══════════════════════════════════════╣");
            System.out.printf ("║  局域网地址：%-26s ║%n", localIp + ":" + port);
            System.out.printf ("║  本机地址：  %-26s ║%n", "127.0.0.1:" + port);
            System.out.println("║  WebSocket路径：/chat/{roomId}       ║");
            System.out.println("║  按 Ctrl+C 停止服务                   ║");
            System.out.println("╚══════════════════════════════════════╝");

            future.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }

    public static void main(String[] args) throws Exception {
        int port = 8765;
        String host = "0.0.0.0";  // 监听所有网卡，局域网和互联网均可访问

        if (args.length >= 1) {
            port = Integer.parseInt(args[0]);
        }
        if (args.length >= 2) {
            host = args[1];
        }

        new ChatServer(port, host).start();
    }
}
