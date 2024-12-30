const express = require('express');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');
const SimplePeer = require('simple-peer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Enable CORS to accept requests from the frontend
app.use(cors());

// WebRTC signaling process
let peers = {}; // Store peers by userId for simplicity

// Endpoint to launch Edge via API
app.get('/launch-edge', (req, res) => {
  const userId = req.query.userId;

  if (!peers[userId]) {
    return res.status(404).json({ message: 'User not connected.' });
  }

  // Send the intent to launch Edge via WebRTC signaling
  const signalData = {
    type: 'launch-edge',
    url: 'https://www.example.com',  // Adjust as needed
  };

  // Send the command to the client
  peers[userId].send(JSON.stringify(signalData));

  res.json({ message: 'Command sent to client.' });
});

// WebRTC signaling (simple example, assumes one client)
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle incoming signal from the client
  socket.on('signal', (data) => {
    const { userId, signal } = data;
    if (peers[userId]) {
      peers[userId].signal(signal);
    }
  });

  // Register the client
  socket.on('register', (userId) => {
    peers[userId] = new SimplePeer({ initiator: false, trickle: false });

    // Send back the initial signal offer to the client
    peers[userId].on('signal', (signal) => {
      socket.emit('signal', { userId, signal });
    });

    peers[userId].on('data', (data) => {
      console.log('Received data from client:', data.toString());
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const userId in peers) {
      if (peers[userId] && peers[userId].socket === socket) {
        delete peers[userId];
        break;
      }
    }
  });
});

// Start the server
const port = 5040;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});