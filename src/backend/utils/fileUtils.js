const path = require('path');
const fs = require('fs');

const getPublicDir = () => {
    const candidates = [
        path.join(__dirname, '../../public'),
        path.join(__dirname, '../../../src/public'),
        path.join(__dirname, '../../src/public')
    ];
    for (const dir of candidates) {
        if (fs.existsSync(dir)) return dir;
    }
    return path.join(__dirname, '../../public');
};

const deleteLocalFile = (imgPath) => {
    if (!imgPath || typeof imgPath !== 'string') return;

    const normalized = imgPath.startsWith('/') ? imgPath : '/' + imgPath;

    if (normalized.startsWith('/img/')) return;
    if (!normalized.startsWith('/images/')) return;

    const relativePath = normalized.substring(1);
    const filePath = path.join(getPublicDir(), relativePath);

    try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error("Errore durante l'eliminazione del file da disco:", err);
    }
};

module.exports = { deleteLocalFile };
