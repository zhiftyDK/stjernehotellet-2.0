const path = require('path');

module.exports = {
    packagerConfig: {
        asar: true,
        name: 'Stjernehotellet',
        executableName: 'Stjernehotellet',
        icon: path.resolve(__dirname, 'icon'),

        extraResource: [
            path.resolve(__dirname, '..', 'index.html'),
            path.resolve(__dirname, '..', 'custom.css'),
            path.resolve(__dirname, '..', 'css'),
            path.resolve(__dirname, '..', 'data'),
            path.resolve(__dirname, '..', 'img'),
            path.resolve(__dirname, '..', 'js'),
            path.resolve(__dirname, '..', 'vendor'),
        ]
    },

    makers: []
};