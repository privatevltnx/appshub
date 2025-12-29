// Role-based access control
const UPLOAD_USERS = {
  "admin123": ["v1","v2","v3","v4","v5","v6","v7","v8","v9"],
  "friend456": ["v3","v6"], // only APK + MOD APK
  "tester789": ["v8"] // only images
};

// File size limits (in bytes)
const FILE_LIMITS = {
  "v3": 2 * 1024 * 1024 * 1024, // APK: 2GB
  "v6": 2 * 1024 * 1024 * 1024, // MOD APK: 2GB
  "v4": 2 * 1024 * 1024 * 1024, // Windows: 2GB
  "v5": 2 * 1024 * 1024 * 1024, // Linux: 2GB
  "v7": 2 * 1024 * 1024 * 1024, // Windows MOD: 2GB
  "v8": 2 * 1024 * 1024 * 1024,// Images: 2GB
  "v9": 2 * 1024 * 1024 * 1024,
  "v1": 2 * 1024 * 1024 * 1024, // GTA PC: 2GB
  "v2": 2 * 1024 * 1024 * 1024 // GTA Android: 2GB
};

let uploadedFiles = new Set(); // Track uploaded files

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function handleFileSelect() {
  const file = document.getElementById("file").files[0];
  const fileInfo = document.getElementById("fileInfo");
  
  if (file) {
    fileInfo.style.display = "block";
    fileInfo.innerHTML = `
      📄 <strong>${file.name}</strong><br>
      📊 Size: ${formatFileSize(file.size)}<br>
      📅 Modified: ${new Date(file.lastModified).toLocaleDateString()}
    `;
    
    // Check if file already exists
    if (uploadedFiles.has(file.name)) {
      showError(`⚠️ File "${file.name}" already exists. Please rename or delete the old one.`);
    } else {
      hideError();
    }
  } else {
    fileInfo.style.display = "none";
  }
}

function validateAccess(secret, release) {
  const allowedVersions = UPLOAD_USERS[secret];
  if (!allowedVersions) {
    return "Invalid password";
  }
  if (!allowedVersions.includes(release)) {
    return `Access denied. You can only upload to: ${allowedVersions.join(", ")}`;
  }
  return null;
}

function validateFileSize(file, release) {
  const limit = FILE_LIMITS[release];
  if (file.size > limit) {
    return `File too large. Max size for ${release}: ${formatFileSize(limit)}`;
  }
  return null;
}

function showProgress() {
  document.getElementById("progress").style.display = "block";
  document.getElementById("uploadBtn").disabled = true;
  document.getElementById("uploadBtn").classList.add("uploading");
  document.getElementById("uploadBtn").textContent = "⏳ Uploading...";
}

function hideProgress() {
  document.getElementById("progress").style.display = "none";
  document.getElementById("uploadBtn").disabled = false;
  document.getElementById("uploadBtn").classList.remove("uploading");
  document.getElementById("uploadBtn").textContent = "🚀 Upload File";
}

function updateProgress(percent, text) {
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").textContent = text;
}

function showResult(url, fileName) {
  const result = document.getElementById("result");
  result.style.display = "block";
  result.innerHTML = `
    <h3>✅ Upload Successful!</h3>
    <p><strong>File:</strong> ${fileName}</p>
    <input value="${url}" readonly style="margin-bottom: 10px;">
    <button class="copy-btn" onclick="copyToClipboard('${url}')">
      📋 Copy Download URL
    </button>
  `;
  
  // Add to uploaded files list
  uploadedFiles.add(fileName);
  
  // Log upload activity
  logUpload(fileName, document.getElementById("release").value);
}

function showError(message) {
  const error = document.getElementById("error");
  error.style.display = "block";
  error.innerHTML = `<h3>❌ Error</h3><p>${message}</p>`;
}

function hideError() {
  document.getElementById("error").style.display = "none";
}

function hideResult() {
  document.getElementById("result").style.display = "none";
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = "✅ Copied!";
    btn.style.background = "#059669";
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = "";
    }, 2000);
  });
}

function logUpload(fileName, version) {
  const logs = JSON.parse(localStorage.getItem('uploadLogs') || '[]');
  logs.push({
    fileName,
    version,
    timestamp: new Date().toISOString(),
    user: 'current_user'
  });
  localStorage.setItem('uploadLogs', JSON.stringify(logs.slice(-50)));
}

async function upload() {
  const file = document.getElementById("file").files[0];
  const secret = document.getElementById("secret").value;
  const release = document.getElementById("release").value;

  hideError();
  hideResult();

  if (!file || !secret) {
    showError("Please select a file and enter password");
    return;
  }

  // Skip validation for now to test if upload works
  showProgress();
  updateProgress(10, `Preparing ${file.name}...`);

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("secret", secret);
    form.append("release", release);

    updateProgress(30, "Uploading to server...");

    const res = await fetch("https://atomnexis-appshub-uploader.voltedgebuilds.workers.dev", {
      method: "POST",
      body: form
    });

    updateProgress(80, "Processing upload...");
    const data = await res.json();
    updateProgress(100, "Upload complete!");

    if (data.url) {
      setTimeout(() => {
        hideProgress();
        showResult(data.url, file.name);
      }, 500);
    } else {
      hideProgress();
      showError(data.error || "Upload failed. Please try again.");
    }
  } catch (error) {
    hideProgress();
    showError("Network error. Please check your connection and try again.");
  }
}

// Drag and drop functionality
document.addEventListener('DOMContentLoaded', function() {
  const fileLabel = document.querySelector('.file-input-label');

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileLabel.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    fileLabel.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileLabel.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
    fileLabel.style.borderColor = '#3b82f6';
    fileLabel.style.background = '#4b5563';
  }

  function unhighlight(e) {
    fileLabel.style.borderColor = '#6b7280';
    fileLabel.style.background = '#374151';
  }

  fileLabel.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      document.getElementById('file').files = files;
      handleFileSelect();
    }
  }
});
