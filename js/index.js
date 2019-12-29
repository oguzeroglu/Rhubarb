import ProtocolParser from "./handler/ProtocolParser";
import WorkerBridge from "./worker/WorkerBridge";

var Rhubarb = function(){
  this.IS_NODE = (typeof window == "undefined");
  if (!this.IS_NODE && typeof Worker == "undefined"){
    throw new Error("This browser does not support web workers.");
  }else if (!this.IS_NODE){
    WorkerBridge.initialize();
  }
}

Rhubarb.prototype.initNode = function(protocolDefinitionPath){
  var fs = require('fs');
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
  for (var key in protocols){
    this.protocols[key] = protocols[key];
  }
}

Rhubarb.prototype.init = function(protocolDefinitionPath){
  this.protocols = new Object();
  if (this.IS_NODE){
    this.initNode(protocolDefinitionPath);
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
      for (var key in protocols){
        this.protocols[key] = protocols[key];
      }
    }else if (xhttpRequest.readyState == 4){
      throw new Error("Protocol definition file not found.");
    }
  }.bind({protocols: this.protocols});
  xhttpRequest.send(null);
}

export default new Rhubarb();
