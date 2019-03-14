let currentConstraints ={
    video: true,
    audio: true
};

let roomId=42;

let localStream, remoteStream;
let localVideoElement, remoteVideoElement;

let isChannelReady=false;

let socket = io();

navigator.mediaDevices.getUserMedia(currentConstraints).
then((stream)=>{
    localStream=stream;
    isChannelReady = true;
    localVideoElement = document.getElementById('localVideo');
    localVideoElement.srcObject=localStream;
    remoteVideoElement = document.getElementById('remoteVideo');
}).
catch((err)=>{
    console.log(err);
});

socket.emit('_sigInit',roomId);

socket.on('_sigJoinedAsInitiatior', ()=>{
    console.log(`Joined as initiator`);
});

socket.on('_sigJoinedAsFollower', ()=>{
    console.log(`Joined as follower`);
});

socket.on('_sigReject', ()=>{
    console.log(`Request rejected`);
});