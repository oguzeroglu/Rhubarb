import Globals from "../util/Globals";

var WorkerBridge = function(){
  this.isWorkerInitialized = false;
  this.reusableArray = [];
}

WorkerBridge.prototype.destroy = function(){
  this.isWorkerInitialized = false;
  this.reusableArray = [];
  this.worker.terminate();
}

WorkerBridge.prototype.onLatencyUpdated = function(latency){
  if (this.latencyCallback){
    this.latencyCallback(latency);
  }
}

WorkerBridge.prototype.sendProtocol = function(protocol){
  if (!protocol.hasOwnership){
    console.error("Protocol does not have transferable ownership.");
    return;
  }
  for (var i = 0; i<protocol.buffer.length; i++){
    protocol.transferableMessageBody[i] = protocol.buffer[i];
  }
  this.worker.postMessage(protocol.transferableMessageBody, protocol.transferableList);
  protocol.hasOwnership = false;
}

WorkerBridge.prototype.initialize = function(workerPath, serverURL){
  this.worker = new Worker(workerPath);

  this.worker.onmessage = function(event){
    var data = event.data;

    if (data.isError){
      this.onError("Cannot connect to the server.");
      return;
    }

    if (data.isConnected || data.isDisconnected){
      if (data.isConnected){
        this.isWorkerInitialized = true;
        Globals.setReady();
      }else{
        if (this.onDisconnectedFromServer){
          this.onDisconnectedFromServer();
        }
      }
    }else{
      if (data[0] == -2){
        var latency = data[1];
        this.reusableArray[0] = data.buffer;
        this.worker.postMessage(data, this.reusableArray);
        this.onLatencyUpdated(latency);
        return;
      }else{
        var protocol = Globals.protocolsByProtocolID[data[0]];
        protocol.buffer = data;
        protocol.onOwnershipReceived(data);
        for (var parameterName in protocol.parameters){
          protocol.getParameterFromBuffer(parameterName);
        }
        protocol.onValuesReceived();
        return;
      }
    }
  }.bind(this);

  this.worker.postMessage({
    serverURL: serverURL
  });
}

export default new WorkerBridge();
