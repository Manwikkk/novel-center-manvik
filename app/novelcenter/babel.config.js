module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
        },
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json'],
      },
    ],
    // Reanimated 4 / worklets plugin must be listed last.
    'react-native-worklets/plugin',
  ],
};
