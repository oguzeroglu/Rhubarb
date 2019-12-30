(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

var WebSocketWorker = function WebSocketWorker() {
  this.pingMsg = new Float32Array(1);
  this.pingTransferable = new Float32Array(2);
  this.pingTransferableList = [this.pingTransferable.buffer];
  this.hasPingTransferableOwnership = true;
  this.intermediateBuffers = new Object();
  this.transferableList = [];
  this.transferables = new Object();
};

WebSocketWorker.prototype.sendPing = function () {
  if (worker.isSocketClosed) {
    return;
  }
  worker.ws.send(worker.pingMsg.buffer);
  worker.lastPingSendTime = performance.now();
};

WebSocketWorker.prototype.onWSOpen = function () {
  worker.isSocketClosed = false;
  postMessage({ isConnected: true });
  setTimeout(this.sendPing, 3000);
};

WebSocketWorker.prototype.onWSMessage = function (event) {
  var view = new Float32Array(event.data);
  var protocolID = view[0];
  if (protocolID == 0) {
    setTimeout(worker.sendPing, 3000);
    if (worker.hasPingTransferableOwnership) {
      var latency = performance.now() - worker.lastPingSendTime;
      worker.pingTransferable[0] = -2;
      worker.pingTransferable[1] = latency;
      postMessage(worker.pingTransferable, worker.pingTransferableList);
      worker.hasPingTransferableOwnership = false;
    }
  } else {
    var transferable = worker.transferables[view.length];
    if (!transferable) {
      var array = new Float32Array(view.length + 1);
      transferable = {
        array: array,
        list: [array.buffer],
        hasOwnership: true
      };
      worker.transferables[view.length] = transferable;
    }
    if (!transferable.hasOwnership) {
      console.error('Worker does not have transferable ownership.');
      return;
    }
    transferable.array[0] = -1;
    for (var i = 0; i < view.length; i++) {
      transferable.array[i + 1] = view[i];
    }
    postMessage(transferable.array, transferable.list);
    transferable.hasOwnership = false;
  }
};

WebSocketWorker.prototype.onWSClose = function () {
  worker.isSocketClosed = true;
  postMessage({ isDisconnected: true });
};

WebSocketWorker.prototype.onWSError = function (event) {
  postMessage({ isError: true });
};

WebSocketWorker.prototype.connect = function (serverURL) {
  var ws = new WebSocket(serverURL);
  ws.onopen = this.onWSOpen.bind(this);
  ws.onmessage = this.onWSMessage.bind(this);
  ws.onclose = this.onWSClose.bind(this);
  ws.onerror = this.onWSError.bind(this);
  ws.binaryType = "arraybuffer";
  this.ws = ws;
};

var worker = new WebSocketWorker();

self.onmessage = function (message) {
  var data = message.data;

  if (data.serverURL) {
    worker.connect(data.serverURL);
  } else {
    if (data[0] == -1) {
      var transferable = worker.transferables[data.length - 1];
      transferable.array = data;
      transferable.list[0] = data.buffer;
      transferable.hasOwnership = true;
      return;
    } else if (data[0] == -2) {
      worker.pingTransferable = data;
      worker.pingTransferableList[0] = data.buffer;
      worker.hasPingTransferableOwnership = true;
      return;
    }
    if (worker.isSocketClosed) {
      return;
    }
    var length = data.length;
    var intermediateBuffer = worker.intermediateBuffers[length];
    if (!intermediateBuffer) {
      intermediateBuffer = new Float32Array(length);
      worker.intermediateBuffers[length] = intermediateBuffer;
    }
    for (var i = 0; i < data.length; i++) {
      intermediateBuffer[i] = data[i];
    }
    worker.transferableList[0] = data.buffer;
    postMessage(data, worker.transferableList);
    worker.ws.send(intermediateBuffer.buffer);
  }
};

})));
//# sourceMappingURL=RhubarbWorker.js.map
