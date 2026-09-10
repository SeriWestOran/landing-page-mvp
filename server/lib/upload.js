// server/lib/upload.js
// Upload d'image vers Cloudinary (plutôt que le disque local, qui n'est
// pas persistant sur la plupart des hébergeurs gratuits). Expose la même
// interface `upload.single(fieldName)(req, res, callback)` que Multer
// utilisait avec le disque, pour que products.js et services.js n'aient
// rien à changer : après l'upload, `req.file.path` contient l'URL
// Cloudinary de l'image (au lieu d'un chemin local).

const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Si les 3 variables séparées sont fournies, on les utilise. Sinon, le SDK
// Cloudinary lit automatiquement CLOUDINARY_URL depuis l'environnement.
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 Mo
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Format d'image non autorisé (jpg, png, webp uniquement)."));
    }
    cb(null, true);
  },
});

function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "boutique", resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function createImageUpload() {
  return {
    single(fieldName) {
      const parseSingle = memoryUpload.single(fieldName);
      return (req, res, callback) => {
        parseSingle(req, res, async (err) => {
          if (err) return callback(err);
          if (!req.file) return callback();
          try {
            const result = await uploadBufferToCloudinary(req.file.buffer);
            // Mimique la propriété .path que Multer aurait posée avec un
            // stockage disque, pour rester compatible avec le reste du code.
            req.file.path = result.secure_url;
            req.file.filename = result.public_id;
            callback();
          } catch (uploadErr) {
            callback(uploadErr);
          }
        });
      };
    },
  };
}

module.exports = { createImageUpload };
