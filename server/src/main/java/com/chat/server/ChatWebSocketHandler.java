package com.chat.server;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.group.ChannelGroup;
import io.netty.channel.group.DefaultChannelGroup;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.timeout.IdleStateEvent;
import io.netty.util.concurrent.GlobalEventExecutor;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket 消息处理器
 *
 * 协议格式（JSON）：
 * 客户端 → 服务端:
 *   { "type": "join",    "username": "昵称" }
 *   { "type": "message", "content":  "消息" }
 *
 * 服务端 → 客户端:
 *   { "type": "message", "username": "发送者", "content": "内容", "time": "HH:mm" }
 *   { "type": "system",  "content": "系统提示" }
 *   { "type": "users",   "list": ["user1","user2"] }
 */
@io.netty.channel.ChannelHandler.Sharable
public class ChatWebSocketHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {

    // roomId → ChannelGroup
    private static final Map<String, ChannelGroup> rooms = new ConcurrentHashMap<>();
    // channelId → username
    private static final Map<String, String> usernames = new ConcurrentHashMap<>();
    // channelId → roomId
    private static final Map<String, String> channelRooms = new ConcurrentHashMap<>();

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        if (evt instanceof WebSocketServerProtocolHandler.HandshakeComplete) {
            // WebSocket 握手完成，提取 roomId
            WebSocketServerProtocolHandler.HandshakeComplete handshake =
                (WebSocketServerProtocolHandler.HandshakeComplete) evt;
            String uri = handshake.requestUri();  // /chat/{roomId}
            String roomId = extractRoomId(uri);

            channelRooms.put(ctx.channel().id().asShortText(), roomId);
            rooms.computeIfAbsent(roomId, k -> new DefaultChannelGroup(GlobalEventExecutor.INSTANCE));
            rooms.get(roomId).add(ctx.channel());

        } else if (evt instanceof IdleStateEvent) {
            // 心跳超时，关闭连接
            ctx.close();
        }
        super.userEventTriggered(ctx, evt);
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame frame) throws Exception {
        Channel channel = ctx.channel();
        String chanId = channel.id().asShortText();

        JsonNode node = JSON.readTree(frame.text());
        String type = node.path("type").asText();

        if ("join".equals(type)) {
            String name = node.path("username").asText("匿名").trim();
            if (name.isEmpty()) name = "匿名";
            usernames.put(chanId, name);

            String roomId = channelRooms.getOrDefault(chanId, "default");
            // 广播系统消息
            broadcastSystem(roomId, name + " 加入了聊天室");
            // 广播用户列表
            broadcastUsers(roomId);

        } else if ("message".equals(type)) {
            String content = node.path("content").asText("").trim();
            if (content.isEmpty()) return;

            String name = usernames.getOrDefault(chanId, "匿名");
            String roomId = channelRooms.getOrDefault(chanId, "default");

            ObjectNode msg = JSON.createObjectNode();
            msg.put("type", "message");
            msg.put("username", name);
            msg.put("content", content);
            msg.put("time", LocalTime.now().format(TIME_FMT));
            broadcastToRoom(roomId, msg.toString());
        }
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) {
        String chanId = ctx.channel().id().asShortText();
        String name = usernames.remove(chanId);
        String roomId = channelRooms.remove(chanId);

        if (roomId != null) {
            ChannelGroup group = rooms.get(roomId);
            if (group != null) group.remove(ctx.channel());
        }
        if (name != null && roomId != null) {
            broadcastSystem(roomId, name + " 离开了聊天室");
            broadcastUsers(roomId);
        }
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        ctx.close();
    }

    // ---- 工具方法 ----

    private String extractRoomId(String uri) {
        // /chat/myroom → myroom
        if (uri == null) return "default";
        String[] parts = uri.split("\\?")[0].split("/");
        if (parts.length >= 3) return parts[2];
        return "default";
    }

    private void broadcastToRoom(String roomId, String text) {
        ChannelGroup group = rooms.get(roomId);
        if (group != null) {
            group.writeAndFlush(new TextWebSocketFrame(text));
        }
    }

    private void broadcastSystem(String roomId, String content) {
        ObjectNode msg = JSON.createObjectNode();
        msg.put("type", "system");
        msg.put("content", content);
        broadcastToRoom(roomId, msg.toString());
    }

    private void broadcastUsers(String roomId) {
        ChannelGroup group = rooms.get(roomId);
        if (group == null) return;

        ArrayNode list = JSON.createArrayNode();
        for (Channel ch : group) {
            String name = usernames.get(ch.id().asShortText());
            if (name != null) list.add(name);
        }

        ObjectNode msg = JSON.createObjectNode();
        msg.put("type", "users");
        msg.set("list", list);
        broadcastToRoom(roomId, msg.toString());
    }
}
