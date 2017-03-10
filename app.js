
//Loads required modules
var   http = require('http').createServer(handleRequest),
      io   = require('socket.io')(http),
      fs   = require('fs'),
      mime = require('mime-types'),
      url  = require('url');
const ROOT = "./public_html";

http.listen(3001);

console.log("Chat server listening on port 3001");

var clients = [];  //List of clients
/*Function to handle static files*/
function handleRequest(req, res) 
{
	//process the request
	console.log(req.method+" request for: "+req.url);
	var urlObj   = url.parse(req.url,true), //Parsed URL
	    filename = ROOT+urlObj.pathname;    //required filename

		
	//the callback sequence for static serving
	fs.stat(filename,function(err, stats){
		//respond error if err
		if(err)
		{       //try and open the file and handle the error, handle the error
			respondErr(err);
		}
		//Responds index.html as default 
		else
		{
			//Serve index.html if it exists
			if(stats.isDirectory())	filename+="/index.html";
			fs.readFile(filename,"utf8",function(err, data)
			{
				if(err)respondErr(err);
				else respond(200,data);
			});
		}

	});
			
	//locally defined helper function
	//serves 404 files 
	function serve404()
	{
		var url = ROOT + "/404.html";  //url path to 404.html
		//Serve 404 if it exists
		fs.readFile(url,"utf8",function(err,data)
		{       //async
			if(err)respond(500,err.message);
			respond(404,data);
		});
	}
		
	//locally defined helper function
	//responds in error, and outputs to the console
	function respondErr(err){
		console.log("Handling error: ",err); //Print error info to console
		//Serve404 if ENOENT otherwise, responde 500 with error message
		if(err.code==="ENOENT")
			serve404();
		else
			respond(500,err.message);
	}

	//locally defined helper function
	//sends off the response message
	function respond(code, data)
	{
		res.writeHead(code, {'content-type': mime.lookup(filename)|| 'text/html'});//Content header
		res.end(data); //Write message/ signal complete
	}	
	
};
//end handle request

//Enable socket connection when connection event is recieved
io.on("connection", function(socket)
{
	console.log("Got a connection");
	//Registers recieved username as the client, then broadcasts welcome msg
	socket.on("intro",function(data)
	{
		socket.username         = data;    //Sets username to socket
		socket.blockedUser      = [];      //Sets blockedUser list to socket
		clients[clients.length] = socket;  //Adds socket as client
		socket.emit("userList",getUserList()); 
		socket.broadcast.emit("message", timestamp()+": "+socket.username+" has entered the chatroom.");
		socket.broadcast.emit("userList",getUserList());
		socket.emit("message","Welcome, "+socket.username+".");
	});
	
	//Broadcast message to socket when server recieves public msg	
	socket.on("message", function(data)
	{
		console.log("got message: "+data); 
		socket.broadcast.emit("message",timestamp()+", "+socket.username+": "+data);	
	});
	
	//Sends private message to addressed user
	socket.on("privateMessage", function(data)
	{
		var userSocket,           //Recievers socket
		    blocked    = false;   //If user is blocked by reciever or not
		//Loop to find recievers socket
		for(var i = 0; i < clients.length; i++)
		{
			if(clients[i].username === data.username)
			{
				userSocket = clients[i];
				break;
			}
		}
		//Loop to check if user is blocked by reciever
		for(var i = 0; i < userSocket.blockedUser.length; i++){
			if(userSocket.blockedUser[i] === socket.username){
				blocked = true;
				break;
			}
		}
		console.log("got private message: "+data.message);
		/*Emit private message to recievers and users socket if user 
                is not blocked else, emit error msg to user*/
		if(!blocked){
			socket.emit("message",timestamp()+", "+socket.username+"->"+data.username+": "+data.message);
			userSocket.emit("message",timestamp()+", "+socket.username+"->"+data.username+": "+data.message);
		}
		else
			socket.emit("message","You are blocked by this user.");
	});
	
	//Sets or removes recieved user to/from blocked user list in sockets blockedUser list
	socket.on("blockUser", function(data)
	{
		console.log("got block request: " + data);
		var removed = false; //True if user existed in blockedUser list
		/*Loop to check if username is in blockedUser 
		list of socket. Remove if it exists*/
		for(var i = 0; i < socket.blockedUser.length; i++)
		{
			if(socket.blockedUser[i] === data)
			{
				socket.blockedUser.splice(i, 1);
				removed = true;
			}
		}
		//Respond the result to user
		if(!removed)
		{
			socket.blockedUser[socket.blockedUser.length] = data;
			socket.emit("message","You have blocked "+ data +".");
		}
		else
			socket.emit("message","You have unblocked "+ data +".");
	});
	
	//Removes disconnected user from client list, then broadcasts message
	socket.on("disconnect", function(){
		console.log(socket.username+" disconnected");
		clients = clients.filter(function(ele){  
		       return ele!==socket;
		});

		socket.broadcast.emit("userList",getUserList());
		io.emit("message", timestamp()+": "+socket.username+" disconnected.");
	});
	
});

/*Function to get current time*/
function timestamp()
{
	return new Date().toLocaleTimeString();
}

/*Function to get current user list*/
function getUserList(){
    var ret = [];
    for(var i=0;i<clients.length;i++){
        ret.push(clients[i].username);
    }
    return ret;
}
