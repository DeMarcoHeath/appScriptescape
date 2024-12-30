const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const SimplePeer = require('simple-peer');

const app = express();

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);

// Middleware to add CORS headers for all incoming HTTP requests
app.use((req, res, next) => {
  // Set the CORS headers manually
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins, or specify a URL for more security
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');  // Allow specific methods
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');  // Allow specific headers

  // If it's a preflight request (OPTIONS), we need to handle it and return the CORS headers
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Store peers by userId for simplicity
let peers = {};

// Endpoint to launch Edge via API
app.get('/launch-edge', (req, res) => {
  const userId = req.query.userId;

  if (!peers[userId]) {
    return res.status(404).json({ message: 'User not connected.' });
  }

  // Send the intent to launch Edge via WebRTC signaling
  const signalData = {
    type: 'launch-edge',
    url: 'https://www.example.com',  // Adjust URL as needed
  };

  // Send the command to the client
  peers[userId].send(JSON.stringify(signalData));

  res.json({ message: 'Command sent to client.' });
});

// WebRTC signaling process
const io = socketIo(server, {
  cors: {
    origin: '*',  // Allow all origins or specify your frontend URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
});

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

  // Handle client disconnection
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
const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
