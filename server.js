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
  low: 40,
  medium: 65,
  high: 85
};

// 🔁 Resize and Compress Endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    let { width, height, unit, quality } = req.body;

    const factor = conversionFactors[unit] || 37.7953;
    const qualityVal = qualityPresets[quality] || 65;

    width = parseFloat(width) * factor;
    height = parseFloat(height) * factor;

    const uniqueId = uuidv4();
    const filename = `output-${uniqueId}.jpg`;
    const filePath = path.join(__dirname, 'public', filename);

    await sharp(req.file.buffer)
      .resize(Math.round(width), Math.round(height))
      .jpeg({ quality: qualityVal })
      .toFile(filePath);

    const baseUrl = 'https://photo-resizer-backend1.onrender.com';
    const previewUrl = `${baseUrl}/${filename}`;
    const downloadUrl = `${baseUrl}/download/${filename}`;

    res.json({ previewUrl, downloadUrl });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Error processing image' });
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
