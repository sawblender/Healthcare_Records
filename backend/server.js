const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const app = express();
app.use(cors());
app.use(express.json());

const execFileAsync = promisify(execFile);
const predictionScript = path.resolve(__dirname, '..', 'federated_learning', 'predict_image.py');
const metricsJsonPath = path.resolve(__dirname, '..', 'federated_learning', 'federated_round_metrics_improved.json');
const metricsGraphPath = path.resolve(__dirname, '..', 'fl_metric.png');

const uploadsDir = path.join(__dirname, 'uploads', 'retinal_images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function resolveImagePath(metadata) {
  const filenamePath = metadata?.filename ? path.join(uploadsDir, metadata.filename) : null;

  if (filenamePath && fs.existsSync(filenamePath)) {
    return filenamePath;
  }

  if (metadata?.path && fs.existsSync(metadata.path)) {
    return metadata.path;
  }

  return null;
}

async function runPrediction(imagePath) {
  const { stdout, stderr } = await execFileAsync('python', [predictionScript, imagePath], {
    cwd: path.dirname(predictionScript),
    timeout: 120000,
    maxBuffer: 1024 * 1024
  });

  if (stderr && stderr.trim()) {
    console.warn('Prediction stderr:', stderr.trim());
  }

  let result;
  try {
    result = JSON.parse(stdout.trim());
  } catch (parseError) {
    throw new Error(`Invalid prediction response: ${stdout || parseError.message}`);
  }

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

app.post('/upload-retinal-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file' });
    
    const ipfsHash = `Qm${crypto.randomBytes(23).toString('hex')}`;
    const metadata = {
      ipfsHash,
      filename: req.file.filename,
      patientAddress: req.body.patientAddress,
      uploadDate: new Date().toISOString(),
      path: req.file.path
    };
    
    fs.writeFileSync(path.join(uploadsDir, `${req.file.filename}.json`), JSON.stringify(metadata, null, 2));
    res.json({ success: true, ipfsHash, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/predict-upload', upload.single('image'), async (req, res) => {
  const requestStart = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file' });
    }

    const result = await runPrediction(req.file.path);
    result.image_path = req.file.path;
    result.processing_latency_ms = Date.now() - requestStart;

    res.json(result);
  } catch (error) {
    console.error('Upload prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/retinal-image/:ipfsHash', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const metadata = JSON.parse(fs.readFileSync(path.join(uploadsDir, file), 'utf8'));
        if (metadata.ipfsHash === req.params.ipfsHash) {
          const imagePath = resolveImagePath(metadata);
          if (!imagePath) {
            return res.status(404).json({ error: 'Image file missing on disk' });
          }
          return res.sendFile(imagePath);
        }
      }
    }
    res.status(404).json({ error: 'Image not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/predict', async (req, res) => {
  const requestStart = Date.now();
  console.log('Predict endpoint called with body:', req.body);
  try {
    const { ipfsHash } = req.body;
    if (!ipfsHash) {
      console.log('No IPFS hash provided');
      return res.status(400).json({ error: 'No IPFS hash provided' });
    }
    
    console.log('Looking for image with hash:', ipfsHash);
    // Find image file
    const files = fs.readdirSync(uploadsDir);
    let imagePath = null;
    for (const file of files) {
      if (file.endsWith('.json')) {
        const metadata = JSON.parse(fs.readFileSync(path.join(uploadsDir, file), 'utf8'));
        if (metadata.ipfsHash === ipfsHash) {
          imagePath = resolveImagePath(metadata);
          console.log('Found image at:', imagePath);
          break;
        }
      }
    }
    
    if (!imagePath) {
      console.log('Image not found for hash:', ipfsHash);
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const result = await runPrediction(imagePath);
    result.image_path = imagePath;
    result.processing_latency_ms = Date.now() - requestStart;

    console.log('Sending prediction result:', result);
    res.json(result);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});

const SAMPLE_IMG_DIR = path.resolve(__dirname, '..', 'federated_learning', 'raw_data', 'resized_train_cropped', 'resized_train_cropped');

app.get('/sample-image/:imageName', (req, res) => {
  const imgPath = path.join(SAMPLE_IMG_DIR, req.params.imageName + '.jpeg');
  if (!fs.existsSync(imgPath)) return res.status(404).json({ error: 'Sample image not found' });
  res.sendFile(imgPath);
});

app.post('/predict-sample', async (req, res) => {
  const requestStart = Date.now();
  try {
    const { imageName } = req.body;
    if (!imageName) return res.status(400).json({ error: 'No imageName provided' });
    const imgPath = path.join(SAMPLE_IMG_DIR, imageName + '.jpeg');
    if (!fs.existsSync(imgPath)) return res.status(404).json({ error: 'Sample image not found' });
    const result = await runPrediction(imgPath);
    result.processing_latency_ms = Date.now() - requestStart;
    res.json(result);
  } catch (error) {
    console.error('Sample prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/federated-metrics', (req, res) => {
  try {
    const metrics = JSON.parse(fs.readFileSync(metricsJsonPath, 'utf8'));
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/federated-metrics-graph', (req, res) => {
  if (!fs.existsSync(metricsGraphPath)) {
    return res.status(404).json({ error: 'Metrics graph not found' });
  }
  res.sendFile(metricsGraphPath);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));
