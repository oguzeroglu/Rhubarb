var Rhubarb = require("../../build/Rhubarb.js");

Rhubarb.init({
  protocolDefinitionPath: './protocol-definition.json',
  isServer: true,
  serverListenPort: 8087
});

console.log("Server listening to port 8087");

var userNamesByClientID = new Object();

Rhubarb.onClientDisconnected(function(clientID){
  var name = userNamesByClientID[clientID];
  if (!name){
    return;
  }
  console.log(name + " disconnected.");
  delete userNamesByClientID[clientID];
  var body = { userName: name };
  for (var cid in userNamesByClientID){
    Rhubarb.send("userDisconnected", body, cid);
  }
});

Rhubarb.onReceived("namePicked", function(getter, clientID){
  var name = getter("userName");
  var body = { userName: name };
  console.log(name + " connected.");
  for (var cid in userNamesByClientID){
    Rhubarb.send("userConnected", body, cid);
  }
  userNamesByClientID[clientID] = name;
});

Rhubarb.onReceived("newMessage", function(getter, clientID){
  var msg = getter("message");
  var from = userNamesByClientID[clientID];
  var body = {
    from: from,
    message: msg
  };
  console.log(from + " says: " + msg);
  for (var cid in userNamesByClientID){
    if (cid != clientID){
      console.log("sent to: "+cid);
      Rhubarb.send("newMessage", body, cid);
    }
  }
});
