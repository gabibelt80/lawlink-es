import createTacoTranslateClient from 'tacotranslate';

const client = createTacoTranslateClient({
  apiKey: process.env.NEXT_PUBLIC_TACOTRANSLATE_PUBLIC_API_KEY ?? '',
  projectLocale: 'es',
});

export const tacoClient = client;
export default client;
