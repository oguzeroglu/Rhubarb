var WorkerBridge = function(){
  this.isWorkerInitialized = false;
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
      
    }
  }.bind(this);

  this.worker.postMessage({
    serverURL: serverURL
  });
}

export default new WorkerBridge();
