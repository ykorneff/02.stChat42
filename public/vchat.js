let socket = io();
let videoElemints = new Array;
let roomId = localStorage.roomId;
let nickName = localStorage.nickName;
let mainDiv = document.getElementById("mainDiv");
let body= document.getElementsByTagName('body')
let localStream;
let remoteStream;
let streams = new Array;
let isOwner=false;
let isStarted=false;
let isChannelReady=false;
let peerConnection;


function makeId(l) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < l; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

let currentConstraints ={
    video: true,
    //audio: true
    audio: false
};


let session = {
    id: makeId(32),
    room: roomId,
    userName: nickName,
    owner: undefined
}

let signalMessage = {
    id: -2,
    from: nickName,
    room: roomId,
    text: '', //use for label
    type: undefined,
    canditate: undefined
};

var newVideo;

function createVideoElement(uName){
    newVideo = document.createElement("VIDEO");
    newVideo.id=`videoFrom_${uName}`;
    newVideo.setAttribute('muted','false');
    newVideo.setAttribute('autoplay','');
    newVideo.setAttribute('class', `videoFrom_${uName}`);
    videoElemints.push(newVideo);
}

function handleIceCandidate(event){
    console.log(`ICE canditate event ${event}`);
    if (event.canditate) {
        signalMessage.type = 'candidate';
        signalMessage.text = event.canditate.canditate;
        signalMessage.id = event.canditate.sdpMid;
        sendSignaling(signalMessage);
    } else {
        console.log('End of candidates.');
    }
}

function handleRemoteStreamAdded(event){
        //add remote video element
    let uName = makeId(5);
    console.log(`Creating videoelement ${uName}`);
    createVideoElement(uName);
    remoteStream = event.stream;
    streams.push(event.stream);
    document.getElementById(`videoFrom_${uName}`).srcObject=event.stream;
    //videoElemints.push(document.getElementById(`videoFrom_${uName}`));
    //videoElemints[videoElemints.length-1].srcObject = streams[streams.length-1];
    console.log(`Remote stream added`);
    console.log(`VideoElement: ${videoElemints.length-1}`);
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
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        return;
    }
}

function makeCall(){
    console.log(`Sending offer to peer`);
    peerConnection.createOffer().
    then(function (sessionDescription){
        peerConnection.setLocalDescription(sessionDescription);
        console.log('setLocalAndSendMessage sending signaling message', sessionDescription);
        sendSignaling(sessionDescription);        
    }).
    catch(function (err){
        console.log(`createOffer() error: ${err}`);
    })
}

function startAttempt(){
    console.log(`#### ${nickName} attempts to start`, isOwner,isStarted,localStream, isChannelReady);
    if (!isStarted && isChannelReady) {
        console.log(`create peer connection`);
        createPeerConnection();
        peerConnection.addStream(streams[0]);
        //peerConnection.addStream(localStream);
        isStarted = true;
        if (isOwner) {
            makeCall();
        }
    }
}

function sendSignaling(signal){
    console.log(`Signaling: ${signal}`);
    signalMessage.text=signal;
    socket.emit('signal', signalMessage);
}

socket.emit('enter video room',session);
console.log('entering video room')



socket.on('joined', (ses)=>{


    if (ses.owner){
        console.log(ses.owner);
        isOwner = true;
        console.log(`owner: ${ses.userName}`);
    } else {
        console.log(ses.owner);
    }
    createVideoElement('local');
    navigator.mediaDevices.getUserMedia(currentConstraints)
    .then ((stream)=>{
        localStream=stream;
        streams.push(localStream);
        videoElemints[0].srcObject=streams[0];
        document.body.appendChild(videoElemints[0]); 
        isChannelReady = true;
        
    })
    .catch((err)=>{
        console.log(err);
    });
        
    sendSignaling('got local media');



    console.log(`Session = ${ses.id}\nOwner = ${ses.owner}`);
});

function makeAnswer(){
    console.log('Sending answer to peer.');

    peerConnection.createAnswer().
    then( function (sessionDescription) {
        peerConnection.setLocalDescription(sessionDescription);
        console.log('setLocalAndSendMessage sending message', sessionDescription);
        sendSignaling(sessionDescription);
    }).
    catch(function(err){
        console.log(`Error: ${err}`);
        create
    });
}

socket.on('signal', (sMessage)=>{
    console.log(`-> signailng ${sMessage.text}`);
    if (sMessage.text==='got local media'){
        console.log(`##$_001`);
        startAttempt();
    } else if (sMessage.text.type==='offer'){
        console.log(`##$_002`);
        if (!isOwner&&!isStarted){
            console.log(`##$_003`);
            startAttempt();
        }
        //console.log(`PeerConection:\n${peerConnection}`);
        try {
            console.log(`##$_A003`);
            console.log(`Trying to create peer connection`)
            peerConnection.setRemoteDescription(new RTCSessionDescription(sMessage.text));
        }
        catch(err){
            console.log(`##$_B003`);
            console.log(err);
            createPeerConnection();
            peerConnection.setRemoteDescription(new RTCSessionDescription(sMessage.text));
        }
        
        makeAnswer();
    } else if (sMessage.text.type==='answer' && isStarted){
        console.log(`##$_004`);
        peerConnection.setRemoteDescription(new RTCSessionDescription(sMessage.text));
    } else if (sMessage.text.type==='candidate' && isStarted) {
        console.log(`##$_005`);
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: sMessage.text,
            candidate: sMessage.candidate
        });
        peerConnection.addIceCandidate(candidate);
    } else if (sMessage.text.type==='bye' && isStarted){
        console.log(`##$_006`);
        handleRemoteHangup();
    }
});

socket.on('joined as visitor', (ses)=>{
    session = ses;
    console.log(`Session = ${session.id}\nOwner = ${session.owner}`);
});

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
}

function stop() {
    isStarted = false;
    peerConnection.close();
    peerConnection = null;
  }