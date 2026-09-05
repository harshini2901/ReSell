import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function CallModal() {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // To keep track of the specific conversation and other user ID
  const [activeCallTo, setActiveCallTo] = useState(null);

  const userAudio = useRef();
  const peerAudio = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    if (!socket) return;

    socket.on('incomingCall', (data) => {
      setReceivingCall(true);
      setCaller(data.callerName);
      setCallerSignal(data.signal);
      setActiveCallTo(data.from);
    });

    socket.on('callEnded', () => {
      endCall(false);
    });
    
    // We also listen for ICE candidates globally just in case
    socket.on('iceCandidate', (data) => {
      if (connectionRef.current) {
        connectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(e => console.error(e));
      }
    });

    return () => {
      socket.off('incomingCall');
      socket.off('callEnded');
      socket.off('iceCandidate');
    };
  }, [socket]);

  const setupWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      if (userAudio.current) {
        userAudio.current.srcObject = stream;
      }
      
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });

      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
      });

      peer.ontrack = (event) => {
        if (peerAudio.current) {
          peerAudio.current.srcObject = event.streams[0];
        }
      };
      
      peer.onicecandidate = (event) => {
        if (event.candidate && activeCallTo) {
          socket.emit('iceCandidate', {
            to: activeCallTo,
            candidate: event.candidate
          });
        }
      };

      connectionRef.current = peer;
      return peer;
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Microphone access is required for calls.');
      return null;
    }
  };

  const answerCall = async () => {
    setCallAccepted(true);
    const peer = await setupWebRTC();
    if (!peer) return endCall(false);

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(callerSignal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit('answerCall', { signal: answer, to: activeCallTo });
    } catch (err) {
      console.error('Error answering call', err);
    }
  };

  const endCall = (emitEvent = true) => {
    setCallEnded(true);
    if (emitEvent && activeCallTo && socket) {
      socket.emit('endCall', { to: activeCallTo });
    }
    
    if (connectionRef.current) {
      connectionRef.current.close();
    }
    
    if (userAudio.current && userAudio.current.srcObject) {
      userAudio.current.srcObject.getTracks().forEach(track => track.stop());
    }

    // Reset state
    setTimeout(() => {
      setReceivingCall(false);
      setCallAccepted(false);
      setCallEnded(false);
      setCaller('');
      setCallerSignal(null);
      setActiveCallTo(null);
      setIsMuted(false);
      connectionRef.current = null;
    }, 1000);
  };
  
  const toggleMute = () => {
    if (userAudio.current && userAudio.current.srcObject) {
      const audioTrack = userAudio.current.srcObject.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // If not receiving a call or if the call has ended completely, don't render
  if (!receivingCall && !callAccepted) return null;

  return (
    <div style={{
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--surface-solid)', padding: '1.5rem 2rem', borderRadius: '24px',
      boxShadow: 'var(--shadow-lg)', zIndex: 10000, minWidth: '300px', textAlign: 'center',
      border: '1px solid var(--border)'
    }}>
      <audio playsInline ref={userAudio} autoPlay muted />
      <audio playsInline ref={peerAudio} autoPlay />

      {!callAccepted && !callEnded ? (
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Incoming Call...</h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600' }}>{caller}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={answerCall} style={{ background: '#10b981', color: 'white' }}>
              Accept
            </button>
            <button onClick={() => endCall(true)} style={{ background: '#ef4444', color: 'white' }}>
              Decline
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Active Call</h3>
          <p style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: '600' }}>{caller}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={toggleMute} style={{ background: isMuted ? '#f59e0b' : 'var(--surface)', color: isMuted ? 'white' : 'var(--text-main)', border: '1px solid var(--border)' }}>
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={() => endCall(true)} style={{ background: '#ef4444', color: 'white' }}>
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
