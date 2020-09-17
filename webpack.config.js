const path = require('path');
const LavaMoat = require('lavamoat-webpack');

module.exports = {
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'index.cjs.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new LavaMoat({
      writeAutoConfig: true,
    })
  ],
  optimization: {
    concatenateModules: false,
  }
};
