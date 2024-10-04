// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAaFKCGZBvdAEZscUPyFSUQCyr6hEzSYM8",
    authDomain: "focusmate-905a6.firebaseapp.com",
    projectId: "focusmate-905a6",
    storageBucket: "focusmate-905a6.appspot.com",
    messagingSenderId: "420700192010",
    appId: "1:420700192010:web:46ae62aecb6db707cf0ef3",
    measurementId: "G-HDCEHBWS2R"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const socket = io.connect('http://localhost:3000');
let localStream;
let peerConnection;
const roomInput = document.getElementById('roomInput');
const joinButton = document.getElementById('joinButton');
const leaveButton = document.getElementById('leaveButton');
const chatContainer = document.getElementById('chatContainer');
const remoteAudio = document.getElementById('remoteAudio');

// Sign Up
document.getElementById('signUpButton').onclick = () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            console.log('User signed up');
            alert('Sign Up Successful! You can now log in.');
        })
        .catch((error) => {
            console.error('Error signing up:', error);
            alert(error.message);
        });
};

// Login
document.getElementById('loginButton').onclick = () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            console.log('User logged in');
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('roomInput').focus();
        })
        .catch((error) => {
            console.error('Error logging in:', error);
            alert(error.message);
        });
};

// Join Room
joinButton.onclick = async () => {
    const roomName = roomInput.value;
    if (roomName) {
        document.getElementById('roomName').textContent = roomName;
        chatContainer.classList.remove('hidden');
        localStream = await startVoiceChat();
        createPeerConnection();
    }
};

leaveButton.onclick = () => {
    socket.disconnect();
    chatContainer.classList.add('hidden');
    roomInput.value = '';
    document.getElementById('authContainer').classList.remove('hidden');
};

// Start Voice Chat
async function startVoiceChat() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return stream;
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

// Create Peer Connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, room: roomName });
        }
    };

    socket.on('offer', async (data) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { answer: answer, room: roomName });
    });

    socket.on('answer', async (data) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on('ice-candidate', async (data) => {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    socket.on('user-joined', (id) => {
        console.log(`User joined: ${id}`);
    });

    socket.on('user-left', (id) => {
        console.log(`User left: ${id}`);
    });
}
