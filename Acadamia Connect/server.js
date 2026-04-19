const express = require("express");
const session = require("express-session");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { initDB, addIndexes } = require("./db/database");
const { startScheduler } = require("./utils/notificationScheduler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

initDB();
addIndexes();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(session({
  secret: process.env.SESSION_SECRET || "academia-connect-secret-2026",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // No maxAge = session cookie (expires when browser closes)
    // This enforces re-login on every app return
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Make io available to route handlers
app.set("io", io);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/student", require("./routes/student"));
app.use("/api/teacher", require("./routes/teacher"));
app.use("/api/parent", require("./routes/parent"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/common", require("./routes/common"));

const connectedUsers = {};
io.on("connection", (socket) => {
  socket.on("join", (data) => {
    const userKey = `${data.userId}_${data.role}`;
    connectedUsers[userKey] = socket.id;
    socket.join(userKey); // Join personal room for direct messages
    socket.join("school_" + data.schoolId); // Join school room for broadcasts
    socket.userId = data.userId;
    socket.userRole = data.role;
    socket.schoolId = data.schoolId;
  });
  
  socket.on("send_message", (data) => {
    const targetKey = `${data.receiverId}_${data.receiverRole}`;
    io.to(targetKey).emit("new_message", data);
  });
  
  socket.on("typing", (data) => {
    const targetKey = `${data.receiverId}_${data.receiverRole}`;
    io.to(targetKey).emit("user_typing", { senderId: data.senderId, senderRole: data.senderRole });
  });
  
  socket.on("stop_typing", (data) => {
    const targetKey = `${data.receiverId}_${data.receiverRole}`;
    io.to(targetKey).emit("user_stopped_typing", { senderId: data.senderId, senderRole: data.senderRole });
  });
  
  socket.on("announcement", (data) => {
    io.to("school_" + data.schoolId).emit("new_announcement", data);
  });
  
  socket.on("video_comment", (data) => {
    io.to("school_" + socket.schoolId).emit("comment_added", data);
  });
  
  socket.on("disconnect", () => {
    Object.keys(connectedUsers).forEach(k => {
      if (connectedUsers[k] === socket.id) delete connectedUsers[k];
    });
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Academia Connect V2 running on http://localhost:" + PORT);
  // Start notification scheduler
  startScheduler();
});
