module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // expo-router + alias @/ (cf tsconfig paths)
  };
};
