import axios, { AxiosInstance } from 'axios';

/**
 * Creates a preconfigured Axios client for the Smarty Property API.
 * Handles authentication dynamically (Bearer or auth-id/token).
 */
export function createSmartyClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: 'https://property.api.smarty.com/v1',
    timeout: 5000,
  });

  instance.interceptors.request.use((config) => {
    if (process.env.SMARTY_KEY) {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${process.env.SMARTY_KEY}`;
    } else if (process.env.SMARTY_AUTH_ID && process.env.SMARTY_AUTH_TOKEN) {
      config.params = {
        ...(config.params as Record<string, unknown>),
        'auth-id': process.env.SMARTY_AUTH_ID,
        'auth-token': process.env.SMARTY_AUTH_TOKEN,
      };
    } else {
      throw new Error('❌ Missing Smarty credentials');
    }
    return config;
  });

  return instance;
}
