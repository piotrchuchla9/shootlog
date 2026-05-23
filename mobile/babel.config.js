// widgetsPlugin must run before babel-preset-expo (and thus before React Compiler)
// so the 'widget' directive is captured before React Compiler can remove it.
const { widgetsPlugin } = require('babel-preset-expo/build/plugins/widgets-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    plugins: [widgetsPlugin],
    presets: ['babel-preset-expo'],
  };
};
