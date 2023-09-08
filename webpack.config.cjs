const path = require('path');

// module.exports = {
//   target: 'node',
//   mode: 'production',
//   entry: './src/handlers/test.js', // Entry point to your Lambda function
//   output: {
//     path: path.resolve(__dirname, 'dist'),
//     filename: 'index.js',
//     libraryTarget: 'commonjs2',
//   },
//   externals: [],
//   module: {
//     rules: [
//       {
//         test: /\.js$/,
//         exclude: /node_modules/,
//         use: {
//           loader: 'babel-loader',
//           options: {
//             presets: ['@babel/preset-env'],
//           },
//         },
//       },
//       {
//         test: /\.node$/,
//         loader: 'node-loader',
//       }
//     ],
//   },
// };


module.exports = {
  target: 'node',
  mode: 'production',
  entry: './src/handlers/rp-st-automation.js', // Modify this back to your actual entry point
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
      }
    ],
  },
};
