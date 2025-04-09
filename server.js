const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const conversionFactors = {
  cm: 37.7953,
  inch: 96,
  px: 1
};

// Quality presets
const qualityPresets = {
  low: 50,
  medium: 90,
  high: 99
};
const deleteOldFiles = () => {
  const directory = path.join(__dirname, 'public');
  const timeLimit = 60 * 60 * 1000; // 1 hour in milliseconds

  fs.readdir(directory, (err, files) => {
    if (err) return console.error('Error reading directory:', err);

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return console.error('Error stating file:', err);

        const now = Date.now();
        if (now - stats.mtimeMs > timeLimit) {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete file:', err);
            else console.log(`Deleted old file: ${file}`);
          });
        }
      });
    });
  });
};

// 🔁 Resize and Compress Endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { width, height, unit, quality } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const numericWidth = parseFloat(width);
    const numericHeight = parseFloat(height);
    const conversionFactors = { cm: 37.7953, inch: 96, px: 1 };
    const qualityPresets = { low: 50, medium: 90, high: 99 };

    if (!conversionFactors[unit] || !qualityPresets[quality]) {
      return res.status(400).json({ error: 'Invalid unit or quality.' });
    }

    const pixelWidth = Math.round(numericWidth * conversionFactors[unit]);
    const pixelHeight = Math.round(numericHeight * conversionFactors[unit]);

    const outputFile = `uploads/resized_${Date.now()}.jpg`;

    await sharp(req.file.buffer)
      .resize(pixelWidth, pixelHeight)
      .jpeg({ quality: qualityPresets[quality] })
      .toFile(outputFile);

    const previewUrl = `${req.protocol}://${req.get('host')}/${outputFile}`;
    res.json({ previewUrl, downloadUrl: previewUrl });
  } catch (err) {
    console.error('Resize error:', err); // ← log full error
    res.status(500).json({ error: 'Server error during image processing.' });
  }
});


// 📏 Real-time Size Estimation
app.post('/estimate', upload.single('image'), async (req, res) => {
  try {
    let { width, height, unit, quality } = req.body;

    const factor = conversionFactors[unit] || 37.7953;
    const qualityVal = qualityPresets[quality] || 65;

    width = parseFloat(width) * factor;
    height = parseFloat(height) * factor;

    const buffer = await sharp(req.file.buffer)
      .resize(Math.round(width), Math.round(height))
      .jpeg({ quality: qualityVal })
      .toBuffer();

    const sizeKB = Math.round(buffer.length / 1024);
    res.json({ estimatedSizeKB: sizeKB });
  } catch (error) {
    console.error('Error estimating size:', error);
    res.status(500).json({ error: 'Estimation failed' });
  }
});

// 📥 Download endpoint
app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'public', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, 'resized-image.jpg', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download failed' });
      }
    });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// 📁 Ensure public folder exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Auto-delete old files every 15 minutes
setInterval(deleteOldFiles, 15 * 60 * 1000);

