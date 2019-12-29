(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Rhubarb = factory());
}(this, (function () { 'use strict';

var ReusableBufferCache = function ReusableBufferCache() {
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

var supportedChars = ["!", "\"", "#", "$", "%", "&", "\'", "(", ")", "*", "+", ",", "-", ".", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?", "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_", "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~", "q", "Q"];

var charByteMap = new Object();
var byteCharMap = new Object();
for (var i = 0; i < supportedChars.length; i++) {
  charByteMap[supportedChars[i]] = i + 1;
  byteCharMap[i + 1] = supportedChars[i];
}

var Protocol = function Protocol(name) {
  this.name = name;
  this.parameters = new Object();
  this.parameterIDsByParameterName = new Object();
  this.parameterBufferIndicesByParameterName = new Object();
};

Protocol.prototype.MAX_STRING_PARAMETER_LENGTH = 100;

Protocol.prototype.typeNumerical = { isNumerical: true, requiredBufferLen: 2 };

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
    return this.buffer[startIndex + 1];
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
    this.parameterBufferIndicesByParameterName[parameterName] = requiredBufferLen;
    var parameter = this.parameters[parameterName];
    requiredBufferLen += parameter.requiredBufferLen;
    if (!parameter.isNumerical) {
      ReusableBufferCache$1.notify(requiredBufferLen);
    }
  }
  this.buffer = new Float32Array(requiredBufferLen);
};

var ProtocolParser = function ProtocolParser() {
  this.NUMERICAL_TYPE = "numerical";
  this.CHARACTER_TYPE = "char";
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
ProtocolParser.prototype.parseProtocol = function (protocolInfo, protocolName) {
  var protocol = new Protocol(protocolName);
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
    var protocol = this.parseProtocol(protocolInfo, protocolName);
    parsedProtocols[protocol.name] = protocol;
  }
  return parsedProtocols;
};

var ProtocolParser$1 = new ProtocolParser();

var Rhubarb = function Rhubarb() {
  this.IS_NODE = typeof window == "undefined";
};

Rhubarb.prototype.initNode = function (protocolDefinitionPath) {
  var fs = require('fs');
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
  for (var key in protocols) {
    this.protocols[key] = protocols[key];
  }
  console.log(this.protocols);
};

Rhubarb.prototype.init = function (protocolDefinitionPath) {
  this.protocols = new Object();
  if (this.IS_NODE) {
    this.initNode(protocolDefinitionPath);
    return;
  }
  var xhttpRequest = new XMLHttpRequest();
  xhttpRequest.overrideMimeType("application/json");
  xhttpRequest.open("GET", protocolDefinitionPath, true);
  xhttpRequest.onreadystatechange = function () {
    if (xhttpRequest.readyState == 4 && xhttpRequest.status == "200") {
      var parsedJSON;
      try {
        parsedJSON = JSON.parse(xhttpRequest.responseText);
      } catch (err) {
        throw new Error("Protocol definition file is not a valid JSON: " + err);
      }
      var protocols = ProtocolParser$1.parse(parsedJSON);
      for (var key in protocols) {
        this.protocols[key] = protocols[key];
      }
    } else if (xhttpRequest.readyState == 4) {
      throw new Error("Protocol definition file not found.");
    }
  }.bind({ protocols: this.protocols });
  xhttpRequest.send(null);
};

var index = new Rhubarb();

return index;

})));
//# sourceMappingURL=Rhubarb.mjs.map
