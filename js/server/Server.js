var Server = function(wsLib){
  this.wsLib = wsLib;
}

Server.prototype.init = function(port){
  this.wsServer = new this.wsLib.Server({ port: port });
  this.wsServer.on("connection", function(ws){
    console.log("New connection.");
  });
}

export default Server;
