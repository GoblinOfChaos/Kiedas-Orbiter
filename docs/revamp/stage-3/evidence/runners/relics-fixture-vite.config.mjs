import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const mock='/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-relics/fixture/mock.js';
export default defineConfig({
  root:'/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-relics/fixture',
  plugins:[react()], publicDir:false,
  resolve:{alias:[
    {find:/.*\/contexts\/(MonitoringContext|UiContext)(\.jsx)?$/,replacement:mock},
    {find:/.*\/lib\/buildProfile(\.js)?$/,replacement:mock},
    {find:'@tauri-apps/api/core',replacement:mock}
  ]},
  build:{outDir:'dist',emptyOutDir:true}
});
