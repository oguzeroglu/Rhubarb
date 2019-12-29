var ReusableBufferCache = function(){
  this.cache = new Object();
}

ReusableBufferCache.prototype.notify = function(len){
  if (!this.cache[len]){
    var float32 = new Float32Array(len);
    var uint8 = new Uint8Array(float32.buffer);
    this.cache[len] = {
      uint8: uint8,
      float32: float32
    };
  }
}

ReusableBufferCache.prototype.get = function(strLength){
  var elem = this.cache[strLength];
  if (!elem){
    throw new Error("ReusableBufferCache is empty.");
  }
  return elem;
}

export default new ReusableBufferCache();
