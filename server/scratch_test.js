const { Jimp } = require('jimp');

async function test() {
  try {
    // create two identical images
    const img1 = new Jimp({ width: 256, height: 256, color: 0xFF0000FF });
    const img2 = new Jimp({ width: 256, height: 256, color: 0xFF0000FF });
    const img3 = new Jimp({ width: 256, height: 256, color: 0x00FF00FF });

    // Jimp 1.6+ .hash() might have moved. Let's try.
    if (typeof img1.hash === 'function') {
      const h1 = img1.hash(2); // base 2
      const h2 = img2.hash(2);
      const h3 = img3.hash(2);
      
      console.log('h1:', h1);
      console.log('h2:', h2);
      console.log('h3:', h3);
      
      if (typeof Jimp.distance === 'function') {
        console.log('Jimp.distance(img1, img2):', Jimp.distance(img1, img2));
      }
    } else {
      console.log('img1.hash is not a function');
    }
  } catch (err) {
    console.error(err);
  }
}

test();
