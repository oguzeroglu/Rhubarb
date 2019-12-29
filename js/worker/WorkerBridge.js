import Globals from "../util/Globals";

var WorkerBridge = function(){
  this.isWorkerInitialized = false;
}

WorkerBridge.prototype.sendProtocol = function(protocol){
  if (!protocol.hasOwnership){
    console.error("Protocol does not have transferable ownership.");
    return;
  }
  for (var i = 0; i<protocol.buffer.length; i++){
    protocol.transferableMessageBody.array[i] = protocol.buffer[i];
  }
  this.worker.postMessage(protocol.transferableMessageBody, protocol.transferableList);
  protocol.hasOwnership = false;
}

WorkerBridge.prototype.initialize = function(workerPath, serverURL){
  this.worker = new Worker(workerPath);

  this.worker.onmessage = function(event){
    var data = event.data;

    if (data.isError){
      throw new Error("Cannot connect to the server.");
    }

    if (data.isConnected){
      this.isWorkerInitialized = true;
    }else{
      var protocol = Globals.protocolsByProtocolID[data.array[0]];
      protocol.onOwnershipReceived(data);
    }
  }.bind(this);

  this.worker.postMessage({
    serverURL: serverURL
  });
}

export default new WorkerBridge();
