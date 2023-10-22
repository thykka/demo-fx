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
      stylesheet: './src/styles/index.scss',
      pageOverrides: {
        index: { template: 'index' }
      }
    };
    this.settings = Object.assign({}, defaults, options);
  }

  async build() {
    await this.clean();
    await this.createDirs();

    const templates = await this.readFiles(this.settings.templateDir, '.mustache');
    const articles = await this.readFiles(this.settings.articlesDir, '.md');

    const view = {
      pages: this.preparePages(articles),
      baseUrl: this.settings.baseUrl,
    };

    const pages = this.generatePages(view.pages, templates, view);
    await this.writeFiles(pages);

    const styles = compileSass(this.settings.stylesheet);
    await this.writeFiles([{
      path: path.join(this.settings.buildDir, 'styles.css'),
      content: styles.css
    }]);
  }

  preparePages(pages) {
    return Object.entries(pages).map(([slug, markdown]) => {
      const filename = slug + '.html';
      const buildPath = path.join(this.settings.buildDir, filename);
      const selfUrl = this.settings.baseUrl + filename;
      const canonicalUrl = this.settings.baseUrl + (slug === 'index' ? '' : filename);
      console.log(markdown)
      const defaults = {
        template: 'document',
        title: this.extractTitle(markdown) || slug,
        slug,
        filename,
        buildPath,
        selfUrl,
        canonicalUrl,
        markdown
      };
      const overrides = this.settings.pageOverrides[slug] ?? {};
      return Object.assign({}, defaults, overrides);
    });
  }

  extractTitle(markdown) {
    const found = markdown.match(/^# (?<title>[^\r\n]+)/i);
    return found?.groups?.title;
  }

  generatePages(pages, templates, view) {
    return pages.map(page => {
      const content = marked(page.markdown);
      const pageView = {
        ...view,
        ...page,
        content
      };
      const html = mustache.render(templates[page.template], pageView, templates);
      return {
        path: page.buildPath,
        content: html
      }
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
