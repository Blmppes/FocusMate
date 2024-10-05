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
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);
const socket = io.connect('http://localhost:3000');

let localStream;
let peerConnection;
let isInRoom = false;
const roomInput = document.getElementById('roomInput');
const joinButton = document.getElementById('joinButton');
const leaveButton = document.getElementById('leaveButton');
const chatContainer = document.getElementById('chatContainer');
const roomNameDisplay = document.getElementById('roomName');
const remoteAudio = document.getElementById('remoteAudio');
const roomListContainer = document.getElementById('roomListContainer');

function clearInactivityAlert() {
    // Implement logic to clear any inactivity alert
}

// Add event listeners to handle visibility change and blur
document.addEventListener('visibilitychange', handleVisibilityChange);
window.onblur = handleVisibilityChange;
window.onfocus = () => {
    clearInactivityAlert();
};

// Handle visibility change
function handleVisibilityChange() {
    if (document.hidden && isInRoom) { // Only check inactivity if user is in a room
        const roomName = roomNameDisplay.textContent;
        socket.emit('leave-room', roomName); // Notify server
        alert("You've left the room due to inactivity.");
        chatContainer.classList.add('hidden');
        leaveButton.classList.add('hidden');
        roomNameDisplay.textContent = '';
        isInRoom = false; // Reset the room status
    }
}

// Sign Up
const signUpButton = document.getElementById('signUpButton');
signUpButton.onclick = () => {
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
const loginButton = document.getElementById('loginButton');
loginButton.onclick = () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            console.log('User logged in');
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainInterface').classList.remove('hidden');
            roomInput.focus();
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
        const roomsSnapshot = await getDocs(collection(firestore, "rooms"));
        const roomExists = roomsSnapshot.docs.some(doc => doc.data().name === roomName);

        if (roomExists) {
            roomNameDisplay.textContent = roomName;
            chatContainer.classList.remove('hidden');
            leaveButton.classList.remove('hidden'); // Show Leave Room button
            isInRoom = true; // Set to true when joining a room
            localStream = await startVoiceChat();
            createPeerConnection();

            // Notify server that user has joined the room
            socket.emit('join-room', roomName);
            alert("You are now in the room. Please focus on this app.");
        } else {
            alert("The room does not exist. Please check the room name.");
        }
    } else {
        alert("Please enter a room name.");
    }
};


// Leave Room
leaveButton.onclick = () => {
    const roomName = roomNameDisplay.textContent;
    socket.emit('leave-room', roomName); // Notify server
    chatContainer.classList.add('hidden');
    roomNameDisplay.textContent = '';
    leaveButton.classList.add('hidden'); // Hide Leave Room button
    isInRoom = false; // Reset the room status
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
            socket.emit('ice-candidate', { candidate: event.candidate, room: roomNameDisplay.textContent });
        }
    };

    socket.on('offer', async (data) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { answer: answer, room: roomNameDisplay.textContent });
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

    socket.on('disconnect-users', () => {
        alert("You have been disconnected from the room.");
        chatContainer.classList.add('hidden');
        leaveButton.classList.add('hidden');
        roomNameDisplay.textContent = '';
    });
}

// Room List button functionality
const roomListButton = document.getElementById('roomListButton');
roomListButton.onclick = async () => {
    const rooms = await getDocs(collection(firestore, "rooms"));
    roomListContainer.innerHTML = ''; // Clear previous rooms
    rooms.forEach((doc) => {
        const li = document.createElement('li');
        li.textContent = doc.data().name; // Use the stored room name
        li.onclick = async () => {
            // Join the room
            const roomName = doc.data().name;
            socket.emit('join-room', roomName); // Use the stored room name
            roomNameDisplay.textContent = roomName; // Update room name display
            chatContainer.classList.remove('hidden');
            leaveButton.classList.remove('hidden'); // Show Leave Room button
            isInRoom = true; // Set to true when joining a room

            // Start voice chat
            localStream = await startVoiceChat();
            createPeerConnection();

            alert("You are now in the room. Please focus on this app.");
        };
        roomListContainer.appendChild(li);
    });
    roomListContainer.classList.remove('hidden');
};


// Create Room functionality
const createRoomButton = document.getElementById('createRoomButton');
createRoomButton.onclick = async () => {
    const roomName = prompt("Enter room name:");
    if (roomName) {
        await addDoc(collection(firestore, "rooms"), { name: roomName }); // Save room name in Firestore
        socket.emit('join-room', roomName);
        chatContainer.classList.remove('hidden');

        // Start voice chat
        localStream = await startVoiceChat();
        createPeerConnection();

        roomNameDisplay.textContent = roomName;
        leaveButton.classList.remove('hidden');
        alert("You are now in a room. Please focus on this app.");
    }
};
