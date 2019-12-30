const path = require('path');
module.exports = {
  entry: "./js/",
  devServer: {
    port: 8086,
    historyApiFallback: {
      index: './examples/exampleGame/exampleGame.html'
    }
  },
  node: {
    fs: "empty"
  }
}
