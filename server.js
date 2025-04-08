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

const outputDir = path.join(__dirname, 'public');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    let { width, height, sizeOption, unit } = req.body;

    const conversionFactors = {
      'cm': 37.7953,
      'inch': 96,
      'px': 1,
    };

    const factor = conversionFactors[unit] || 37.7953;
    width = parseFloat(width) * factor;
    height = parseFloat(height) * factor;

    let quality = 80;
    const sizeKB = parseInt(sizeOption);
    if (!isNaN(sizeKB) && sizeKB >= 5 && sizeKB <= 50) {
      quality = Math.max(10, Math.min(90, sizeKB * 2));
    }

    const uniqueId = uuidv4();
    const fileName = `output-${uniqueId}.jpg`;
    const filePath = path.join(outputDir, fileName);

    await sharp(req.file.buffer)
      .resize(Math.round(width), Math.round(height))
      .jpeg({ quality })
      .toFile(filePath);

    const baseUrl = 'https://photo-resizer-backend1.onrender.com';
    res.json({
      previewUrl: `${baseUrl}/preview/${fileName}`,
      downloadUrl: `${baseUrl}/download/${fileName}`,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Error processing image' });
  }
});

app.get('/preview/:filename', (req, res) => {
  const filePath = path.join(outputDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(outputDir, req.params.filename);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
