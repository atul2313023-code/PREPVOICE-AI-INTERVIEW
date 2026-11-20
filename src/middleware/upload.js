const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF documents are permitted for upload.'), false);
  }
};

const audioFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('audio/') || 
    file.mimetype === 'video/webm' || 
    file.originalname.match(/\.(webm|wav|mp3|ogg|m4a)$/i)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only audio/voice files are permitted.'), false);
  }
};

const uploadPdf = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadAudio = multer({
  storage,
  fileFilter: audioFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

module.exports = { uploadPdf, uploadAudio };
