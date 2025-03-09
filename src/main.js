const { exec } = require('child_process');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const EventEmitter = require('events');
const fs = require('fs');

// Error handling for the main process
process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
});

// Create the main window
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Load the index.html file
    mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
    
    // Optional: Uncomment for development
    // mainWindow.webContents.openDevTools();
}

// App lifecycle handlers
app
	.whenReady()
	.then(() => {
		createWindow();
		console.log('App started successfully');

		app.on('activate', () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				createWindow();
			}
		});
	})
	.catch((error) => {
		console.error('App failed to start:', error);
	});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// Utility function to check file existence
function checkFileExists(filePath) {
	try {
		return fs.existsSync(filePath);
	} catch (err) {
		return false;
	}
}

// IPC Handlers

// Get the desktop path
ipcMain.handle('get-desktop-path', () => {
	return app.getPath('desktop');
});

// Select directory dialog
ipcMain.handle('select-directory', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openDirectory'],
	});
	return result.filePaths[0];
});

// Download video handler (UPDATED)
ipcMain.handle('download-video', async (event, url, options) => {
    return new Promise((resolve, reject) => {
        const ytDlpPath = path.join(process.resourcesPath, 'yt-dlp_x86.exe');
		const ffmpegPath = path.join(process.resourcesPath, 'ffmpeg.exe');

        // Verify FFmpeg existence
        const hasFFmpeg = checkFileExists(ffmpegPath);
        if (options.format === 'mp3' && !hasFFmpeg) {
            reject('FFmpeg is required for MP3 conversion. Please install FFmpeg.');
            return;
        }

        let command = [
            `"${ytDlpPath}"`,
            '--restrict-filenames',
            '--newline',
            '-o', `"${path.join(options.downloadPath, '%(title)s.%(ext)s')}"`
        ];

        if (options.format === 'mp3') {
            command.push(
                '-x',
                '--audio-format', 'mp3',
                '--audio-quality', '0',
                '--ffmpeg-location', `"${path.dirname(ffmpegPath)}"`
            );
        }

        command.push(`"${url}"`);

        const childProcess = exec(command.join(' '), {
            encoding: 'utf-8',
            windowsHide: true,
            shell: true
        });

        // Store reference to the original event
        const mainEvent = event;

        childProcess.stdout.on('data', (data) => {
            const lines = data.split('\n');
            lines.forEach(line => {
                const progressMatch = line.match(/\[download\]\s+(\d+\.\d+)%/);
                if (progressMatch) {
                    const progress = parseFloat(progressMatch[1]);
                    mainEvent.sender.send('download-progress', progress);
                }

                if (line.includes('[Merger]')) {
                    mainEvent.sender.send('download-status', 'Merging streams...');
                }
                else if (line.includes('Deleting original file')) {
                    mainEvent.sender.send('download-status', 'Cleaning temporary files...');
                }
                else if (line.includes('has already been downloaded')) {
                    mainEvent.sender.send('download-warning', 'File already exists');
                    mainEvent.sender.send('download-progress', 100);
                }
            });
        });

        childProcess.stderr.on('data', (data) => {
            const error = data.trim();
            if (!error.includes('pp is not recognized')) {
                mainEvent.sender.send('download-error', error);
            }
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                mainEvent.sender.send('download-progress', 100);
                mainEvent.sender.send('download-status', 'Finalizing download...');
                resolve();
            } else {
                const error = `Failed with code ${code}`;
                mainEvent.sender.send('download-error', error);
                reject(error);
            }
        });
    });
});