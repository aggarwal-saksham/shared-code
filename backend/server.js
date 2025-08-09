const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Document = require('./models/Document');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true,
});

// REST API to create/get documents
app.post('/api/documents', async (req, res) => {
  const { name, content } = req.body;
  const doc = new Document({ name, content });
  await doc.save();
  res.json(doc);
});

app.get('/api/documents/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  res.json(doc);
});

// Start HTTP and Socket.io servers
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Collaborative editing via Socket.io
io.on('connection', (socket) => {
  socket.on('join-document', (documentId) => {
    socket.join(documentId);

    socket.on('edit-document', async ({ documentId, content }) => {
      socket.to(documentId).emit('receive-changes', content);
      await Document.findByIdAndUpdate(documentId, { content });
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
