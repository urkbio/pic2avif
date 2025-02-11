const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// 配置 Sharp 的硬件加速
sharp.simd(true);

let mainWindow;

// 主线程代码
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow).catch(console.error);

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

// 转换单个图片的函数
async function convertImage(file, sourcePath, targetPath) {
  const sourceFull = path.join(sourcePath, file);
  const targetFull = path.join(targetPath, `${path.parse(file).name}.avif`);
  const ext = path.extname(file).toLowerCase();
  
  try {
    let image = sharp(sourceFull);
    
    if (ext === '.heic' || ext === '.heif') {
      const tempJpegPath = path.join(targetPath, `${path.parse(file).name}_temp.jpg`);
      
      // 使用 sips 命令转换 HEIC/HEIF 到 JPEG
      await new Promise((resolve, reject) => {
        exec(`sips -s format jpeg "${sourceFull}" --out "${tempJpegPath}"`, (error) => {
          if (error) {
            reject(new Error('HEIC/HEIF转换失败，请确保文件格式正确'));
            return;
          }
          resolve();
        });
      });
      
      try {
        image = sharp(tempJpegPath);
        await image.avif({
          quality: 60,
          effort: 8,
          chromaSubsampling: '4:2:0'
        }).toFile(targetFull);
        
        fs.unlinkSync(tempJpegPath);
        return { file, success: true };
      } catch (error) {
        if (fs.existsSync(tempJpegPath)) {
          fs.unlinkSync(tempJpegPath);
        }
        throw error;
      }
    }

    await image.avif({
      quality: 60,
      effort: 8,
      chromaSubsampling: '4:2:0'
    }).toFile(targetFull);
    
    return { file, success: true };
  } catch (error) {
    let errorMessage = '未知错误';
    if (error.message.includes('corrupt header') || error.message.includes('invalid HEIF file')) {
      errorMessage = '文件格式损坏或不兼容，请确保文件完整且格式正确';
    } else if (error.message.includes('Input file contains unsupported image format')) {
      errorMessage = '不支持的图像格式，请检查文件格式是否正确';
    } else if (error.message.includes('Input buffer contains unsupported image format')) {
      errorMessage = '无法识别的图像格式，请检查文件完整性';
    }
    
    return { file, success: false, error: errorMessage };
  }
}

ipcMain.handle('convert-images', async (event, sourcePath, targetPath) => {
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif', '.bmp', '.heif', '.heic'];
  const files = fs.readdirSync(sourcePath).filter(file => 
    supportedFormats.includes(path.extname(file).toLowerCase())
  );
  
  const results = [];
  let failedCount = 0;
  
  for (const file of files) {
    try {
      const result = await convertImage(file, sourcePath, targetPath);
      results.push(result);
      
      if (!result.success) {
        failedCount++;
        // 如果失败率超过50%，终止转换
        if (failedCount > Math.floor(results.length / 2)) {
          throw new Error('转换失败率过高，请检查文件格式是否正确');
        }
      }
    } catch (error) {
      results.push({ file, success: false, error: error.message });
      failedCount++;
      
      if (failedCount > Math.floor(results.length / 2)) {
        return [...results, { error: '转换失败率过高，请检查文件格式是否正确', success: false }];
      }
    }
  }
  
  return results;
});