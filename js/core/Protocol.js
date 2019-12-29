import ReusableBufferCache from "../util/ReusableBufferCache";
import {charByteMap, byteCharMap} from "../util/CharByteMap";


var Protocol = function(name, id){
  this.name = name;
  this.id = id;
  this.parameters = new Object();
  this.parameterIDsByParameterName = new Object();
  this.parameterBufferIndicesByParameterName = new Object();
}

Protocol.prototype.MAX_STRING_PARAMETER_LENGTH = 100;

Protocol.prototype.typeNumerical = {isNumerical: true, requiredBufferLen: 2};

Protocol.prototype.onOwnershipReceived = function(transferableMessageBody){
  this.transferableMessageBody.array = transferableMessageBody.array;
  this.transferableList[0] = transferableMessageBody.array.buffer;
  this.hasOwnership = true;
}

Protocol.prototype.getCharByte = function(char){
  return charByteMap[char] || 0;
}

Protocol.prototype.getParameterFromBuffer = function(parameterName){
  var parameter = this.parameters[parameterName];
  if (!parameter){
    throw new Error("No such parameter: "+parameterName+" in protocol: "+this.name);
  }
  var startIndex = this.parameterBufferIndicesByParameterName[parameterName];
  if (parameter.isNumerical){
    return this.buffer[startIndex + 1];
  }
  var computationBuffers = ReusableBufferCache.get(parameter.requiredBufferLen);
  var float32 = computationBuffers.float32;
  for (var i = 0; i<parameter.requiredBufferLen; i++){
    float32[i] = this.buffer[startIndex + 1 + i];
  }
  var uint8 = computationBuffers.uint8;
  var value = "";
  for (var i = 0; i<uint8.length; i++){
    if (uint8[i] == 0){
      break;
    }
    value += byteCharMap[uint8[i]];
  }
  return value;
}

Protocol.prototype.setParameterToBuffer = function(parameterName, value){
  var parameter = this.parameters[parameterName];
  if (!parameter){
    throw new Error("No such parameter: "+parameterName+" in protocol: "+this.name);
  }
  var startIndex = this.parameterBufferIndicesByParameterName[parameterName];
  var parameterID = this.parameterIDsByParameterName[parameterName];
  this.buffer[startIndex] = parameterID;
  if (parameter.isNumerical){
    this.buffer[startIndex + 1] = value;
  }else{
    if (value.length > parameter.maxLength){
      throw new Error("Parameter overflow: "+parameterName+" in protocol "+this.name);
    }
    var computationBuffers = ReusableBufferCache.get(parameter.requiredBufferLen);
    var uint8 = computationBuffers.uint8;
    for (var i = 0; i<uint8.length; i++){
      if (i < value.length){
        uint8[i] = this.getCharByte(value[i]);
      }else{
        uint8[i] = 0;
      }
    }
    var float32 = computationBuffers.float32;
    var curIndex = startIndex + 1;
    for (var i = 0; i<float32.length; i++){
      this.buffer[curIndex ++] = float32[i];
    }
  }
}

Protocol.prototype.addNumericalParameter = function(parameterName){
  this.parameters[parameterName] = this.typeNumerical;
}

Protocol.prototype.addStringParameter = function(parameterName, maxLength){
  if (maxLength > this.MAX_STRING_PARAMETER_LENGTH){
    throw new Error("Parameter size exceeds max allowed string parameter size "+this.MAX_STRING_PARAMETER_LENGTH);
  }
  this.parameters[parameterName] = {
    isNumerical: false, maxLength: maxLength, requiredBufferLen: (Math.ceil(maxLength / 4) + 1)
  };
}

Protocol.prototype.init = function(){
  var requiredBufferLen = 0;
  var curParameterID = 0;
  for (var parameterName in this.parameters){
    this.parameterIDsByParameterName[parameterName] = curParameterID ++;
    this.parameterBufferIndicesByParameterName[parameterName] = requiredBufferLen + 1;
    var parameter = this.parameters[parameterName];
    requiredBufferLen += parameter.requiredBufferLen;
    if (!parameter.isNumerical){
      ReusableBufferCache.notify(requiredBufferLen);
    }
  }
  this.buffer = new Float32Array(requiredBufferLen + 1);
  this.buffer[0] = this.id;
  this.transferableMessageBody = { array: new Float32Array(requiredBufferLen + 1) };
  this.transferableList = [this.transferableMessageBody.array.buffer];
  this.hasOwnership = true;
}

export default Protocol;
