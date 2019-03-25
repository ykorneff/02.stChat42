let currentConstraints ={
    video: true,
    audio: true
};

let roomId=42;
let isOwner=false;
var isReady=false;
let isStarted=false;
let localStream, remoteStream;
let localVideoElement, remoteVideoElement;
var turnReady;
let isChannelReady=false;

let dataChannel;

let fileReader;

//File send:
let receiveBuffer = [];
let receivedSize = 0;

let bytesPrev = 0;
let timestampPrev = 0;
let timestampStart;
let statsInterval = null;
let bitrateMax = 0;


let fileInput = document.getElementById('chooseFile');

function fileInfoOnChange (){
    let file = fileInput.files[0];
    if (!file) {
        console.log(`No file chosen`);
    } else {
        console.log(file);
    }
    
}

function sendFile(){
    fileReader = new FileReader();
    fileReader.addEventListener('load', e => {
        console.log('FileRead.onload ', e);
        dataChannel.send(e.target.result);
    });

}

function sendFileButtonOnClick(){
    sendFile();
}

let socket = io();
//'{"rtcpMuxPolicy":"require","bundlePolicy":"max-bundle","iceServers":[{"urls":["stun:74.125.143.127:19302","stun:[2a00:1450:4013:c03::7f]:19302"]},{"urls":["turn:74.125.143.127:19305?transport=udp","turn:[2a00:1450:4013:c03::7f]:19305?transport=udp","turn:74.125.143.127:19305?transport=tcp","turn:[2a00:1450:4013:c03::7f]:19305?transport=tcp"],"username":"CNuy2uQFEgYjS2n6HWYYzc/s6OMTIICjBQ","credential":"C2DUTHpstdak9f2VcFOl/sfV35o=","maxRateKbps":"8000"}],"certificates":[{}]}';
var pcConfig = {
    "rtcpMuxPolicy":"require",
    "bundlePolicy":"max-bundle",
    "iceServers":[
        {"urls":["stun:74.125.143.127:19302","stun:[2a00:1450:4013:c03::7f]:19302"]},
        {"urls":["turn:74.125.143.127:19305?transport=udp",
                "turn:[2a00:1450:4013:c03::7f]:19305?transport=udp",
                "turn:74.125.143.127:19305?transport=tcp",
                "turn:[2a00:1450:4013:c03::7f]:19305?transport=tcp"],
                "username":"CNuy2uQFEgYjS2n6HWYYzc/s6OMTIICjBQ",
                "credential":"C2DUTHpstdak9f2VcFOl/sfV35o=","maxRateKbps":"8000"}],
    };

function screenShareButtonOnClick(){
    navigator.mediaDevices.getDisplayMedia({video:true}).
    then((stream)=>{
        localStream=stream; 
        localVideoElement.srcObject=localStream;
        peerConnection.addStream(localStream);
    }).
    catch((e)=>{console.log(e)});
}

function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        socket.emit('_sigMessage',{
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
        console.log('End of candidates.');
    }
}

function handleDataChannelOpen (event) {
    console.log(`dataChannel.OnOpen ${event}`);
};

function sendButtonOnClick() {
    let  message;
    
    message=document.getElementById('m').value;
    dataChannel.send(message);
    console.log(`message: \n${message}\nsent`);
}

function handleDataChannelMessageReceived (event) {
    console.log(`dataChannel.OnMessage: ${event.data}`);
    var ul = document.getElementById("messages");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(event.data));
    ul.appendChild(li);
    //document.getElementById('messages').append($('<li>').text(event.data));
    //window.scrollTo(0, document.body.scrollHeight);
};

function handleDataChannelError (error) {
    console.log(`dataChannel.OnError: ${error}`);
};

function handleDataChannelClose (event) {
    console.log(`dataChannel.OnClose ${event}`);
};

function handleChannelCallback (event) {
     var receiveChannel = event.channel;
     receiveChannel.onopen = handleDataChannelOpen;
     receiveChannel.onmessage = handleDataChannelMessageReceived;
     receiveChannel.onerror = handleDataChannelError;
     receiveChannel.onclose = handleDataChannelClose;
};


