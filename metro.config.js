// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Necessário para o Firebase JS SDK (usa o campo "exports" do package.json)
config.resolver.unstable_enablePackageExports = true;

// Garante que o Metro resolve os módulos com a condição "react-native",
// fazendo @firebase/auth usar o bundle correto (dist/rn/index.js)
// que inclui getReactNativePersistence.
config.resolver.unstable_conditionNames = ["require", "default", "react-native"];

module.exports = config;
