let currentConstraints ={
    video: true,
    audio: true
};

let roomId=42;
let isOwner=false;
var isReady=false;
let localStream, remoteStream;
let localVideoElement, remoteVideoElement;

let isChannelReady=false;

let socket = io();

socket.emit('_sigInit',roomId);

socket.on('_sigJoinedAsInitiatior', (msg)=>{
    console.log(`Joined as initiator to room ${msg}`);
    navigator.mediaDevices.getUserMedia(currentConstraints).
    then((stream)=>{
        localStream=stream;
        isChannelReady = true;
        localVideoElement = document.getElementById('localVideo');
        localVideoElement.srcObject=localStream;
        remoteVideoElement = document.getElementById('remoteVideo');
        isOwner=true;
        socket.emit('_sigGotMedia', roomId);
    }).
    catch((err)=>{
        console.log(err);
    });

});

socket.on('_sigJoinedAsFollower', ()=>{
    console.log(`Joined as follower`);
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

});

socket.on('_sigReject', ()=>{
    console.log(`Request rejected`);
});

socket.on('_sigTrying', (msg)=>{
    isReady=msg;
    console.log(`Trying... isReady = ${isReady}`);
})