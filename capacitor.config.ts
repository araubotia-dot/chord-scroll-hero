import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d349c606fc94497e825215feea22141d',
  appName: 'chord-scroll-hero',
  webDir: 'dist',
  server: {
    url: "https://d349c606-fc94-497e-8252-15feea22141d.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;