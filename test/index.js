const fs = require('fs');
const { resolve } = require('path');
const htmlMinifier = require('html-minifier');

const createBundleRenderer = require('vue-server-renderer')
    .createBundleRenderer;

// 读取`skeleton.json`，以`index.html`为模板写入内容
const renderer = createBundleRenderer(
    resolve(__dirname, '../lib/dist/skeleton.json'),
    {
        template: fs.readFileSync(
            resolve(__dirname, '../lib/index.html'),
            'utf-8'
        )
    }
);

// 把上一步模板完成的内容写入（替换）`index.html`
renderer.renderToString({}, (err, html) => {
    if (err) {
        throw new Error(`[skeleton-cli] render ${err}`);
    }
    html = htmlMinifier.minify(html, {
        collapseWhitespace: true,
        minifyCSS: true
    });
    fs.writeFileSync(
        resolve(__dirname, '../lib/dist/skeleton.html'),
        html,
        'utf-8'
    );
});