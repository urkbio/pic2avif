const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('convert-images', async (event, sourcePath, targetPath) => {
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif', '.bmp', '.heif', '.heic'];
  const files = fs.readdirSync(sourcePath);
  const results = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (supportedFormats.includes(ext)) {
      const sourceFull = path.join(sourcePath, file);
      const targetFull = path.join(targetPath, `${path.parse(file).name}.avif`);
      
      try {
        let image = sharp(sourceFull);
        
        // 对HEIC/HEIF文件进行两步转换处理
        if (ext === '.heic' || ext === '.heif') {
          // 先使用sips命令将HEIC转换为JPEG格式
          const tempJpegPath = path.join(targetPath, `${path.parse(file).name}_temp.jpg`);
          await new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            exec(`sips -s format jpeg "${sourceFull}" --out "${tempJpegPath}"`, (error, stdout, stderr) => {
              if (error) {
                reject(error);
                return;
              }
              resolve();
            });
          });
          
          // 使用新的Sharp实例将JPEG转换为AVIF
          image = sharp(tempJpegPath);
          
          // 转换完成后删除临时JPEG文件
          try {
            await image.avif({
              quality: 60,
              effort: 8,
              chromaSubsampling: '4:2:0'
            }).toFile(targetFull);
            
            fs.unlinkSync(tempJpegPath);
          } catch (conversionError) {
            fs.unlinkSync(tempJpegPath);
            throw conversionError;
          }
          
          continue; // 跳过后续的AVIF转换步骤
        }

        await image
          .avif({
            quality: 60,
            effort: 8, // 设置较高的压缩努力值以提高压缩率
            chromaSubsampling: '4:2:0' // 适当降低色度采样以提高压缩效果
          })
          .toFile(targetFull);
        
        results.push({
          file: file,
          success: true
        });
      } catch (error) {
        console.error(`转换失败 ${file}:`, error);
        
        let errorMessage = '未知错误';
        if (error.message.includes('corrupt header') || error.message.includes('invalid HEIF file')) {
          errorMessage = 'HEIC文件格式损坏或不兼容，请确保文件完整且格式正确';
        } else if (error.message.includes('Input file contains unsupported image format')) {
          errorMessage = '不支持的图像格式，请检查文件是否为有效的HEIC格式';
        } else if (error.message.includes('Input buffer contains unsupported image format')) {
          errorMessage = '无法识别的图像格式，可能需要更新系统的HEIC支持';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'HEIC处理超时，文件可能过大或系统资源不足';
        }
        
        results.push({
          file: file,
          success: false,
          error: errorMessage
        });
      }
    }
  }
  
  return results;
});