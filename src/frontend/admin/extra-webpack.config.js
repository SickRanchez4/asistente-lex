const singleSpaAngularWebpack = require('single-spa-angular/lib/webpack').default;

module.exports = (config, options) => {
  const singleSpaWebpackConfig = singleSpaAngularWebpack(config, options);

  // Angular ya genera los source maps con su propio plugin; el devtool que añade
  // single-spa-angular produciría un segundo main.js.map en conflicto.
  singleSpaWebpackConfig.devtool = false;

  // Permite que el shell, servido en otro puerto, cargue el microfrontend en desarrollo.
  singleSpaWebpackConfig.devServer = {
    ...singleSpaWebpackConfig.devServer,
    headers: { 'Access-Control-Allow-Origin': '*' },
  };

  return singleSpaWebpackConfig;
};
