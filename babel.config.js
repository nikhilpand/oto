module.exports = function (api) {
  api.cache(true);
  const presetExpo = (() => {
    try {
      return require.resolve('babel-preset-expo');
    } catch {
      return require.resolve('babel-preset-expo', { paths: [require.resolve('expo')] });
    }
  })();

  return {
    presets: [presetExpo],
    plugins: [
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
