const path = require('path');
const fs = require('fs');

const deleteLocalFile = (imgPath) => {
    if (!imgPath || typeof imgPath !== 'string') return;

    const normalized = imgPath.startsWith('/') ? imgPath : '/' + imgPath;

    if (normalized.startsWith('/img/')) return;
    if (!normalized.startsWith('/images/')) return;

    const relativePath = normalized.substring(1);
    const filePath = path.join(__dirname, '../../public', relativePath);

    try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error("Errore durante l'eliminazione del file da disco:", err);
    }
};

module.exports = { deleteLocalFile };
