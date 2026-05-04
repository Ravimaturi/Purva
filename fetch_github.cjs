const fs = require('fs');
const path = require('path');

const repo = 'Ravimaturi/Purva';
const branch = 'main';

async function fetchDirectory(dir) {
  const url = `https://api.github.com/repos/${repo}/contents/${dir}?ref=${branch}`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  const data = await res.json();
  
  if (!Array.isArray(data)) {
    console.log(`Failed to fetch ${url}`, data);
    return;
  }

  for (const item of data) {
    if (item.type === 'file') {
      const fileUrl = item.download_url;
      console.log(`Downloading ${fileUrl}`);
      const fileRes = await fetch(fileUrl);
      const content = await fileRes.text();
      
      const filePath = path.join(__dirname, item.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    } else if (item.type === 'dir') {
      await fetchDirectory(item.path);
    }
  }
}

fetchDirectory('src').catch(console.error);
