// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Mantém a resolução por "exports" consistente para dependências modernas.
config.resolver.unstable_enablePackageExports = true;

// Prioriza bundles com condição "react-native" quando disponíveis.
config.resolver.unstable_conditionNames = ["require", "default", "react-native"];

module.exports = config;
