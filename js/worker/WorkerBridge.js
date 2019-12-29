var WorkerBridge = function(){

}

WorkerBridge.prototype.initialize = function(workerPath){
  this.worker = new Worker(workerPath);
}

export default new WorkerBridge();
