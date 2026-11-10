import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';

const root = path.dirname(fileURLToPath(import.meta.url));

export default (_env, argv = {}) => ({
  entry: ['./src/public-path.js', './src/asistente-lex-abogado.tsx'],
  output: {
    filename: 'asistente-lex-abogado.js',
    path: path.resolve(root, 'dist'),
    // Formato SystemJS: el Application Shell lo carga mediante su import map.
    library: { type: 'system' },
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        loader: 'esbuild-loader',
        options: { target: 'es2022', jsx: 'automatic' },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({ __AL_UI_PREVIEW__: JSON.stringify(argv.mode === 'development') }),
  ],
  devtool: 'source-map',
  performance: { hints: false },
  devServer: {
    host: 'localhost',
    port: Number(process.env.PORT ?? 9100),
    allowedHosts: 'all',
    headers: { 'Access-Control-Allow-Origin': '*' },
    hot: false,
  },
});
