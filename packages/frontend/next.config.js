const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(__dirname, '../../'),
    reactStrictMode: true,
    experimental: {
        typedRoutes: true,
    },
};

module.exports = nextConfig;
