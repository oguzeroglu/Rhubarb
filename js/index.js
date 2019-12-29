import ProtocolParser from "./handler/ProtocolParser";
import WorkerBridge from "./worker/WorkerBridge";
import Server from "./node/Server";
import Globals from "./util/Globals";

var Rhubarb = function(){
  this.IS_NODE = (typeof window == "undefined");
}

Rhubarb.prototype.validateParameters = function(parameters){
  var protocolDefinitionPath = parameters.protocolDefinitionPath;
  var workerPath = parameters.workerPath;
  var isServer = parameters.isServer;
  var serverAddress = parameters.serverAddress;
  var serverListenPort = parameters.serverListenPort;
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
}

Rhubarb.prototype.initWorker = function(workerPath, serverAddress){
  if (!this.IS_NODE && typeof Worker == "undefined"){
    throw new Error("This browser does not support web workers.");
  }else if (!this.IS_NODE){
    WorkerBridge.initialize(workerPath, serverAddress);
  }
}

Rhubarb.prototype.initNode = function(parameters){
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
  }else{
    throw new Error("NodeJS clients are not yet supported.");
  }
}

Rhubarb.prototype.init = function(parameters){
  this.validateParameters(parameters);

  var protocolDefinitionPath = parameters.protocolDefinitionPath;
  var workerPath = parameters.workerPath;
  var serverAddress = parameters.serverAddress;

  if (this.IS_NODE){
    this.initNode(parameters);
    return;
  }
  var xhttpRequest = new XMLHttpRequest();
  xhttpRequest.overrideMimeType("application/json");
  xhttpRequest.open("GET", protocolDefinitionPath, true);
  xhttpRequest.onreadystatechange = function(){
    if (xhttpRequest.readyState == 4 && xhttpRequest.status == "200"){
      var parsedJSON;
      try{
        parsedJSON = JSON.parse(xhttpRequest.responseText);
      }catch(err){
        throw new Error("Protocol definition file is not a valid JSON: " + err);
      }
      var protocols = ProtocolParser.parse(parsedJSON);
      Globals.set(protocols);
      this.initWorker(workerPath, serverAddress);
    }else if (xhttpRequest.readyState == 4){
      throw new Error("Protocol definition file not found.");
    }
  }.bind({initWorker: this.initWorker});
  xhttpRequest.send(null);
}

export default new Rhubarb();
