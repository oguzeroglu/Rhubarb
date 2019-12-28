import ProtocolParser from "./ProtocolParser";

var Rhubarb = function(){
  var banner = "%c";
  banner += "______ _           _                _     " + "\n";
  banner += "| ___ \\ |         | |              | |    " + "\n";
  banner += "| |_/ / |__  _   _| |__   __ _ _ __| |__  " + "\n";
  banner += "|    /| '_ \\| | | | '_ \\ / _` | '__| '_ \\ " + "\n";
  banner += "| |\\ \\| | | | |_| | |_) | (_| | |  | |_) |" + "\n";
  banner += "\\_| \\_|_| |_|\\__,_|_.__/ \\__,_|_|  |_.__/ " + "\n";
  banner += "                                          " + "\n";
  banner += "                           by Oguz Eroglu " + "\n";
  banner += "                                          " + "\n";

  console.log(banner, "background: black; color: lime");
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
