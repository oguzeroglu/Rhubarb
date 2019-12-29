var WebSocketWorker = function(){
  this.pingMsg = new Float32Array(1);
}

WebSocketWorker.prototype.sendPing = function(){
  if (worker.isSocketClosed){
    return;
  }
  worker.ws.send(worker.pingMsg.buffer);
  worker.lastPingSendTime = performance.now();
}

WebSocketWorker.prototype.onWSOpen = function(){
  worker.isSocketClosed = false;
  postMessage({isConnected: true});
  setTimeout(this.sendPing, 3000);
}

WebSocketWorker.prototype.onWSMessage = function(event){
  worker.latency = performance.now() - worker.lastPingSendTime;
  var view = new Float32Array(event.data);
  var protocolID = view[0];
  if (protocolID == 0){
    setTimeout(worker.sendPing, 3000);
  }
}

WebSocketWorker.prototype.onWSClose = function(){
  worker.isSocketClosed = true;
}

WebSocketWorker.prototype.onWSError = function(event){
  postMessage({isError: true});
}

WebSocketWorker.prototype.connect = function(serverURL){
  var ws = new WebSocket(serverURL);
  ws.onopen = this.onWSOpen.bind(this);
  ws.onmessage = this.onWSMessage.bind(this);
  ws.onclose = this.onWSClose.bind(this);
  ws.onerror = this.onWSError.bind(this);
  ws.binaryType = "arraybuffer";
  this.ws = ws;
}

var worker = new WebSocketWorker();

self.onmessage = function(message){
  var data = message.data;

  if (data.serverURL){
    worker.connect(data.serverURL);
  }
}
