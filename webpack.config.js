const path = require('path');
module.exports = {
  entry: "./js/",
  devServer: {
    port: 8086,
    historyApiFallback: {
      index: './dev/test-page.html'
    }
  },
  node: {
    fs: "empty"
  }
}
