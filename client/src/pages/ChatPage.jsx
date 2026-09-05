import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ChatPage() {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('newMessage', (message) => {
      // If the message belongs to the active chat, append it
      if (activeChat && message.conversationId === activeChat._id) {
        setMessages(prev => [...prev, message]);
        // Immediately mark as read if it's from the other person
        if (message.senderId._id !== user._id || message.senderId !== user._id) {
           socket.emit('markAsRead', { conversationId: activeChat._id });
        }
      }
      // Also refresh conversations to update lastMessage and sorting
      fetchConversations();
    });

    socket.on('messagesRead', ({ conversationId, readAt }) => {
      if (activeChat && activeChat._id === conversationId) {
        setMessages(prev => prev.map(m => {
          if (!m.readAt && m.senderId._id === user._id) {
            return { ...m, readAt };
          }
          return m;
        }));
      }
    });

    return () => {
      socket.off('newMessage');
      socket.off('messagesRead');
    };
  }, [socket, activeChat, user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/api/chat');
      setConversations(res.data.conversations);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const openConversation = async (conversation) => {
    setActiveChat(conversation);
    try {
      const res = await api.get(`/api/chat/${conversation._id}`);
      setMessages(res.data.messages);
      
      // Mark messages as read
      if (socket) {
        socket.emit('markAsRead', { conversationId: conversation._id });
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const msgText = newMessage;
    setNewMessage(''); // optimistic clear

    socket.emit('sendMessage', {
      conversationId: activeChat._id,
      text: msgText
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('image', file);
      
      const res = await api.post('/api/chat/image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      socket.emit('sendMessage', {
        conversationId: activeChat._id,
        imageUrl: res.data.imageUrl
      });
    } catch (err) {
      console.error('Failed to upload image', err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const initiateCall = async () => {
    if (!socket || !activeChat) return;
    
    try {
      // Find the other user's ID
      const otherUser = activeChat.participants.find(p => p._id !== user._id);
      if (!otherUser) return;

      // Ask for microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // Setup RTCPeerConnection to generate an offer
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit('callUser', {
        userToCall: otherUser._id,
        signalData: offer,
        from: user._id,
        conversationId: activeChat._id
      });
      
      // Note: Full local handling of the caller's peer connection should ideally be inside CallModal
      // For this phase, we just let the receiver accept it and wait. 
      // If the caller wants to hear audio, the full setup needs to be in CallModal.
      // We will trigger a fake 'incomingCall' to ourselves so the CallModal takes over the caller's view too, 
      // or we just show "Calling..." here.
      alert(`Calling ${otherUser.name}... (Waiting for them to accept)`);
      
    } catch (err) {
      console.error(err);
      alert('Could not start call. Check microphone permissions.');
    }
  };

  const getOtherParticipant = (participants) => {
    return participants.find(p => p._id !== user._id) || participants[0];
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 160px)', background: 'var(--surface-solid)', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', margin: 0 }}>Chats</h3>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map(conv => {
            const other = getOtherParticipant(conv.participants);
            const isActive = activeChat && activeChat._id === conv._id;
            
            return (
              <div 
                key={conv._id} 
                onClick={() => openConversation(conv)}
                style={{ 
                  padding: '1rem 1.5rem', 
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isActive ? 'var(--bg-color)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ fontWeight: '600' }}>{other.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', margin: '0.2rem 0' }}>
                  {conv.listingId?.title}
                </div>
                {conv.lastMessage && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.lastMessage.text || '📷 Image'}
                  </div>
                )}
              </div>
            );
          })}
          {conversations.length === 0 && (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No messages yet.</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '1.2rem 1.5rem', background: 'var(--surface-solid)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{getOtherParticipant(activeChat.participants).name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Regarding: {activeChat.listingId?.title}</span>
              </div>
              <button onClick={initiateCall} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '50px' }}>
                📞 Call
              </button>
            </div>

            {/* Messages Feed */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map(msg => {
                const isMine = msg.senderId._id === user._id || msg.senderId === user._id;
                
                return (
                  <div key={msg._id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                    <div style={{
                      background: isMine ? 'var(--primary)' : 'var(--surface-solid)',
                      color: isMine ? 'white' : 'var(--text-main)',
                      padding: '0.8rem 1.2rem',
                      borderRadius: '16px',
                      borderBottomRightRadius: isMine ? '4px' : '16px',
                      borderBottomLeftRadius: !isMine ? '4px' : '16px',
                      boxShadow: 'var(--shadow-sm)',
                      border: isMine ? 'none' : '1px solid var(--border)'
                    }}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: msg.text ? '0.5rem' : '0' }} />
                      )}
                      {msg.text && <div>{msg.text}</div>}
                    </div>
                    
                    {/* Read Receipt */}
                    {isMine && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.3rem' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                        {msg.readAt ? ' ✓✓ Seen' : ' ✓ Sent'}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{ padding: '1rem 1.5rem', background: 'var(--surface-solid)', borderTop: '1px solid var(--border)' }}>
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.8rem' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', background: 'var(--bg-color)', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold' }}>
                  {uploadingImage ? '...' : '📷'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploadingImage} />
                </label>
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  style={{ flex: 1, borderRadius: '50px' }}
                />
                <button type="submit" className="btn-primary" style={{ borderRadius: '50px' }} disabled={!newMessage.trim()}>
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
