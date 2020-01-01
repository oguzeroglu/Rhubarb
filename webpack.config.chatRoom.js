const path = require('path');
module.exports = {
  entry: "./js/",
  devServer: {
    port: 8086,
    historyApiFallback: {
      index: './examples/chatRoom/chatRoom.html'
    }
  },
  node: {
    fs: "empty"
  }
}
