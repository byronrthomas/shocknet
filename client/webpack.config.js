const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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