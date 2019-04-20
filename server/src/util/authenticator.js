const crypto = require('crypto');
const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
   modulusLength: 4096,
   publicKeyEncoding: {
       type: 'spki',
       format: "pem"
   },
   privateKeyEncoding: {
       type: 'pkcs8',
       format: 'pem'
       //cipher: 'aes-256-cbc',
       //passphrase: 'top secret'
   }
});

console.log("private:\n" + privateKey);
console.log("\n\npublic:\n" + publicKey);

const msg = "Hello world.";

const encoded = crypto.publicEncrypt(publicKey, Buffer.from(msg));

console.log("\n\nencoded:\n" + encoded.toString('base64'));

const decoded = crypto.privateDecrypt(privateKey, encoded);

console.log("\n\ndecoded:\n" + decoded);