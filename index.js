//import './app.css';

let path = require('path');
let express = require('express');

let app= express();
app.use('/styles', express.static('public'));
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


app.get('/', function(req, res){
    res.sendFile(`${__dirname}/index.html` );
});

app.get('/chat', function(req, res){
    res.sendFile(`${__dirname}/chat.html` );
});

app.get('/hw', (req,res) => {
    res.send('Hello World');
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

    socket.on('typing message', (session) =>{
        console.log(`${session.userName} is typing now in ${session.room}`);
    });

    socket.on('join chat', function(session){
        sessions.push(session);
        console.log(`Session ID: ${session.id}`);
        console.log(`Session room: ${session.room}`);
        console.log(`Session user: ${session.userName}`);
        socket.join(session.room);
        //console.log(`Room: ${roomId}`);

        //console.log(`arr: ${roomId}`);
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
