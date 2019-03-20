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

let isChannelReady=false;

let socket = io();

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
        peerConnection = new RTCPeerConnection(null);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
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
   // isOwner=true;
    socket.emit('_sigGotMedia', roomId);
}).
catch((err)=>{
    console.log(err);
});

socket.on('_sigJoinedAsInitiatior', (msg)=>{
    console.log(`Joined as initiator to room ${msg}`);
    isOwner=true;
/*    navigator.mediaDevices.getUserMedia(currentConstraints).
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
*/
});



socket.on('_sigGotMedia', (msg)=>{
    console.log(`got media in ${msg}`);
    startAttempt();
});

socket.on('_sigJoinedAsFollower', ()=>{
    console.log(`Joined as follower`);
    //isReady
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