//import './app.css';

let path = require('path');
let express = require('express');

let app= express();
app.use('/styles', express.static('public'));
app.use('/scripts', express.static('public'));
console.log(__dirname);

let fs = require('fs');

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
    socket.on('disconnect', function (){
        console.log('user disconnected');
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
