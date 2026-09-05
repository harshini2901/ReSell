const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

const setupSocket = (io) => {
  // Middleware: Authenticate Socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user._id})`);
    
    // Join a personal room based on user ID to receive direct messages and calls
    const userRoom = `user_${socket.user._id.toString()}`;
    socket.join(userRoom);

    // ── CHAT EVENTS ────────────────────────────────────────────────────────
    
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, text, imageUrl } = data;
        
        // Ensure conversation exists and user is a participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(socket.user._id)) {
          return; // Unauthorized or invalid
        }

        // Save message to DB
        const newMessage = await Message.create({
          conversationId,
          senderId: socket.user._id,
          text,
          imageUrl
        });

        // Update conversation lastMessage
        conversation.lastMessage = newMessage._id;
        await conversation.save();

        // Determine recipient
        const recipientId = conversation.participants.find(
          (p) => p.toString() !== socket.user._id.toString()
        );

        const populatedMessage = await newMessage.populate('senderId', 'name');

        // Emit back to sender (for instant UI update)
        socket.emit('newMessage', populatedMessage);
        
        // Emit to recipient's personal room
        if (recipientId) {
          io.to(`user_${recipientId.toString()}`).emit('newMessage', populatedMessage);
        }
      } catch (err) {
        console.error('Error sending message:', err);
      }
    });

    socket.on('markAsRead', async (data) => {
      try {
        const { conversationId } = data;
        
        // Find all unread messages in this conversation sent by the OTHER person
        const messages = await Message.updateMany(
          { 
            conversationId, 
            senderId: { $ne: socket.user._id }, 
            readAt: null 
          },
          { readAt: new Date() }
        );

        if (messages.modifiedCount > 0) {
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            const otherUserId = conversation.participants.find(
              (p) => p.toString() !== socket.user._id.toString()
            );
            // Notify the sender that their messages were read
            if (otherUserId) {
              io.to(`user_${otherUserId.toString()}`).emit('messagesRead', {
                conversationId,
                readAt: new Date(),
                readBy: socket.user._id
              });
            }
          }
        }
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    });

    // ── WebRTC VOICE CALLING SIGNALING ──────────────────────────────────────

    // Initiating a call
    socket.on('callUser', (data) => {
      const { userToCall, signalData, from, conversationId } = data;
      // Send the offer to the specific user's room
      io.to(`user_${userToCall}`).emit('incomingCall', { 
        signal: signalData, 
        from, 
        callerName: socket.user.name,
        conversationId
      });
    });

    // Answering a call
    socket.on('answerCall', (data) => {
      const { to, signal } = data;
      // Send the answer back to the original caller
      io.to(`user_${to}`).emit('callAccepted', { signal });
    });

    // Exchanging ICE candidates
    socket.on('iceCandidate', (data) => {
      const { to, candidate } = data;
      io.to(`user_${to}`).emit('iceCandidate', { candidate });
    });
    
    // Ending/Rejecting a call
    socket.on('endCall', (data) => {
      const { to } = data;
      io.to(`user_${to}`).emit('callEnded');
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });
};

module.exports = setupSocket;
