let peer;
let dataChannel;
let myConnectionCode = '';
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const myCodeInput = document.getElementById('my-code-input');
const friendCodeInput = document.getElementById('friend-code');
const offerOutput = document.getElementById('offer-output');
const iceOutput = document.getElementById('ice-output');
const friendOfferInput = document.getElementById('friend-offer');
const friendIceInput = document.getElementById('friend-ice');
const copyOfferBtn = document.getElementById('copy-offer');
const copyIceBtn = document.getElementById('copy-ice');

// Set your custom connection code
function setMyCode() {
    myConnectionCode = myCodeInput.value.trim();
    if (!myConnectionCode) {
        alert("Please enter a valid code!");
        return;
    }
    myCodeDisplay.textContent = myConnectionCode;
    myCodeInput.disabled = true; // Prevent changing after setting
}

// Initialize WebRTC Peer Connection
function initPeerConnection(isInitiator) {
    peer = new RTCPeerConnection();

    if (isInitiator) {
        dataChannel = peer.createDataChannel('chat');
        dataChannel.onmessage = (event) => displayMessage(event.data);
        dataChannel.onopen = () => status.textContent = "Connected! Start chatting.";
        dataChannel.onclose = () => status.textContent = "Connection closed.";
    } else {
        peer.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onmessage = (event) => displayMessage(event.data);
            dataChannel.onopen = () => status.textContent = "Connected! Start chatting.";
            dataChannel.onclose = () => status.textContent = "Connection closed.";
        };
    }

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            iceOutput.textContent = JSON.stringify(event.candidate);
            copyIceBtn.style.display = 'inline';
        }
    };

    if (isInitiator) {
        peer.createOffer()
            .then(offer => peer.setLocalDescription(offer))
            .then(() => {
                offerOutput.textContent = JSON.stringify(peer.localDescription);
                copyOfferBtn.style.display = 'inline';
            });
    }
}

// Start the connection process
function startConnection() {
    if (!myConnectionCode) {
        alert("Please set your connection code first!");
        return;
    }
    const friendCode = friendCodeInput.value.trim();
    if (!friendCode) {
        alert("Please enter your friend's connection code!");
        return;
    }

    const isInitiator = myConnectionCode < friendCode;
    initPeerConnection(isInitiator);
    status.textContent = "Waiting for signaling details...";
}

// Complete the connection with friend's offer/ICE
function completeConnection() {
    const friendOffer = friendOfferInput.value.trim();
    const friendIce = friendIceInput.value.trim();

    if (!friendOffer || !friendIce) {
        alert("Please paste both your friend's offer and ICE candidate!");
        return;
    }

    if (peer.localDescription.type === 'offer') {
        // Initiator waits for answer
        peer.setRemoteDescription(JSON.parse(friendOffer))
            .then(() => peer.addIceCandidate(JSON.parse(friendIce)))
            .catch(err => alert("Error: " + err));
    } else {
        // Non-initiator sets offer and responds with answer
        peer.setRemoteDescription(JSON.parse(friendOffer))
            .then(() => peer.createAnswer())
            .then(answer => peer.setLocalDescription(answer))
            .then(() => {
                offerOutput.textContent = JSON.stringify(peer.localDescription);
                copyOfferBtn.style.display = 'inline';
            })
            .then(() => peer.addIceCandidate(JSON.parse(friendIce)))
            .catch(err => alert("Error: " + err));
    }
}

// Copy text to clipboard
function copyText(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text)
        .then(() => alert("Copied to clipboard!"))
        .catch(err => alert("Failed to copy: " + err));
}

// Display incoming or outgoing messages/files
function displayMessage(data) {
    if (typeof data === 'string') {
        const msg = document.createElement('p');
        msg.textContent = data;
        chatBox.appendChild(msg);
    } else {
        const url = URL.createObjectURL(new Blob([data]));
        const element = data.type.startsWith('image') ? document.createElement('img') : document.createElement('video');
        element.src = url;
        element.controls = true;
        element.style.maxWidth = '100%';
        chatBox.appendChild(element);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Send text or file
function sendMessage() {
    if (!dataChannel || dataChannel.readyState !== 'open') {
        alert("Not connected yet! Finish the connection first.");
        return;
    }

    const text = messageInput.value;
    const file = fileInput.files[0];

    if (text) {
        dataChannel.send(text);
        displayMessage("You: " + text);
        messageInput.value = '';
    }
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            dataChannel.send(reader.result);
            displayMessage(file);
        };
        reader.readAsArrayBuffer(file);
        fileInput.value = '';
    }
}
