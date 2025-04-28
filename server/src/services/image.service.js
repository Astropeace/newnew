const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const sharp = require('sharp');

/**
 * Service to handle image processing and storage
 */
class ImageService {
  constructor() {
    // Configure AWS S3 if credentials are provided
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      });
      this.useS3 = true;
    } else {
      this.useS3 = false;
    }
  }

  /**
   * Upload image to S3 or local filesystem
   * @param {Object} file - File object from multer
   * @param {string} directory - Directory to store the image in (e.g., 'portfolio', 'products')
   * @returns {Promise<Object>} - Object with imageUrl and metadata
   */
  async uploadImage(file, directory = 'portfolio') {
    try {
      // Process image to create optimized versions
      const { processedFile, metadata } = await this.processImage(file);
      
      let imageUrl;
      let thumbnailUrl;
      
      // If AWS is configured, upload to S3
      if (this.useS3) {
        // Upload original file
        const s3Response = await this.uploadToS3(
          processedFile.original,
          `${directory}/${file.filename}`,
          file.mimetype
        );
        
        imageUrl = s3Response.Location;
        
        // Upload thumbnail if available
        if (processedFile.thumbnail) {
          const thumbnailResponse = await this.uploadToS3(
            processedFile.thumbnail,
            `${directory}/thumbnails/${file.filename}`,
            file.mimetype
          );
          
          thumbnailUrl = thumbnailResponse.Location;
        }
        
        // Delete local files after S3 upload
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        if (processedFile.originalPath && fs.existsSync(processedFile.originalPath)) {
          fs.unlinkSync(processedFile.originalPath);
        }
        if (processedFile.thumbnailPath && fs.existsSync(processedFile.thumbnailPath)) {
          fs.unlinkSync(processedFile.thumbnailPath);
        }
      } else {
        // Store locally
        const publicDirPath = path.join(__dirname, '../../public/images', directory);
        
        // Ensure directory exists
        if (!fs.existsSync(publicDirPath)) {
          fs.mkdirSync(publicDirPath, { recursive: true });
        }
        
        // Create thumbnails directory if it doesn't exist
        const thumbnailDirPath = path.join(publicDirPath, 'thumbnails');
        if (!fs.existsSync(thumbnailDirPath)) {
          fs.mkdirSync(thumbnailDirPath, { recursive: true });
        }
        
        // Move processed file to public directory
        const finalPath = path.join(publicDirPath, file.filename);
        fs.writeFileSync(finalPath, processedFile.original);
        
        // Set image URL
        imageUrl = `/images/${directory}/${file.filename}`;
        
        // Move thumbnail if available
        if (processedFile.thumbnail) {
          const thumbnailPath = path.join(thumbnailDirPath, file.filename);
          fs.writeFileSync(thumbnailPath, processedFile.thumbnail);
          thumbnailUrl = `/images/${directory}/thumbnails/${file.filename}`;
        }
      }
      
      return {
        imageUrl,
        thumbnailUrl,
        metadata
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }
  
  /**
   * Process image to create optimized versions
   * @param {Object} file - File object from multer
   * @returns {Promise<Object>} - Object with original and thumbnail buffers
   */
  async processImage(file) {
    try {
      // Read the file
      const imageBuffer = fs.readFileSync(file.path);
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Resize and optimize original
      const originalBuffer = await sharp(imageBuffer)
        .resize({
          width: 1920,
          height: 1080,
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat('jpeg', { quality: 85 })
        .toBuffer();
      
      // Create thumbnail
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'centre'
        })
        .toFormat('jpeg', { quality: 70 })
        .toBuffer();
      
      return {
        processedFile: {
          original: originalBuffer,
          thumbnail: thumbnailBuffer
        },
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size
        }
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }
  
  /**
   * Upload file to S3
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} key - S3 key (path)
   * @param {string} contentType - MIME type
   * @returns {Promise<Object>} - S3 upload response
   */
  async uploadToS3(fileBuffer, key, contentType) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType
    };
    
    return await this.s3.upload(params).promise();
  }
  
  /**
   * Delete image from S3 or local filesystem
   * @param {string} imageUrl - URL of image to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteImage(imageUrl) {
    try {
      if (this.useS3 && imageUrl.includes('amazonaws.com')) {
        // Extract key from S3 URL
        const key = imageUrl.split('/').slice(3).join('/');
        
        await this.s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key
        }).promise();
        
        // Also try to delete thumbnail if it exists
        try {
          const thumbKey = key.replace(/(\/[^\/]+)$/, '/thumbnails$1');
          await this.s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: thumbKey
          }).promise();
        } catch (error) {
          // Thumbnail may not exist, continue
          console.log('No thumbnail found or error deleting:', error);
        }
      } else if (imageUrl.startsWith('/images/')) {
        // Delete local file
        const filePath = path.join(__dirname, '../../public', imageUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        // Try to delete thumbnail if it exists
        const thumbPath = filePath.replace(/(\/[^\/]+)$/, '/thumbnails$1');
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      } else {
        throw new Error('Invalid image URL format');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }
  
  /**
   * Process and transfer images from a local directory to storage
   * @param {string} sourceDir - Source directory path 
   * @param {string} category - Image category for organization
   * @returns {Promise<Array>} - Array of processed images with metadata
   */
  async importFromDirectory(sourceDir, category = 'other') {
    try {
      const results = [];
      const files = fs.readdirSync(sourceDir);
      
      for (const file of files) {
        // Skip non-image files
        if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) continue;
        
        const filePath = path.join(sourceDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          // Create a file-like object similar to multer
          const fileObj = {
            path: filePath,
            filename: `imported-${Date.now()}-${file}`,
            originalname: file,
            mimetype: this.getMimeType(file),
            size: stats.size
          };
          
          // Upload and process the image
          const result = await this.uploadImage(fileObj, 'portfolio');
          
          results.push({
            filename: file,
            ...result
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error importing images from directory:', error);
      throw new Error('Failed to import images');
    }
  }
  
  /**
   * Get MIME type from file extension
   * @param {string} filename - Filename with extension
   * @returns {string} - MIME type
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new ImageService();
