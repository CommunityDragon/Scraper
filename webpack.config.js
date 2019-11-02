const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './src/scraper.ts',
  mode: 'production',
  target: 'node',
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
    extensions: [ '.ts', '.js' ],
    plugins: [new TsconfigPathsPlugin()],
  },
  output: {
    filename: 'dragon-scraper.js',
    path: path.resolve(__dirname, '.build/cache'),
  },
};
