var supportedChars = [
  "!", "\"", "#", "$", "%", "&", "\'", "(", ")", "*", "+", ",", "-", ".", "/",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?",
  "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O",
  "P", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_", "`",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p",
  "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~", "q", "Q"
];

var charByteMap = new Object();
for (var i = 0; i<supportedChars.length; i++){
  charByteMap[supportedChars[i]] = (i+1);
}

export default charByteMap;
