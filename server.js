const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        let { width, height, sizeOption, unit } = req.body;

        const conversionFactors = {
            'cm': 37.7953,
            'inch': 96,
            'px': 1
        };

        const factor = conversionFactors[unit] || 37.7953;
        width = Math.round(parseFloat(width) * factor);
        height = Math.round(parseFloat(height) * factor);

        const targetKB = parseInt(sizeOption); // user-selected size in KB
        const targetBytes = targetKB * 1024;

        const outputPath = path.join(__dirname, 'public', 'output.jpg');
        const minQuality = 10;
        const maxQuality = 90;

        let selectedBuffer = null;

        for (let q = maxQuality; q >= minQuality; q -= 5) {
            const buffer = await sharp(req.file.buffer)
                .resize(width, height)
                .jpeg({ quality: q })
                .toBuffer();

            if (buffer.length <= targetBytes) {
                selectedBuffer = buffer;
                break;
            }

            // Save the smallest possible version as fallback
            if (!selectedBuffer || buffer.length < selectedBuffer.length) {
                selectedBuffer = buffer;
            }
        }

        fs.writeFileSync(outputPath, selectedBuffer);

        res.json({
            url: 'https://photo-resizer-backend1.onrender.com/download',
            actualSizeKB: Math.round(selectedBuffer.length / 1024)
        });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Error processing image' });
    }
});

// GET /download endpoint
app.get('/download', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'output.jpg');

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

app.listen(5000, () => console.log('✅ Server running on port 5000'));
