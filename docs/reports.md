# Reports

Reports are grouped into one column per platform. Titles are displayed in
uppercase. Each title opens the original file on GitHub; its download button
fetches only that selected document from GitHub into the visitor's browser.
No report documents are copied into the website or downloaded in bulk.

`npm run sync:reports` refreshes only the public repository's file catalog in
`src/data/reports-manifest.json`. It requires no account token. The Pages workflow
refreshes that metadata before building. If unavailable, the saved catalog is
preserved and the browser can load the current public catalog instead. Every
platform also retains a direct repository link.

A saved GitHub tree response can be used with:

```sh
npm run sync:reports -- --tree /path/to/tree.json
```
