import ProtocolParser from "./ProtocolParser";

var Rhubarb = function(){

}

Rhubarb.prototype.init = function(protocolDefinitionPath){
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
      ProtocolParser.parse(parsedJSON);
    }else if (xhttpRequest.readyState == 4){
      throw new Error("Protocol definition file not found.");
    }
  };
  xhttpRequest.send(null);
}

export default new Rhubarb();
