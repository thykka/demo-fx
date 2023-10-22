import { mkdir, readdir, readFile, stat, rm, writeFile } from 'fs/promises';
import path from 'path';
import mustache from 'mustache';
import { marked } from 'marked';
import { compile as compileSass } from 'sass';

export class Sssg {
  constructor(options) {
    const defaults = {
      baseUrl: 'https://localhost:3000/',
      buildDir: './dist',
      templateDir: './src/templates/',
      articlesDir: './src/articles/',
      stylesheet: './src/styles/index.scss'
    };
    this.settings = Object.assign({}, defaults, options);
  }

  async build() {
    await this.clean();
    await this.createDirs();

    this.templates = await this.readFiles(this.settings.templateDir, '.mustache');

    this.articles = await this.readFiles(this.settings.articlesDir, '.md');
    this.pages = this.renderPages(this.articles, this.templates.document, this.templates);
    await this.writeFiles(this.pages);

    // TODO: build article index

    const styles = compileSass(this.settings.stylesheet);
    await this.writeFiles([{
      path: path.join(this.settings.buildDir, 'styles.css'),
      content: styles.css
    }]);
  }

  renderPages(pages, template, partials) {
    return Object.entries(pages).map(([slug, markdownText]) => {
      const content = marked(markdownText);
      const filename = slug + '.html';
      const filePath = path.join(this.settings.buildDir, filename);
      const url = this.settings.baseUrl + filename;
      const html = mustache.render(template, {
        content, slug, url
      }, partials);
      return { path: filePath, content: html };
    });
  }

  writeFiles(pages) {
    Promise.all(
      pages.map(async ({ path, content }) => {
        console.log(`Building ${path}`);
        return writeFile(path, content);
      })
    );
  }

  async readFiles(dir, extension) {
    const filenames = (await readdir(dir))
      .filter(filename => filename.endsWith(extension));
    const files = Object.fromEntries(
      await Promise.all(filenames.map(async (filename) => {
        const filePath = path.join(dir, filename);
        const fileSlug = filename.slice(0, -extension.length);
        const fileContent = (await readFile(filePath)).toString();
        return [fileSlug, fileContent];
      }))
    );
    return files;
  }

  async createDirs() {
    try {
      await stat(this.settings.buildDir);
    } catch (e) {
      await mkdir(this.settings.buildDir);
    }
  }

  clean() {
    return rm(this.settings.buildDir, { recursive: true, force: true });
  }
}
