// Polyfill for TextEncoder/TextDecoder needed for react-router v7 in jsdom environment
const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, {
  TextEncoder,
  TextDecoder,
});

