// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  
  // Ensure server-only code stays on the server
  nitro: {
    esbuild: {
      options: {
        target: 'es2022'
      }
    }
  },
  
  typescript: {
    tsConfig: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: false,
        useDefineForClassFields: false
      }
    }
  },
  
  // Explicitly mark server-only directories
  ignore: [
    '**/server/**/*.test.ts',
    '**/server/**/*.spec.ts'
  ]
})