function handleRemoteStreamAdded(event){
    remoteStream = event.stream;
    remoteVideoElement.srcObject=event.stream;
    console.log(`Remote stream added`);
}

function handleRemoteStreamRemoved(event){
    console.log('Remote stream removed. Event: ', event);
}

function createPeerConnection(){
    try {
        peerConnection = new RTCPeerConnection(pcConfig);
        peerConnection.ondatachannel = handleChannelCallback;
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
        dataChannel = peerConnection.createDataChannel('dataChannelName');

        dataChannel.onopen = handleDataChannelOpen;
        dataChannel.onmessage = handleDataChannelMessageReceived;
        dataChannel.onerror = handleDataChannelError;
        dataChannel.onclose = handleDataChannelClose;
    }
    catch (err){
        console.log('Failed to create PeerConnection, exception: ' + err.message);
        return;
    }
}

function makeCall(){
    console.log('Sending offer to peer');
    peerConnection.createOffer().
    then((sessionDescription)=>{
        peerConnection.setLocalDescription(sessionDescription);
        console.log(`set local description send message: \n${sessionDescription}`);
        socket.emit('_sigMessage', sessionDescription);
    }).
    catch((err)=>{
        console.log(err.message);
    });

}

function startAttempt(){
    console.log(`## startAttempt: started=${isStarted}; ready=${isReady}; localstream=${typeof localStream}`);
    if (!isStarted && (typeof localStream !=='undefined') && isReady) {
        console.log(`creating peer connection`);
        createPeerConnection();
        peerConnection.addStream(localStream);
        isStarted=true;
        console.log(`isOwner=${isOwner}`);
        if (isOwner){
            makeCall();
        }
    } else {
        console.log('startAttempt: do nothing')
    }
}

function makeAnswer(){
    console.log('Sending answer to peer.');

    peerConnection.createAnswer().
    then( function (sessionDescription) {
        peerConnection.setLocalDescription(sessionDescription);
        console.log('setLocalAndSendMessage sending message', sessionDescription);
        socket.emit('_sigMessage', sessionDescription);
    }).
    catch(function(err){
        console.log(`Error: ${err}`);
        
    });
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stopCall();
    isOwner = false;
 }
  
  function stopCall() {
    isStarted = false;
    peerConnection.close();
    peerConnection = null;
}

socket.emit('_sigInit',roomId);

navigator.mediaDevices.getUserMedia(currentConstraints).
then((stream)=>{
    localStream=stream;
    isChannelReady = true;
    localVideoElement = document.getElementById('localVideo');
    localVideoElement.srcObject=localStream;
    remoteVideoElement = document.getElementById('remoteVideo');
    socket.emit('_sigGotMedia', roomId);
}).
catch((err)=>{
    console.log(err);
});

socket.on('_sigJoinedAsInitiatior', (msg)=>{
    console.log(`Joined as initiator to room ${msg}`);
    isOwner=true;
});


socket.on('_sigGotMedia', (msg)=>{
    console.log(`got media in ${msg}`);
    startAttempt();
});

socket.on('_sigJoinedAsFollower', ()=>{
    console.log(`Joined as follower`);
    isReady = true;
});

socket.on('_sigReject', ()=>{
    console.log(`Request rejected`);
});

socket.on('_sigTrying', (msg)=>{
    console.log(`--- ${msg}`);
    isReady=msg;
    console.log(`Trying... isReady = ${isReady}`);
    startAttempt();
});


socket.on('_sigMessage', (msg)=>{
    if (msg.type==='offer'){
        if(!isOwner && !isStarted){
            startAttempt();
        }
        console.log('$$#@ 001:');
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
        makeAnswer();
    } else if (msg.type==='answer' && isStarted){
        console.log('$$#@ 002:');
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
    } else if (msg.type==='candidate' && isStarted){
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: msg.lable,
            candidate: msg.candidate
        });
        peerConnection.addIceCandidate(candidate);
    } 
});

socket.on('_sigBye', (roomId) => {
    if (isStarted){
        handleRemoteHangup();
    }
});