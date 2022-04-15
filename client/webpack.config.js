const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const backendUrl = process.env.BUILD_FOR_DOCKER ? 'http://127.0.0.1:9000' : 'http://127.0.0.1:5000';

module.exports = {
  mode: 'development',
  entry: {
    effects: './src/effects.js',
    horizons: './src/horizons.js',
    groups: './src/groups.js',
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
    title: 'ShockNet: Effects Mode',
    template: 'src/assets/template-effects.html',
    chunks: ['effects'],
    filename: 'effects.html'
  }),
    new HtmlWebpackPlugin({
    title: 'ShockNet: Horizon Scanning Mode',
    template: 'src/assets/template-horizons.html',
    chunks: ['horizons'],
    filename: 'horizons.html'
  }),
    new HtmlWebpackPlugin({
    title: 'ShockNet: Group Analysis Mode',
    template: 'src/assets/template-groups.html',
    chunks: ['groups'],
    filename: 'groups.html'
  }),
    new CopyWebpackPlugin({
      patterns: [
          { from: 'static' }
      ]
    }),
    new webpack.DefinePlugin({
      __BACKEND_BASEURL__: JSON.stringify(backendUrl)}),
  ],
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