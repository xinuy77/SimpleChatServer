$(document).ready
(
	function()
	{
		var userName = prompt("What's your name?")||"User", //username for this client
		    socket   = io();                                //connect to the server that sent this page
		//Emits intro event to server to register username
		socket.on('connect', function()
		{
			socket.emit("intro", userName);
		});
		//If userpresses enter, emits new message to server
		$('#inputText').keypress(function(ev)
		{
			if(ev.which===13)
			{
				//send message
				socket.emit("message",$(this).val());
				ev.preventDefault();                  //if any
				$("#chatLog").append((new Date()).toLocaleTimeString()+", "+userName+": "+$(this).val()+"\n")
				$(this).val(""); //empty the input
			}
		});
		//Append message to textbox when message is recieved from server
		socket.on("message",function(data)
		{
			$("#chatLog").append(data+"\n");
			$('#chatLog')[0].scrollTop=$('#chatLog')[0].scrollHeight; //scroll to the bottom
		});
		//Updates user to userList when any user logins or logs out
		socket.on("userList",function(data)
		{
			$("#userList").empty();                 //Resets userList
			//Loop to set eventListener and user names to userList
			for(var i = 0; i < data.length; i++)
			{
				var div = $("<li>"+data[i] +"</li>").dblclick(function(event)
				{
					//When ctrl key is pressed when dblclicked, blockUser
					if(event.ctrlKey)
						blockUser($(this).text());
					//Else, send private message
					else
						privateMsg($(this).text());
						
				});
				$("#userList").append(div);
				
			}
		});
		/*Function to send private message to specific 
                user. Inputs username  as parameter*/
		function privateMsg(username)
		{
			//Show err msg if user tries to send pm to self
			if(userName === username)
				alert("You cannot send private message to yourself!");
			else
			{
				msg = window.prompt("Private message to: "+ username); //Prompt user msg
				//Emit socket if msg is not empty
				if(msg != undefined && msg != "")
				{
					data = {username:username, message:msg}; //data obj to send
					socket.emit("privateMessage", data);
				}
			}
			
		}
		/*Function to request server 
                to block certain user.*/
		function blockUser(username)
		{
			//Show err msg if user tries to block its self
			if(userName === username)
				alert("You cannot block yourself!");
			else
				socket.emit("blockUser", username); //Emit blockUser event with username
		}
	}
);

