const { app, Tray, nativeImage } = require('electron');

console.log('TEST: App starting...');

app.whenReady().then(() => {
  console.log('TEST: App ready!');
  
  try {
    const tray = new Tray(nativeImage.createEmpty());
    tray.setToolTip('Test Tray App');
    console.log('TEST: Tray created!');
  } catch (error) {
    console.error('TEST: Error:', error);
  }
});

console.log('TEST: Setup done!');
