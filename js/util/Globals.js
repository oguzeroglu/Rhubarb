var Globals = function(){
  this.isReady = false;
}

Globals.prototype.destroy = function(){
  this.protocolsByProtocolName = new Object();
  this.protocolsByProtocolID = new Object();
  this.isReady = false;
  this.server = null;
}


Globals.prototype.setReady = function(){
  this.isReady = true;
  if (this.onReady){
    this.onReady();
  }
}

Globals.prototype.set = function(protocols){
  this.protocolsByProtocolName = new Object();
  this.protocolsByProtocolID = new Object();

  for (var protocolName in protocols){
    var protocol = protocols[protocolName];
    this.protocolsByProtocolName[protocolName] = protocol;
    this.protocolsByProtocolID[protocol.id] = protocol;
  }
}

Globals.prototype.setServer = function(server){
  this.server = server;
}

export default new Globals();
