const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(__dirname, '../../'),
    experimental: {
        typedRoutes: true,
    },
};

module.exports = nextConfig;
