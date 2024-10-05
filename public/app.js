import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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
const auth = getAuth();
const db = getFirestore(app);
const socket = io.connect('http://localhost:3000');

// Room management
let localStream;
let peerConnection;
const roomInput = document.getElementById('roomInput');
const joinButton = document.getElementById('joinButton');
const leaveButton = document.getElementById('leaveButton');
const chatContainer = document.getElementById('chatContainer');
const roomNameDisplay = document.getElementById('roomName');
const remoteAudio = document.getElementById('remoteAudio');

// Authentication
document.getElementById('signUpButton').onclick = () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            alert('Sign Up Successful! You can now log in.');
        })
        .catch((error) => {
            alert(error.message);
        });
};

document.getElementById('loginButton').onclick = () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainInterface').classList.remove('hidden');
        })
        .catch((error) => {
            alert(error.message);
        });
};

// Join Room Automatically After Creation
document.getElementById('createRoomButton').onclick = async () => {
    const roomName = prompt("Enter the name for your room:");
    if (roomName) {
        try {
            // Add room to Firestore
            await addDoc(collection(db, 'rooms'), { name: roomName });
            console.log("Room created:", roomName);
            // Automatically join the room after creation
            joinRoom(roomName);
        } catch (error) {
            console.error("Error creating room:", error);
        }
    }
};

// Join an Existing Room from the List
function createRoomList() {
    const roomListContainer = document.getElementById('roomListContainer');
    roomListContainer.innerHTML = ''; // Clear the list before reloading it

    getDocs(collection(db, 'rooms')).then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const roomItem = document.createElement('div');
            roomItem.textContent = doc.data().name;
            roomItem.classList.add('roomItem');
            roomItem.onclick = () => {
                joinRoom(doc.data().name);  // Join the clicked room
            };
            roomListContainer.appendChild(roomItem);
        });
    }).catch((error) => {
        console.error("Error fetching rooms:", error);
    });
}

document.getElementById('roomListButton').onclick = () => {
    document.getElementById('roomListContainer').classList.remove('hidden');
    createRoomList();  // Load the room list
};

// Join Room Function
async function joinRoom(roomName) {
    roomNameDisplay.textContent = roomName;
    chatContainer.classList.remove('hidden');
    localStream = await startVoiceChat();
    createPeerConnection(roomName);
}

// Leave Room
leaveButton.onclick = () => {
    chatContainer.classList.add('hidden');
    roomNameDisplay.textContent = '';
    socket.disconnect();
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
function createPeerConnection(roomName) {
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
}
