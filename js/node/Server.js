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
        
      }
    });
  });
}

export default Server;
