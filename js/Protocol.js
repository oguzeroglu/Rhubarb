var Protocol = function(name){
  this.name = name;
  this.parameters = new Object();
  this.parameterIDsByParameterName = new Object();
  this.parameterBufferIndicesByParameterName = new Object();
}

Protocol.prototype.typeNumerical = {isNumerical: true};

Protocol.prototype.addNumericalParameter = function(parameterName){
  this.parameters[parameterName] = this.typeNumerical;
}

Protocol.prototype.addStringParameter = function(parameterName, maxLength){
  this.parameters[parameterName] = {
    isNumerical: false, maxLength: maxLength
  };
}

Protocol.prototype.init = function(){
  var requiredBufferLen = 0;
  var curParameterID = 0;
  for (var parameterName in this.parameters){
    this.parameterIDsByParameterName[parameterName] = curParameterID ++;
    this.parameterBufferIndicesByParameterName[parameterName] = requiredBufferLen;
    var parameter = this.parameters[parameterName];
    if (parameter.isNumerical){
      requiredBufferLen += 2;
    }else{
      requiredBufferLen += (Math.ceil(parameter.maxLength / 4) + 1);
    }
  }
  this.buffer = new Float32Array(requiredBufferLen);
}

export default Protocol;
