import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import istanbul from 'rollup-plugin-istanbul';

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

let plugins = [
  babel(babelrc())
];

if (process.env.BUILD !== 'production') {
  plugins.push(istanbul({
    exclude: ['test/**/*', 'node_modules/**/*']
  }));
}

export default {
  entry: 'js/worker/WebSocketWorker.js',
  plugins: plugins,
  external: external,
  targets: [
    {
      dest: pkg.worker,
      format: 'umd',
      moduleName: 'RhubarbWorker',
      sourceMap: true
    }
  ]
};
