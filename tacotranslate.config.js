module.exports = {
  defaultLocale: 'es',
  locales: ['es', 'zh-CN'],
  sourceLocale: 'zh-CN',
  paths: {
    pages: 'src/app',
    components: 'src/components',
    lib: 'src/lib'
  },
  output: 'src/i18n',
  autoTranslate: true,
  model: 'openai/gpt-4'
};