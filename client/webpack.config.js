const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    effects: './src/effects.js',
    horizons: './src/horizons.js'
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devServer: {
    static: './dist',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js'
   },
  plugins: [
    new HtmlWebpackPlugin({
    title: 'ByronT: TigerGraph GraphForAll Finance Challenge',
    template: 'src/assets/template-effects.html',
    chunks: ['effects'],
    filename: 'effects.html'
  }),
    new HtmlWebpackPlugin({
    title: 'ByronT: TigerGraph GraphForAll Finance Challenge',
    template: 'src/assets/template-horizons.html',
    chunks: ['horizons'],
    filename: 'horizons.html'
  })],
  module: {
    rules: [{
      enforce: 'pre',
      test: /\.js$/,
      exclude: /node_modules/,
      use: 'eslint-loader'
    }, {

      test: /\.js$/,
     exclude: /node_modules/,
     use: 'babel-loader'
   }]
 }
};