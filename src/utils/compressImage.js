/**
 * Compresses image files client-side before Base64 encoding.
 * Reduces large smartphone photos down to ~150KB-400KB.
 */
export const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      image.src = e.target.result;
    };

    image.onerror = (err) => reject(err);

    image.onload = () => {
      let { width, height } = image;

      // Scale down large images while keeping aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);

      // Export compressed image as JPEG Data URL
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64Data = compressedDataUrl.split(',')[1];

      resolve({
        filename: file.name,
        type: 'image',
        previewUrl: compressedDataUrl,
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg',
        },
      });
    };

    reader.readAsDataURL(file);
  });
};