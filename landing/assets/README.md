# Assets Directory

This directory contains all static assets for the Mixmi landing page.

## Directory Structure

```
assets/
├── images/          # Images (hero images, stickers, icons, etc.)
├── fonts/           # Custom fonts (if needed)
└── icons/           # SVG icons and logos
```

## How to Upload Assets

### Option 1: Using Git (Recommended for Production)

1. Place your assets in the appropriate subdirectory:
   - Images → `assets/images/`
   - Fonts → `assets/fonts/`
   - Icons → `assets/icons/`

2. Add and commit files:
   ```bash
   git add landing/assets/
   git commit -m "Add landing page assets"
   git push
   ```

3. Deploy to Firebase:
   ```bash
   ./scripts/deploy.sh --env prod --target landing
   ```

### Option 2: Using Firebase Storage (For Dynamic Assets)

If you need to host large files or frequently update assets:

1. Upload to Firebase Storage via the console:
   - Go to https://console.firebase.google.com/project/mixmi-66529/storage
   - Create a `landing-assets` bucket
   - Upload your files

2. Update your `index.html` to reference Cloud Storage URLs

### Option 3: Using a CDN (For Production Scale)

For optimal performance with many assets:

1. Upload to a CDN (Cloudinary, ImageKit, etc.)
2. Update image URLs in `index.html` to point to CDN
3. Use responsive image formats (WebP, AVIF)

## Current Asset Placeholders

The landing page currently uses placeholder images. Replace these with your actual assets:

### Hero Images (730x417px recommended)
- `assets/images/hero-1.jpg`
- `assets/images/hero-2.jpg`
- `assets/images/hero-3.jpg`
- `assets/images/hero-4.jpg`

### Sticker Previews
- `assets/images/sticker-1.png` (154x93px)
- `assets/images/sticker-2.png` (224x94px)
- `assets/images/sticker-3.png` (192x107px)
- `assets/images/sticker-4.png` (201x206px)
- `assets/images/sticker-5.png` (136x137px)

### Feature Icons (124x124px)
- `assets/icons/effortless-selling.svg`
- `assets/icons/buyer-printing.svg`
- `assets/icons/sticker-stacking.svg`
- `assets/icons/platform.svg`

### Logo & Branding
- `assets/images/logo.svg` or `logo.png` (93x32px)

### Subscribe Section Images
- `assets/images/subscribe-1.jpg` (730x417px)
- `assets/images/subscribe-2.jpg` (730x417px)
- `assets/images/subscribe-3.jpg` (730x417px)
- `assets/images/subscribe-4.jpg` (730x417px)

## Image Optimization

Before uploading, optimize your images:

```bash
# Install ImageMagick (Mac)
brew install imagemagick

# Resize and optimize
convert input.jpg -resize 730x417 -quality 85 output.jpg

# Or use online tools:
# - TinyPNG.com
# - Squoosh.app
# - ImageOptim
```

## After Adding Assets

1. Update `index.html` to reference your asset paths:
   ```html
   <!-- Replace this -->
   <img src="https://placehold.co/730x417" alt="Hero">
   
   <!-- With this -->
   <img src="assets/images/hero-1.jpg" alt="Hero">
   ```

2. Test locally:
   ```bash
   cd landing
   python3 -m http.server 8080
   # Visit http://localhost:8080
   ```

3. Deploy to Firebase:
   ```bash
   ./scripts/deploy.sh --env prod --target landing
   ```

## Asset Guidelines

- **Formats**: Use JPG for photos, PNG for icons/transparencies, SVG for logos
- **Sizes**: Optimize images to web-friendly sizes (< 500KB each)
- **Dimensions**: Match the recommended dimensions for best quality
- **Naming**: Use descriptive, lowercase names with hyphens (e.g., `hero-main.jpg`)
- **Alt text**: Always add meaningful alt text to images in HTML

## Need Help?

- Check the main [README](../README.md) for deployment instructions
- See [Firebase Storage Docs](https://firebase.google.com/docs/storage) for storage setup
- Contact the development team for asset integration support

