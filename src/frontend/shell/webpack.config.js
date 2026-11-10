import path from 'node:path';
import { fileURLToPath } from 'node:url';

import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const root = path.dirname(fileURLToPath(import.meta.url));

// URL de los microfrontends en el import map; el navegador las resuelve desde la máquina local.
const importMap = {
  abogadoUrl: process.env.ABOGADO_URL ?? 'http://localhost:9100/asistente-lex-abogado.js',
  adminUrl: process.env.ADMIN_URL ?? 'http://localhost:9200/main.js',
};

export default {
  entry: './src/root-config.ts',
  output: {
    filename: 'root-config.js',
    path: path.resolve(root, 'dist'),
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'esbuild-loader',
        options: { target: 'es2022' },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.ejs',
      templateParameters: importMap,
    }),
    // SystemJS y su extensión AMD se sirven desde el propio shell, sin CDN externos.
    new CopyWebpackPlugin({
      patterns: [
        { from: 'node_modules/systemjs/dist/system.min.js', to: 'libs/' },
        { from: 'node_modules/systemjs/dist/extras/amd.min.js', to: 'libs/' },
        { from: '../shared/ui.css', to: 'styles/ui.css' },
        { from: 'src/static', to: 'static/' },
      ],
    }),
  ],
  devtool: 'source-map',
  performance: { hints: false },
  devServer: {
    host: 'localhost',
    port: Number(process.env.PORT ?? 9000),
    historyApiFallback: true,
    proxy: [{ context: ['/graphql'], target: process.env.GATEWAY_URL ?? 'http://localhost:4000' }],
  },
};
