const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Simpan connected clients
const connectedClients = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Setup Socket.io
  const io = new Server(server, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);
    connectedClients.set(socket.id, socket);

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
      connectedClients.delete(socket.id);
    });

    // Join room untuk camera updates
    socket.on("join_camera_updates", (cameraId) => {
      socket.join(`camera:${cameraId}`);
      console.log(`📡 Client ${socket.id} joined camera:${cameraId}`);
    });

    // Leave room
    socket.on("leave_camera_updates", (cameraId) => {
      socket.leave(`camera:${cameraId}`);
      console.log(`📡 Client ${socket.id} left camera:${cameraId}`);
    });
  });

  // Simpan io instance untuk akses global dengan function yang lebih baik
  global.io = {
    emit: (event, data) => {
      io.emit(event, data);
    },
    emitToCamera: (cameraId, event, data) => {
      io.to(`camera:${cameraId}`).emit(event, data);
    },
    getConnectedCount: () => connectedClients.size,
  };

  server
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket available at /api/socket`);
    });
});
