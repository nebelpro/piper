'use strict'
const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const config = require('./config')
const _ = require('./utils')

module.exports = {
  performance: {
    hints: false
  },
  entry: {
    'app': './src/app.js',
    'app.vendor': ['vue', 'vue-router', 'vue-resource', 'element-ui'],
    'preview': './src/preview.js'
  },
  output: {
    path: _.outputPath,
    filename: '[name].js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.js', '.vue', '.css', '.json'],
    alias: {
      // 'vue': 'vue/dist/vue.common.js',
      'src': path.join(__dirname, '../src'),
      '_variable.less': path.join(__dirname, '../src/skin/_variable.less'),
      '_base.less': path.join(__dirname, '../src/skin/_base.less')
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: config.vue
      },
      // {
      //   test: /\.js$/,
      //   loader: 'babel-loader',
      //   exclude: /node_modules/,
      //   options: config.babel
      // },
      {
        test: /\.js$/,
        loader: 'buble-loader',
        exclude: /node_modules/,
        options: {
          objectAssign: 'Object.assign'
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.(ico|jpg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
        loader: 'file-loader',
        options: {
          name: 'static/media/[name].[hash:8].[ext]'
        }
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
        name: 'app.vendor',
        chunks: ['app']
    }),
    new webpack.optimize.CommonsChunkPlugin({
        name: 'common.vendor',
        chunks: ['preview', 'app.vendor']
    }),
    new HtmlWebpackPlugin({
      title: config.title,
      template: __dirname + '/index.html',
      excludeChunks: ['preview'],
      filename: _.outputPath + '/index.html'
    }),
    new HtmlWebpackPlugin({
      title: config.title,
      template: __dirname + '/preview.html',
      excludeChunks: ['app', 'app.vendor'],
      filename: _.outputPath + '/preview.html'
    })
  ]
}
