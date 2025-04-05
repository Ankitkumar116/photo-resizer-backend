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

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        let { width, height, sizeOption, unit } = req.body;
        
        const conversionFactors = {
            'cm': 37.7953,
            'inch': 96,
            'px': 1
        };
        
        const factor = conversionFactors[unit] || 37.7953;
        width = parseFloat(width) * factor;
        height = parseFloat(height) * factor;
        let quality = 80;

        if (sizeOption) {
            let customSize = parseInt(sizeOption);
            if (!isNaN(customSize) && customSize >= 5 && customSize <= 50) {
                quality = Math.max(10, Math.min(90, customSize * 2));
            }
        }

        const filePath = path.join(__dirname, 'public', 'output.jpg');

        await sharp(req.file.buffer)
            .resize(parseInt(width), parseInt(height))
            .jpeg({ quality })
            .toFile(filePath);

        res.json({ url: 'http://localhost:5000/download' });
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Error processing image' });
    }
});

// Proper file download route
app.get('/download', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'output.jpg');
    
    // Ensure file exists before sending
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

app.listen(5000, () => console.log('Server running on port 5000'));
