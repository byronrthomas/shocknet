const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    bundle: './src/index.js'
  },
  devServer: {
    static: './dist',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
   },
   plugins: [new HtmlWebpackPlugin({
    title: 'ByronT: TigerGraph GraphForAll Finance Challenge',
    // Load a custom template (lodash by default)
    template: 'src/template-index.html'
  })],
  module: {
    rules: [{
      test: /\.js$/,
     exclude: /node_modules/,
     use: 'babel-loader'
   }]
 }
};