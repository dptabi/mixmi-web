const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, 'assets', 'icons', 'mixmi_logo_v2_160px.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Create favicon sizes
const sizes = [
    { size: 32, name: 'favicon-32x32.png' },
    { size: 16, name: 'favicon-16x16.png' },
    { size: 180, name: 'apple-touch-icon.png' }
];

console.log('Converting SVG to PNG favicons...');

sizes.forEach(({ size, name }) => {
    try {
        const resvg = new Resvg(svgContent, {
            fitTo: {
                mode: 'width',
                value: size,
            },
        });
        
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();
        
        const outputPath = path.join(__dirname, name);
        fs.writeFileSync(outputPath, pngBuffer);
        console.log(`✓ Created ${name} (${size}x${size})`);
    } catch (error) {
        console.error(`✗ Failed to create ${name}:`, error.message);
    }
});

console.log('\nFavicon PNG files created successfully!');
