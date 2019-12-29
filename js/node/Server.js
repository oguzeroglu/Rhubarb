import Globals from "../util/Globals";

var Server = function(wsLib){
  this.wsLib = wsLib;
}

Server.prototype.init = function(port){
  this.wsServer = new this.wsLib.Server({ port: port });
  this.wsServer.on("connection", function(ws){

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
        protocol.onValuesReceived();
      }
    });
  });
}

export default Server;
