(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

var WebSocketWorker = function WebSocketWorker() {
  this.isInitialized = false;
};

WebSocketWorker.prototype.onWSOpen = function () {};

WebSocketWorker.prototype.onWSMessage = function (event) {};

WebSocketWorker.prototype.onWSClose = function () {};

WebSocketWorker.prototype.onWSError = function (event) {
  postMessage({ isError: true });
};

WebSocketWorker.prototype.connect = function (serverURL) {
  var ws = new WebSocket(serverURL);
  ws.onopen = this.onWSOpen;
  ws.onmessage = this.onWSMessage;
  ws.onclose = this.onWSClose;
  ws.onerror = this.onWSError;
  this.ws = ws;
};

var worker = new WebSocketWorker();

self.onmessage = function (message) {
  var data = message.data;

  if (data.serverURL) {
    worker.connect(data.serverURL);
  }
};

})));
//# sourceMappingURL=RhubarbWorker.js.map
