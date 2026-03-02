# 即时聊天服务器

基于 **Netty 4 + WebSocket** 的聊天服务器，支持局域网和互联网通信。

## 快速启动

### 编译
```bash
cd server
mvn clean package -DskipTests
```

### 运行
```bash
# 默认端口 8765，监听所有网卡
java -jar target/chat-server-1.0.0.jar

# 自定义端口
java -jar target/chat-server-1.0.0.jar 9090

# 自定义端口 + 绑定地址
java -jar target/chat-server-1.0.0.jar 9090 0.0.0.0
```

启动后终端会显示：
```
╔══════════════════════════════════════╗
║       即时聊天服务器已启动            ║
╠══════════════════════════════════════╣
║  局域网地址：192.168.1.100:8765      ║
║  本机地址：  127.0.0.1:8765          ║
║  WebSocket路径：/chat/{roomId}       ║
╚══════════════════════════════════════╝
```

---

## 使用场景

### 局域网聊天

1. 服务端机器运行 `java -jar chat-server.jar`
2. 查看终端显示的**局域网 IP**（如 `192.168.1.100`）
3. 同一 WiFi 下的其他用户，在前端填写该 IP + 端口即可连接

### 互联网聊天

1. 将服务器部署到云服务器（阿里云/腾讯云等）
2. 开放对应端口（默认 8765）的防火墙/安全组规则
3. 前端填写服务器**公网 IP 或域名** + 端口即可连接

---

## 协议说明

### 连接地址
```
ws://<host>:<port>/chat/<roomId>
```
- `roomId`：房间 ID，相同 ID 的用户在同一聊天室，留空则为 `default`

### 消息格式（JSON）

**客户端 → 服务端**
```json
// 加入房间（连接后第一条消息）
{ "type": "join", "username": "昵称" }

// 发送消息
{ "type": "message", "content": "消息内容" }
```

**服务端 → 客户端**
```json
// 聊天消息
{ "type": "message", "username": "发送者", "content": "内容", "time": "14:30" }

// 系统通知
{ "type": "system", "content": "xxx 加入了聊天室" }

// 在线用户列表（每次有人进出时推送）
{ "type": "users", "list": ["张三", "李四"] }
```

---

## 需要防火墙放行端口

**Windows**
```powershell
netsh advfirewall firewall add rule name="ChatServer" dir=in action=allow protocol=TCP localport=8765
```

**Linux (iptables)**
```bash
iptables -A INPUT -p tcp --dport 8765 -j ACCEPT
```

**云服务器**：在控制台的安全组/防火墙规则中，开放 TCP 8765 端口。
