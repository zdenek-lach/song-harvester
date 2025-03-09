// DOM Elements
const urlInput = document.getElementById('urlInput');
const downloadButton = document.getElementById('downloadButton');
const formatSelect = document.getElementById('formatSelect');
const downloadPath = document.getElementById('downloadPath');
const choosePath = document.getElementById('choosePath');
const progressBar = document.getElementById('progressBar');
const consoleOutput = document.getElementById('consoleOutput');

// Popup function
function showPopup(message, type = 'info') {
    const popup = document.createElement('div');
    popup.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    popup.style.zIndex = 1000;
    popup.style.minWidth = '300px';
    popup.textContent = message;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 3000);
}

// Console output function
function appendToConsole(text) {
    const line = document.createElement('div');
    line.textContent = text;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Initialize default download path
window.electron.getDesktopPath().then(path => {
    downloadPath.value = path;
}).catch(error => {
    console.error('Failed to get desktop path:', error);
    downloadPath.value = 'C:\\Downloads';
    showPopup('Using default download location', 'warning');
});

// Directory chooser
choosePath.addEventListener('click', async () => {
    try {
        const path = await window.electron.selectDirectory();
        if (path) {
            downloadPath.value = path;
            showPopup('Download location updated', 'success');
        }
    } catch (error) {
        showPopup('Failed to select directory', 'danger');
        console.error('Directory selection error:', error);
    }
});

// Set up event listeners
window.electron.onDownloadProgress((event, percentage) => {
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${Math.round(percentage)}%`;
    
    if (percentage >= 100) {
        progressBar.classList.remove('progress-bar-animated');
        progressBar.classList.add('bg-success');
    }
});

window.electron.onDownloadStatus((event, message) => {
    appendToConsole(`ℹ️ ${message}`);
});

window.electron.onDownloadWarning((event, message) => {
    showPopup(message, 'warning');
    appendToConsole(`⚠️ ${message}`);
});

window.electron.onDownloadError((event, error) => {
    showPopup(error, 'danger');
    appendToConsole(`❌ Error: ${error}`);
    
    progressBar.style.width = '100%';
    progressBar.textContent = 'Error';
    progressBar.classList.remove('progress-bar-animated');
    progressBar.classList.add('bg-danger');
});

// Download button handler
downloadButton.addEventListener('click', async () => {
    const url = urlInput.value;
    if (!url) {
        showPopup('Please enter a URL', 'warning');
        return;
    }

    try {
        // Reset UI
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.classList.remove('bg-success', 'bg-danger');
        progressBar.classList.add('progress-bar-animated');
        consoleOutput.innerHTML = '';
        appendToConsole('🚀 Starting download...');

        await window.electron.downloadVideo(url, {
            format: formatSelect.value,
            downloadPath: downloadPath.value
        });

        showPopup('✅ Download completed!', 'success');
        appendToConsole('🎉 Download completed successfully!');

    } catch (error) {
        const friendlyError = error.includes('FFmpeg is required') 
            ? 'FFmpeg is required for MP3 conversion. Please install FFmpeg.'
            : 'Download failed - please check the URL';
        
        showPopup(friendlyError, 'danger');
        appendToConsole(`❌ Error: ${error}`);
        
        progressBar.style.width = '100%';
        progressBar.textContent = 'Error';
        progressBar.classList.remove('progress-bar-animated');
        progressBar.classList.add('bg-danger');
    }
});

// Enter key support
urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        downloadButton.click();
    }
});

// Initial debug check
console.log('Renderer initialized successfully');
// Add at the bottom of the file

// Sidebar Toggle
const menuButton = document.getElementById('menuButton');
const closeSidebar = document.getElementById('closeSidebar');
const sidebar = document.getElementById('sidebar');

menuButton.addEventListener('click', () => {
    sidebar.classList.add('active');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('active');
});

// Dark Mode Toggle
const themeToggle = document.getElementById('themeToggle');
let isDarkMode = localStorage.getItem('darkMode') === 'true';

function updateTheme() {
    document.body.classList.toggle('dark-mode', isDarkMode);
    themeToggle.innerHTML = isDarkMode ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
}

// Initialize theme
updateTheme();

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    updateTheme();
});

// Close sidebar when clicking outside
document.addEventListener('click', (event) => {
    if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
        sidebar.classList.remove('active');
    }
});