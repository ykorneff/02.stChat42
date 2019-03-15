//import './app.css';

let path = require('path');
let express = require('express');

let app= express();
app.use('/styles', express.static('public'));
app.use('/scripts', express.static('public'));
console.log(__dirname);

let fs = require('fs');
let isReady=false;
//let participants = 0;

let privateKey = fs.readFileSync('key.pem').toString();
let certificate = fs.readFileSync('cert.pem').toString();
let credentials = {
  key: privateKey,
  cert: certificate,
};
let https = require('https').Server(credentials,app);
//let http = require('http').Server(app);
let io = require('socket.io')(https);
//let io = require('socket.io')(http);

let rooms = new Map;
let currentRoom = {
    id: undefined,
    owner: undefined,
    visitorsAmount:0,
    visitors: []
};

let room42 = {
    id: 42,
    owner: undefined,
    visitorsAmount:0,
    visitors: []
};


app.get('/', function(req, res){
    res.sendFile(`${__dirname}/index.html` );
});

app.get('/chat', function(req, res){
    res.sendFile(`${__dirname}/chat.html` );
});

app.get('/vchat', (req,res) => {
    res.sendFile(`${__dirname}/vchat.html` );
});

let sessions=[];
io.on('connection', function(socket){
    //console.log('a user connected');
    //socket.broadcast.emit('hi');

    socket.on ('_sigInit', (msg)=> {
        
        
        if (room42.visitorsAmount==0){
            console.log(`room ${msg}: _sigInit:: initiator joined`);
            io.emit('_sigJoinedAsInitiatior',42);
            room42.visitorsAmount++;
        } else if (room42.visitorsAmount==1){
            console.log(`room ${msg}: _sigInit:: follower joined`);
            io.emit('_sigJoinedAsFollower');
            room42.visitorsAmount++;
        } else {
            console.log(`room ${msg} is full`);
            io.emit('_sigReject');
        }

    });

    socket.on('_sigGotMedia',(msg)=>{
        console.log(`room ${msg}: _sigGotMedia:: Got user media`);
        if (room42.visitorsAmount==2){
            isReady=true;
        }
        io.emit('_sigTrying',isReady);
    });


    socket.on('_sigMessage', (msg)=>{
        console.log(`_sigMessage ${msg}`);
        socket.emit('_sigMessage', msg);
    });

    socket.on('_sigBye', (msg)=>{
        console.log(`ending call in room ${msg}`);
        socket.emit('_sigBye');
    })

    socket.on('disconnect', function (){
        console.log('user disconnected');
        room42.visitorsAmount--;
    });

    socket.on('chat message', function(msg){
        console.log(`Message: ${msg}`);
        io.to(msg.room).emit('chat message', `${msg.from}: ${msg.text}`);
    });

    socket.on('signal', function(msg){
        console.log(`Message: ${msg}`);
        //io.to(msg.room).emit('signal', `${msg.from}: ${msg.text}`);
        io.to(msg.room).emit('signal', msg);
    });
/*
    socket.on('typing message', (session) =>{
        console.log(`${session.userName} is typing now in ${session.room}`);
    });
*/
    socket.on('join chat', function(session){
        sessions.push(session);
        console.log(`Session ID: ${session.id}`);
        console.log(`Session room: ${session.room}`);
        console.log(`Session user: ${session.userName}`);
        socket.join(session.room);
        //console.log(`Room: ${roomId}`);

        //console.log(`arr: ${roomId}`);
    })

    socket.on('enter video room', function(session){
        sessions.push(session);
        //console.log(`Session ID: ${session.id}`);
        //console.log(`Session room: ${session.room}`);
        //console.log(`Session user: ${session.userName}`);
       
        //console.log(rooms[session.room]);
        currentRoom.name=session.room;
        if (rooms.has(currentRoom.name)) {
            rooms.get(currentRoom.name).visitorsAmount++;
            //rooms.get(currentRoom.name).visitors.push(session.userName);
            //console.log(rooms.get(currentRoom.name).visitors);
            console.log(`${session.userName} has joined the room ${currentRoom.name}`);
            session.owner=false;
        } else {
            currentRoom.owner=session.userName;
            currentRoom.visitorsAmount=1;
            currentRoom.visitors.push=session.userName;
            rooms.set(currentRoom.name, currentRoom);
            console.log(`Room ${currentRoom.name} has been created by ${session.userName}`);
            session.owner=true;
        }
        socket.join(session.room);
        io.to(session.room).emit('joined', session);        

    })
});

io.emit('some event', {for: 'evereyone'});


https.listen(3001, function(){
    console.log('listening on port 3001');
})

/*
http.listen(3000, function(){
    console.log('listening on port 3000');
})
*/
