(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Rhubarb = factory());
}(this, (function () { 'use strict';

var ReusableBufferCache = function ReusableBufferCache() {
  this.cache = new Object();
};

ReusableBufferCache.prototype.destroy = function () {
  this.cache = new Object();
};

ReusableBufferCache.prototype.notify = function (len) {
  if (!this.cache[len]) {
    var float32 = new Float32Array(len);
    var uint8 = new Uint8Array(float32.buffer);
    this.cache[len] = {
      uint8: uint8,
      float32: float32
    };
  }
};

ReusableBufferCache.prototype.get = function (strLength) {
  var elem = this.cache[strLength];
  if (!elem) {
    throw new Error("ReusableBufferCache is empty.");
  }
  return elem;
};

var ReusableBufferCache$1 = new ReusableBufferCache();

var supportedChars = ["!", "\"", "#", "$", "%", "&", "\'", "(", ")", "*", "+", ",", "-", ".", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?", "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_", "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~", "q", "Q", " "];

var charByteMap = new Object();
var byteCharMap = new Object();
for (var i = 0; i < supportedChars.length; i++) {
  charByteMap[supportedChars[i]] = i + 1;
  byteCharMap[i + 1] = supportedChars[i];
}

var Protocol = function Protocol(name, id) {
  this.name = name;
  this.id = id;
  this.parameters = new Object();
  this.parameterIDsByParameterName = new Object();
  this.parameterBufferIndicesByParameterName = new Object();
  this.parameterValues = new Object();
  this.boundGetter = this.getter.bind(this);
};

Protocol.prototype.MAX_STRING_PARAMETER_LENGTH = 100;

Protocol.prototype.typeNumerical = { isNumerical: true, requiredBufferLen: 2 };

Protocol.prototype.getter = function (parameterName) {
  return this.parameterValues[parameterName];
};

Protocol.prototype.onValuesReceived = function (clientID) {
  if (this.onReceived && this.hasOwnership) {
    this.onReceived(this.boundGetter, clientID);
  }
};

Protocol.prototype.onOwnershipReceived = function (transferableMessageBody) {
  this.transferableMessageBody = transferableMessageBody;
  this.transferableList[0] = transferableMessageBody.buffer;
  this.hasOwnership = true;
};

Protocol.prototype.getCharByte = function (char) {
  return charByteMap[char] || 0;
};

Protocol.prototype.getParameterFromBuffer = function (parameterName) {
  var parameter = this.parameters[parameterName];
  if (!parameter) {
    throw new Error("No such parameter: " + parameterName + " in protocol: " + this.name);
  }
  var startIndex = this.parameterBufferIndicesByParameterName[parameterName];
  if (parameter.isNumerical) {
    var value = this.buffer[startIndex + 1];
    this.parameterValues[parameterName] = value;
    return value;
  }
  var computationBuffers = ReusableBufferCache$1.get(parameter.requiredBufferLen);
  var float32 = computationBuffers.float32;
  for (var i = 0; i < parameter.requiredBufferLen; i++) {
    float32[i] = this.buffer[startIndex + 1 + i];
  }
  var uint8 = computationBuffers.uint8;
  var value = "";
  for (var i = 0; i < uint8.length; i++) {
    if (uint8[i] == 0) {
      break;
    }
    value += byteCharMap[uint8[i]];
  }
  this.parameterValues[parameterName] = value;
  return value;
};

Protocol.prototype.setParameterToBuffer = function (parameterName, value) {
  var parameter = this.parameters[parameterName];
  if (!parameter) {
    throw new Error("No such parameter: " + parameterName + " in protocol: " + this.name);
  }
  var startIndex = this.parameterBufferIndicesByParameterName[parameterName];
  var parameterID = this.parameterIDsByParameterName[parameterName];
  this.buffer[startIndex] = parameterID;
  if (parameter.isNumerical) {
    this.buffer[startIndex + 1] = value;
  } else {
    if (value.length > parameter.maxLength) {
      throw new Error("Parameter overflow: " + parameterName + " in protocol " + this.name);
    }
    var computationBuffers = ReusableBufferCache$1.get(parameter.requiredBufferLen);
    var uint8 = computationBuffers.uint8;
    for (var i = 0; i < uint8.length; i++) {
      if (i < value.length) {
        uint8[i] = this.getCharByte(value[i]);
      } else {
        uint8[i] = 0;
      }
    }
    var float32 = computationBuffers.float32;
    var curIndex = startIndex + 1;
    for (var i = 0; i < float32.length; i++) {
      this.buffer[curIndex++] = float32[i];
    }
  }
  this.parameterValues[parameterName] = value;
};

Protocol.prototype.addNumericalParameter = function (parameterName) {
  this.parameters[parameterName] = this.typeNumerical;
};

Protocol.prototype.addStringParameter = function (parameterName, maxLength) {
  if (maxLength > this.MAX_STRING_PARAMETER_LENGTH) {
    throw new Error("Parameter size exceeds max allowed string parameter size " + this.MAX_STRING_PARAMETER_LENGTH);
  }
  this.parameters[parameterName] = {
    isNumerical: false, maxLength: maxLength, requiredBufferLen: Math.ceil(maxLength / 4) + 1
  };
};

Protocol.prototype.init = function () {
  var requiredBufferLen = 0;
  var curParameterID = 0;
  for (var parameterName in this.parameters) {
    this.parameterIDsByParameterName[parameterName] = curParameterID++;
    this.parameterBufferIndicesByParameterName[parameterName] = requiredBufferLen + 1;
    var parameter = this.parameters[parameterName];
    requiredBufferLen += parameter.requiredBufferLen;
    if (!parameter.isNumerical) {
      ReusableBufferCache$1.notify(parameter.requiredBufferLen);
    }
  }
  this.buffer = new Float32Array(requiredBufferLen + 1);
  this.buffer[0] = this.id;
  this.transferableMessageBody = new Float32Array(requiredBufferLen + 1);
  this.transferableList = [this.transferableMessageBody.buffer];
  this.hasOwnership = true;
};

var ProtocolParser = function ProtocolParser() {
  this.NUMERICAL_TYPE = "numerical";
  this.CHARACTER_TYPE = "char";
  this.currentProtocolID = 1;
};

ProtocolParser.prototype.destroy = function () {
  this.currentProtocolID = 1;
};

ProtocolParser.prototype.parseCharacterType = function (characterType) {
  var splitted = characterType.split("_");
  if (splitted[0] == this.CHARACTER_TYPE) {
    if (!splitted[1]) {
      return false;
    }
    return parseInt(splitted[1]);
  }
  return false;
};
ProtocolParser.prototype.parseProtocol = function (protocolInfo, protocolName, protocolID) {
  var protocol = new Protocol(protocolName, protocolID);
  for (var parameterName in protocolInfo) {
    var parameterType = protocolInfo[parameterName];
    if (parameterType == this.NUMERICAL_TYPE) {
      protocol.addNumericalParameter(parameterName);
    } else if (parameterType.startsWith(this.CHARACTER_TYPE)) {
      var maxLength = this.parseCharacterType(parameterType);
      if (!maxLength) {
        throw new Error("Char types must be in format char_N, where N is the char length.");
      }
      protocol.addStringParameter(parameterName, maxLength);
    } else {
      throw new Error("Invalid parameter type.");
    }
  }
  protocol.init();
  return protocol;
};

ProtocolParser.prototype.parse = function (jsonData) {
  var parsedProtocols = new Object();
  for (var protocolName in jsonData) {
    var protocolInfo = jsonData[protocolName];
    var protocol = this.parseProtocol(protocolInfo, protocolName, this.currentProtocolID++);
    parsedProtocols[protocol.name] = protocol;
  }
  return parsedProtocols;
};

var ProtocolParser$1 = new ProtocolParser();

var Globals = function Globals() {
  this.isReady = false;
};

Globals.prototype.destroy = function () {
  this.protocolsByProtocolName = new Object();
  this.protocolsByProtocolID = new Object();
  this.isReady = false;
  this.server = null;
};

Globals.prototype.setReady = function () {
  this.isReady = true;
  if (this.onReady) {
    this.onReady();
  }
};

Globals.prototype.set = function (protocols) {
  this.protocolsByProtocolName = new Object();
  this.protocolsByProtocolID = new Object();

  for (var protocolName in protocols) {
    var protocol = protocols[protocolName];
    this.protocolsByProtocolName[protocolName] = protocol;
    this.protocolsByProtocolID[protocol.id] = protocol;
  }
};

Globals.prototype.setServer = function (server) {
  this.server = server;
};

var Globals$1 = new Globals();

var WorkerBridge = function WorkerBridge() {
  this.isWorkerInitialized = false;
  this.reusableArray = [];
};

WorkerBridge.prototype.destroy = function () {
  this.isWorkerInitialized = false;
  this.reusableArray = [];
  this.worker.terminate();
};

WorkerBridge.prototype.onLatencyUpdated = function (latency) {
  if (this.latencyCallback) {
    this.latencyCallback(latency);
  }
};

WorkerBridge.prototype.sendProtocol = function (protocol) {
  if (!protocol.hasOwnership) {
    console.error("Protocol does not have transferable ownership.");
    return;
  }
  for (var i = 0; i < protocol.buffer.length; i++) {
    protocol.transferableMessageBody[i] = protocol.buffer[i];
  }
  this.worker.postMessage(protocol.transferableMessageBody, protocol.transferableList);
  protocol.hasOwnership = false;
};

WorkerBridge.prototype.initialize = function (workerPath, serverURL) {
  this.worker = new Worker(workerPath);

  this.worker.onmessage = function (event) {
    var data = event.data;

    if (data.isError) {
      this.onError("Cannot connect to the server.");
      return;
    }

    if (data.isConnected || data.isDisconnected) {
      if (data.isConnected) {
        this.isWorkerInitialized = true;
        Globals$1.setReady();
      } else {
        if (this.onDisconnectedFromServer) {
          this.onDisconnectedFromServer();
        }
      }
    } else {
      if (data[0] == -2) {
        var latency = data[1];
        this.reusableArray[0] = data.buffer;
        this.worker.postMessage(data, this.reusableArray);
        this.onLatencyUpdated(latency);
        return;
      } else {
        var protocol = Globals$1.protocolsByProtocolID[data[0]];
        protocol.buffer = data;
        for (var parameterName in protocol.parameters) {
          protocol.getParameterFromBuffer(parameterName);
        }
        protocol.onValuesReceived();
        protocol.onOwnershipReceived(data);
        return;
      }
    }
  }.bind(this);

  this.worker.postMessage({
    serverURL: serverURL
  });
};

var WorkerBridge$1 = new WorkerBridge();

var Server = function Server(wsLib) {
  this.wsLib = wsLib;
  this.wsByClientID = new Object();
  this.clientIDByWS = new Map();
};

Server.prototype.destroy = function () {
  for (var clientID in this.wsByClientID) {
    var ws = this.wsByClientID[clientID];
    ws.terminate();
  }
  this.wsServer.close();

  this.wsByClientID = new Object();
  this.clientIDByWS = new Map();

  delete this.wsServer;
};

Server.prototype.sendProtocolToClient = function (clientID, protocol) {
  var clientWS = this.wsByClientID[clientID];
  if (!clientWS) {
    throw new Error("No such client: " + clientID);
  }
  clientWS.send(protocol.buffer);
};

Server.prototype.init = function (port) {
  this.wsServer = new this.wsLib.Server({ port: port });
  Globals$1.setReady();
  this.wsServer.on("connection", function (ws) {

    var clientID = uuidv4();
    this.wsByClientID[clientID] = ws;
    this.clientIDByWS.set(ws, clientID);
    if (this.onClientConnected) {
      this.onClientConnected(clientID);
    }

    ws.on("message", function (data) {
      var protocolID = data.readFloatLE(0);
      if (protocolID == 0) {
        ws.send(data);
      } else {
        var protocol = Globals$1.protocolsByProtocolID[protocolID];
        var bufIndex = 4;
        for (var i = 1; i < protocol.buffer.length; i++) {
          protocol.buffer[i] = data.readFloatLE(bufIndex);
          bufIndex += 4;
        }
        for (var paramName in protocol.parameters) {
          protocol.getParameterFromBuffer(paramName);
        }
        protocol.onValuesReceived(this.clientID);
      }
    }.bind({ clientID: clientID }));

    ws.on("close", function () {
      var clientID = this.clientID;
      var server = this.server;

      delete server.wsByClientID[clientID];
      server.clientIDByWS.delete(this.ws);

      if (this.server.onClientDisconnected) {
        this.server.onClientDisconnected(this.clientID);
      }
    }.bind({ clientID: clientID, server: this, ws: ws }));
  }.bind(this));
};

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

var Rhubarb = function Rhubarb() {
  this.IS_NODE = typeof window == "undefined";
};

// PUBLIC APIs *****************************************************************

Rhubarb.prototype.init = function (parameters) {
  if (Globals$1.isReady) {
    throw new Error("Rhubarb already initialized. Use destroy API first.");
  }

  this._validateParameters(parameters);

  Globals$1.onReady = parameters.onReady;

  if (this.IS_NODE) {
    this._initNode(parameters);
    return;
  }

  var protocolDefinitionPath = parameters.protocolDefinitionPath;
  var workerPath = parameters.workerPath;
  var serverAddress = parameters.serverAddress;
  var onError = parameters.onError;

  var xhttpRequest = new XMLHttpRequest();
  xhttpRequest.overrideMimeType("application/json");
  xhttpRequest.open("GET", protocolDefinitionPath, true);
  xhttpRequest.onreadystatechange = function () {
    if (xhttpRequest.readyState == 4 && xhttpRequest.status == "200") {
      var parsedJSON;
      try {
        parsedJSON = JSON.parse(xhttpRequest.responseText);
      } catch (err) {
        onError("Protocol definition file is not a valid JSON: " + err);
        return;
      }
      var protocols = ProtocolParser$1.parse(parsedJSON);
      Globals$1.set(protocols);
      WorkerBridge$1.onError = onError;
      this.initWorker(workerPath, serverAddress);
    } else if (xhttpRequest.readyState == 4) {
      onError("Protocol definition file not found.");
      return;
    }
  }.bind({ initWorker: this._initWorker });
  xhttpRequest.send(null);
};

Rhubarb.prototype.send = function (protocolName, valuesByParameterName, clientID) {
  if (!Globals$1.isReady) {
    throw new Error("Rhubarb is not initialized yet.");
  }
  var protocol = Globals$1.protocolsByProtocolName[protocolName];
  if (!protocol) {
    throw new Error("No such protocol: " + protocolName);
  }
  for (var parameterName in protocol.parameters) {
    var value = valuesByParameterName[parameterName];
    if (value == undefined || value == null) {
      throw new Error("Parameter value not defined: " + parameterName);
    }
    protocol.setParameterToBuffer(parameterName, valuesByParameterName[parameterName]);
  }
  if (!this.IS_NODE) {
    WorkerBridge$1.sendProtocol(protocol);
  } else {
    Globals$1.server.sendProtocolToClient(clientID, protocol);
  }
};

Rhubarb.prototype.onReceived = function (protocolName, callback) {
  if (!Globals$1.isReady) {
    throw new Error("Rhubarb is not initialized yet.");
  }
  var protocol = Globals$1.protocolsByProtocolName[protocolName];
  if (!protocol) {
    throw new Error("No such protocol: " + protocolName);
  }
  if (!callback) {
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function) {
    throw new Error("Callback is not a function.");
  }
  protocol.onReceived = callback;
};

Rhubarb.prototype.onDisconnectedFromServer = function (callback) {
  if (!Globals$1.isReady) {
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (this.IS_NODE) {
    throw new Error("This Rhubarb instance is a server.");
  }
  if (!callback) {
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function) {
    throw new Error("Callback is not a function.");
  }
  WorkerBridge$1.onDisconnectedFromServer = callback;
};

Rhubarb.prototype.onClientConnected = function (callback) {
  if (!Globals$1.isReady) {
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (!this.IS_NODE) {
    throw new Error("This Rhubarb instance is not a server.");
  }
  if (!callback) {
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function) {
    throw new Error("Callback is not a function.");
  }
  Globals$1.server.onClientConnected = callback;
};

Rhubarb.prototype.onClientDisconnected = function (callback) {
  if (!Globals$1.isReady) {
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (!this.IS_NODE) {
    throw new Error("This Rhubarb instance is not a server.");
  }
  if (!callback) {
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function) {
    throw new Error("Callback is not a function.");
  }
  Globals$1.server.onClientDisconnected = callback;
};

Rhubarb.prototype.onLatencyUpdated = function (callback) {
  if (!Globals$1.isReady) {
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (this.IS_NODE) {
    throw new Error("This Rhubarb instance is a server.");
  }
  if (!callback) {
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function) {
    throw new Error("Callback is not a function.");
  }
  WorkerBridge$1.latencyCallback = callback;
};

Rhubarb.prototype.destroy = function () {
  if (!Globals$1.isReady) {
    throw new Error("Rhubarb not initialized. Use init API first.");
  }

  if (!this.IS_NODE) {
    WorkerBridge$1.destroy();
  } else {
    Globals$1.server.destroy();
  }

  Globals$1.destroy();
  ReusableBufferCache$1.destroy();
  ProtocolParser$1.destroy();
};

// END OF PUBLIC APIs **********************************************************

Rhubarb.prototype._validateParameters = function (parameters) {
  var protocolDefinitionPath = parameters.protocolDefinitionPath;
  var workerPath = parameters.workerPath;
  var isServer = parameters.isServer;
  var serverAddress = parameters.serverAddress;
  var serverListenPort = parameters.serverListenPort;
  var onReady = parameters.onReady;
  var onError = parameters.onError;

  if (!protocolDefinitionPath) {
    throw new Error("protocolDefinitionPath is not defined within parameters.");
  }
  if (!this.IS_NODE && !workerPath) {
    throw new Error("workerPath is not defined within parameters.");
  }
  if (!this.IS_NODE && isServer) {
    throw new Error("Cannot use browser as a server.");
  }
  if (isServer && !serverListenPort) {
    throw new Error("serverListenPort is not defined within parameters.");
  }
  if (!isServer && !serverAddress) {
    throw new Error("serverAddress is not defined within parameters.");
  }
  if (!this.IS_NODE) {
    if (!onReady) {
      throw new Error("onReady is not defined within parameters.");
    }
    if (!onReady instanceof Function) {
      throw new Error("onReady parameter is not a Function.");
    }
    if (!onError) {
      throw new Error("onError is not defined within parameters.");
    }
    if (!onError instanceof Function) {
      throw new Error("onError parameter is not a Function.");
    }
  }
};

Rhubarb.prototype._initWorker = function (workerPath, serverAddress) {
  if (!this.IS_NODE && typeof Worker == "undefined") {
    throw new Error("This browser does not support web workers.");
  } else if (!this.IS_NODE) {
    WorkerBridge$1.initialize(workerPath, serverAddress);
  }
};

Rhubarb.prototype._initNode = function (parameters) {
  var protocolDefinitionPath = parameters.protocolDefinitionPath;
  var isServer = parameters.isServer;
  var serverListenPort = parameters.serverListenPort;
  var fs = require("fs");

  if (!fs.existsSync(protocolDefinitionPath)) {
    throw new Error("Protocol definition file does not exist.");
  }
  var content = fs.readFileSync(protocolDefinitionPath, "utf8");
  var parsedJSON;
  try {
    parsedJSON = JSON.parse(content);
  } catch (err) {
    throw new Error("Protocol definition file is not a valid JSON: " + err);
  }
  var protocols = ProtocolParser$1.parse(parsedJSON);
  Globals$1.set(protocols);

  var ws = require("ws");
  if (isServer) {
    var server = new Server(ws);
    server.init(serverListenPort);
    Globals$1.setServer(server);
    Globals$1.setReady();
  } else {
    throw new Error("NodeJS clients are not yet supported.");
  }
};

var index = new Rhubarb();

return index;

})));
//# sourceMappingURL=Rhubarb.mjs.map
