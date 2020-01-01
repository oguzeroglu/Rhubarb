import Globals from "../util/Globals";

var Server = function(wsLib){
  this.wsLib = wsLib;
  this.wsByClientID = new Object();
  this.clientIDByWS = new Map();
}

Server.prototype.destroy = function(){
  delete this.onClientConnected;
  delete this.onClientDisconnected;
  for (var clientID in this.wsByClientID){
    var ws = this.wsByClientID[clientID];
    ws.terminate();
  }
  this.wsServer.close();

  this.wsByClientID = new Object();
  this.clientIDByWS = new Map();

  delete this.wsServer;
}

Server.prototype.sendProtocolToClient = function(clientID, protocol){
  var clientWS = this.wsByClientID[clientID];
  if (!clientWS){
    throw new Error("No such client: " + clientID);
  }
  clientWS.send(protocol.buffer);
}

Server.prototype.init = function(port){
  this.wsServer = new this.wsLib.Server({ port: port });
  Globals.setReady();
  this.wsServer.on("connection", function(ws){

    var clientID = uuidv4();
    this.wsByClientID[clientID] = ws;
    this.clientIDByWS.set(ws, clientID);
    if (this.onClientConnected){
      this.onClientConnected(clientID);
    }

    ws.on("message", function(data){
      var protocolID = data.readFloatLE(0);
      if (protocolID == 0){
        ws.send(data);
      }else{
        var protocol = Globals.protocolsByProtocolID[protocolID];
        var bufIndex = 4;
        for (var i = 1; i<protocol.buffer.length; i++){
          protocol.buffer[i] = data.readFloatLE(bufIndex);
          bufIndex += 4;
        }
        for (var paramName in protocol.parameters){
          protocol.getParameterFromBuffer(paramName);
        }
        protocol.onValuesReceived(this.clientID);
      }
    }.bind({clientID: clientID}));

    ws.on("close", function(){
      var clientID = this.clientID;
      var server = this.server;

      delete server.wsByClientID[clientID];
      server.clientIDByWS.delete(this.ws);

      if (this.server.onClientDisconnected){
        this.server.onClientDisconnected(this.clientID);
      }
    }.bind({clientID: clientID, server: this, ws: ws}));
  }.bind(this));
}

function uuidv4(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default Server;
