const path = require('path');
module.exports = {
  entry: "./js/",
  devServer: {
    port: 8086,
    historyApiFallback: {
      index: 'test-page.html'
    }
  }
}
