const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, 'assets', 'icons', 'mixmi_logo_v2_160px.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Create ico file (actually PNG, but browsers will accept it)
// Most browsers will accept a PNG renamed as .ico
console.log('Creating favicon.ico...');

try {
    const resvg = new Resvg(svgContent, {
        fitTo: {
            mode: 'width',
            value: 32,
        },
    });
    
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    
    // Save as favicon.ico (browsers accept PNG data in .ico files)
    const outputPath = path.join(__dirname, 'favicon.ico');
    fs.writeFileSync(outputPath, pngBuffer);
    console.log('✓ Created favicon.ico');
} catch (error) {
    console.error('✗ Failed to create favicon.ico:', error.message);
}

