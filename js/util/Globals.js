var Globals = function(){

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

export default new Globals();
