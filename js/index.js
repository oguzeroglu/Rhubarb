import ProtocolParser from "./handler/ProtocolParser";
import WorkerBridge from "./worker/WorkerBridge";
import Server from "./node/Server";
import Globals from "./util/Globals";
import ReusableBufferCache from "./util/ReusableBufferCache";

var Rhubarb = function(){
  this.IS_NODE = (typeof window == "undefined");
}

// PUBLIC APIs *****************************************************************

Rhubarb.prototype.init = function(parameters){
  if (Globals.isReady){
    throw new Error("Rhubarb already initialized. Use destroy API first.");
  }

  this._validateParameters(parameters);

  Globals.onReady = parameters.onReady;

  if (this.IS_NODE){
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
  xhttpRequest.onreadystatechange = function(){
    if (xhttpRequest.readyState == 4 && xhttpRequest.status == "200"){
      var parsedJSON;
      try{
        parsedJSON = JSON.parse(xhttpRequest.responseText);
      }catch(err){
        onError("Protocol definition file is not a valid JSON: " + err);
        return;
      }
      var protocols = ProtocolParser.parse(parsedJSON);
      Globals.set(protocols);
      WorkerBridge.onError = onError;
      this.initWorker(workerPath, serverAddress);
    }else if (xhttpRequest.readyState == 4){
      onError("Protocol definition file not found.");
      return;
    }
  }.bind({initWorker: this._initWorker});
  xhttpRequest.send(null);
}

Rhubarb.prototype.send = function(protocolName, valuesByParameterName, clientID){
  if (!Globals.isReady){
    throw new Error("Rhubarb is not initialized yet.");
  }
  var protocol = Globals.protocolsByProtocolName[protocolName];
  if (!protocol){
    throw new Error("No such protocol: " + protocolName);
  }
  for (var parameterName in protocol.parameters){
    var value = valuesByParameterName[parameterName];
    if (value == undefined || value == null) {
      throw new Error("Parameter value not defined: " + parameterName);
    }
    protocol.setParameterToBuffer(parameterName, valuesByParameterName[parameterName]);
  }
  if (!this.IS_NODE){
    WorkerBridge.sendProtocol(protocol);
  }else{
    Globals.server.sendProtocolToClient(clientID, protocol);
  }
}

Rhubarb.prototype.onReceived = function(protocolName, callback){
  if (!Globals.isReady){
    throw new Error("Rhubarb is not initialized yet.");
  }
  var protocol = Globals.protocolsByProtocolName[protocolName];
  if (!protocol){
    throw new Error("No such protocol: " + protocolName);
  }
  if (!callback){
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function){
    throw new Error("Callback is not a function.")
  }
  protocol.onReceived = callback;
}

Rhubarb.prototype.onDisconnectedFromServer = function(callback){
  if (!Globals.isReady){
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (this.IS_NODE){
    throw new Error("This Rhubarb instance is a server.");
  }
  if (!callback){
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function){
    throw new Error("Callback is not a function.")
  }
  WorkerBridge.onDisconnectedFromServer = callback;
}

Rhubarb.prototype.onClientConnected = function(callback){
  if (!Globals.isReady){
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (!this.IS_NODE){
    throw new Error("This Rhubarb instance is not a server.");
  }
  if (!callback){
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function){
    throw new Error("Callback is not a function.")
  }
  Globals.server.onClientConnected = callback;
}

Rhubarb.prototype.onClientDisconnected = function(callback){
  if (!Globals.isReady){
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (!this.IS_NODE){
    throw new Error("This Rhubarb instance is not a server.");
  }
  if (!callback){
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function){
    throw new Error("Callback is not a function.")
  }
  Globals.server.onClientDisconnected = callback;
}

Rhubarb.prototype.onLatencyUpdated = function(callback){
  if (!Globals.isReady){
    throw new Error("Rhubarb is not initialized yet.");
  }
  if (this.IS_NODE){
    throw new Error("This Rhubarb instance is a server.");
  }
  if (!callback){
    throw new Error("Callback not defined.");
  }
  if (!callback instanceof Function){
    throw new Error("Callback is not a function.")
  }
  WorkerBridge.latencyCallback = callback;
}

Rhubarb.prototype.destroy = function(){
  if (!Globals.isReady){
    throw new Error("Rhubarb not initialized. Use init API first.");
  }

  if (!this.IS_NODE){
    WorkerBridge.destroy();
  }else{
    Globals.server.destroy();
  }

  Globals.destroy();
  ReusableBufferCache.destroy();
  ProtocolParser.destroy();
}

// END OF PUBLIC APIs **********************************************************

Rhubarb.prototype._validateParameters = function(parameters){
  var protocolDefinitionPath = parameters.protocolDefinitionPath;
  var workerPath = parameters.workerPath;
  var isServer = parameters.isServer;
  var serverAddress = parameters.serverAddress;
  var serverListenPort = parameters.serverListenPort;
  var onReady = parameters.onReady;
  var onError = parameters.onError;

  if (!protocolDefinitionPath){
    throw new Error("protocolDefinitionPath is not defined within parameters.");
  }
  if (!this.IS_NODE && !workerPath){
    throw new Error("workerPath is not defined within parameters.");
  }
  if (!this.IS_NODE && isServer){
    throw new Error("Cannot use browser as a server.");
  }
  if (isServer && !serverListenPort){
    throw new Error("serverListenPort is not defined within parameters.");
  }
  if (!isServer && !serverAddress){
    throw new Error("serverAddress is not defined within parameters.");
  }
  if (!this.IS_NODE){
    if (!onReady){
      throw new Error("onReady is not defined within parameters.");
    }
    if (!onReady instanceof Function){
      throw new Error("onReady parameter is not a Function.");
    }
    if (!onError){
      throw new Error("onError is not defined within parameters.");
    }
    if (!onError instanceof Function){
      throw new Error("onError parameter is not a Function.");
    }
  }
}

Rhubarb.prototype._initWorker = function(workerPath, serverAddress){
  if (!this.IS_NODE && typeof Worker == "undefined"){
    throw new Error("This browser does not support web workers.");
  }else if (!this.IS_NODE){
    WorkerBridge.initialize(workerPath, serverAddress);
  }
}

Rhubarb.prototype._initNode = function(parameters){
  var protocolDefinitionPath = parameters.protocolDefinitionPath;
  var isServer = parameters.isServer;
  var serverListenPort = parameters.serverListenPort;
  var fs = require("fs");

  if (!fs.existsSync(protocolDefinitionPath)){
    throw new Error("Protocol definition file does not exist.");
  }
  var content = fs.readFileSync(protocolDefinitionPath, "utf8");
  var parsedJSON;
  try{
    parsedJSON = JSON.parse(content);
  }catch(err){
    throw new Error("Protocol definition file is not a valid JSON: " + err);
  }
  var protocols = ProtocolParser.parse(parsedJSON);
  Globals.set(protocols);

  var ws = require("ws");
  if (isServer){
    var server = new Server(ws);
    server.init(serverListenPort);
    Globals.setServer(server);
    Globals.setReady();
  }else{
    throw new Error("NodeJS clients are not yet supported.");
  }
}

export default new Rhubarb();
